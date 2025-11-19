import Company from "../../Modal/Compony/ComponyModal.js";
import TrendingVideo from "../../Modal/SuperAdmin/TraningVideos.js";

export const recent = async (req, res) => {
    try {
        const { page = 1, limit = 5 } = req.query;

        // Convert to numbers to avoid string issues
        const skip = (page - 1) * limit;

        // Fetch latest companies (sorted by createdAt descending)
        const recentCompanies = await Company.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        // Fetch latest trending videos (sorted by createdAt descending)
        const recentVideos = await TrendingVideo.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        return res.status(200).json({
            success: true,
            message: "Recent records fetched successfully",
            companies: recentCompanies,
            videos: recentVideos,
        });
    } catch (error) {
        console.error("Error fetching recent data:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};


