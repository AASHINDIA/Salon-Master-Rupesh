import express from 'express';
import { findJobsForWorker ,findWorkersForJob,getAllJobDetailsBySalon} from '../../Controller/FindJobWorker/FindJobAndWorker.js';
const router = express.Router();

// GET /api/matching/job/:jobId/workers - Find workers for a job post
router.get('/job/:jobId/workers', findWorkersForJob);

// GET /api/matching/worker/:candidateId/jobs - Find jobs for a worker
router.get('/worker/:candidateId/jobs', findJobsForWorker);

router.get('/getAllJobDetailsBySalon/:salonId', getAllJobDetailsBySalon);

export default router;