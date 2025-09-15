import mongoose from "mongoose";

const citiesSchema = new mongoose.Schema(
  {
    id: {
      type: Number, // you can also use mongoose.Schema.Types.ObjectId if auto-generated
      
    },
    name: {
      type: String,
     
    },
    state_id: {
      type: Number, // if it's referencing another collection, better use ObjectId
    },
  },
  { timestamps: true }
);

export default mongoose.model("cities", citiesSchema);
