// utils/sendNotification.js
import admin from "./firebaseAdmin.js";

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
      const response = await admin.messaging().sendMulticast(message);
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
