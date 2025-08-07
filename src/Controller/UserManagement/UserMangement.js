import User from "../../Modal/Users/User.js";
import mongoose from "mongoose";
import Candidate from "../../Modal/Candidate/Candidate.js";
import Salon from "../../Modal/Salon/Salon.js";
import Company from "../../Modal/Compony/ComponyModal.js";


// Helper function to build search query
const buildUserQuery = ({ search, fromDate, toDate, domainType, isSuspended }) => {
    const query = {};

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { whatsapp_number: { $regex: search, $options: 'i' } }
        ];
    }

    // Date range filter
    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Domain type filter
    if (domainType) {
        query.domain_type = domainType;
    }

    // Account status filter
    if (isSuspended !== undefined) {
        query.isSuspended = isSuspended;
    }

    return query;
};

// @desc    Get all users with pagination
// @route   GET /api/users

export const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            fromDate,
            toDate,
            domainType,
            isSuspended
        } = req.query;

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build the query object
        const query = {};

        // Search filter (name, email, or whatsapp number)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { whatsapp_number: { $regex: search, $options: 'i' } }
            ];
        }

        // Date range filter
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) query.createdAt.$lte = new Date(toDate);
        }

        // Domain type filter (can be single value or array)
        if (domainType) {
            if (Array.isArray(domainType)) {
                // Handle multiple domain types
                query.domain_type = { $in: domainType };
            } else {
                // Handle single domain type
                query.domain_type = domainType;
            }
        }

        // Account suspension filter
        if (isSuspended !== undefined) {
            query.isSuspended = isSuspended === 'true';
        }               

        // Get total count of documents matching the query
        const total = await User.countDocuments(query);

        // Get paginated results
        const users = await User.find(query)
            .select('-password -access_token -refresh_token -otp_code -otp_sent_at -otp_expires_at')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total: total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
                hasNextPage: (skip + parseInt(limit)) < total,
                hasPrevPage: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get single user with domain profile
// @route   GET /api/users/:id

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findById(id)
            .select('-password -access_token -refresh_token -otp_code -otp_sent_at -otp_expires_at')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        let domainProfile = null;
        let profileModel = null;

        switch (user.domain_type) {
            case 'worker':
                domainProfile = await Candidate.findOne({ user_id: id }).lean();
                profileModel = 'Candidate';
                break;
            case 'solan':
                domainProfile = await Salon.findOne({ user_id: id }).lean();
                profileModel = 'Salon';
                break;
            case 'company':
                domainProfile = await Company.findOne({ user_id: id }).lean();
                profileModel = 'Company';
                break;
            default:
                break;
        }

        res.status(200).json({
            success: true,
            data: {
                ...user,
                domainProfile,
                profileModel
            }
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update user and domain profile
// @route   PUT /api/users/:id

export const updateUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { userData, domainData } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // 1. Update User document
        const updatedUser = await User.findByIdAndUpdate(
            id,
            {
                ...userData,
                updatedAt: new Date()
            },
            {
                new: true,
                session,
                select: '-password -access_token -refresh_token -otp_code -otp_sent_at -otp_expires_at'
            }
        );

        if (!updatedUser) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // 2. Update domain-specific profile
        let updatedDomainProfile = null;

        switch (updatedUser.domain_type) {
            case 'worker':
                updatedDomainProfile = await Candidate.findOneAndUpdate(
                    { user_id: id },
                    {
                        ...domainData,
                        name: userData.name || updatedUser.name,
                        contact_no: userData.whatsapp_number || updatedUser.whatsapp_number,
                        updatedAt: new Date()
                    },
                    { new: true, session, lean: true }
                );
                break;

            case 'solan':
                updatedDomainProfile = await Salon.findOneAndUpdate(
                    { user_id: id },
                    {
                        ...domainData,
                        salon_name: userData.name || updatedUser.name,
                        contact_number: userData.whatsapp_number || updatedUser.whatsapp_number,
                        updatedAt: new Date()
                    },
                    { new: true, session, lean: true }
                );
                break;

            case 'company':
                updatedDomainProfile = await Company.findOneAndUpdate(
                    { user_id: id },
                    {
                        ...domainData,
                        company_name: userData.name || updatedUser.name,
                        updatedAt: new Date()
                    },
                    { new: true, session, lean: true }
                );
                break;

            default:
                break;
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                user: updatedUser,
                domainProfile: updatedDomainProfile
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error updating user:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
};

// @desc    Toggle user suspension status
// @route   PATCH /api/users/:id/suspend

export const toggleUserSuspension = async (req, res) => {
    try {
        const { id } = req.params;
        const { isSuspended } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { isSuspended },
            {
                new: true,
                select: '-password -access_token -refresh_token -otp_code -otp_sent_at -otp_expires_at'
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `User account has been ${user.isSuspended ? 'suspended' : 'activated'}`,
            data: user
        });
    } catch (error) {
        console.error("Error toggling user suspension:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle user suspension',
            error: error.message
        });
    }
};

// @desc    Delete user and associated profile
// @route   DELETE /api/users/:id
export const deleteUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // 1. Get user to determine domain type
        const user = await User.findById(id).session(session);

        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // 2. Delete domain profile based on user type
        switch (user.domain_type) {
            case 'worker':
                await Candidate.deleteOne({ user_id: id }).session(session);
                break;
            case 'solan':
                await Salon.deleteOne({ user_id: id }).session(session);
                break;
            case 'company':
                await Company.deleteOne({ user_id: id }).session(session);
                break;
            default:
                break;
        }

        // 3. Delete user
        await User.deleteOne({ _id: id }).session(session);

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'User and associated profile deleted successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
};