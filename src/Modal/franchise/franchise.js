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
     
    },
    
    email: {
      type: String,
      
    },
    panNumber: {
      type: String,
    
    },
    profileImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("franchise", franchiseSchema);
