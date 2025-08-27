import User from '../../Modal/Users/User.js';

import Permission from '../../Modal/Users/Permission.js';   

export const assignAdminPermissions = async (req, res) => {
    try {
        // 1. Check if the requester is a superadmin
        // (Assuming your auth middleware sets req.user)
        if (req.user.domain_type !== 'superadmin') {
            return res.status(403).json({ message: 'Only superadmin can assign permissions.' });
        }

        // 2. Find the target admin user
        // The URL parameter is now the USER ID, not a role ID
        // Example: PUT /api/admin/users/:userId/permissions
        const { userId } = req.params; 

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 3. Optional: Ensure the target is an Admin
        // (You can remove this if you want to assign permissions to any user type)
        if (targetUser.domain_type !== 'admin') {
            return res.status(400).json({ message: 'Permissions can only be assigned to admin users.' });
        }

        // 4. Get the list of permission names from the request body
        const { permissionNames } = req.body; // e.g., { "permissionNames": ["user:delete", "report:view"] }

        // 5. Find all Permission documents for the provided names
        const permissionDocs = await Permission.find({ 
            name: { $in: permissionNames } 
        });

        // 6. Check if all requested permissions are valid
        const foundPermissionNames = permissionDocs.map(doc => doc.name);
        const invalidPermissions = permissionNames.filter(name => !foundPermissionNames.includes(name));

        if (invalidPermissions.length > 0) {
            return res.status(400).json({ 
                message: 'Some permission names are invalid.', 
                invalidPermissions 
            });
        }

        // 7. Get the ObjectIds of the valid permissions
        const validPermissionIds = permissionDocs.map(doc => doc._id);

        // 8. Update the target user's permissions array
        targetUser.permissions = validPermissionIds; // This REPLACES the entire array
        await targetUser.save();

        // 9. Populate the permissions to return meaningful data
        await targetUser.populate('permissions');

        // 10. Respond with success
        res.json({ 
            message: 'User permissions updated successfully.',
            user: {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                domain_type: targetUser.domain_type,
                // Send back the permission names for clarity
                permissions: targetUser.permissions.map(p => p.name)
            }
        });

    } catch (error) {
        console.error('Error assigning permissions:', error);
        res.status(500).json({ message: 'Error assigning permissions', error: error.message });
    }
};