import User from "../../Modal/Users/User.js";
import TrendingVideo from "../../Modal/SuperAdmin/TraningVideos.js";
import Product from "../../Modal/Compony/Products.js";
import SellerListing from "../../Modal/sales/SellerListing.js";
import SellerListingPayment from "../../Modal/sales/SellerListingPayment.js";
import UserRegistration from "../../Modal/Users/UserRegistration.js";
import mongoose from "mongoose";

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id; // Logged-in user's ID

    // Run queries in parallel, scoped to this user
    const [totalTrendingVideos, totalProducts] = await Promise.all([
      TrendingVideo.countDocuments({ user_id: userId }), 
      Product.countDocuments({ UserId: userId })
    ]);

    const stats = {
      totalTrendingVideos,
      totalProducts,
    };

    res.status(200).json({
      success: true,
      message: "User dashboard stats fetched successfully",
      data: stats,
      meta: {
        requestedAt: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        userId,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error while fetching dashboard stats",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


export const CountsoftheUsers = async (req, res) => {
    try {
        // Queries
        const totalUsersQuery = User.countDocuments({
            domain_type: { $ne: "superadmin" }
        });

        const userCountsByDomainQuery = User.aggregate([
            { $match: { domain_type: { $ne: "superadmin" } } },
            { $group: { _id: "$domain_type", count: { $sum: 1 } } }
        ]);

        const trendingVideoCountQuery = TrendingVideo.countDocuments();

        // Execute all queries in parallel
        const [totalUsers, userCountsByDomain, trendingVideoCount] = await Promise.all([
            totalUsersQuery,
            userCountsByDomainQuery,
            trendingVideoCountQuery
        ]);

        // Convert aggregation result to object
        const userCountObj = userCountsByDomain.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                userCountsByDomain: userCountObj,
                trendingVideoCount
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc Superadmin dashboard stats (users, listings, payments, videos)
 * @route GET /api/v1/DashboardApi/admin/stats
 * @access superadmin/admin
 */
export const getAdminStats = async (req, res) => {
    try {
        const [
            totalUsers,
            userCountsByDomain,
            listingStatusCounts,
            paymentAgg,
            videoCount,
            companyCount
        ] = await Promise.all([
            User.countDocuments({ domain_type: { $ne: "superadmin" } }),
            User.aggregate([
                { $match: { domain_type: { $ne: "superadmin" } } },
                { $group: { _id: "$domain_type", count: { $sum: 1 } } }
            ]),
            SellerListing.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            SellerListingPayment.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }
            ]),
            TrendingVideo.countDocuments({ isDeleted: false }),
            User.countDocuments({ domain_type: "company" }),
        ]);

        const userCountObj = userCountsByDomain.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const listingStatusObj = listingStatusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const paymentObj = paymentAgg.reduce((acc, item) => {
            acc[item._id] = { count: item.count, total: item.total };
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                companyCount,
                userCountsByDomain: userCountObj,
                listings: {
                    active: listingStatusObj.active || 0,
                    pending: listingStatusObj.pending || 0,
                    inactive: listingStatusObj.inactive || 0,
                },
                payments: {
                    completed: paymentObj.completed || { count: 0, total: 0 },
                    pending: paymentObj.pending || { count: 0, total: 0 },
                    failed: paymentObj.failed || { count: 0, total: 0 },
                },
                revenue: paymentObj.completed?.total || 0,
                videoCount,
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc Get real company list for admin dashboard
 * @route GET /api/v1/DashboardApi/admin/companies?page&limit
 * @access superadmin/admin
 */
export const getAdminCompanies = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const [users, total] = await Promise.all([
            User.find({ domain_type: "company" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .select("name whatsapp_number isSuspended createdAt updatedAt"),
            User.countDocuments({ domain_type: "company" }),
        ]);

        const userIds = users.map((u) => u._id);
        const registrations = await UserRegistration.find({ user_id: { $in: userIds } });

        const regMap = registrations.reduce((acc, reg) => {
            acc[reg.user_id.toString()] = reg;
            return acc;
        }, {});

        const companies = users.map((user) => {
            const reg = regMap[user._id.toString()];
            return {
                id: user._id,
                name: reg?.company_name || reg?.saloon_name || reg?.brand_name || user.name,
                whatsapp_number: user.whatsapp_number,
                location: reg?.location || reg?.registration_address || null,
                status: user.isSuspended ? "Suspended" : "Active",
                lastActive: user.updatedAt || user.createdAt,
                createdAt: user.createdAt,
            };
        });

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            data: companies,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc Toggle company suspend/activate
 * @route PATCH /api/v1/DashboardApi/admin/companies/:id/suspend
 * @access superadmin/admin
 */
export const toggleCompanySuspend = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid company ID" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        if (user.domain_type !== "company") {
            return res.status(400).json({ success: false, message: "User is not a company" });
        }

        user.isSuspended = !user.isSuspended;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Company ${user.isSuspended ? "suspended" : "activated"} successfully`,
            data: { id: user._id, isSuspended: user.isSuspended },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc Latest training videos for admin dashboard
 * @route GET /api/v1/DashboardApi/admin/videos?limit
 * @access superadmin/admin
 */
export const getAdminVideos = async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const videos = await TrendingVideo.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .select("title thumbnail views durationInMinutes instructor isActive createdAt")
            .populate("instructor", "name")
            .lean();

        res.status(200).json({
            success: true,
            data: videos.map((v) => ({
                id: v._id,
                title: v.title,
                thumbnail: v.thumbnail,
                views: v.views,
                duration: v.durationInMinutes,
                instructor: v.instructor?.name || "Admin",
                status: v.isActive ? "Active" : "Inactive",
                createdAt: v.createdAt,
            })),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc Recent system activity (new users + listing payments)
 * @route GET /api/v1/DashboardApi/admin/activities?limit
 * @access superadmin/admin
 */
export const getAdminActivities = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const [recentUsers, recentPayments] = await Promise.all([
            User.find({ domain_type: { $ne: "superadmin" } })
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .select("name domain_type whatsapp_number createdAt"),
            SellerListingPayment.find()
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .select("actionType amount status createdAt userId listingId"),
        ]);

        const userActivities = recentUsers.map((u) => ({
            id: `user_${u._id}`,
            action: `${u.domain_type} registered`,
            company: u.name,
            time: u.createdAt,
        }));

        const paymentActivities = recentPayments.map((p) => ({
            id: `pay_${p._id}`,
            action: `Listing ${p.actionType} payment ${p.status}`,
            company: `${p.currency} ${p.amount}`,
            time: p.createdAt,
        }));

        const activities = [...userActivities, ...paymentActivities]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, Number(limit))
            .map((a) => ({ ...a, time: a.time }));

        res.status(200).json({ success: true, data: activities });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};