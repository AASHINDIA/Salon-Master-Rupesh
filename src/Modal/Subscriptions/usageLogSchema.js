import mongoose from "mongoose";

const usageLogSchema = new mongoose.Schema(
    {
        candidateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Candidate user
            required: true,
            index: true,
        },

        salonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Salon", // Salon profile
            required: true,
            index: true,
        },

        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
            index: true,
        },

        clickedBy: {
            type: String,
            enum: ["candidate", "salon"],
            required: true, // Who initiated the click
        },

        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription", // Which subscription is being used
            required: true,
        },

        deducted: {
            type: Boolean,
            default: false, // true when usage count is deducted from subscription
        },
    },
    {
        timestamps: true, // logs when click happened
    }
);

export default mongoose.model("UsageLog", usageLogSchema);
