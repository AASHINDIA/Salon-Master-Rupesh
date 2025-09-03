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

// getAllCompanies.js
export const getAllCompanies = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "desc",
            country,
            state,
            city
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        // Build query object
        let query = {};

        // Search by company_name or brand (case-insensitive)
        if (search) {
            query.$or = [
                { company_name: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } }
            ];
        }

        // Filters
        if (country) query["address.country"] = country;
        if (state) query["address.state"] = state;
        if (city) query["address.city"] = city;

        // Sort object
        let sortOptions = {};
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

        // Fetch data
        const companies = await Company.find(query)
            .select("company_name brand whatsapp_number address products social_media_links") // Include required fields
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);

        // Total count for pagination
        const totalCompanies = await Company.countDocuments(query);

        res.status(200).json({
            success: true,
            page,
            totalPages: Math.ceil(totalCompanies / limit),
            totalCompanies,
            data: companies
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};




export const getcompanylist = async (req, res) => {
    try {
        const userId = req.user._id;
        const company = await Company.findOne({ user_id: userId })
            .populate('user_id', 'email role');
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'

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





export const getCompanyProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const company = await Company.findOne({ user_id: userId })
            .populate('user_id', 'email role');

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Please complete  profile to continue.'
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

        let {
            company_name,
            brand,
            whatsapp_number,
            address,
            gst_number,
            pan_number,
            cin,
            social_media_links,
            product_shop_options,
            products
        } = req.body;

        let company = await Company.findOne({ user_id: userId }).session(session);

        if (!company) {
            company = new Company({
                user_id: userId,
                unique_name: generateUniqueCompanyName(),
                company_name: company_name || 'New Company'
            });
        }

        // Handle image upload
        if (req.file?.buffer) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'company-profile');
            company.image = uploadResult.secure_url;
        }

        // Basic fields
        if (company_name !== undefined) company.company_name = company_name;
        if (brand !== undefined) company.brand = brand;
        if (whatsapp_number !== undefined) company.whatsapp_number = whatsapp_number;
        if (gst_number !== undefined) company.gst_number = gst_number;
        if (pan_number !== undefined) company.pan_number = pan_number;
        if (cin !== undefined) company.cin = cin;

        // Address (like in Candidate function)
        if (address !== undefined) {
            let addressObj = typeof address === 'string' ? JSON.parse(address) : address;

            company.address = {
                country: addressObj.country || company.address?.country || '',
                state: addressObj.state || company.address?.state || '',
                city: addressObj.city || company.address?.city || '',
                pincode: addressObj.pincode || company.address?.pincode || '',
                countryIsoCode: addressObj.countryIsoCode || company.address?.countryIsoCode || '',
                stateIsoCode: addressObj.stateIsoCode || company.address?.stateIsoCode || ''
            };
        }

        // Optional fields
        if (social_media_links !== undefined) {
            company.social_media_links = typeof social_media_links === 'string'
                ? JSON.parse(social_media_links)
                : social_media_links;
        }

        if (product_shop_options !== undefined) {
            company.product_shop_options = typeof product_shop_options === 'string'
                ? JSON.parse(product_shop_options)
                : product_shop_options;
        }

        if (products !== undefined) {
            company.products = typeof products === 'string'
                ? JSON.parse(products)
                : products;
        }

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


