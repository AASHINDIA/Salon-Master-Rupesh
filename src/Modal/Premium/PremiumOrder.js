import mongoose from "mongoose";

const { Schema } = mongoose;

const PremiumOrderSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        plan: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
        },

        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        amount: { type: Number, required: true },
        currency: { type: String, default: "INR" },

        status: {
            type: String,
            enum: ["created", "paid", "failed", "cancelled"],
            default: "created",
            index: true,
        },

        idempotencyKey: { type: String, default: null },

        planSnapshot: {
            name: String,
            price: Number,
            currency: String,
            durationDays: Number,
        },

        paymentId: { type: String, default: null },

        notes: { type: String, default: null },

        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    },
    { timestamps: true }
);

PremiumOrderSchema.index(
    { user: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

PremiumOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PremiumOrder = mongoose.model("PremiumOrder", PremiumOrderSchema);

export default PremiumOrder;
