import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [50, 'Category name cannot exceed 50 characters'],
        
    },
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        lowercase: true,
        match: [/^[a-z0-9-]+$/, 'Slug can only contain letters, numbers and hyphens']
    },

  

    // Display
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
   

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
categorySchema.index({ name: 'text', description: 'text' });
categorySchema.index({ isActive: 1 });

// Middleware to update timestamps
categorySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Category = mongoose.model('Category', categorySchema);

export default Category;