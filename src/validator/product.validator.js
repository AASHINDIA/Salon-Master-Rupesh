import { body, param } from 'express-validator';

export const validateProduct = [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').isMongoId().withMessage('Invalid category ID'),
  body('originalPrice').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPercent').optional().isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),
  // Add more validation as needed
];