import express from 'express';
import { updateJobApplicationStatus,updateSuggestedCandidateStatus } from '../../Controller/ApplicationStausUpdate/AppUpdate.js';
const router = express.Router();

// Route to update application status
router.put('/update-candidate/:candidateId', updateSuggestedCandidateStatus);   
router.put('/update-application/:applicationId', updateJobApplicationStatus);   
export default router;
