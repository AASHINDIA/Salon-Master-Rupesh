

import User from '../../Modal/Users/User.js';
import UserRegistration from '../../Modal/Users/UserRegistration.js';
import { sendOtpEmail } from '../../Utils/services/sendOtpEmail.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { sendWhatsAppMessage } from '../../Utils/whatsapp.js';
import { generateOTP, setOtpExpiry } from '../../Utils/generateOtp.js';
import axios from 'axios';
const TEMPLATE = process.env.WHATSAPP_TEMPLATE_NAME
// Helper function to set OTP expiry (10 minutes from now)



// Helper: Mask phone number in logs
const maskPhoneNumber = (phone) =>
    phone ? phone.slice(0, 2) + "*".repeat(phone.length - 4) + phone.slice(-2) : "";


// 📌 Register Controller
export const register = async (req, res) => {
    try {
        const { name, email, password, domain_type, whatsapp_number } = req.body;

        // ✅ Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { whatsapp_number }]
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email or WhatsApp number",
            });
        }

        // ✅ Generate OTP
        const otp = generateOTP(4, "numeric");

        // ✅ Create user
        const newUser = new User({
            name,
            email,
            password,
            domain_type,
            whatsapp_number,
            otp_code: otp,
            otp_expires_at: setOtpExpiry(),
            otp_verified: false,
        });

        const user = await newUser.save();

        // Create User Registration if salon
        if (domain_type === "salon") {
            await new UserRegistration({ user_id: user._id, status: "pending" }).save();
        }

        // ✅ Send OTP via WhatsApp
        const otpResponse = await sendWhatsAppMessage(
            whatsapp_number,
            process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification_template",
            [name, otp, "valid for 10 minutes", ""]
        );






        if (otpResponse.data) {
            user.whatsapp_uid = otpResponse.data;
            await user.save();
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully. OTP sent via WhatsApp.",
            data: { userId: user._id, email: user.whatapp_number, otpSent: true },
        });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// 📌 Verify OTP Controller


// export const verifyOtp = async (req, res) => {
//     try {
//         const { whatsapp_number, otp } = req.body;

//         if (!whatsapp_number || !/^\d{10,15}$/.test(whatsapp_number)) {
//             return res.status(422).json({ success: false, message: "Invalid WhatsApp number" });
//         }
//         if (!otp || !/^\d{4}$/.test(otp)) {
//             return res.status(422).json({ success: false, message: "Invalid OTP format" });
//         }

//         const user = await User.findOne({ whatsapp_number }).select("+otp_code +otp_attempts +otp_expires_at");
//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         // Too many attempts
//         if (user.otp_attempts >= 5) {
//             return res.status(429).json({
//                 success: false,
//                 message: "Too many attempts. Please request a new OTP",
//             });
//         }

//         // OTP expired
//         if (!user.isOtpValid()) {
//             return res.status(400).json({ success: false, message: "OTP expired. Request new one" });
//         }

//         // console.log("Verify OTP response:", user.whatsapp_uid);

//         // 🔗 Call external API to verify OTP (use POST instead of GET)

//         // const response = await axios.get(
//         //     process.env.WHATSAPP_VERIFY_OTP_URL,
//         //     {
//         //         params: {
//         //             otp,
//         //             uid: user.whatsapp_uid
//         //         }
//         //     }
//         // );


//         // if (!response.data?.status) {
//         //     user.otp_attempts += 1;
//         //     await user.save();
//         //     return res.status(400).json({
//         //         success: false,
//         //         message: response.data?.message || "Invalid OTP",
//         //         attempts_remaining: Math.max(0, 5 - user.otp_attempts),
//         //     });
//         // }

//         // ✅ OTP verified successfully


//         if(user.otp=otp){

//         user.otp_verified = true;
//         user.otp_code = null;
//         user.otp_expires_at = null;
//         user.otp_attempts = 0;
//         await user.save();
//         }
//         return res.status(200).json({
//             success: true,
//             message: "WhatsApp number verified successfully",
//         });

//     } catch (error) {
//         console.error("OTP verification error:", error?.response?.data || error.message);
//         return res.status(500).json({
//             success: false,
//             message: "OTP verification failed",
//             error: process.env.NODE_ENV === "development" ? (error?.response?.data || error.message) : undefined,
//         });
//     }
// };





export const verifyOtp = async (req, res) => {
    try {
        const { whatsapp_number, otp } = req.body;

        // ✅ Validate inputs
        if (!whatsapp_number || !/^\d{10,15}$/.test(whatsapp_number)) {
            return res.status(422).json({ success: false, message: "Invalid WhatsApp number" });
        }
        if (!otp || !/^\d{4}$/.test(otp)) {
            return res.status(422).json({ success: false, message: "Invalid OTP format" });
        }

        // ✅ Find user with OTP fields
        const user = await User.findOne({ whatsapp_number })
            .select("+otp_code +otp_attempts +otp_expires_at +otp_verified");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

      

        // ✅ OTP expired
        if (!user.isOtpValid()) {
            return res.status(400).json({ success: false, message: "OTP expired. Request new one" });
        }

      

        // ✅ OTP matched
        user.otp_verified = true;
        user.otp_code = null;
        user.otp_expires_at = null;

        // Generate tokens
        const { accessToken, refreshToken } = user.generateTokens();
        user.access_token = accessToken;
        user.refresh_token = refreshToken;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "WhatsApp number verified successfully",
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    domain_type: user.domain_type,
                    email_verified_at: user.email_verified_at,
                    whatsapp_number: user.whatsapp_number
                }
            }
        });

    } catch (error) {
        console.error("OTP verification error:", error?.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: "OTP verification failed",
            error: process.env.NODE_ENV === "development" ? (error?.response?.data || error.message) : undefined,
        });
    }
};








