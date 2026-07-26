const jwt = require('jsonwebtoken');

const signToken = (user) =>
    jwt.sign(
        { id: user._id, email: user.email, isAdmin: !!user.isAdmin, hasPassword: !!user.password },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

const getAdminEmails = () =>
    (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

module.exports = { signToken, getAdminEmails };
