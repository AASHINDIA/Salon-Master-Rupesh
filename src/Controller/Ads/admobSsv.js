import dotenv from "dotenv";
import AdReward from "../../Modal/Ads/AdReward.js";
import { verifyAdmobCallback } from "../../Utils/admobVerifier.js";

dotenv.config();

const readPositiveInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const AD_REWARD_VERIFIED_TTL_MS = readPositiveInt(
    process.env.AD_REWARD_VERIFIED_TTL_MS,
    24 * 60 * 60 * 1000
);

const MAX_CALLBACK_AGE_MS = readPositiveInt(
    process.env.ADMOB_SSV_MAX_CALLBACK_AGE_MS,
    60 * 60 * 1000
);

const getAllowedAdUnits = () =>
    (process.env.ADMOB_REWARDED_AD_UNIT_IDS || "")
        .split(",")
        .map((unit) => unit.trim())
        .filter(Boolean);

const logSsv = (message, extra = {}) => {
    if (process.env.ADMOB_SSV_DEBUG === "true") {
        console.log(`[admob-ssv] ${message}`, extra);
    }
};

export const admobSsv = async (req, res) => {
    try {
        if (process.env.ADMOB_SSV_ENABLED === "false") {
            return res.status(404).send("not found");
        }

        const rawQuery = (req.originalUrl || req.url || "").split("?")[1] || "";

        if (!rawQuery) {
            return res.status(400).send("missing_query");
        }

        let verification;

        try {
            verification = await verifyAdmobCallback(rawQuery);
        } catch (error) {
            console.warn(`AdMob SSV rejected (${error.code || "UNKNOWN"}): ${error.message}`);
            return res.status(400).send("invalid_signature");
        }

        if (!verification.valid) {
            console.warn("AdMob SSV rejected: signature did not verify");
            return res.status(400).send("invalid_signature");
        }

        const { params } = verification;

        const nonce = params.get("custom_data");
        const transactionId = params.get("transaction_id");
        const adUnit = params.get("ad_unit");
        const ssvUserId = params.get("user_id");

        if (!nonce || !transactionId) {
            logSsv("missing custom_data or transaction_id");
            return res.status(200).send("ignored");
        }

        const allowedUnits = getAllowedAdUnits();

        if (allowedUnits.length > 0 && !allowedUnits.includes(adUnit)) {
            console.warn(`AdMob SSV rejected: ad_unit ${adUnit} is not allowlisted`);
            return res.status(400).send("ad_unit_not_allowed");
        }

        let callbackTimestamp = parseInt(params.get("timestamp") || "0", 10);

        if (callbackTimestamp > 0 && callbackTimestamp < 1e12) {
            callbackTimestamp *= 1000;
        }

        if (callbackTimestamp > 0 && Date.now() - callbackTimestamp > MAX_CALLBACK_AGE_MS) {
            console.warn(`AdMob SSV ignored: stale callback timestamp ${callbackTimestamp}`);
            return res.status(200).send("stale");
        }

        const reward = await AdReward.findOne({ nonce }).lean();

        if (!reward) {
            logSsv("unknown nonce");
            return res.status(200).send("unknown_nonce");
        }

        if (reward.status !== "pending") {
            logSsv(`reward already ${reward.status}`);
            return res.status(200).send("already_processed");
        }

        if (new Date(reward.expiresAt).getTime() <= Date.now()) {
            await AdReward.updateOne(
                { _id: reward._id, status: "pending" },
                { $set: { status: "expired", lastError: "nonce_expired" } }
            );

            logSsv("nonce expired");
            return res.status(200).send("expired");
        }

        if (ssvUserId && ssvUserId !== reward.user.toString()) {
            console.warn("AdMob SSV ignored: user_id does not match reward owner");
            return res.status(200).send("user_mismatch");
        }

        const rewardAmount = parseInt(params.get("reward_amount") || "0", 10);

        try {
            const updated = await AdReward.findOneAndUpdate(
                { _id: reward._id, status: "pending" },
                {
                    $set: {
                        status: "verified",
                        verifiedAt: new Date(),
                        expiresAt: new Date(Date.now() + AD_REWARD_VERIFIED_TTL_MS),
                        ssvTransactionId: transactionId,
                        ssvMeta: {
                            adNetwork: params.get("ad_network") || null,
                            adUnit: adUnit || null,
                            rewardAmount: Number.isFinite(rewardAmount) ? rewardAmount : null,
                            rewardItem: params.get("reward_item") || null,
                            callbackTimestamp: callbackTimestamp || null,
                        },
                        lastError: null,
                    },
                },
                { new: true }
            );

            if (!updated) {
                logSsv("reward was claimed concurrently");
                return res.status(200).send("already_processed");
            }
        } catch (error) {
            if (error.code === 11000) {
                // Same transaction_id already applied elsewhere: idempotent success.
                logSsv("duplicate transaction id");
                return res.status(200).send("duplicate_transaction");
            }

            throw error;
        }

        logSsv("reward verified", { rewardId: String(reward._id), transactionId });

        return res.status(200).send("ok");
    } catch (error) {
        // 503 tells AdMob to retry (up to 5 times).
        console.error("ADMOB_SSV_ERROR:", error);
        return res.status(503).send("retry");
    }
};
