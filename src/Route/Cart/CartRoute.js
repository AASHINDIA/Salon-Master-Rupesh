import exprees from 'express';
import { removeItemFromCart, removeAllFromCart, AddintoCart, GetCartItems, getCartDatatovendore } from '../../Controller/CartController/CartController.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js';
const router = exprees.Router();

router.post('/createcart', protect, AddintoCart);
router.get('/getCart', protect, GetCartItems);

router.get('/getcartDatatovendore', protect, getCartDatatovendore);


// Remove all items from cart for a user
router.delete("/user/:user_id/clear", removeAllFromCart);

// Remove specific item from cart
router.delete("/user/:user_id/product/:product_id", removeItemFromCart);
export default router;