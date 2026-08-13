const express = require('express');
const EventModel = require('../models/Event');
const BookingModel = require('../models/Booking');
const ReviewModel = require('../models/Review');
const FormDataModel = require('../models/FormData');
const { requireAuth, requireAdmin, requireManager, requireEventAccess } = require('../middleware/auth');
const upload = require('../config/upload');
const { activateFinalPayments } = require('../services/bookingLifecycle');
const { issueRefund } = require('../services/refunds');

const router = express.Router();

// Admin: event management

router.post('/admin/upload', requireAuth, requireManager, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        res.status(201).json({ imageUrl: req.file.path });
    });
});

router.post('/admin/events', requireAuth, requireAdmin, (req, res) => {
    const { name, description, imageUrl, category, location, details, activities, decorations, games, capacity, price, advanceAmount } = req.body;

    if (!name || !description || !imageUrl || !category) {
        return res.status(400).json({ message: 'name, description, imageUrl and category are required' });
    }

    const event = new EventModel({
        name, description, imageUrl, category, location, details, activities, decorations, games,
        capacity: capacity === '' || capacity == null ? null : Number(capacity),
        price: price === '' || price == null ? null : Number(price),
        advanceAmount: advanceAmount === '' || advanceAmount == null ? null : Number(advanceAmount),
    });

    event.save()
        .then(saved => res.status(201).json(saved))
        .catch(() => res.status(500).json({ message: 'Error creating event' }));
});

router.put('/admin/events/:id', requireAuth, requireManager, requireEventAccess((req) => req.params.id), (req, res) => {
    const { name, description, imageUrl, category, location, details, activities, decorations, games, capacity, price, advanceAmount } = req.body;

    EventModel.findByIdAndUpdate(
        req.params.id,
        {
            name, description, imageUrl, category, location, details, activities, decorations, games,
            capacity: capacity === '' || capacity == null ? null : Number(capacity),
            price: price === '' || price == null ? null : Number(price),
            advanceAmount: advanceAmount === '' || advanceAmount == null ? null : Number(advanceAmount),
        },
        { new: true, runValidators: true }
    )
        .then(updated => {
            if (!updated) return res.status(404).json({ message: 'Event not found' });
            res.status(200).json(updated);
        })
        .catch(() => res.status(500).json({ message: 'Error updating event' }));
});

router.delete('/admin/events/:id', requireAuth, requireAdmin, (req, res) => {
    EventModel.findByIdAndDelete(req.params.id)
        .then(deleted => {
            if (!deleted) return res.status(404).json({ message: 'Event not found' });
            // Remove any bookings tied to the deleted event so nothing points at a ghost event.
            return BookingModel.deleteMany({ event: req.params.id });
        })
        .then(() => res.status(200).json({ message: 'Event deleted' }))
        .catch(() => res.status(500).json({ message: 'Error deleting event' }));
});

router.put('/admin/events/:id/complete', requireAuth, requireManager, requireEventAccess((req) => req.params.id), (req, res) => {
    const completed = req.body.completed !== undefined ? !!req.body.completed : true;

    EventModel.findByIdAndUpdate(req.params.id, { completed }, { new: true })
        .then(updated => {
            if (!updated) return res.status(404).json({ message: 'Event not found' });
            res.status(200).json(updated);
            if (completed) {
                activateFinalPayments(updated._id).catch(err =>
                    console.error('Activating final payments failed:', err)
                );
            }
        })
        .catch(() => res.status(500).json({ message: 'Error updating event' }));
});

// Admin: manager assignment

router.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
    const filter = req.query.role ? { role: req.query.role } : {};
    FormDataModel.find(filter, 'name email role isAdmin')
        .sort({ name: 1 })
        .then(users => res.status(200).json(users))
        .catch(() => res.status(500).json({ message: 'Error loading users' }));
});

router.put('/admin/events/:id/manager', requireAuth, requireAdmin, (req, res) => {
    const { managerId } = req.body;

    const assign = managerId
        ? FormDataModel.findById(managerId).then(user => {
            if (!user) return Promise.reject({ status: 404, message: 'User not found' });
            // Assigning someone as a manager grants them the role if they don't have it yet.
            return user.role === 'manager' ? user : FormDataModel.findByIdAndUpdate(managerId, { role: 'manager' });
        })
        : Promise.resolve(null);

    assign
        .then(() => EventModel.findByIdAndUpdate(req.params.id, { manager: managerId || null }, { new: true }))
        .then(updated => {
            if (!updated) return Promise.reject({ status: 404, message: 'Event not found' });
            res.status(200).json(updated);
        })
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Error assigning manager' });
        });
});

// Admin/manager: bookings

