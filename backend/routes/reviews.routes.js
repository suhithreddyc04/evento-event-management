const express = require('express');
const EventModel = require('../models/Event');
const BookingModel = require('../models/Booking');
const ReviewModel = require('../models/Review');
const FormDataModel = require('../models/FormData');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/events/:id/reviews', (req, res) => {
    ReviewModel.find({ event: req.params.id })
        .sort({ createdAt: -1 })
        .then(reviews => res.status(200).json(reviews))
        .catch(() => res.status(400).json({ message: 'Invalid event id' }));
});

router.post('/events/:id/reviews', requireAuth, (req, res) => {
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

router.delete('/reviews/:id', requireAuth, (req, res) => {
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

module.exports = router;
