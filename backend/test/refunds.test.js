jest.mock('../mailer', () => require('./mocks/mailer'));

const request = require('supertest');
const { connect, clearDb, disconnect } = require('./setupDb');

let app;
let EventModel;
let BookingModel;
let FormDataModel;
let signToken;
let razorpayMock;

beforeAll(async () => {
    await connect();
    // The real config/razorpay client would make live HTTP calls with our dummy
    // test keys — replace it before app.js (and therefore the routes) load.
    razorpayMock = { payments: { refund: jest.fn() } };
    jest.doMock('../config/razorpay', () => ({ razorpay: razorpayMock, googleClient: {} }));

    app = require('../app');
    EventModel = require('../models/Event');
    BookingModel = require('../models/Booking');
    FormDataModel = require('../models/FormData');
    ({ signToken } = require('../services/token'));
});

afterEach(async () => {
    await clearDb();
    razorpayMock.payments.refund.mockReset();
});

afterAll(async () => {
    await disconnect();
});

async function makeUser(overrides = {}) {
    const user = await FormDataModel.create({
        name: 'Test User',
        email: 'user@evento.test',
        password: 'irrelevant-hash',
        ...overrides,
    });
    return { user, token: signToken(user) };
}

async function makeAdmin() {
    return makeUser({ email: 'admin@evento.test', isAdmin: true });
}

async function makeEvent(overrides = {}) {
    return EventModel.create({
        name: 'Sample Event',
        description: 'A test event',
        imageUrl: 'http://example.com/img.jpg',
        category: 'birthday',
        ...overrides,
    });
}

const bookingPayload = (eventId) => ({
    eventId,
    name: 'Test',
    phone: '999',
    address: 'x',
    date: new Date(Date.now() + 86400000),
});

