import express from 'express';

import {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory,
    getCategoryProducts,
    toggleCategoryStatus
} from '../../Controller/Compony/CategoryManagemant.js';
import { validateCategory } from '../../validator/category.validator.js';
import { protect, roleCheck } from '../../Middlewares/authMiddleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategory);
router.get('/:id/products', getCategoryProducts);

// Protected routes (admin only)
router.use(protect);
router.use(roleCheck('company','superadmin'));

router.post('/', validateCategory, createCategory);
router.put('/:id', validateCategory, updateCategory);
router.delete('/:id', deleteCategory);
router.patch('/:id/status', toggleCategoryStatus);

export default router;