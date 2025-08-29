import Candidate from '../../Modal/Candidate/Candidate.js';
import JobPosting from '../../Modal/JOB/JobPosting.js';
import JobApplication from '../../Modal/JOB/JobApplication.js';
import Salon from '../../Modal/Salon/Salon.js';
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
        const skillMatchScore = (matchedSkills.length / job.required_skills.length) * 100;

        const application = new JobApplication({
            candidate_id: candidate._id,
            job_id: job._id,
            cover_message: req.body.cover_message,
            expected_salary: req.body.expected_salary,
            availability: req.body.availability,
            gender_match: job.gender_preference === 'Any' || job.gender_preference === candidate.gender,
            skill_match_score: skillMatchScore
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
export const getJobApplications = async (req, res) => {
    try {
        const salon = await Salon.findOne({ user_id: req.user._id });
        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        const { page = 1, limit = 10, status, gender, min_match_score } = req.query;

        const query = {
            job_id: req.params.jobId,
            'job_id.salon_id': salon._id
        };

        if (status) query.status = status;
        if (gender) query['candidate_id.gender'] = gender;
        if (min_match_score) query.skill_match_score = { $gte: parseInt(min_match_score) };

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            populate: [
                { path: 'candidate_id', select: 'name gender skills experience image' },
                { path: 'job_id', select: 'job_title location' }
            ],
            sort: { skill_match_score: -1, application_date: -1 }
        };

        const result = await JobApplication.paginate(query, options);

        res.status(200).json({
            success: true,
            data: result.docs,
            total: result.totalDocs,
            pages: result.totalPages,
            currentPage: result.page
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message
        });
    }
};



// Get My Applications (Candidate View)
export const getMyApplications = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ user_id: req.user._id });
        if (!candidate) {
            return res.status(404).json({ success:false, message: 'Please complete your profile to continue.' });
        }

        const { page = 1, limit = 10, status } = req.query;

        const query = { candidate_id: candidate._id };
        if (status) query.status = status;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            populate: [
                {
                    path: 'job_id', select: 'job_title location salary_range', populate: {
                        path: 'salon_id', select: 'salon_name brand_name image_path'
                    }
                }
            ],
            sort: { application_date: -1 }
        };

        const result = await JobApplication.paginate(query, options);

        res.status(200).json({
            success: true,
            data: result.docs,
            total: result.totalDocs,
            pages: result.totalPages,
            currentPage: result.page
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