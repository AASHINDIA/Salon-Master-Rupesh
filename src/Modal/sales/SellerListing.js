import mongoose from "mongoose";

const sellerListingSchema = new mongoose.Schema(
    {
        commonSellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CommonSeller",
            required: true,
            index: true,
        },

        shopName: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            maxlength: 1000,
            trim: true,
        },

        address: {
            type: String,
            maxlength: 200,
            trim: true,
        },

        advertisementDetails: {
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

export default mongoose.model("SellerListing", sellerListingSchema);
