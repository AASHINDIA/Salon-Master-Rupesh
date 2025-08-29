import CartReceived from "../../Modal/OrderMangement/Cart.js";
import Product from "../../Modal/Compony/Products.js";
import { Parser } from "json2csv";
import mongoose from "mongoose";
// ✅ Add to Cart (already explained before)
export const AddintoCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { Pid, quantity } = req.body;

        if (!Pid) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }

        const product = await Product.findById(Pid);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        let existingCartItem = await CartReceived.findOne({ user_id: userId, product_id: Pid });
        if (existingCartItem) {
            existingCartItem.quantity += quantity || 1;
            existingCartItem.price = existingCartItem.quantity * product.price; // ✅ Update total price
            await existingCartItem.save();
            return res.status(200).json({
                success: true,
                message: "Cart updated successfully",
                data: existingCartItem,
            });
        }

        const finalQuantity = quantity || 1;
        const cartItem = await CartReceived.create({
            user_id: userId,
            product_id: Pid,
            quantity: finalQuantity,
            price: finalQuantity * product.price, // ✅ Total price calculation
        });

        return res.status(201).json({
            success: true,
            message: "Product added to cart successfully",
            data: cartItem,
        });

    } catch (error) {
        console.error("Error adding to cart:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};


// ✅ Get Cart Items with Pagination, Search, and Date Filter
export const GetCartItems = async (req, res) => {
    try {
        const userId = req.user?.id;

        // Query params
        const {
            page = 1,
            limit = 10,
            search = "",
            from,
            to
        } = req.query;

        // Pagination values
        const skip = (page - 1) * limit;

        // Build query object
        let query = { user_id: userId };

        // Date filter
        if (from || to) {
            query.datetime = {};
            if (from) query.datetime.$gte = new Date(from);
            if (to) query.datetime.$lte = new Date(to);
        }

        // Search by product name
        if (search) {
            // First, get products that match the search
            const products = await Product.find({
                name: { $regex: search, $options: "i" }
            }).select("_id");

            const productIds = products.map(p => p._id);
            query.product_id = { $in: productIds };
        }

        // Fetch cart data with population
        const cartItems = await CartReceived.find(query)
            .populate("product_id", "name price image") // only selected fields
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ datetime: -1 });

        // Total count for pagination
        const total = await CartReceived.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Cart items fetched successfully",
            data: cartItems,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
            }
        });

    } catch (error) {
        console.error("Error fetching cart items:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};



// get catrt how manay useradd there  product in the   card   and  which product like  order


export const getCartDatatovendore = async (req, res) => {
    const userId = req.user.id; // logged-in user id
    const { page = 1, limit = 10, from, to, exportCSV } = req.query;

    try {
        // ✅ Step 0: Check user role from DB
        const user = await User.findById(userId).select("domain_type").lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let productQuery = {};
        if (user.domain_type !== "superadmin") {
            // normal vendor → fetch only his products
            productQuery.UserId = userId;
        }

        // ✅ Step 1: Fetch product IDs (vendor or all products if superadmin)
        const productIds = await Product.find(productQuery).select("_id").lean();

        if (!productIds.length) {
            return res.status(404).json({ success: false, message: "No products found" });
        }

        const productIdList = productIds.map(p => p._id);

        // ✅ Step 2: Build cart query
        let query = { product_id: { $in: productIdList } };

        // Date filter
        if (from || to) {
            query.datetime = {};
            if (from) query.datetime.$gte = new Date(from);
            if (to) query.datetime.$lte = new Date(to);
        }

        // ✅ Step 3: Fetch cart items
        let cartQuery = CartReceived.find(query)
            .populate("user_id", "name email")
            .populate("product_id", "name price UserId")
            .lean();

        if (!exportCSV) {
            cartQuery = cartQuery.skip((page - 1) * limit).limit(Number(limit));
        }

        const [cartItems, totalItems] = await Promise.all([
            cartQuery,
            exportCSV ? 0 : CartReceived.countDocuments(query)
        ]);

        if (!cartItems.length) {
            return res.status(404).json({ success: false, message: "No cart items found" });
        }

        // ✅ Step 4: Transform response
        const cartData = cartItems.map(item => ({
            userName: item.user_id?.name,
            userEmail: item.user_id?.email,
            productName: item.product_id?.name,
            productPrice: item.product_id?.price,
            quantity: item.quantity,
            totalPrice: item.product_id?.price * item.quantity,
            addedAt: item.datetime,
            status: item.status,
            vendorId: item.product_id?.UserId, // helpful for superadmin view
        }));

        // ✅ Step 5: CSV Export
        if (exportCSV === "true") {
            const fields = [
                "userName",
                "userEmail",
                "productName",
                "productPrice",
                "quantity",
                "totalPrice",
                "addedAt",
                "status",
                "vendorId"
            ];
            const json2csv = new Parser({ fields });
            const csv = json2csv.parse(cartData);

            res.header("Content-Type", "text/csv");
            res.attachment("cart_data.csv");
            return res.send(csv);
        }

        // ✅ Normal JSON response
        return res.status(200).json({
            success: true,
            message: "Cart data fetched successfully",
            data: cartData,
            pagination: exportCSV
                ? null
                : {
                      totalItems,
                      currentPage: Number(page),
                      totalPages: Math.ceil(totalItems / limit),
                      pageSize: Number(limit),
                  },
        });

    } catch (error) {
        console.error("Error fetching vendor cart items:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};