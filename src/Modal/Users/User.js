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
    permissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission"
    }],
    domain_type: {
        type: String,
        enum: ['salon', 'worker', 'company', 'admin', 'superadmin',"Sale_Lease", "Training", "Franchise"],
        required: true
    },
    whatsapp_number: {
        type: String,
    },
    otp_verified: {
        type: Boolean,
        default: false,
    },
    whatsapp_uid: {
        type: String,
        maxlength: 500 // Increased length to handle long UIDs
    },
    otp_sent_at: {
        type: Date,
    },
    otp_attempts: {
        type: Number,
        default: 0,
    },
    otp_expires_at: {
        type: Date,
    },
    email_verified_at: {
        type: Date,
    },
    isSuspended: {
        type: Boolean,
        default: false,
        index: true
    },
    access_token: {
        type: String,
    },
    refresh_token: {
        type: String,
    },
    devicetoken: {
        type: String,
    }
}, {
    timestamps: true
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

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

UserSchema.methods.isOtpValid = function () {
    return this.otp_expires_at && new Date() < this.otp_expires_at;
};

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



