import dotenv from "dotenv";
import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";

import Plan from "../../Modal/Wallet/Plan.js";
import PremiumOrder from "../../Modal/Premium/PremiumOrder.js";
import Subscription from "../../Modal/Subscriptions/subscriptions.js";
import {
    activatePremium,
    buildPlanSnapshot,
    getPremiumStatus,
} from "../../Utils/premium.js";

dotenv.config();

const getRazorpay = () => {
    if (!process.env.RAZORPAY_API_KEY || !process.env.RAZORPAY_API_SECRET) {
        return null;
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_API_KEY,
        key_secret: process.env.RAZORPAY_API_SECRET,
    });
};

const calculatePrice = (plan) =>
    plan.discount > 0
        ? Number((plan.price - (plan.price * plan.discount) / 100).toFixed(2))
        : plan.price;

const signaturesMatch = (actual, expected) => {
    if (typeof actual !== "string" || typeof expected !== "string") return false;

    const actualBuffer = Buffer.from(actual, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    return (
        actualBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    );
};

const mapPaymentMethod = (payment) => {
    const method = payment?.method;

    if (method === "card") {
        return payment?.card?.type === "debit" ? "debit_card" : "credit_card";
    }

    if (method === "upi") return "upi";
    if (method === "wallet") return "paypal";
    if (method === "netbanking") return "manual";

    return "manual";
};

const serializeStatus = (status) => ({
    isPremium: status.isPremium,
    plan: status.plan || null,
    startedAt: status.startedAt || null,
    expiresAt: status.expiresAt || null,
    daysLeft: status.daysLeft || 0,
    source: status.source || null,
});

export const createPremiumOrder = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { planId } = req.body || {};

        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return res.status(400).json({ success: false, message: "Invalid planId" });
        }

        const plan = await Plan.findOne({
            _id: planId,
            scope: "premium",
            isActive: true,
            isDeleted: false,
        }).lean();

        if (!plan) {
            return res.status(404).json({ success: false, message: "Premium plan not found" });
        }

        if (!Number.isInteger(plan.durationDays) || plan.durationDays <= 0) {
            return res.status(400).json({ success: false, message: "Premium plan has no valid duration" });
        }

        const idempotencyKey = (req.get("Idempotency-Key") || "").trim() || null;
        const now = new Date();

        if (idempotencyKey) {
            const existing = await PremiumOrder.findOne({
                user: userId,
                idempotencyKey,
                status: "created",
                expiresAt: { $gt: now },
            }).lean();

            if (existing) {
                return res.status(200).json({
                    success: true,
                    reused: true,
                    orderId: existing.orderId,
                    amount: Math.round(existing.amount * 100),
                    currency: existing.currency,
                    key: process.env.RAZORPAY_API_KEY,
                    plan: existing.planSnapshot,
                });
            }
        }

        const razorpay = getRazorpay();

        if (!razorpay) {
            return res.status(503).json({ success: false, message: "Payment gateway is not configured" });
        }

        const finalPrice = calculatePrice(plan);
        const amountInPaisa = Math.round(finalPrice * 100);

        if (amountInPaisa <= 0) {
            return res.status(400).json({ success: false, message: "Plan amount must be greater than zero" });
        }

        const receipt = `prm_${plan._id.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;

        const order = await razorpay.orders.create({
            amount: amountInPaisa,
            currency: plan.currency || "INR",
            receipt,
            notes: {
                userId: userId.toString(),
                planId: plan._id.toString(),
                purpose: "premium",
                durationDays: String(plan.durationDays),
                price: String(finalPrice),
            },
        });

        const snapshot = buildPlanSnapshot(plan);

        try {
            await PremiumOrder.create({
                user: userId,
                plan: plan._id,
                orderId: order.id,
                amount: finalPrice,
                currency: order.currency || plan.currency || "INR",
                status: "created",
                idempotencyKey,
                planSnapshot: snapshot,
            });
        } catch (error) {
            if (error.code === 11000 && idempotencyKey) {
                const existing = await PremiumOrder.findOne({
                    user: userId,
                    idempotencyKey,
                }).lean();

                if (existing) {
                    return res.status(200).json({
                        success: true,
                        reused: true,
                        orderId: existing.orderId,
                        amount: Math.round(existing.amount * 100),
                        currency: existing.currency,
                        key: process.env.RAZORPAY_API_KEY,
                        plan: existing.planSnapshot,
                    });
                }
            }

            throw error;
        }

        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_API_KEY,
            plan: snapshot,
        });
    } catch (error) {
        console.error("CREATE_PREMIUM_ORDER_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to create premium order" });
    }
};

export const verifyPremiumPayment = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body || {};

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment details are incomplete" });
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_API_SECRET || "")
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (!signaturesMatch(razorpay_signature, expectedSignature)) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        const order = await PremiumOrder.findOne({
            orderId: razorpay_order_id,
            user: userId,
        }).lean();

        if (!order) {
            return res.status(404).json({ success: false, message: "Premium order not found" });
        }

        if (order.status === "paid") {
            const status = await getPremiumStatus(userId);

            return res.status(200).json({
                success: true,
                message: "Payment already verified",
                alreadyProcessed: true,
                data: serializeStatus(status),
            });
        }

        // Best-effort check with Razorpay; signature is still the source of truth.
        let payment = null;
        const razorpay = getRazorpay();

        if (razorpay) {
            try {
                payment = await razorpay.payments.fetch(razorpay_payment_id);

                if (payment?.order_id && payment.order_id !== razorpay_order_id) {
                    return res.status(400).json({ success: false, message: "Payment does not belong to this order" });
                }

                if (payment && !["captured", "authorized"].includes(payment.status)) {
                    return res.status(400).json({ success: false, message: `Payment is ${payment.status}` });
                }
            } catch (error) {
                console.warn("Could not fetch Razorpay payment; continuing with signature check:", error.message);
            }
        }

        const subscription = await activatePremium({
            userId,
            planId: order.plan,
            durationDays: order.planSnapshot?.durationDays,
            planSnapshot: order.planSnapshot,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            source: "razorpay",
            paymentMethod: mapPaymentMethod(payment),
            amount: order.amount,
            currency: order.currency,
            notes: "Premium purchase",
        });

        await PremiumOrder.updateOne(
            { _id: order._id, status: { $ne: "paid" } },
            {
                $set: {
                    status: "paid",
                    paymentId: razorpay_payment_id,
                },
            }
        );

        const status = await getPremiumStatus(userId);

        return res.status(200).json({
            success: true,
            message: "Premium activated successfully",
            data: {
                subscription,
                status: serializeStatus(status),
            },
        });
    } catch (error) {
        console.error("VERIFY_PREMIUM_PAYMENT_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to verify premium payment" });
    }
};

export const premiumWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_PREMIUM_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!secret) {
            console.error("Premium webhook secret is not configured");
            return res.status(500).json({ status: "error", message: "Webhook secret not configured" });
        }

        const signature = req.headers["x-razorpay-signature"];
        const rawBody = Buffer.isBuffer(req.body)
            ? req.body.toString("utf8")
            : typeof req.body === "string"
                ? req.body
                : "";

        if (!rawBody) {
            return res.status(400).json({ status: "error", message: "Missing webhook body" });
        }

        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");

        if (!signaturesMatch(signature, expectedSignature)) {
            return res.status(400).json({ status: "error", message: "Invalid webhook signature" });
        }

        const payload = JSON.parse(rawBody || "{}");
        const event = payload.event;
        const payment = payload?.payload?.payment?.entity;

        if (event === "payment.captured" && payment) {
            const notes = payment.notes || {};

            const order = payment.order_id
                ? await PremiumOrder.findOne({ orderId: payment.order_id }).lean()
                : null;

            const purpose = order ? "premium" : notes.purpose;
            const userId = order ? order.user?.toString() : notes.userId;
            const planId = order ? order.plan?.toString() : notes.planId;
            const durationDays = order?.planSnapshot?.durationDays
                ?? parseInt(notes.durationDays, 10);

            if (purpose === "premium" && userId && planId && Number.isInteger(durationDays) && durationDays > 0) {
                const planSnapshot = order?.planSnapshot || {
                    name: "Premium plan",
                    price: Number(notes.price) || payment.amount / 100,
                    currency: payment.currency,
                    durationDays,
                    scope: "premium",
                };

                await activatePremium({
                    userId,
                    planId,
                    durationDays,
                    planSnapshot,
                    paymentId: payment.id,
                    orderId: payment.order_id,
                    source: "razorpay",
                    paymentMethod: mapPaymentMethod(payment),
                    amount: order?.amount ?? payment.amount / 100,
                    currency: order?.currency || payment.currency || "INR",
                    notes: "Premium purchase (webhook)",
                });

                await PremiumOrder.updateOne(
                    { orderId: payment.order_id },
                    {
                        $set: {
                            status: "paid",
                            paymentId: payment.id,
                        },
                    }
                );
            }
        }

        if (event === "payment.failed" && payment) {
            await PremiumOrder.updateOne(
                { orderId: payment.order_id, status: "created" },
                { $set: { status: "failed", paymentId: payment.id } }
            );
        }

        if (event === "payment.refunded" && payment) {
            await Subscription.updateMany(
                {
                    scope: "premium",
                    paymentId: payment.id,
                    status: "active",
                },
                {
                    $set: {
                        status: "canceled",
                        expiryDate: new Date(),
                        notes: "Payment refunded",
                    },
                }
            );
        }

        return res.status(200).json({ status: "ok" });
    } catch (error) {
        console.error("PREMIUM_WEBHOOK_ERROR:", error);
        return res.status(500).json({ status: "error" });
    }
};
