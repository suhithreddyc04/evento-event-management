const crypto = require('crypto');
const bcrypt = require('bcrypt');
const express = require('express');
const FormDataModel = require('../models/FormData');
const { signToken, getAdminEmails } = require('../services/token');
const { authLimiter } = require('../middleware/rateLimit');
const { googleClient } = require('../config/razorpay');
const { sendResetPasswordEmail } = require('../mailer');

const router = express.Router();

router.post('/register', authLimiter, (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
    }

    FormDataModel.findOne({ email })
        .then(user => {
            if (user) {
                res.status(400).json({ message: 'Already registered' });
            } else {
                bcrypt.hash(password, 10, (err, hashedPassword) => {
                    if (err) return res.status(500).json({ message: 'Error hashing password' });

                    const newUser = new FormDataModel({
                        name,
                        email,
                        password: hashedPassword,
                        isAdmin: getAdminEmails().includes(email.toLowerCase()),
                    });

                    newUser.save()
                        .then(user => {
                            const token = signToken(user);
                            res.status(201).json({ message: 'Registered successfully', token, name: user.name, email: user.email });
                        })
                        .catch(() => res.status(500).json({ message: 'Error saving user' }));
                });
            }
        })
        .catch(() => res.status(500).json({ message: 'Error checking user' }));
});

router.post('/login', authLimiter, (req, res) => {
    const { email, password } = req.body;

    FormDataModel.findOne({ email })
        .then(user => {
            if (user && !user.password) {
                return res.status(400).json({ message: 'This account uses Google Sign-In. Please continue with Google.' });
            }

            if (user) {
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) return res.status(500).json({ message: 'Error comparing password' });

                    if (isMatch) {
                        // Keep the admin flag in sync with ADMIN_EMAILS in case it changed since registration.
                        const shouldBeAdmin = getAdminEmails().includes(user.email.toLowerCase());
                        const syncAdmin = shouldBeAdmin !== user.isAdmin
                            ? FormDataModel.findByIdAndUpdate(user._id, { isAdmin: shouldBeAdmin }, { new: true })
                            : Promise.resolve(user);

                        syncAdmin.then(freshUser => {
                            const token = signToken(freshUser);
                            res.status(200).json({ message: 'Login success', token, name: freshUser.name, email: freshUser.email, isAdmin: freshUser.isAdmin });
                        });
                    } else {
                        res.status(400).json({ message: 'Wrong password' });
                    }
                });
            } else {
                res.status(404).json({ message: 'No records found!' });
            }
        })
        .catch(() => res.status(500).json({ message: 'Error checking user' }));
});

router.post('/auth/google', authLimiter, (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: 'Missing Google credential' });
    }

    googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
        .then(ticket => {
            const payload = ticket.getPayload();
            const { email, name, sub: googleId, email_verified: emailVerified } = payload;

            if (!emailVerified) {
                return Promise.reject(new Error('Google email is not verified'));
            }

            return FormDataModel.findOne({ email }).then(user => {
                if (user) {
                    if (!user.googleId) user.googleId = googleId;
                    const shouldBeAdmin = getAdminEmails().includes(email.toLowerCase());
                    if (user.isAdmin !== shouldBeAdmin) user.isAdmin = shouldBeAdmin;
                    return user.save();
                }

                return new FormDataModel({
                    name,
                    email,
                    googleId,
                    isAdmin: getAdminEmails().includes(email.toLowerCase()),
                }).save();
            });
        })
        .then(user => {
            const token = signToken(user);
            res.status(200).json({ message: 'Login success', token, name: user.name, email: user.email, isAdmin: user.isAdmin });
        })
        .catch(err => {
            console.error('Google auth error:', err);
            res.status(401).json({ message: 'Google sign-in failed' });
        });
});

router.post('/forgot-password', authLimiter, (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    FormDataModel.findOne({ email })
        .then(user => {
            // Always respond the same way, whether or not the email exists,
            // so this endpoint can't be used to check which emails are registered.
            if (!user) {
                return res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
            }

            const rawToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
            user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

            return user.save().then(() => {
                const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
                return sendResetPasswordEmail(user.email, resetUrl);
            }).then(() => {
                res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
            });
        })
        .catch(err => {
            console.error('Forgot password error:', err);
            res.status(500).json({ message: 'Could not process request right now' });
        });
});

router.post('/reset-password/:token', (req, res) => {
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    if (!password) {
        return res.status(400).json({ message: 'A new password is required' });
    }

    FormDataModel.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
    })
        .then(user => {
            if (!user) {
                return res.status(400).json({ message: 'Reset link is invalid or has expired' });
            }

            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) return res.status(500).json({ message: 'Error hashing password' });

                user.password = hashedPassword;
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save()
                    .then(() => res.status(200).json({ message: 'Password reset successfully' }))
                    .catch(() => res.status(500).json({ message: 'Error saving new password' }));
            });
        })
        .catch(() => res.status(500).json({ message: 'Could not process request right now' }));
});

module.exports = router;
