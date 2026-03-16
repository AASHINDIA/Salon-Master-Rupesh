import Plan from "../../Modal/Wallet/Plan.js";
import User from "../../Modal/Users/User.js";
import TrainingVideo from "../../Modal/SuperAdmin/TraningVideos.js";
import TrainingPurchase from "../../Modal/SuperAdmin/BuyTraning.js";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
});


export const createTrainingOrder = async (req, res) => {
    try {
        const { trainingId } = req.body;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(trainingId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid training ID"
            });
        }

        /**
         * STEP 1
         * Get training video
         */
        const video = await TrainingVideo.findById(trainingId).lean();

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Training not found"
            });
        }

        if (video.accessType === "free") {
            return res.status(400).json({
                success: false,
                message: "Free training does not require payment"
            });
        }

        /**
         * STEP 2
         * Validate plan
         */
        if (!video.plan) {
            return res.status(400).json({
                success: false,
                message: "Training plan not configured"
            });
        }

        const plan = await Plan.findOne({
            _id: video.plan,
            isActive: true,
            isDeleted: false
        }).lean();

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found"
            });
        }

        /**
         * STEP 3
         * Calculate price from plan
         */
        const finalPrice =
            plan.discount > 0
                ? plan.price - (plan.price * plan.discount / 100)
                : plan.price;

        /**
         * STEP 4
         * Razorpay receipt (max 40 chars)
         */
        const receipt = `tr_${trainingId.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;

        /**
         * STEP 5
         * Create Razorpay order
         */
        const options = {
            amount: Math.round(finalPrice * 100), // paisa
            currency: plan.currency || "INR",
            receipt,
            notes: {
                userId: userId.toString(),
                trainingId: trainingId.toString(),
                planId: plan._id.toString()
            }
        };

        const order = await razorpay.orders.create(options);

        console.log(
            `Razorpay order created: ${order.id} | user: ${userId} | training: ${trainingId}`
        );

        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_API_KEY
        });

    } catch (error) {
        console.error("Create order error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const verifyTrainingPayment = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            trainingId
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        console.log("process.env.RAZORPAY_KEY_SECRET", process.env.RAZORPAY_KEY_SECRET)
        console.log("body", body)
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid payment signature" });
        }

        const video = await TrainingVideo.findById(trainingId);

        if (!video) {
            return res.status(404).json({ message: "Training not found" });
        }

        // Create Purchase Record
        const purchase = await TrainingPurchase.create({
            user: userId,
            training: trainingId,
            transactionId: razorpay_payment_id,
            paymentStatus: "completed",
            accessExpiresAt: null, // lifetime (or calculate if subscription)
        });

        // Increment purchase count
        await TrainingVideo.updateOne(
            { _id: trainingId },
            { $inc: { purchasesCount: 1 } }
        );

        return res.json({
            success: true,
            message: "Payment verified and access granted"
        });

    } catch (error) {
        console.error("Verify payment error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const razorpayWebhook = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (signature !== expectedSignature) {
        return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body.event;

    if (event === "payment.captured") {
        const payment = req.body.payload.payment.entity;

        const { userId, trainingId } = payment.notes;

        await TrainingPurchase.create({
            user: userId,
            training: trainingId,
            transactionId: payment.id,
            paymentStatus: "completed"
        });

        await TrainingVideo.updateOne(
            { _id: trainingId },
            { $inc: { purchasesCount: 1 } }
        );
    }

    res.json({ status: "ok" });
};