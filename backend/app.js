const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { generalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

require('./config/cloudinary');

const app = express();
app.use(helmet());

// Only the configured client origin(s) may call this API from a browser.
// CLIENT_URL supports a comma-separated list so preview/staging domains can
// be added without a code change. Falls back to localhost so `npm test` and
// local dev keep working if CLIENT_URL isn't set.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Same-origin requests, curl, and server-to-server calls have no Origin header — allow those.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
}));

// Stash the raw body alongside the parsed one — Razorpay webhook signatures
// are computed over the exact raw bytes, which express.json() would otherwise discard.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// Webhooks are authenticated by Razorpay's signature, not by client identity,
// so they're mounted ahead of the general throttle rather than sharing it.
app.use(require('./routes/webhooks.routes'));

app.use(generalLimiter);
app.use(require('./routes/auth.routes'));
app.use(require('./routes/events.routes'));
app.use(require('./routes/favorites.routes'));
app.use(require('./routes/admin.routes'));
app.use(require('./routes/bookings.routes'));
app.use(require('./routes/payments.routes'));
app.use(require('./routes/reviews.routes'));
app.use(require('./routes/profile.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
