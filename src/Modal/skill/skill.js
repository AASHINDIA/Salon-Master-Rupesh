import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
    skill_name: {
        type: String,
        required: true,
        trim: true
    },
    
}, {
    timestamps: true
});

// Model name should be capitalized and singular
const Skill = mongoose.model('Skill', skillSchema);

export default Skill;
