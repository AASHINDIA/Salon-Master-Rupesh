import mongoose from 'mongoose';

const jobPostingDummySchema = new mongoose.Schema({
    salon_id: {
        name: { type: String, required: true },
        brand_name: { type: String },
        contact_no: { type: String },
    },
    is_Preuime: {
        type: Boolean,
        default: false
    },
    job_title: {
        type: String,
        required: true,
        
    },
    required_skills: {
        type: [String], // 🔹 skills are just strings now
        default: []
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
        default: 'Fresher'
    },
    salary_type: {
        type: String,
        default: 'Fixed + Commission'
    },
    salary_range: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 }
    },
    job_type: {
        type: String,
        default: 'Full-time'
    },
    work_timings: {
        start: { type: String }, // e.g. "09:00"
        end: { type: String }    // e.g. "18:00"
    },
    working_days: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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
    address: {
        country: { type: String, trim: true, required: true },
        state: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true },
        pincode: { type: String, trim: true },
        countryIsoCode: { type: String, trim: true },
        stateIsoCode: { type: String, trim: true }
    },
    location: {
        type: String,
        required: true
    },
    contact_person: {
        name: String,
        phone: String,
        email: String
    }
}, {
    timestamps: true
});

// 🔹 Indexes
jobPostingDummySchema.index({ 'salon_id.name': 1 });
jobPostingDummySchema.index({ job_title: 1 });
jobPostingDummySchema.index({ gender_preference: 1 });
jobPostingDummySchema.index({ location: 1 });
jobPostingDummySchema.index({ is_active: 1 });

const JobPostingDummy = mongoose.model('JobPostingDummy', jobPostingDummySchema);

export default JobPostingDummy;
