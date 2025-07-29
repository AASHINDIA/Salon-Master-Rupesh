import express from 'express';
import {
    createJobPosting,
    getAllJobPostings,
    getRecommendedJobs,
    getJobPostingById,
    updateJobPosting,
    closeJobPosting
} from '../../Controller/JOB/jobPostingController.js';
import { protect, roleCheck } from '../../Middlewares/authMiddleware/auth.js';

const router = express.Router();

// Salon-specific routes (require salon authentication)
router.use(protect, roleCheck('salon'));

// Create a new job posting
router.post('/', createJobPosting);

// Update a job posting
router.put('/:id', updateJobPosting);

// Close a job posting
router.patch('/:id/close', closeJobPosting);

// Public routes (no role restriction)
router.use(protect);

// Get all job postings (with pagination, search, and filters)
router.get('/', getAllJobPostings);

// Get recommended jobs for candidate
router.get('/recommended', getRecommendedJobs);

// Get job posting by ID
router.get('/:id', getJobPostingById);

export default router;