import mongoose from "mongoose";

const FranchiseListSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",         
            index: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        idDetails: {
            type: String,
            required: true,
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true,

        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,

        },
        shopName: {
            type: String,
            required: true,
            trim: true,
        },
        heading: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            required: true,
            default: "active",
            trim: true,
        },
        description: {
            type: String,
            maxlength: 1000,
            trim: true,
        },
        short_description: {
            type: String,
            maxlength: 200,
            trim: true,
        },
        advertisementDetails: {
            type: String,
            maxlength: 200,
            trim: true,
        },
        address: {
            type: String,
            maxlength: 200,
            trim: true,
        },
        advertisementImages: {
            type: [String],
            validate: [
                (arr) => arr.length <= 5,
                "You can upload a maximum of 5 images",
            ],
        },
        expiredAt: {
            type: Date,
            default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        },
        termsAccepted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("FranchiseList", FranchiseListSchema);
