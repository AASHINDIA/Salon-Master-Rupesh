import express from 'express';

import {
    getAllUsers,
    getUserById,
    updateUser,
    toggleUserSuspension,
    deleteUser
} from '../../Controller/UserManagement/UserMangement.js';
import { sendNotificationsToAllUsers } from '../../Utils/sendNotification.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js'

const router = express.Router();

// Route to send notifications to all users
router.post(
    '/sendNotificationToAll',
    protect, // Assumes protect middleware verifies JWT and sets req.user
    async (req, res) => {
        const { title, body, data = {} } = req.body;

        // Input validation
        if (!title || !body || typeof title !== 'string' || typeof body !== 'string') {
            return res.status(400).json({
                message: 'Invalid input: title and body are required and must be strings',
            });
        }

        // Optional: Validate data payload
        if (data && typeof data !== 'object') {
            return res.status(400).json({
                message: 'Invalid input: data must be an object',
            });
        }

        try {
            const result = await sendNotificationsToAllUsers(
                { title: title.trim(), body: body.trim() },
                data
            );

            return res.status(200).json({
                success: true,
                message: 'Notifications sent successfully',
                data: {
                    successCount: result.successCount,
                    failureCount: result.failureCount,
                    totalUsersTargeted: result.totalUsersTargeted,
                    totalTokensSent: result.totalTokensSent,
                    failedTokens: result.failedTokens,
                },
            });
        } catch (error) {
            console.error(`Error in /sendNotificationToAll by user ${req.user.id}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send notifications',
                error: error.message,
            });
        }
    }
);// Admin routes
router.route('/getAllUsers')
    .get(protect, getAllUsers);

router.route('/getAllUsersbyId/:id')
    .get(protect, getUserById)
    .put(protect, updateUser)
    .delete(protect, deleteUser);

router.route('/:id/suspend')
    .patch(protect, toggleUserSuspension);

export default router;