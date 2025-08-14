import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Link to the user who owns the cart
        required: true,
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    price: {
        type: Number,
        required: true, // Store price at the time of adding to cart
    },
    datetime: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["active", "ordered", "removed"],
        default: "active",
    },
});

// Optional: index for faster queries
cartSchema.index({ user_id: 1, product_id: 1 });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
