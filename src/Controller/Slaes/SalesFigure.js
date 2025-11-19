import Record from "../../Modal/SalesFigure/Record.js";
import ExcelJS from "exceljs";
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



export const getRecords = async (req, res) => {
    try {
        const {
            date,
            from,
            to,
            search,
            page = 1,
            limit = 10
        } = req.query;

        let filter = {};

        // 📅 Single date filter
        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: start, $lte: end };
        }

        // 📅 From–To filter
        if (from && to) {
            const start = new Date(from);
            const end = new Date(to);
            end.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: start, $lte: end };
        }

        // 🔍 Search filter (username / product / service)
        if (search) {
            filter.$or = [
                { "products.name": { $regex: search, $options: "i" } },
                { "services.name": { $regex: search, $options: "i" } }
            ];
        }

        const skip = (page - 1) * limit;

        // 📂 Fetch data
        const records = await Record.find(filter)
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Record.countDocuments(filter);

        return res.status(200).json({
            success: true,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            records
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};



export const exportRecordExcel = async (req, res) => {
    try {
        const records = await Record.find().populate("userId");

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Records");

        sheet.columns = [
            { header: "User", key: "user", width: 25 },
            { header: "Products", key: "products", width: 30 },
            { header: "Services", key: "services", width: 30 },
            { header: "Product Total", key: "productTotal", width: 15 },
            { header: "Service Total", key: "serviceTotal", width: 15 },
            { header: "Subtotal", key: "subtotal", width: 15 },
            { header: "Created At", key: "createdAt", width: 25 }
        ];

        records.forEach(r => {
            sheet.addRow({
                user: r.userId?.name,
                products: r.products?.map(p => p.name).join(", "),
                services: r.services?.map(s => s.name).join(", "),
                productTotal: r.productTotal,
                serviceTotal: r.serviceTotal,
                subtotal: r.subtotal,
                createdAt: r.createdAt
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats");
        res.setHeader("Content-Disposition", "attachment; filename=records.xlsx");

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { products, services } = req.body;

        // 👉 Check if record exists
        const existingRecord = await Record.findById(id);
        if (!existingRecord) {
            return res.status(404).json({
                success: false,
                message: "Record not found",
            });
        }

        // 👉 Preserve old data if new not provided
        const updatedProducts = products ?? existingRecord.products;
        const updatedServices = services ?? existingRecord.services;

        // 👉 Recalculate totals
        const productTotal = updatedProducts.reduce(
            (sum, item) => sum + (item?.price || 0),
            0
        );

        const serviceTotal = updatedServices.reduce(
            (sum, item) => sum + (item?.price || 0),
            0
        );

        const subtotal = productTotal + serviceTotal;

        // 👉 Updated object
        const updateData = {
            products: updatedProducts,
            services: updatedServices,
            productTotal,
            serviceTotal,
            subtotal,
            updatedAt: new Date(), // Add update timestamp
        };

        // 👉 Save updated record
        const updatedRecord = await Record.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            success: true,
            message: "Record updated successfully",
            record: updatedRecord,
        });

    } catch (err) {
        console.error("Error updating record:", err);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message,
        });
    }
};
