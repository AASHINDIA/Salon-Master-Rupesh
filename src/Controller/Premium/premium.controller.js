import mongoose from "mongoose";
import slugify from "slugify";

import Plan from "../../Modal/Wallet/Plan.js";
import Subscription from "../../Modal/Subscriptions/subscriptions.js";
import User from "../../Modal/Users/User.js";
import {
    activatePremium,
    buildPlanSnapshot,
    getPremiumStatus,
    revokePremium,
} from "../../Utils/premium.js";

const ALLOWED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"];

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const serializeStatus = (status) => ({
    isPremium: status.isPremium,
    adsEnabled: status.adsEnabled,
    plan: status.plan || null,
    startedAt: status.startedAt || null,
    expiresAt: status.expiresAt || null,
    daysLeft: status.daysLeft || 0,
    source: status.source || null,
});

const validatePlanPayload = (body, { partial = false } = {}) => {
    const errors = [];

    if (!partial || body.name !== undefined) {
        if (!body.name || typeof body.name !== "string") {
            errors.push("Plan name must be a valid string");
        }
    }

    if (!partial || body.description !== undefined) {
        if (!body.description || typeof body.description !== "string") {
            errors.push("Description must be a valid string");
        }
    }

    if (!partial || body.price !== undefined) {
        if (typeof body.price !== "number" || body.price < 0) {
            errors.push("Price must be a number >= 0");
        }
    }

    if (!partial || body.durationDays !== undefined) {
        if (!Number.isInteger(body.durationDays) || body.durationDays <= 0) {
            errors.push("durationDays must be a positive integer");
        }
    }

    if (body.currency !== undefined && !ALLOWED_CURRENCIES.includes(body.currency)) {
        errors.push("Invalid currency");
    }

    if (body.discount !== undefined && (typeof body.discount !== "number" || body.discount < 0 || body.discount > 100)) {
        errors.push("discount must be between 0 and 100");
    }

    return errors;
};

export const createPremiumPlan = async (req, res) => {
    try {
        const errors = validatePlanPayload(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const slug = slugify(req.body.name.trim(), { lower: true, strict: true, trim: true });

        if (!slug) {
            return res.status(400).json({ success: false, message: "Invalid plan name" });
        }

        const plan = await Plan.create({
            name: req.body.name.trim(),
            slug,
            description: req.body.description.trim(),
            price: req.body.price,
            currency: req.body.currency || "INR",
            token: 0,
            discount: req.body.discount || 0,
            features: Array.isArray(req.body.features) ? req.body.features : [],
            priority: req.body.priority || 0,
            scope: "premium",
            durationDays: req.body.durationDays,
        });

        return res.status(201).json({
            success: true,
            message: "Premium plan created successfully",
            data: plan,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "A plan with this name already exists" });
        }

        console.error("CREATE_PREMIUM_PLAN_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to create premium plan" });
    }
};

export const getPremiumPlans = async (req, res) => {
    try {
        const plans = await Plan.find({
            scope: "premium",
            isActive: true,
            isDeleted: false,
        })
            .sort({ priority: -1, price: 1 })
            .lean();

        return res.status(200).json({ success: true, data: plans });
    } catch (error) {
        console.error("GET_PREMIUM_PLANS_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch premium plans" });
    }
};

export const updatePremiumPlan = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid plan id" });
        }

        const errors = validatePlanPayload(req.body || {}, { partial: true });

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const allowedFields = [
            "name",
            "description",
            "price",
            "currency",
            "discount",
            "features",
            "priority",
            "durationDays",
            "isActive",
        ];

        const update = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                update[field] = req.body[field];
            }
        });

        if (typeof update.name === "string") {
            update.name = update.name.trim();
            update.slug = slugify(update.name, { lower: true, strict: true, trim: true });

            if (!update.slug) {
                return res.status(400).json({ success: false, message: "Invalid plan name" });
            }
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ success: false, message: "No fields provided to update" });
        }

        const plan = await Plan.findOneAndUpdate(
            { _id: id, scope: "premium" },
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ success: false, message: "Premium plan not found" });
        }

        return res.status(200).json({ success: true, data: plan });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "A plan with this name already exists" });
        }

        console.error("UPDATE_PREMIUM_PLAN_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to update premium plan" });
    }
};

