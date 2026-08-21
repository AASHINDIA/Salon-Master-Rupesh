import InterestedNotification from "../Modal/InterestedNotification/InterestedNotificationSchema.js";
import { sendInterestedEmail } from "../Utils/services/interestedEmailService.js";

function getConfig() {
    return {
        concurrency: parseInt(process.env.NOTIFICATION_CONCURRENCY || "5", 10),
        pollInterval: parseInt(process.env.NOTIFICATION_POLL_INTERVAL_MS || "2000", 10),
        staleMs: parseInt(process.env.NOTIFICATION_STALE_MS || "300000", 10),
        baseBackoffMs: parseInt(process.env.NOTIFICATION_BASE_BACKOFF_MS || "60000", 10),
        jitterMs: parseInt(process.env.NOTIFICATION_BACKOFF_JITTER_MS || "15000", 10),
        maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || "5", 10),
    };
}

const HARD_BOUNCE_PATTERN = /(?:550|551|553|554|invalid recipient|mailbox unavailable|user unknown|no such user|recipient rejected)/i;
const NO_EMAIL_CODES = new Set(['OWNER_NOT_FOUND', 'AD_NOT_FOUND', 'NO_EMAIL']);

function isHardBounce(message) {
    return HARD_BOUNCE_PATTERN.test(message || "");
}

function computeNextAttempt(attempts, baseBackoff, jitter) {
    const exp = baseBackoff * Math.pow(2, Math.max(0, attempts - 1));
    const jitterVal = Math.floor(Math.random() * Math.max(0, jitter));
    return new Date(Date.now() + exp + jitterVal);
}

async function claimJob({ staleMs }) {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - staleMs);
    return InterestedNotification.findOneAndUpdate(
        {
            $or: [
                { status: "pending", nextAttemptAt: { $lte: now } },
                { status: "processing", processingAt: { $lt: staleCutoff } },
            ],
        },
        {
            $set: { status: "processing", processingAt: now },
            $inc: { attempts: 1 },
        },
        {
            sort: { nextAttemptAt: 1, createdAt: 1 },
            returnDocument: "after",
        }
    );
}

async function processJob(job, config) {
    const { baseBackoffMs, jitterMs, maxRetries } = config;
    try {
        await sendInterestedEmail(job);
        const result = await InterestedNotification.updateOne(
            { _id: job._id, status: "processing" },
            {
                $set: {
                    status: "sent",
                    sentAt: new Date(),
                    lastError: null,
                    failReason: null,
                },
            }
        );
        if (result.matchedCount === 0) {
            console.warn(`[worker] job ${job._id} lost processing guard on mark-sent; skipping`);
        } else {
            console.log(`[worker] sent notification ${job._id} (interest ${job.interestId})`);
        }
    } catch (err) {
        const message = err.message || String(err);
        const code = err.code || null;
        const permanent = NO_EMAIL_CODES.has(code) || (code !== null && NO_EMAIL_CODES.has(code));
        const hardBounce = isHardBounce(message);
        const exhausted = job.attempts >= (job.maxAttempts || maxRetries);

        if (permanent) {
            const reason = code === 'AD_NOT_FOUND' ? 'ad_not_found'
                : code === 'OWNER_NOT_FOUND' ? 'owner_not_found' : 'no_email';
            await InterestedNotification.updateOne(
                { _id: job._id, status: "processing" },
                { $set: { status: "failed", lastError: message, failReason: reason } }
            );
            console.warn(`[worker] permanent failure ${job._id}: ${message} (${reason})`);
            return;
        }

        if (hardBounce || exhausted) {
            const reason = hardBounce ? 'smtp_error' : 'max_retries';
            await InterestedNotification.updateOne(
                { _id: job._id, status: "processing" },
                { $set: { status: "failed", lastError: message, failReason: reason } }
            );
            console.warn(`[worker] failed ${job._id}: ${message} (${reason}) attempts=${job.attempts}`);
            return;
        }

        const nextAttemptAt = computeNextAttempt(job.attempts, baseBackoffMs, jitterMs);
        await InterestedNotification.updateOne(
            { _id: job._id, status: "processing" },
            { $set: { status: "pending", nextAttemptAt, lastError: message } }
        );
        console.warn(`[worker] retry scheduled ${job._id}: attempt ${job.attempts} nextAttemptAt=${nextAttemptAt.toISOString()} err=${message}`);
    }
}

async function tick(config) {
    const jobs = [];
    for (let i = 0; i < config.concurrency; i++) {
        const job = await claimJob(config).catch((err) => {
            console.error(`[worker] claim error: ${err.message}`);
            return null;
        });
        if (job) jobs.push(job);
    }
    if (jobs.length === 0) return 0;
    await Promise.all(jobs.map((j) => processJob(j, config)));
    return jobs.length;
}

export async function startNotificationWorker() {
    const config = getConfig();
    console.log(`[worker] start: concurrency=${config.concurrency} pollInterval=${config.pollInterval} staleMs=${config.staleMs}`);

    let running = true;

    const shutdown = () => {
        if (!running) return;
        console.log("[worker] shutdown signal received; draining current tick...");
        running = false;
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);

    while (running) {
        try {
            const n = await tick(config);
            if (n === 0 && running) {
                await new Promise((r) => setTimeout(r, config.pollInterval));
            }
        } catch (err) {
            console.error(`[worker] tick error: ${err.message}`);
            await new Promise((r) => setTimeout(r, config.pollInterval));
        }
    }

    console.log("[worker] stopped");
}

export { claimJob, processJob, computeNextAttempt };
