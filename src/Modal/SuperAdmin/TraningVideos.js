import mongoose from 'mongoose';

const { Schema } = mongoose;

// TrendingVideo Schema (fixed spelling from "Tranging" to "Trending")
const TrendingVideoSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Video title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Video description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    link: {
        type: String,
        required: [true, 'Video link is required'],
      
    },
    duration: {
        type: Number, // in seconds
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 second']
    },
    categories: {
        type: [String],
        default: ['general'],
        validate: {
            validator: function(v) {
                return v.length <= 5; // Maximum 5 categories per video
            },
            message: 'Cannot have more than 5 categories'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Removed duplicate createdAt and updatedAt since we're using timestamps
}, {
    timestamps: true, // Auto-manage createdAt and updatedAt
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Add a virtual property for formatted duration (e.g., "5:30")
TrendingVideoSchema.virtual('formattedDuration').get(function() {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
});

// Indexes for better query performance
TrendingVideoSchema.index({ title: 'text', description: 'text' });
TrendingVideoSchema.index({ duration: 1 });
TrendingVideoSchema.index({ categories: 1 });
TrendingVideoSchema.index({ isActive: 1 });

// Middleware to update the updatedAt field before saving
TrendingVideoSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Add a query helper for active videos
TrendingVideoSchema.query.active = function() {
    return this.where({ isActive: true });
};

const TrendingVideo = mongoose.model('TrendingVideo', TrendingVideoSchema);

export default TrendingVideo;