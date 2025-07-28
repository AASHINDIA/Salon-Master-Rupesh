
import { body } from 'express-validator';

export const validateCategory = [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required'),
  // Add more validation as needed
];