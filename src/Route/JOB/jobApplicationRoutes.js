import express from 'express';
import {
    applyForJob,
    getJobApplications,
    getMyApplications,
    updateApplicationStatus,
    scheduleInterview
} from '../../Controller/JOB/jobApplicationController.js';
import { protect, roleCheck } from '../../Middlewares/authMiddleware/auth.js';
const router = express.Router();

// Candidate-specific routes
// router.use(protect, roleCheck('worker'));

// Apply for a job
router.post('/jobs/:jobId/apply', applyForJob);

// Get my applications
router.get('/my-applications', getMyApplications);

// Salon-specific routes
router.use(protect, roleCheck('salon'));

// Get applications for a specific job
router.get('/jobs/:jobId/applications', getJobApplications);

// Update application status
router.patch('/applications/:applicationId/status', updateApplicationStatus);

// Schedule interview
router.post('/applications/:applicationId/interview', scheduleInterview);

export default router;