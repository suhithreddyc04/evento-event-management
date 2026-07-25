const dns = require('dns');
const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const Razorpay = require('razorpay');
const FormDataModel = require('./models/FormData');
const EventModel = require('./models/Event');
const BookingModel = require('./models/Booking');
const ReviewModel = require('./models/Review');
const {
    sendResetPasswordEmail,
    sendBookingConfirmationEmail,
    sendWaitlistPromotedEmail,
    sendWaitlistPaymentRequiredEmail,
    sendBookingReminderEmail,
} = require('./mailer');

dotenv.config();

// Configured here (after dotenv.config()) so it always sees env vars,
// regardless of require() order — bit us once already with mailer.js.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Razorpay keys are optional — events with no advanceAmount never need this client,
// and we don't want a missing/blank key to crash the whole server on startup.
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    : null;

const getAdminEmails = () =>
    (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

// Windows' default resolver can fail SRV lookups needed by mongodb+srv:// URIs.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
// Stash the raw body alongside the parsed one — Razorpay webhook signatures
// are computed over the exact raw bytes, which express.json() would otherwise discard.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(cors());

const upload = multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'evento',
            public_id: (req, file) => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    },
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

const signToken = (user) =>
    jwt.sign(
        { id: user._id, email: user.email, isAdmin: !!user.isAdmin, hasPassword: !!user.password },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Please log in to continue' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Session expired, please log in again' });
        req.user = decoded;
        next();
    });
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return next();

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) req.user = decoded;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

const getFavoriteIdSet = (userId) => {
    if (!userId) return Promise.resolve(new Set());

    return FormDataModel.findById(userId).select('favorites')
        .then(user => new Set((user?.favorites || []).map((id) => id.toString())));
};

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/register', authLimiter, (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
    }

    FormDataModel.findOne({ email })
        .then(user => {
            if (user) {
                res.status(400).json({ message: 'Already registered' });
            } else {
                bcrypt.hash(password, 10, (err, hashedPassword) => {
                    if (err) return res.status(500).json({ message: 'Error hashing password' });

                    const newUser = new FormDataModel({
                        name,
                        email,
                        password: hashedPassword,
                        isAdmin: getAdminEmails().includes(email.toLowerCase()),
                    });

                    newUser.save()
                        .then(user => {
                            const token = signToken(user);
                            res.status(201).json({ message: 'Registered successfully', token, name: user.name, email: user.email });
                        })
                        .catch(() => res.status(500).json({ message: 'Error saving user' }));
                });
            }
        })
        .catch(() => res.status(500).json({ message: 'Error checking user' }));
});

app.post('/login', authLimiter, (req, res) => {
    const { email, password } = req.body;

    FormDataModel.findOne({ email })
        .then(user => {
            if (user && !user.password) {
                return res.status(400).json({ message: 'This account uses Google Sign-In. Please continue with Google.' });
            }

            if (user) {
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) return res.status(500).json({ message: 'Error comparing password' });

                    if (isMatch) {
                        // Keep the admin flag in sync with ADMIN_EMAILS in case it changed since registration.
                        const shouldBeAdmin = getAdminEmails().includes(user.email.toLowerCase());
                        const syncAdmin = shouldBeAdmin !== user.isAdmin
                            ? FormDataModel.findByIdAndUpdate(user._id, { isAdmin: shouldBeAdmin }, { new: true })
                            : Promise.resolve(user);

                        syncAdmin.then(freshUser => {
                            const token = signToken(freshUser);
                            res.status(200).json({ message: 'Login success', token, name: freshUser.name, email: freshUser.email, isAdmin: freshUser.isAdmin });
                        });
                    } else {
                        res.status(400).json({ message: 'Wrong password' });
                    }
                });
            } else {
                res.status(404).json({ message: 'No records found!' });
            }
        })
        .catch(() => res.status(500).json({ message: 'Error checking user' }));
});

