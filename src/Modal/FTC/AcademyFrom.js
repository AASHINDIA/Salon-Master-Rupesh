import mongoose from "mongoose";

const AcademyFromSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to User collection if needed
      ref: "User",
    },
    name: {
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
    address: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    ask: {
      type: String,
      required: true,
      trim: true, // e.g., "I want details about product X"
    },
    interestedLocation: {
      type: String,
      required: true,
      trim: true, // e.g., "Mumbai", "Delhi"
    },
  },
  { timestamps: true }
);

export default mongoose.model("AcademyFrom", AcademyFromSchema);