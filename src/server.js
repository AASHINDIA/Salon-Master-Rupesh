import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './Config/db.js';
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect DB and Start Server
connectDB();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
