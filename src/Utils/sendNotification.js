import admin from "./firebaseAdmin.js";
import User from "../Modal/Users/User.js";

const BATCH_SIZE = 500; // FCM limit for multicast messages

/**
 * Send push notification to many users by batching tokens
 * @param {Array<string>} deviceTokens - Array of FCM device tokens
 * @param {Object} notification - Notification payload with title and body
 * @param {Object} data - Additional data payload
 * @returns {Object} - Summary with success/failure counts and failed tokens
 */
export const sendNotification = async (deviceTokens, notification, data = {}) => {
  // Input validation
  if (!Array.isArray(deviceTokens)) {
    throw new Error('Device tokens must be an array');
  }

  if (deviceTokens.length === 0) {
    console.warn('No device tokens provided.');
    return {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      message: 'No device tokens provided'
    };
  }

  if (!notification || !notification.title || !notification.body) {
    throw new Error('Notification must include title and body');
  }

  const totalBatches = Math.ceil(deviceTokens.length / BATCH_SIZE);
  let successCount = 0;
  let failureCount = 0;
  let failedTokens = [];

  console.log(`📤 Sending notifications in ${totalBatches} batches...`);

  for (let i = 0; i < totalBatches; i++) {
    const batchTokens = deviceTokens.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

    // Filter out invalid tokens
    const validBatchTokens = batchTokens.filter(token =>
      typeof token === 'string' && token.trim() !== ''
    );

    if (validBatchTokens.length === 0) {
      console.log(`Batch ${i + 1}: No valid tokens in this batch`);
      continue;
    }

    const message = {
      notification: {
        title: notification.title.trim(),
        body: notification.body.trim(),
        ...(notification.imageUrl && { imageUrl: notification.imageUrl })
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        // Add type for client-side handling
        notificationType: data.notificationType || 'broadcast'
      },
      tokens: validBatchTokens,
      // Optional: Configure APNS for iOS
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      // Optional: Configure Android
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      successCount += response.successCount;
      failureCount += response.failureCount;

      // Collect failed tokens for cleanup
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(validBatchTokens[idx]);

          // Log error details for debugging
          if (resp.error) {
            console.warn(`Token ${validBatchTokens[idx]} failed:`, resp.error);

            // Remove invalid tokens from database
            if (resp.error.code === 'messaging/invalid-registration-token' ||
              resp.error.code === 'messaging/registration-token-not-registered') {
              cleanupInvalidToken(validBatchTokens[idx]);
            }
          }
        }
      });

      console.log(`✅ Batch ${i + 1}/${totalBatches}: ${response.successCount} successful, ${response.failureCount} failed`);

    } catch (err) {
      console.error(`❌ Error in batch ${i + 1}/${totalBatches}:`, err);
      failureCount += validBatchTokens.length;
      failedTokens.push(...validBatchTokens);
    }
  }

  console.log(`📊 Notifications Summary: ${successCount} successful, ${failureCount} failed out of ${deviceTokens.length} total tokens`);

  return {
    successCount,
    failureCount,
    failedTokens,
    totalTokens: deviceTokens.length
  };
};

/**
 * Clean up invalid FCM tokens from database
 * @param {string} invalidToken - The invalid FCM token to remove
 */
const cleanupInvalidToken = async (invalidToken) => {
  try {
    await User.updateMany(
      { devicetoken: invalidToken },
      { $unset: { devicetoken: 1 } }
    );
    console.log(`🧹 Cleaned up invalid token: ${invalidToken.substring(0, 10)}...`);
  } catch (error) {
    console.error('Error cleaning up invalid token:', error);
  }
};

/**
 * Send notifications to all active users with valid device tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Object} - Detailed result of the notification send operation
 */
export const sendNotificationsToAllUsers = async (notification, data = {}) => {
  try {
    // Validate notification object
    if (!notification || !notification.title || !notification.body) {
      throw new Error("Notification object must include title and body");
    }

    console.log('🔍 Fetching users with device tokens...');

    // Fetch all active users with valid device tokens
    const users = await User.find({
      devicetoken: {
        $exists: true,
        $ne: null,
        $ne: ""
      },
      
      otp_verified: true // Assuming you have an isActive field
    }).select("devicetoken _id");

    console.log(`👥 Found ${users.length} users with device tokens`);
    if (users.length === 0) {
      console.warn("No users with device tokens found");
      return {
        successCount: 0,
        failureCount: 0,
        failedTokens: [],
        totalUsersTargeted: 0,
        totalTokensSent: 0,
        message: "No users with device tokens found"
      };
    }

    // Extract and validate device tokens
    const deviceTokens = users
      .map(user => user.devicetoken)
      .filter(token =>
        typeof token === 'string' &&
        token.trim() !== '' &&
        token.length > 10 // Basic FCM token validation
      );

    if (deviceTokens.length === 0) {
      console.warn("No valid device tokens found after filtering");
      return {
        successCount: 0,
        failureCount: 0,
        failedTokens: [],
        totalUsersTargeted: users.length,
        totalTokensSent: 0,
        message: "No valid device tokens found after filtering"
      };
    }

    console.log(`📱 Found ${deviceTokens.length} valid device tokens out of ${users.length} users`);

    // Remove duplicate tokens
    const uniqueTokens = [...new Set(deviceTokens)];
    if (uniqueTokens.length !== deviceTokens.length) {
      console.log(`🔄 Removed ${deviceTokens.length - uniqueTokens.length} duplicate tokens`);
    }

    // Send notifications using the existing sendNotification utility
    const result = await sendNotification(uniqueTokens, notification, data);

    // Prepare final result
    const finalResult = {
      successCount: result.successCount,
      failureCount: result.failureCount,
      failedTokens: result.failedTokens,
      totalUsersTargeted: users.length,
      totalTokensSent: uniqueTokens.length,
      duplicatesRemoved: deviceTokens.length - uniqueTokens.length,
      message: `Notifications sent successfully. ${result.successCount} delivered, ${result.failureCount} failed`
    };

    console.log(`🎉 Notification sending completed:
      • Total users in database: ${finalResult.totalUsersTargeted}
      • Valid tokens sent: ${finalResult.totalTokensSent}
      • Duplicates removed: ${finalResult.duplicatesRemoved}
      • Successful deliveries: ${finalResult.successCount}
      • Failed deliveries: ${finalResult.failureCount}
      • Success rate: ${((finalResult.successCount / finalResult.totalTokensSent) * 100).toFixed(2)}%`);

    return finalResult;

  } catch (error) {
    console.error("❌ Error sending notifications to all users:", error);

    return {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      totalUsersTargeted: 0,
      totalTokensSent: 0,
      error: error.message,
      message: "Failed to send notifications"
    };
  }
};

/**
 * Send notification to specific users by their IDs
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 */
export const sendNotificationToUsers = async (userIds, notification, data = {}) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('User IDs must be a non-empty array');
    }

    const users = await User.find({
      _id: { $in: userIds },
      devicetoken: { $exists: true, $ne: null, $ne: "" },
      isSuspended: false
    }).select("devicetoken");

    const deviceTokens = users
      .map(user => user.devicetoken)
      .filter(token => typeof token === 'string' && token.trim() !== '');

    if (deviceTokens.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        failedTokens: [],
        message: "No valid device tokens found for the specified users"
      };
    }

    return await sendNotification(deviceTokens, notification, data);

  } catch (error) {
    console.error('Error sending notification to specific users:', error);
    throw error;
  }
};