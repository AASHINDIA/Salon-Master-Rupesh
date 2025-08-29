import exprees from 'express';
import { AddintoCart, GetCartItems, getCartDatatovendore } from '../../Controller/CartController/CartController.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
const router = exprees.Router();

router.post('/createcart', protect, AddintoCart);
router.get('/getCart', protect, GetCartItems);

router.get('/getcartDatatovendore', protect, getCartDatatovendore);


export default router;