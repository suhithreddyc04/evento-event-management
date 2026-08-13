// Refunds are a two-step process: cancelling a paid booking only *requests*
// a refund (services/bookingLifecycle-adjacent logic in bookings.routes.js
// sets refundStatus: 'requested') — the actual Razorpay refund call happens
// separately, once an admin/manager approves it via PUT /admin/bookings/:id/refund.
// This file has one function per step.
const { razorpay } = require('../config/razorpay');

// Whichever of the advance/final payments actually went through (i.e. has a
// Razorpay payment id), based on the amount owed at cancellation time.
function owedRefunds(booking) {
    const refunds = [];
    if (booking.razorpayPaymentId && booking.advanceAmount != null) {
        refunds.push({ paymentId: booking.razorpayPaymentId, amount: booking.advanceAmount });
    }
    if (booking.finalRazorpayPaymentId && booking.finalPaymentStatus === 'paid' && booking.finalAmount != null) {
        refunds.push({ paymentId: booking.finalRazorpayPaymentId, amount: booking.finalAmount });
    }
    return refunds;
}

// Called at cancellation time — no Razorpay call, just figures out whether
// there's anything to refund and how much, so the booking can be saved with
// refundStatus: 'requested' (or 'not_applicable' if nothing was ever charged).
function refundAmountOwed(booking) {
    return owedRefunds(booking).reduce((sum, r) => sum + r.amount, 0);
}

// Called once an admin approves a 'requested' refund — this is the only
// place that actually moves money.
async function issueRefund(booking) {
    const refunds = owedRefunds(booking);
    if (refunds.length === 0) return { refundStatus: 'not_applicable' };

    if (!razorpay) {
        console.error('Refund approved but Razorpay is not configured:', booking._id);
        return { refundStatus: 'failed' };
    }

    const issued = [];
    try {
        for (const { paymentId, amount } of refunds) {
            const refund = await razorpay.payments.refund(paymentId, { amount: Math.round(amount * 100) });
            issued.push({ id: refund.id, amount });
        }
    } catch (err) {
        console.error('Razorpay refund failed for booking', booking._id, err);
        if (issued.length === 0) return { refundStatus: 'failed' };
        // Whatever refunds *did* succeed before the failure should still be recorded.
        return {
            refundStatus: 'failed',
            refundId: issued.map((r) => r.id).join(','),
            refundedAmount: issued.reduce((sum, r) => sum + r.amount, 0),
            refundedAt: new Date(),
        };
    }

    return {
        refundStatus: 'refunded',
        refundId: issued.map((r) => r.id).join(','),
        refundedAmount: issued.reduce((sum, r) => sum + r.amount, 0),
        refundedAt: new Date(),
    };
}

module.exports = { refundAmountOwed, issueRefund };
