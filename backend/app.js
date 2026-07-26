const express = require('express');
const cors = require('cors');

require('./config/cloudinary');

const app = express();
// Stash the raw body alongside the parsed one — Razorpay webhook signatures
// are computed over the exact raw bytes, which express.json() would otherwise discard.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(cors());

app.use(require('./routes/auth.routes'));
app.use(require('./routes/events.routes'));
app.use(require('./routes/favorites.routes'));
app.use(require('./routes/admin.routes'));
app.use(require('./routes/bookings.routes'));
app.use(require('./routes/payments.routes'));
app.use(require('./routes/webhooks.routes'));
app.use(require('./routes/reviews.routes'));
app.use(require('./routes/profile.routes'));

module.exports = app;
