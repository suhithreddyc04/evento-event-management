const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'log_reg_form', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    date: { type: Date, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }, // category-specific answers, e.g. { guestCount, venuePreference }
    specialRequests: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

const BookingModel = mongoose.model('Booking', BookingSchema);

module.exports = BookingModel;
