import { Schema, model } from 'mongoose';

const FranchiseeSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    image_academy: [{
        type: String,
        required: false
    }],
    title: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    social_media_url: {
        type: String,
        required: false
    },
    website_url: {
        type: String,
        required: false
    }
}, { timestamps: true });

export default model('Franchisee', FranchiseeSchema);