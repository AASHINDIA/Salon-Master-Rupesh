


import { uploadToCloudinary } from '../../Utils/imageUpload.js';
import mongoose from 'mongoose';
import Candidate from '../../Modal/Candidate/Candidate.js'
// Generate unique name like wo232
const generateUniqueName = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    let result = '';

    // Add 2 random letters
    for (let i = 0; i < 2; i++) {
        result += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Add 3 random numbers
    for (let i = 0; i < 3; i++) {
        result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return result;
};

// Get candidate profile
export const getCandidateProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const candidate = await Candidate.findOne({ user_id: userId })
            .populate('skills')  // Populate full skill details
            .populate('user_id', 'email role');

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate profile not found'
            });
        }

        // Include virtual age field in response
        const candidateData = candidate.toObject();
        candidateData.age = candidate.age;

        res.status(200).json({
            success: true,
            data: candidateData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create or update candidate profile
export const saveCandidateProfile = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const {
            name,
            location,
            date_of_birth,
            address, // { country, state, city, pincode, countryIsoCode, stateIsoCode }
            pan_no,
            contact_no,
            id_type,
            id_detail,
            education,
            certificates,
            skills,
            services,
            available_for_join,
            joining_date,
            portfolio_links,
            gender,
            expected_salary
        } = req.body;

        let candidate = await Candidate.findOne({ user_id: userId }).session(session);

        if (!candidate) {
            candidate = new Candidate({
                user_id: userId,
                uniquename: generateUniqueName(),
                name: name || 'New Candidate',
                gender: gender || 'other'
            });
        }

        if (req.file?.buffer) {
            const result = await uploadToCloudinary(req.file.buffer, 'worker-profile');
            candidate.image = result.secure_url;
        }

        if (name !== undefined) candidate.name = name;
        if (location !== undefined) candidate.location = location;
        if (date_of_birth !== undefined) candidate.date_of_birth = new Date(date_of_birth);

        // Address
        if (address !== undefined) {
            let addressObj = typeof address === 'string' ? JSON.parse(address) : address;

            // Validate required fields
            const requiredFields = ['country', 'state', 'city', 'pincode'];
            for (const field of requiredFields) {
                if (!addressObj[field]) {
                    throw new Error(`Address field "${field}" is required`);
                }
            }

            candidate.address = {
                country: addressObj.country,
                state: addressObj.state,
                city: addressObj.city,
                pincode: addressObj.pincode,
                countryIsoCode: addressObj.countryIsoCode || candidate.address?.countryIsoCode || '',
                stateIsoCode: addressObj.stateIsoCode || candidate.address?.stateIsoCode || ''
            };
        }

        if (pan_no !== undefined) candidate.pan_no = pan_no;
        if (contact_no !== undefined) candidate.contact_no = contact_no;
        if (id_type !== undefined) candidate.id_type = id_type.charAt(0).toUpperCase() + id_type.slice(1);
        if (id_detail !== undefined) candidate.id_detail = id_detail;
        if (gender !== undefined) candidate.gender = gender;

        if (expected_salary !== undefined) {
            candidate.expected_salary = typeof expected_salary === 'string'
                ? JSON.parse(expected_salary)
                : expected_salary;
        }

        if (education !== undefined) {
            candidate.education = typeof education === 'string'
                ? JSON.parse(education)
                : education;
        }

        if (certificates !== undefined) {
            candidate.certificates = typeof certificates === 'string'
                ? JSON.parse(certificates)
                : certificates;
        }

        if (skills !== undefined) {
            let skillsArray = typeof skills === 'string'
                ? JSON.parse(skills)
                : skills;
            if (!Array.isArray(skillsArray)) skillsArray = [skillsArray];
            candidate.skills = skillsArray
                .map(id => id ? new mongoose.Types.ObjectId(id) : null)
                .filter(Boolean);
        }

        if (services !== undefined) {
            let servicesArray = typeof services === 'string'
                ? JSON.parse(services)
                : services;
            candidate.services = Array.isArray(servicesArray)
                ? servicesArray.map(s => typeof s === 'object' ? s.name : s)
                : [];
        }

        if (available_for_join !== undefined) {
            candidate.available_for_join = available_for_join === 'true' || available_for_join === true;
        }

        if (joining_date !== undefined) candidate.joining_date = new Date(joining_date);

        if (portfolio_links !== undefined) {
            candidate.portfolio_links = typeof portfolio_links === 'string'
                ? JSON.parse(portfolio_links)
                : portfolio_links;
        }

        await candidate.save({ session });
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Candidate profile saved successfully',
            data: candidate.toObject()
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            success: false,
            message: 'Error saving candidate profile',
            error: error.message
        });
    }
};


