const express = require('express');
const EventModel = require('../models/Event');
const BookingModel = require('../models/Booking');
const ReviewModel = require('../models/Review');
const { optionalAuth } = require('../middleware/auth');
const { getFavoriteIdSet } = require('../services/favorites');

const router = express.Router();

const EVENT_SORTS = {
    rating: { avgRating: -1, reviewCount: -1 },
    bookings: { bookedCount: -1 },
    newest: { _id: -1 },
};

router.get('/events', optionalAuth, (req, res) => {
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
    const sort = EVENT_SORTS[req.query.sort] || { _id: 1 };

    // avgRating/reviewCount/bookedCount are cached on the Event document
    // itself (kept current by services/eventStats.js on every review/booking
    // write), so listing events is a plain indexed find — no per-request
    // join across the reviews/bookings collections.
    if (minRating) match.avgRating = { $gte: minRating };

    Promise.all([
        EventModel.find(match).sort(sort).skip(skip).limit(limit).lean(),
        EventModel.countDocuments(match),
        getFavoriteIdSet(req.user?.id),
    ])
        .then(([events, total, favoriteIds]) => {
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
        })
        .catch(() => res.status(500).json({ message: 'Error fetching events' }));
});

router.get('/events/:id', optionalAuth, (req, res) => {
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

module.exports = router;
