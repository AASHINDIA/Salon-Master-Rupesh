import Franchisee from "../../Modal/FTC/Franchisee.js";

import { uploadToCloudinary } from "../../Utils/imageUpload.js";

export const createFranchisee = async (req, res) => {
    try {
        const { title, address, social_media_url, website_url } = req.body;
        const user_id = req.user.id;
        // Check if the user already has a Franchisee entry
        const existingFranchisee = await Franchisee.findOne({ user_id });
        if (existingFranchisee) {
            return res.status(400).json({ message: 'Franchisee entry already exists for this user.' });
        }

        // Upload multiple images to Cloudinary
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = await Promise.all(
                req.files.map((file) => uploadToCloudinary(file.buffer, "franchisees"))
            );
            imageUrls = imageUrls.map((img) => img.secure_url); // only store the URL
        }

        const newFranchisee = new Franchisee({
            user_id,
            image_academy: imageUrls,
            title,
            address,
            social_media_url,
            website_url
        });
        const savedFranchisee = await newFranchisee.save();
        res.status(201).json(savedFranchisee);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
export const getFranchiseeByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;
        const franchisee = await Franchisee.findOne({ user_id });
        if (!franchisee) {
            return res.status(404).json({ message: 'Franchisee not found for this user.' });
        }
        res.status(200).json(franchisee);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}


export const updateFranchisee = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { image_academy, title, address, social_media_url, website_url } = req.body;
        const updatedFranchisee = await Franchisee.findOneAndUpdate(
            { user_id },
            { image_academy, title, address, social_media_url, website_url },
            { new: true }
        );
        if (!updatedFranchisee) {
            return res.status(404).json({ message: 'Franchisee not found for this user.' });
        }
        res.status(200).json(updatedFranchisee);
    }


    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteFranchisee = async (req, res) => {
    try {
        const { user_id } = req.params;
        const deletedFranchisee = await Franchisee.findOneAndDelete({ user_id });
        if (!deletedFranchisee) {
            return res.status(404).json({ message: 'Franchisee not found for this user.' });
        }
        res.status(200).json({ message: 'Franchisee deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getAllFranchisees = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            order = 'desc',
            search = ''


        } = req.query
        const query = search ? { title: { $regex: search, $options: 'i' } } : {};
        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            sort: { [sortBy]: order === 'desc' ? -1 : 1 },
        };
        const franchisees = await Franchisee.find(query)

            .sort(options.sort)
            .skip((options.page - 1) * options.limit)
            .limit(options.limit);



        res.status(200).json(franchisees);
    }

    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

