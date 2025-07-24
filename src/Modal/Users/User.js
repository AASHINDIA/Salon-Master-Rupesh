import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },

    password: {
        type: String,
        required: true,
    },

    domain_type: {
        type: String,
        enum: ['solan', 'worker', 'company'], // Possible values
        required: true // Optional, but recommended if the field is mandatory
    },

    whatsapp_number: {
        type: String,
    },

    otp_verified: {
        type: Boolean,
        default: false,
    },

    otp_code: {
        type: String,
    },

    whatsapp_uid: {
        type: String,
    },

    otp_sent_at: {
        type: Date,
    },

    // Add OTP expiry field (10 minutes from when OTP was sent)
    otp_expires_at: {
        type: Date,
    },

    email_verified_at: {
        type: Date,
    },

    // 🔐 Tokens
    access_token: {
        type: String,
    },

    refresh_token: {
        type: String,
    },

    // 📱 Device token (e.g., for push notifications)
    device_token: {
        type: String,
    }

}, {
    timestamps: true
});


// 🔒 Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ✅ Compare entered password with stored password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// 🔑 Generate Access + Refresh Tokens
UserSchema.methods.generateTokens = function () {
    const accessToken = jwt.sign(
        { id: this._id, email: this.email },
        process.env.JWT_SECRET,
        
    );

    const refreshToken = jwt.sign(
        { id: this._id, email: this.email },
        process.env.JWT_REFRESH_SECRET,
    
    );

    return { accessToken, refreshToken };
};

// ⏳ Check if OTP is still valid (not expired)
UserSchema.methods.isOtpValid = function () {
    return this.otp_expires_at && new Date() < this.otp_expires_at;
};

// 🌐 Virtual Relationships
UserSchema.virtual('salons', {
    ref: 'UserRegistration',
    localField: '_id',
    foreignField: 'user_id',
});

UserSchema.virtual('favorites', {
    ref: 'Favorite',
    localField: '_id',
    foreignField: 'user_id',
});

UserSchema.virtual('cartItems', {
    ref: 'CartItem',
    localField: '_id',
    foreignField: 'user_id',
});

UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', UserSchema);

export default User;