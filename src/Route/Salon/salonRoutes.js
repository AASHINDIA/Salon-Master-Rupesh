import express from 'express';

import { getSalonProfile, saveSalonProfile } from '../../Controller/Salon/salonController.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
import { roleCheck } from '../../Middlewares/authMiddleware/auth.js';
import multer from 'multer';
const router = express.Router();

const storage = multer.memoryStorage(); // ✅ stores buffer in memory
const upload = multer({ storage });// Protect all routes with auth middleware
router.use(protect);
router.use(roleCheck('salon'));

// Get salon profile
router.get('/', getSalonProfile);

// Create or update salon profile
router.post('/', upload.single('profile'), saveSalonProfile);

export default router;