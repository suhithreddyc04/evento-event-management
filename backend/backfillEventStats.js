// One-off script: computes avgRating/reviewCount/bookedCount for every
// existing Event so the cached fields (added alongside services/eventStats.js)
// aren't null/0 for events created before this change. New events stay in
// sync automatically via recalculateEventStats() on each review/booking write.
// Run once with: node backfillEventStats.js
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const EventModel = require('./models/Event');
const { recalculateEventStats } = require('./services/eventStats');

dotenv.config();

async function backfill() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const events = await EventModel.find({}, '_id name');
    console.log(`Recalculating stats for ${events.length} events`);

    for (const event of events) {
        try {
            await recalculateEventStats(event._id);
            console.log(`OK: ${event.name}`);
        } catch (err) {
            console.error(`Failed for "${event.name}":`, err.message);
        }
    }

    await mongoose.disconnect();
    console.log('Done.');
}

backfill().catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
