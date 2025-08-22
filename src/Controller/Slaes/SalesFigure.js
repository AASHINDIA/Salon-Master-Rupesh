import Record from "../../Modal/SalesFigure/Record.js";
 
import mongoose from "mongoose";


// Create new sales record
export const createRecord = async (req, res) => {
    try {
        const { userId, products = [], services = [], subtotal } = req.body;

        // ✅ Calculate productTotal
        const productTotal = products.reduce((sum, p) => sum + (p.price || 0), 0);

        // ✅ Calculate serviceTotal from subtotal
        const serviceTotal = subtotal - productTotal;

        const record = new Record({
            userId,
            products,
            services,
            productTotal,
            serviceTotal,
            subtotal
        });

        await record.save();

        res.status(201).json({
            success: true,
            message: "Record created successfully",
            record
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 📊 Get totals (daily, monthly, yearly)
export const getSalesFigures = async (req, res) => {
    try {
        const { period } = req.query;
        if (!period) {
            return res.status(400).json({ success: false, message: "Period is required" });
        }

        let startDate, endDate;
        const now = new Date();

        if (period === "daily") {
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
        } else if (period === "monthly") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === "yearly") {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else {
            return res.status(400).json({ success: false, message: "Invalid period" });
        }

        // ✅ Match for only that logged-in user
        const matchCondition = {
            userId: new mongoose.Types.ObjectId(req.user._id),
            createdAt: { $gte: startDate, $lte: endDate }
        };

        const totals = await Record.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: "$productTotal" },
                    totalServices: { $sum: "$serviceTotal" },
                    subtotal: { $sum: "$subtotal" }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            userId: req.user._id,
            period,
            totals: totals[0] || { totalProducts: 0, totalServices: 0, subtotal: 0 }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};