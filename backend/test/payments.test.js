jest.mock('../mailer', () => require('./mocks/mailer'));

const crypto = require('crypto');
const request = require('supertest');
const { connect, clearDb, disconnect, waitFor } = require('./setupDb');

let app;
let EventModel;
let BookingModel;
let FormDataModel;
let signToken;
let razorpayMock;

beforeAll(async () => {
    await connect();

    // The real config/razorpay client would make live HTTP calls with our dummy
    // test keys. Swap it for a stub before app.js (and payments.routes.js) load it.
    razorpayMock = { orders: { create: jest.fn() } };
    jest.doMock('../config/razorpay', () => ({ razorpay: razorpayMock, googleClient: {} }));

    app = require('../app');
    EventModel = require('../models/Event');
    BookingModel = require('../models/Booking');
    FormDataModel = require('../models/FormData');
    ({ signToken } = require('../services/token'));
});

afterEach(async () => {
    await clearDb();
    razorpayMock.orders.create.mockReset();
    require('../mailer').sendBookingConfirmationEmail.mockClear();
});

afterAll(async () => {
    await disconnect();
});

async function makeUser(overrides = {}) {
    const user = await FormDataModel.create({ name: 'Test User', email: 'user@evento.test', password: 'hash', ...overrides });
    return { user, token: signToken(user) };
}

async function makePendingBooking({ event, user, orderId }) {
    return BookingModel.create({
        event: event._id,
        user: user._id,
        name: user.name,
        email: user.email,
        phone: '9999999999',
        address: '123 Test St',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending_payment',
        advanceAmount: event.advanceAmount,
        razorpayOrderId: orderId || null,
    });
}

describe('POST /payments/create-order', () => {
    test('creates a razorpay order for a pending-payment booking', async () => {
        const { user, token } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user });

        razorpayMock.orders.create.mockResolvedValue({ id: 'order_123', amount: 50000, currency: 'INR' });

        const res = await request(app)
            .post('/payments/create-order')
            .set('Authorization', `Bearer ${token}`)
            .send({ bookingId: booking._id });

        expect(res.status).toBe(200);
        expect(res.body.orderId).toBe('order_123');
        expect(razorpayMock.orders.create).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 50000, currency: 'INR' })
        );

        const saved = await BookingModel.findById(booking._id);
        expect(saved.razorpayOrderId).toBe('order_123');
    });

    test('rejects a booking that is not awaiting payment', async () => {
        const { user, token } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c' });
        const booking = await BookingModel.create({
            event: event._id, user: user._id, name: user.name, email: user.email,
            phone: '1', address: 'a', date: new Date(), status: 'confirmed',
        });

        const res = await request(app)
            .post('/payments/create-order')
            .set('Authorization', `Bearer ${token}`)
            .send({ bookingId: booking._id });

        expect(res.status).toBe(400);
        expect(razorpayMock.orders.create).not.toHaveBeenCalled();
    });

    test('404s for a booking owned by someone else', async () => {
        const { user: owner } = await makeUser({ email: 'owner@evento.test' });
        const { token: otherToken } = await makeUser({ email: 'other@evento.test' });
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user: owner });

        const res = await request(app)
            .post('/payments/create-order')
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ bookingId: booking._id });

        expect(res.status).toBe(404);
    });
});

