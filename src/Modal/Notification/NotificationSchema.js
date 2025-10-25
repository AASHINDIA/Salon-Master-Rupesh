import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const NotificationSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true, // recipient
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['info', 'success', 'warning', 'error'],
            default: 'info',
        },
        link: {
            type: String, // optional link to open when clicked
            trim: true,
        },
        data: {
            type: Schema.Types.Mixed, // arbitrary payload
        },
        read: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// ✅ Instance method to mark notification as read
NotificationSchema.methods.markRead = async function () {
    this.read = true;
    this.readAt = new Date();
    return this.save();
};

// ✅ Index for fast queries on unread notifications
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// ✅ Export model safely (prevents recompilation in dev environments)
const Notification = models.Notification || model('Notification', NotificationSchema);

export default Notification;