app.post('/auth/google', authLimiter, (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: 'Missing Google credential' });
    }

    googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
        .then(ticket => {
            const payload = ticket.getPayload();
            const { email, name, sub: googleId, email_verified: emailVerified } = payload;

            if (!emailVerified) {
                return Promise.reject(new Error('Google email is not verified'));
            }

            return FormDataModel.findOne({ email }).then(user => {
                if (user) {
                    if (!user.googleId) user.googleId = googleId;
                    const shouldBeAdmin = getAdminEmails().includes(email.toLowerCase());
                    if (user.isAdmin !== shouldBeAdmin) user.isAdmin = shouldBeAdmin;
                    return user.save();
                }

                return new FormDataModel({
                    name,
                    email,
                    googleId,
                    isAdmin: getAdminEmails().includes(email.toLowerCase()),
                }).save();
            });
        })
        .then(user => {
            const token = signToken(user);
            res.status(200).json({ message: 'Login success', token, name: user.name, email: user.email, isAdmin: user.isAdmin });
        })
        .catch(err => {
            console.error('Google auth error:', err);
            res.status(401).json({ message: 'Google sign-in failed' });
        });
});

app.post('/forgot-password', authLimiter, (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    FormDataModel.findOne({ email })
        .then(user => {
            // Always respond the same way, whether or not the email exists,
            // so this endpoint can't be used to check which emails are registered.
            if (!user) {
                return res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
            }

            const rawToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
            user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

            return user.save().then(() => {
                const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
                return sendResetPasswordEmail(user.email, resetUrl);
            }).then(() => {
                res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
            });
        })
        .catch(err => {
            console.error('Forgot password error:', err);
            res.status(500).json({ message: 'Could not process request right now' });
        });
});

app.post('/reset-password/:token', (req, res) => {
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    if (!password) {
        return res.status(400).json({ message: 'A new password is required' });
    }

    FormDataModel.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
    })
        .then(user => {
            if (!user) {
                return res.status(400).json({ message: 'Reset link is invalid or has expired' });
            }

            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) return res.status(500).json({ message: 'Error hashing password' });

                user.password = hashedPassword;
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save()
                    .then(() => res.status(200).json({ message: 'Password reset successfully' }))
                    .catch(() => res.status(500).json({ message: 'Error saving new password' }));
            });
        })
        .catch(() => res.status(500).json({ message: 'Could not process request right now' }));
});

// Events

const EVENT_SORTS = {
    rating: { avgRating: -1, reviewCount: -1 },
    bookings: { bookedCount: -1 },
    newest: { _id: -1 },
};

app.get('/events', optionalAuth, (req, res) => {
    const match = {};

    if (req.query.category) {
        match.category = req.query.category;
    }

    if (req.query.search) {
        const escaped = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        match.$or = [{ name: regex }, { description: regex }];
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const skip = (page - 1) * limit;
    const minRating = req.query.minRating ? Number(req.query.minRating) : null;
    const sortStage = EVENT_SORTS[req.query.sort] || { _id: 1 };

    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: 'reviews',
                localField: '_id',
                foreignField: 'event',
                as: 'reviewDocs',
            },
        },
        {
            $lookup: {
                from: 'bookings',
                localField: '_id',
                foreignField: 'event',
                as: 'bookingDocs',
            },
        },
        {
            $addFields: {
                avgRating: {
                    $cond: [
                        { $gt: [{ $size: '$reviewDocs' }, 0] },
                        { $round: [{ $avg: '$reviewDocs.rating' }, 1] },
                        null,
                    ],
                },
                reviewCount: { $size: '$reviewDocs' },
                bookedCount: {
                    $size: {
                        $filter: {
                            input: '$bookingDocs',
                            cond: { $in: ['$$this.status', ['confirmed', 'pending_payment']] },
                        },
                    },
                },
            },
        },
    ];

    if (minRating) {
        pipeline.push({ $match: { avgRating: { $gte: minRating } } });
    }

    pipeline.push({
        $facet: {
            data: [
                { $sort: sortStage },
                { $skip: skip },
                { $limit: limit },
                { $project: { reviewDocs: 0, bookingDocs: 0 } },
            ],
            totalCount: [{ $count: 'count' }],
        },
    });

    EventModel.aggregate(pipeline)
        .then(([result]) => {
            const events = result.data;
            const total = result.totalCount[0]?.count || 0;

            return getFavoriteIdSet(req.user?.id).then(favoriteIds => {
                const withFavorites = events.map((event) => ({
                    ...event,
                    isFavorited: favoriteIds.has(event._id.toString()),
                }));
                res.status(200).json({
                    events: withFavorites,
                    total,
                    page,
                    hasMore: skip + withFavorites.length < total,
                });
            });
        })
        .catch(() => res.status(500).json({ message: 'Error fetching events' }));
});

