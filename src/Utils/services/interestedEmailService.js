import { emailTransporter } from "../emailTransporter.js";
import { interestedOwnerTemplate } from "../emailTemplates.js";
import FranchiseList from "../../Modal/franchise/FranchiseList.js";
import TraningList from "../../Modal/traininginstitute/TraningList.js";
import SellerListing from "../../Modal/sales/SellerListing.js";
import User from "../../Modal/Users/User.js";

const CATEGORY_MODELS = {
    FranchiseList,
    TraningList,
    SellerListing,
};

/**
 * Sends the "interested" notification email to the listing owner.
 * Throws typed errors so the worker can decide retry vs permanent failure.
 */
export const sendInterestedEmail = async (notification) => {
    const AdModel = CATEGORY_MODELS[notification.category];
    if (!AdModel) {
        throw Object.assign(new Error(`Unknown category: ${notification.category}`), { code: 'AD_NOT_FOUND' });
    }

    const [ad, owner, interestedUser] = await Promise.all([
        AdModel.findById(notification.adId).select('heading shopName fullName email userId status expiredAt').lean(),
        User.findById(notification.ownerUserId).select('name email').lean(),
        User.findById(notification.interestedUserId).select('name whatsapp_number email').lean(),
    ]);

    if (!ad) {
        throw Object.assign(new Error('Listing not found'), { code: 'AD_NOT_FOUND' });
    }
    if (!owner) {
        throw Object.assign(new Error('Owner user not found'), { code: 'OWNER_NOT_FOUND' });
    }
    if (!interestedUser) {
        throw Object.assign(new Error('Interested user not found'), { code: 'OWNER_NOT_FOUND' });
    }

    const recipient = owner.email || ad.email;
    if (!recipient) {
        throw Object.assign(new Error('No email available for owner'), { code: 'NO_EMAIL' });
    }

    const { subject, text, html } = interestedOwnerTemplate(owner, interestedUser, ad);

    if (process.env.EMAIL_MODE === 'mock') {
        console.log(`[MOCK EMAIL] to=${recipient} subject="${subject}"`);
        return { success: true, mock: true };
    }

    await emailTransporter.sendMail({
        from: `"${process.env.FROM_NAME}" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject,
        text,
        html,
    });

    return { success: true };
};
