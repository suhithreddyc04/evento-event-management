const Razorpay = require('razorpay');
const { OAuth2Client } = require('google-auth-library');

// Razorpay keys are optional — events with no advanceAmount never need this client,
// and we don't want a missing/blank key to crash the whole server on startup.
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    : null;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

module.exports = { razorpay, googleClient };
