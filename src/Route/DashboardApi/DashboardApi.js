import { CountsoftheUsers, getDashboardStats } from "../../Controller/DasboardApis/DashboardApi.js";
import express from 'express';
const router = express.Router();
// Dashboard API route
router.get('/counts', CountsoftheUsers);

// Add more dashboard-related routes here as needed
router.get('/getDashboardStats', getDashboardStats);
export default router;