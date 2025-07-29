import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    unique_name: {
        type: String,

    },
    company_name: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        trim: true
    },
    gst_number: {
        type: String,
        trim: true
    },
    pan_number: {
        type: String,
        trim: true
    },
    cin: {
        type: String,
        trim: true
    },
    image: {
        type: String, // Stores the path/URL of the image
    },
    social_media_links: {
        type: Map, // Flexible key-value pairs for social media links
        of: String,
        default: {}
    },
    product_shop_options: {
        type: Array, // Array of product shop options
        default: []
    },
    products: {
        type: Array, // Array of products
        default: []
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Indexes for better query performance
companySchema.index({ company_name: 1 });
companySchema.index({ brand: 1 });
companySchema.index({ gst_number: 1 });
companySchema.index({ pan_number: 1 });

const Company = mongoose.model('Company', companySchema);

export default Company;