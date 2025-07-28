import { body } from 'express-validator';
import mongoose from 'mongoose';

export const validateProduct = [
  // Vendor Reference Validation
  body('UserId')
    .notEmpty().withMessage('Vendor ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Vendor ID format'),

  // Basic Info Validation
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 120 }).withMessage('Product name cannot exceed 120 characters'),

  body('slug')
    .trim()
    .notEmpty().withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),

  // Description Validation
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 250 }).withMessage('Short description cannot exceed 250 characters'),

  // Categorization Validation
  body('category')
    .notEmpty().withMessage('Category is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Category ID format'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Tag cannot exceed 30 characters'),

  // Pricing Validation
  body('originalPrice')
    .notEmpty().withMessage('Original price is required')
    .isFloat({ min: 0 }).withMessage('Original price must be a positive number')
    .customSanitizer(value => Math.round(value * 100) / 100), // Round to 2 decimal places

  body('discountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100 percent'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number')
    .customSanitizer(value => Math.round(value * 100) / 100), // Round to 2 decimal places

  // Inventory Management Validation
  body('trackQuantity')
    .optional()
    .isBoolean().withMessage('Track quantity must be a boolean value'),

  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity cannot be negative'),

  // Images Validation
  body('images')
    .optional()
    .isArray({ max: 10 }).withMessage('Cannot have more than 10 images'),

  body('images.*')
    .isString().withMessage('Image must be a URL string')
    .isURL().withMessage('Invalid image URL format'),

  // Status Validation
  body('status')
    .optional()
    .isIn(['draft', 'active', 'archived', 'out_of_stock'])
    .withMessage('Invalid product status'),

  // Ratings Validation
  body('rating.average')
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage('Average rating must be between 0 and 5'),

  body('rating.count')
    .optional()
    .isInt({ min: 0 }).withMessage('Rating count cannot be negative'),

  // Custom validation for price consistency
  body().custom((value, { req }) => {
    if (value.originalPrice && value.discountPercent) {
      const calculatedPrice = value.originalPrice * (1 - value.discountPercent / 100);
      const roundedCalculatedPrice = Math.round(calculatedPrice * 100) / 100;

      if (value.price && Math.round(value.price * 100) / 100 !== roundedCalculatedPrice) {
        throw new Error('Price does not match the calculated discounted price');
      }
    }
    return true;
  })
];