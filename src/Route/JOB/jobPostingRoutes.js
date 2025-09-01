import express from 'express';
import {
    createJobPosting,
    getAllJobPostings,
    RequestForJobToSuggestedCandidates,
    getRecommendedJobs,
    getJobPostingById,
    updateJobPosting,
    closeJobPosting,
    getCandidateRequests,
    getSuggestedCandidates
} from '../../Controller/JOB/jobPostingController.js';
import { protect, roleCheck } from '../../Middlewares/authMiddleware/auth.js';

const router = express.Router();

// Get all job postings (with pagination, search, and filters)
router.get('/', getAllJobPostings);
// Salon-specific routes (require salon authentication)
router.use(protect);
// roleCheck('salon')
// Create a new job posting
router.post('/', createJobPosting);
router.post('/suggestcandidate', getSuggestedCandidates);

router.post('/RequestForJobToSuggestedCandidates', RequestForJobToSuggestedCandidates);

router.get('/getCandidateRequests', getCandidateRequests);

// Update a job posting
router.put('/:id', updateJobPosting);

// Close a job posting
router.patch('/:id/close', closeJobPosting);

// Public routes (no role restriction)
router.use(protect);



// Get recommended jobs for candidate
router.get('/recommended', getRecommendedJobs);

// Get job posting by ID
router.get('/:id', getJobPostingById);

export default router;