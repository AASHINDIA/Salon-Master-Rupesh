import mongoose from "mongoose";

const recordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    products: [
        {
            name: { type: String, enum: ['product'], required: false }, // compulsory
            price: { type: Number, required: false } // compulsory
        }
    ],

    services: [
        {
            name: { type: String, required: false }, // compulsory

            price: { type: Number, required: false } // optional
        }
    ],

    productTotal: { type: Number, default: 0 },
    serviceTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Record", recordSchema);