app.get('/events/:id', optionalAuth, (req, res) => {
    let event;

    EventModel.findById(req.params.id)
        .then(foundEvent => {
            if (!foundEvent) return Promise.reject({ status: 404 });
            event = foundEvent;
            return Promise.all([
                BookingModel.countDocuments({ event: event._id, status: { $in: ['confirmed', 'pending_payment'] } }),
                ReviewModel.aggregate([
                    { $match: { event: event._id } },
                    { $group: { _id: '$event', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
                ]),
                getFavoriteIdSet(req.user?.id),
            ]);
        })
        .then(([bookedCount, ratingResult, favoriteIds]) => {
            const rating = ratingResult[0];
            res.status(200).json({
                ...event.toObject(),
                bookedCount,
                avgRating: rating ? Math.round(rating.avgRating * 10) / 10 : null,
                reviewCount: rating ? rating.reviewCount : 0,
                isFavorited: favoriteIds.has(event._id.toString()),
            });
        })
        .catch(err => {
            if (err && err.status === 404) return res.status(404).json({ message: 'Event not found' });
            res.status(400).json({ message: 'Invalid event id' });
        });
});

// Favorites

app.post('/favorites/:eventId', requireAuth, (req, res) => {
    EventModel.findById(req.params.eventId)
        .then(event => {
            if (!event) return res.status(404).json({ message: 'Event not found' });

            return FormDataModel.findByIdAndUpdate(
                req.user.id,
                { $addToSet: { favorites: event._id } },
                { new: true }
            ).then(() => res.status(200).json({ isFavorited: true }));
        })
        .catch(() => res.status(400).json({ message: 'Could not add favorite' }));
});

app.delete('/favorites/:eventId', requireAuth, (req, res) => {
    FormDataModel.findByIdAndUpdate(
        req.user.id,
        { $pull: { favorites: req.params.eventId } },
        { new: true }
    )
        .then(() => res.status(200).json({ isFavorited: false }))
        .catch(() => res.status(400).json({ message: 'Could not remove favorite' }));
});

app.get('/favorites/mine', requireAuth, (req, res) => {
    let events;

    FormDataModel.findById(req.user.id)
        .populate('favorites')
        .then(user => {
            events = (user?.favorites || []).filter(Boolean);
            return ReviewModel.aggregate([
                { $match: { event: { $in: events.map((e) => e._id) } } },
                { $group: { _id: '$event', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
            ]);
        })
        .then(ratings => {
            const ratingByEvent = new Map(ratings.map((r) => [r._id.toString(), r]));
            const withRatings = events.map((event) => {
                const rating = ratingByEvent.get(event._id.toString());
                return {
                    ...event.toObject(),
                    avgRating: rating ? Math.round(rating.avgRating * 10) / 10 : null,
                    reviewCount: rating ? rating.reviewCount : 0,
                    isFavorited: true,
                };
            });
            res.status(200).json(withRatings);
        })
        .catch(() => res.status(500).json({ message: 'Error fetching favorites' }));
});

// Admin: event management

app.post('/admin/upload', requireAuth, requireAdmin, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        res.status(201).json({ imageUrl: req.file.path });
    });
});

app.post('/admin/events', requireAuth, requireAdmin, (req, res) => {
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

app.put('/admin/events/:id', requireAuth, requireAdmin, (req, res) => {
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

app.delete('/admin/events/:id', requireAuth, requireAdmin, (req, res) => {
    EventModel.findByIdAndDelete(req.params.id)
        .then(deleted => {
            if (!deleted) return res.status(404).json({ message: 'Event not found' });
            // Remove any bookings tied to the deleted event so nothing points at a ghost event.
            return BookingModel.deleteMany({ event: req.params.id });
        })
        .then(() => res.status(200).json({ message: 'Event deleted' }))
        .catch(() => res.status(500).json({ message: 'Error deleting event' }));
});

app.put('/admin/events/:id/complete', requireAuth, requireAdmin, (req, res) => {
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

app.get('/admin/bookings', requireAuth, requireAdmin, (req, res) => {
    const filter = {};
    if (req.query.eventId) filter.event = req.query.eventId;

    // Default view (no event picked) hides completed events to stay uncluttered,
    // but picking a specific event — including a completed one — shows all its
    // bookings, since admins need this to manage final payments after the event.
    BookingModel.find(filter)
        .sort({ createdAt: -1 })
        .populate('event', 'name capacity completed')
        .then(bookings => res.status(200).json(bookings.filter(booking =>
            booking.event && (req.query.eventId || !booking.event.completed)
        )))
        .catch(() => res.status(500).json({ message: 'Error loading bookings' }));
});

app.put('/admin/bookings/:id/final-amount', requireAuth, requireAdmin, (req, res) => {
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

// Admin: analytics

app.get('/admin/analytics', requireAuth, requireAdmin, (req, res) => {
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

app.get('/admin/reviews', requireAuth, requireAdmin, (req, res) => {
    ReviewModel.find()
        .sort({ createdAt: -1 })
        .populate('event', 'name')
        .then(reviews => res.status(200).json(reviews))
        .catch(() => res.status(500).json({ message: 'Error loading reviews' }));
});

app.patch('/admin/reviews/:id/flag', requireAuth, requireAdmin, (req, res) => {
    ReviewModel.findById(req.params.id)
        .then(review => {
            if (!review) return Promise.reject({ status: 404, message: 'Review not found' });
            review.flagged = req.body.flagged !== undefined ? !!req.body.flagged : !review.flagged;
            return review.save();
        })
        .then(review => res.status(200).json(review))
        .catch(err => res.status(err?.status || 500).json({ message: err?.message || 'Error updating review' }));
});

app.post('/admin/reviews/:id/reply', requireAuth, requireAdmin, (req, res) => {
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

app.get('/admin/customers', requireAuth, requireAdmin, (req, res) => {
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

// Bookings

app.post('/bookings', requireAuth, (req, res) => {
    const { eventId, name, phone, address, date, details, specialRequests } = req.body;
    const email = req.user.email; // always the logged-in user's email, never trust client input here

    if (!eventId || !name || !phone || !address || !date) {
        return res.status(400).json({ message: 'eventId, name, phone, address and date are required' });
    }

    let event;

    EventModel.findById(eventId)
        .then(foundEvent => {
            if (!foundEvent) return Promise.reject({ status: 404, message: 'Event not found' });
            event = foundEvent;

            return BookingModel.findOne({ event: eventId, user: req.user.id });
        })
        .then(existingBooking => {
            if (existingBooking) return Promise.reject({ status: 409, message: 'You already booked this event' });
            if (event.capacity == null) return null;

            return BookingModel.countDocuments({ event: eventId, status: { $in: ['confirmed', 'pending_payment'] } });
        })
        .then(heldCount => {
            // Once the event is at capacity, new bookings go to a waiting list
            // instead of being rejected outright — the admin can promote them
            // later if a spot frees up. Otherwise, events with an advance amount
            // hold the booking as pending_payment until Razorpay checkout succeeds.
            const atCapacity = event.capacity != null && heldCount >= event.capacity;
            const status = atCapacity
                ? 'waitlisted'
                : event.advanceAmount != null
                    ? 'pending_payment'
                    : 'confirmed';

            const booking = new BookingModel({
                event: eventId,
                user: req.user.id,
                name,
                email,
                phone,
                address,
                date,
                details: details && typeof details === 'object' ? details : {},
                specialRequests: specialRequests || '',
                status,
                advanceAmount: status === 'pending_payment' ? event.advanceAmount : null,
            });
            return booking.save();
        })
        .then(booking => {
            res.status(201).json(booking);
            // Only email on an actual confirmed booking — waitlisted and pending-payment
            // bookings stay silent until confirmed (via payment verification or promotion).
            if (booking.status === 'confirmed') {
                sendBookingConfirmationEmail(email, event, date, details, specialRequests).catch(err =>
                    console.error('Booking confirmation email failed:', err)
                );
            }
        })
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Error creating booking' });
        });
});

app.get('/bookings/mine', requireAuth, (req, res) => {
    BookingModel.find({ user: req.user.id })
        .populate('event')
        .sort({ createdAt: -1 })
        .then(bookings => res.status(200).json(bookings))
        .catch(() => res.status(500).json({ message: 'Error fetching bookings' }));
});

app.delete('/bookings/:id', requireAuth, (req, res) => {
    BookingModel.findOne({ _id: req.params.id, user: req.user.id })
        .then(booking => {
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            return booking.deleteOne().then(() => {
                res.status(200).json({ message: 'Booking cancelled' });
                if (booking.status === 'confirmed' || booking.status === 'pending_payment') {
                    promoteNextWaitlisted(booking.event).catch(err =>
                        console.error('Waitlist promotion failed:', err)
                    );
                }
            });
        })
        .catch(() => res.status(400).json({ message: 'Could not cancel booking' }));
});

// Payments (Razorpay advance payment for bookings)

app.post('/payments/create-order', requireAuth, (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payments are not configured on this server yet.' });

    const { bookingId } = req.body;

    BookingModel.findOne({ _id: bookingId, user: req.user.id })
        .populate('event', 'name')
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (booking.status !== 'pending_payment' || booking.advanceAmount == null) {
                return Promise.reject({ status: 400, message: 'This booking does not require payment' });
            }

            return razorpay.orders.create({
                amount: Math.round(booking.advanceAmount * 100),
                currency: 'INR',
                receipt: `booking_${booking._id}`,
            }).then(order => {
                booking.razorpayOrderId = order.id;
                return booking.save().then(() => res.status(200).json({
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    keyId: process.env.RAZORPAY_KEY_ID,
                    eventName: booking.event?.name || 'Evento booking',
                }));
            });
        })
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not start payment' });
        });
});

app.post('/payments/verify', requireAuth, (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payments are not configured on this server yet.' });

    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    let booking;
    let event;

    BookingModel.findOne({ _id: bookingId, user: req.user.id })
        .then(found => {
            if (!found) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (found.status !== 'pending_payment' || found.razorpayOrderId !== razorpay_order_id) {
                return Promise.reject({ status: 400, message: 'Booking is not awaiting this payment' });
            }
            booking = found;

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return Promise.reject({ status: 400, message: 'Payment verification failed' });
            }

            return EventModel.findById(booking.event);
        })
        .then(foundEvent => {
            event = foundEvent;
            booking.status = 'confirmed';
            booking.razorpayPaymentId = razorpay_payment_id;
            return booking.save();
        })
        .then(saved => {
            res.status(200).json(saved);
            if (event) {
                sendBookingConfirmationEmail(saved.email, event, saved.date, saved.details, saved.specialRequests).catch(err =>
                    console.error('Booking confirmation email failed:', err)
                );
            }
        })
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not verify payment' });
        });
});

app.post('/payments/final/create-order', requireAuth, (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payments are not configured on this server yet.' });

    const { bookingId } = req.body;

    BookingModel.findOne({ _id: bookingId, user: req.user.id })
        .populate('event', 'name')
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (booking.finalPaymentStatus !== 'pending' || booking.finalAmount == null) {
                return Promise.reject({ status: 400, message: 'No remaining balance is due on this booking' });
            }

            return razorpay.orders.create({
                amount: Math.round(booking.finalAmount * 100),
                currency: 'INR',
                receipt: `booking_final_${booking._id}`,
            }).then(order => {
                booking.finalRazorpayOrderId = order.id;
                return booking.save().then(() => res.status(200).json({
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    keyId: process.env.RAZORPAY_KEY_ID,
                    eventName: booking.event?.name || 'Evento booking',
                }));
            });
        })
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not start payment' });
        });
});

app.post('/payments/final/verify', requireAuth, (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payments are not configured on this server yet.' });

    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    BookingModel.findOne({ _id: bookingId, user: req.user.id })
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (booking.finalPaymentStatus !== 'pending' || booking.finalRazorpayOrderId !== razorpay_order_id) {
                return Promise.reject({ status: 400, message: 'Booking is not awaiting this payment' });
            }

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return Promise.reject({ status: 400, message: 'Payment verification failed' });
            }

            booking.finalPaymentStatus = 'paid';
            booking.finalRazorpayPaymentId = razorpay_payment_id;
            return booking.save();
        })
        .then(saved => res.status(200).json(saved))
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not verify payment' });
        });
});

