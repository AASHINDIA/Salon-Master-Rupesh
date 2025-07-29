import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({
    candidate_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    job_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobPosting',
        required: true
    },
    application_date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Applied', 'Viewed', 'Shortlisted', 'Interview Scheduled', 'Rejected', 'Hired'],
        default: 'Applied'
    },
    cover_message: {
        type: String,
        maxlength: 300
    },
    expected_salary: Number,
    availability: {
        start_date: Date,
        days_available: [String],
        time_slots: [String]
    },
    interview_details: [{
        date: Date,
        time: String,
        location: String,
        notes: String,
        status: {
            type: String,
            enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled']
        }
    }],
    salon_feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comments: String
    },
    candidate_feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comments: String
    },
    gender_match: {
        type: Boolean,
        default: true
    },
    skill_match_score: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better performance
jobApplicationSchema.index({ candidate_id: 1 });
jobApplicationSchema.index({ job_id: 1 });
jobApplicationSchema.index({ status: 1 });
jobApplicationSchema.index({ gender_match: 1 });
jobApplicationSchema.index({ skill_match_score: 1 });

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

export default JobApplication;