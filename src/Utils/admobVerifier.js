import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";

dotenv.config();

const KEYS_URL =
    process.env.ADMOB_VERIFIER_KEYS_URL ||
    "https://www.gstatic.com/admob/reward/verifier-keys.json";

const KEY_CACHE_TTL_MS = (() => {
    const parsed = parseInt(process.env.ADMOB_KEY_CACHE_TTL_MS, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 24 * 60 * 60 * 1000;
})();

let keyCache = { keys: new Map(), fetchedAt: 0 };
let inFlightFetch = null;

const normalizeBase64 = (value = "") => {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    return padding ? normalized + "=".repeat(4 - padding) : normalized;
};

const parsePublicKeys = (payload) => {
    const keys = new Map();
    const list = Array.isArray(payload?.keys) ? payload.keys : [];

    for (const entry of list) {
        const keyId = entry?.keyId ?? entry?.key_id;
        const base64 = entry?.base64;

        if (keyId === undefined || keyId === null || !base64) continue;

        try {
            const publicKey = crypto.createPublicKey({
                key: Buffer.from(base64, "base64"),
                format: "der",
                type: "spki",
            });

            keys.set(String(keyId), publicKey);
        } catch (error) {
            console.error(`AdMob key ${keyId} could not be parsed:`, error.message);
        }
    }

    return keys;
};

const fetchKeys = async (force = false) => {
    const age = Date.now() - keyCache.fetchedAt;

    if (!force && keyCache.keys.size > 0 && age < KEY_CACHE_TTL_MS) {
        return keyCache.keys;
    }

    if (inFlightFetch) return inFlightFetch;

    inFlightFetch = (async () => {
        try {
            const response = await axios.get(KEYS_URL, { timeout: 5000 });
            const keys = parsePublicKeys(response.data);

            if (keys.size === 0) {
                throw new Error("AdMob key server returned no usable keys");
            }

            keyCache = { keys, fetchedAt: Date.now() };
            return keys;
        } finally {
            inFlightFetch = null;
        }
    })();

    return inFlightFetch;
};

const getPublicKey = async (keyId) => {
    let keys = await fetchKeys(false);

    if (!keys.has(String(keyId))) {
        // Keys rotate; force one refresh before giving up.
        keys = await fetchKeys(true);
    }

    return keys.get(String(keyId)) || null;
};

/**
 * Verify an AdMob SSV callback.
 *
 * IMPORTANT: the signed message is the raw query string up to (but not
 * including) `&signature=`; it must not be re-encoded or re-ordered.
 */
export const verifyAdmobCallback = async (rawQuery) => {
    if (!rawQuery || typeof rawQuery !== "string") {
        const error = new Error("Missing SSV query string");
        error.code = "SSV_MISSING_QUERY";
        throw error;
    }

    const signatureIndex = rawQuery.indexOf("&signature=");

    let signedContent;
    let signaturePart;

    if (signatureIndex !== -1) {
        signedContent = rawQuery.slice(0, signatureIndex);
        signaturePart = rawQuery.slice(signatureIndex + 1);
    } else if (rawQuery.startsWith("signature=")) {
        signedContent = "";
        signaturePart = rawQuery;
    } else {
        const error = new Error("Missing signature parameter");
        error.code = "SSV_MISSING_SIGNATURE";
        throw error;
    }

    // Parse every callback parameter (custom_data, transaction_id, ...) from
    // the full query string; only the signed content above is order-sensitive.
    const params = new URLSearchParams(rawQuery);
    const signature = params.get("signature");
    const keyId = params.get("key_id");

    if (!signature || !keyId) {
        const error = new Error("Missing signature or key_id");
        error.code = "SSV_MISSING_SIGNATURE";
        throw error;
    }

    const publicKey = await getPublicKey(keyId);

    if (!publicKey) {
        const error = new Error(`Unknown AdMob key_id: ${keyId}`);
        error.code = "SSV_UNKNOWN_KEY";
        throw error;
    }

    let valid = false;

    try {
        valid = crypto.verify(
            "sha256",
            Buffer.from(signedContent, "utf8"),
            publicKey,
            Buffer.from(normalizeBase64(signature), "base64")
        );
    } catch (error) {
        const verificationError = new Error("SSV signature verification failed");
        verificationError.code = "SSV_BAD_SIGNATURE";
        verificationError.cause = error;
        throw verificationError;
    }

    return {
        valid,
        params,
        signedContent,
    };
};

export const clearAdmobKeyCache = () => {
    keyCache = { keys: new Map(), fetchedAt: 0 };
};
