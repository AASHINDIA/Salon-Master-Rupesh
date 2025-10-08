import express from 'express';
import {
    getAllFranchiseLists,
    updateFranchiseList,
    deleteFranchiseList,
    toggleFranchiseListStatus,
    getAllTraningLists,
    updateTraningList,
    deleteTraningList,
    toggleTraningListStatus,
    getAllSellerListings,
    updateSellerListing,
    deleteSellerListing,
    toggleSellerListingStatus,
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

router.get('/training-lists', getAllTraningLists);
router.patch('/training-list/:id', upload.array('advertisementImages', 5), updateTraningList);
router.delete('/training-list/:id', deleteTraningList);
router.patch('/training-list/:id/toggle', toggleTraningListStatus);


router.get('/seller-listings', getAllSellerListings);
router.patch('/seller-listing/:id', upload.array('advertisementImages', 5), updateSellerListing);
router.delete('/seller-listing/:id', deleteSellerListing);
router.patch('/seller-listing/:id/toggle', toggleSellerListingStatus);


export default router;