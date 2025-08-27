
import JobPosting from '../../Modal/JOB/JobPosting.js';
import Salon from '../../Modal/Salon/Salon.js';
import Candidate from '../../Modal/Candidate/Candidate.js';
import mongoose from 'mongoose';
import Skill from '../../Modal/skill/skill.js';
import suggestedCandidate from '../../Modal/RequestJobSuggestedCandidate/RequestJobSuggestCandidate.js';
import admin from '../../Utils/firebaseAdmin.js';
import User from '../../Modal/Users/User.js'


export const createJobPosting = async (req, res) => {
    try {
        // Find the salon associated with the current user
        const salon = await Salon.findOne({ user_id: req.user._id });

        if (!salon) {
            return res.status(404).json({
                success: false,
                message: 'Salon not found'
            });
        }

        // Extract skills and other job data from the request body
        const { skills = [], address, ...otherData } = req.body;

        // Validate that skills array is not empty
        if (skills.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one skill is required'
            });
        }

        // Validate skill IDs
        const validSkills = await Skill.find({ _id: { $in: skills } });
        const validSkillIds = validSkills.map(skill => skill._id);

        if (validSkillIds.length !== skills.length) {
            return res.status(400).json({
                success: false,
                message: 'Some skill IDs are invalid'
            });
        }

        // Prepare address data (use provided address or fallback to salon's address)
        const jobAddress = address || salon.address;

        if (!jobAddress?.country || !jobAddress?.state || !jobAddress?.city) {
            return res.status(400).json({
                success: false,
                message: 'Address must include country, state, and city'
            });
        }

        // Prepare job posting data
        const jobData = {
            salon_id: salon._id,
            ...otherData,
            required_skills: validSkillIds.map(id => new mongoose.Types.ObjectId(id)),
            address: {
                country: jobAddress.country,
                state: jobAddress.state,
                city: jobAddress.city,
                pincode: jobAddress.pincode || '',
                countryIsoCode: jobAddress.countryIsoCode || '',
                stateIsoCode: jobAddress.stateIsoCode || ''
            },
            location: `${jobAddress.city}, ${jobAddress.state}, ${jobAddress.country}`
        };

        // Create and save job posting
        const jobPosting = new JobPosting(jobData);
        await jobPosting.validate(); // Explicitly validate before saving
        await jobPosting.save();

        // Populate skills for frontend
        const populatedJob = await JobPosting.findById(jobPosting._id)
            .populate("required_skills");

        res.status(201).json({
            success: true,
            message: 'Job posting created successfully',
            data: populatedJob
        });

    } catch (error) {
        console.error('Error creating job posting:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating job posting',
            error: error.message
        });
    }
};




