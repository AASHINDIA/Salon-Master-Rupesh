import express from 'express';
import { getCandidateProfile, saveCandidateProfile,getAllCandidates } from '../../Controller/Workers/candidateController.js';
import { roleCheck } from '../../Middlewares/authMiddleware/auth.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
import multer from 'multer';



const router = express.Router();
const storage = multer.memoryStorage(); // ✅ stores buffer in memory

const upload = multer({ storage });
// Protect all routes with auth middleware


router.get('/getallcandidates', getAllCandidates);
router.use(protect);
// router.use(roleCheck('worker'))
// Get candidate profile
router.get('/', getCandidateProfile);

// Create or update candidate profile
const upload = multer({ storage }); // assuming you defined storage earlier

router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },     // Profile image
    { name: 'id_front', maxCount: 1 },  // Front side of ID
    { name: 'id_back', maxCount: 1 }    // Back side of ID
  ]),
  saveCandidateProfile
);

export default router;