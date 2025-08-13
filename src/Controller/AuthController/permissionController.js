// controllers/permissionController.js
import User from "../../Modal/Users/User.js";
import Permission from "../../Modal/Users/Permission.js";

// ✅ Assign permissions to a user
export const assignPermissions = async (req, res) => {
    try {
        const { userId, permissions } = req.body; // permissions can be names or IDs

        if (!userId || !permissions || !Array.isArray(permissions) || permissions.length === 0) {
            return res.status(400).json({ success: false, message: "User ID and permissions are required" });
        }

        // Check target user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Convert permission names to IDs if needed
        let permissionDocs;
        if (typeof permissions[0] === "string" && permissions[0].match(/^[0-9a-fA-F]{24}$/)) {
            // Looks like ObjectId
            permissionDocs = await Permission.find({ _id: { $in: permissions } });
        } else {
            // Assume permission names
            permissionDocs = await Permission.find({ name: { $in: permissions } });
        }

        if (permissionDocs.length !== permissions.length) {
            return res.status(400).json({ success: false, message: "One or more permissions are invalid" });
        }

        // Assign permission IDs
        user.permissions = permissionDocs.map(p => p._id);
        await user.save();

        res.json({ success: true, message: "Permissions assigned successfully", user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Get permissions for a logged-in user
export const getUserPermissions = async (req, res) => {
    try {
        const userId = req.user.id; // from auth middleware
        const user = await User.findById(userId).populate("permissions", "name description");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, permissions: user.permissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Create a new permission
export const createPermission = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Permission name is required" });
        }

        const exists = await Permission.findOne({ name });
        if (exists) {
            return res.status(400).json({ success: false, message: "Permission already exists" });
        }

        const permission = new Permission({ name, description });
        await permission.save();

        res.status(201).json({ success: true, permission });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ List all permissions
export const listPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find();
        res.json({ success: true, permissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
