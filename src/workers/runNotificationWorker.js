import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../Config/db.js';
import { startNotificationWorker } from './notificationWorker.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function main() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('[runWorker] MongoDB connected');
        await startNotificationWorker();
    } catch (err) {
        console.error('[runWorker] Fatal:', err.message);
        process.exit(1);
    }
}

main();