// Register a new user
export const register1 = async (req, res) => {
    try {
        const { name, email, password, domain_type, whatsapp_number } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create a temporary user object (not saved to DB yet)
        const tempUser = new User({
            name,
            email,
            password,
            domain_type,
            whatsapp_number,
            otp_verified: false
        });

        // Send OTP email first
        const otpResult = await sendOtpEmail(tempUser, {
            length: 4,
            type: 'numeric'
        });

        if (!otpResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email'
            });
        }

        // Set OTP expiry
        tempUser.otp_expires_at = setOtpExpiry();

        // Now save the user to database
        const user = await tempUser.save();

        // Create user registration record if domain_type is 'salon'
        if (domain_type === 'salon') {
            const registration = new UserRegistration({
                user_id: user._id,
                status: 'pending'
            });
            await registration.save();
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully. OTP sent to email.',
            data: {
                userId: user._id,
                email: user.email,
                otpSent: true
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};


// Verify OTP
export const verifyOtp1 = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if OTP is valid and not expired
        if (!user.isOtpValid() || user.otp_code !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Mark user as verified
        user.otp_verified = true;
        user.email_verified_at = new Date();
        user.otp_code = undefined;
        user.otp_expires_at = undefined;
        await user.save();

        // Generate tokens
        const { accessToken, refreshToken } = user.generateTokens();

        // Update user with tokens
        user.access_token = accessToken;
        user.refresh_token = refreshToken;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    domain_type: user.domain_type,
                    email_verified_at: user.email_verified_at
                }
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Login user
export const login = async (req, res) => {
    try {
        const { whatsapp_number, password, deviceToken } = req.body;

        // Find user and include password
        const user = await User.findOne({ whatsapp_number }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if OTP verified
        if (!user.otp_verified) {
            const otp = generateOTP(4, "numeric");
            const otpResponse = await sendWhatsAppMessage(
                user.whatsapp_number,
                process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification_template",
                [user.name, otp, "valid for 10 minutes", ""]
            );

            if (!otpResponse?.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Account not verified. Failed to resend OTP.'
                });
            }

            user.otp_code = otp;
            user.otp_expires_at = setOtpExpiry();
            await user.save();

            return res.status(403).json({
                success: false,
                message: 'Account not verified. New OTP sent to your WhatsApp.',
                data: {
                    requiresOtpVerification: true,
                    userId: user._id,
                    email: user.email
                }
            });
        }

        // Store device token
        if (deviceToken) {
            user.devicetoken = deviceToken; // ⚠️ in schema it’s "devicetoken", not "device_token"
        }

        // Generate tokens
        const { accessToken, refreshToken } = user.generateTokens();

        user.access_token = accessToken;
        user.refresh_token = refreshToken;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    domain_type: user.domain_type,
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};









// ✅ Step 1: Request Password Reset (send OTP on WhatsApp)
export const requestPasswordReset = async (req, res) => {
    try {
        const { whatsapp_number } = req.body;

        // Find user by WhatsApp number
        const user = await User.findOne({ whatsapp_number });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Generate OTP
        const otp = generateOTP(4, "numeric");

        // Send OTP via WhatsApp
        const otpResponse = await sendWhatsAppMessage(
            whatsapp_number,
            process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification_template",
            [user.name || "User", otp, "valid for 10 minutes", ""]
        );

        if (!otpResponse || otpResponse.success === false) {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP via WhatsApp",
            });
        }

        // Save OTP + expiry
        user.otp_code = otp;
        user.otp_expires_at = setOtpExpiry();
        user.otp_sent_at = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP sent for password reset via WhatsApp",
            data: { whatsapp_number, otpSent: true },
        });
    } catch (error) {
        console.error("Password reset request error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ✅ Step 2: Reset Password (verify OTP + update password)
export const resetPassword = async (req, res) => {
    try {
        const { whatsapp_number, otp, newPassword } = req.body;

        // Find user by WhatsApp number
        const user = await User.findOne({ whatsapp_number });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Validate OTP
        if (!user.isOtpValid() || user.otp_code !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        // Update password (will hash via pre-save hook)
        user.password = newPassword;
        user.otp_code = undefined;
        user.otp_expires_at = undefined;
        user.otp_verified = true; // ✅ mark OTP verified after successful use
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });
    } catch (error) {
        console.error("Password reset error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Refresh access token
export const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);

        // Find user
        const user = await User.findById(decoded.id);
        if (!user || user.refresh_token !== refresh_token) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Generate new tokens
        const { accessToken, refreshToken } = user.generateTokens();

        // Update user with new tokens
        user.access_token = accessToken;
        user.refresh_token = refreshToken;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Resend OTP
export const resendOtp = async (req, res) => {
    try {
        const { whatsapp_number } = req.body;

        // ✅ Find user
        const user = await User.findOne({ whatsapp_number });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const name = user.name;
        const otp = generateOTP(4, "numeric");

        // ✅ Send OTP via WhatsApp
        const otpResponse = await sendWhatsAppMessage(
            whatsapp_number,
            process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification_template",
            [name, otp, "valid for 10 minutes", ""]
        );


        if (!otpResponse?.data) {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP via WhatsApp"
            });
        }


        // ✅ Save new OTP + UID
        if (otpResponse.data) {
            user.whatsapp_uid = otpResponse.data;  // 🔹 store provider UID
        }
        user.otp_code = otp;                          // keep OTP for internal checks if needed
        user.otp_expires_at = setOtpExpiry();
        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP resent successfully",
            data: {
                email: user.email,
                otpSent: true
            }
        });
    } catch (error) {
        console.error("Resend OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
