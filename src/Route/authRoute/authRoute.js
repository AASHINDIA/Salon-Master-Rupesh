import express from 'express';
import {
    register,
    verifyOtp,
    login,
    requestPasswordReset,
    resetPassword,
    refreshToken,
    resendOtp,
    getUserSubDomain
} from '../../Controller/AuthController/authController.js';
import { addUser } from '../../Controller/AddUser/AddUser.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
const router = express.Router();

// Public routes
router.post('/register-salonmaster', register);

router.get('/getUserSubDomain', protect, getUserSubDomain);

router.post('/addUser', addUser);
router.post('/verify-otp-salonmaster', verifyOtp);
router.post('/reset-password-salonmaster', resetPassword);
router.post('/resend-otp-salonmaster', resendOtp);
router.post('/login-salonmaster', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/refresh-token', refreshToken);

export default router;