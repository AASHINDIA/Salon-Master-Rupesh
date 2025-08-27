import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // e.g., "user:delete", "report:view"
        index: true
    },
    description: {
        type: String,
        required: true // e.g., "Allows the user to permanently delete user accounts"
    },
    category: {
        type: String,
        required: true,
        index: true // e.g., "User Management", "Billing", "Reporting", "Settings"
    },
    // You can add more fields like `isDangerous` for UI warnings, etc.
}, {
    timestamps: true
});

// Pre-defined categories and permissions can be seeded into the database
const Permission = mongoose.model('Permission', PermissionSchema);

export default Permission;