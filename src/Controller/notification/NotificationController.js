import NotificationSchema from "../../Modal/Notification/NotificationSchema.js";
import User from "../../Modal/Users/User.js";
import Joi from 'joi';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import winston from 'winston';

// Custom Error Classes
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Rate Limiter Setup
const rateLimiter = new RateLimiterMemory({
    points: 100,
    duration: 60, // 100 requests per minute
});

// Validation Schemas
const notificationSchema = Joi.object({
    userId: Joi.string().required(),
    title: Joi.string().max(100).required(),
    message: Joi.string().max(1000).required(),
    type: Joi.string().valid('info', 'warning', 'error', 'success').default('info'),
    link: Joi.string().uri().allow(null),
    data: Joi.object().default({}),
    expiresAt: Joi.date().allow(null)
});

const sendNotificationSchema = Joi.object({
    deviceTokens: Joi.array().items(Joi.string()).min(1).required(),
    notification: Joi.object({
        title: Joi.string().max(100).required(),
        message: Joi.string().max(1000).required(),
        type: Joi.string().valid('info', 'warning', 'error', 'success').default('info')
    }).required(),
    data: Joi.object().default({})
});

const notificationController = {
    async createNotification(req, res) {
        try {
            await rateLimiter.consume(req.ip);
            const { error, value } = notificationSchema.validate(req.body);
            if (error) throw new ValidationError(error.details[0].message);

            const notification = new NotificationSchema(value);
            await notification.save();

            logger.info('Notification created', { userId: value.userId, notificationId: notification._id });
            res.status(201).json({ success: true, data: notification });
        } catch (error) {
            logger.error('Error creating notification', { error: error.message, stack: error.stack });
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
                code: error.name
            });
        }
    },

    async getNotificationsForUser(req, res) {
        try {
            await rateLimiter.consume(req.ip);
            const { userId } = req.params;
            const { limit = 20, skip = 0 } = req.query;

            const querySchema = Joi.object({
                userId: Joi.string().required(),
                limit: Joi.number().integer().min(1).max(100).default(20),
                skip: Joi.number().integer().min(0).default(0)
            });

            const { error, value } = querySchema.validate({ userId, limit, skip });
            if (error) throw new ValidationError(error.details[0].message);

            // Optimize query with index usage
            const notifications = await NotificationSchema.find({ user: value.userId })
                .select('title message type createdAt read') // Select specific fields
                .sort({ createdAt: -1 })
                .limit(value.limit)
                .skip(value.skip)
                .lean(); // Convert to plain JS object for better performance

            logger.info('Notifications fetched', { userId, count: notifications.length });
            res.status(200).json({ success: true, data: notifications });
        } catch (error) {
            logger.error('Error fetching notifications', { error: error.message, stack: error.stack });
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
                code: error.name
            });
        }
    },

    async markNotificationAsRead(req, res) {
        try {
            await rateLimiter.consume(req.ip);
            const { notificationId } = req.params;

            const notification = await NotificationSchema.findById(notificationId);
            if (!notification) throw new NotFoundError("Notification not found");

            await notification.markRead();

            logger.info('Notification marked as read', { notificationId });
            res.status(200).json({ success: true, data: notification });
        } catch (error) {
            logger.error('Error marking notification as read', { error: error.message, stack: error.stack });
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
                code: error.name
            });
        }
    },

    async deleteNotification(req, res) {
        try {
            await rateLimiter.consume(req.ip);
            const { notificationId } = req.params;

            const result = await NotificationSchema.findByIdAndDelete(notificationId);
            if (!result) throw new NotFoundError("Notification not found");

            logger.info('Notification deleted', { notificationId });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error('Error deleting notification', { error: error.message, stack: error.stack });
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
                code: error.name
            });
        }
    },

    async deleteExpiredNotifications(req, res) {
        try {
            await rateLimiter.consume(req.ip);
            const now = new Date();
            const result = await NotificationSchema.deleteMany({
                expiresAt: { $lte: now }
            });

            logger.info('Expired notifications deleted', { count: result.deletedCount });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error('Error deleting expired notifications', { error: error.message, stack: error.stack });
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
                code: error.name
            });
        }
    },

    async countUnreadNotifications(req, res) {
        try {
            await rateLimiter.consume(req.ip);
            const { userId } = req.params;

            const count = await NotificationSchema.countDocuments({
                user: userId,
                read: false
            });

            logger.info('Unread notifications counted', { userId, count });
            res.status(200).json({ success: true, data: count });
        } catch (error) {
            logger.error('Error counting unread notifications', { error: error.message, stack: error.stack });
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
                code: error.name
            });
        }
    },

    async clearAllNotificationsForUser(req, res) {
        try {
            await rateLimiter.consume(req.ip);
            const { userId } = req.params;

            const result = await NotificationSchema.deleteMany({ user: userId });

            logger.info('All notifications cleared for user', { userId, count: result.deletedCount });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error('Error clearing notifications', { error: error.message, stack: error.stack });
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
                code: error.name
            });
        }
    },

    async sendNotification(req, res) {
        try {
            await rateLimiter.consume(req.ip);
            const { error, value } = sendNotificationSchema.validate(req.body);
            if (error) throw new ValidationError(error.details[0].message);

            const { deviceTokens, notification, data } = value;
            const messaging = getFirebaseMessagingInstance();

            // Batch processing for large number of tokens
            const BATCH_SIZE = 500;
            let successCount = 0;
            let failureCount = 0;
            const failedTokens = [];

            for (let i = 0; i < deviceTokens.length; i += BATCH_SIZE) {
                const batchTokens = deviceTokens.slice(i, i + BATCH_SIZE);
                const messagePayload = {
                    notification: {
                        title: notification.title,
                        body: notification.message,
                    },
                    data: {
                        ...data,
                        type: notification.type || 'info',
                    },
                };

                const response = await messaging.sendToDevice(batchTokens, messagePayload);

                response.results.forEach((result, index) => {
                    if (result.error) {
                        failureCount++;
                        failedTokens.push({
                            token: batchTokens[index],
                            error: result.error.message
                        });
                    } else {
                        successCount++;
                    }
                });
            }

            const finalResult = {
                successCount,
                failureCount,
                failedTokens,
                totalUsersTargeted: deviceTokens.length,
                totalTokensSent: successCount + failureCount,
            };

            logger.info('Notification send summary', {
                totalUsersTargeted: finalResult.totalUsersTargeted,
                totalTokensSent: finalResult.totalTokensSent,
                successCount: finalResult.successCount,
                failureCount: finalResult.failureCount,
                successRate: ((finalResult.successCount / finalResult.totalTokensSent) * 100).toFixed(2)
            });

            res.status(200).json({ success: true, data: finalResult });
        } catch (error) {
            logger.error('Error sending notifications', { error: error.message, stack: error.stack });
            res.status(error.statusCode || 500).json({
                success: false,
                data: {
                    successCount: 0,
                    failureCount: 0,
                    failedTokens: [],
                    totalUsersTargeted: 0,
                    totalTokensSent: 0,
                    error: error.message,
                    message: "Failed to send notifications"
                },
                code: error.name
            });
        }
    }
};

export default notificationController;