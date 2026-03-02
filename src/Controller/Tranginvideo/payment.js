import Plan from "../../Modal/Wallet/Plan.js";
import User from "../../Modal/Users/User.js";
import TrainingVideo from "../../Modal/SuperAdmin/TraningVideos.js";
import TrainingPurchase from "../../Modal/SuperAdmin/BuyTraning.js";
import mongoose from "mongoose";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});



export const createTrainingOrder = async (req, res) => {
    try {
        const { trainingId } = req.body;
        const userId = req.user._id;

        const video = await TrainingVideo.findOne({
            _id: trainingId,
            isActive: true,
            isDeleted: false,
        });

        if (!video) {
            return res.status(404).json({ message: "Training not found" });
        }

        if (video.accessType === "free") {
            return res.status(400).json({ message: "Free training does not require payment" });
        }

        const options = {
            amount: video.price * 100, // Razorpay uses paise
            currency: video.currency || "INR",
            receipt: `training_${trainingId}_${Date.now()}`,
            notes: {
                userId: userId.toString(),
                trainingId: trainingId.toString(),
            },
        };

        const order = await razorpay.orders.create(options);

        return res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
        });

    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ message: "Internal server error" });
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