jest.mock('../mailer', () => require('./mocks/mailer'));

// auth.routes.js pulls googleClient from config/razorpay — stub verifyIdToken
// so /auth/google can be tested without a real Google credential.
const mockVerifyIdToken = jest.fn();
jest.mock('../config/razorpay', () => ({
    razorpay: null,
    googleClient: { verifyIdToken: (...args) => mockVerifyIdToken(...args) },
}));

const request = require('supertest');
const bcrypt = require('bcrypt');
const { connect, clearDb, disconnect } = require('./setupDb');
const { sendResetPasswordEmail } = require('./mocks/mailer');

let app;
let FormDataModel;

beforeAll(async () => {
    await connect();
    app = require('../app');
    FormDataModel = require('../models/FormData');
});

afterEach(async () => {
    await clearDb();
    mockVerifyIdToken.mockReset();
    sendResetPasswordEmail.mockClear();
});

afterAll(async () => {
    await disconnect();
});

describe('POST /register', () => {
    test('rejects when required fields are missing', async () => {
        const res = await request(app).post('/register').send({ email: 'a@evento.test' });
        expect(res.status).toBe(400);
    });

    test('registers a new user and returns a usable token', async () => {
        const res = await request(app)
            .post('/register')
            .send({ name: 'Ada', email: 'ada@evento.test', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeTruthy();
        expect(res.body.email).toBe('ada@evento.test');

        const stored = await FormDataModel.findOne({ email: 'ada@evento.test' });
        expect(stored.password).not.toBe('password123'); // must be hashed, not stored raw
    });

    test('grants isAdmin only to addresses listed in ADMIN_EMAILS', async () => {
        const res = await request(app)
            .post('/register')
            .send({ name: 'Admin', email: 'admin@evento.test', password: 'password123' });

        const stored = await FormDataModel.findOne({ email: 'admin@evento.test' });
        expect(stored.isAdmin).toBe(true);
        expect(res.status).toBe(201);
    });

    test('rejects a second registration with the same email', async () => {
        await request(app).post('/register').send({ name: 'Ada', email: 'dup@evento.test', password: 'password123' });
        const res = await request(app).post('/register').send({ name: 'Ada 2', email: 'dup@evento.test', password: 'another' });

        expect(res.status).toBe(400);
    });
});

describe('POST /login', () => {
    async function makeUser(password = 'password123') {
        const hashed = await bcrypt.hash(password, 10);
        return FormDataModel.create({ name: 'Ada', email: 'ada@evento.test', password: hashed });
    }

    test('404s for an email that was never registered', async () => {
        const res = await request(app).post('/login').send({ email: 'nobody@evento.test', password: 'x' });
        expect(res.status).toBe(404);
    });

    test('rejects the wrong password', async () => {
        await makeUser();
        const res = await request(app).post('/login').send({ email: 'ada@evento.test', password: 'wrong' });
        expect(res.status).toBe(400);
    });

    test('logs in with the correct password', async () => {
        await makeUser();
        const res = await request(app).post('/login').send({ email: 'ada@evento.test', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
    });

    test('rejects a password login on a Google-only account', async () => {
        await FormDataModel.create({ name: 'Ada', email: 'ada@evento.test', googleId: 'g-123' });
        const res = await request(app).post('/login').send({ email: 'ada@evento.test', password: 'anything' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Google/);
    });
});

describe('POST /auth/google', () => {
    test('rejects a request with no credential', async () => {
        const res = await request(app).post('/auth/google').send({});
        expect(res.status).toBe(400);
    });

    test('rejects an unverified Google email', async () => {
        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({ email: 'new@evento.test', name: 'New', sub: 'g-1', email_verified: false }),
        });

        const res = await request(app).post('/auth/google').send({ credential: 'token' });
        expect(res.status).toBe(401);
    });

    test('creates a new user on first Google sign-in', async () => {
        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({ email: 'new@evento.test', name: 'New User', sub: 'g-1', email_verified: true }),
        });

        const res = await request(app).post('/auth/google').send({ credential: 'token' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
        const stored = await FormDataModel.findOne({ email: 'new@evento.test' });
        expect(stored.googleId).toBe('g-1');
    });

    test('links an existing password account to the Google id on sign-in', async () => {
        await FormDataModel.create({ name: 'Ada', email: 'ada@evento.test', password: 'irrelevant-hash' });
        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({ email: 'ada@evento.test', name: 'Ada', sub: 'g-2', email_verified: true }),
        });

        const res = await request(app).post('/auth/google').send({ credential: 'token' });

        expect(res.status).toBe(200);
        const stored = await FormDataModel.findOne({ email: 'ada@evento.test' });
        expect(stored.googleId).toBe('g-2');
    });
});

describe('POST /forgot-password + POST /reset-password/:token', () => {
    test('requires an email', async () => {
        const res = await request(app).post('/forgot-password').send({});
        expect(res.status).toBe(400);
    });

    test('responds the same way for an unregistered email (no user enumeration)', async () => {
        const res = await request(app).post('/forgot-password').send({ email: 'nobody@evento.test' });
        expect(res.status).toBe(200);
        expect(sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    test('issues a reset token and lets the password be reset with it', async () => {
        await FormDataModel.create({ name: 'Ada', email: 'ada@evento.test', password: 'irrelevant-hash' });

        const forgotRes = await request(app).post('/forgot-password').send({ email: 'ada@evento.test' });
        expect(forgotRes.status).toBe(200);
        expect(sendResetPasswordEmail).toHaveBeenCalledTimes(1);

        const resetUrl = sendResetPasswordEmail.mock.calls[0][1];
        const rawToken = resetUrl.split('/reset-password/')[1];

        const resetRes = await request(app).post(`/reset-password/${rawToken}`).send({ password: 'newPassword123' });
        expect(resetRes.status).toBe(200);

        // The old raw token must not work a second time — reset clears it after use.
        const reuse = await request(app).post(`/reset-password/${rawToken}`).send({ password: 'anotherOne' });
        expect(reuse.status).toBe(400);

        const loginRes = await request(app).post('/login').send({ email: 'ada@evento.test', password: 'newPassword123' });
        expect(loginRes.status).toBe(200);
    });

    test('rejects an invalid/unknown reset token', async () => {
        const res = await request(app).post('/reset-password/not-a-real-token').send({ password: 'newPassword123' });
        expect(res.status).toBe(400);
    });
});
