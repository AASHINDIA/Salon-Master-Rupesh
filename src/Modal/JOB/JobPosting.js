import mongoose from 'mongoose';

const jobPostingSchema = new mongoose.Schema({
    salon_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    job_title: {
        type: String,
        required: true,
        enum: ['Hair Stylist', 'Beautician', 'Nail Technician', 'Spa Therapist', 'Receptionist', 'Manager', 'Trainee', 'Other'],
        default: 'Hair Stylist'
    },
    custom_job_title: {
        type: String,
        trim: true
    },
    job_description: {
        type: String,
        required: true,
        maxlength: 500
    },
    gender_preference: {
        type: String,
        enum: ['Male', 'Female', 'Any'],
        default: 'Any'
    },
    required_experience: {
        type: String,
        enum: ['Fresher', '6 months', '1 year', '2 years', '3+ years'],
        default: 'Fresher'
    },
    salary_type: {
        type: String,
        enum: ['Fixed', 'Commission', 'Fixed + Commission', 'Negotiable'],
        default: 'Fixed'
    },
    salary_range: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 }
    },
    job_type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Temporary'],
        default: 'Full-time'
    },
    work_timings: {
        start: { type: String }, // e.g. "09:00"
        end: { type: String }    // e.g. "18:00"
    },
    working_days: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    required_skills: {
        type: [String],
        default: []
    },
    benefits: {
        type: [String],
        default: []
    },
    vacancy_count: {
        type: Number,
        default: 1
    },
    is_active: {
        type: Boolean,
        default: true
    },
    posted_date: {
        type: Date,
        default: Date.now
    },
    location: {
        type: String,
        required: true
    },
    contact_person: {
        name: String,
        phone: String,
        email: String
    },
    application_deadline: Date,
    interview_details: {
        type: String,
        maxlength: 200
    }
}, {
    timestamps: true
});

// Indexes for better performance
jobPostingSchema.index({ salon_id: 1 });
jobPostingSchema.index({ job_title: 1 });
jobPostingSchema.index({ gender_preference: 1 });
jobPostingSchema.index({ location: 1 });
jobPostingSchema.index({ is_active: 1 });

const JobPosting = mongoose.model('JobPosting', jobPostingSchema);

export default JobPosting;