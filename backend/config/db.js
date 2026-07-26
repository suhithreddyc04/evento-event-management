const dns = require('dns');
const mongoose = require('mongoose');

// Windows' default resolver can fail SRV lookups needed by mongodb+srv:// URIs.
dns.setServers(['8.8.8.8', '8.8.4.4']);

function connectDb() {
    return mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('MongoDB connected'))
        .catch((err) => console.log('MongoDB connection error:', err));
}

module.exports = connectDb;
