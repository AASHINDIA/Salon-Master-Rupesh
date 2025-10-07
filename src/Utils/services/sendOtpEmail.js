// services/sendOtpEmail.js
import { generateOTP } from '../generateOtp.js';
import { emailTransporter } from '../emailTransporter.js';
import { otpEmailTemplate,companyCartEmailTemplate,superAdminCartEmailTemplate } from '../emailTemplates.js';


export const sendOtpEmail = async (user, options = {}) => {
    try {
        const otp = generateOTP(options.length || 6, options.type || 'numeric');
        user.otp_code = otp;
        user.otp_sent_at = new Date();
        await user.save();

        const { subject, text, html } = otpEmailTemplate(otp, user.name);

        const mailOptions = {
            from: `"${process.env.FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject,
            text,
            html,
        };

        await emailTransporter.sendMail(mailOptions);

        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        return { success: false, message: 'Failed to send OTP email', error };
    }
};







export const sendCartAddedEmails = async (user, product, company, companyEmail, superAdminEmail) => {
    try {
        /** 1️⃣ Email to Company */
        const { subject: companySubject, text: companyText, html: companyHtml } =
            companyCartEmailTemplate(user, product);

        const companyMailOptions = {
            from: `"${process.env.FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: companyEmail,
            subject: companySubject,
            text: companyText,
            html: companyHtml,
        };

        await emailTransporter.sendMail(companyMailOptions);

        /** 2️⃣ Email to Super Admin */
        const { subject: adminSubject, text: adminText, html: adminHtml } =
            superAdminCartEmailTemplate(user, product, company);

        const superAdminMailOptions = {
            from: `"${process.env.FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: superAdminEmail,
            subject: adminSubject,
            text: adminText,
            html: adminHtml,
        };

        await emailTransporter.sendMail(superAdminMailOptions);

        return { success: true, message: 'Cart notification emails sent successfully' };
    } catch (error) {
        console.error('Failed to send cart notification emails:', error);
        return { success: false, message: 'Failed to send cart notification emails', error };
    }
};

