import express from 'express';
import multer from 'multer';
import {
    importAcademyCSV,
    importClassifiedCSV,
    importFranchiseeCSV
} from '../../../Controller/FTC/uploadFile.js';
 // Adjust path as needed

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// CSV import routes
router.post('/academy/import', upload.single('file'), importAcademyCSV);
router.post('/classified/import', upload.single('file'), importClassifiedCSV);
router.post('/franchisee/import', upload.single('file'), importFranchiseeCSV);

export default router;