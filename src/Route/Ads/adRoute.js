import express from "express";
import rateLimit from "express-rate-limit";

import { protect } from "../../Middlewares/authMiddleware/auth.js";
import {
    initReward,
    getRewardStatus,
    getPendingRewards,
    claimReward,
    abandonReward,
} from "../../Controller/Ads/adReward.controller.js";

const router = express.Router();

const userKey = (req) => `user:${req.user?._id || req.user?.id || "anonymous"}`;

const initLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKey,
    message: {
        success: false,
        message: "Too many ad requests. Please wait a moment and try again.",
    },
});

const claimLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKey,
    message: {
        success: false,
        message: "Too many attempts. Please wait a moment and try again.",
    },
});

const statusLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKey,
    message: {
        success: false,
        message: "Too many status checks. Please wait a moment.",
    },
});

router.post("/reward/init", protect, initLimiter, initReward);
router.get("/reward/pending", protect, statusLimiter, getPendingRewards);
router.get("/reward/:requestId/status", protect, statusLimiter, getRewardStatus);
router.post("/reward/:requestId/claim", protect, claimLimiter, claimReward);
router.post("/reward/:requestId/abandon", protect, abandonReward);

export default router;
