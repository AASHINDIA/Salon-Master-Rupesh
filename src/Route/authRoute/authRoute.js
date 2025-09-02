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
import { addUser } from '../../Controller/AddUser/AddUser.js';
const router = express.Router();

// Public routes
router.post('/register-salonmaster', register);

router.post('/addUser', addUser);
router.post('/verify-otp-salonmaster', verifyOtp);
router.post('/reset-password-salonmaster', resetPassword);
router.post('/resend-otp-salonmaster', resendOtp);
router.post('/login-salonmaster', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/refresh-token', refreshToken);

export default router;