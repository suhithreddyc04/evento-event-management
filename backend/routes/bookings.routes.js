const express = require('express');
const mongoose = require('mongoose');
const EventModel = require('../models/Event');
const BookingModel = require('../models/Booking');
const { requireAuth } = require('../middleware/auth');
const { promoteNextWaitlisted } = require('../services/bookingLifecycle');
const { sendBookingConfirmationEmail } = require('../mailer');

const router = express.Router();

router.post('/bookings', requireAuth, async (req, res) => {
    const { eventId, name, phone, address, date, details, specialRequests } = req.body;
    const email = req.user.email; // always the logged-in user's email, never trust client input here

    if (!eventId || !name || !phone || !address || !date) {
        return res.status(400).json({ message: 'eventId, name, phone, address and date are required' });
    }

    let event;
    let booking;

    // The capacity check-then-insert below has to run as one atomic unit —
    // otherwise two concurrent requests for the last spot can both read
    // heldCount < capacity before either has saved, overbooking the event.
    // The transaction makes the whole read+write atomic across the session.
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const foundEvent = await EventModel.findById(eventId).session(session);
            if (!foundEvent) throw { status: 404, message: 'Event not found' };
            event = foundEvent;

            const existingBooking = await BookingModel.findOne({ event: eventId, user: req.user.id }).session(session);
            if (existingBooking) throw { status: 409, message: 'You already booked this event' };

            let heldCount = 0;
            if (event.capacity != null) {
                heldCount = await BookingModel.countDocuments(
                    { event: eventId, status: { $in: ['confirmed', 'pending_payment'] } }
                ).session(session);
            }

            // Once the event is at capacity, new bookings go to a waiting list
            // instead of being rejected outright — the admin can promote them
            // later if a spot frees up. Otherwise, events with an advance amount
            // hold the booking as pending_payment until Razorpay checkout succeeds.
            const atCapacity = event.capacity != null && heldCount >= event.capacity;
            const status = atCapacity
                ? 'waitlisted'
                : event.advanceAmount != null
                    ? 'pending_payment'
                    : 'confirmed';

            booking = new BookingModel({
                event: eventId,
                user: req.user.id,
                name,
                email,
                phone,
                address,
                date,
                details: details && typeof details === 'object' ? details : {},
                specialRequests: specialRequests || '',
                status,
                advanceAmount: status === 'pending_payment' ? event.advanceAmount : null,
            });
            await booking.save({ session });
        });

        res.status(201).json(booking);
        // Only email on an actual confirmed booking — waitlisted and pending-payment
        // bookings stay silent until confirmed (via payment verification or promotion).
        if (booking.status === 'confirmed') {
            sendBookingConfirmationEmail(email, event, date, details, specialRequests).catch(err =>
                console.error('Booking confirmation email failed:', err)
            );
        }
    } catch (err) {
        if (err && err.status) return res.status(err.status).json({ message: err.message });
        // Duplicate-key from the unique (event,user) index — the DB-level backstop
        // for the same race the transaction above already closes, kept in case a
        // deployment ever runs against a non-replica-set Mongo without transactions.
        if (err && err.code === 11000) {
            return res.status(409).json({ message: 'You already booked this event' });
        }
        res.status(500).json({ message: 'Error creating booking' });
    } finally {
        session.endSession();
    }
});

router.get('/bookings/mine', requireAuth, (req, res) => {
    BookingModel.find({ user: req.user.id })
        .populate('event')
        .sort({ createdAt: -1 })
        .then(bookings => res.status(200).json(bookings))
        .catch(() => res.status(500).json({ message: 'Error fetching bookings' }));
});

router.delete('/bookings/:id', requireAuth, (req, res) => {
    BookingModel.findOne({ _id: req.params.id, user: req.user.id })
        .then(booking => {
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            return booking.deleteOne().then(() => {
                res.status(200).json({ message: 'Booking cancelled' });
                if (booking.status === 'confirmed' || booking.status === 'pending_payment') {
                    promoteNextWaitlisted(booking.event).catch(err =>
                        console.error('Waitlist promotion failed:', err)
                    );
                }
            });
        })
        .catch(() => res.status(400).json({ message: 'Could not cancel booking' }));
});

module.exports = router;
