import mongoose from 'mongoose';

const EmpSchema = new mongoose.Schema({
    user_id: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        contact_no: {
            type: String,
            required: true,
            trim: true
        }
    },
    is_Preuime: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,

        trim: true
    },
    date_of_birth: {
        type: Date,
    },


    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: null
    },
    skills: {
        type: [String], // 🔹 skills are plain strings
        default: []
    },

    available_for_join: {
        type: Boolean,
        default: true
    },

    joining_date: {
        type: Date,

    },
    expected_salary: {
        min: { type: Number, default: 15000 },
        max: { type: Number, default: 20000 }
    },
    available_for_join: {
        type: Boolean,
        default: true
    },
    looking_job_location: {
        type: String,
        default: 'india'
    },
    preferred_locations: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true
});

// 🔹 Virtual for age calculation
EmpSchema.virtual('age').get(function () {
    if (!this.date_of_birth) return null;
    const diff = Date.now() - this.date_of_birth.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

// 🔹 Indexes
EmpSchema.index({ name: 1 });
EmpSchema.index({ 'user_id.name': 1 });
EmpSchema.index({ skills: 1 });
EmpSchema.index({ available_for_join: 1 });

const Emp = mongoose.model('Emp', EmpSchema);

export default Emp;
