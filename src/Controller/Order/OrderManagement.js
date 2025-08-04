import OrderRecived from "../../Modal/OrderMangement/OrderRecived.js";
import Product from "../../Modal/Compony/Products.js";
import mongoose from "mongoose";
import { Parser } from 'json2csv';
// Create an order
export const createOrder = async (req, res) => {
    try {
        const { product_id, user_id, quantity, shipping_address, payment_method } = req.body;

        if (!product_id || !user_id || !quantity || !shipping_address || !payment_method) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        // Validate product existence
        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        // Check if quantity is available
        if (product.trackQuantity && product.quantity < quantity) {
            return res.status(400).json({ message: "Not enough stock available." });
        }

        // Calculate total price (based on current price field)
        const total_price = product.price * quantity;

        // Reduce product quantity if tracking is enabled
        if (product.trackQuantity) {
            product.quantity -= quantity;
            await product.save();
        }

        // Create order
        const newOrder = new OrderRecived({
            product_id,
            user_id,
            quantity,
            total_price,
            shipping_address,
            payment_method,
        });

        await newOrder.save();

        res.status(201).json({
            message: "Order created successfully.",
            order: newOrder
        });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// Get all orders placed by a specific user
export const getOrdersByUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        const orders = await OrderRecived.find({ user_id })
            .sort({ order_date: -1 })
            .populate("product_id", "name price images")
            .populate("user_id", "name email");

        if (!orders.length) {
            return res.status(404).json({ message: "No orders found for this user." });
        }

        res.status(200).json({ orders });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
// Get all orders for a specific vendor
// This assumes vendor_id is the UserId of the vendor who owns the products
export const getOrdersForVendor = async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const {
            page = 1,
            limit = 10,
            from,
            to,
            search,
            sort = 'desc',
            download
        } = req.query;

        if (!mongoose.Types.ObjectId.isValid(vendor_id)) {
            return res.status(400).json({ message: "Invalid vendor ID." });
        }

        // Step 1: Find product IDs by vendor
        const vendorProducts = await Product.find({ UserId: vendor_id }).select('_id name');
        const productIds = vendorProducts.map(prod => prod._id);

        // Step 2: Build order query
        const query = { product_id: { $in: productIds } };

        // Date filter
        if (from || to) {
            query.order_date = {};
            if (from) query.order_date.$gte = new Date(from);
            if (to) query.order_date.$lte = new Date(to);
        }

        // Step 3: Search filter
        if (search) {
            const productsMatchingSearch = await Product.find({
                _id: { $in: productIds },
                name: { $regex: search, $options: "i" }
            }).select("_id");

            query.$or = [
                { product_id: { $in: productsMatchingSearch.map(p => p._id) } },
                {
                    // allow user_id populate then match email
                    // fallback to matching inside populated fields in-memory (done later)
                }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Step 4: Query orders
        let orders = await OrderRecived.find(query)
            .sort({ order_date: sort === 'asc' ? 1 : -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("product_id", "name price images")
            .populate("user_id", "name email");

        // Step 5: If search includes user email, filter in-memory
        if (search) {
            orders = orders.filter(order =>
                order.user_id?.email?.toLowerCase().includes(search.toLowerCase()) ||
                order.product_id?.name?.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Step 6: Download CSV if requested
        if (download === 'csv') {
            const csvFields = [
                { label: "Order ID", value: "_id" },
                { label: "Product Name", value: row => row.product_id?.name || '' },
                { label: "User Name", value: row => row.user_id?.name || '' },
                { label: "User Email", value: row => row.user_id?.email || '' },
                { label: "Quantity", value: "quantity" },
                { label: "Total Price", value: "total_price" },
                { label: "Shipping Address", value: "shipping_address" },
                { label: "Payment Method", value: "payment_method" },
                { label: "Order Date", value: row => new Date(row.order_date).toLocaleString() },
                { label: "Status", value: "status" }
            ];
            const json2csvParser = new Parser({ fields: csvFields });
            const csv = json2csvParser.parse(orders);

            res.header('Content-Type', 'text/csv');
            res.attachment('vendor-orders.csv');
            return res.send(csv);
        }

        // Step 7: Count total for pagination
        const totalOrders = await OrderRecived.countDocuments(query);

        res.status(200).json({
            total: totalOrders,
            page: parseInt(page),
            limit: parseInt(limit),
            orders
        });

    } catch (error) {
        console.error("Error fetching vendor orders:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// Get order details by order ID
export const getOrderDetails = async (req, res) => {
    try {
        const { order_id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            return res.status(400).json({ message: "Invalid order ID." });
        }

        const order = await OrderRecived.findById(order_id)
            .populate("product_id", "name price images")
            .populate("user_id", "name email");

        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

        res.status(200).json({ order });

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};