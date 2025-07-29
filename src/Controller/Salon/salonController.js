import Salon from '../../Modal/Salon/Salon.js';
import { uploadToCloudinary } from '../../Utils/imageUpload.js';
import mongoose from 'mongoose';

// Generate unique name for salon (e.g., "sl123")
const generateUniqueSalonName = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    let result = 'sl'; // Prefix for salon

    // Add 3 random numbers
    for (let i = 0; i < 3; i++) {
        result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return result;
};

// Get salon profile
export const getSalonProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const salon = await Salon.findOne({ user_id: userId })
            .populate('user_id', 'email role');

        if (!salon) {
            return res.status(404).json({
                success: false,
                message: 'Salon profile not found'
            });
        }

        // Include virtual field in response
        const salonData = salon.toObject();
        salonData.total_employees_count = salon.total_employees_count;

        res.status(200).json({
            success: true,
            data: salonData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create or update salon profile
export const saveSalonProfile = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;

        // Destructure all possible fields from request body
        const {
            identification_number,
            brand_name,
            salon_name,
            year_of_start,
            address,
            contact_number,
            whatsapp_number,
            company_name,
            registered_address,
            gst_number,
            pan_number,
            instagram_link,
            facebook_link,
            youtube_link,
            shop_area,
            female_employees_count,
            male_employees_count,
            managers_count,
            payment_credit,
            location,
            requires_employee_recruitment,
            requires_product_training,
            requires_product_order
        } = req.body;

        // Check if salon profile already exists
        let salon = await Salon.findOne({ user_id: userId }).session(session);

        // If profile doesn't exist, create a new one
        if (!salon) {
            salon = new Salon({
                user_id: userId,
                salon_name: salon_name || 'My Salon', // Default name if not provided
                unique_name: generateUniqueSalonName() // Generate unique name
            });
        }

        // Handle image upload if present
        if (req.file?.buffer) {
            const result = await uploadToCloudinary(req.file.buffer, 'salon-profile');
            console.log('✅ Cloudinary Upload Result:', result);
            salon.image_path = result.secure_url;
        }




        // Update fields from request body
        if (identification_number !== undefined) salon.identification_number = identification_number;
        if (brand_name !== undefined) salon.brand_name = brand_name;
        if (salon_name !== undefined) salon.salon_name = salon_name;
        if (year_of_start !== undefined) salon.year_of_start = year_of_start;
        if (address !== undefined) salon.address = address;
        if (contact_number !== undefined) salon.contact_number = contact_number;
        if (whatsapp_number !== undefined) salon.whatsapp_number = whatsapp_number;
        if (company_name !== undefined) salon.company_name = company_name;
        if (registered_address !== undefined) salon.registered_address = registered_address;
        if (gst_number !== undefined) salon.gst_number = gst_number;
        if (pan_number !== undefined) salon.pan_number = pan_number;
        if (instagram_link !== undefined) salon.instagram_link = instagram_link;
        if (facebook_link !== undefined) salon.facebook_link = facebook_link;
        if (youtube_link !== undefined) salon.youtube_link = youtube_link;
        if (shop_area !== undefined) salon.shop_area = parseFloat(shop_area) || 0;
        if (female_employees_count !== undefined) salon.female_employees_count = parseInt(female_employees_count) || 0;
        if (male_employees_count !== undefined) salon.male_employees_count = parseInt(male_employees_count) || 0;
        if (managers_count !== undefined) salon.managers_count = parseInt(managers_count) || 0;
        if (payment_credit !== undefined) salon.payment_credit = parseFloat(payment_credit) || 0;
        if (location !== undefined) salon.location = location;

        // Boolean fields
        if (requires_employee_recruitment !== undefined) {
            salon.requires_employee_recruitment = requires_employee_recruitment === 'true' || requires_employee_recruitment === true;
        }
        if (requires_product_training !== undefined) {
            salon.requires_product_training = requires_product_training === 'true' || requires_product_training === true;
        }
        if (requires_product_order !== undefined) {
            salon.requires_product_order = requires_product_order === 'true' || requires_product_order === true;
        }

        // Save the salon profile
        await salon.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Include virtual field in response
        const salonData = salon.toObject();
        salonData.total_employees_count = salon.total_employees_count;

        res.status(200).json({
            success: true,
            message: 'Salon profile saved successfully',
            data: salonData
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        res.status(500).json({
            success: false,
            message: 'Error saving salon profile',
            error: error.message
        });
    }
};