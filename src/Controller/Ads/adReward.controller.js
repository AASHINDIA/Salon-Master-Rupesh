import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";

import AdReward from "../../Modal/Ads/AdReward.js";
import TrainingVideo from "../../Modal/SuperAdmin/TraningVideos.js";
import FranchiseList from "../../Modal/franchise/FranchiseList.js";
import TraningList from "../../Modal/traininginstitute/TraningList.js";
import SellerListing from "../../Modal/sales/SellerListing.js";
import { getPremiumStatus } from "../../Utils/premium.js";

dotenv.config();

const LISTING_MODELS = {
    FranchiseList,
    TraningList,
    SellerListing,
};

const readPositiveInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const AD_REWARD_TTL_MS = readPositiveInt(process.env.AD_REWARD_TTL_MS, 10 * 60 * 1000) || 10 * 60 * 1000;
const AD_REWARD_VERIFIED_TTL_MS = readPositiveInt(process.env.AD_REWARD_VERIFIED_TTL_MS, 24 * 60 * 60 * 1000);
const AD_FREE_VIDEO_ACCESS_TTL_MIN = readPositiveInt(process.env.AD_FREE_VIDEO_ACCESS_TTL_MINUTES, 15);
const AD_REWARD_DAILY_LIMIT = readPositiveInt(process.env.AD_REWARD_DAILY_LIMIT, 10);
const AD_REWARD_MAX_PENDING = readPositiveInt(process.env.AD_REWARD_MAX_PENDING, 3);
const AD_REWARD_CLAIM_REPLAY_MS = readPositiveInt(process.env.AD_REWARD_CLAIM_REPLAY_MS, 10 * 60 * 1000);
const AD_REWARD_TIMEZONE = process.env.AD_REWARD_TIMEZONE || "Asia/Kolkata";

const isStringId = (value) => mongoose.Types.ObjectId.isValid(value);

const startOfDayInTimeZone = (timeZone) => {
    const now = new Date();

    try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        const parts = Object.fromEntries(
            formatter.formatToParts(now).map((part) => [part.type, part.value])
        );

        const hour = parseInt(parts.hour, 10) % 24;
        const asUtc = Date.UTC(
            parseInt(parts.year, 10),
            parseInt(parts.month, 10) - 1,
            parseInt(parts.day, 10),
            hour,
            parseInt(parts.minute, 10),
            parseInt(parts.second, 10)
        );

        const offsetMs = asUtc - Math.floor(now.getTime() / 1000) * 1000;

        return new Date(
            Date.UTC(
                parseInt(parts.year, 10),
                parseInt(parts.month, 10) - 1,
                parseInt(parts.day, 10)
            ) - offsetMs
        );
    } catch (error) {
        const fallback = new Date(now);
        fallback.setHours(0, 0, 0, 0);
        return fallback;
    }
};

const isListingExpired = (listing) =>
    Boolean(listing?.expiredAt) && new Date(listing.expiredAt).getTime() <= Date.now();

const buildInitResponse = (reward, reused = false) => ({
    success: true,
    requestId: reward._id,
    customData: reward.nonce,
    userId: reward.user,
    purpose: reward.purpose,
    targetType: reward.targetType,
    targetId: reward.targetId,
    expiresAt: reward.expiresAt,
    ttlMs: Math.max(0, new Date(reward.expiresAt).getTime() - Date.now()),
    adsEnabled: true,
    reused,
});

const validateListing = async (targetType, targetId) => {
    const Model = LISTING_MODELS[targetType];

    if (!Model) {
        return { error: { status: 400, message: "Invalid listing type", code: "INVALID_TARGET_TYPE" } };
    }

    if (!isStringId(targetId)) {
        return { error: { status: 400, message: "Invalid listing id", code: "INVALID_TARGET" } };
    }

    const listing = await Model.findById(targetId).lean();

    if (!listing) {
        return { error: { status: 404, message: "Listing not found", code: "TARGET_NOT_FOUND" } };
    }

    if (listing.status === "inactive" || isListingExpired(listing)) {
        return { error: { status: 410, message: "This listing is no longer available", code: "TARGET_UNAVAILABLE" } };
    }

    return { listing };
};