async function makeCancelledPaidBooking() {
    const { token } = await makeUser();
    const event = await makeEvent({ advanceAmount: 500 });
    const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload(event._id));
    await BookingModel.findByIdAndUpdate(booked.body._id, {
        status: 'confirmed', razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1',
    });
    await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${token}`);
    return booked.body._id;
}

describe('DELETE /bookings/:id — cancellation requests a refund but never issues one', () => {
    test('cancelling a booking that was never paid resolves immediately as not_applicable', async () => {
        const { token } = await makeUser();
        const event = await makeEvent(); // no advanceAmount — nothing ever charged

        const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload(event._id));
        const res = await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('cancelled');
        expect(res.body.refundStatus).toBe('not_applicable');
        expect(razorpayMock.payments.refund).not.toHaveBeenCalled();

        const stored = await BookingModel.findById(booked.body._id);
        expect(stored).not.toBeNull(); // kept, not deleted
        expect(stored.cancelledAt).not.toBeNull();
    });

    test('cancelling a booking with a paid advance only requests a refund — no Razorpay call yet', async () => {
        const { token } = await makeUser();
        const event = await makeEvent({ advanceAmount: 500 });

        const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload(event._id));
        await BookingModel.findByIdAndUpdate(booked.body._id, {
            status: 'confirmed', razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1',
        });

        const res = await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('cancelled');
        expect(res.body.refundStatus).toBe('requested');
        expect(res.body.refundRequestedAmount).toBe(500);
        expect(razorpayMock.payments.refund).not.toHaveBeenCalled();
    });

    test('cancelling frees the (event, user) pair so the same user can book the event again', async () => {
        const { token } = await makeUser();
        const event = await makeEvent();

        const first = await request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload(event._id));
        await request(app).delete(`/bookings/${first.body._id}`).set('Authorization', `Bearer ${token}`);
        const second = await request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload(event._id));

        expect(second.status).toBe(201);
        expect(second.body.status).toBe('confirmed');
    });

    test('rejects cancelling an already-cancelled booking', async () => {
        const { token } = await makeUser();
        const event = await makeEvent();

        const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(bookingPayload(event._id));
        await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${token}`);
        const second = await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${token}`);

        expect(second.status).toBe(400);
    });
});

describe('POST /admin/bookings/:id/refund/approve + /reject', () => {
    test('rejects a non-admin caller', async () => {
        const { token } = await makeUser();
        const bookingId = await makeCancelledPaidBooking();

        const res = await request(app).post(`/admin/bookings/${bookingId}/refund/approve`).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('approving issues the Razorpay refund and records the result', async () => {
        const { token } = await makeAdmin();
        const bookingId = await makeCancelledPaidBooking();
        razorpayMock.payments.refund.mockResolvedValue({ id: 'rfnd_1' });

        const res = await request(app).post(`/admin/bookings/${bookingId}/refund/approve`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.refundStatus).toBe('refunded');
        expect(res.body.refundedAmount).toBe(500);
        expect(res.body.refundId).toBe('rfnd_1');
        expect(razorpayMock.payments.refund).toHaveBeenCalledWith('pay_1', { amount: 50000 });
    });

    test('a failed Razorpay call on approval records refundStatus failed', async () => {
        const { token } = await makeAdmin();
        const bookingId = await makeCancelledPaidBooking();
        razorpayMock.payments.refund.mockRejectedValue(new Error('gateway down'));

        const res = await request(app).post(`/admin/bookings/${bookingId}/refund/approve`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.refundStatus).toBe('failed');
    });

    test('rejecting declines the refund without ever calling Razorpay', async () => {
        const { token } = await makeAdmin();
        const bookingId = await makeCancelledPaidBooking();

        const res = await request(app).post(`/admin/bookings/${bookingId}/refund/reject`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.refundStatus).toBe('rejected');
        expect(razorpayMock.payments.refund).not.toHaveBeenCalled();
    });

    test('cannot approve a refund that was never requested', async () => {
        const { token: userToken } = await makeUser();
        const { token: adminToken } = await makeAdmin();
        const event = await makeEvent(); // free event — cancelling it needs no refund

        const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${userToken}`).send(bookingPayload(event._id));
        await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${userToken}`);

        const res = await request(app).post(`/admin/bookings/${booked.body._id}/refund/approve`).set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
    });

    test('cannot approve the same refund twice', async () => {
        const { token } = await makeAdmin();
        const bookingId = await makeCancelledPaidBooking();
        razorpayMock.payments.refund.mockResolvedValue({ id: 'rfnd_1' });

        await request(app).post(`/admin/bookings/${bookingId}/refund/approve`).set('Authorization', `Bearer ${token}`);
        const second = await request(app).post(`/admin/bookings/${bookingId}/refund/approve`).set('Authorization', `Bearer ${token}`);

        expect(second.status).toBe(400);
        expect(razorpayMock.payments.refund).toHaveBeenCalledTimes(1);
    });
});

describe('GET /admin/bookings?status=cancelled — cancelled bookings as their own view', () => {
    test('the default view omits a resolved cancellation, but ?status=cancelled shows it', async () => {
        const { token: userToken } = await makeUser();
        const { token: adminToken } = await makeAdmin();
        const event = await makeEvent(); // free event — cancelling resolves instantly (not_applicable)

        const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${userToken}`).send(bookingPayload(event._id));
        await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${userToken}`);

        const defaultView = await request(app).get('/admin/bookings').set('Authorization', `Bearer ${adminToken}`);
        expect(defaultView.body.find((b) => b._id === booked.body._id)).toBeUndefined();

        const cancelledView = await request(app).get('/admin/bookings').query({ status: 'cancelled' }).set('Authorization', `Bearer ${adminToken}`);
        expect(cancelledView.body.find((b) => b._id === booked.body._id)).toBeDefined();
    });

    test('a refund still awaiting approval shows in both the default view and the cancelled view', async () => {
        const { token: adminToken } = await makeAdmin();
        const bookingId = await makeCancelledPaidBooking();

        const defaultView = await request(app).get('/admin/bookings').set('Authorization', `Bearer ${adminToken}`);
        expect(defaultView.body.find((b) => b._id === bookingId)).toBeDefined();

        const cancelledView = await request(app).get('/admin/bookings').query({ status: 'cancelled' }).set('Authorization', `Bearer ${adminToken}`);
        expect(cancelledView.body.find((b) => b._id === bookingId)).toBeDefined();
    });

    test('the cancelled view never includes an active (non-cancelled) booking', async () => {
        const { token: userToken } = await makeUser();
        const { token: adminToken } = await makeAdmin();
        const event = await makeEvent();

        const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${userToken}`).send(bookingPayload(event._id));

        const cancelledView = await request(app).get('/admin/bookings').query({ status: 'cancelled' }).set('Authorization', `Bearer ${adminToken}`);
        expect(cancelledView.body.find((b) => b._id === booked.body._id)).toBeUndefined();
    });
});
