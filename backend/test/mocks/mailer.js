// Auto-mock for ../../mailer — every send* function resolves immediately so
// route/service tests never attempt a real SMTP connection.
module.exports = {
    sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
    sendBookingConfirmationEmail: jest.fn().mockResolvedValue(true),
    sendWaitlistPromotedEmail: jest.fn().mockResolvedValue(true),
    sendWaitlistPaymentRequiredEmail: jest.fn().mockResolvedValue(true),
    sendBookingReminderEmail: jest.fn().mockResolvedValue(true),
};
