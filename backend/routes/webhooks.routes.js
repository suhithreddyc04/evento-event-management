const crypto = require('crypto');
const express = require('express');
const EventModel = require('../models/Event');
const BookingModel = require('../models/Booking');
const { sendBookingConfirmationEmail } = require('../mailer');

const router = express.Router();

// Backstop for the client-driven verify flow above: if the browser closes or
// loses connection right after paying, the checkout `handler` never fires and
// the booking would stay stuck in pending. Razorpay calls this directly from
// their servers once a payment captures, so it confirms the booking either way.
// No requireAuth here — the caller is Razorpay, authenticated via signature instead.
router.post('/webhooks/razorpay', (req, res) => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(503).end();

    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest('hex');

    if (!signature || signature !== expectedSignature) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    // Acknowledge immediately — Razorpay retries on non-2xx, and the actual
    // work below is best-effort/idempotent so a slow DB shouldn't hold up the response.
    res.status(200).json({ received: true });

    if (req.body.event !== 'payment.captured') return;

    const payment = req.body.payload?.payment?.entity;
    if (!payment) return;

    BookingModel.findOne({ razorpayOrderId: payment.order_id, status: 'pending_payment' })
        .then(booking => {
            if (booking) {
                booking.status = 'confirmed';
                booking.razorpayPaymentId = payment.id;
                return booking.save().then(saved =>
                    EventModel.findById(saved.event).then(event => {
                        if (event) {
                            sendBookingConfirmationEmail(saved.email, event, saved.date, saved.details, saved.specialRequests).catch(err =>
                                console.error('Booking confirmation email failed:', err)
                            );
                        }
                    })
                );
            }

            // Not an advance payment — check whether it's a final-balance payment instead.
            return BookingModel.findOne({ finalRazorpayOrderId: payment.order_id, finalPaymentStatus: 'pending' })
                .then(finalBooking => {
                    if (!finalBooking) return null;
                    finalBooking.finalPaymentStatus = 'paid';
                    finalBooking.finalRazorpayPaymentId = payment.id;
                    return finalBooking.save();
                });
        })
        .catch(err => console.error('Webhook booking confirmation failed:', err));
});

module.exports = router;
