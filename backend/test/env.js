// Loaded by Jest before any test module, so requiring config/*.js and routes/*.js
// never sees undefined secrets. mongodb-memory-server supplies MONGO_URI later,
// per-suite, via test/setupDb.js.
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_EMAILS = 'admin@evento.test';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'dummy_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'dummy_webhook_secret';
