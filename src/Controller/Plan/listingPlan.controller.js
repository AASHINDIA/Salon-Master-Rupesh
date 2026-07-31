import mongoose from "mongoose";
import ListingPlan from "../../Modal/sales/ListingPlan.js";

export const createListingPlan = async (req, res) => {
    try {
        const { name, actionType, description, price, currency = "INR", durationDays, discount = 0 } = req.body;

        if (!name || typeof name !== "string") {
            return res.status(400).json({ success: false, message: "Plan name must be a valid string" });
        }

        if (!["create", "update", "renew"].includes(actionType)) {
            return res.status(400).json({ success: false, message: "actionType must be 'create', 'update' or 'renew'" });
        }

        if (typeof price !== "number" || price < 0) {
            return res.status(400).json({ success: false, message: "Price must be a number >= 0" });
        }

        if (!["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"].includes(currency)) {
            return res.status(400).json({ success: false, message: "Invalid currency" });
        }

        if (typeof durationDays !== "number" || durationDays < 1) {
            return res.status(400).json({ success: false, message: "durationDays must be a number >= 1" });
        }

        if (typeof discount !== "number" || discount < 0 || discount > 100) {
            return res.status(400).json({ success: false, message: "discount must be between 0 and 100" });
        }

        const existing = await ListingPlan.findOne({ actionType });
        if (existing) {
            return res.status(400).json({ success: false, message: `A plan for actionType '${actionType}' already exists` });
        }

        const plan = await ListingPlan.create({
            name: name.trim(),
            actionType,
            description,
            price,
            currency,
            durationDays,
            discount,
        });

        return res.status(201).json({
            success: true,
            message: "Listing plan created successfully",
            data: plan,
        });
    } catch (error) {
        console.error("Create listing plan error:", error);
        return res.status(500).json({ success: false, message: "Failed to create plan", error: error.message });
    }
};

export const getAllListingPlans = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", isActive, includeDeleted = "false" } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const filter = { isDeleted: includeDeleted === "true" ? undefined : false };

        if (typeof isActive !== "undefined") {
            filter.isActive = isActive === "true";
        }

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const [plans, total] = await Promise.all([
            ListingPlan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            ListingPlan.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            data: plans,
        });
    } catch (error) {
        console.error("Get all listing plans error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch plans", error: error.message });
    }
};

export const getListingPlanById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid plan ID" });
        }

        const plan = await ListingPlan.findById(id).lean();

        if (!plan || plan.isDeleted) {
            return res.status(404).json({ success: false, message: "Listing plan not found" });
        }

        return res.status(200).json({ success: true, data: plan });
    } catch (error) {
        console.error("Get listing plan by ID error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch plan", error: error.message });
    }
};

export const updateListingPlan = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid plan ID" });
        }

        const allowedFields = ["name", "description", "price", "currency", "durationDays", "discount"];

        const updateData = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "No fields provided to update" });
        }

        if (updateData.price !== undefined && (typeof updateData.price !== "number" || updateData.price < 0)) {
            return res.status(400).json({ success: false, message: "Price must be a number >= 0" });
        }

        if (updateData.durationDays !== undefined && (typeof updateData.durationDays !== "number" || updateData.durationDays < 1)) {
            return res.status(400).json({ success: false, message: "durationDays must be a number >= 1" });
        }

        if (updateData.discount !== undefined && (typeof updateData.discount !== "number" || updateData.discount < 0 || updateData.discount > 100)) {
            return res.status(400).json({ success: false, message: "discount must be between 0 and 100" });
        }

        const updatedPlan = await ListingPlan.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

        if (!updatedPlan) {
            return res.status(404).json({ success: false, message: "Listing plan not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Listing plan updated successfully",
            data: updatedPlan,
        });
    } catch (error) {
        console.error("Update listing plan error:", error);
        return res.status(500).json({ success: false, message: "Failed to update plan", error: error.message });
    }
};

export const deleteListingPlan = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid plan ID" });
        }

        const plan = await ListingPlan.findById(id);
        if (!plan || plan.isDeleted) {
            return res.status(404).json({ success: false, message: "Listing plan not found" });
        }

        plan.isDeleted = true;
        plan.isActive = false;
        await plan.save();

        return res.status(200).json({
            success: true,
            message: "Listing plan deleted successfully",
            data: { id: plan._id, isDeleted: plan.isDeleted },
        });
    } catch (error) {
        console.error("Delete listing plan error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete plan", error: error.message });
    }
};

export const toggleListingPlanStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid plan ID" });
        }

        const plan = await ListingPlan.findById(id);
        if (!plan || plan.isDeleted) {
            return res.status(404).json({ success: false, message: "Listing plan not found" });
        }

        plan.isActive = !plan.isActive;
        await plan.save();

        return res.status(200).json({
            success: true,
            message: `Listing plan is now ${plan.isActive ? "Active" : "Inactive"}`,
            data: { id: plan._id, isActive: plan.isActive },
        });
    } catch (error) {
        console.error("Toggle listing plan error:", error);
        return res.status(500).json({ success: false, message: "Failed to toggle plan status", error: error.message });
    }
};
