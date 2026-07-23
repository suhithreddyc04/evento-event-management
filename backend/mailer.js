const nodemailer = require('nodemailer');

// Built lazily (not at module load) so it always sees env vars loaded by dotenv.config(),
// regardless of require() order in index.js.
const getTransporter = () => nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendResetPasswordEmail = (toEmail, resetUrl) => {
    return getTransporter().sendMail({
        from: `"Evento" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Reset your Evento password',
        html: `
            <p>You requested a password reset for your Evento account.</p>
            <p><a href="${resetUrl}">Click here to reset your password</a></p>
            <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        `,
    });
};

const humanize = (key) =>
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const sendBookingConfirmationEmail = (toEmail, event, date, details, specialRequests) => {
    const detailRows = details && typeof details === 'object'
        ? Object.entries(details)
            .filter(([, value]) => value !== '' && value != null)
            .map(([key, value]) => `<li><strong>${humanize(key)}:</strong> ${value}</li>`)
            .join('')
        : '';

    return getTransporter().sendMail({
        from: `"Evento" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Booking confirmed: ${event.name}`,
        html: `
            <p>Your booking for <strong>${event.name}</strong> is confirmed.</p>
            <p><strong>Requested date:</strong> ${new Date(date).toLocaleDateString()}</p>
            ${detailRows ? `<ul>${detailRows}</ul>` : ''}
            ${specialRequests ? `<p><strong>Special requests:</strong> ${specialRequests}</p>` : ''}
            <p>We'll be in touch soon with more details. Thanks for booking with Evento!</p>
        `,
    });
};

module.exports = { sendResetPasswordEmail, sendBookingConfirmationEmail };
