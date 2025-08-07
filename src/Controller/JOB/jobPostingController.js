
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
        const { skills = [], ...otherData } = req.body;

        // Validate skill IDs - check which ones exist in the database
        const validSkills = await Skill.find({ _id: { $in: skills } });

        // If no valid skills found and skills were provided, warn the user
        if (skills.length > 0 && validSkills.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid skill IDs provided'
            });
        }

        // Extract only valid skill IDs
        const validSkillIds = validSkills.map(skill => skill._id);

        // Prepare job posting data
        const jobData = {
            salon_id: salon._id,
            ...otherData,
            skills: validSkillIds,
            location: otherData.location || salon.location
        };

        // Create and save job posting
        const jobPosting = new JobPosting(jobData);
        await jobPosting.save();

        // Send response
        res.status(201).json({
            success: true,
            message: 'Job posting created successfully',
            data: jobPosting
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
            return res.status(404).json({
                success: false,
                message: 'Salon not found'
            });
        }

        // Find the latest job posting from this salon
        const latestJob = await JobPosting.findOne({ salon_id: salon._id })
            .sort({ createdAt: -1 })
            .lean();

        if (!latestJob) {
            return res.status(404).json({
                success: false,
                message: 'No job postings found for this salon'
            });
        }

        // Destructure relevant fields
        const { required_skills = [], location, gender_preference, salary_range } = latestJob;

        // Build query for candidate suggestions
        const query = {
            available_for_join: true,
            skills: { $in: required_skills },
            location: location,
            'expected_salary.min': { $lte: salary_range.max },  // expected salary fits
            'expected_salary.max': { $gte: salary_range.min }
        };

        // Optional: Apply gender preference (if not 'Any')
        if (gender_preference && gender_preference !== 'Any') {
            query.gender = gender_preference; // You can add gender to Candidate schema if needed
        }

        const suggestedCandidates = await Candidate.find(query)
            .populate('skills') // Optional: show skill details
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Suggested candidates fetched successfully',
            data: suggestedCandidates,
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


// Get Recommended Jobs for Candidate
export const getAllJobPostings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            job_title,
            location,
            gender_preference,
            salary_min,
            salary_max
        } = req.query;

        const query = { is_active: true };

        // Search filter
        if (search) {
            query.$or = [
                { job_title: { $regex: search, $options: 'i' } },
                { job_description: { $regex: search, $options: 'i' } },
                { 'custom_job_title': { $regex: search, $options: 'i' } }
            ];
        }

        // Other filters
        if (job_title) query.job_title = job_title;
        if (location) query.location = { $regex: location, $options: 'i' };
        if (gender_preference) query.gender_preference = gender_preference;
        if (salary_min || salary_max) {
            query['salary_range.min'] = { $gte: parseInt(salary_min) || 0 };
            query['salary_range.max'] = { $lte: parseInt(salary_max) || 1000000 };
        }

        // Calculate pagination values
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        // Get total count for pagination info
        const total = await JobPosting.countDocuments(query);

        // Get paginated results
        const jobs = await JobPosting.find(query)
            .populate('salon_id', 'salon_name brand_name image_path')
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

// Get Recommended Jobs for Candidate
export const getRecommendedJobs = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ user_id: req.user._id });
        if (!candidate) {
            return res.status(404).json({ success: false, message: 'Candidate profile not found' });
        }

        const { page = 1, limit = 10 } = req.query;

        const baseQuery = {
            is_active: true,
            gender_preference: { $in: [candidate.gender, 'Any'] },
            location: { $regex: candidate.location, $options: 'i' }
        };

        // First get exact matches
        const exactMatchJobs = await JobPosting.find({
            ...baseQuery,
            required_skills: { $in: candidate.skills }
        })
            .populate('salon_id', 'salon_name brand_name image_path')
            .sort({ posted_date: -1 });

        // Then get partial matches if needed
        if (exactMatchJobs.length < limit) {
            const partialMatchJobs = await JobPosting.find({
                ...baseQuery,
                required_skills: { $not: { $in: candidate.skills } }
            })
                .populate('salon_id', 'salon_name brand_name image_path')
                .sort({ posted_date: -1 })
                .limit(limit - exactMatchJobs.length);

            const allJobs = [...exactMatchJobs, ...partialMatchJobs].slice(0, limit);

            return res.status(200).json({
                success: true,
                data: allJobs,
                total: allJobs.length
            });
        }

        res.status(200).json({
            success: true,
            data: exactMatchJobs,
            total: exactMatchJobs.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching recommended jobs',
            error: error.message
        });
    }
};

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