const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Baseline throttle for everything else (browsing, bookings, admin panel, etc.)
// — loose enough not to bother a real user, tight enough to blunt a scripted
// hammering of the API. authLimiter above still applies its stricter cap on
// top of this for the auth routes specifically.
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { message: 'Too many requests, please slow down and try again shortly.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };
