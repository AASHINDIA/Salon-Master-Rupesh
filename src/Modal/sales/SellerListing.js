import mongoose from "mongoose";

const sellerListingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",         
            index: true,
        },
        fullName: {
            type: String,
          
        },
        idDetails: {
            type: String,
          
        },
        phoneNumber: {
            type: String,
        

        },
        email: {
            type: String,
         

        },
        shopName: {
            type: String,
      
        },
        heading: {
            type: String,
         
        },
        status: {
            type: String,
            enum: ["active", "inactive", "pending"],
            required: true,
            default: "pending",
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
        country: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        contactVisibility: {
            type: String,
            enum: ["public", "masked"],
            default: "public",
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
