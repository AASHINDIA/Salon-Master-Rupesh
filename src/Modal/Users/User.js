import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"],
        select: false, // Do not return password by default
    },
    permissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission"
    }],
    domain_type: {
        type: String,
        enum: [
            'salon', 'worker', 'company', 
            'admin', 'superadmin', 
            "Sale_Lease", "Training", "Franchise"
        ],
        required: true
    },
    whatsapp_number: {
        type: String,
        unique: true,
        sparse: true, // allows null + unique
        match: [/^\d{10,15}$/, "Enter a valid WhatsApp number"], 
    },
    otp_verified: {
        type: Boolean,
        default: false,
    },
    otp_code: {
        type: String,
        select: false, // don’t expose OTP
    },
    otp_attempts: {
        type: Number,
        default: 0,
        select: false,
    },
    whatsapp_uid: String,
    otp_sent_at: Date,
    otp_expires_at: Date,
    email_verified_at: Date,

    isSuspended: {
        type: Boolean,
        default: false,
        index: true,
    },

    access_token: String,
    refresh_token: String,
    devicetoken: String,

}, { timestamps: true });


// 🔒 Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12); // stronger salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ✅ Compare entered password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// 🔑 Generate JWT Tokens
UserSchema.methods.generateTokens = function () {
    const accessToken = jwt.sign(
        { id: this._id, email: this.email, role: this.domain_type },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // short-lived access token
    );

    const refreshToken = jwt.sign(
        { id: this._id, email: this.email },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' } // long-lived refresh token
    );

    return { accessToken, refreshToken };
};

// ⏳ OTP Validation
UserSchema.methods.isOtpValid = function () {
    return this.otp_expires_at && new Date() < this.otp_expires_at;
};

UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', UserSchema);
export default User;
