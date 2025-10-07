import express from "express";
import multer from "multer";
import { updateSubDomainType, getSellerListingsByUser, createOrUpdateCommonSeller, getCommonSellerProfile, createSellerListing } from "../../Controller/saleandbuysalon/salonbuy.js";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
const router = express.Router();

// memory storage for Cloudinary upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/createOrUpdateCommonSeller", protect, upload.single("profileImage"), createOrUpdateCommonSeller);
router.post("/createSellerListing", protect, upload.array("advertisementImages", 5), createSellerListing);

router.get("/profile", protect, getCommonSellerProfile);
router.patch("/updateSubDomainType", protect, updateSubDomainType);

router.get("/getSellerListingsByUser", protect, getSellerListingsByUser);

export default router;
