import mongoose from "mongoose";

const statesSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    country_id: {
      type: Number, // or ObjectId if linking with Country collection
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("States", statesSchema);
