const crypto = require('crypto');
const express = require('express');
const EventModel = require('../models/Event');
const BookingModel = require('../models/Booking');
const { requireAuth } = require('../middleware/auth');
const { razorpay } = require('../config/razorpay');
const { sendBookingConfirmationEmail } = require('../mailer');

const router = express.Router();

// Payments (Razorpay advance payment for bookings)

router.post('/payments/create-order', requireAuth, (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payments are not configured on this server yet.' });

    const { bookingId } = req.body;

    BookingModel.findOne({ _id: bookingId, user: req.user.id })
        .populate('event', 'name')
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (booking.status !== 'pending_payment' || booking.advanceAmount == null) {
                return Promise.reject({ status: 400, message: 'This booking does not require payment' });
            }

            return razorpay.orders.create({
                amount: Math.round(booking.advanceAmount * 100),
                currency: 'INR',
                receipt: `booking_${booking._id}`,
            }).then(order => {
                booking.razorpayOrderId = order.id;
                return booking.save().then(() => res.status(200).json({
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    keyId: process.env.RAZORPAY_KEY_ID,
                    eventName: booking.event?.name || 'Evento booking',
                }));
            });
        })
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not start payment' });
        });
});

router.post('/payments/verify', requireAuth, (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payments are not configured on this server yet.' });

    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    let booking;
    let event;

    BookingModel.findOne({ _id: bookingId, user: req.user.id })
        .then(found => {
            if (!found) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (found.status !== 'pending_payment' || found.razorpayOrderId !== razorpay_order_id) {
                return Promise.reject({ status: 400, message: 'Booking is not awaiting this payment' });
            }
            booking = found;

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return Promise.reject({ status: 400, message: 'Payment verification failed' });
            }

            return EventModel.findById(booking.event);
        })
        .then(foundEvent => {
            event = foundEvent;
            booking.status = 'confirmed';
            booking.razorpayPaymentId = razorpay_payment_id;
            return booking.save();
        })
        .then(saved => {
            res.status(200).json(saved);
            if (event) {
                sendBookingConfirmationEmail(saved.email, event, saved.date, saved.details, saved.specialRequests).catch(err =>
                    console.error('Booking confirmation email failed:', err)
                );
            }
        })
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not verify payment' });
        });
});

router.post('/payments/final/create-order', requireAuth, (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payments are not configured on this server yet.' });

    const { bookingId } = req.body;

    BookingModel.findOne({ _id: bookingId, user: req.user.id })
        .populate('event', 'name')
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (booking.finalPaymentStatus !== 'pending' || booking.finalAmount == null) {
                return Promise.reject({ status: 400, message: 'No remaining balance is due on this booking' });
            }

            return razorpay.orders.create({
                amount: Math.round(booking.finalAmount * 100),
                currency: 'INR',
                receipt: `booking_final_${booking._id}`,
            }).then(order => {
                booking.finalRazorpayOrderId = order.id;
                return booking.save().then(() => res.status(200).json({
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    keyId: process.env.RAZORPAY_KEY_ID,
                    eventName: booking.event?.name || 'Evento booking',
                }));
            });
        })
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not start payment' });
        });
});

router.post('/payments/final/verify', requireAuth, (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payments are not configured on this server yet.' });

    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    BookingModel.findOne({ _id: bookingId, user: req.user.id })
        .then(booking => {
            if (!booking) return Promise.reject({ status: 404, message: 'Booking not found' });
            if (booking.finalPaymentStatus !== 'pending' || booking.finalRazorpayOrderId !== razorpay_order_id) {
                return Promise.reject({ status: 400, message: 'Booking is not awaiting this payment' });
            }

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return Promise.reject({ status: 400, message: 'Payment verification failed' });
            }

            booking.finalPaymentStatus = 'paid';
            booking.finalRazorpayPaymentId = razorpay_payment_id;
            return booking.save();
        })
        .then(saved => res.status(200).json(saved))
        .catch(err => {
            if (err && err.status) return res.status(err.status).json({ message: err.message });
            res.status(500).json({ message: 'Could not verify payment' });
        });
});

module.exports = router;
