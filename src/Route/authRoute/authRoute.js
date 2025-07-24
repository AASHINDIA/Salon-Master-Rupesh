import express from 'express';
import {
    register,
    verifyOtp,
    login,
    requestPasswordReset,
    resetPassword,
    refreshToken,
    resendOtp
} from '../../Controller/AuthController/authController.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/resend-otp', resendOtp);

export default router;