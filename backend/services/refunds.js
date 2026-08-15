// Refunds are a two-step process: cancelling a paid booking only *requests*
// a refund (see DELETE /bookings/:id, which sets refundStatus: 'requested')
// — the actual Razorpay refund call happens separately, once an admin/manager
// approves it via POST /admin/bookings/:id/refund/approve, and they can choose
// to approve just the advance, just the final balance, or both ('full').
const { razorpay } = require('../config/razorpay');

// Whichever of the advance/final payments actually went through (i.e. has a
// Razorpay payment id) and hasn't already been refunded, tagged by type so
// the caller can filter down to a single portion.
function owedPortions(booking) {
    const portions = [];
    if (booking.razorpayPaymentId && booking.advanceAmount != null && !booking.advanceRefunded) {
        portions.push({ type: 'advance', paymentId: booking.razorpayPaymentId, amount: booking.advanceAmount });
    }
    if (booking.finalRazorpayPaymentId && booking.finalPaymentStatus === 'paid' && booking.finalAmount != null && !booking.finalRefunded) {
        portions.push({ type: 'final', paymentId: booking.finalRazorpayPaymentId, amount: booking.finalAmount });
    }
    return portions;
}

// Called at cancellation time — no Razorpay call, just figures out whether
// there's anything to refund and how much, so the booking can be saved with
// refundStatus: 'requested' (or 'not_applicable' if nothing was ever charged).
function refundAmountOwed(booking) {
    return owedPortions(booking).reduce((sum, r) => sum + r.amount, 0);
}

// Called once an admin approves a refund (or retries a failed/partial one).
// `scope` is 'advance', 'final', or 'full' (default) — this is the only
// place that actually moves money, and only for the portion(s) requested.
async function issueRefund(booking, scope = 'full') {
    const portions = owedPortions(booking).filter((p) => scope === 'full' || p.type === scope);
    if (portions.length === 0) return {};

    if (!razorpay) {
        console.error('Refund approved but Razorpay is not configured:', booking._id);
        return { refundStatus: 'failed' };
    }

    const issued = [];
    let hitError = false;
    for (const portion of portions) {
        try {
            const refund = await razorpay.payments.refund(portion.paymentId, { amount: Math.round(portion.amount * 100) });
            issued.push({ ...portion, refundId: refund.id });
        } catch (err) {
            console.error('Razorpay refund failed for booking', booking._id, portion.type, err);
            hitError = true;
            // Stop rather than continue to the next portion — leave it untouched
            // so a retry re-attempts only what didn't go through.
            break;
        }
    }

    if (issued.length === 0) return { refundStatus: 'failed' };

    const update = {
        refundId: [booking.refundId, ...issued.map((i) => i.refundId)].filter(Boolean).join(','),
        refundedAmount: (booking.refundedAmount || 0) + issued.reduce((sum, i) => sum + i.amount, 0),
        refundedAt: new Date(),
    };
    if (issued.some((i) => i.type === 'advance')) update.advanceRefunded = true;
    if (issued.some((i) => i.type === 'final')) update.finalRefunded = true;

    const fullyDone = update.refundedAmount >= (booking.refundRequestedAmount || 0);
    update.refundStatus = hitError ? 'failed' : (fullyDone ? 'refunded' : 'partial');
    return update;
}

module.exports = { refundAmountOwed, issueRefund };