// Backstop for the client-driven verify flow above: if the browser closes or
// loses connection right after paying, the checkout `handler` never fires and
// the booking would stay stuck in pending. Razorpay calls this directly from
// their servers once a payment captures, so it confirms the booking either way.
// No requireAuth here — the caller is Razorpay, authenticated via signature instead.
app.post('/webhooks/razorpay', (req, res) => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(503).end();

    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest('hex');

    if (!signature || signature !== expectedSignature) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    // Acknowledge immediately — Razorpay retries on non-2xx, and the actual
    // work below is best-effort/idempotent so a slow DB shouldn't hold up the response.
    res.status(200).json({ received: true });

    if (req.body.event !== 'payment.captured') return;

    const payment = req.body.payload?.payment?.entity;
    if (!payment) return;

    BookingModel.findOne({ razorpayOrderId: payment.order_id, status: 'pending_payment' })
        .then(booking => {
            if (booking) {
                booking.status = 'confirmed';
                booking.razorpayPaymentId = payment.id;
                return booking.save().then(saved =>
                    EventModel.findById(saved.event).then(event => {
                        if (event) {
                            sendBookingConfirmationEmail(saved.email, event, saved.date, saved.details, saved.specialRequests).catch(err =>
                                console.error('Booking confirmation email failed:', err)
                            );
                        }
                    })
                );
            }

            // Not an advance payment — check whether it's a final-balance payment instead.
            return BookingModel.findOne({ finalRazorpayOrderId: payment.order_id, finalPaymentStatus: 'pending' })
                .then(finalBooking => {
                    if (!finalBooking) return null;
                    finalBooking.finalPaymentStatus = 'paid';
                    finalBooking.finalRazorpayPaymentId = payment.id;
                    return finalBooking.save();
                });
        })
        .catch(err => console.error('Webhook booking confirmation failed:', err));
});

