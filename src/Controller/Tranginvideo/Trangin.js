import Plan from "../../Modal/Wallet/Plan.js";
import User from "../../Modal/Users/User.js";
import TrainingVideo from "../../Modal/SuperAdmin/TraningVideos.js";
import TrainingPurchase from "../../Modal/SuperAdmin/BuyTraning.js";
import mongoose from "mongoose";
import * as videoService from './trainingVideo.service.js'
import VideoLike from "../../Modal/videoLike.js";
export const calculateTrendingScore = (video) => {

    const likesWeight = 2;
    const viewsWeight = 1;
    const purchaseWeight = 5;

    const score =
        (video.likes * likesWeight) +
        (video.views * viewsWeight) +
        (video.purchasesCount * purchaseWeight);

    return score;
};
export const createtrendingVideo = async (req, res) => {
    try {
        const {
            title,
            description,
            youtubeVideoId,
            youtubePrivacy = "private",
            accessType,
            trialDurationInDays = 0,
            planId,
            durationInMinutes,
            price,
            currency = "INR"
        } = req.body;

        /* ===============================
           1. Basic Validation
        =============================== */

        if (!title || !description || !youtubeVideoId || !accessType || !durationInMinutes) {
            return res.status(400).json({
                success: false,
                message: "title, description, youtubeVideoId, accessType, durationInMinutes are required"
            });
        }

        if (!["free", "paid", "trial"].includes(accessType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid accessType"
            });
        }

        /* ===============================
           2. Paid Validation
        =============================== */

        let plan = null;

        if (accessType === "paid") {
            if (!planId) {
                return res.status(400).json({
                    success: false,
                    message: "planId is required for paid videos"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(planId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid planId"
                });
            }

            plan = await Plan.findById(planId);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: "Plan not found"
                });
            }

            if (!price || price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid price is required for paid videos"
                });
            }
        }

        /* ===============================
           3. Create Video
        =============================== */

        const newTrainingVideo = new TrainingVideo({
            title: title.trim(),
            description: description.trim(),
            youtubeVideoId,
            youtubePrivacy,
            accessType,
            trialDurationInDays,
            planId: plan ? plan._id : null,
            durationInMinutes,
            price: accessType === "paid" ? price : null,
            currency: accessType === "paid" ? currency : null
        });

        const savedTrainingVideo = await newTrainingVideo.save();

        return res.status(201).json({
            success: true,
            data: savedTrainingVideo
        });

    } catch (error) {
        console.error("Error creating training video:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const getAllTrendingVideos = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            search,
            accessType,
            instructor,
            minPrice,
            maxPrice,
            startDate,
            endDate,
            sortBy = "trending",
            sortOrder = "desc"
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const matchStage = {
            isDeleted: false,
            isActive: true
        };

        // 🔎 Search (Text Index)
        if (search) {
            matchStage.$text = { $search: search };
        }

        // 🎯 Access Type Filter
        if (accessType) {
            matchStage.accessType = accessType;
        }

        // 👨‍🏫 Instructor Filter
        if (instructor) {
            matchStage.instructor = instructor;
        }

        // 💰 Price Filter
        if (minPrice || maxPrice) {
            matchStage.price = {};
            if (minPrice) matchStage.price.$gte = Number(minPrice);
            if (maxPrice) matchStage.price.$lte = Number(maxPrice);
        }

        // 📅 Date Filter
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        // 📊 Aggregation Pipeline
        const pipeline = [
            { $match: matchStage },

            // Calculate Age in Days
            {
                $addFields: {
                    ageInDays: {
                        $divide: [
                            { $subtract: [new Date(), "$createdAt"] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },

            // Real Trending Score Formula
            {
                $addFields: {
                    computedTrendingScore: {
                        $subtract: [
                            {
                                $add: [
                                    { $multiply: ["$views", 0.3] },
                                    { $multiply: ["$likes", 0.5] },
                                    { $multiply: ["$purchasesCount", 1.2] }
                                ]
                            },
                            { $multiply: ["$ageInDays", 0.2] }
                        ]
                    }
                }
            }
        ];

        // 🏆 Sorting Logic
        let sortStage = {};

        if (sortBy === "trending") {
            sortStage = { computedTrendingScore: -1 };
        } else {
            sortStage[sortBy] = sortOrder === "asc" ? 1 : -1;
        }

        pipeline.push({ $sort: sortStage });

        // Pagination
        pipeline.push(
            { $skip: (page - 1) * limit },
            { $limit: limit }
        );

        // Final Projection (Hide Internal Fields)
        pipeline.push({
            $project: {
                title: 1,
                description: 1,
                previewVideoId: 1,
                durationInMinutes: 1,
                accessType: 1,
                price: 1,
                currency: 1,
                views: 1,
                likes: 1,
                purchasesCount: 1,
                computedTrendingScore: 1,
                createdAt: 1
            }
        });

        const videos = await TrainingVideo.aggregate(pipeline);

        const total = await TrainingVideo.countDocuments(matchStage);

        return res.json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            results: videos
        });

    } catch (error) {
        console.error("Trending fetch error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const getTrainingVideoById = async (req, res) => {
    try {
        const userId = req.user?._id; // from auth middleware
        const { id } = req.params;
        console.log("id",id);
        const video = await TrainingVideo.findById(id);
        console.log("video",video);
        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }

        let canAccess = false;

        // 1️⃣ Free Video
        if (video.accessType === "free") {
            canAccess = true;
        }

        // 2️⃣ Paid Video
        if (video.accessType === "paid") {
            if (!userId) {
                return res.status(401).json({ message: "Login required" });
            }

            const purchase = await TrainingPurchase.findOne({
                user: userId,
                training: video._id,
                paymentStatus: "completed",
                isActive: true,
            });

            if (
                purchase &&
                (!purchase.accessExpiresAt ||
                    purchase.accessExpiresAt > new Date())
            ) {
                canAccess = true;
            }
        }

        // 3️⃣ Trial Video
        if (video.accessType === "trial") {
            const purchase = await TrainingPurchase.findOne({
                user: userId,
                training: video._id,
                paymentStatus: "completed",
                isActive: true,
            });

            if (
                purchase &&
                purchase.accessExpiresAt &&
                purchase.accessExpiresAt > new Date()
            ) {
                canAccess = true;
            }
        }

        // Response shaping
        return res.json({
            _id: video._id,
            title: video.title,
            description: video.description,
            previewVideoId: video.previewVideoId,
            durationInMinutes: video.durationInMinutes,
            accessType: video.accessType,
            youtubeVideoId: canAccess ? video.youtubeVideoId : null,
            locked: !canAccess,
        });

    } catch (error) {
        console.error("Video access error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const incrementView = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await TrainingVideo.findOneAndUpdate(
            { _id: videoId, isDeleted: false, isActive: true },
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        const newScore = calculateTrendingScore(video);

        video.trendingScore = newScore;
        await video.save();

        return res.status(200).json({
            success: true,
            trendingScore: newScore
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};







export const likeVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user._id; // Assuming user is authenticated

        // 1️⃣ Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid videoId"
            });
        }

        // 2️⃣ Check if video exists and is not deleted
        const video = await TrainingVideo.findOne({
            _id: videoId,
            isDeleted: false
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        // 3️⃣ Check if user already liked the video
        const existingLike = await VideoLike.findOne({
            user: userId,
            video: videoId
        });

        let message;
        let liked;

        if (existingLike) {
            // 4️⃣ Unlike: Remove like and decrement count
            await VideoLike.findByIdAndDelete(existingLike._id);
            video.likes -= 1;
            message = "Video unliked successfully";
            liked = false;
        } else {
            // 5️⃣ Like: Add like and increment count
            await VideoLike.create({
                user: userId,
                video: videoId
            });
            video.likes += 1;
            message = "Video liked successfully";
            liked = true;
        }

        // 6️⃣ Recalculate Trending Score
        video.trendingScore = calculateTrendingScore(video);
        await video.save();

        return res.status(200).json({
            success: true,
            message,
            liked,
            likesCount: video.likes,
            trendingScore: video.trendingScore
        });

    } catch (error) {
        console.error("Toggle Video Like Error:", error);

        // Handle duplicate key error (rare race condition)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Operation failed due to concurrent request"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const updateVideo = async (req, res) => {
    try {
        const { videoId } = req.params;

        const updated = await videoService.updateVideoService(
            videoId,
            req.body
        );

        return res.status(200).json({
            success: true,
            data: updated
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


export const toggleVideoActive = async (req, res) => {
    try {
        const { videoId } = req.params;

        const updated = await videoService.toggleActiveService(videoId);

        return res.status(200).json({
            success: true,
            isActive: updated.isActive
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


export const softDeleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;

        await videoService.softDeleteService(videoId);

        return res.status(200).json({
            success: true,
            message: "Video soft deleted"
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


export const updateYoutubePrivacy = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { youtubePrivacy } = req.body;

        const updated = await videoService.updateYoutubePrivacyService(
            videoId,
            youtubePrivacy
        );

        return res.status(200).json({
            success: true,
            data: updated
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


export const updateAccessType = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { accessType } = req.body;

        const updated = await videoService.updateAccessTypeService(
            videoId,
            accessType
        );

        return res.status(200).json({
            success: true,
            data: updated
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};




export const getAllVideos = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            search = "",
            accessType,
            isActive,
            sortBy = "latest" // latest | trending | popular
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const skip = (page - 1) * limit;

        // Base filter (Soft delete + Active)
        const filter = {
            isDeleted: false
        };

        if (accessType) {
            filter.accessType = accessType;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        if (search) {
            filter.$text = { $search: search };
        }

        // Sorting Strategy
        let sortOption = {};

        switch (sortBy) {
            case "trending":
                sortOption = { trendingScore: -1 };
                break;
            case "popular":
                sortOption = { views: -1 };
                break;
            case "latest":
            default:
                sortOption = { createdAt: -1 };
        }

        // Query Execution
        const [videos, total] = await Promise.all([
            TrainingVideo.find(filter)
                .populate("instructor", "name email")
                .populate("plan", "planName price")
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean(),

            TrainingVideo.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            },
            data: videos
        });

    } catch (error) {
        console.error("Get Training Videos Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};