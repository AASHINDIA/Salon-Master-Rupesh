import Company from '../../Modal/Compony/ComponyModal.js';
import { uploadToCloudinary } from '../../Utils/imageUpload.js';
import mongoose from 'mongoose';

// Generate unique name (similar to candidate but with different prefix)
const generateUniqueCompanyName = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    let result = 'co'; // Prefix for company

    // Add 3 random numbers
    for (let i = 0; i < 3; i++) {
        result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return result;
};

// Get company profile
export const getCompanyProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const company = await Company.findOne({ user_id: userId })
            .populate('user_id', 'email role');

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create or update company profile
export const saveCompanyProfile = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;

        // Destructure all possible fields from request body
        const {
            company_name,
            brand,
            gst_number,
            pan_number,
            cin,
            social_media_links,
            product_shop_options,
            products
        } = req.body;

        // Check if company profile already exists
        let company = await Company.findOne({ user_id: userId }).session(session);

        // If profile doesn't exist, create a new one
        if (!company) {
            company = new Company({
                user_id: userId,
                unique_name: generateUniqueCompanyName()
            });
        }

        // Handle image upload if present
       


        if (req.file?.buffer) {
            const result = await uploadToCloudinary(req.file.buffer, 'worker-profile');
            console.log('✅ Cloudinary Upload Result:', result);
            company.image = uploadResult.secure_url;
        }


        // Update fields from request body
        if (company_name !== undefined) company.company_name = company_name;
        if (brand !== undefined) company.brand = brand;
        if (gst_number !== undefined) company.gst_number = gst_number;
        if (pan_number !== undefined) company.pan_number = pan_number;
        if (cin !== undefined) company.cin = cin;

        // Handle special fields that might be stringified JSON
        if (social_media_links !== undefined) {
            try {
                company.social_media_links = typeof social_media_links === 'string' ?
                    JSON.parse(social_media_links) : social_media_links;
            } catch (e) {
                company.social_media_links = social_media_links;
            }
        }

        if (product_shop_options !== undefined) {
            try {
                company.product_shop_options = typeof product_shop_options === 'string' ?
                    JSON.parse(product_shop_options) : product_shop_options;
            } catch (e) {
                company.product_shop_options = product_shop_options;
            }
        }

        if (products !== undefined) {
            try {
                company.products = typeof products === 'string' ?
                    JSON.parse(products) : products;
            } catch (e) {
                company.products = products;
            }
        }

        // Save the company profile
        await company.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Company profile saved successfully',
            data: company
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        res.status(500).json({
            success: false,
            message: 'Error saving company profile',
            error: error.message
        });
    }
};