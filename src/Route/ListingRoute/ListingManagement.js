import express from 'express';
import {
    getAllFranchiseLists,
    updateFranchiseList,
    deleteFranchiseList,
    toggleFranchiseListStatus,
    toggleFranchiseContactVisibility,
    getAllTraningLists,
    updateTraningList,
    deleteTraningList,
    toggleTraningListStatus,
    toggleTraningContactVisibility,
    getAllSellerListings,
    updateSellerListing,
    deleteSellerListing,
    toggleSellerListingStatus,
    toggleSellerContactVisibility,
} from '../../Controller/Listing/ListingManagment.js';


import multer from 'multer';

const router = express.Router();
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});


router.get('/franchise-lists', getAllFranchiseLists);
router.patch('/franchise-list/:id', upload.array('advertisementImages', 5), updateFranchiseList);
router.delete('/franchise-list/:id', deleteFranchiseList);
router.patch('/franchise-list/:id/toggle', toggleFranchiseListStatus);
router.patch('/franchise-list/:id/toggle-visibility', toggleFranchiseContactVisibility);

router.get('/training-lists', getAllTraningLists);
router.patch('/training-list/:id', upload.array('advertisementImages', 5), updateTraningList);
router.delete('/training-list/:id', deleteTraningList);
router.patch('/training-list/:id/toggle', toggleTraningListStatus);
router.patch('/training-list/:id/toggle-visibility', toggleTraningContactVisibility);

router.get('/seller-listings', getAllSellerListings);
router.patch('/seller-listing/:id', upload.array('advertisementImages', 5), updateSellerListing);
router.delete('/seller-listing/:id', deleteSellerListing);
router.patch('/seller-listing/:id/toggle', toggleSellerListingStatus);
router.patch('/seller-listing/:id/toggle-visibility', toggleSellerContactVisibility);

export default router;
