const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    category: { type: String, required: true },
    details: String,
    activities: String,
    decorations: String,
    games: String,
    capacity: { type: Number, default: null }, // null = unlimited
});

const EventModel = mongoose.model('Event', EventSchema);

module.exports = EventModel;