describe('POST /payments/verify', () => {
    function signPayment(orderId, paymentId) {
        return crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');
    }

    test('confirms the booking when the signature is valid', async () => {
        const { user, token } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user, orderId: 'order_abc' });

        const res = await request(app)
            .post('/payments/verify')
            .set('Authorization', `Bearer ${token}`)
            .send({
                bookingId: booking._id,
                razorpay_order_id: 'order_abc',
                razorpay_payment_id: 'pay_abc',
                razorpay_signature: signPayment('order_abc', 'pay_abc'),
            });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('confirmed');
    });

    test('rejects a forged signature', async () => {
        const { user, token } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user, orderId: 'order_abc' });

        const res = await request(app)
            .post('/payments/verify')
            .set('Authorization', `Bearer ${token}`)
            .send({
                bookingId: booking._id,
                razorpay_order_id: 'order_abc',
                razorpay_payment_id: 'pay_abc',
                razorpay_signature: 'not-the-right-signature',
            });

        expect(res.status).toBe(400);
        const saved = await BookingModel.findById(booking._id);
        expect(saved.status).toBe('pending_payment');
    });

    test('rejects verification against a different order id than the one on the booking', async () => {
        const { user, token } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user, orderId: 'order_real' });

        const res = await request(app)
            .post('/payments/verify')
            .set('Authorization', `Bearer ${token}`)
            .send({
                bookingId: booking._id,
                razorpay_order_id: 'order_spoofed',
                razorpay_payment_id: 'pay_abc',
                razorpay_signature: signPayment('order_spoofed', 'pay_abc'),
            });

        expect(res.status).toBe(400);
    });

    test('does not double-confirm or double-email when the webhook backstop already confirmed the booking', async () => {
        const mailer = require('../mailer');
        const { user, token } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user, orderId: 'order_race' });

        // Simulate the webhook backstop winning the race first.
        await BookingModel.findOneAndUpdate(
            { _id: booking._id, status: 'pending_payment' },
            { $set: { status: 'confirmed', razorpayPaymentId: 'pay_race' } }
        );

        const res = await request(app)
            .post('/payments/verify')
            .set('Authorization', `Bearer ${token}`)
            .send({
                bookingId: booking._id,
                razorpay_order_id: 'order_race',
                razorpay_payment_id: 'pay_race',
                razorpay_signature: signPayment('order_race', 'pay_race'),
            });

        // Still a success from the client's point of view — the booking is confirmed —
        // but this request lost the compare-and-swap, so it must not re-send the email.
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('confirmed');
        expect(mailer.sendBookingConfirmationEmail).not.toHaveBeenCalled();
    });

    test('concurrent verify + webhook confirmation for the same booking sends exactly one email', async () => {
        const crypto2 = require('crypto');
        const mailer = require('../mailer');
        const { user, token } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user, orderId: 'order_concurrent' });

        const webhookPayload = {
            event: 'payment.captured',
            payload: { payment: { entity: { id: 'pay_concurrent', order_id: 'order_concurrent' } } },
        };
        const rawBody = JSON.stringify(webhookPayload);
        const webhookSignature = crypto2
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

        const [verifyRes, webhookRes] = await Promise.all([
            request(app)
                .post('/payments/verify')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    bookingId: booking._id,
                    razorpay_order_id: 'order_concurrent',
                    razorpay_payment_id: 'pay_concurrent',
                    razorpay_signature: signPayment('order_concurrent', 'pay_concurrent'),
                }),
            request(app)
                .post('/webhooks/razorpay')
                .set('Content-Type', 'application/json')
                .set('x-razorpay-signature', webhookSignature)
                .send(rawBody),
        ]);

        expect(verifyRes.status).toBe(200);
        expect(webhookRes.status).toBe(200);

        const saved = await waitFor(async () => {
            const doc = await BookingModel.findById(booking._id);
            return doc.status === 'confirmed' ? doc : null;
        });
        expect(saved.status).toBe('confirmed');

        await waitFor(() => mailer.sendBookingConfirmationEmail.mock.calls.length > 0);
        expect(mailer.sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);
    });
});

describe('POST /webhooks/razorpay', () => {
    function signBody(rawBody) {
        return crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    }

    test('confirms the matching pending booking on payment.captured with a valid signature', async () => {
        const { user } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user, orderId: 'order_wh1' });

        const payload = {
            event: 'payment.captured',
            payload: { payment: { entity: { id: 'pay_wh1', order_id: 'order_wh1' } } },
        };
        const rawBody = JSON.stringify(payload);

        const res = await request(app)
            .post('/webhooks/razorpay')
            .set('Content-Type', 'application/json')
            .set('x-razorpay-signature', signBody(rawBody))
            .send(rawBody);

        expect(res.status).toBe(200);

        // Confirmation happens after the response is sent (fire-and-forget) — poll for it.
        const saved = await waitFor(async () => {
            const doc = await BookingModel.findById(booking._id);
            return doc.status === 'confirmed' ? doc : null;
        });
        expect(saved.status).toBe('confirmed');
        expect(saved.razorpayPaymentId).toBe('pay_wh1');
    });

    test('rejects an invalid signature and leaves the booking untouched', async () => {
        const { user } = await makeUser();
        const event = await EventModel.create({ name: 'E', description: 'D', imageUrl: 'x', category: 'c', advanceAmount: 500 });
        const booking = await makePendingBooking({ event, user, orderId: 'order_wh2' });

        const payload = {
            event: 'payment.captured',
            payload: { payload: { payment: { entity: { id: 'pay_wh2', order_id: 'order_wh2' } } } },
        };
        const rawBody = JSON.stringify(payload);

        const res = await request(app)
            .post('/webhooks/razorpay')
            .set('Content-Type', 'application/json')
            .set('x-razorpay-signature', 'totally-wrong')
            .send(rawBody);

        expect(res.status).toBe(400);
        const saved = await BookingModel.findById(booking._id);
        expect(saved.status).toBe('pending_payment');
    });
});
