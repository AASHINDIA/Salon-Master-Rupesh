import mongoose from "mongoose";

const districtSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true }
}, { _id: false });

const stateSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    capital: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    districts: { type: [districtSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("State", stateSchema);
