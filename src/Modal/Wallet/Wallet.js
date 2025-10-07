import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        plan_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan", // reference to the plan purchased or used
           
        },

        credits_balance: {
            type: Number,
            default: 100,
            min: 0,
        },

        // History of credits/tokens related to plans
        credits_history: [
            {
                type: {
                    type: String,
                    enum: ["request", "hired"], // action type
                    required: true,
                },

                salon_user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: null, // who spent or transferred
                },
                worker_user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: null, // who received (if transfer)
                },

                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    { timestamps: true }
);

const Wallet = mongoose.model("Wallet", WalletSchema);

export default Wallet;
