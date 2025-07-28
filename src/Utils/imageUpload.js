// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file to Cloudinary
 * @param {string} filePath - Local path of the file to upload
 * @param {string} [folder='uploads'] - Folder in Cloudinary to store the file
 * @param {string[]} [allowedFormats=['jpg', 'jpeg', 'png', 'gif']] - Allowed file formats
 * @returns {Promise<{url: string, public_id: string}>} - Cloudinary response with secure URL and public ID
 * @throws {Error} - If upload fails
 */

export const uploadToCloudinary = async (
  filePath,
  folder = 'uploads',
  allowedFormats = ['jpg', 'jpeg', 'png', 'gif']
) => {
  try {
    if (!filePath) {
      throw new Error('File path is required');
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      allowed_formats: allowedFormats,
      resource_type: 'auto', // Automatically detect the resource type
    });

    // Clean up: delete the temporary file
    await fs.unlink(filePath);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id,
      format: result.format,
    };
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (filePath && (await fs.access(filePath).then(() => true).catch(() => false))) {
        await fs.unlink(filePath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }

    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
  }
};

/**
 * Deletes a file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @param {object} [options={}] - Additional options for deletion
 * @param {string} [options.resource_type='image'] - Resource type ('image', 'video', 'raw')
 * @returns {Promise<{result: string}>} - Cloudinary deletion result
 * @throws {Error} - If deletion fails
 */

export const deleteFromCloudinary = async (
  publicId,
  options = { resource_type: 'image' }
) => {
  try {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    const result = await cloudinary.uploader.destroy(publicId, options);

    if (result.result !== 'ok') {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }

    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
  }
};

/**
 * Extracts public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */

export const getPublicIdFromUrl = (url) => {
  if (!url) return null;

  const matches = url.match(/upload\/(?:v\d+\/)?([^/]+)/);
  return matches ? matches[1].split('.')[0] : null;
};