


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
            preferred_locations,
            date_of_birth,
            address,
            pan_no,
            contact_no,
            id_type,
            id_detail,
            education,
            certificates,
            skills,
            services,
            looking_job_location,
            joining_date,
            portfolio_links,
            gender,
            expected_salary,
            available_for_join
        } = req.body;

        let candidate = await Candidate.findOne({ user_id: userId }).session(session);

        if (!candidate) {
            candidate = new Candidate({
                user_id: userId,
                uniquename: generateUniqueName(),
                name: name || 'New Candidate',
                gender: gender || 'other',
                address: {
                    country: "",
                    state: "",
                    city: "",
                    pincode: "",
                    countryIsoCode: "",
                    stateIsoCode: ""
                }
            });
        }

        /** ---------------------------
         * Job Location Validation
         ---------------------------- */
        // if (looking_job_location && !['india', 'outside_india', 'both', ''].includes(looking_job_location)) {
        //     throw new Error('Invalid looking_job_location value. Must be "india", "outside_india", "both", or "".');
        // }
        // if ((looking_job_location === 'india' || looking_job_location === 'both') &&
        //     (!preferred_locations || (Array.isArray(preferred_locations) && preferred_locations.length === 0))) {
        //     throw new Error('At least one preferred location is required for India or Both job locations.');
        // }

        /** ---------------------------
         * Profile Image Upload
         ---------------------------- */
        if (req.file?.buffer) {
            const result = await uploadToCloudinary(req.file.buffer, 'worker-profile');
            candidate.image = result.secure_url;
        }

        /** ---------------------------
         * Basic Details
         ---------------------------- */
        if (name !== undefined) candidate.name = name;
        if (location !== undefined) candidate.location = location;

        /** Preferred Locations */
        if (preferred_locations !== undefined) {
            let locationsArray = typeof preferred_locations === 'string'
                ? JSON.parse(preferred_locations)
                : preferred_locations;
            candidate.preferred_locations = Array.isArray(locationsArray) ? locationsArray : [];
        }

        /** Date of Birth */
        if (date_of_birth !== undefined) {
            const parsedDOB = new Date(date_of_birth);
            if (!isNaN(parsedDOB.getTime())) {
                candidate.date_of_birth = parsedDOB;
            }
        }

        /** Address */
        if (address !== undefined) {
            let addressObj = typeof address === 'string' ? JSON.parse(address) : address;
            candidate.address = {
                country: addressObj.country || candidate.address?.country || '',
                state: addressObj.state || candidate.address?.state || '',
                city: addressObj.city || candidate.address?.city || '',
                pincode: addressObj.pincode || candidate.address?.pincode || '',
                countryIsoCode: addressObj.countryIsoCode || candidate.address?.countryIsoCode || '',
                stateIsoCode: addressObj.stateIsoCode || candidate.address?.stateIsoCode || ''
            };
        }

        if (pan_no !== undefined) candidate.pan_no = pan_no;
        if (contact_no !== undefined) candidate.contact_no = contact_no;

        /** ---------------------------
         * ID Type + ID Details
         ---------------------------- */
        if (id_type !== undefined && id_type.trim() !== "") {
            candidate.id_type = id_type;
        }

        if (id_detail !== undefined) {
            let idDetailObj = typeof id_detail === 'string' ? JSON.parse(id_detail) : id_detail;

            if (req.files?.id_front) {
                const frontUpload = await uploadToCloudinary(req.files.id_front[0].buffer, 'id-cards');
                idDetailObj.front_image = frontUpload.secure_url;
            }
            if (req.files?.id_back) {
                const backUpload = await uploadToCloudinary(req.files.id_back[0].buffer, 'id-cards');
                idDetailObj.back_image = backUpload.secure_url;
            }

            candidate.id_detail = {
                number: idDetailObj.number || candidate.id_detail?.number || '',
                front_image: idDetailObj.front_image || candidate.id_detail?.front_image || '',
                back_image: idDetailObj.back_image || candidate.id_detail?.back_image || ''
            };
        }

        /** Gender */
        if (gender !== undefined) candidate.gender = gender;

        /** Expected Salary */
        if (expected_salary !== undefined) {
            let salaryObj = typeof expected_salary === 'string'
                ? JSON.parse(expected_salary)
                : expected_salary;
            candidate.expected_salary = {
                min: salaryObj.min || 0,
                max: salaryObj.max || 0
            };
        }

        /** Education */
        if (education !== undefined) {
            candidate.education = typeof education === 'string'
                ? JSON.parse(education)
                : education;
        }

        /** Certificates */
        if (certificates !== undefined) {
            candidate.certificates = typeof certificates === 'string'
                ? JSON.parse(certificates)
                : certificates;
        }

        /** Skills */
        if (skills !== undefined) {
            let skillsArray = typeof skills === 'string'
                ? JSON.parse(skills)
                : skills;
            if (!Array.isArray(skillsArray)) skillsArray = [skillsArray];
            candidate.skills = skillsArray
                .map(id => id ? new mongoose.Types.ObjectId(id) : null)
                .filter(Boolean);
        }

        /** Services */
        if (services !== undefined) {
            let servicesArray = typeof services === 'string'
                ? JSON.parse(services)
                : services;
            candidate.services = Array.isArray(servicesArray)
                ? servicesArray.map(s => typeof s === 'object' ? s.name : s)
                : [];
        }

        /** Looking Job Location */
        if (looking_job_location !== undefined) candidate.looking_job_location = looking_job_location;

        /** Joining Date (Safe parse) */
        if (joining_date !== undefined) {
            const parsedDate = new Date(joining_date);
            if (!isNaN(parsedDate.getTime())) {
                candidate.joining_date = parsedDate;
            }
        }

        /** Portfolio Links */
        if (portfolio_links !== undefined) {
            candidate.portfolio_links = typeof portfolio_links === 'string'
                ? JSON.parse(portfolio_links)
                : portfolio_links;
        }

        /** Available for Join */
        if (available_for_join !== undefined) candidate.available_for_join = available_for_join;

        /** ---------------------------
         * Save & Commit
         ---------------------------- */
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




export const getAllCandidates = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "desc",
            country,
            state,
            city,
            skill
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        // Build query object
        let query = {};

        // Search by candidate name or location
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } }
            ];
        }

        // Filters
        if (country) query["address.country"] = country;
        if (state) query["address.state"] = state;
        if (city) query["address.city"] = city;

        // Filter by skill
        if (skill) {
            query.skills = skill; // skill should be ObjectId from Skill model
        }

        // Sorting
        let sortOptions = {};
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

        // Fetch candidates
        const candidates = await Candidate.find(query)
            .select("name location address skills expected_salary") // only required fields
            .populate("skills", "name") // populate skills with only name
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);

        // Count total
        const totalCandidates = await Candidate.countDocuments(query);

        res.status(200).json({
            success: true,
            page,
            totalPages: Math.ceil(totalCandidates / limit),
            totalCandidates,
            data: candidates
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

