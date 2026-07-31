import mongoose from "mongoose";

const sellerListingPaymentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CommonSeller",
            default: null,
        },
        listingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerListing",
            required: true,
            index: true,
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ListingPlan",
            required: true,
        },
        actionType: {
            type: String,
            enum: ["create", "update", "renew"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: "INR",
        },
        razorpayOrderId: {
            type: String,
            unique: true,
            sparse: true,
        },
        razorpayPaymentId: {
            type: String,
        },
        razorpaySignature: {
            type: String,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
            index: true,
        },
        paymentDate: {
            type: Date,
        },
        expiresAt: {
            type: Date,
        },
        invoiceNo: {
            type: String,
            unique: true,
            sparse: true,
        },
        failureReason: {
            type: String,
        },
        updateData: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    { timestamps: true }
);

sellerListingPaymentSchema.index({ userId: 1, listingId: 1, status: 1 });

export default mongoose.model("SellerListingPayment", sellerListingPaymentSchema);
