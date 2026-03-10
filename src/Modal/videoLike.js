    import mongoose from "mongoose";
    import { Schema } from "mongoose";
    // First, create a new model for tracking video likes
    // VideoLike.js model file:
    const VideoLikeSchema = new Schema({
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "TrainingVideo",
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    });

    // Ensure a user can like a video only once
    VideoLikeSchema.index({ user: 1, video: 1 }, { unique: true });

    export default mongoose.model("VideoLike", VideoLikeSchema);