// Reviews

app.get('/events/:id/reviews', (req, res) => {
    ReviewModel.find({ event: req.params.id })
        .sort({ createdAt: -1 })
        .then(reviews => res.status(200).json(reviews))
        .catch(() => res.status(400).json({ message: 'Invalid event id' }));
});

app.post('/events/:id/reviews', requireAuth, (req, res) => {
    const eventId = req.params.id;
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || '').trim();

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'A rating between 1 and 5 is required' });
    }

    EventModel.findById(eventId)
        .then(event => {
            if (!event) return Promise.reject({ status: 404, message: 'Event not found' });
            if (!event.completed) {
                return Promise.reject({ status: 403, message: 'Reviews open once this event has taken place' });
            }
            return BookingModel.findOne({ event: eventId, user: req.user.id });
        })
        .then(booking => {
            if (!booking) {
                return Promise.reject({ status: 403, message: 'You can only review events you have booked' });
            }
            if (booking.finalPaymentStatus === 'pending') {
                return Promise.reject({ status: 403, message: 'Please pay your remaining balance before leaving a review' });
            }
            return FormDataModel.findById(req.user.id);
        })
        .then(user => {
            return ReviewModel.findOneAndUpdate(
                { event: eventId, user: req.user.id },
                { name: user.name, rating, comment },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        })
        .then(review => res.status(200).json(review))
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Error saving review' });
        });
});

