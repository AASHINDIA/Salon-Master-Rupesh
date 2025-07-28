import Product from '../../Modal/Compony/Products.js';
import Category from '../../Modal/Compony/Category.js';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';

/**
 * Create a new category
 */
export const createCategory = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const category = new Category(req.body);
        await category.save();

        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get all categories with pagination and search
 */
export const getCategories = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', isActive } = req.query;

        // Build query
        const query = {};

        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by active status if provided
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Sorting options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Pagination
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        // Get total count for pagination
        const total = await Category.countDocuments(query);

        // Execute query
        const categories = await Category.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNumber);

        res.json({
            success: true,
            data: categories,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                pages: Math.ceil(total / limitNumber)
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
 * Get a single category by ID or slug
 */
export const getCategory = async (req, res) => {
    try {
        let category;

        // Check if the identifier is a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            category = await Category.findById(req.params.id);
        } else {
            // Otherwise search by slug
            category = await Category.findOne({ slug: req.params.id });
        }

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Get product count for this category
        const productCount = await Product.countDocuments({
            category: category._id,
            status: 'active'
        });

        res.json({
            success: true,
            data: {
                ...category.toObject(),
                productCount
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
 * Update a category
 */
export const updateCategory = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete a category
 */
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category has products
        const hasProducts = await Product.exists({ category: category._id });
        if (hasProducts) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with associated products'
            });
        }

        await category.remove();

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get products by category
 */
export const getCategoryProducts = async (req, res) => {
    try {
        let category;

        // Find category by ID or slug
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            category = await Category.findById(req.params.id);
        } else {
            category = await Category.findOne({ slug: req.params.id });
        }

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Build product filters
        const filters = {
            category: category._id,
            status: 'active'
        };

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
            .populate('UserId', 'name');

        // Count total for pagination info
        const total = await Product.countDocuments(filters);

        res.json({
            success: true,
            data: products,
            category: {
                id: category._id,
                name: category.name,
                slug: category.slug
            },
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
 * Toggle category active status
 */
export const toggleCategoryStatus = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        category.isActive = !category.isActive;
        await category.save();

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};