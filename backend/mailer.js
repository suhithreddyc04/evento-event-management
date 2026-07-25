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
            <p>Thank you! Your booking for <strong>${event.name}</strong> is confirmed.</p>
            <p><strong>Requested date:</strong> ${new Date(date).toLocaleString()}</p>
            ${detailRows ? `<ul>${detailRows}</ul>` : ''}
            ${specialRequests ? `<p><strong>Special requests:</strong> ${specialRequests}</p>` : ''}
            <p>We'll be in touch soon with more details. Thanks for choosing Evento!</p>
        `,
    });
};

const sendWaitlistPromotedEmail = (toEmail, event, date) => {
    return getTransporter().sendMail({
        from: `"Evento" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `A spot opened up: ${event.name}`,
        html: `
            <p>Good news! A spot opened up for <strong>${event.name}</strong> and your waitlisted booking is now confirmed.</p>
            <p><strong>Requested date:</strong> ${new Date(date).toLocaleString()}</p>
            <p>We'll be in touch soon with more details. Thanks for choosing Evento!</p>
        `,
    });
};

const sendWaitlistPaymentRequiredEmail = (toEmail, event, date) => {
    return getTransporter().sendMail({
        from: `"Evento" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `A spot opened up: ${event.name} — payment required`,
        html: `
            <p>Good news! A spot opened up for <strong>${event.name}</strong>.</p>
            <p><strong>Requested date:</strong> ${new Date(date).toLocaleString()}</p>
            <p>Complete the advance payment from your <strong>My Bookings</strong> page to confirm your spot before it's offered to someone else.</p>
        `,
    });
};

const sendBookingReminderEmail = (toEmail, event, date) => {
    return getTransporter().sendMail({
        from: `"Evento" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Reminder: ${event.name} is coming up`,
        html: `
            <p>This is a friendly reminder that <strong>${event.name}</strong> is scheduled for <strong>${new Date(date).toLocaleString()}</strong>.</p>
            <p>We're looking forward to it! Reach out if anything has changed.</p>
        `,
    });
};

module.exports = {
    sendResetPasswordEmail,
    sendBookingConfirmationEmail,
    sendWaitlistPromotedEmail,
    sendWaitlistPaymentRequiredEmail,
    sendBookingReminderEmail,
};
