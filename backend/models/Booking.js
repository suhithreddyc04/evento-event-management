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
    status: { type: String, enum: ['confirmed', 'waitlisted', 'pending_payment', 'cancelled'], default: 'confirmed' },
    advanceAmount: { type: Number, default: null }, // snapshot of the amount owed at booking time
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    finalAmount: { type: Number, default: null }, // remaining balance owed once the event completes (price - advanceAmount)
    finalPaymentStatus: { type: String, enum: ['not_required', 'pending', 'paid'], default: 'not_required' },
    finalRazorpayOrderId: { type: String, default: null },
    finalRazorpayPaymentId: { type: String, default: null },
    reminderSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },

    // Set when a booking is cancelled. Cancelling never deletes the document —
    // it's kept as an audit trail of what was paid and (if applicable) refunded.
    cancelledAt: { type: Date, default: null },
    // 'not_applicable' = nothing was ever charged for this booking (free event,
    // or cancelled before the advance was paid) — no admin action needed.
    // 'requested' = money was paid and cancellation is asking for it back, but
    // the actual Razorpay refund call is held until an admin/manager approves
    // it (see PUT /admin/bookings/:id/refund) — cancelling never moves money
    // on its own. 'rejected' = an admin declined the request (or the remainder
    // of one already partially refunded). 'failed' surfaces an approved refund
    // whose Razorpay call didn't go through, for follow-up. 'partial' = the
    // admin chose to refund only the advance or only the final balance, and
    // the other portion is still outstanding.
    refundStatus: { type: String, enum: ['not_applicable', 'requested', 'partial', 'refunded', 'rejected', 'failed'], default: 'not_applicable' },
    refundId: { type: String, default: null }, // Razorpay refund id(s), comma-separated if both advance and final were refunded
    refundedAmount: { type: Number, default: null },
    refundedAt: { type: Date, default: null },
    // Amount that would be refunded if approved — computed at cancellation time
    // so the admin approval screen doesn't need to re-derive it from
    // advanceAmount/finalAmount (which could theoretically change later).
    refundRequestedAmount: { type: Number, default: null },
    // Per-portion tracking so a partial refund (e.g. advance only) doesn't get
    // re-offered or re-charged once the admin later approves the remainder.
    advanceRefunded: { type: Boolean, default: false },
    finalRefunded: { type: Boolean, default: false },
});

// DB-level backstop against the "book the same event twice" race: two concurrent
// POST /bookings from the same user for the same event can both pass the
// pre-insert existingBooking check before either has saved. The unique index
// makes the loser's save() fail with a duplicate-key error instead of creating
// a second booking.
//
// Partial, not blanket-unique: a cancelled booking is kept as a record rather
// than deleted (see cancelledAt above), so without excluding 'cancelled' here
// a user who cancels could never book that event again.
BookingSchema.index(
    { event: 1, user: 1 },
    { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } }
);

const BookingModel = mongoose.model('Booking', BookingSchema);

module.exports = BookingModel;