router.get('/admin/bookings', requireAuth, requireManager, (req, res) => {
    const scopeToOwnEvents = req.user.isAdmin
        ? Promise.resolve(null)
        : EventModel.find({ manager: req.user.id }, '_id').then(events => events.map(e => e._id.toString()));

    scopeToOwnEvents.then(ownEventIds => {
        if (ownEventIds && req.query.eventId && !ownEventIds.includes(req.query.eventId)) {
            return res.status(403).json({ message: 'You do not manage this event' });
        }

        const filter = {};
        if (req.query.eventId) filter.event = req.query.eventId;
        else if (ownEventIds) filter.event = { $in: ownEventIds };

        // status=cancelled is its own explicit view — the full cancellation
        // history (any event, any refund outcome) rather than the "what needs
        // my attention" default below.
        if (req.query.status === 'cancelled') filter.status = 'cancelled';

        // Default view (no event picked, no status filter) hides completed events
        // and already-resolved cancellations to stay uncluttered — but a cancelled
        // booking with a refund still 'requested' (or one whose approved refund
        // 'failed') stays visible regardless, since that's exactly what needs an
        // admin's attention. Picking a specific event shows its full history,
        // resolved cancellations included.
        return BookingModel.find(filter)
            .sort({ createdAt: -1 })
            .populate('event', 'name capacity completed')
            .then(bookings => res.status(200).json(bookings.filter(booking => {
                if (!booking.event) return false;
                if (req.query.status === 'cancelled') return true;
                if (req.query.eventId) return true;
                if (booking.event.completed) return false;
                if (booking.status !== 'cancelled') return true;
                return booking.refundStatus === 'requested' || booking.refundStatus === 'failed';
            })));
    })
        .catch(() => res.status(500).json({ message: 'Error loading bookings' }));
});

router.put('/admin/bookings/:id/final-amount', requireAuth, requireManager, requireEventAccess((req) =>
    BookingModel.findById(req.params.id).then(booking => booking?.event)
), (req, res) => {
    const { finalAmount } = req.body;
    const amount = finalAmount === '' || finalAmount == null ? null : Number(finalAmount);

    if (amount != null && (Number.isNaN(amount) || amount < 0)) {
        return res.status(400).json({ message: 'finalAmount must be a non-negative number' });
    }

    BookingModel.findById(req.params.id)
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });

            booking.finalAmount = amount;
            // A positive amount (re)opens it for payment — even if it was already
            // paid, since the admin adjusting the figure means a new balance is owed.
            // Clearing the amount waives it.
            booking.finalPaymentStatus = amount > 0 ? 'pending' : 'not_required';

            // Charging a final amount only makes sense once the event has taken
            // place, and reviews/booking UI elsewhere key off event.completed —
            // so requesting a final payment implicitly marks the event completed
            // too, keeping that flag consistent with the auto-complete flow.
            if (amount > 0) {
                return EventModel.findByIdAndUpdate(booking.event, { completed: true })
                    .then(() => booking.save());
            }
            return booking.save();
        })
        .then(saved => res.status(200).json(saved))
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not update final amount' });
        });
});

// A customer cancelling a paid booking only *requests* a refund (see
// DELETE /bookings/:id) — these two are what actually move the money, or
// explicitly decline to.

router.post('/admin/bookings/:id/refund/approve', requireAuth, requireManager, requireEventAccess((req) =>
    BookingModel.findById(req.params.id).then(booking => booking?.event)
), (req, res) => {
    BookingModel.findById(req.params.id)
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });
            // 'failed' is included so a refund that was approved but whose Razorpay
            // call errored (network blip, gateway hiccup) can simply be retried.
            if (booking.refundStatus !== 'requested' && booking.refundStatus !== 'failed') {
                return Promise.reject({ status: 400, message: 'No refund is awaiting approval on this booking' });
            }
            return issueRefund(booking).then(refundResult => {
                Object.assign(booking, refundResult);
                return booking.save();
            });
        })
        .then(saved => res.status(200).json(saved))
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not process refund' });
        });
});

router.post('/admin/bookings/:id/refund/reject', requireAuth, requireManager, requireEventAccess((req) =>
    BookingModel.findById(req.params.id).then(booking => booking?.event)
), (req, res) => {
    BookingModel.findById(req.params.id)
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (booking.refundStatus !== 'requested') {
                return Promise.reject({ status: 400, message: 'No refund is awaiting approval on this booking' });
            }
            booking.refundStatus = 'rejected';
            return booking.save();
        })
        .then(saved => res.status(200).json(saved))
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not reject refund' });
        });
});

// Admin: analytics

