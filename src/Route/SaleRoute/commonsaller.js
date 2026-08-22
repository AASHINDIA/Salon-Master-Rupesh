import express from "express";
import multer from "multer";
import { updateSubDomainType, getSellerListingsByUser, createOrUpdateCommonSeller, getCommonSellerProfile, createSellerListing } from "../../Controller/saleandbuysalon/salonbuy.js";
import { createListingOrder, verifyListingPayment, updateSellerListing, getListingPlans } from "../../Controller/saleandbuysalon/listingPayment.js";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
const router = express.Router();
// ssh root@89.116.34.240
// Ganga135790#
// memory storage for Cloudinary upload
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

router.post("/createOrUpdateCommonSeller", protect, upload.single("profileImage"), createOrUpdateCommonSeller);
router.post("/createSellerListing", protect, upload.array("advertisementImages", 5), createSellerListing);

router.get("/profile", protect, getCommonSellerProfile);
router.patch("/updateSubDomainType", protect, updateSubDomainType);

router.get("/getSellerListingsByUser", protect, getSellerListingsByUser);

// ✅ Payment System Routes
router.get("/listing/plans", protect, getListingPlans);
router.post("/listing/payment/order", protect, createListingOrder);
router.post("/listing/payment/verify", protect, verifyListingPayment);
router.post("/listing/update", protect, upload.array("advertisementImages", 5), updateSellerListing);

export default router;
