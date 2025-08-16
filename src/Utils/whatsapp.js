import axios from "axios";

const WHATSAPP_API_BASE =process.env.WHATSAPP_SEND_OTP_URL;
const API_KEY = process.env.WHATSAPP_API_KEY;

/**
 * Send WhatsApp Template Message
 * @param {string} mobile - WhatsApp number
 * @param {string} templateName - WhatsApp template name
 * @param {Array<string>} params - Template params [param1..param4]
 */
export const sendWhatsAppMessage = async (mobile, templateName, params = []) => {
  try {
    const url =
      `${WHATSAPP_API_BASE}?apikey=${API_KEY}&mobile=${mobile}&templatename=${templateName}&mediatype=none&mediaid&serviceid=18` +
      `&param1=${params[0] || ""}&param2=${params[1] || ""}&param3=${params[2] || ""}&param4=${params[3] || ""}`;

    const { data } = await axios.get(url);
    return { success: true, data };
  } catch (error) {
    console.error("WhatsApp API Error:", error.message);
    return { success: false, error: error.message };
  }
};
