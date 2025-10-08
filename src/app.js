// Core Framework & Middleware Imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { xss } from 'express-xss-sanitizer';
import './Controller/Cronjob/cronJobs.js'
// Main route definitions
import notFound from './Middlewares/notFound.js';
import { errorHandler } from './Middlewares/errorHandler.js';
//import  Router

import authRout from './Route/authRoute/authRoute.js'
import CategoryRuoute from './Route/Compony/Category.js'
import ProductRuoute from './Route/Compony/ProductRoute.js'

import TraningVideos from './Route/SuperAdmin/TraningVideosRoute/TraningVideosRoute.js'
import candidate from './Route/Worker/candidateRoutes.js'
import salon from './Route/Salon/salonRoutes.js'
import compnay from './Route/Compony/companyRoutes.js'
import JobPost from './Route/JOB/jobPostingRoutes.js'
import JobApp from './Route/JOB/jobApplicationRoutes.js'
import OrderRecived from './Route/OrderRecived/OrderRecived.js';
import addSalary from './Route/SalaryManagement/Salarymangement.js';
import UserManagement from './Route/UserManagement/UserMangement.js'
import DashboardApi from './Route/DashboardApi/DashboardApi.js';
import SkillRoute from './Route/SkillRoute/SkillRoute.js'
// import RouteData from './Route/State/State.js';
import ItemsRoute from './Route/storeRoute/storeRoute.js'
import PremissionRoute from './Route/authRoute/permissionRoutes.js'
import cartRoute from './Route/Cart/CartRoute.js'
import ShowDataRoute from './Route/ShowData/ShowDataRoute.js'
import salseFigureRoute from './Route/SalseFigure/SalseFigure.js';
import importuserfromexcle from './Route/ImportdataRoute/ImportData.js'
import sopproduct from './Route/sopandProduct/sopandProduct.js'
import jobandworker from './Route/FindJobandWorker/FindJobWorker.js'
import updateApplicationStatus from './Route/ApplicationStausUpdate/ApplicationStausUpdate.js'
import Franchisee from './Route/FTM/Franchisee.js'
import dummaydata from './Route/dummayData/dummaydataRoute.js'
import UploadFile from './Route/FTM/UploadFile/UploadFile.js'
import trakingroute from './Route/UserTraking/UserTrakingRoute.js'
import locationdata from './Route/State_county_city/location.js'
import SallerRoute from './Route/SaleRoute/commonsaller.js'
import listing from './Route/ListingRoute/ListingRoute.js'
import ListingManage from './Route/ListingRoute/ListingManagement.js'
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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
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


// Middleware
// ✅ Use ipKeyGenerator for correct IPv4 + IPv6 handling
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => ipKeyGenerator(req), // 👈 fix for IPv6
  message: 'Too many requests from this IP, please try again later',
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
app.use('/api/v1/permission', PremissionRoute);
// ----------------------------------------
// Product Routes
// ---------------------------
app.use('/api/v1/category', CategoryRuoute)
app.use('/api/v1/product', ProductRuoute)

// ---------------------------
app.use('/api/v1/TraningVideos', TraningVideos)
app.use('/api/v1/candidate', candidate)
app.use('/api/v1/salon', salon)
app.use('/api/v1/compnay', compnay)

app.use('/api/v1/trakingroute', trakingroute)

app.use('/api/v1/locationdata', locationdata)
// ---------------------------

//-------------JOB----------------

// Job Posting Routes
app.use('/api/v1/jobpost', JobPost)
// ---------------------------  
// Job Application Routes
app.use('/api/v1/jobapp', JobApp)

app.use('/api/v1/addSalary', addSalary)
// Salary Management Routes
// ---------------------------
app.use('/api/v1/skill', SkillRoute)
// ---------------------------
// Order Recived Routes
app.use('/api/v1/OrderRecived', OrderRecived)
app.use('/api/v1/cart', cartRoute)

// ---------------------------
// User Management Routes
app.use('/api/v1/userManagement', UserManagement)

// ---------------------------
// Dashboard API Routes
app.use('/api/v1/DashboardApi', DashboardApi)
// app.use('/api/v1/dataget', RouteData)
// ---------------------------
// Store Management Routes
app.use('/api/v1/itemsroute', ItemsRoute)

app.use('/api/v1/show', ShowDataRoute)

app.use('/api/v1/salefigure', salseFigureRoute)

app.use('/api/v1/importuserfromexcle', importuserfromexcle)

app.use('/api/v1/sopproduct', sopproduct)

// ---------------------------
app.use('/api/v1/jobandworker', jobandworker)
app.use('/api/v1/update', updateApplicationStatus)
app.use('/api/v1', Franchisee)
app.use('/api/v1', UploadFile)

app.use('/api/v1', dummaydata)

app.use('/api/v1/sallerroute', SallerRoute)
app.use('/api/v1/listing', listing)

app.use('/api/v1/listing_managment', ListingManage)
// 🧱 Error Handlers
// ---------------------------
app.use(notFound);
app.use(errorHandler);

// ---------------------------
// 🚀 Export Express App
// ---------------------------
export default app;