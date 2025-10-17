// utils/sendNotification.js
import admin from "./firebaseAdmin.js";
import User from "../Modal/Users/User.js";
const BATCH_SIZE = 500;

/**
 * Send push notification to many users by batching tokens (FCM limit: 500).
 *
 * @param {Array<string>} deviceTokens - FCM tokens.
 * @param {Object} notification - Notification title/body.
 * @param {Object} [data={}] - Optional data payload.
 * @returns {Object} - Summary with success/failure counts.
 */
export const sendNotification = async (deviceTokens, notification, data = {}) => {
  if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
    console.warn('No device tokens provided.');
    return { successCount: 0, failureCount: 0 };
  }

  const totalBatches = Math.ceil(deviceTokens.length / BATCH_SIZE);
  let successCount = 0;
  let failureCount = 0;
  let failedTokens = [];

  for (let i = 0; i < totalBatches; i++) {
    const batchTokens = deviceTokens.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

    const message = {
      notification,
      data,
      tokens: batchTokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(batchTokens[idx]);
        }
      });

    } catch (err) {
      console.error(`Error in batch ${i + 1}/${totalBatches}:`, err);
    }
  }

  console.log(`✅ Notifications Summary: ${successCount} success, ${failureCount} failed`);
  return { successCount, failureCount, failedTokens };
};




export const sendNotificationsToAllUsers = async (notification, data = {}) => {
  try {
    // Validate notification object
    if (!notification || !notification.title || !notification.body) {
      throw new Error("Notification object must include title and body");
    }

    // Fetch all users with device tokens
    const users = await User.find({
      devicetoken: { $exists: true, $ne: null, $ne: "" },
      isSuspended: false
    }).select("devicetoken");

    // Extract device tokens
    const deviceTokens = users
      .map(user => user.devicetoken)
      .filter(token => typeof token === 'string' && token.trim() !== '');

    if (deviceTokens.length === 0) {
      console.warn("No valid device tokens found for any users");
      return {
        successCount: 0,
        failureCount: 0,
        failedTokens: [],
        message: "No valid device tokens found"
      };
    }

    console.log(`Found ${deviceTokens.length} valid device tokens`);

    // Send notifications using the existing sendNotification utility
    const result = await sendNotification(deviceTokens, notification, data);

    // Log detailed results
    console.log(`Notification sending completed:
      Total users targeted: ${users.length}
      Valid tokens sent: ${deviceTokens.length}
      Successful deliveries: ${result.successCount}
      Failed deliveries: ${result.failureCount}
      Failed tokens: ${result.failedTokens.length}`);

    return {
      ...result,
      totalUsersTargeted: users.length,
      totalTokensSent: deviceTokens.length
    };

  } catch (error) {
    console.error("Error sending notifications to all users:", error);
    return {
      successCount: 0,
      failureCount: deviceTokens?.length || 0,
      failedTokens: deviceTokens || [],
      error: error.message,
      message: "Failed to send notifications"
    };
  }
};