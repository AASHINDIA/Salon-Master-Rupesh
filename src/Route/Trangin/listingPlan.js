import express from "express";
import { protect, authorizeDomain } from "../../Middlewares/authMiddleware/auth.js";
import {
    createListingPlan,
    getAllListingPlans,
    getListingPlanById,
    updateListingPlan,
    deleteListingPlan,
    toggleListingPlanStatus,
} from "../../Controller/Plan/listingPlan.controller.js";

const router = express.Router();

router.post("/listing-plans", protect, authorizeDomain("superadmin", "admin"), createListingPlan);
router.get("/listing-plans", protect, authorizeDomain("superadmin", "admin"), getAllListingPlans);
router.get("/listing-plans/:id", protect, authorizeDomain("superadmin", "admin"), getListingPlanById);
router.put("/listing-plans/:id", protect, authorizeDomain("superadmin", "admin"), updateListingPlan);
router.patch("/listing-plans/:id/toggle", protect, authorizeDomain("superadmin", "admin"), toggleListingPlanStatus);
router.delete("/listing-plans/:id", protect, authorizeDomain("superadmin", "admin"), deleteListingPlan);

export default router;
