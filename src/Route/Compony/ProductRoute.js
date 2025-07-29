import express from 'express';
import {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    updateInventory,
    updateStatus,
    getVendorProducts
} from '../../Controller/Compony/ProductManagemaent.js';
import { validateProduct } from '../../validator/product.validator.js';
import multer from 'multer';
import { protect, roleCheck } from '../../Middlewares/authMiddleware/auth.js';
const router = express.Router();
// utils/multer.js

const storage = multer.memoryStorage(); // ✅ stores buffer in memory

const upload = multer({ storage });



// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);
router.get('/vendor', protect, getVendorProducts);

// Protected routes (require authentication)
router.use(protect);



router.post(
    '/products',
    roleCheck('compony'),
    protect,
    upload.array("images", 10),
    createProduct
);

router.put('/:id', roleCheck('compony'), validateProduct, updateProduct);
router.patch('/:id/inventory', roleCheck('compony'), updateInventory);
router.patch('/:id/status', roleCheck('compony'), updateStatus);

// Admin routes
router.delete('/:id', roleCheck('compony'), deleteProduct);

export default router;