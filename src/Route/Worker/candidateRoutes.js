import express from 'express';
import { getCandidateProfile, saveCandidateProfile } from '../../Controller/Workers/candidateController.js';
import { roleCheck } from '../../Middlewares/authMiddleware/auth.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
import multer from 'multer';



const router = express.Router();
const storage = multer.memoryStorage(); // ✅ stores buffer in memory

const upload = multer({ storage });
// Protect all routes with auth middleware
router.use(protect);
// router.use(roleCheck('worker'))
// Get candidate profile
router.get('/', getCandidateProfile);

// Create or update candidate profile
router.post('/', upload.single('image'), saveCandidateProfile);

export default router;