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
    getAllVideos
} from "../../Controller/Tranginvideo/Trangin.js";
import multer from "multer";

const router = express.Router();


const storage = multer.memoryStorage();
export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
router.post("/trending-videos", protect, upload.single("thumbnail"), createtrendingVideo);
router.get("/trending-videos", protect, getAllTrendingVideos);
router.get("/getAll/Videos", getAllVideos);
router.get("/trending-videos/:id", protect, getTrainingVideoById);
router.post("/trending-videos/:videoId/increment-view", incrementView);
router.post("/trending-videos/:videoId/like", protect, likeVideo);
router.put("/trending-videos/:videoId", protect, updateVideo);
router.patch("/trending-videos/:videoId/toggle-active", protect, toggleVideoActive);
router.delete("/trending-videos/:videoId", protect, softDeleteVideo);
router.patch("/trending-videos/:videoId/update-youtube-privacy", protect, updateYoutubePrivacy);
router.patch("/trending-videos/:videoId/update-access-type", protect, updateAccessType);


export default router;

