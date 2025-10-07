import express, { Router } from 'express';
import {
    createFranchiseList,
    createTraningList,
    createOrUpdatefranchise,
    createOrUpdatetraininginstitute
} from '../../Controller/Listing/Listing.js';
import multer from 'multer';
import { uploadToCloudinary } from '../../Utils/imageUpload.js';
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

// Routes for creating listings (multiple files)
router.post('/training-list', upload.array('advertisementImages', 4), createTraningList);
router.post('/franchise-list', upload.array('advertisementImages', 4), createFranchiseList);

// Routes for creating/updating profiles (single file)
router.post('/training-institute', upload.single('profileImage'), createOrUpdatetraininginstitute);
router.post('/franchise', upload.single('profileImage'), createOrUpdatefranchise);

export default router;