router.get('/admin/analytics', requireAuth, requireAdmin, (req, res) => {
    const DAYS = 14;
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (DAYS - 1)));

    Promise.all([
        EventModel.countDocuments(),
        BookingModel.countDocuments(),
        FormDataModel.countDocuments(),
        ReviewModel.countDocuments(),
        BookingModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        ]),
        ReviewModel.aggregate([
            { $group: { _id: '$event', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
            { $sort: { avgRating: -1, reviewCount: -1 } },
            { $limit: 5 },
        ]),
        ReviewModel.find({}, 'rating createdAt').sort({ createdAt: 1 }),
    ])
        .then(([totalEvents, totalBookings, totalUsers, totalReviews, bookingRows, topRatedRows, allReviews]) => {
            const countByDay = new Map(bookingRows.map((row) => [row._id, row.count]));
            const bookingsByDay = [];
            for (let i = 0; i < DAYS; i += 1) {
                const day = new Date(since);
                day.setUTCDate(day.getUTCDate() + i);
                const key = day.toISOString().slice(0, 10);
                bookingsByDay.push({ date: key, count: countByDay.get(key) || 0 });
            }

            // Cumulative average rating as of each day, so the trend reflects the
            // platform's overall standing over time rather than a noisy daily average.
            const ratingTrend = [];
            let cumulativeSum = 0;
            let cumulativeCount = 0;
            let reviewCursor = 0;
            for (let i = 0; i < DAYS; i += 1) {
                const day = new Date(since);
                day.setUTCDate(day.getUTCDate() + i);
                const dayEnd = new Date(day);
                dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
                const key = day.toISOString().slice(0, 10);

                while (reviewCursor < allReviews.length && allReviews[reviewCursor].createdAt < dayEnd) {
                    cumulativeSum += allReviews[reviewCursor].rating;
                    cumulativeCount += 1;
                    reviewCursor += 1;
                }

                ratingTrend.push({
                    date: key,
                    avgRating: cumulativeCount > 0 ? Math.round((cumulativeSum / cumulativeCount) * 10) / 10 : null,
                });
            }

            return EventModel.find({ _id: { $in: topRatedRows.map((r) => r._id) } })
                .then(events => {
                    const eventById = new Map(events.map((e) => [e._id.toString(), e]));
                    const topRatedEvents = topRatedRows
                        .map((row) => {
                            const event = eventById.get(row._id.toString());
                            if (!event) return null;
                            return {
                                _id: event._id,
                                name: event.name,
                                imageUrl: event.imageUrl,
                                avgRating: Math.round(row.avgRating * 10) / 10,
                                reviewCount: row.reviewCount,
                            };
                        })
                        .filter(Boolean);

                    res.status(200).json({
                        totalEvents,
                        totalBookings,
                        totalUsers,
                        totalReviews,
                        bookingsByDay,
                        topRatedEvents,
                        ratingTrend,
                    });
                });
        })
        .catch(() => res.status(500).json({ message: 'Error loading analytics' }));
});

router.get('/admin/reviews', requireAuth, requireManager, (req, res) => {
    const scopeToOwnEvents = req.user.isAdmin
        ? Promise.resolve(null)
        : EventModel.find({ manager: req.user.id }, '_id').then(events => events.map(e => e._id));

    scopeToOwnEvents.then(ownEventIds => (
        ReviewModel.find(ownEventIds ? { event: { $in: ownEventIds } } : {})
            .sort({ createdAt: -1 })
            .populate('event', 'name')
    ))
        .then(reviews => res.status(200).json(reviews))
        .catch(() => res.status(500).json({ message: 'Error loading reviews' }));
});

router.patch('/admin/reviews/:id/flag', requireAuth, requireManager, requireEventAccess((req) =>
    ReviewModel.findById(req.params.id).then(review => review?.event)
), (req, res) => {
    ReviewModel.findById(req.params.id)
        .then(review => {
            if (!review) return Promise.reject({ status: 404, message: 'Review not found' });
            review.flagged = req.body.flagged !== undefined ? !!req.body.flagged : !review.flagged;
            return review.save();
        })
        .then(review => res.status(200).json(review))
        .catch(err => res.status(err?.status || 500).json({ message: err?.message || 'Error updating review' }));
});

router.post('/admin/reviews/:id/reply', requireAuth, requireManager, requireEventAccess((req) =>
    ReviewModel.findById(req.params.id).then(review => review?.event)
), (req, res) => {
    const text = (req.body.text || '').trim();

    ReviewModel.findById(req.params.id)
        .then(review => {
            if (!review) return Promise.reject({ status: 404, message: 'Review not found' });
            review.adminReply = text ? { text, repliedAt: new Date() } : { text: '', repliedAt: null };
            return review.save();
        })
        .then(review => res.status(200).json(review))
        .catch(err => res.status(err?.status || 500).json({ message: err?.message || 'Error replying to review' }));
});

router.get('/admin/customers', requireAuth, requireAdmin, (req, res) => {
    BookingModel.aggregate([
        {
            $group: {
                _id: '$user',
                name: { $last: '$name' },
                email: { $last: '$email' },
                bookingCount: { $sum: 1 },
            },
        },
        { $match: { bookingCount: { $gt: 1 } } },
        { $sort: { bookingCount: -1 } },
        { $limit: 20 },
    ])
        .then(customers => res.status(200).json(customers))
        .catch(() => res.status(500).json({ message: 'Error loading customers' }));
});

module.exports = router;
