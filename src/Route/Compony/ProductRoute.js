import express from 'express';


import {
    createProduct,
    uploadProductImages,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    updateInventory,
    updateStatus,
    getVendorProducts
} from '../../Controller/Compony/ProductManagemaent.js';
import { validateProduct } from '../../validator/product.validator.js';
import { protect, roleCheck } from '../../Middlewares/authMiddleware/auth.js';
const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);
router.get('/vendor/:vendorId', getVendorProducts); // Optional vendorId

// Protected routes (require authentication)
router.use(protect);

// Vendor-specific routes
router.post('/',);

router.post(
    '/products',
    roleCheck('compony'),
    validateProduct,
    protect,
    uploadProductImages,
    createProduct
);

router.put('/:id', roleCheck('compony'), validateProduct, updateProduct);
router.patch('/:id/inventory', roleCheck('compony'), updateInventory);
router.patch('/:id/status', roleCheck('compony'), updateStatus);

// Admin routes
router.delete('/:id', roleCheck('compony'), deleteProduct);

export default router;