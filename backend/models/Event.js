const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    category: { type: String, required: true },
    location: String,
    details: String,
    activities: String,
    decorations: String,
    games: String,
    capacity: { type: Number, default: null }, // null = unlimited
    price: { type: Number, default: null }, // null = contact for pricing
    advanceAmount: { type: Number, default: null }, // null = no advance payment required to book
    completed: { type: Boolean, default: false }, // reviews only open once true
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'log_reg_form', default: null }, // the manager who runs this event day-to-day

    // Cached aggregates, kept in sync by services/eventStats.js whenever a
    // Review or Booking changes. GET /events (list) reads these directly
    // instead of joining reviews/bookings for every event on every request;
    // GET /events/:id (single event) still computes fresh since it's only
    // ever one document.
    avgRating: { type: Number, default: null },
    reviewCount: { type: Number, default: 0 },
    bookedCount: { type: Number, default: 0 },
});

// Every /events list request filters on category — without this index that
// scan grows linearly with the total number of events in the collection.
EventSchema.index({ category: 1 });

const EventModel = mongoose.model('Event', EventSchema);

module.exports = EventModel;
