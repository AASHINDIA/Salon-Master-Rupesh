import mongoose from "mongoose";

const { Schema } = mongoose;

const TrainingVideoSchema = new Schema({

    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
    },

    description: {
        type: String,
        required: true,
        maxlength: 1000,
    },

    instructor: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    // FREE PREVIEW (public video id)
    previewVideoId: {
        type: String,
        trim: true,
    },

    // MAIN YOUTUBE VIDEO
    youtubeVideoId: {
        type: String,
        required: true,
        trim: true,
    },

    youtubePrivacy: {
        type: String,
        enum: ["public", "unlisted", "private"],
        default: "unlisted",
    },

    accessType: {
        type: String,
        enum: ["free", "paid", "trial"],
        default: "paid",
    },

    trialDurationInDays: {
        type: Number,
        default: 0,
    },

    plan: {
        type: Schema.Types.ObjectId,
        ref: "Plan",
    },

    durationInMinutes: {
        type: Number,
        required: true,
    },

    price: {
        type: Number,
        default: 0,
    },

    currency: {
        type: String,
        default: "INR",
    },

    isActive: {
        type: Boolean,
        default: true,
    },


    // Add inside TrainingVideoSchema

    views: {
        type: Number,
        default: 0,
        index: true
    },

    likes: {
        type: Number,
        default: 0
    },

    purchasesCount: {
        type: Number,
        default: 0
    },

    trendingScore: {
        type: Number,
        default: 0,
        index: true
    }
    ,
    isDeleted: {
        type: Boolean,
        default: false,
    }

}, { timestamps: true });

TrainingVideoSchema.index({ title: "text", description: "text" });
TrainingVideoSchema.index({ accessType: 1, isActive: 1 });

export default mongoose.model("TrainingVideo", TrainingVideoSchema);