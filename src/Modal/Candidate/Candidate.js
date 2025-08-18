import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    image: {
        type: String,
    },
    uniquename: {
        type: String,
        required: true
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
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
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
        number: { type: String, trim: true }, // e.g., Aadhaar/PAN number
        front_image: { type: String, trim: true }, // URL or file path for front
        back_image: { type: String, trim: true }   // URL or file path for back
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
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Skill'
        }],
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
    address: {
        country: {
            type: String,
            trim: true,
            required: true
        },
        state: {
            type: String,
            trim: true,
            required: true
        },
        city: {
            type: String,
            trim: true,
            required: true
        },
        pincode: {
            type: String,
            trim: true,
            required: true
        },
        countryIsoCode: {
            type: String,
            trim: true // Store ISO code for country lookup
        },
        stateIsoCode: {
            type: String,
            trim: true // Store ISO code for state lookup
        }
    },
    joining_date: {
        type: Date,
    },
    expected_salary: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 }
    },
    portfolio_links: {
        type: [{
            platform: String,
            url: String
        }],
        default: []
    },
    looking_job_location: {
        type: String,
        enum: ['india', 'outside_india', 'both', ''],
        default: ''
    },
    preferred_locations: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true
});


// Virtual for age calculation
candidateSchema.virtual('age').get(function () {
    if (!this.date_of_birth) return null;
    const diff = Date.now() - this.date_of_birth.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

candidateSchema.pre(/^find/, function (next) {
    this.populate('skills');  // Populates the full Skill documents
    next();
});
// Indexes for better query performance
candidateSchema.index({ name: 1 });
candidateSchema.index({ location: 1 });
candidateSchema.index({ user_id: 1 });
candidateSchema.index({ skills: 1 });
candidateSchema.index({ available_for_join: 1 });

const Candidate = mongoose.model('Candidate', candidateSchema);

export default Candidate;