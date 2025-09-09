// import Subscription from "../models/subscription.js";
// import UsageLog from "../models/usageLog.js";
import Subscription from "../Modal/Subscriptions/subscriptions";
import UsageLog from "../Modal/Subscriptions/usageLogSchema";

/**
 * Handle click event, reduce subscription count and log usage
 * @param {Object} params
 * @param {String} params.candidateId - Candidate ID
 * @param {String} params.salonId - Salon ID
 * @param {String} params.jobId - Job ID
 * @param {String} params.clickedBy - Who clicked ("candidate" | "salon")
 * @returns {Object} { subscription, usageLog }
 */
export const handleClickHelper = async ({
  candidateId,
  salonId,
  jobId,
  clickedBy,
}) => {
  if (!candidateId || !salonId || !jobId || !clickedBy) {
    throw new Error("Missing required fields");
  }

  // 🔍 Find active subscription for salon
  const subscription = await Subscription.findOne({
    userId: salonId,
    status: "active",
  }).sort({ expiryDate: -1 });

  if (!subscription) {
    throw new Error("No active subscription");
  }

  const now = new Date();

  // Expiry check
  if (subscription.expiryDate < now) {
    subscription.status = "expired";
    await subscription.save();
    throw new Error("Subscription expired");
  }

  // Usage limit check
  if (
    subscription.maxUsageLimit !== null &&
    subscription.usageCount >= subscription.maxUsageLimit
  ) {
    subscription.status = "expired";
    await subscription.save();
    throw new Error("Usage limit reached");
  }

  // ✅ Deduct usage
  subscription.usageCount += 1;

  if (
    subscription.maxUsageLimit !== null &&
    subscription.usageCount >= subscription.maxUsageLimit
  ) {
    subscription.status = "expired";
  }

  await subscription.save();

  // ✅ Store click log
  const usageLog = await UsageLog.create({
    candidateId,
    salonId,
    jobId,
    clickedBy,
    subscriptionId: subscription._id,
    deducted: true,
  });

  return { subscription, usageLog };
};
