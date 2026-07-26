const bcrypt = require('bcrypt');
const express = require('express');
const FormDataModel = require('../models/FormData');
const { requireAuth } = require('../middleware/auth');
const { signToken } = require('../services/token');
const upload = require('../config/upload');

const router = express.Router();

router.put('/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
    }

    FormDataModel.findById(req.user.id)
        .then(user => {
            if (!user) return res.status(404).json({ message: 'User not found' });

            bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
                if (err) return res.status(500).json({ message: 'Error verifying password' });
                if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

                bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                    if (err) return res.status(500).json({ message: 'Error hashing password' });

                    user.password = hashedPassword;
                    user.save()
                        .then(() => res.status(200).json({ message: 'Password changed successfully' }))
                        .catch(() => res.status(500).json({ message: 'Error saving new password' }));
                });
            });
        })
        .catch(() => res.status(500).json({ message: 'Error finding user' }));
});

router.get('/profile', requireAuth, (req, res) => {
    FormDataModel.findById(req.user.id)
        .then(user => {
            if (!user) return res.status(404).json({ message: 'User not found' });
            res.status(200).json({
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl || null,
                isAdmin: user.isAdmin,
                hasPassword: !!user.password,
            });
        })
        .catch(() => res.status(500).json({ message: 'Error fetching profile' }));
});

router.put('/profile', requireAuth, (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }

    FormDataModel.findOne({ email, _id: { $ne: req.user.id } })
        .then(existing => {
            if (existing) {
                return res.status(400).json({ message: 'Email is already in use' });
            }

            return FormDataModel.findByIdAndUpdate(req.user.id, { name, email }, { new: true })
                .then(user => {
                    if (!user) return res.status(404).json({ message: 'User not found' });

                    const token = signToken(user);
                    res.status(200).json({
                        token,
                        name: user.name,
                        email: user.email,
                        avatarUrl: user.avatarUrl || null,
                        isAdmin: user.isAdmin,
                        hasPassword: !!user.password,
                    });
                });
        })
        .catch(() => res.status(500).json({ message: 'Error updating profile' }));
});

router.post('/profile/avatar', requireAuth, (req, res) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        FormDataModel.findByIdAndUpdate(req.user.id, { avatarUrl: req.file.path }, { new: true })
            .then(user => {
                if (!user) return res.status(404).json({ message: 'User not found' });
                res.status(200).json({ avatarUrl: user.avatarUrl });
            })
            .catch(() => res.status(500).json({ message: 'Error saving avatar' }));
    });
});

router.delete('/profile/avatar', requireAuth, (req, res) => {
    FormDataModel.findByIdAndUpdate(req.user.id, { avatarUrl: null }, { new: true })
        .then(user => {
            if (!user) return res.status(404).json({ message: 'User not found' });
            res.status(200).json({ avatarUrl: null });
        })
        .catch(() => res.status(500).json({ message: 'Error removing avatar' }));
});

module.exports = router;
