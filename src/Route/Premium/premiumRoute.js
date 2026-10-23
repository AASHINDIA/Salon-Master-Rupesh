import express from "express";

import { protect } from "../../Middlewares/authMiddleware/auth.js";
import { checkAccess } from "../../Middlewares/Permission/RolePermission.js";
import {
    createPremiumPlan,
    getPremiumPlans,
    updatePremiumPlan,
    togglePremiumPlan,
    getPremiumStatusHandler,
    grantPremiumAdmin,
    revokePremiumAdmin,
    listPremiumSubscriptionsAdmin,
} from "../../Controller/Premium/premium.controller.js";
import {
    createPremiumOrder,
    verifyPremiumPayment,
} from "../../Controller/Premium/premiumPayment.js";

const router = express.Router();

// Public
router.get("/plans", getPremiumPlans);

// Admin plan management
router.post("/plans", protect, checkAccess("PlansManagement"), createPremiumPlan);
router.put("/plans/:id", protect, checkAccess("PlansManagement"), updatePremiumPlan);
router.patch("/plans/:id/toggle", protect, checkAccess("PlansManagement"), togglePremiumPlan);

// User purchase flow
router.post("/checkout", protect, createPremiumOrder);
router.post("/verify", protect, verifyPremiumPayment);
router.get("/status", protect, getPremiumStatusHandler);

// Admin overrides
router.post("/admin/grant", protect, checkAccess("PlansManagement"), grantPremiumAdmin);
router.post("/admin/revoke", protect, checkAccess("PlansManagement"), revokePremiumAdmin);
router.get("/admin/subscriptions", protect, checkAccess("PlansManagement"), listPremiumSubscriptionsAdmin);

export default router;