export const togglePremiumPlan = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid plan id" });
        }

        const plan = await Plan.findOne({ _id: id, scope: "premium" });

        if (!plan) {
            return res.status(404).json({ success: false, message: "Premium plan not found" });
        }

        plan.isActive = !plan.isActive;
        await plan.save();

        return res.status(200).json({
            success: true,
            message: `Premium plan is now ${plan.isActive ? "active" : "inactive"}`,
            data: { id: plan._id, isActive: plan.isActive },
        });
    } catch (error) {
        console.error("TOGGLE_PREMIUM_PLAN_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to toggle premium plan" });
    }
};

export const getPremiumStatusHandler = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const status = await getPremiumStatus(userId);

        return res.status(200).json({ success: true, data: serializeStatus(status) });
    } catch (error) {
        console.error("GET_PREMIUM_STATUS_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch premium status" });
    }
};

export const grantPremiumAdmin = async (req, res) => {
    try {
        const { userId, planId = null, durationDays = null, notes = "" } = req.body || {};

        if (!isObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Valid userId is required" });
        }

        const user = await User.findById(userId).select("_id name whatsapp_number");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let plan = null;
        let days = Number(durationDays);

        if (planId) {
            if (!isObjectId(planId)) {
                return res.status(400).json({ success: false, message: "Invalid planId" });
            }

            plan = await Plan.findOne({ _id: planId, scope: "premium", isDeleted: false });

            if (!plan) {
                return res.status(404).json({ success: false, message: "Premium plan not found" });
            }

            if (!Number.isInteger(days) || days <= 0) {
                days = plan.durationDays;
            }
        }

        if (!Number.isInteger(days) || days <= 0) {
            return res.status(400).json({ success: false, message: "A positive durationDays or a premium plan is required" });
        }

        const subscription = await activatePremium({
            userId,
            planId: plan ? plan._id : null,
            durationDays: days,
            planSnapshot: plan ? buildPlanSnapshot(plan) : { name: "Admin grant", durationDays: days },
            source: "admin",
            paymentMethod: "manual",
            amount: 0,
            currency: plan?.currency || "INR",
            notes: notes || "Premium granted by admin",
        });

        const status = await getPremiumStatus(userId);

        return res.status(200).json({
            success: true,
            message: "Premium granted successfully",
            data: {
                subscription,
                status: serializeStatus(status),
            },
        });
    } catch (error) {
        console.error("GRANT_PREMIUM_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to grant premium" });
    }
};

export const revokePremiumAdmin = async (req, res) => {
    try {
        const { userId, reason = "" } = req.body || {};

        if (!isObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Valid userId is required" });
        }

        const revoked = await revokePremium(userId, reason || "Revoked by admin");
        const status = await getPremiumStatus(userId);

        return res.status(200).json({
            success: true,
            message: revoked > 0 ? "Premium revoked successfully" : "User had no active premium",
            data: {
                revoked,
                status: serializeStatus(status),
            },
        });
    } catch (error) {
        console.error("REVOKE_PREMIUM_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to revoke premium" });
    }
};

export const listPremiumSubscriptionsAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, userId } = req.query;

        const pageNumber = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

        const filter = { scope: "premium" };

        if (status) filter.status = status;
        if (userId && isObjectId(userId)) filter.userId = userId;

        const [items, total] = await Promise.all([
            Subscription.find(filter)
                .populate("userId", "name email whatsapp_number domain_type")
                .populate("planId", "name price currency durationDays")
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Subscription.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: items,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (error) {
        console.error("LIST_PREMIUM_SUBSCRIPTIONS_ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch premium subscriptions" });
    }
};
