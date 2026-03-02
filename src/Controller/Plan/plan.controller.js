import mongoose from "mongoose";
import Plan from "../../Modal/Wallet/Plan.js";


import slugify from "slugify";


export const createPlanService = async (payload) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const {
            name,
            description,
            price,
            currency = "INR",
            token,
            discount = 0,
            features = [],
            priority = 0
        } = payload;

        if (discount > 100) {
            throw new Error("Discount cannot exceed 100%");
        }

        const slug = slugify(name, { lower: true, strict: true });

        const existing = await Plan.findOne({ slug, isDeleted: false });
        if (existing) {
            throw new Error("Plan already exists");
        }

        const plan = new Plan({
            name,
            slug,
            description,
            price,
            currency,
            token,
            discount,
            features,
            priority
        });

        const savedPlan = await plan.save({ session });

        await session.commitTransaction();
        session.endSession();

        return savedPlan;

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

/**
 * @desc    Get all plans (Paginated + Filtered + Sorted)
 * @route   GET /api/v1/plans
 * @access  Admin / Public (based on requirement)
 */
export const getAllPlans = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            isActive,
            sortBy = "priority",
            order = "desc"
        } = req.query;

        const skip = (page - 1) * limit;

        const filter = {};

        // Active filter
        if (typeof isActive !== "undefined") {
            filter.isActive = isActive === "true";
        }

        // Search by name
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const sortOrder = order === "asc" ? 1 : -1;

        const [plans, total] = await Promise.all([
            Plan.find(filter)
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Plan.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: plans
        });

    } catch (error) {
        console.error("Get All Plans Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch plans",
            error: error.message
        });
    }
};


/**
 * @desc    Get single plan by ID
 * @route   GET /api/v1/plans/:id
 * @access  Admin / Public
 */
export const getPlanById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan ID"
            });
        }

        const plan = await Plan.findById(id).lean();

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: plan
        });

    } catch (error) {
        console.error("Get Plan By ID Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch plan",
            error: error.message
        });
    }
};


/**
 * @desc    Update plan details
 * @route   PUT /api/v1/plans/:id
 * @access  Admin only
 */
export const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan ID"
            });
        }

        const allowedFields = [
            "name",
            "description",
            "price",
            "currency",
            "token",
            "discount",
            "features",
            "priority"
        ];

        const updateData = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const updatedPlan = await Plan.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Plan updated successfully",
            data: updatedPlan
        });

    } catch (error) {
        console.error("Update Plan Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update plan",
            error: error.message
        });
    }
};


/**
 * @desc    Toggle plan active status
 * @route   PATCH /api/v1/plans/:id/toggle
 * @access  Admin only
 */
export const togglePlanStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan ID"
            });
        }

        const plan = await Plan.findById(id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found"
            });
        }

        plan.isActive = !plan.isActive;
        await plan.save();

        return res.status(200).json({
            success: true,
            message: `Plan is now ${plan.isActive ? "Active" : "Inactive"}`,
            data: {
                id: plan._id,
                isActive: plan.isActive
            }
        });

    } catch (error) {
        console.error("Toggle Plan Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to toggle plan status",
            error: error.message
        });
    }
};

