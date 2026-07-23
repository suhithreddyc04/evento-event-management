// One-off script: uploads locally-referenced event images to Cloudinary and
// updates each Event's imageUrl to point at the hosted copy.
// Run once with: node migrateImagesToCloudinary.js
const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const EventModel = require('./models/Event');

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FRONTEND_PUBLIC_DIR = path.join(__dirname, '..', 'frontend', 'public');

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const events = await EventModel.find({ imageUrl: { $regex: '^/images/' } });
    console.log(`Found ${events.length} events with local image paths`);

    for (const event of events) {
        const localPath = path.join(FRONTEND_PUBLIC_DIR, event.imageUrl);
        try {
            const result = await cloudinary.uploader.upload(localPath, { folder: 'evento' });
            event.imageUrl = result.secure_url;
            await event.save();
            console.log(`Migrated "${event.name}" -> ${result.secure_url}`);
        } catch (err) {
            console.error(`Failed to migrate "${event.name}" (${localPath}):`, err.message);
        }
    }

    console.log('Migration complete');
    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
