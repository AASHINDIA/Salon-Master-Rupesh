import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Plan name is required"],
        trim: true,
        maxLength: [50, "Plan name cannot exceed 50 characters"]
    },
    description: {
        type: String,
        required: [true, "Plan description is required"],
        maxLength: [200, "Description cannot exceed 200 characters"]
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"]
    },
    currency: {
        type: String,
        default: "INR",
        enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"] // Add more as needed
    },
    token: {
        type: Number,
        required: [true, "Token amount is required"],
        min: [0, "Token amount cannot be negative"]
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, "Discount cannot be negative"],
        max: [100, "Discount cannot exceed 100%"]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    features: [{
        name: {
            type: String,
            required: true
        },
        included: {
            type: Boolean,
            default: true
        },
        description: String
    }],

    priority: {
        type: Number,
        default: 0 // Higher number means higher priority in listing
    },

}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Virtual for discounted price
PlanSchema.virtual('discountedPrice').get(function () {
    return this.price * (1 - (this.discount / 100));
});

// Index for better query performance
PlanSchema.index({ isActive: 1, priority: -1 });

// Method to check if plan is currently available
PlanSchema.methods.isAvailable = function () {
    return this.isActive;
};

const Plan = mongoose.model("Plan", PlanSchema);
export default Plan;