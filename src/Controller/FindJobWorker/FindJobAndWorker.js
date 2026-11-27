import JobPosting from "../../Modal/JOB/JobPosting.js";
import Candidate from "../../Modal/Candidate/Candidate.js";

import Salon from "../../Modal/Salon/Salon.js";
import Emp from '../../Modal/Dummaydata/Emp.js'
import JobApplication from "../../Modal/JOB/JobApplication.js";
import SuggestedCandidate from "../../Modal/RequestJobSuggestedCandidate/RequestJobSuggestCandidate.js";
import Skill from "../../Modal/skill/skill.js";

// Helper function to mask sensitive information
const maskData = {
    // Mask name: John Doe -> J*** D***
    maskName: (name) => {
        if (!name) return '';
        const names = name.split(' ');
        return names.map(n => n.length > 2 ? n.charAt(0) + '*'.repeat(n.length - 2) + n.charAt(n.length - 1) : n).join(' ');
    },

    // Mask phone number: 1234567890 -> 123****890
    maskPhone: (phone) => {
        if (!phone) return '';
        if (phone.length <= 6) return phone;
        const visibleDigits = 3;
        const firstPart = phone.substring(0, visibleDigits);
        const lastPart = phone.substring(phone.length - visibleDigits);
        return firstPart + '*'.repeat(phone.length - visibleDigits * 2) + lastPart;
    },

    // Mask WhatsApp number
    maskWhatsApp: (whatsapp) => {
        if (!whatsapp) return '';
        return maskData.maskPhone(whatsapp);
    },

    // Partial address display
    partialAddress: (address) => {
        if (!address) return {};
        return {
            country: address.country,
            state: address.state,
            city: address.city,
            // Don't show full pincode for privacy
            pincode: address.pincode ? address.pincode.substring(0, 2) + '***' : ''
        };
    }
};

// Escape a string so it can be used safely inside a RegExp
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Job gender_preference is stored as 'Male' | 'Female' | 'Any'
const getJobGenderValues = (gender) => {
    if (!gender) return [];
    const normalized = String(gender).trim().toLowerCase();
    if (normalized !== 'male' && normalized !== 'female') return [];
    return [normalized.charAt(0).toUpperCase() + normalized.slice(1)];
};

// Premium candidates store skill ObjectIds, dummy employees store skill names.
// Resolve both to a list of Skill IDs so job filtering works for both.
const getCandidateSkillIds = async (candidate, isPremium) => {
    const skills = candidate.skills || [];

    if (isPremium) {
        return skills
            .filter(skill => skill && skill._id)
            .map(skill => skill._id);
    }

    const skillNames = skills
        .map(skill => (typeof skill === 'string' ? skill : skill?.skill_name || skill?.name))
        .filter(Boolean)
        .map(name => String(name).trim())
        .filter(Boolean);

    if (!skillNames.length) return [];

    const matchedSkills = await Skill.find({
        skill_name: { $in: skillNames.map(name => new RegExp(`^${escapeRegex(name)}$`, 'i')) }
    })
        .select('_id')
        .lean()
        .exec();

    return matchedSkills.map(skill => skill._id);
};

