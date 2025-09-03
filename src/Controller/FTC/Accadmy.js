import Academy from "../../Modal/FTC/Academy.js";
import { uploadToCloudinary } from "../../Utils/imageUpload.js";



export const createAcademy = async () => {
    try {
        const { title, address, social_media_url, website_url } = req.body;
        const user_id = req.user.id;

        const existingFranchisee = await Academy.findOne({ user_id });
        if (existingFranchisee) {
            return res.status(400).json({ message: 'Academy entry already exists for this user.' });
        }

        let imageUrls = [];
        let leflate_image = [];

        if (req.files && req.files.length > 0) {
            leflate_image = await Promise.all(
                req.files.map((file) => uploadToCloudinary(file.buffer, "Academy"))
            );
            leflate_image = leflate_image.map((img) => img.secure_url); // only store the URL
        }

        if (req.files && req.files.length > 0) {
            imageUrls = await Promise.all(
                req.files.map((file) => uploadToCloudinary(file.buffer, "Academy"))
            );
            imageUrls = imageUrls.map((img) => img.secure_url); // only store the URL
        }

        const newAcademy = new Academy(
            {

                leflate_image,
                image_academy: imageUrls,
                user_id,
                title,
                address,
                social_media_url,
                website_url

            }
        )

        const aAcademy = await newAcademy.save();


        res.status(201).json({
            success: true,
            data: aAcademy,
            message: "Academy is created "
        })
    }
    catch (error) {

        res.status(500).json({
            success: true,
            message: "Academy is created "
        })
    }

}


export const getAllAcademy = () => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            order = 'desc',
            search = ''


        } = req.query

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            sort: { [sortBy]: order === 'desc' ? -1 : 1 },
        };

        

    } catch (error) {


    }
}