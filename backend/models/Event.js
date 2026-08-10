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
});

const EventModel = mongoose.model('Event', EventSchema);

module.exports = EventModel;
