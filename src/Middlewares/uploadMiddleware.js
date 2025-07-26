import { upload } from '../Utils/imageUpload.js';

// Middleware for single image upload
export const uploadSingleImage = (fieldName) => {
  return upload.single(fieldName);
};

// Middleware for multiple image uploads
export const uploadMultipleImages = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Middleware for specific fields with multiple files
export const uploadSpecificImages = (fields) => {
  return upload.fields(fields);
};