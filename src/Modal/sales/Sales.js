import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    profileImage: {
      type: String, // URL or file path of seller's profile image
      default: null,
    },

    // 🧾 Seller Details
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    // 📞 Contact Details
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Invalid phone number"],
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },

    // 🏠 Address
    address: {
      type: String,
      maxlength: 100,
      trim: true,
    },

    // 🧾 PAN Details
    panNumber: {
      type: String,
      required: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"],
    },

    // 📢 Advertisement Info
    advertisementDetails: {
      type: String,
      maxlength: 100,
      trim: true,
    },
    advertisementImages: {
      type: [String], // Array of image URLs
      validate: [
        (arr) => arr.length <= 5,
        "You can upload a maximum of 5 images",
      ],
    },

    // ✅ Terms & Conditions
    termsAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Seller", sellerSchema);
