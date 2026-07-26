const EventModel = require('../models/Event');
const BookingModel = require('../models/Booking');
const {
    sendWaitlistPromotedEmail,
    sendWaitlistPaymentRequiredEmail,
    sendBookingReminderEmail,
} = require('../mailer');

// Once an event completes, any confirmed booking that paid an advance owes the
// remaining balance (event.price - advanceAmount). Flags those bookings so the
// user sees a "Pay Remaining" prompt on My Bookings — nothing is enforced here,
// the event already happened, this just surfaces the outstanding balance.
function activateFinalPayments(eventId) {
    return EventModel.findById(eventId).then(event => {
        if (!event || event.price == null) return null;

        return BookingModel.find({ event: eventId, status: 'confirmed', advanceAmount: { $ne: null } })
            .then(bookings => Promise.all(bookings.map(booking => {
                const remaining = event.price - booking.advanceAmount;
                if (remaining <= 0) return null;
                booking.finalAmount = remaining;
                booking.finalPaymentStatus = 'pending';
                return booking.save();
            })));
    });
}

// Promotes the oldest waitlisted booking for an event to confirmed once a
// confirmed spot frees up (e.g. after a cancellation), and emails the promoted user.
function promoteNextWaitlisted(eventId) {
    return EventModel.findById(eventId)
        .then(event => {
            if (!event) return null;
            if (event.capacity != null) {
                return BookingModel.countDocuments({ event: eventId, status: { $in: ['confirmed', 'pending_payment'] } })
                    .then(heldCount => (heldCount >= event.capacity ? null : event));
            }
            return event;
        })
        .then(event => {
            if (!event) return null;
            return BookingModel.findOne({ event: eventId, status: 'waitlisted' })
                .sort({ createdAt: 1 })
                .then(nextBooking => {
                    if (!nextBooking) return null;
                    // Events with an advance amount still require payment before the
                    // promoted spot is actually confirmed.
                    if (event.advanceAmount != null) {
                        nextBooking.status = 'pending_payment';
                        nextBooking.advanceAmount = event.advanceAmount;
                        return nextBooking.save().then(saved => {
                            sendWaitlistPaymentRequiredEmail(saved.email, event, saved.date).catch(err =>
                                console.error('Waitlist payment-required email failed:', err)
                            );
                        });
                    }
                    nextBooking.status = 'confirmed';
                    return nextBooking.save().then(saved => {
                        sendWaitlistPromotedEmail(saved.email, event, saved.date).catch(err =>
                            console.error('Waitlist promotion email failed:', err)
                        );
                    });
                });
        });
}

// Runs periodically: auto-completes events once every confirmed booking's requested
// date has passed, and sends a reminder email the day before a booking's date.
function runScheduledJobs() {
    const now = new Date();

    BookingModel.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: '$event', latestDate: { $max: '$date' } } },
        { $match: { latestDate: { $lt: now } } },
    ])
        .then(rows => EventModel.find({ _id: { $in: rows.map((r) => r._id) }, completed: false }, '_id'))
        .then(eventsToComplete => {
            const ids = eventsToComplete.map((e) => e._id);
            return EventModel.updateMany({ _id: { $in: ids } }, { $set: { completed: true } })
                .then(() => Promise.all(ids.map((id) => activateFinalPayments(id))));
        })
        .catch(err => console.error('Auto-complete job failed:', err));

    const reminderWindowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 44 * 60 * 60 * 1000);

    BookingModel.find({
        status: 'confirmed',
        reminderSent: false,
        date: { $gte: reminderWindowStart, $lte: reminderWindowEnd },
    })
        .populate('event', 'name')
        .then(bookings => Promise.all(bookings.map(booking => {
            if (!booking.event) return null;
            return sendBookingReminderEmail(booking.email, booking.event, booking.date)
                .then(() => {
                    booking.reminderSent = true;
                    return booking.save();
                })
                .catch(err => console.error('Reminder email failed:', err));
        })))
        .catch(err => console.error('Reminder job failed:', err));
}

module.exports = { activateFinalPayments, promoteNextWaitlisted, runScheduledJobs };
