import mongoose from 'mongoose';

const salonClaimSchema = new mongoose.Schema({
    salon_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true,
        index: true,
    },
    whatsapp_number: {
        type: String,
        trim: true,
    },
    whatsapp_uid: {
        type: String,
    },
    otp_code: {
        type: String,
        required: true,
    },
    otp_sent_at: {
        type: Date,
        default: Date.now,
    },
    otp_expires_at: {
        type: Date,
        required: true,
    },
    otp_attempts: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'expired'],
        default: 'pending',
        index: true,
    },
    verified_at: {
        type: Date,
    },
}, {
    timestamps: true,
});

salonClaimSchema.index({ salon_id: 1, status: 1 });

const SalonClaim = mongoose.model('SalonClaim', salonClaimSchema);

export default SalonClaim;
