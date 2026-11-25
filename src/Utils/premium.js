import crypto from "crypto";
import Subscription from "../Modal/Subscriptions/subscriptions.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const toPositiveInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const buildPlanSnapshot = (plan) => {
    if (!plan) return null;

    return {
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        durationDays: plan.durationDays,
        scope: plan.scope,
    };
};

/**
 * Resolve the current premium status for a user.
 * Any active, in-window premium subscription keeps the user premium.
 */
export const getPremiumStatus = async (userId) => {
    if (!userId) {
        return { isPremium: false, subscription: null, expiresAt: null, daysLeft: 0 };
    }

    const now = new Date();

    const subscription = await Subscription.findOne({
        userId,
        scope: "premium",
        status: "active",
        startDate: { $lte: now },
        expiryDate: { $gt: now },
    })
        .sort({ expiryDate: -1 })
        .lean();

    // Lazy-expire stale premium rows so status values stay meaningful.
    await Subscription.updateMany(
        {
            userId,
            scope: "premium",
            status: "active",
            startDate: { $lte: now },
            expiryDate: { $lte: now },
        },
        { $set: { status: "expired" } }
    );

    if (!subscription) {
        return { isPremium: false, subscription: null, expiresAt: null, daysLeft: 0 };
    }

    const daysLeft = Math.max(
        0,
        Math.ceil((new Date(subscription.expiryDate).getTime() - now.getTime()) / DAY_MS)
    );

    return {
        isPremium: true,
        subscription,
        plan: subscription.planSnapshot || null,
        startedAt: subscription.startDate,
        expiresAt: subscription.expiryDate,
        daysLeft,
        source: subscription.source || "system",
    };
};

/**
 * Create (or extend) a premium subscription.
 *
 * - Stacking: when premium is already active the new period starts at the
 *   current expiry (so buying twice does not lose time).
 * - Idempotency: a duplicate paymentId returns the existing subscription.
 */
export const activatePremium = async ({
    userId,
    planId = null,
    durationDays,
    planSnapshot = null,
    paymentId = null,
    orderId = null,
    source = "system",
    paymentMethod = "manual",
    amount = 0,
    currency = "INR",
    notes = "",
}) => {
    if (!userId) {
        throw new Error("User is required to activate premium");
    }

    const days = toPositiveInt(durationDays, 0);
    if (!days) {
        throw new Error("A positive premium duration is required");
    }

    if (paymentId) {
        const existing = await Subscription.findOne({
            scope: "premium",
            $or: [{ transactionId: paymentId }, { paymentId }],
        });

        if (existing) return existing;
    }

    const now = new Date();

    const latest = await Subscription.findOne({
        userId,
        scope: "premium",
        status: "active",
        expiryDate: { $gt: now },
    })
        .sort({ expiryDate: -1 })
        .lean();

    const startDate = latest && new Date(latest.expiryDate) > now
        ? new Date(latest.expiryDate)
        : now;

    const expiryDate = new Date(startDate.getTime() + days * DAY_MS);

    const transactionId = paymentId
        || `premium_admin_${userId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    try {
        return await Subscription.create({
            userId,
            planId,
            startDate,
            expiryDate,
            status: "active",
            amount,
            currency,
            paymentMethod,
            transactionId,
            autoRenew: false,
            usageCount: 0,
            maxUsageLimit: null,
            type: planId ? "plan" : "custom",
            scope: "premium",
            source,
            orderId,
            paymentId,
            planSnapshot,
            notes,
        });
    } catch (error) {
        // Race between verify and webhook (or double click): return the winner.
        if (error.code === 11000) {
            const existing = await Subscription.findOne({
                scope: "premium",
                $or: [{ transactionId }, ...(paymentId ? [{ paymentId }] : [])],
            });

            if (existing) return existing;
        }

        throw error;
    }
};

export const revokePremium = async (userId, reason = "") => {
    const now = new Date();

    const result = await Subscription.updateMany(
        {
            userId,
            scope: "premium",
            status: "active",
            expiryDate: { $gt: now },
        },
        {
            $set: {
                status: "canceled",
                expiryDate: now,
                notes: reason || "Revoked by admin",
            },
        }
    );

    return result.modifiedCount || 0;
};
