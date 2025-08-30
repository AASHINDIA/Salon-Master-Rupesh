// import Cart from "../../Modal/OrderMangement/Cart.js";
import Product from "../../Modal/Compony/Products.js";
import { Parser } from "json2csv";
import mongoose from "mongoose";
import User from "../../Modal/Users/User.js";
import Cart from "../../Modal/OrderMangement/Cart.js";
// import Company from "../../Modal/Compony/Company.js";
// ✅ Add to Cart (already explained before)
import Company from '../../Modal/Compony/ComponyModal.js'

export const AddintoCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { Pid, quantity, action } = req.body;
        // ✅ action: "increase" | "decrease" | "set"

        if (!Pid) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }

        const product = await Product.findById(Pid);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        let existingCartItem = await Cart.findOne({ user_id: userId, product_id: Pid });

        if (existingCartItem) {
            // ✅ Handle actions
            if (action === "increase") {
                existingCartItem.quantity += quantity || 1;
            } else if (action === "decrease") {
                existingCartItem.quantity -= quantity || 1;
                if (existingCartItem.quantity <= 0) {
                    await existingCartItem.deleteOne();
                    return res.status(200).json({
                        success: true,
                        message: "Product removed from cart",
                    });
                }
            } else if (action === "set") {
                existingCartItem.quantity = quantity || 1;
            } else {
                return res.status(400).json({ success: false, message: "Invalid action type" });
            }

            existingCartItem.price = existingCartItem.quantity * product.price; // ✅ update price
            await existingCartItem.save();

            return res.status(200).json({
                success: true,
                message: "Cart updated successfully",
                data: existingCartItem,
            });
        }

        // ✅ If item not in cart and action is decrease, ignore
        if (action === "decrease") {
            return res.status(400).json({ success: false, message: "Product not in cart to decrease" });
        }

        // ✅ Create new cart item
        const finalQuantity = quantity || 1;
        const cartItem = await Cart.create({
            user_id: userId,
            product_id: Pid,
            quantity: finalQuantity,
            price: finalQuantity * product.price,
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
        const cartItems = await Cart.find(query)
            .populate("product_id", "name price image") // only selected fields
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ datetime: -1 });

        // Total count for pagination
        const total = await Cart.countDocuments(query);

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



// Remove all items from cart for a specific user
export const removeAllFromCart = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Validate user_id
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        // Remove all cart items for this user
        const result = await Cart.deleteMany({
            user_id: user_id,
            status: "active"
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No active cart items found for this user"
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully removed all items from cart`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error("Error removing all items from cart:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};



export const removeItemFromCart = async (req, res) => {
    try {
        const { user_id, product_id } = req.params;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(user_id) ||
            !mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID or product ID format"
            });
        }

        // Remove the specific cart item
        const result = await Cart.findOneAndDelete({
            user_id: user_id,
            product_id: product_id,
            status: "active"
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found or already removed"
            });
        }

        res.status(200).json({
            success: true,
            message: "Item removed from cart successfully",
            removedItem: {
                product_id: result.product_id,
                quantity: result.quantity,
                price: result.price
            }
        });

    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
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
        let cartQuery = Cart.find(query)
            .populate("user_id", "name email")
            .populate("product_id", "name price UserId")
            .lean();

        if (!exportCSV) {
            cartQuery = cartQuery.skip((page - 1) * limit).limit(Number(limit));
        }

        const [cartItems, totalItems] = await Promise.all([
            cartQuery,
            exportCSV ? 0 : Cart.countDocuments(query)
        ]);

        if (!cartItems.length) {
            return res.status(404).json({ success: false, message: "No cart items found" });
        }

        // ✅ Step 4: Transform response
        // In your backend code (getCartDatatovendore function)
        // ✅ Step 4: Transform response
        const cartData = await Promise.all(cartItems.map(async (item) => {
            // Fetch vendor details
            let vendorName = "Unknown";
            if (item.product_id?.UserId) {
                const vendor = await Company.findOne({ user_id: item.product_id.UserId }).select("company_name unique_name").lean();
                vendorName = vendor?.unique_name || "Unknown";
            }

            return {
                userName: item.user_id?.name,
                userEmail: item.user_id?.email,
                productName: item.product_id?.name,
                productPrice: item.product_id?.price,
                quantity: item.quantity,
                totalPrice: item.product_id?.price * item.quantity,
                addedAt: item.datetime,
                status: item.status,
                vendorId: item.product_id?.UserId,
                vendorName: vendorName // Add vendor name
            };
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
                "vendorId",
                "VendorName"
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