export const getSuggestedCandidates = async (req, res) => {
    try {
        // Find the salon for the logged-in user
        const salon = await Salon.findOne({ user_id: req.user._id });
        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        // Find the latest active job posting from this salon
        const latestJob = await JobPosting.findOne({
            salon_id: salon._id,
            is_active: true
        }).sort({ createdAt: -1 }).lean();

        if (!latestJob) {
            return res.status(404).json({
                success: false,
                message: 'No active job postings found for this salon'
            });
        }

        // Destructure relevant fields with defaults
        const {
            required_skills = [],
            address: jobAddress,
            gender_preference = 'Any',
            salary_range = { min: 0, max: 0 },
            job_type
        } = latestJob;

        // Validate job has required address information
        if (!jobAddress?.country || !jobAddress?.state) {
            return res.status(400).json({
                success: false,
                message: 'Job posting is missing required location information'
            });
        }

        // Build base query with address matching
        const query = {
            available_for_join: true,
            'expected_salary.min': { $lte: salary_range.max * 1.1 }, // 10% buffer
            'expected_salary.max': { $gte: salary_range.min * 0.9 }  // 10% buffer
        };

        // Handle location preferences
        if (jobAddress.country === 'India') {
            // For jobs in India, exclude candidates only looking outside India
            query.looking_job_location = { $ne: 'outside_india' };
            query.$or = [
                { 'address.state': jobAddress.state },
                { preferred_locations: jobAddress.state }
            ];

            // Optional: Add city matching if needed
            if (jobAddress.city) {
                query['address.city'] = jobAddress.city;
            }
        } else {
            // For jobs outside India, only show candidates looking outside India or both
            query.looking_job_location = { $in: ['outside_india', 'both'] };
            // Also check preferred_locations if specified
            if (jobAddress.country) {
                query.$or = [
                    { preferred_locations: jobAddress.country },
                    { preferred_locations: { $exists: false } }
                ];
            }
        }

        // Skill matching - candidates must have ALL required skills
        if (required_skills.length > 0) {
            query.skills = { $all: required_skills };
        }

        // Gender filter
        if (gender_preference !== 'Any') {
            query.gender = gender_preference.toLowerCase();
        }

        // Job type filter (if candidate schema has job_preference field)
        if (job_type) {
            query.job_preference = job_type;
        }

        // Find candidates matching the base criteria
        const candidates = await Candidate.find(query)
            .populate('skills')
            .lean();

        // Calculate matching score for each candidate (without experience consideration)
        const scoredCandidates = candidates.map(candidate => {
            const score = calculateMatchScore(candidate, latestJob);
            return { ...candidate, matchScore: score };
        });

        // Sort by match score (highest first)
        scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

        return res.status(200).json({
            success: true,
            message: 'Suggested candidates fetched successfully',
            data: scoredCandidates,
            job: latestJob
        });

    } catch (error) {
        console.error('Error fetching suggested candidates:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching suggested candidates',
            error: error.message
        });
    }
};
// Helper function to calculate comprehensive match score (0-100)
function calculateMatchScore(candidate, job) {
    let score = 0;

    // 1. Skill Matching (50% weight - increased from 40% since we removed experience)
    if (job.required_skills?.length > 0) {
        const matchedSkills = candidate.skills.filter(skill =>
            job.required_skills.includes(skill._id.toString())
        ).length;
        score += (matchedSkills / job.required_skills.length) * 50;
    }

    // 2. Location Matching (30% weight)
    if (job.address.country === 'India') {
        // For jobs in India
        if (candidate.address?.state === job.address.state) {
            score += 20; // base score for state match

            // Bonus for city match if available
            if (job.address?.city && candidate.address?.city === job.address.city) {
                score += 10;
            }
        } else if (candidate.preferred_locations?.includes(job.address.state)) {
            score += 15; // slightly less for preferred location match
        }
    } else {
        // For jobs outside India
        if (candidate.preferred_locations?.includes(job.address.country)) {
            score += 30; // full points for matching preferred country
        } else if (candidate.looking_job_location === 'outside_india' || candidate.looking_job_location === 'both') {
            score += 20; // base score for being open to outside India
        }
    }

    // 3. Salary Compatibility (20% weight)
    const candidateMidSalary = (candidate.expected_salary.min + candidate.expected_salary.max) / 2;
    const jobMidSalary = (job.salary_range.min + job.salary_range.max) / 2;

    if (jobMidSalary > 0) { // only calculate if salary is specified
        const salaryRatio = Math.min(candidateMidSalary, jobMidSalary) / Math.max(candidateMidSalary, jobMidSalary);
        score += salaryRatio * 20;
    } else {
        score += 20; // full points if no salary specified in job
    }

    return Math.min(Math.round(score), 100); // Cap at 100
}

export const RequestForJobToSuggestedCandidates = async (req, res) => {

    try {
        const { candidateId, jobid } = req.body;
        const salon = await Salon.findOne({ user_id: req.user._id });

        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });

        }
        const job = await JobPosting.findById(jobid)
            .populate('salon_id', 'salon_name brand_name image_path location contact_number');
        // Check if the job exists and belongs to the salon
        if (!job || job.salon_id.toString() !== salon._id.toString()) {
            return res.status(404).json({ success: false, message: 'Job not foundor not authorized' });
        }
        // Check if the job is active

        if (!job.is_active) {
            return res.status(400).json({ success: false, message: 'Job posting is closed' });
        }
        // Check if the candidate exists
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }
        // Check if the candidate has already applied for this job
        const existingApplication = await suggestedCandidate.findOne({
            candidate_id: candidate._id,
            job_id: job._id
        });

        if (existingApplication) {
            return res.status(400).json({ success: false, message: 'Candidate has already applied for this job' });
        }
        // Create a new job application
        const application = new suggestedCandidate({
            candidate_id: candidate._id,
            job_id: job._id,
            candidate_name: candidate.name,
            status: 'Pending'

        });
        await application.save();

        res.status(201).json({ success: true, message: 'Job application created successfully', data: application });
        // Send notification to candidate
        if (!candidate.devicetoken) {
            return res.status(400).json({ success: false, message: 'Candidate does not have a device token' });
        }
        // Assuming you have a function to send notifications via Firebase

        const title = `${job.salon_name} has a new job application request`;
        const message = `You have a new job application request for the position: ${job.job_title}. Please check your dashboard for details.`;
        await sendNOtification(candidateId, jobid, title, message);

    }
    catch (error) {
        console.error('Error requesting job to candidate:', error);
        res.status(500).json({
            success: false,
            message: 'Error requesting job to candidate',
            error: error.message
        });
    }
};