app.delete('/reviews/:id', requireAuth, (req, res) => {
    ReviewModel.findById(req.params.id)
        .then(review => {
            if (!review) return res.status(404).json({ message: 'Review not found' });
            if (review.user.toString() !== req.user.id && !req.user.isAdmin) {
                return res.status(403).json({ message: 'You can only delete your own review' });
            }
            return review.deleteOne().then(() => res.status(200).json({ message: 'Review deleted' }));
        })
        .catch(() => res.status(400).json({ message: 'Could not delete review' }));
});

app.put('/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
    }

    FormDataModel.findById(req.user.id)
        .then(user => {
            if (!user) return res.status(404).json({ message: 'User not found' });

            bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
                if (err) return res.status(500).json({ message: 'Error verifying password' });
                if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

                bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                    if (err) return res.status(500).json({ message: 'Error hashing password' });

                    user.password = hashedPassword;
                    user.save()
                        .then(() => res.status(200).json({ message: 'Password changed successfully' }))
                        .catch(() => res.status(500).json({ message: 'Error saving new password' }));
                });
            });
        })
        .catch(() => res.status(500).json({ message: 'Error finding user' }));
});

app.get('/profile', requireAuth, (req, res) => {
    FormDataModel.findById(req.user.id)
        .then(user => {
            if (!user) return res.status(404).json({ message: 'User not found' });
            res.status(200).json({
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl || null,
                isAdmin: user.isAdmin,
                hasPassword: !!user.password,
            });
        })
        .catch(() => res.status(500).json({ message: 'Error fetching profile' }));
});

