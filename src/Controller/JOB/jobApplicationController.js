import Candidate from '../../Modal/Candidate/Candidate.js';
import JobPosting from '../../Modal/JOB/JobPosting.js';
import JobApplication from '../../Modal/JOB/JobApplication.js';
import Salon from '../../Modal/Salon/Salon.js';
import mongoose from 'mongoose';
// Apply for Job
export const applyForJob = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const candidate = await Candidate.findOne({ user_id: req.user._id }).session(session);
        if (!candidate) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Candidate profile not found' });
        }

        const job = await JobPosting.findById(req.params.jobId).session(session);
        if (!job || !job.is_active) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Job not found or closed' });
        }

        // Check if already applied
        const existingApplication = await JobApplication.findOne({
            candidate_id: candidate._id,
            job_id: job._id
        }).session(session);

        if (existingApplication) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Already applied to this job' });
        }

        // Calculate match score
        const matchedSkills = job.required_skills.filter(skill =>
            candidate.skills.includes(skill));

        const application = new JobApplication({
            candidate_id: candidate._id,
            job_id: job._id,
            cover_message: req.body.cover_message,
            expected_salary: req.body.expected_salary,
            availability: req.body.availability,
            gender_match: job.gender_preference === 'Any' || job.gender_preference === candidate.gender,
        });

        await application.save({ session });
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: application });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            success: false,
            message: 'Error applying for job',
            error: error.message
        });
    }
};

// Get Applications for Job (Salon View)
// Get Job Applications (Salon View)
const maskNumber = (number) => {
    if (!number) return "";
    const str = number.toString();
    const last4 = str.slice(-4);
    return "*".repeat(str.length - 4) + last4;
};

export const maskName = (name) => {
    if (!name) return "";
    if (name.length <= 2) return name[0] + "*"; // short names
    const firstLetter = name[0];
    const lastLetter = name.length > 2 ? name[name.length - 1] : "";
    const middleMask = "*".repeat(name.length - 2);
    return `${firstLetter}${middleMask}${lastLetter}`;
}
export const getJobApplications = async (req, res) => {
    try {
        // Find salon by logged-in user
        const salon = await Salon.findOne({ user_id: req.user._id });

        if (!salon) {
            return res.status(404).json({ success: false, message: "Salon not found" });
        }

        // Ensure job belongs to this salon
        const job = await JobPosting.findOne({
            _id: req.params.jobId,
            salon_id: salon._id,
        });

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found for this salon" });
        }

        // Build query for JobApplication
        const { status } = req.query;
        const query = { job_id: job._id };
        if (status) query.status = status;

        // Fetch applications
        let applications = await JobApplication.find(query)
            .populate({
                path: "candidate_id",
                select: "name whatsapp_number gender skills experience", // fetch more details
            })
            .populate({
                path: "job_id",
                select: "job_title location",
            })
            .sort({ skill_match_score: -1, application_date: -1 });

        // Format response with masked WhatsApp and selected details
        applications = applications.map((app) => {
            const candidate = app.candidate_id;
            return {
                _id: app._id,
                candidate_name: maskName(candidate?.name) || "",
                whatsapp_number: maskNumber(candidate?.whatsapp_number),
                gender: candidate?.gender || "",
                skills: candidate?.skills || [],
                experience: candidate?.experience || 0,
                job_title: app.job_id?.job_title || "",
                location: app.job_id?.location || "",
                status: app.status,
                application_date: app.application_date,
                skill_match_score: app.skill_match_score,
            };
        });

        res.status(200).json({
            success: true,
            data: applications,
            total: applications.length,
        });
    } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching applications",
            error: error.message,
        });
    }
};




// Get My Applications (Candidate View)
export const getMyApplications = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ user_id: req.user._id });
        if (!candidate) {
            return res.status(404).json({ success: false, message: 'Please complete your profile to continue.' });
        }

        const { status } = req.query;

        const query = { candidate_id: candidate._id };
        if (status) query.status = status;

        const applications = await JobApplication.find(query)
            .populate({
                path: 'job_id',
                select: 'job_title location salary_range',
                populate: {
                    path: 'salon_id',
                    select: 'salon_name brand_name image_path'
                }
            })
            .sort({ application_date: -1 });

        res.status(200).json({
            success: true,
            data: applications,
            total: applications.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message
        });
    }
};


// Update Application Status
export const updateApplicationStatus = async (req, res) => {
    try {
        const salon = await Salon.findOne({ user_id: req.user._id });
        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        const application = await JobApplication.findOneAndUpdate(
            {
                _id: req.params.applicationId,
                job_id: { salon_id: salon._id }
            },
            { status: req.body.status },
            { new: true }
        )
            .populate('candidate_id', 'name contact_no')
            .populate('job_id', 'job_title');

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found or not authorized' });
        }

        res.status(200).json({ success: true, data: application });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating application',
            error: error.message
        });
    }
};

// Schedule Interview
export const scheduleInterview = async (req, res) => {
    try {
        const salon = await Salon.findOne({ user_id: req.user._id });
        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        const application = await JobApplication.findOneAndUpdate(
            {
                _id: req.params.applicationId,
                job_id: { salon_id: salon._id }
            },
            {
                status: 'Interview Scheduled',
                $push: {
                    interview_details: {
                        date: req.body.date,
                        time: req.body.time,
                        location: req.body.location || salon.address,
                        notes: req.body.notes,
                        status: 'Scheduled'
                    }
                }
            },
            { new: true }
        )
            .populate('candidate_id', 'name contact_no')
            .populate('job_id', 'job_title');

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found or not authorized' });
        }

        res.status(200).json({ success: true, data: application });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error scheduling interview',
            error: error.message
        });
    }
};