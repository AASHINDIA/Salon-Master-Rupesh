import mongoose from "mongoose";

const listingPlanSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            maxlength: 120,
        },
        actionType: {
            type: String,
            enum: ["create", "update", "renew"],
            required: true,
            unique: true,
            index: true,
        },
        description: {
            type: String,
            maxlength: 500,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"],
            default: "INR",
        },
        durationDays: {
            type: Number,
            required: true,
            min: 1,
            default: 60,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true, versionKey: false }
);

listingPlanSchema.virtual("discountedPrice").get(function () {
    const final = this.price - (this.price * this.discount) / 100;
    return Number(final.toFixed(2));
});

listingPlanSchema.index({ isActive: 1, actionType: 1 });

export default mongoose.model("ListingPlan", listingPlanSchema);
