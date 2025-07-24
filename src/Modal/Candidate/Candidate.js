import mongoose from 'mongoose';
import User from './User.js'; // Assuming you have a User model

const candidateSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    image: {
        type: String, // Stores path/URL of the candidate's image
    },
    id_no: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    date_of_birth: {
        type: Date,
    },
    address: {
        type: String,
        trim: true
    },
    pan_no: {
        type: String,
        trim: true
    },
    contact_no: {
        type: String,
        trim: true
    },
    id_type: {
        type: String,
        enum: ['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN', 'Other'],
        trim: true
    },
    id_detail: {
        type: String,
        trim: true
    },
    education: {
        type: [{
            degree: String,
            institution: String,
            year: Number,
            grade: String
        }],
        default: []
    },
    certificates: {
        type: [{
            name: String,
            issuer: String,
            year: Number
        }],
        default: []
    },
    skills: {
        type: [String],
        default: []
    },
    services: {
        type: [String],
        default: []
    },
    available_for_join: {
        type: Boolean,
        default: false
    },
    joining_date: {
        type: Date,
    },
    portfolio_links: {
        type: [{
            platform: String,
            url: String
        }],
        default: []
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Virtual for age calculation (optional)
candidateSchema.virtual('age').get(function () {
    if (!this.date_of_birth) return null;
    const diff = Date.now() - this.date_of_birth.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

// Indexes for better query performance
candidateSchema.index({ name: 1 });
candidateSchema.index({ location: 1 });
candidateSchema.index({ user_id: 1 });
candidateSchema.index({ skills: 1 });
candidateSchema.index({ available_for_join: 1 });

const Candidate = mongoose.model('Candidate', candidateSchema);

export default Candidate;