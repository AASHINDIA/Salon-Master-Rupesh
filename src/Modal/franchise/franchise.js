import mongoose from "mongoose";

const franchiseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },
   
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
    panNumber: {
      type: String,
      required: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"],
    },
    profileImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("franchise", franchiseSchema);
