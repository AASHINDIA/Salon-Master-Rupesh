import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
    skill_id: {
        type: String,
        unique: true,
        default: () => generateSkillId()
    },
    skill_name: {
        type: String,
        required: true,
        trim: true
    },
}, {
    timestamps: true
});

// Function to generate SKILL-ID
const generateSkillId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let id = 'SKILL-';

    // Add 3 characters (mix of letters and numbers)
    for (let i = 0; i < 3; i++) {
        const pool = Math.random() < 0.5 ? letters : numbers;
        id += pool.charAt(Math.floor(Math.random() * pool.length));
    }

    return id;
};

const Skill = mongoose.model('Skill', skillSchema);

export default Skill;