import express from 'express';
import { getInterestsForUserListings, expressInterest, getUserInterests ,withdrawInterest} from '../../Controller/InterestedController/InterestedController.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
const router = express.Router();


// expressInterest in a listing
router.post('/express-interest', protect, expressInterest);
// get all interests expressed by the logged-in user    
router.post('/getUserInterests', protect, getUserInterests);

// Get interests for all listings of the logged-in user
router.get('/user-listings', protect, getInterestsForUserListings);
router.delete('/withdraw-interest/:interestId', protect, withdrawInterest);

export default router;
