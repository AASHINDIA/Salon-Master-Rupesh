import User from "../../Modal/Users/User.js";
import TrendingVideo from "../../Modal/SuperAdmin/TraningVideos.js";
import Product from "../../Modal/Compony/Products.js";

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