
import * as videoRepo from "./trainingVideo.repository.js";



export const updateVideoService = async (videoId, payload) => {

    const video = await videoRepo.findById(videoId);
    if (!video) throw new Error("Video not found");

    // Business validation
    if (payload.accessType === "paid" && !video.plan && !payload.plan) {
        throw new Error("Paid video must be linked with a plan");
    }

    return await videoRepo.updateById(videoId, payload);
};


export const toggleActiveService = async (videoId) => {

    const video = await videoRepo.findById(videoId);
    if (!video) throw new Error("Video not found");

    return await videoRepo.updateById(videoId, {
        isActive: !video.isActive
    });
};


export const softDeleteService = async (videoId) => {
    return await videoRepo.softDeleteById(videoId);
};


export const updateYoutubePrivacyService = async (videoId, privacy) => {

    const allowed = ["public", "unlisted", "private"];
    if (!allowed.includes(privacy)) {
        throw new Error("Invalid youtube privacy value");
    }

    return await videoRepo.updateById(videoId, {
        youtubePrivacy: privacy
    });
};


export const updateAccessTypeService = async (videoId, accessType) => {

    const allowed = ["free", "paid", "trial"];
    if (!allowed.includes(accessType)) {
        throw new Error("Invalid access type");
    }

    return await videoRepo.updateById(videoId, {
        accessType
    });
};