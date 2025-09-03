import Classified from "../../Modal/FTC/Classified.js";
import { uploadToCloudinary } from "../../Utils/imageUpload.js";

export const createFranchisee = async (req, res) => {
    try {
        const { title, address, social_media_url, type_of_classified, website_url } = req.body;
        const user_id = req.user.id;
        // Check if the user already has a Classified entry
        const existingFranchisee = await Classified.findOne({ user_id });
        if (existingFranchisee) {
            return res.status(400).json({ message: 'Classified entry already exists for this user.' });
        }

        // Upload multiple images to Cloudinary
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = await Promise.all(
                req.files.map((file) => uploadToCloudinary(file.buffer, "Classified"))
            );
            imageUrls = imageUrls.map((img) => img.secure_url); // only store the URL
        }

        const newClassified = new Classified({
            user_id,
            image_academy: imageUrls,
            title,
            address,
            type_of_classified,
            social_media_url,
            website_url
        });
        const savedClassified = await newClassified.save();
        res.status(201).json(savedClassified);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// export const getClassified=async()=>{

//     try {
//         const {
//             Pasge=1,
//             limit=10,
//             search='',
//             type=
//         }= req.query;



//     } catch (error) {
        
//     }
// }