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
const FormDataModel = require('./models/FormData');
const EventModel = require('./models/Event');
const BookingModel = require('./models/Booking');
const ReviewModel = require('./models/Review');
const { sendResetPasswordEmail, sendBookingConfirmationEmail } = require('./mailer');

dotenv.config();

// Configured here (after dotenv.config()) so it always sees env vars,
// regardless of require() order — bit us once already with mailer.js.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getAdminEmails = () =>
    (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

// Windows' default resolver can fail SRV lookups needed by mongodb+srv:// URIs.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.use(express.json());
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
                bookedCount: { $size: '$bookingDocs' },
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
                BookingModel.countDocuments({ event: event._id }),
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
    const { name, description, imageUrl, category, location, details, activities, decorations, games, capacity } = req.body;

    if (!name || !description || !imageUrl || !category) {
        return res.status(400).json({ message: 'name, description, imageUrl and category are required' });
    }

    const event = new EventModel({
        name, description, imageUrl, category, location, details, activities, decorations, games,
        capacity: capacity === '' || capacity == null ? null : Number(capacity),
    });

    event.save()
        .then(saved => res.status(201).json(saved))
        .catch(() => res.status(500).json({ message: 'Error creating event' }));
});

app.put('/admin/events/:id', requireAuth, requireAdmin, (req, res) => {
    const { name, description, imageUrl, category, location, details, activities, decorations, games, capacity } = req.body;

    EventModel.findByIdAndUpdate(
        req.params.id,
        {
            name, description, imageUrl, category, location, details, activities, decorations, games,
            capacity: capacity === '' || capacity == null ? null : Number(capacity),
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
    ])
        .then(([totalEvents, totalBookings, totalUsers, totalReviews, bookingRows, topRatedRows]) => {
            const countByDay = new Map(bookingRows.map((row) => [row._id, row.count]));
            const bookingsByDay = [];
            for (let i = 0; i < DAYS; i += 1) {
                const day = new Date(since);
                day.setUTCDate(day.getUTCDate() + i);
                const key = day.toISOString().slice(0, 10);
                bookingsByDay.push({ date: key, count: countByDay.get(key) || 0 });
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

// Bookings

app.post('/bookings', requireAuth, (req, res) => {
    const { eventId, name, address, date, details, specialRequests } = req.body;
    const email = req.user.email; // always the logged-in user's email, never trust client input here

    if (!eventId || !name || !address || !date) {
        return res.status(400).json({ message: 'eventId, name, address and date are required' });
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

            return BookingModel.countDocuments({ event: eventId });
        })
        .then(bookedCount => {
            if (event.capacity != null && bookedCount >= event.capacity) {
                return Promise.reject({ status: 409, message: 'This event is fully booked' });
            }

            const booking = new BookingModel({
                event: eventId,
                user: req.user.id,
                name,
                email,
                address,
                date,
                details: details && typeof details === 'object' ? details : {},
                specialRequests: specialRequests || '',
            });
            return booking.save();
        })
        .then(booking => {
            res.status(201).json(booking);
            // Fire-and-forget: don't fail the booking if the confirmation email fails to send.
            sendBookingConfirmationEmail(email, event, date, details, specialRequests).catch(err =>
                console.error('Booking confirmation email failed:', err)
            );
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
            return booking.deleteOne().then(() => res.status(200).json({ message: 'Booking cancelled' }));
        })
        .catch(() => res.status(400).json({ message: 'Could not cancel booking' }));
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
            return BookingModel.findOne({ event: eventId, user: req.user.id });
        })
        .then(booking => {
            if (!booking) {
                return Promise.reject({ status: 403, message: 'You can only review events you have booked' });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server listening on http://127.0.0.1:${PORT}`);
});
