import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
    skill_name: {
        type: String,
        required: true,
        trim: true
    },
    skill_description: {
        type: String,
        required: true,
        maxlength: 500
    },
    skill_level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    skill_category: {
        type: String,
        enum: ['Hair', 'Beauty', 'Nail', 'Spa', 'Management', 'Reception'],
        required: true
    }
}, {
    timestamps: true
});

// Model name should be capitalized and singular
const Skill = mongoose.model('Skill', skillSchema);

export default Skill;
