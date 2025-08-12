import mongoose from "mongoose";

const baseSchemaFields = {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    role: {
        type: String,
        enum: ["Sale/Lease", "Training", "Franchise"],
        required: true // Ensure the role is one of the specified types
    },
    title: {
        type: String,
        required: true
    },
    desc: {
        type: String,
        required: true
    },
    image: {
        type: [String],
        required: true,
        validate: {
            validator: function (arr) {
                return arr.length <= 4;
            },
            message: "Images cannot be more than 4"
        }
    }
};

const saleLeaseSchema = new mongoose.Schema(baseSchemaFields, { timestamps: true });
const trainingSchema = new mongoose.Schema(baseSchemaFields, { timestamps: true });
const franchiseSchema = new mongoose.Schema(baseSchemaFields, { timestamps: true });

export const SaleLease = mongoose.model("SaleLease", saleLeaseSchema);
export const Training = mongoose.model("Training", trainingSchema);
export const Franchise = mongoose.model("Franchise", franchiseSchema);