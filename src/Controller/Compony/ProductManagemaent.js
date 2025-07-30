
import Category from '../../Modal/Compony/Category.js';
import Product from '../../Modal/Compony/Products.js';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { uploadToCloudinary } from '../../Utils/imageUpload.js'
import fs from 'fs'; // For unlinkSync or existsSync
import fsp from 'fs/promises'; // If you want async/await
import { sendNotification } from '../../Utils/sendNotification.js';
import User from '../../Modal/Users/User.js';
// Helper function to build product query filters
const buildProductFilters = (query) => {
  const filters = {};
  const {
    category,
    status,
    minPrice,
    maxPrice,
    search,
    vendor,
    inStock
  } = query;

  if (category) filters.category = category;
  if (status) filters.status = status;
  if (vendor) filters.UserId = vendor;

  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice) filters.price.$gte = parseFloat(minPrice);
    if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
  }

  if (inStock === 'true') {
    filters.$or = [
      { trackQuantity: false },
      { trackQuantity: true, quantity: { $gt: 0 } }
    ];
  }

  if (search) {
    filters.$text = { $search: search };
  }

  return filters;
};




/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private (Vendor/Admin)
 */

export const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const {
    name,
    slug,
    description,
    shortDescription = '',
    originalPrice,
    discountPercent = 0,
    category,
    tags = [],
    trackQuantity = true,
    quantity = 0,
    status = 'draft'
  } = req.body;

  try {
    // Validate required fields
    const requiredFields = { name, slug, description, originalPrice, category };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => value === undefined || value === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }

    // Validate originalPrice
    if (isNaN(originalPrice) || originalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Original price must be a positive number'
      });
    }

    // Validate discountPercent
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Discount percent must be between 0 and 100'
      });
    }

    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    // Validate slug format (lowercase, numbers, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    const cleanSlug = slug.trim().toLowerCase();
    if (!slugRegex.test(cleanSlug)) {
      return res.status(400).json({
        success: false,
        message: 'Slug can only contain lowercase letters, numbers, and hyphens'
      });
    }

    // Check for existing product with same slug
    const existing = await Product.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Product with this slug already exists'
      });
    }

    // Validate images
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required'
      });
    }

    // Upload images to cloudinary
    const imageUrls = [];
    const uploadErrors = [];

    for (const file of req.files) {
      if (!file.buffer) {
        uploadErrors.push(`Missing buffer for ${file.originalname}`);
        continue;
      }

      try {
        const result = await uploadToCloudinary(file.buffer, 'products');
        imageUrls.push(result.secure_url);
      } catch (err) {
        uploadErrors.push(`Failed to upload ${file.originalname}`);
        console.error(`Upload error for ${file.originalname}:`, err);
      }
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid images uploaded',
        errors: uploadErrors
      });
    }

    // Process tags
    let parsedTags = [];
    try {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      if (!Array.isArray(parsedTags)) parsedTags = [];
    } catch (e) {
      parsedTags = [];
    }

    const validTags = parsedTags
      .filter(tag => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 30)
      .map(tag => tag.trim())
      .slice(0, 10);

    // Create product
    const product = new Product({
      UserId: req.user._id,
      name: name.trim(),
      slug: cleanSlug, // Use the cleaned slug
      description: description.trim(),
      shortDescription: shortDescription.trim(),
      originalPrice: parseFloat(originalPrice), // Ensure this is set
      price: parseFloat(originalPrice), // Initial price before discount applied
      discountPercent: parseFloat(discountPercent),
      category: new mongoose.Types.ObjectId(category),
      tags: validTags,
      trackQuantity,
      quantity: trackQuantity ? Math.max(0, parseInt(quantity)) : 0,
      images: imageUrls,
      status: ['draft', 'active', 'archived', 'out_of_stock'].includes(status) ? status : 'draft'
    });

    await product.save();
    const users = await User.find({ devicetoken: { $exists: true, $ne: '' } }).select('devicetoken');
    const tokens = users.map(user => user.devicetoken).filter(Boolean);

    await sendNotification(tokens, {
      title: '🛍️ New Product Launched!',
      body: `${product.name} is now available at ₹${product.price}`
    }, {
      productId: product._id.toString(),
      slug: product.slug
    });
    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        id: product._id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        originalPrice: product.originalPrice,
        discountPercent: product.discountPercent,
        images: product.images,
        description: product.description,
        shortDescription: product.shortDescription,
        category: product.category,
        tags: product.tags,
        quantity: product.quantity,
        trackQuantity: product.trackQuantity,
        status: product.status,
        rating: product.rating,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      },
      warnings: uploadErrors.length ? uploadErrors : undefined
    });

  } catch (error) {
    console.error('Error creating product:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Schema validation failed',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `Duplicate entry for ${field}`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};




/**
 * Get all products with filtering, sorting, and pagination
 */
export const getProducts = async (req, res) => {
  try {
    // Build filters
    const filters = buildProductFilters(req.query);

    // Sorting
    const sortBy = req.query.sortBy || '-createdAt';
    const sortOrder = {};
    sortOrder[sortBy.replace('-', '')] = sortBy.startsWith('-') ? -1 : 1;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Query products with population
    const products = await Product.find(filters)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug')
      .populate('UserId', 'name email');

    // Count total for pagination info
    const total = await Product.countDocuments(filters);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a single product by ID or slug
 */
export const getProduct = async (req, res) => {
  try {
    let product;

    // Check if the identifier is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      product = await Product.findById(req.params.id)
        .populate('category', 'name slug')
        .populate('UserId', 'name email');
    } else {
      // Otherwise search by slug
      product = await Product.findOne({ slug: req.params.id })
        .populate('category', 'name slug')
        .populate('UserId', 'name email');
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update a product
 */
export const updateProduct = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the current user is the product owner
    if (product.UserId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Handle price updates
    if (req.body.originalPrice || req.body.discountPercent) {
      const originalPrice = req.body.originalPrice || product.originalPrice;
      const discountPercent = req.body.discountPercent || product.discountPercent;
      req.body.price = originalPrice * (1 - discountPercent / 100);
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the current user is the product owner or admin
    if (product.UserId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    // Soft delete by changing status
    product.status = 'archived';
    await product.save();

    res.json({
      success: true,
      message: 'Product archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update product inventory
 */
export const updateInventory = async (req, res) => {
  try {
    const { quantity, action } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the current user is the product owner or admin
    if (product.UserId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Handle different inventory actions
    switch (action) {
      case 'increment':
        product.quantity += parseInt(quantity);
        break;
      case 'decrement':
        product.quantity = Math.max(0, product.quantity - parseInt(quantity));
        break;
      case 'set':
        product.quantity = parseInt(quantity);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid inventory action'
        });
    }

    // Update status if quantity reaches zero
    if (product.trackQuantity && product.quantity === 0) {
      product.status = 'out_of_stock';
    } else if (product.status === 'out_of_stock' && product.quantity > 0) {
      product.status = 'active';
    }

    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update product status
 */
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the current user is the product owner or admin
    if (product.UserId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    product.status = status;
    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get products by vendor
 */
export const getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user.id; // Get vendor ID from authenticated user
      console.log("vendorId",vendorId)
    // Build filters including the vendor ID
    const filters = {
      UserId: vendorId, // Ensure this matches your schema field name
      ...buildProductFilters(req.query)
    };

    // Sorting
    const sortBy = req.query.sortBy || '-createdAt';
    const sortOrder = {};
    const sortField = sortBy.replace(/^-/, ''); // Remove leading '-' if present
    sortOrder[sortField] = sortBy.startsWith('-') ? -1 : 1;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Query products with proper filtering for the vendor
    const products = await Product.find(filters)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug');

    // Count total products for this vendor
    const total = await Product.countDocuments(filters);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};