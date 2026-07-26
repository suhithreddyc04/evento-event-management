const crypto = require('crypto');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const upload = multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'evento',
            public_id: (req, file) => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    },
});

module.exports = upload;
