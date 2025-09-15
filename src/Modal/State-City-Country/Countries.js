import mongoose from "mongoose";

const CountriesSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    sortname: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // ensures codes like 'AF', 'IN'
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneCode: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Countries", CountriesSchema);
