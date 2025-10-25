import express from 'express';
import Joi from 'joi';
import notificationController from '../../Controller/notification/NotificationController.js';
const router = express.Router();

// Route: Create Notification
router.post(
    '/create',
    notificationController.createNotification
);

// Route: Get Notifications for a User
router.get(
    '/user/:userId',
    notificationController.getNotificationsForUser
);

// Route: Mark Notification as Read
router.patch(
    '/read/:notificationId',
    notificationController.markNotificationAsRead
);

// Route: Delete Notification by ID
router.delete(
    '/delete/:notificationId',
    notificationController.deleteNotification
);

// Route: Delete Expired Notifications
router.delete(
    '/delete-expired',
    notificationController.deleteExpiredNotifications
);

// Route: Count Unread Notifications for a User
router.get(
    '/unread/count/:userId',
    notificationController.countUnreadNotifications
);

// Route: Clear All Notifications for a User
router.delete(
    '/clear/user/:userId',
    notificationController.clearAllNotificationsForUser
);

// Route: Send Notification to Device Tokens
router.post(
    '/send',
    notificationController.sendNotification
);

export default router;
