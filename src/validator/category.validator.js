
import { body } from 'express-validator';

export const validateCategory = [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required'),
  body('parent').optional().isMongoId().withMessage('Invalid parent category ID'),
  // Add more validation as needed
];