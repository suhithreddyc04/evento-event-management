jest.mock('../mailer', () => require('./mocks/mailer'));

const request = require('supertest');
const { connect, clearDb, disconnect, waitFor } = require('./setupDb');

let app;
let EventModel;
let BookingModel;
let FormDataModel;
let signToken;

beforeAll(async () => {
    await connect();
    app = require('../app');
    EventModel = require('../models/Event');
    BookingModel = require('../models/Booking');
    FormDataModel = require('../models/FormData');
    ({ signToken } = require('../services/token'));
});

afterEach(async () => {
    await clearDb();
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

async function makeEvent(overrides = {}) {
    return EventModel.create({
        name: 'Sample Event',
        description: 'A test event',
        imageUrl: 'http://example.com/img.jpg',
        category: 'birthday',
        ...overrides,
    });
}

const validBooking = (eventId) => ({
    eventId: String(eventId),
    name: 'Test User',
    phone: '9999999999',
    address: '123 Test St',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});

describe('POST /bookings', () => {
    test('rejects unauthenticated requests', async () => {
        const event = await makeEvent();
        const res = await request(app).post('/bookings').send(validBooking(event._id));
        expect(res.status).toBe(401);
    });

    test('rejects when required fields are missing', async () => {
        const { token } = await makeUser();
        const res = await request(app)
            .post('/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send({ eventId: '000000000000000000000000' });
        expect(res.status).toBe(400);
    });

    test('404s when the event does not exist', async () => {
        const { token } = await makeUser();
        const res = await request(app)
            .post('/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send(validBooking('000000000000000000000000'));
        expect(res.status).toBe(404);
    });

    test('confirms a booking immediately for an event with no capacity/advance', async () => {
        const { token } = await makeUser();
        const event = await makeEvent();

        const res = await request(app)
            .post('/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send(validBooking(event._id));

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('confirmed');
        expect(res.body.email).toBe('user@evento.test'); // taken from the token, never the request body
    });

    test('holds the booking as pending_payment when the event requires an advance', async () => {
        const { token } = await makeUser();
        const event = await makeEvent({ advanceAmount: 500 });

        const res = await request(app)
            .post('/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send(validBooking(event._id));

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending_payment');
        expect(res.body.advanceAmount).toBe(500);
    });

    test('rejects a second booking of the same event by the same user', async () => {
        const { token } = await makeUser();
        const event = await makeEvent();

        await request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(validBooking(event._id));
        const res = await request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(validBooking(event._id));

        expect(res.status).toBe(409);
    });

    test('waitlists once the event is at capacity', async () => {
        const event = await makeEvent({ capacity: 1 });

        const { token: token1 } = await makeUser({ email: 'first@evento.test' });
        const first = await request(app).post('/bookings').set('Authorization', `Bearer ${token1}`).send(validBooking(event._id));
        expect(first.body.status).toBe('confirmed');

        const { token: token2 } = await makeUser({ email: 'second@evento.test' });
        const second = await request(app).post('/bookings').set('Authorization', `Bearer ${token2}`).send(validBooking(event._id));
        expect(second.status).toBe(201);
        expect(second.body.status).toBe('waitlisted');
    });
});

describe('GET /bookings/mine', () => {
    test('only returns the requesting user\'s bookings', async () => {
        const event = await makeEvent();
        const { token: token1 } = await makeUser({ email: 'first@evento.test' });
        const { token: token2 } = await makeUser({ email: 'second@evento.test' });

        await request(app).post('/bookings').set('Authorization', `Bearer ${token1}`).send(validBooking(event._id));

        const res = await request(app).get('/bookings/mine').set('Authorization', `Bearer ${token2}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });
});

describe('DELETE /bookings/:id', () => {
    test('cancels an owned booking and promotes the next waitlisted user', async () => {
        const event = await makeEvent({ capacity: 1 });
        const { token: token1 } = await makeUser({ email: 'first@evento.test' });
        const { token: token2 } = await makeUser({ email: 'second@evento.test' });

        const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${token1}`).send(validBooking(event._id));
        await request(app).post('/bookings').set('Authorization', `Bearer ${token2}`).send(validBooking(event._id));

        const del = await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${token1}`);
        expect(del.status).toBe(200);

        // Promotion runs asynchronously after the response — poll for it to settle.
        const secondUserId = (await FormDataModel.findOne({ email: 'second@evento.test' }))._id;
        const waitlisted = await waitFor(() =>
            BookingModel.findOne({ event: event._id, user: secondUserId, status: 'confirmed' })
        );
        expect(waitlisted.status).toBe('confirmed');
    });

    test('404s when cancelling a booking that belongs to another user', async () => {
        const event = await makeEvent();
        const { token: token1 } = await makeUser({ email: 'first@evento.test' });
        const { token: token2 } = await makeUser({ email: 'second@evento.test' });

        const booked = await request(app).post('/bookings').set('Authorization', `Bearer ${token1}`).send(validBooking(event._id));
        const del = await request(app).delete(`/bookings/${booked.body._id}`).set('Authorization', `Bearer ${token2}`);

        expect(del.status).toBe(404);
    });
});
