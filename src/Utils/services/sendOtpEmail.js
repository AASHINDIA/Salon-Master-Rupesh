// services/sendOtpEmail.js
import { generateOTP } from '../generateOtp.js';
import { emailTransporter } from '../emailTransporter.js';
import { otpEmailTemplate } from '../emailTemplates.js';


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
