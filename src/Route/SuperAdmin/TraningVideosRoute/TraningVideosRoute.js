import express from 'express';

import {
    createTrendingVideo,
    getTrendingVideos,
    getTrendingVideoById,
    updateTrendingVideo,
    softDeleteTrendingVideo,
    restoreTrendingVideo,
    permanentDeleteTrendingVideo
} from '../../../Controller/Tranginvideo/TrendingVideo.js';
import { protect } from '../../../Middlewares/authMiddleware/auth.js';

const router = express.Router();

// Public routes
router.route('/')
    .get(getTrendingVideos);

router.route('/:id')
    .get(getTrendingVideoById);

// Protected admin routes
router.route('/')
    .post(protect, createTrendingVideo);

router.route('/:id')
    .put(protect, updateTrendingVideo)
    .delete(protect, softDeleteTrendingVideo);

router.route('/:id/restore')
    .put(protect, restoreTrendingVideo);

router.route('/:id/permanent')
    .delete(protect, permanentDeleteTrendingVideo);

export default router;