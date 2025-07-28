// Core Framework & Middleware Imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { xss } from 'express-xss-sanitizer';

// Main route definitions
import notFound from './Middlewares/notFound.js';
import { errorHandler } from './Middlewares/errorHandler.js';
//import  Router

import authRout from './Route/authRoute/authRoute.js'
import CategoryRuoute from './Route/Compony/Category.js'
import ProductRuoute from './Route/Compony/ProductRoute.js'

import TraningVideos from './Route/SuperAdmin/TraningVideosRoute/TraningVideosRoute.js'

const app = express();

// ---------------------------
// 🛡️ Security Middlewares
// ---------------------------

// 1. First make req.query writable (Node 22+ compatible solution)


// 2. Apply security middlewares in recommended order
app.use(helmet()); // Security headers first
app.use(compression()); // Compress responses early
app.use(xss()); // XSS protection
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10kb' })); // Body parser
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); // Parse cookies
app.use(hpp()); // HTTP Parameter Pollution protection

app.set('trust proxy', 1); // or true

// 4. Other middlewares
app.use(morgan('dev')); // Logging

// ---------------------------
// 🚫 Rate Limiting
// ---------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// ---------------------------
// 🏠 Routes
// ---------------------------
app.get('/', (req, res) => {
  res.send('Salon Master is Running Smoothly!');
});

// authRoutes
// --------------------------------
app.use('/api/v1/auth', authRout);
// ----------------------------------------
// Product Routes
// ---------------------------
app.use('/api/v1/category', CategoryRuoute)
app.use('/api/v1/product', ProductRuoute)

// ---------------------------
app.use('/api/v1/TraningVideos', TraningVideos)
// ---------------------------
// 🧱 Error Handlers
// ---------------------------
app.use(notFound);
app.use(errorHandler);

// ---------------------------
// 🚀 Export Express App
// ---------------------------
export default app;