import mongoose from 'mongoose';

// Product Schema
const productSchema = new mongoose.Schema({
  // Vendor Reference
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vendor ID is required'],
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [120, 'Product name cannot exceed 120 characters']
  },

  slug: {
    type: String,
    required: [true, 'Slug is required'],
    
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },

  // Description
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  shortDescription: {
    type: String,
    maxlength: [250, 'Short description cannot exceed 250 characters']
  },

  // Categorization
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },

  tags: [{
    type: String,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],

  // Pricing
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Original price cannot be negative'],
    set: v => Math.round(v * 100) / 100
  },

  discountPercent: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100']
  },

  // This field stores final price after discount; for backward compatibility
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    set: v => Math.round(v * 100) / 100
  },

  // Inventory Management
  trackQuantity: {
    type: Boolean,
    default: true
  },

  quantity: {
    type: Number,
    default: 0,
    min: [0, 'Quantity cannot be negative']
  },

  // Images
  images: {
    type: [String],
    validate: [arr => arr.length <= 10, 'Cannot have more than 10 images']
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'out_of_stock'],
    default: 'draft'
  },

  // Ratings
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// Virtual to calculate discounted price
productSchema.virtual('discountedPrice').get(function () {
  const discount = this.discountPercent || 0;
  const discounted = this.originalPrice * (1 - discount / 100);
  return Math.round(discounted * 100) / 100;
});


// Pre-save middleware to auto-update `price` field based on discount
productSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  this.price = Math.round((this.originalPrice * (1 - this.discountPercent / 100)) * 100) / 100;
  next();
});

// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

// Export model
const Product = mongoose.model('Product', productSchema);
export default Product;
