import Record from "../../Modal/SalesFigure/Record.js";
 
import mongoose from "mongoose";

// Create new sales record
export const createRecord = async (req, res) => {
    try {
        const { userId, products = [], services = [] } = req.body;

        // ✅ Calculate productTotal
        const productTotal = products.reduce((sum, p) => sum + (p.price || 0), 0);

        // ✅ Calculate serviceTotal
        const serviceTotal = services.reduce((sum, s) => sum + (s.price || 0), 0);

        // ✅ Grand total
        const grandTotal = productTotal + serviceTotal;

        const record = new Record({
            userId,
            products,
            services,
            productTotal,
            serviceTotal,
            grandTotal
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
        const { period } = req.query; // daily | monthly | yearly

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

        // 🔎 Aggregate totals
        const totals = await Record.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: "$productTotal" },
                    totalServices: { $sum: "$serviceTotal" },
                    grandTotal: { $sum: "$grandTotal" }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            period,
            totals: totals[0] || { totalProducts: 0, totalServices: 0, grandTotal: 0 }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
