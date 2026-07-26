const dotenv = require('dotenv');
dotenv.config();

const connectDb = require('./config/db');
const app = require('./app');
const { runScheduledJobs } = require('./services/bookingLifecycle');

connectDb();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server listening on http://127.0.0.1:${PORT}`);
    runScheduledJobs();
    setInterval(runScheduledJobs, 60 * 60 * 1000);
});
