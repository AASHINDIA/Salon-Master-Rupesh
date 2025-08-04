import { createOrder, getOrdersByUser, getOrdersForVendor } from "../../Controller/Order/OrderManagement.js";
import express from "express";
const router = express.Router();
// Route to create an order
router.post("/create-order", createOrder);
// Route to get orders by user
router.get("/user-orders/:user_id", getOrdersByUser);
// Route to get orders for vendor
router.get("/vendor-orders/:vendor_id", getOrdersForVendor);

// Export the router
export default router;