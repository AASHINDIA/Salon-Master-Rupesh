import mongoose from "mongoose";

const CountriesSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
    },
    sortname: {
      type: String,
    },
    name: {
      type: String,
    },
    phoneCode: {
      type: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Countries", CountriesSchema);
