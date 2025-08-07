

import User from '../../Modal/Users/User.js';
import UserRegistration from '../../Modal/Users/UserRegistration.js';
import { sendOtpEmail } from '../../Utils/services/sendOtpEmail.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Helper function to set OTP expiry (10 minutes from now)
const setOtpExpiry = () => {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    return expiry;
};

// Register a new user
export const register = async (req, res) => {
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
export const verifyOtp = async (req, res) => {
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
        const { email, password, deviceToken } = req.body; // Add deviceToken from request body

        // Find user by email
        const user = await User.findOne({ email });
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

        // Check if email is verified
        if (!user.otp_verified) {
            // Resend OTP if not verified
            const otpResult = await sendOtpEmail(user);
            if (!otpResult.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Account not verified. Failed to resend OTP.'
                });
            }

            // Set OTP expiry
            user.otp_expires_at = setOtpExpiry();
            await user.save();

            return res.status(403).json({
                success: false,
                message: 'Account not verified. New OTP sent to your email.',
                data: {
                    requiresOtpVerification: true,
                    userId: user._id,
                    email: user.email
                }
            });
        }

        // Store device token if provided
        if (deviceToken) {
            user.device_token = deviceToken;
        }

        // Generate tokens
        const { accessToken, refreshToken } = user.generateTokens();

        // Update user with tokens
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
                    email_verified_at: user.email_verified_at
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

// Request password reset
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Send OTP for password reset
        const otpResult = await sendOtpEmail(user);
        if (!otpResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email'
            });
        }

        // Set OTP expiry
        user.otp_expires_at = setOtpExpiry();
        await user.save();

        res.status(200).json({
            success: true,
            message: 'OTP sent for password reset',
            data: {
                email: user.email,
                otpSent: true
            }
        });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Reset password
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

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

        // Update password
        user.password = newPassword;
        user.otp_code = undefined;
        user.otp_expires_at = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
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
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Send OTP email
        const otpResult = await sendOtpEmail(user);
        if (!otpResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email'
            });
        }

        // Set OTP expiry
        user.otp_expires_at = setOtpExpiry();
        await user.save();

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
            data: {
                email: user.email,
                otpSent: true
            }
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};