app.put('/profile', requireAuth, (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }

    FormDataModel.findOne({ email, _id: { $ne: req.user.id } })
        .then(existing => {
            if (existing) {
                return res.status(400).json({ message: 'Email is already in use' });
            }

            return FormDataModel.findByIdAndUpdate(req.user.id, { name, email }, { new: true })
                .then(user => {
                    if (!user) return res.status(404).json({ message: 'User not found' });

                    const token = signToken(user);
                    res.status(200).json({
                        token,
                        name: user.name,
                        email: user.email,
                        avatarUrl: user.avatarUrl || null,
                        isAdmin: user.isAdmin,
                        hasPassword: !!user.password,
                    });
                });
        })
        .catch(() => res.status(500).json({ message: 'Error updating profile' }));
});

app.post('/profile/avatar', requireAuth, (req, res) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        FormDataModel.findByIdAndUpdate(req.user.id, { avatarUrl: req.file.path }, { new: true })
            .then(user => {
                if (!user) return res.status(404).json({ message: 'User not found' });
                res.status(200).json({ avatarUrl: user.avatarUrl });
            })
            .catch(() => res.status(500).json({ message: 'Error saving avatar' }));
    });
});

app.delete('/profile/avatar', requireAuth, (req, res) => {
    FormDataModel.findByIdAndUpdate(req.user.id, { avatarUrl: null }, { new: true })
        .then(user => {
            if (!user) return res.status(404).json({ message: 'User not found' });
            res.status(200).json({ avatarUrl: null });
        })
        .catch(() => res.status(500).json({ message: 'Error removing avatar' }));
});

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server listening on http://127.0.0.1:${PORT}`);
    runScheduledJobs();
    setInterval(runScheduledJobs, 60 * 60 * 1000);
});