export const findWorkersForJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        const jobPost = await JobPosting.findById(jobId)
            .populate('required_skills')
            .populate('salon_id')
            .exec();

        if (!jobPost) {
            return res.status(404).json({
                success: false,
                message: 'Job post not found'
            });
        }

        if (!jobPost.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Job post is not active'
            });
        }

        // Build filter tiers from strict to relaxed. The first tier that returns
        // results wins, so a worker is never hidden just because the gender,
        // skill, location or salary filter is too strict - we fall back to all
        // available candidates instead of returning an empty list.
        const jobSkillIds = (jobPost.required_skills || [])
            .filter(skill => skill && skill._id)
            .map(skill => skill._id);

        const jobStates = [jobPost.address?.state].filter(Boolean);

        const buildWorkerCriteria = (tier) => {
            const criteria = { available_for_join: true };

            // Gender filter (only when the job wants a specific gender)
            if (tier.gender && jobPost.gender_preference && jobPost.gender_preference !== 'Any') {
                criteria.gender = jobPost.gender_preference.toLowerCase();
            }

            // Skill filter (candidate must have at least one required skill)
            if (tier.skill && jobSkillIds.length) {
                criteria.skills = { $in: jobSkillIds };
            }

            // Location filter
            if (tier.location && jobStates.length) {
                criteria.$or = [
                    { 'preferred_locations': { $in: jobStates } },
                    { 'preferred_locations': { $size: 0 } } // Include candidates with no location preference
                ];
            }

            // Salary range filter
            if (tier.salary && (jobPost.salary_range?.min > 0 || jobPost.salary_range?.max > 0)) {
                criteria.$and = [{
                    $or: [
                        {
                            $and: [
                                { 'expected_salary.min': { $lte: jobPost.salary_range.max || Number.MAX_SAFE_INTEGER } },
                                { 'expected_salary.max': { $gte: jobPost.salary_range.min } }
                            ]
                        },
                        {
                            $and: [
                                { 'expected_salary.min': 0 },
                                { 'expected_salary.max': 0 }
                            ]
                        }
                    ]
                }];
            }

            return criteria;
        };

        const workerFilterTiers = [
            { name: 'all_filters', gender: true, skill: true, location: true, salary: true },
            { name: 'without_location', gender: true, skill: true, location: false, salary: true },
            { name: 'without_gender', gender: false, skill: true, location: false, salary: true },
            { name: 'all_candidates', gender: false, skill: false, location: false, salary: false }
        ];

        let matchingCandidates = [];
        let appliedFilters = 'all_candidates';
        const triedWorkerCriteria = new Set();

        for (const tier of workerFilterTiers) {
            const criteria = buildWorkerCriteria(tier);
            const signature = JSON.stringify(criteria);

            // Skip tiers that are identical to one already tried
            if (triedWorkerCriteria.has(signature)) continue;
            triedWorkerCriteria.add(signature);

            const candidates = await Candidate.find(criteria)
                .populate('skills')
                .exec();

            if (candidates.length) {
                matchingCandidates = candidates;
                appliedFilters = tier.name;
                break;
            }
        }

        // Fetch suggested candidates for the jobId
        const suggestedCandidates = await SuggestedCandidate.find({ job_id: jobId })
            .select('candidate_id status')
            .lean()
            .exec();

        // Create a map of candidate IDs to their status for quick lookup
        const suggestedCandidateMap = new Map(
            suggestedCandidates.map(sc => [sc.candidate_id.toString(), sc.status])
        );
        
        matchingCandidates = matchingCandidates.filter(c => c.available_for_join);

        // Calculate match score for each candidate and include status
        const candidatesWithScores = matchingCandidates.map(candidate => {
            const score = calculateMatchScore(candidate, jobPost);

            // Check if candidate is in SuggestedCandidate for this job
            const candidateStatus = suggestedCandidateMap.get(candidate._id.toString()) || 'not_suggested';

            return {
                candidate: {
                    _id: candidate._id,
                    name: candidate.name || candidate.user_id?.name, // Masked name
                    image: candidate.image,
                    gender: candidate.gender,
                    location: candidate.location || candidate.looking_job_location,
                    skills: candidate.skills,
                    expected_salary: candidate.expected_salary,
                    available_for_join: candidate.available_for_join,
                    preferred_locations: candidate.preferred_locations,
                    contact_no: candidate.contact_no || candidate.user_id?.contact_no, // Masked phone
                    whatsapp_number:candidate.whatsapp_number, // Masked WhatsApp
                    address: candidate.address, // Partial address
                    status: candidateStatus // Add status from SuggestedCandidate or 'Not Suggested'
                },
                matchScore: score,
                matchingSkills: getMatchingSkills(candidate.skills, jobPost.required_skills)
            };
        });

        // Sort by match score (descending)
        candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);

        const jobPostResponse = {
            _id: jobPost._id,
            job_title: jobPost.job_title,
            custom_job_title: jobPost.custom_job_title,
            salon_id: jobPost.salon_id ? {
                _id: jobPost.salon_id._id,
                salon_name: jobPost.salon_id.salon_name,
                brand_name: jobPost.salon_id.brand_name,
                contact_number: jobPost.salon_id.contact_number,
                whatsapp_number: jobPost.salon_id.whatsapp_number,
                address: jobPost.salon_id.address
            } : null,
            required_skills: jobPost.required_skills,
            gender_preference: jobPost.gender_preference,
            salary_range: jobPost.salary_range,
            address: jobPost.address,
            is_active: jobPost.is_active,
            is_premium: true
        };

        res.status(200).json({
            success: true,
            data: {
                jobPost: jobPostResponse,
                totalMatches: candidatesWithScores.length,
                filtersApplied: appliedFilters,
                candidates: candidatesWithScores
            }
        });

    } catch (error) {
        console.error('Error finding workers for job:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};






export const findJobsForWorker = async (req, res) => {
    try {
        const { candidateId } = req.params;

        // First try to find in premium candidates
        let candidate = await Candidate.findOne({ user_id: candidateId })
            .populate('skills')
            .exec();

        let isPremium = true;

        // If not found in premium, try in dummy data
        if (!candidate) {
            // Emp's user_id is embedded { name, contact_no }, not ObjectId ref
            candidate = await Emp.findOne({ 'user_id.name': candidateId }).exec();
            isPremium = false;

            if (!candidate) {
                return res.status(404).json({
                    success: false,
                    message: 'Candidate not found'
                });
            }
        }

        // Resolve candidate skills to Skill IDs (premium candidates already store
        // ObjectIds, dummy employees store plain skill names).
        const candidateSkillIds = await getCandidateSkillIds(candidate, isPremium);

        // Gender values accepted by the job's gender_preference enum
        const candidateGenderValues = getJobGenderValues(candidate.gender);

        // Locations the candidate is interested in
        const candidateStates = [
            ...(candidate.preferred_locations || []),
            candidate.address?.state,
            candidate.looking_job_location
        ].filter(Boolean);

        // Build filter tiers from strict to relaxed. The first tier that returns
        // jobs wins, so when gender/skill/location has no matching job we still
        // show all available jobs instead of an empty list.
        const buildJobCriteria = (tier) => {
            const criteria = { is_active: true };

            // Gender filter (candidate gender must match the job preference or 'Any')
            if (tier.gender && candidateGenderValues.length) {
                criteria.gender_preference = { $in: [...candidateGenderValues, 'Any'] };
            }

            // Skill filter (job must require at least one of the candidate's skills,
            // or not require any specific skill)
            if (tier.skill && candidateSkillIds.length) {
                criteria.$or = [
                    { required_skills: { $in: candidateSkillIds } },
                    { required_skills: { $size: 0 } }
                ];
            }

            // Location filter
            if (tier.location && candidateStates.length) {
                criteria['address.state'] = { $in: candidateStates };
            }

            return criteria;
        };

        const jobFilterTiers = [
            { name: 'all_filters', gender: true, skill: true, location: true },
            { name: 'without_location', gender: true, skill: true, location: false },
            { name: 'without_gender', gender: false, skill: true, location: false },
            { name: 'all_jobs', gender: false, skill: false, location: false }
        ];

        let matchingJobs = [];
        let appliedFilters = 'all_jobs';
        const triedJobCriteria = new Set();

        for (const tier of jobFilterTiers) {
            const criteria = buildJobCriteria(tier);
            const signature = JSON.stringify(criteria);

            // Skip tiers that are identical to one already tried
            if (triedJobCriteria.has(signature)) continue;
            triedJobCriteria.add(signature);

            const jobs = await JobPosting.find(criteria)
                .populate('required_skills')
                .populate('salon_id')
                .exec();

            if (jobs.length) {
                matchingJobs = jobs;
                appliedFilters = tier.name;
                break;
            }
        }

        // Fetch job applications for the candidateId
        const jobApplications = await JobApplication.find({ candidate_id: candidate._id })
            .select('job_id status')
            .lean()
            .exec();

        // Create a map of job IDs to their application status for quick lookup
        const jobApplicationMap = new Map(
            jobApplications.map(ja => [ja.job_id.toString(), ja.status])
        );

        // Calculate match score for each job and include application status
        const jobsWithScores = matchingJobs.map(jobPost => {
            const score = calculateJobMatchScore(candidate, jobPost);
            const applicationStatus = jobApplicationMap.get(jobPost._id.toString()) || 'Not Applied';

            const jobResponse = {
                _id: jobPost._id,
                job_title: jobPost.job_title,
                custom_job_title: jobPost.custom_job_title,
                salon_id: jobPost.salon_id ? {
                    _id: jobPost.salon_id._id,
                    salon_name: maskData.maskName(jobPost.salon_id.salon_name || ''),
                    brand_name: maskData.maskName(jobPost.salon_id.brand_name || ''),
                    contact_number: maskData.maskPhone(jobPost.salon_id.contact_number || ''),
                    whatsapp_number: maskData.maskWhatsApp(jobPost.salon_id.whatsapp_number || ''),
                    address: maskData.partialAddress(jobPost.salon_id.address || {})
                } : null,
                required_skills: jobPost.required_skills || [],
                gender_preference: jobPost.gender_preference,
                salary_range: jobPost.salary_range,
                job_type: jobPost.job_type,
                work_timings: jobPost.work_timings,
                working_days: jobPost.working_days,
                address: maskData.partialAddress(jobPost.address || {}),
                location: jobPost.location,
                contact_person: jobPost.contact_person ? {
                    name: maskData.maskName(jobPost.contact_person.name || ''),
                    phone: maskData.maskPhone(jobPost.contact_person.phone || ''),
                    email: jobPost.contact_person.email || ''
                } : null,
                is_premium: true,
                application_status: applicationStatus
            };

            return {
                jobPost: jobResponse,
                matchScore: score,
                matchingSkills: getMatchingSkills(candidate.skills || [], jobPost.required_skills || [])
            };
        });

        // Sort by match score (descending)
        jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);

        // Prepare candidate response
        const candidateResponse = {
            _id: candidate._id,
            name: maskData.maskName(candidate.name || candidate.user_id?.name || ''), // Masked name
            image: candidate.image,
            gender: candidate.gender,
            skills: candidate.skills || [],
            expected_salary: candidate.expected_salary || { min: 0, max: 0 },
            preferred_locations: candidate.preferred_locations || [],
            contact_no: maskData.maskPhone(candidate.contact_no || candidate.user_id?.contact_no || ''), // Masked phone
            whatsapp_number: maskData.maskWhatsApp(candidate.whatsapp_number || ''), // Masked WhatsApp
            address: maskData.partialAddress(candidate.address || {}), // Partial address
            is_premium: isPremium
        };

        res.status(200).json({
            success: true,
            data: {
                candidate: candidateResponse,
                totalMatches: jobsWithScores.length,
                filtersApplied: appliedFilters,
                jobs: jobsWithScores
            }
        });

    } catch (error) {
        console.error('Error finding jobs for worker:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Helper function to calculate match score for premium data
const calculateMatchScore = (candidate, jobPost) => {
    let score = 0;

    // Skills match (40% weight)
    const skillMatches = getMatchingSkills(candidate.skills || [], jobPost.required_skills || []);
    const skillMatchPercentage = jobPost.required_skills?.length > 0
        ? (skillMatches.length / jobPost.required_skills.length) * 40
        : 0;
    score += skillMatchPercentage;

    // Location match (30% weight)
    if (candidate.preferred_locations?.includes(jobPost.address?.state)) {
        score += 30;
    } else if (candidate.preferred_locations?.length === 0) {
        score += 15; // Partial score for no preference
    }

    // Salary match (30% weight)
    if (jobPost.salary_range?.min > 0 || jobPost.salary_range?.max > 0) {
        if (candidate.expected_salary?.min <= (jobPost.salary_range.max || Number.MAX_SAFE_INTEGER) &&
            candidate.expected_salary?.max >= jobPost.salary_range.min) {
            score += 30;
        } else if (candidate.expected_salary?.min === 0 && candidate.expected_salary?.max === 0) {
            score += 15; // Partial score for no salary expectation
        }
    }

    return Math.min(100, Math.round(score));
};

// Helper function to calculate job match score for premium data
const calculateJobMatchScore = (candidate, jobPost) => {
    let score = 0;

    // Skills match (40% weight)
    const skillMatches = getMatchingSkills(candidate.skills || [], jobPost.required_skills || []);
    const skillMatchPercentage = jobPost.required_skills?.length > 0
        ? (skillMatches.length / jobPost.required_skills.length) * 40
        : 0;
    score += skillMatchPercentage;

    // Location match (30% weight)
    if (candidate.preferred_locations?.includes(jobPost.address?.state)) {
        score += 30;
    } else if (jobPost.address?.state === candidate.address?.state) {
        score += 20; // Partial score for current state
    }

    // Salary match (30% weight)
    if (candidate.expected_salary?.min > 0 || candidate.expected_salary?.max > 0) {
        if (jobPost.salary_range?.min <= candidate.expected_salary.max &&
            jobPost.salary_range?.max >= candidate.expected_salary.min) {
            score += 30;
        }
    } else {
        // Candidate has no salary expectation, give partial score
        score += 15;
    }

    return Math.min(100, Math.round(score));
};

// Helper function to get matching skills for premium data
const getMatchingSkills = (candidateSkills, jobSkills) => {
    // Ensure inputs are arrays
    if (!Array.isArray(candidateSkills) || !Array.isArray(jobSkills)) {
        return [];
    }

    // Map job skill IDs, ensuring _id exists
    const jobSkillIds = jobSkills
        .filter(skill => skill && skill._id) // Check for valid skill object with _id
        .map(skill => skill._id.toString());

    // Job skill names (used for dummy employees whose skills are plain strings)
    const jobSkillNames = jobSkills
        .map(skill => (typeof skill === 'string' ? skill : skill?.skill_name || skill?.name))
        .filter(Boolean)
        .map(name => String(name).trim().toLowerCase());

    // Return matching skills (supports ObjectId skills and plain skill names)
    return candidateSkills.filter(skill => {
        if (!skill) return false;

        if (typeof skill === 'string') {
            return jobSkillNames.includes(skill.trim().toLowerCase());
        }

        if (skill._id && jobSkillIds.includes(skill._id.toString())) {
            return true;
        }

        const name = skill.skill_name || skill.name;
        return !!name && jobSkillNames.includes(String(name).trim().toLowerCase());
    });
};




// -------------------------------------------------------------------------------


export const getAllJobDetailsBySalon = async (req, res) => {
    try {
        const { salonId } = req.params;

        if (!salonId) {
            return res.status(400).json({ success: false, message: "Salon ID is required" });
        }

        const jobs = await JobPosting.find({ salon_id: salonId })
            .populate("required_skills", "name description") // get full skill info
            .populate("salon_id", "name email phone address"); // get salon info

        if (!jobs.length) {
            return res.status(404).json({ success: false, message: "No jobs found for this salon" });
        }

        res.status(200).json({
            success: true,
            count: jobs.length,
            jobs, // 🔥 return full details
        });
    } catch (error) {
        console.error("Error fetching job details:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};