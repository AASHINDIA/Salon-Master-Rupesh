
import Category from '../../Modal/Compony/Category.js';
import Product from '../../Modal/Compony/Products.js';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';

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
 * Create a new product
 */
export const createProduct = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { originalPrice, discountPercent } = req.body;
    
    // Calculate final price
    const price = originalPrice * (1 - (discountPercent || 0) / 100);
    
    // Create product
    const product = new Product({
      ...req.body,
      UserId: req.user.id, // Assuming vendor ID comes from auth middleware
      price: Math.round(price * 100) / 100
    });

    await product.save();

    res.status(201).json({
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
    const vendorId = req.params.vendorId || req.user.id;
    
    // Build filters
    const filters = { UserId: vendorId, ...buildProductFilters(req.query) };
    
    // Sorting
    const sortBy = req.query.sortBy || '-createdAt';
    const sortOrder = {};
    sortOrder[sortBy.replace('-', '')] = sortBy.startsWith('-') ? -1 : 1;
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Query products
    const products = await Product.find(filters)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug');
    
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