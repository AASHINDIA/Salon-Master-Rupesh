import cron from "node-cron";
import JobPostingDummy from "../../Modal/Dummaydata/jobsDummay.js";
import JobPosting from "../../Modal/JOB/JobPosting.js";
import Candidate from "../../Modal/Candidate/Candidate.js";
import Emp from "../../Modal/Dummaydata/Emp.js";

cron.schedule("0 0 * * *", async () => {
  try {
    console.log("⏰ Running daily cron job to deactivate old jobs and candidates...");

    // Calculate 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Update jobs older than 10 days
    await JobPosting.updateMany(
      { createdAt: { $lt: tenDaysAgo }, is_active: true },
      { $set: { is_active: false } }
    );

    await JobPostingDummy.updateMany(
      { createdAt: { $lt: tenDaysAgo }, is_active: true },
      { $set: { is_active: false } }
    );

    // Update candidates older than 10 days
    await Candidate.updateMany(
      { available_for_join_start: { $lt: tenDaysAgo }, available_for_join: true },
      { $set: { available_for_join: false } }
    );

    await Emp.updateMany(
      { createdAt: { $lt: tenDaysAgo }, available_for_join: true },
      { $set: { available_for_join: false } }
    );

    console.log("✅ Cron job finished: Old jobs & candidates deactivated.");
  } catch (error) {
    console.error("❌ Error running cron job:", error);
  }
});
