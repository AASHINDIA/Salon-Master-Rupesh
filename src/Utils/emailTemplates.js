// utils/emailTemplates.js

export const otpEmailTemplate = (otp, name = '') => ({
    subject: 'Your OTP Code',
    text: `Hello ${name || ''},\n\nYour OTP code is: ${otp}\n\nThis OTP will expire in 10 minutes.`,
    html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Hello ${name || 'User'},</h2>
            <p>Your OTP code is: <strong>${otp}</strong></p>
            <p>This OTP will expire in <strong>10 minutes</strong>.</p>
        </div>
    `
});
