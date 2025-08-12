import express from 'express';
import {
    createItem,
    getItemsByRole,
    getUserItems,
    getItemById
} from '../../Controller/storeController/storeController.js';

const router = express.Router();

// Create a new item (Sale/Lease, Training, or Franchise)
router.post('/', createItem);

// Get items by role with pagination and search
// Example: /role/Sale%2FLease?page=1&limit=10&search=property
router.get('/role/:role', getItemsByRole);

// Get items for a specific user with optional role filter, pagination and search
// Example: /user/123abc?page=1&limit=5&role=Training&search=course
router.get('/user/:userId', getUserItems);

// Get a single item by ID and role
// Example: /item/456def/Sale%2FLease
router.get('/item/:id/:role', getItemById);

export default router;