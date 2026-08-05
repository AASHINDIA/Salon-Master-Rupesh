import { OAuth2Client } from "google-auth-library";
import axios from "axios";
const client = new OAuth2Client();

const allowedAudiences = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID, // optional future-proof
].filter(Boolean).map((aud) => aud.trim());

/**
 * Verify Google ID Token (Production Grade)
 */
export const verifyGoogleOwnership = async (idToken) => {
    try {
        if (!idToken) {
            throw new Error("MISSING_ID_TOKEN");
        }

        // 🔐 Step 1: Verify token with Google
        const ticket = await client.verifyIdToken({
            idToken,
            audience: allowedAudiences,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            throw new Error("INVALID_PAYLOAD");
        }

        // 🔒 Step 2: Issuer validation
        const validIssuers = new Set([
            "accounts.google.com",
            "https://accounts.google.com",
        ]);

        if (!validIssuers.has(payload.iss)) {
            throw new Error("INVALID_ISSUER");
        }

        // 🔒 Step 3: Audience validation (multi-platform safe)
        if (!allowedAudiences.includes(payload.aud)) {
            throw new Error(`INVALID_AUDIENCE`);
        }

        // 🔒 Step 4: Email verification
        if (!payload.email_verified) {
            throw new Error("EMAIL_NOT_VERIFIED");
        }

        // 🔒 Step 5: Subject validation (Google unique ID)
        if (!payload.sub) {
            throw new Error("INVALID_SUBJECT");
        }

        return {
            provider: "google",
            providerId: payload.sub,
            email: payload.email?.toLowerCase() || null,
            name: payload.name || "",
            avatar: payload.picture || null,
            emailVerified: payload.email_verified,
        };
    } catch (error) {
        console.error("❌ Google Auth Error:", {
            message: error.message,
            stack: error.stack,
        });

        // Rethrow specific validation errors so callers can react to them
        if (/^(MISSING_ID_TOKEN|INVALID_PAYLOAD|INVALID_ISSUER|INVALID_AUDIENCE|EMAIL_NOT_VERIFIED|INVALID_SUBJECT)$/.test(error.message)) {
            throw error;
        }

        // 🔥 Standardized error response (like AWS / Stripe style)
        throw new Error("GOOGLE_AUTH_FAILED");
    }
};

/**
 * Verify Google Web token.
 * Accepts either a real OAuth2 access token OR a Google Identity Services
 * `credential` (a JWT ID token). If the access-token request fails, we fall
 * back to ID-token verification so the web login works in both cases.
 */
export const verifyGoogleWebOwnership = async (accessToken) => {
    if (!accessToken) {
        throw new Error("MISSING_ACCESS_TOKEN");
    }

    // Try as an access token first
    try {
        const response = await axios.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        const data = response.data;
        return {
            provider: "google",
            providerId: data.sub,
            email: data.email?.toLowerCase() || null,
            name: data.name || "",
            avatar: data.picture || null,
            emailVerified: data.email_verified || false,
        };
    } catch (accessTokenError) {
        // Not a valid access token → try verifying it as a Google ID token
        console.error("❌ Google Web access-token failed, falling back to ID-token verification:", {
            status: accessTokenError.response?.status,
            data: accessTokenError.response?.data,
        });

        try {
            return await verifyGoogleOwnership(accessToken);
        } catch (idTokenError) {
            throw new Error("INVALID_ACCESS_TOKEN");
        }
    }
};