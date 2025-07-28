import mongoose from 'mongoose';
import TrendingVideo from '../../Modal/SuperAdmin/TraningVideos.js';

/**
 * @desc    Create a new trending video
 * @route   POST /api/trending-videos
 * @access  Private/Admin
 */
const createTrendingVideo = async (req, res) => {
    try {
        const { title, description, link, duration, categories } = req.body;

        // Extract YouTube ID if it's a YouTube URL
        let videoLink = link;
        if (link.includes('youtube.com') || link.includes('youtu.be')) {
            const youtubeId = extractYouTubeId(link);
            if (!youtubeId) {
                return res.status(400).json({ message: 'Invalid YouTube URL' });
            }
            videoLink = `https://www.youtube.com/watch?v=${youtubeId}`;
        }

        const video = new TrendingVideo({
            title,
            description,
            link: videoLink,
            duration,
            categories: categories || ['general']
        });

        const createdVideo = await video.save();
        
        res.status(201).json({
            _id: createdVideo._id,
            title: createdVideo.title,
            description: createdVideo.description,
            link: createdVideo.link,
            duration: createdVideo.duration,
            formattedDuration: createdVideo.formattedDuration,
            categories: createdVideo.categories,
            isActive: createdVideo.isActive,
            createdAt: createdVideo.createdAt
        });
    } catch (error) {
        res.status(400).json({
            message: error.message,
            error: error.errors
        });
    }
};

/**
 * @desc    Get all trending videos with pagination, filtering, and sorting
 * @route   GET /api/trending-videos
 * @access  Public
 */
const getTrendingVideos = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            sort = '-createdAt', 
            search, 
            category, 
            minDuration, 
            maxDuration,
            active 
        } = req.query;

        // Build the query
        let query = {};

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter
        if (category) {
            query.categories = { $in: [category] };
        }

        // Duration filter
        if (minDuration || maxDuration) {
            query.duration = {};
            if (minDuration) query.duration.$gte = Number(minDuration);
            if (maxDuration) query.duration.$lte = Number(maxDuration);
        }

        // Active status filter
        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        // Execute query with pagination
        const videos = await TrendingVideo.find(query)
            .sort(sort)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean();

        const total = await TrendingVideo.countDocuments(query);

        res.json({
            videos: videos.map(video => ({
                ...video,
                formattedDuration: formatDuration(video.duration)
            })),
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get a single trending video by ID
 * @route   GET /api/trending-videos/:id
 * @access  Public
 */
const getTrendingVideoById = async (req, res) => {
    try {
        const video = await TrendingVideo.findById(req.params.id).lean();

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        res.json({
            ...video,
            formattedDuration: formatDuration(video.duration)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Update a trending video
 * @route   PUT /api/trending-videos/:id
 * @access  Private/Admin
 */
const updateTrendingVideo = async (req, res) => {
    try {
        const { title, description, link, duration, categories } = req.body;

        let videoLink = link;
        // Handle YouTube URL if provided
        if (link && (link.includes('youtube.com') || link.includes('youtu.be'))) {
            const youtubeId = extractYouTubeId(link);
            if (!youtubeId) {
                return res.status(400).json({ message: 'Invalid YouTube URL' });
            }
            videoLink = `https://www.youtube.com/watch?v=${youtubeId}`;
        }

        const video = await TrendingVideo.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        video.title = title || video.title;
        video.description = description || video.description;
        video.link = videoLink || video.link;
        video.duration = duration || video.duration;
        video.categories = categories || video.categories;

        const updatedVideo = await video.save();

        res.json({
            _id: updatedVideo._id,
            title: updatedVideo.title,
            description: updatedVideo.description,
            link: updatedVideo.link,
            duration: updatedVideo.duration,
            formattedDuration: updatedVideo.formattedDuration,
            categories: updatedVideo.categories,
            isActive: updatedVideo.isActive,
            updatedAt: updatedVideo.updatedAt
        });
    } catch (error) {
        res.status(400).json({ 
            message: error.message,
            error: error.errors 
        });
    }
};

/**
 * @desc    Soft delete a trending video (set isActive to false)
 * @route   DELETE /api/trending-videos/:id
 * @access  Private/Admin
 */
const softDeleteTrendingVideo = async (req, res) => {
    try {
        const video = await TrendingVideo.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        video.isActive = false;
        await video.save();

        res.json({ message: 'Video deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Restore a soft-deleted trending video (set isActive to true)
 * @route   PUT /api/trending-videos/:id/restore
 * @access  Private/Admin
 */
const restoreTrendingVideo = async (req, res) => {
    try {
        const video = await TrendingVideo.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        video.isActive = true;
        await video.save();

        res.json({ message: 'Video restored successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Permanently delete a trending video
 * @route   DELETE /api/trending-videos/:id/permanent
 * @access  Private/Admin
 */
const permanentDeleteTrendingVideo = async (req, res) => {
    try {
        const video = await TrendingVideo.findByIdAndDelete(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        res.json({ message: 'Video permanently deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Helper function to extract YouTube ID from URL
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Helper function to format duration (seconds to MM:SS)
function formatDuration(duration) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export {
    createTrendingVideo,
    getTrendingVideos,
    getTrendingVideoById,
    updateTrendingVideo,
    softDeleteTrendingVideo,
    restoreTrendingVideo,
    permanentDeleteTrendingVideo
};