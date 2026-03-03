import express from "express";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
import { createTrainingOrder,verifyTrainingPayment } from "../../Controller/Tranginvideo/payment.js";
const router = express.Router();

router.post("/payments", protect, createTrainingOrder);
router.post("/payments/verify", protect, verifyTrainingPayment);


export default router;