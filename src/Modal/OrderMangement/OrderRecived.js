import mongoose from "mongoose";
const OrderRecivedSchema = new mongoose.Schema({
product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
},
user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
},

quantity: {
    type: Number,
    required: true,
    min: 1
},
order_date: {
    type: Date,
    default: Date.now
},
status: {
    type: String,
    enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
    default: "Pending"
},
total_price: {
    type: Number,
    required: true
},
shipping_address: {
    type: String,
    required: true
},
payment_method: {
    type: String,
    enum: ["Credit Card", "Debit Card", "PayPal", "Cash on Delivery"],
    default: "Credit Card"
},

});
const OrderRecived = mongoose.model("OrderRecived", OrderRecivedSchema);
export default OrderRecived;