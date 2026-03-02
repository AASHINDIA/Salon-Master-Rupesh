import TraningVideos from "../../Modal/SuperAdmin/TraningVideos.js";



export const findById = (id) => {
    return TraningVideos.findOne({
        _id: id,
        isDeleted: false
    });
};

export const updateById = (id, updateData) => {
    return TraningVideos.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: updateData },
        { new: true }
    );
};

export const softDeleteById = (id) => {
    return TraningVideos.findByIdAndUpdate(
        id,
        { isDeleted: true, isActive: false },
        { new: true }
    );
};