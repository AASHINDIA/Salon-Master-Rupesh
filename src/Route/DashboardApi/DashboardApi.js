import { CountsoftheUsers, getDashboardStats } from "../../Controller/DasboardApis/DashboardApi.js";
import { protect } from '../../Middlewares/authMiddleware/auth.js';
import express from 'express';

const router = express.Router();
// Dashboard API route
router.get('/counts', CountsoftheUsers);

// Add more dashboard-related routes here as needed
router.get('/getDashboardStats', protect, getDashboardStats);
export default router;