import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Either from a Plan OR custom subscription
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            default: null, // can be empty if using custom/manual subscription
        },

        startDate: {
            type: Date,
            default: Date.now,
        },

        expiryDate: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: ["active", "expired", "canceled", "pending"],
            default: "pending",
            index: true,
        },

        amount: {
            type: Number,
            default: 0, // can be 0 if it's a free/manual upgrade
        },

        currency: {
            type: String,
            default: "INR",
        },

        paymentMethod: {
            type: String,
            enum: ["credit_card", "debit_card", "paypal", "upi", "phonepe", "stripe", "manual"],
            default: "manual", // if admin increases limit without payment
        },

        transactionId: {
            type: String,
            unique: true,
            sparse: true,
        },

        autoRenew: {
            type: Boolean,
            default: false,
        },

        usageCount: {
            type: Number,
            default: 0,
        },

        maxUsageLimit: {
            type: Number,
            default: null, // unlimited if null
        },

        // ✅ Track if this subscription is system-assigned (plan)
        // or custom (manually added usage limit)
        type: {
            type: String,
            enum: ["plan", "custom"],
            default: "plan",
        },

        notes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Subscription", subscriptionSchema);
