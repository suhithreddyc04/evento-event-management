const { v2: cloudinary } = require('cloudinary');

// Configured here (after dotenv.config(), which index.js runs before requiring
// anything else) so it always sees env vars, regardless of require() order —
// bit us once already with mailer.js.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
