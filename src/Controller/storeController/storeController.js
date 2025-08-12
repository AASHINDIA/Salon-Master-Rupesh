import { SaleLease, Franchise, Training } from "../../Modal/storeController/storeModal.js";

// Helper function to get the correct model based on role
const getModelByRole = (role) => {
    switch (role) {
        case "Sale/Lease":
            return SaleLease;
        case "Training":
            return Training;
        case "Franchise":
            return Franchise;
        default:
            throw new Error("Invalid role specified");
    }
};

// Create a new item
export const createItem = async (req, res) => {
    try {
        const { role } = req.body;
        const Model = getModelByRole(role);

        const newItem = new Model(req.body);
        const savedItem = await newItem.save();

        res.status(201).json(savedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all items by role with pagination and search

export const getItemsByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const { page = 1, limit = 10, search = "" } = req.query;

        const Model = getModelByRole(role);

        const query = {};

        // Add search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { desc: { $regex: search, $options: "i" } }
            ];
        }

        const items = await Model.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Model.countDocuments(query);

        res.json({
            items,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalItems: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get items for a particular user with pagination and search
export const getUserItems = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, search = "", role } = req.query;

        let query = { userId };

        // Filter by role if provided
        if (role) {
            query.role = role;
        }

        // Add search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { desc: { $regex: search, $options: "i" } }
            ];
        }

        // Determine which model(s) to query
        let modelsToQuery = [SaleLease, Training, Franchise];
        if (role) {
            modelsToQuery = [getModelByRole(role)];
        }

        // Query all relevant models
        const results = await Promise.all(
            modelsToQuery.map(model =>
                model.find(query)
                    .sort({ createdAt: -1 })
                    .limit(limit * 1)
                    .skip((page - 1) * limit)
                    .exec()
            )
        );

        // Combine results from all models
        const items = results.flat();

        // Get total count
        const counts = await Promise.all(
            modelsToQuery.map(model => model.countDocuments(query))
        );
        const count = counts.reduce((sum, val) => sum + val, 0);

        res.json({
            items,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalItems: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single item by ID
export const getItemById = async (req, res) => {
    try {
        const { id, role } = req.params;
        const Model = getModelByRole(role);

        const item = await Model.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};