const validateVideo = async (targetId) => {
    if (!isStringId(targetId)) {
        return { error: { status: 400, message: "Invalid video id", code: "INVALID_TARGET" } };
    }

    const video = await TrainingVideo.findOne({
        _id: targetId,
        isDeleted: false,
    }).lean();

    if (!video) {
        return { error: { status: 404, message: "Training video not found", code: "TARGET_NOT_FOUND" } };
    }

    if (!video.isActive) {
        return { error: { status: 410, message: "This training video is no longer available", code: "TARGET_UNAVAILABLE" } };
    }

    return { video };
};

const getTargetForClaim = async (purpose, targetType, targetId) => {
    if (purpose === "contact_reveal") {
        const result = await validateListing(targetType, targetId);
        return result.error ? result : { target: result.listing };
    }

    const result = await validateVideo(targetId);
    return result.error ? result : { target: result.video };
};

const findActiveFreeVideoGrant = (userId, videoId) =>
    AdReward.findOne({
        user: userId,
        targetType: "TrainingVideo",
        targetId: videoId,
        purpose: "free_video_access",
        status: "consumed",
        accessExpiresAt: { $gt: new Date() },
    })
        .sort({ accessExpiresAt: -1 })
        .lean();

export const initReward = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { purpose, targetType, targetId } = req.body || {};

        if (!["contact_reveal", "free_video_access"].includes(purpose)) {
            return res.status(400).json({
                success: false,
                message: "purpose must be contact_reveal or free_video_access",
            });
        }

        if (!targetType || !targetId) {
            return res.status(400).json({ success: false, message: "targetType and targetId are required" });
        }

        if (purpose === "contact_reveal" && !LISTING_MODELS[targetType]) {
            return res.status(400).json({ success: false, message: "Invalid listing type" });
        }

        if (purpose === "free_video_access" && targetType !== "TrainingVideo") {
            return res.status(400).json({ success: false, message: "Invalid training target" });
        }

        const premium = await getPremiumStatus(userId);

        if (premium.isPremium) {
            return res.status(200).json({
                success: true,
                premium: true,
                alreadyUnlocked: true,
                adsEnabled: false,
                requestId: null,
            });
        }

        const idempotencyKey = (req.get("Idempotency-Key") || "").trim() || null;

        if (idempotencyKey) {
            const existing = await AdReward.findOne({
                user: userId,
                idempotencyKey,
                status: "pending",
                expiresAt: { $gt: new Date() },
            });

            if (existing) {
                return res.status(200).json(buildInitResponse(existing, true));
            }
        }

        if (AD_REWARD_DAILY_LIMIT > 0) {
            const since = startOfDayInTimeZone(AD_REWARD_TIMEZONE);
            const usedToday = await AdReward.countDocuments({
                user: userId,
                ssvTransactionId: { $type: "string" },
                createdAt: { $gte: since },
                bypassedByPremium: false,
            });

            if (usedToday >= AD_REWARD_DAILY_LIMIT) {
                return res.status(429).json({
                    success: false,
                    code: "DAILY_LIMIT_REACHED",
                    message: "You have reached today's rewarded ad limit. Try again tomorrow.",
                });
            }
        }

        const pendingCount = await AdReward.countDocuments({
            user: userId,
            status: "pending",
            expiresAt: { $gt: new Date() },
        });

        if (pendingCount >= AD_REWARD_MAX_PENDING) {
            return res.status(429).json({
                success: false,
                code: "TOO_MANY_PENDING",
                message: "You already have pending rewards. Please finish or wait for them to expire.",
            });
        }

        if (purpose === "contact_reveal") {
            const result = await validateListing(targetType, targetId);

            if (result.error) {
                return res.status(result.error.status).json({
                    success: false,
                    code: result.error.code,
                    message: result.error.message,
                });
            }

            const listing = result.listing;
            const isOwner = listing.userId && listing.userId.toString() === userId.toString();

            if (isOwner || listing.contactVisibility !== "masked") {
                return res.status(200).json({
                    success: true,
                    alreadyUnlocked: true,
                    premium: false,
                    adsEnabled: true,
                    source: isOwner ? "owner" : "public",
                    data: {
                        phoneNumber: listing.phoneNumber,
                        email: listing.email,
                    },
                });
            }
        } else {
            const result = await validateVideo(targetId);

            if (result.error) {
                return res.status(result.error.status).json({
                    success: false,
                    code: result.error.code,
                    message: result.error.message,
                });
            }

            const video = result.video;
            const instructorId = video.instructor?._id || video.instructor;
            const isInstructor = instructorId && instructorId.toString() === userId.toString();
            const isAdmin = ["admin", "superadmin"].includes(req.user?.domain_type);

            if (isInstructor || isAdmin) {
                return res.status(200).json({
                    success: true,
                    alreadyUnlocked: true,
                    premium: false,
                    adsEnabled: true,
                    source: "admin",
                });
            }

            if (video.accessType !== "free") {
                return res.status(402).json({
                    success: false,
                    code: "PURCHASE_REQUIRED",
                    message: "This training video is paid. Please purchase it to continue.",
                    videoId: video._id,
                });
            }

            const activeGrant = await findActiveFreeVideoGrant(userId, video._id);

            if (activeGrant) {
                return res.status(200).json({
                    success: true,
                    alreadyUnlocked: true,
                    premium: false,
                    adsEnabled: true,
                    source: "ad",
                    accessExpiresAt: activeGrant.accessExpiresAt,
                });
            }
        }

        const nonce = crypto.randomBytes(32).toString("hex");

        try {
            const reward = await AdReward.create({
                user: userId,
                purpose,
                targetType,
                targetId,
                nonce,
                status: "pending",
                expiresAt: new Date(Date.now() + AD_REWARD_TTL_MS),
                idempotencyKey,
            });

            return res.status(201).json(buildInitResponse(reward));
        } catch (error) {
            if (error.code === 11000 && idempotencyKey) {
                const existing = await AdReward.findOne({ user: userId, idempotencyKey });

                if (existing) {
                    return res.status(200).json(buildInitResponse(existing, true));
                }
            }

            throw error;
        }
    } catch (error) {
        console.error("AD_REWARD_INIT_ERROR:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getRewardStatus = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { requestId } = req.params;

        if (!isStringId(requestId)) {
            return res.status(400).json({ success: false, message: "Invalid request id" });
        }

        const reward = await AdReward.findOne({ _id: requestId, user: userId }).lean();

        if (!reward) {
            return res.status(404).json({ success: false, message: "Reward request not found" });
        }

        if (reward.status === "pending" && new Date(reward.expiresAt).getTime() <= Date.now()) {
            await AdReward.updateOne(
                { _id: reward._id, status: "pending" },
                { $set: { status: "expired", lastError: "nonce_expired" } }
            );
            reward.status = "expired";
        }

        const premium = await getPremiumStatus(userId);

        return res.status(200).json({
            success: true,
            data: {
                requestId: reward._id,
                purpose: reward.purpose,
                targetType: reward.targetType,
                targetId: reward.targetId,
                status: reward.status,
                verifiedAt: reward.verifiedAt,
                consumedAt: reward.consumedAt,
                accessExpiresAt: reward.accessExpiresAt,
                expiresAt: reward.expiresAt,
                isPremium: premium.isPremium,
                adsEnabled: premium.adsEnabled,
            },
        });
    } catch (error) {
        console.error("AD_REWARD_STATUS_ERROR:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getPendingRewards = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const now = new Date();

        const rewards = await AdReward.find({
            user: userId,
            $or: [
                { status: "verified", expiresAt: { $gt: now } },
                { status: "consumed", accessExpiresAt: { $gt: now } },
            ],
        })
            .sort({ verifiedAt: -1 })
            .limit(20)
            .lean();

        return res.status(200).json({
            success: true,
            data: rewards.map((reward) => ({
                requestId: reward._id,
                purpose: reward.purpose,
                targetType: reward.targetType,
                targetId: reward.targetId,
                status: reward.status,
                verifiedAt: reward.verifiedAt,
                accessExpiresAt: reward.accessExpiresAt,
                expiresAt: reward.expiresAt,
            })),
        });
    } catch (error) {
        console.error("AD_REWARD_PENDING_ERROR:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const consumeReward = async (rewardId, userId) => {
    const now = new Date();

    return AdReward.findOneAndUpdate(
        {
            _id: rewardId,
            user: userId,
            status: "verified",
            expiresAt: { $gt: now },
        },
        {
            $set: { status: "consumed", consumedAt: now },
            $inc: { claimCount: 1 },
        },
        { new: true }
    );
};

const claimContactReward = async (reward, userId, premium) => {
    const result = await validateListing(reward.targetType, reward.targetId);

    if (result.error) {
        return { error: result.error };
    }

    const listing = result.listing;
    const replayWindowValid =
        reward.status === "consumed" &&
        reward.consumedAt &&
        Date.now() - new Date(reward.consumedAt).getTime() <= AD_REWARD_CLAIM_REPLAY_MS;

    if (premium.isPremium && reward.status !== "consumed") {
        await AdReward.updateOne(
            { _id: reward._id, status: { $in: ["pending", "verified"] } },
            {
                $set: {
                    status: "consumed",
                    consumedAt: new Date(),
                    bypassedByPremium: true,
                },
            }
        );
    }

    if (!premium.isPremium && reward.status !== "consumed") {
        if (reward.status === "pending") {
            return { pending: true };
        }

        const consumed = await consumeReward(reward._id, userId);

        if (!consumed) {
            const latest = await AdReward.findById(reward._id).lean();

            if (!latest || latest.status !== "consumed") {
                return { error: { status: 410, message: "This reward is no longer valid", code: "REWARD_EXPIRED" } };
            }

            if (Date.now() - new Date(latest.consumedAt).getTime() > AD_REWARD_CLAIM_REPLAY_MS) {
                return { error: { status: 409, message: "This reward has already been used", code: "REWARD_ALREADY_USED" } };
            }
        }
    } else if (!premium.isPremium && reward.status === "consumed" && !replayWindowValid) {
        return { error: { status: 409, message: "This reward has already been used", code: "REWARD_ALREADY_USED" } };
    }

    return {
        data: {
            listingType: reward.targetType,
            listingId: reward.targetId,
            phoneNumber: listing.phoneNumber,
            email: listing.email,
            alreadyClaimed: Boolean(reward.status === "consumed"),
        },
    };
};

const claimFreeVideoReward = async (reward, userId, premium) => {
    const result = await validateVideo(reward.targetId);

    if (result.error) {
        return { error: result.error };
    }

    const video = result.video;
    const accessExpiresAt = new Date(Date.now() + AD_FREE_VIDEO_ACCESS_TTL_MIN * 60 * 1000);

    if (premium.isPremium) {
        await AdReward.updateOne(
            { _id: reward._id, status: { $in: ["pending", "verified"] } },
            {
                $set: {
                    status: "consumed",
                    consumedAt: new Date(),
                    accessExpiresAt,
                    bypassedByPremium: true,
                },
            }
        );

        return {
            data: {
                videoId: video._id,
                title: video.title,
                thumbnail: video.thumbnail,
                youtubeVideoId: video.youtubeVideoId,
                accessExpiresAt,
                isPremium: true,
            },
        };
    }

    if (reward.status === "pending") {
        return { pending: true };
    }

    if (reward.status === "consumed") {
        if (reward.accessExpiresAt && new Date(reward.accessExpiresAt).getTime() > Date.now()) {
            return {
                data: {
                    videoId: video._id,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    youtubeVideoId: video.youtubeVideoId,
                    accessExpiresAt: reward.accessExpiresAt,
                    alreadyClaimed: true,
                },
            };
        }

        return { error: { status: 410, message: "Your ad access window has expired. Watch an ad again.", code: "REWARD_EXPIRED" } };
    }

    const claimed = await AdReward.findOneAndUpdate(
        {
            _id: reward._id,
            user: userId,
            status: "verified",
            expiresAt: { $gt: new Date() },
        },
        {
            $set: {
                status: "consumed",
                consumedAt: new Date(),
                accessExpiresAt,
            },
            $inc: { claimCount: 1 },
        },
        { new: true }
    );

    if (!claimed) {
        const latest = await AdReward.findById(reward._id).lean();

        if (
            latest &&
            latest.status === "consumed" &&
            latest.accessExpiresAt &&
            new Date(latest.accessExpiresAt).getTime() > Date.now()
        ) {
            return {
                data: {
                    videoId: video._id,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    youtubeVideoId: video.youtubeVideoId,
                    accessExpiresAt: latest.accessExpiresAt,
                    alreadyClaimed: true,
                },
            };
        }

        return { error: { status: 410, message: "This reward is no longer valid", code: "REWARD_EXPIRED" } };
    }

    return {
        data: {
            videoId: video._id,
            title: video.title,
            thumbnail: video.thumbnail,
            youtubeVideoId: video.youtubeVideoId,
            accessExpiresAt,
            alreadyClaimed: false,
        },
    };
};

export const claimReward = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { requestId } = req.params;

        if (!isStringId(requestId)) {
            return res.status(400).json({ success: false, message: "Invalid request id" });
        }

        const reward = await AdReward.findOne({ _id: requestId, user: userId }).lean();

        if (!reward) {
            return res.status(404).json({ success: false, message: "Reward request not found" });
        }

        if (reward.status === "expired" || reward.status === "failed") {
            return res.status(410).json({
                success: false,
                code: "REWARD_EXPIRED",
                message: "This reward is no longer valid",
            });
        }

        if (reward.status === "pending" && new Date(reward.expiresAt).getTime() <= Date.now()) {
            await AdReward.updateOne(
                { _id: reward._id, status: "pending" },
                { $set: { status: "expired", lastError: "nonce_expired" } }
            );

            return res.status(410).json({
                success: false,
                code: "REWARD_EXPIRED",
                message: "This reward expired before it was verified",
            });
        }

        const premium = await getPremiumStatus(userId);

        let result;

        if (reward.purpose === "contact_reveal") {
            result = await claimContactReward(reward, userId, premium);
        } else {
            result = await claimFreeVideoReward(reward, userId, premium);
        }

        if (result.pending) {
            return res.status(202).json({
                success: false,
                code: "VERIFICATION_PENDING",
                message: "Your reward is still being verified. Please retry.",
                retryAfterMs: 1000,
            });
        }

        if (result.error) {
            return res.status(result.error.status).json({
                success: false,
                code: result.error.code,
                message: result.error.message,
            });
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            purpose: reward.purpose,
            targetType: reward.targetType,
            targetId: reward.targetId,
            data: result.data,
        });
    } catch (error) {
        console.error("AD_REWARD_CLAIM_ERROR:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const abandonReward = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { requestId } = req.params;

        if (!isStringId(requestId)) {
            return res.status(400).json({ success: false, message: "Invalid request id" });
        }

        await AdReward.updateOne(
            { _id: requestId, user: userId, status: "pending" },
            { $set: { status: "failed", lastError: "abandoned_by_client" } }
        );

        return res.status(200).json({ success: true, message: "Reward request closed" });
    } catch (error) {
        console.error("AD_REWARD_ABANDON_ERROR:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
