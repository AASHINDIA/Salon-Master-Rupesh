import { emailTransporter } from "../emailTransporter.js";
import {
    sellerListingPaymentSuccessTemplate,
    sellerListingPaymentFailedTemplate,
    sellerListingAdminNotificationTemplate,
} from "../emailTemplates.js";

const getAdminEmail = () => process.env.SUPER_ADMIN || process.env.EMAIL_USER;

export const sendListingPaymentSuccessEmails = async (payment, listing, seller) => {
    try {
        const { subject, text, html } = sellerListingPaymentSuccessTemplate(payment, listing);

        const sellerMailOptions = {
            from: `"${process.env.FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: listing.email || seller.email,
            subject,
            text,
            html,
        };

        await emailTransporter.sendMail(sellerMailOptions);

        const { subject: adminSubject, text: adminText, html: adminHtml } =
            sellerListingAdminNotificationTemplate(payment, listing, seller);

        const adminMailOptions = {
            from: `"${process.env.FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: getAdminEmail(),
            subject: adminSubject,
            text: adminText,
            html: adminHtml,
        };

        await emailTransporter.sendMail(adminMailOptions);

        return { success: true, message: "Payment confirmation emails sent" };
    } catch (error) {
        console.error("Failed to send listing payment success emails:", error);
        return { success: false, message: "Failed to send emails", error };
    }
};

export const sendListingPaymentFailedEmail = async (payment, listing) => {
    try {
        const { subject, text, html } = sellerListingPaymentFailedTemplate(payment, listing);

        const mailOptions = {
            from: `"${process.env.FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: listing.email,
            subject,
            text,
            html,
        };

        await emailTransporter.sendMail(mailOptions);

        return { success: true, message: "Payment failure email sent" };
    } catch (error) {
        console.error("Failed to send listing payment failure email:", error);
        return { success: false, message: "Failed to send email", error };
    }
};
