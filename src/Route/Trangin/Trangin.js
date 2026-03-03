import express from "express";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
import {
    createtrendingVideo,
    getAllTrendingVideos,
    getTrainingVideoById,
    incrementView,
    likeVideo,
    updateVideo,
    toggleVideoActive,
    softDeleteVideo,
    updateYoutubePrivacy,
    updateAccessType,
    getAllTrainingVideos
} from "../../Controller/Tranginvideo/Trangin.js";
const router = express.Router();


router.post("/trending-videos", protect, createtrendingVideo);
router.get("/trending-videos", protect, getAllTrendingVideos);
router.get("/trending-videos/:id", getTrainingVideoById);
router.post("/trending-videos/:id/increment-view", incrementView);
router.post("/trending-videos/:id/like", protect, likeVideo);
router.put("/trending-videos/:id", protect, updateVideo);
router.patch("/trending-videos/:id/toggle-active", protect, toggleVideoActive);
router.delete("/trending-videos/:id", protect, softDeleteVideo);
router.patch("/trending-videos/:id/update-youtube-privacy", protect, updateYoutubePrivacy);
router.patch("/trending-videos/:id/update-access-type", protect, updateAccessType);
router.get("/getAllTrainingVideos", getAllTrainingVideos);


export default router;

