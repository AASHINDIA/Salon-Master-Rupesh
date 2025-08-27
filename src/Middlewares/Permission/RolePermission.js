import User from '../../Modal/Users/User.js';
// This is a higher-order function that creates the middleware
export const checkAccess = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // 1. Get the user ID from the previously run authentication middleware
            const userId = req.user.id;

            // 2. Find the user and populate their permissions
            const user = await User.findById(userId).populate('permissions');
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // 3. Apply Access Logic based on domain_type (role)
            let hasAccess = false;

            // Rule 1: SUPERADMIN has access to EVERYTHING. No permission check needed.
            if (user.domain_type === 'superadmin') {
                hasAccess = true;
            }
            // Rule 2: For ADMIN - Check their specific permissions array
            else if (user.domain_type === 'admin') {
                // Check if the user's permissions array contains a permission
                // with a 'name' that matches the requiredPermission
                hasAccess = user.permissions.some(perm => perm.name === requiredPermission);
            }
            // Rule 3: For COMPANY, SALON, WORKER - They have FIXED permissions.
            // We can also check their permissions array if needed, or use a different logic.
            else if (['company', 'salon', 'worker'].includes(user.domain_type)) {
                // Use the same logic: check their personal permissions array
                hasAccess = user.permissions.some(perm => perm.name === requiredPermission);
            }
            // Rule 4: Default DENY for any unrecognized domain_type
            else {
                hasAccess = false;
            }

            // 4. Decision Point
            if (hasAccess) {
                next(); // User has permission, proceed to the route handler
            } else {
                res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
            }

        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Internal server error during authorization.' });
        }
    };
};