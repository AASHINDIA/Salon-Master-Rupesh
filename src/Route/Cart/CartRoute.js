import exprees from 'express';
import { AddintoCart, GetCartItems } from '../../Controller/CartController/CartController.js';
const router = exprees.Router();

router.post('/createcart', AddintoCart);
router.post('/getCart', GetCartItems);


export default router;