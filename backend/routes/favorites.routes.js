const express = require('express');
const EventModel = require('../models/Event');
const FormDataModel = require('../models/FormData');
const ReviewModel = require('../models/Review');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/favorites/:eventId', requireAuth, (req, res) => {
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

router.delete('/favorites/:eventId', requireAuth, (req, res) => {
    FormDataModel.findByIdAndUpdate(
        req.user.id,
        { $pull: { favorites: req.params.eventId } },
        { new: true }
    )
        .then(() => res.status(200).json({ isFavorited: false }))
        .catch(() => res.status(400).json({ message: 'Could not remove favorite' }));
});

router.get('/favorites/mine', requireAuth, (req, res) => {
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

module.exports = router;
