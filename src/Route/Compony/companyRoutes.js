import express from 'express';
import { getCompanyProfile, saveCompanyProfile } from '../../Controller/Compony/companyController.js';
import multer from 'multer';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
import { roleCheck } from '../../Middlewares/authMiddleware/auth.js';
const router = express.Router();
const storage = multer.memoryStorage(); // ✅ stores buffer in memory
const upload = multer({ storage });
// Protect all routes with auth middleware
router.use(protect);
// router.use(roleCheck('compony'));

// Get company profile
router.get('/', getCompanyProfile);

// Create or update company profile
router.post('/', upload.single('image'), saveCompanyProfile);

export default router;