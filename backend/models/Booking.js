const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'log_reg_form', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    date: { type: Date, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }, // category-specific answers, e.g. { guestCount, venuePreference }
    specialRequests: { type: String, default: '' },
    status: { type: String, enum: ['confirmed', 'waitlisted', 'pending_payment'], default: 'confirmed' },
    advanceAmount: { type: Number, default: null }, // snapshot of the amount owed at booking time
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    finalAmount: { type: Number, default: null }, // remaining balance owed once the event completes (price - advanceAmount)
    finalPaymentStatus: { type: String, enum: ['not_required', 'pending', 'paid'], default: 'not_required' },
    finalRazorpayOrderId: { type: String, default: null },
    finalRazorpayPaymentId: { type: String, default: null },
    reminderSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// DB-level backstop against the "book the same event twice" race: two concurrent
// POST /bookings from the same user for the same event can both pass the
// pre-insert existingBooking check before either has saved. The unique index
// makes the loser's save() fail with a duplicate-key error instead of creating
// a second booking.
BookingSchema.index({ event: 1, user: 1 }, { unique: true });

const BookingModel = mongoose.model('Booking', BookingSchema);

module.exports = BookingModel;
