import express, { Router } from 'express';
import {
    createFranchiseList,
    createTraningList,
    createOrUpdatefranchise,
    createOrUpdatetraininginstitute,
    gettraininginstituteProfile,
    getfranchiseProfile,
    gettraininginstituteListingsByUser,
    getfranchiseListingsByUser,
    getFranchiseListings,
    getTraningListListings,
    getSellerListing

} from '../../Controller/Listing/Listing.js';
import multer from 'multer';
import { uploadToCloudinary } from '../../Utils/imageUpload.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
const router = express.Router();

// Configur``e multer for file uploads
const storage = multer.memoryStorage(); // Keeps image in memory before uploading to Cloudinary

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Routes for creating listings (multiple files)
router.post('/training-list', protect, upload.array('advertisementImages', 4), createTraningList);
router.post('/franchise-list', protect, upload.array('advertisementImages', 4), createFranchiseList);

// Routes for creating/updating profiles (single file)
router.post('/training-institute', protect, upload.single('profileImage'), createOrUpdatetraininginstitute);
router.post('/franchise', protect, upload.single('profileImage'), createOrUpdatefranchise);
router.get('/gettraininginstituteProfile', protect, gettraininginstituteProfile)
router.get('/getfranchiseProfile', protect, getfranchiseProfile)


router.get('/getfranchiseListingsByUser', protect, getfranchiseListingsByUser)
router.get('/gettraininginstituteListingsByUser', protect, gettraininginstituteListingsByUser)

router.get('/getFranchiseListings', protect, getFranchiseListings)
router.get('/getTraningListListings', protect, getTraningListListings)
router.get('/getSellerListing', protect, getSellerListing)



export default router;