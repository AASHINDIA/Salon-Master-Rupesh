import { CountsoftheUsers, getDashboardStats, getAdminStats, getAdminCompanies, toggleCompanySuspend, getAdminVideos, getAdminActivities } from "../../Controller/DasboardApis/DashboardApi.js";
import { protect, authorizeDomain } from '../../Middlewares/authMiddleware/auth.js';
import express from 'express';

const router = express.Router();

// Public dashboard route (admin protected)
router.get('/counts', protect, CountsoftheUsers);

// Company dashboard
router.get('/getDashboardStats', protect, getDashboardStats);

// Superadmin/Admin analytics
router.get('/admin/stats', protect, authorizeDomain('superadmin', 'admin'), getAdminStats);
router.get('/admin/companies', protect, authorizeDomain('superadmin', 'admin'), getAdminCompanies);
router.patch('/admin/companies/:id/suspend', protect, authorizeDomain('superadmin', 'admin'), toggleCompanySuspend);
router.get('/admin/videos', protect, authorizeDomain('superadmin', 'admin'), getAdminVideos);
router.get('/admin/activities', protect, authorizeDomain('superadmin', 'admin'), getAdminActivities);

export default router;
