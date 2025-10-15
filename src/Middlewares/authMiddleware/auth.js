import jwt from 'jsonwebtoken';
import User from '../../Modal/Users/User.js';

export const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, user not found'
            });
        }

        if (user && user.isSuspended) {
            return res.status(401).json({
                success: false,
                message: 'Your account is suspended, please contact support'
            });
        }




        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, token failed'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, token expired'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};


export const authorizeDomain = (...allowedDomains) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, please log in'
            });
        }

        if (!allowedDomains.includes(req.user.domain_type)) {
            return res.status(403).json({
                success: false,
                message: `Access denied: requires one of [${allowedDomains.join(', ')}]`
            });
        }

        next();
    };
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of permitted roles
 */


export const roleCheck = (allowedRoles) => {
    return (req, res, next) => {
        // 1. Check if user exists (must come after protect middleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // 2. Superadmin bypass (has all access)
        if (req.user.domain_type === 'superadmin') {
            return next();
        }

        // 3. Check if user has any of the allowed roles
        if (allowedRoles.includes(req.user.domain_type)) {
            return next();
        }

        // 4. Check for hierarchical permissions (optional)
        // Example: company can access worker routes
        if (req.user.domain_type === 'company') {
            return next();
        }

        // 5. If no permissions match
        return res.status(403).json({
            success: false,
            message: `Access denied. Required roles: ${allowedRoles}}`,
            yourRole: req.user.domain_type
        });
    };
};




export const authMiddleware1 = async (req, res, next) => {
    try {
        // 1) Get token from header or cookie
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            req.user = null; // User not found, continue without authentication
            return next();
        }

        // 2) Verify token

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            req.user = null; // User not found, continue without authentication
            return next();
        }

        // 3) Fetch user from DB
        const user = await User.findById(decoded.id).select('-password -otp -__v');
        if (!user) {
            req.user = null; // User not found, continue without authentication
            return next();
        }

        // 4) Attach user object (safe + token info)
        req.user = user;

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error.message);
        return res.status(500).json({ message: 'Authentication error' });
    }
};
