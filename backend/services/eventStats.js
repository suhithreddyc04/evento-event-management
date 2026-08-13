// Keeps Event.avgRating / reviewCount / bookedCount in sync with the
// underlying Review and Booking collections. Called after any write that
// changes those counts (review create/update/delete, booking create/cancel)
// so the /events list endpoint can read the cached fields directly instead
// of joining both collections on every request.
//
// Mirrors the same math the old aggregation pipeline used: avgRating is the
// mean of ALL reviews for the event (flagged ones included, same as before),
// rounded to 1 decimal, or null when there are none; bookedCount counts
// bookings currently holding a spot (confirmed or pending_payment).

const EventModel = require('../models/Event');
const BookingModel = require('../models/Booking');
const ReviewModel = require('../models/Review');

async function recalculateEventStats(eventId) {
    const [ratingResult, bookedCount] = await Promise.all([
        ReviewModel.aggregate([
            { $match: { event: eventId } },
            { $group: { _id: '$event', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
        ]),
        BookingModel.countDocuments({ event: eventId, status: { $in: ['confirmed', 'pending_payment'] } }),
    ]);

    const rating = ratingResult[0];
    await EventModel.findByIdAndUpdate(eventId, {
        avgRating: rating ? Math.round(rating.avgRating * 10) / 10 : null,
        reviewCount: rating ? rating.reviewCount : 0,
        bookedCount,
    });
}

module.exports = { recalculateEventStats };
