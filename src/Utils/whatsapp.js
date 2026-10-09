// services/whatsappService.js
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_SEND = process.env.WHATSAPP_SEND_OTP_URL;
const WHATSAPP_VERIFY = process.env.WHATSAPP_VERIFY_OTP_URL;
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "otp";

const generateRandomOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
};

// Extract the UID from the provider send-OTP response
export function extractUid(responseData) {
    if (!responseData) return null;
    if (typeof responseData === "string") return responseData;
    return (
        responseData?.data?.uid ||
        responseData?.uid ||
        responseData?.Data?.Uid ||
        responseData?.data?.data?.uid ||
        null
    );
}

// Send OTP
export async function sendWhatsAppOtp(mobile, otp) {
    const number = mobile;
    try {
        console.log("Sending OTP to:", number);
        console.log("Sending OTP to:", otp);

        const body = {
            sessionId: process.env.WHATSAPP_SESSION_ID,
            to: number,
            templateName: process.env.WHATSAPP_TEMPLATE_NAME || "otp",
            languageCode: process.env.WHATSAPP_LANGUAGE_CODE || "en",
            templateParams: [otp],
            templateBodyText: "*{{1}}* is your verification code. For your security, do not share this code.",
            header: {
                type: "image",
                id: process.env.WHATSAPP_MEDIA_ID || ""
            },
            components: [otp]
        };

        const url = WHATSAPP_SEND;

        const resp = await axios.post(url, body, {
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": WHATSAPP_API_KEY
            },
            timeout: 30000,
        });

        console.log("WhatsApp OTP Send Response:", resp.data);

        const responseData = resp.data;
        return {
            success: true,
            data: responseData,
            uid: extractUid(responseData),
        };
    } catch (err) {
        console.error("WhatsApp OTP Send Error:", err?.response?.data || err.message);

        return {
            success: false,
            error: err?.response?.data || err.message,
            data: null,
            uid: null,
        };
    }
}

// Verify OTP
export async function verifyWhatsAppOtp(uid, otp) {
    try {
        console.log("Verifying OTP - UID:", uid, "OTP:", otp);

        const url = `${WHATSAPP_VERIFY}?apikey=${WHATSAPP_API_KEY}&uid=${uid}&otp=${otp}`;

        const resp = await axios.get(url, {
            headers: { Accept: "application/json" },
            timeout: 30000,
        });

        const data = resp?.data || {};
        console.log("WhatsApp OTP Verify Response:", data);

        return {
            success: true,
            data,
        };
    } catch (err) {
        console.error("WhatsApp OTP Verify Error:", err?.response?.data || err.message);

        return {
            success: false,
            error: err?.response?.data || err.message,
        };
    }
}