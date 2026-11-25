import express from 'express';
import {
    createJobPosting,
    getAllJobPostings,
    RequestForJobToSuggestedCandidates,
    getRecommendedJobs,
    getJobPostingById,
    updateJobPosting,
    closeJobPosting,
    getJobRequestsForCandidate,
    getRequestedCandidatesForSalon,
    getCandidateRequests,
    getSuggestedCandidates,
    bulkUploadJobPostings
} from '../../Controller/JOB/jobPostingController.js';
import { protect, roleCheck, authorizeDomain } from '../../Middlewares/authMiddleware/auth.js';
import upload from '../../Middlewares/Uploadcsv/Uploadcsv.js';

const router = express.Router();

// Get all job postings (with pagination, search, and filters)
router.get('/', getAllJobPostings);



// Salon-specific routes (require salon authentication)
router.use(protect);
// roleCheck('salon')

router.get('/getJobRequestsForCandidate', getJobRequestsForCandidate);
router.get('/getRequestedCandidatesForSalon', getRequestedCandidatesForSalon);

// Create a new job posting
router.post('/', createJobPosting);

// Bulk upload jobs for the logged-in salon
router.post(
    '/bulk-upload',
    authorizeDomain('salon'),
    upload.single('file'),
    bulkUploadJobPostings
);
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