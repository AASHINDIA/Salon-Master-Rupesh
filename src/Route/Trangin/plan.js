import express from "express";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
import { createPlanService, getAllPlans, getPlanById, updatePlan, togglePlanStatus } from "../../Controller/Plan/plan.controller.js";
const router = express.Router();
router.post("/plans", protect, createPlanService);
router.get("/plans", getAllPlans);
router.get("/plans/:id", getPlanById);
router.put("/plans/:id", protect, updatePlan);
router.patch("/plans/:id/toggle", protect, togglePlanStatus);


export default router;