// Get all job postings with advanced filtering
export const getAllJobPostings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            job_title,
            country,
            state,
            city,
            gender_preference,
            salary_min,
            salary_max,
            job_type,
            required_experience
        } = req.query;

        const query = { is_active: true };

        // Search filter
        if (search) {
            query.$or = [
                { job_title: { $regex: search, $options: 'i' } },
                { job_description: { $regex: search, $options: 'i' } },
                { 'custom_job_title': { $regex: search, $options: 'i' } },
                { 'address.city': { $regex: search, $options: 'i' } }
            ];
        }

        // Job title filter
        if (job_title) query.job_title = job_title;

        // Location filters
        if (country) query['address.country'] = country;
        if (state) query['address.state'] = state;
        if (city) query['address.city'] = city;

        // Other filters
        if (gender_preference) query.gender_preference = gender_preference;
        if (job_type) query.job_type = job_type;
        if (required_experience) query.required_experience = required_experience;

        // Salary range filter
        if (salary_min || salary_max) {
            query.$and = [];
            if (salary_min) query.$and.push({ 'salary_range.max': { $gte: parseInt(salary_min) } });
            if (salary_max) query.$and.push({ 'salary_range.min': { $lte: parseInt(salary_max) } });
        }

        // Calculate pagination values
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        // Get total count for pagination info
        const total = await JobPosting.countDocuments(query);

        // Get paginated results with salon details
        const jobs = await JobPosting.find(query)
            .populate('salon_id', 'salon_name brand_name image_path address')
            .populate('required_skills')
            .sort({ posted_date: -1 })
            .skip(skip)
            .limit(pageSize);

        res.status(200).json({
            success: true,
            data: jobs,
            total,
            pages: Math.ceil(total / pageSize),
            currentPage: pageNumber
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching job postings',
            error: error.message
        });
    }
};

// Get personalized recommended jobs for candidate
export const getRecommendedJobs = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        // Get candidate profile with populated skills
        const candidate = await Candidate.findOne({ user_id: req.user._id })
            .populate('skills')
            .lean();

        if (!candidate) {
            return res.status(404).json({ success: false, message: 'Candidate profile not found' });
        }

        // Check if candidate is only looking for jobs outside India
        if (candidate.looking_job_location === 'outside_india') {
            return res.status(200).json({
                success: true,
                message: 'Our team will connect with you for international opportunities',
                data: [],
                total: 0,
                pages: 0,
                currentPage: 1
            });
        }

        // Base query filters
        const baseQuery = {
            is_active: true,
            $or: [
                { gender_preference: 'Any' },
                { gender_preference: candidate.gender.charAt(0).toUpperCase() + candidate.gender.slice(1) }
            ],
            'expected_salary.min': { $lte: candidate.expected_salary.max * 1.2 }, // 20% buffer
            'expected_salary.max': { $gte: candidate.expected_salary.min * 0.8 }   // 20% buffer
        };

        // Handle location preferences
        if (candidate.looking_job_location === 'india' || candidate.looking_job_location === '') {
            // For candidates looking in India or unspecified
            baseQuery.$or = [
                { 'address.country': candidate.address.country },
                { 'address.country': { $exists: false } }
            ];

            baseQuery.$and = [
                {
                    $or: [
                        { 'address.state': candidate.address.state },
                        { 'address.state': { $in: candidate.preferred_locations } }
                    ]
                }
            ];

            // Optional city filter
            if (candidate.address.city) {
                baseQuery['address.city'] = candidate.address.city;
            }
        } else if (candidate.looking_job_location === 'both') {
            // For candidates open to both India and international
            baseQuery.$or = [
                {
                    'address.country': candidate.address.country,
                    $or: [
                        { 'address.state': candidate.address.state },
                        { 'address.state': { $in: candidate.preferred_locations } }
                    ]
                },
                {
                    'address.country': { $ne: candidate.address.country },
                    'address.country': { $in: candidate.preferred_locations }
                }
            ];
        }

        // Get all potential jobs that match base criteria
        const potentialJobs = await JobPosting.find(baseQuery)
            .populate('salon_id', 'salon_name brand_name image_path address')
            .populate('required_skills')
            .lean();

        // Calculate match score for each job
        const scoredJobs = potentialJobs.map(job => {
            const score = calculateJobMatchScore(candidate, job);
            return { ...job, matchScore: score };
        });

        // Sort by match score (highest first)
        scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

        // Paginate results
        const paginatedJobs = scoredJobs.slice(skip, skip + pageSize);

        res.status(200).json({
            success: true,
            data: paginatedJobs,
            total: scoredJobs.length,
            pages: Math.ceil(scoredJobs.length / pageSize),
            currentPage: pageNumber
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching recommended jobs',
            error: error.message
        });
    }
};

