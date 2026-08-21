import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const InterestedNotificationSchema = new Schema(
    {
        interestId: {
            type: Schema.Types.ObjectId,
            ref: 'ListingInterest',
            required: true,
            unique: true, // one notification per interest, no duplicate jobs
        },
        category: {
            type: String,
            enum: ['FranchiseList', 'TraningList', 'SellerListing'],
            required: true,
        },
        adId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        interestedUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        ownerUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        status: {
            type: String,
            enum: ['pending', 'processing', 'sent', 'failed'],
            default: 'pending',
        },
        attempts: {
            type: Number,
            default: 0,
        },
        maxAttempts: {
            type: Number,
            default: function () {
                return parseInt(process.env.NOTIFICATION_MAX_RETRIES || '5');
            },
        },
        nextAttemptAt: {
            type: Date,
            default: Date.now,
        },
        processingAt: {
            type: Date,
            default: null,
        },
        sentAt: {
            type: Date,
            default: null,
        },
        lastError: {
            type: String,
            default: null,
        },
        failReason: {
            type: String,
            enum: ['smtp_error', 'owner_not_found', 'ad_not_found', 'no_email', 'max_retries', null],
            default: null,
        },
    },
    { timestamps: true }
);

// Worker claim index: finds pending jobs or stale processing jobs efficiently
InterestedNotificationSchema.index(
    { status: 1, nextAttemptAt: 1 },
    { name: 'worker_claim_idx' }
);

// TTL: auto-purge sent notifications after 90 days
InterestedNotificationSchema.index(
    { sentAt: 1 },
    { expireAfterSeconds: 90 * 24 * 3600, name: 'ttl_sent_cleanup', partialFilterExpression: { status: 'sent' } }
);

const InterestedNotification = models.InterestedNotification
    || model('InterestedNotification', InterestedNotificationSchema);

export default InterestedNotification;
