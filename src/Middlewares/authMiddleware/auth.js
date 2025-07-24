import jwt from 'jsonwebtoken';
import User from '../../Modal/Users/User';

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

        // Check if token matches the one stored in user document
        if (user.access_token !== token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, invalid token'
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

// Role-based access control middleware
export const roleCheck = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.domain_type)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.domain_type} is not authorized to access this route`
            });
        }
        next();
    };
};