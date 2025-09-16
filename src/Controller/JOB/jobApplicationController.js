import Candidate from '../../Modal/Candidate/Candidate.js';
import JobPosting from '../../Modal/JOB/JobPosting.js';
import JobApplication from '../../Modal/JOB/JobApplication.js';
import Salon from '../../Modal/Salon/Salon.js';
import mongoose from 'mongoose';
import JobPostingDummy from '../../Modal/Dummaydata/jobsDummay.js';
// Apply for Job
export const applyForJob = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const candidate = await Candidate.findOne({ user_id: req.user._id }).session(session);
        if (!candidate) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Candidate profile not found' });
        }

        let job = await JobPosting.findById(req.params.jobId).session(session);
        let isDummy = false;

        // If not found in real jobs, check dummy jobs
        if (!job) {
            job = await JobPostingDummy.findById(req.params.jobId).session(session);
            if (!job) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ success: false, message: 'Job not found or closed' });
            }
            isDummy = true;
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

        // Safe defaults for missing fields
        const requiredSkills = Array.isArray(job.required_skills) ? job.required_skills : [];
        const genderPreference = job.gender_preference || "Any";

        // Calculate match score
        const matchedSkills = requiredSkills.filter(skill =>
            candidate.skills.includes(skill)
        );

        // Create application
        const application = new JobApplication({
            candidate_id: candidate._id,
            job_id: job._id,
            cover_message: req.body.cover_message || "",
            expected_salary: req.body.expected_salary || null,
            availability: req.body.availability || null,
            gender_match: genderPreference === 'Any' || genderPreference === candidate.gender,
            status: isDummy ? 'Hired' : 'Applied'
        });

        await application.save({ session });
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ success: true, data: application });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ applyForJob error:", error);  // 👈 Add this to debug
        return res.status(500).json({
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
    if (str.length <= 4) return "*".repeat(str.length); // too short
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
};

// ---------------- Salon View ----------------
export const getJobApplications = async (req, res) => {
    try {
        const salon = await Salon.findOne({ user_id: req.user._id });
        if (!salon) {
            return res.status(404).json({ success: false, message: "Salon not found" });
        }

        const job = await JobPosting.findOne({
            _id: req.params.jobId,
            salon_id: salon._id,
        });
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found for this salon" });
        }

        const { status } = req.query;
        const query = { job_id: job._id };
        if (status) query.status = status;

        let applications = await JobApplication.find(query)
            .populate({
                path: "candidate_id",
                select: "name contact_no gender skills experience",
            })
            .populate({
                path: "job_id",
                select: "job_title location",
            })
            .sort({ skill_match_score: -1, application_date: -1 });

        // Mask data unless Hired
        applications = applications.map((app) => {
            const candidate = app.candidate_id;
            const isHired = app.status === "Hired";

            return {
                _id: app._id,
                candidate_name: isHired ? candidate?.name : maskName(candidate?.name),
                whatsapp_number: isHired ? candidate?.contact_no : maskNumber(candidate?.contact_no),
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

// ---------------- Candidate View ----------------
export const getMyApplications = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ user_id: req.user._id });
        if (!candidate) {
            return res.status(404).json({ success: false, message: 'Please complete your profile to continue.' });
        }

        const { status } = req.query;
        const query = { candidate_id: candidate._id };
        if (status) query.status = status;

        let applications = await JobApplication.find(query)
            .populate({
                path: 'job_id',
                select: 'job_title location salary_range',
                populate: {
                    path: 'salon_id',
                    select: 'salon_name whatsapp_number brand_name image_path'
                }
            })
            .sort({ application_date: -1 });

        // Mask salon data unless Hired
        applications = applications.map(app => {
            const salon = app.job_id?.salon_id;
            const isHired = app.status === "Hired";

            return {
                _id: app._id,
                job_title: app.job_id?.job_title || "",
                location: app.job_id?.location || "",
                salary_range: app.job_id?.salary_range || "",
                salon_name: isHired ? salon?.salon_name : maskName(salon?.salon_name),
                salon_whatsapp: isHired ? salon?.whatsapp_number : maskNumber(salon?.whatsapp_number),
                brand_name: salon?.brand_name || "",
                image_path: salon?.image_path || "",
                status: app.status,
                application_date: app.application_date,
            };
        });

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