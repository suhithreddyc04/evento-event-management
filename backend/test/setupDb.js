const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function connect() {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
}

async function clearDb() {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongod) await mongod.stop();
}

// Several routes fire off a side effect (waitlist promotion, webhook booking
// confirmation) after already responding, so the DB write lands a few ticks
// after supertest's request resolves. Poll instead of guessing a fixed delay.
async function waitFor(check, { timeout = 2000, interval = 25 } = {}) {
    const start = Date.now();
    for (;;) {
        const result = await check();
        if (result) return result;
        if (Date.now() - start > timeout) throw new Error('waitFor: condition never became true');
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
}

module.exports = { connect, clearDb, disconnect, waitFor };