// Calculate job match score (0-100)
function calculateJobMatchScore(candidate, job) {
    let score = 0;

    // 1. Skill Matching (40% weight)
    if (job.required_skills?.length > 0 && candidate.skills?.length > 0) {
        const candidateSkillIds = candidate.skills.map(s => s._id.toString());
        const matchedSkills = job.required_skills.filter(skill =>
            candidateSkillIds.includes(skill._id.toString())
        ).length;
        score += (matchedSkills / job.required_skills.length) * 40;
    }

    // 2. Location Matching (30% weight)
    if (job.address.country === candidate.address.country) {
        // For jobs in same country
        if (job.address.state === candidate.address.state) {
            score += 20; // base score for state match

            // Bonus for city match
            if (job.address.city && candidate.address.city === job.address.city) {
                score += 10;
            }
        } else if (candidate.preferred_locations?.includes(job.address.state)) {
            score += 15; // slightly less for preferred location match
        }
    } else {
        // For international jobs
        if (candidate.preferred_locations?.includes(job.address.country)) {
            score += 30; // full points for matching preferred country
        } else if (candidate.looking_job_location === 'both') {
            score += 20; // base score for being open to international
        }
    }

    // 3. Salary Compatibility (20% weight)
    const candidateMidSalary = (candidate.expected_salary.min + candidate.expected_salary.max) / 2;
    const jobMidSalary = (job.salary_range.min + job.salary_range.max) / 2;

    if (jobMidSalary > 0 && candidateMidSalary > 0) {
        const salaryRatio = Math.min(candidateMidSalary, jobMidSalary) / Math.max(candidateMidSalary, jobMidSalary);
        score += salaryRatio * 20;
    } else {
        score += 20; // full points if salary not specified
    }

    // 4. Job Type Preference (10% weight)
    if (job.job_type && candidate.job_preference === job.job_type) {
        score += 10;
    }

    return Math.min(Math.round(score), 100); // Cap at 100
}

// Get Job Posting by ID
export const getJobPostingById = async (req, res) => {
    try {
        const job = await JobPosting.findById(req.params.id)
            .populate('salon_id', 'salon_name brand_name image_path location contact_number');

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        res.status(200).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching job',
            error: error.message
        });
    }
};

// Update Job Posting
export const updateJobPosting = async (req, res) => {
    try {
        const salon = await Salon.findOne({ user_id: req.user._id });
        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        const job = await JobPosting.findOneAndUpdate(
            { _id: req.params.id, salon_id: salon._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found or not authorized' });
        }

        res.status(200).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating job',
            error: error.message
        });
    }
};

// Close Job Posting
export const closeJobPosting = async (req, res) => {
    try {
        const salon = await Salon.findOne({ user_id: req.user._id });
        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        const job = await JobPosting.findOneAndUpdate(
            { _id: req.params.id, salon_id: salon._id },
            { is_active: false },
            { new: true }
        );

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found or not authorized' });
        }

        res.status(200).json({ success: true, message: 'job closed', data: job });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error closing job',
            error: error.message
        });
    }
};



const sendNOtification = async (candidateId, jobId, title, message) => {
    try {
        // Assuming you have a function to send notifications via Firebase
        const candidate = await User.findById({ _id: candidateId });
        if (!candidate) {
            throw new Error('Candidate not found');

        }
        // Here you would implement the logic to send a notification to the candidate
        const notification = {
            title: title,
            body: message,
            data: {
                jobId: jobId,
                candidateId: candidateId
            }
        };
        // Example of sending a notification using Firebase Admin SDK
        await admin.messaging().sendToDevice(candidate.devicetoken, {
            notification: notification
        });
        // Log or handle the notification sending result
        // For example, you can log the success or failure of the notification
        // This is just a placeholder, implement your actual notification logic
        console.log(`Notification sent to ${candidate.name}: ${message}`);
        console.log(`Notification sent to Candidate ID: ${candidateId} for Job ID: ${jobId} - Message: ${message}`);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}       