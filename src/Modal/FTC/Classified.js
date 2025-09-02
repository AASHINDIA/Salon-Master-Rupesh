import { Schema, model } from 'mongoose';

const ClassifiedSchema = new Schema({
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
    type_of_classified: {
        type: String,
        enum: ['for_sale', 'for_lease', 'salnon_opening'],
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

export default model('Classified', ClassifiedSchema);