import mongoose from "mongoose";

const { Schema } = mongoose;

const SsvMetaSchema = new Schema(
    {
        adNetwork: { type: String, default: null },
        adUnit: { type: String, default: null },
        rewardAmount: { type: Number, default: null },
        rewardItem: { type: String, default: null },
        callbackTimestamp: { type: Number, default: null },
    },
    { _id: false }
);

const AdRewardSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        purpose: {
            type: String,
            enum: ["contact_reveal", "free_video_access"],
            required: true,
        },

        targetType: {
            type: String,
            enum: ["FranchiseList", "TraningList", "SellerListing", "TrainingVideo"],
            required: true,
        },

        targetId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        // Opaque value passed to AdMob as custom_data (server-side bound to target)
        nonce: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["pending", "verified", "consumed", "expired", "failed"],
            default: "pending",
            index: true,
        },

        // While pending this is the nonce TTL. Once verified it is extended so a
        // slow client can still claim the reward (TTL index purges old rows).
        expiresAt: {
            type: Date,
            required: true,
        },

        verifiedAt: { type: Date, default: null },
        consumedAt: { type: Date, default: null },

        // Playback window for free-video grants
        accessExpiresAt: { type: Date, default: null },

        ssvTransactionId: { type: String, default: null },

        ssvMeta: { type: SsvMetaSchema, default: null },

        idempotencyKey: { type: String, default: null },

        attempts: { type: Number, default: 0 },
        claimCount: { type: Number, default: 0 },
        lastError: { type: String, default: null },

        bypassedByPremium: { type: Boolean, default: false },
    },
    { timestamps: true }
);

AdRewardSchema.index(
    { ssvTransactionId: 1 },
    { unique: true, partialFilterExpression: { ssvTransactionId: { $type: "string" } } }
);

AdRewardSchema.index(
    { user: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

AdRewardSchema.index({ user: 1, status: 1, createdAt: -1 });
AdRewardSchema.index({ user: 1, targetType: 1, targetId: 1, status: 1 });
AdRewardSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdReward = mongoose.model("AdReward", AdRewardSchema);

export default AdReward;
