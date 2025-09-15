import mongoose from "mongoose";

const statesSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
     
    },
    name: {
      type: String,
      
    },
    country_id: {
      type: Number, // or ObjectId if linking with Country collection
    },
  },
  { timestamps: true }
);

export default mongoose.model("States", statesSchema);
