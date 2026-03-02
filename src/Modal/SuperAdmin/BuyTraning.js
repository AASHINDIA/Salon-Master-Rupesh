import mongoose from "mongoose";

const TrainingPurchaseSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    training: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TrainingVideo",
        required: true,
    },

    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
    },

    transactionId: {
        type: String,
        required: true,
        unique: true,
    },

    paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
    },

    accessExpiresAt: {
        type: Date,
    },

    isActive: {
        type: Boolean,
        default: true,
    }

}, { timestamps: true });

TrainingPurchaseSchema.index({ user: 1, training: 1 });

export default mongoose.model("TrainingPurchase", TrainingPurchaseSchema);