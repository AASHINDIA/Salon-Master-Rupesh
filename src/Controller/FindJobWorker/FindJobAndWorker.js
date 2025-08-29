import JobPosting from "../../Modal/JOB/JobPosting.js";
import Candidate from "../../Modal/Candidate/Candidate.js";



// Find workers matching a job post
export const findWorkersForJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        // Find the job post
        const jobPost = await JobPosting.findById(jobId)
            .populate('required_skills')
            .exec();

        if (!jobPost) {
            return res.status(404).json({ message: 'Job post not found' });
        }

        if (!jobPost.is_active) {
            return res.status(400).json({ message: 'Job post is not active' });
        }

        // Build match criteria
        const matchCriteria = {
            available_for_join: true,
            $or: [
                { 'preferred_locations': { $in: [jobPost.address.state] } },
                { 'preferred_locations': { $size: 0 } } // Include candidates with no location preference
            ]
        };

        // Add gender filter if specified (not 'Any')
        if (jobPost.gender_preference !== 'Any') {
            matchCriteria.gender = jobPost.gender_preference.toLowerCase();
        }

        // Add salary range filter
        if (jobPost.salary_range.min > 0 || jobPost.salary_range.max > 0) {
            matchCriteria.$or = [
                ...matchCriteria.$or,
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
            ];
        }

        // Find matching candidates
        const matchingCandidates = await Candidate.find(matchCriteria)
            .populate('skills')
            .exec();

        // Calculate match score for each candidate
        const candidatesWithScores = matchingCandidates.map(candidate => {
            const score = calculateMatchScore(candidate, jobPost);
            return {
                candidate: candidate,
                matchScore: score,
                matchingSkills: getMatchingSkills(candidate.skills, jobPost.required_skills)
            };
        });

        // Sort by match score (descending)
        candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);

        res.json({
            jobPost: jobPost,
            totalMatches: candidatesWithScores.length,
            candidates: candidatesWithScores
        });

    } catch (error) {
        console.error('Error finding workers for job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Helper function to calculate match score
const calculateMatchScore = (candidate, jobPost) => {
    let score = 0;

    // Skills match (40% weight)
    const skillMatches = getMatchingSkills(candidate.skills, jobPost.required_skills);
    const skillMatchPercentage = jobPost.required_skills.length > 0 
        ? (skillMatches.length / jobPost.required_skills.length) * 40 
        : 0;
    score += skillMatchPercentage;

    // Location match (30% weight)
    if (candidate.preferred_locations.includes(jobPost.address.state)) {
        score += 30;
    } else if (candidate.preferred_locations.length === 0) {
        score += 15; // Partial score for no preference
    }

    // Salary match (30% weight)
    if (jobPost.salary_range.min > 0 || jobPost.salary_range.max > 0) {
        if (candidate.expected_salary.min <= (jobPost.salary_range.max || Number.MAX_SAFE_INTEGER) &&
            candidate.expected_salary.max >= jobPost.salary_range.min) {
            score += 30;
        } else if (candidate.expected_salary.min === 0 && candidate.expected_salary.max === 0) {
            score += 15; // Partial score for no salary expectation
        }
    }

    return Math.min(100, Math.round(score));
};

// Helper function to get matching skills
const getMatchingSkills = (candidateSkills, jobSkills) => {
    const candidateSkillIds = candidateSkills.map(skill => skill._id.toString());
    const jobSkillIds = jobSkills.map(skill => skill._id.toString());
    
    return candidateSkills.filter(skill => 
        jobSkillIds.includes(skill._id.toString())
    );
};




// Find jobs matching a candidate profile

// Find job posts matching a worker profile
export const findJobsForWorker = async (req, res) => {
    try {
        const { candidateId } = req.params;

        // Find the candidate
        const candidate = await Candidate.findById(candidateId)
            .populate('skills')
            .exec();

        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        if (!candidate.available_for_join) {
            return res.status(400).json({ message: 'Candidate is not available for joining' });
        }

        // Build match criteria
        const matchCriteria = {
            is_active: true,
            $or: [
                { 'address.state': { $in: candidate.preferred_locations } },
                { 'address.state': candidate.address.state } // Include jobs in candidate's current state
            ]
        };

        // Add gender filter if candidate has specific gender
        if (candidate.gender !== 'other') {
            matchCriteria.$or.push({
                gender_preference: { $in: [candidate.gender.charAt(0).toUpperCase() + candidate.gender.slice(1), 'Any'] }
            });
        } else {
            matchCriteria.gender_preference = 'Any';
        }

        // Add salary range filter
        if (candidate.expected_salary.min > 0 || candidate.expected_salary.max > 0) {
            matchCriteria.$and = [
                { 'salary_range.min': { $lte: candidate.expected_salary.max || Number.MAX_SAFE_INTEGER } },
                { 'salary_range.max': { $gte: candidate.expected_salary.min } }
            ];
        }

        // Find matching job posts
        const matchingJobs = await JobPosting.find(matchCriteria)
            .populate('required_skills')
            .populate('salon_id')
            .exec();

        // Calculate match score for each job
        const jobsWithScores = matchingJobs.map(jobPost => {
            const score = calculateJobMatchScore(candidate, jobPost);
            return {
                jobPost: jobPost,
                matchScore: score,
                matchingSkills: getMatchingSkills(candidate.skills, jobPost.required_skills)
            };
        });

        // Sort by match score (descending)
        jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);

        res.json({
            candidate: candidate,
            totalMatches: jobsWithScores.length,
            jobs: jobsWithScores
        });

    } catch (error) {
        console.error('Error finding jobs for worker:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Helper function to calculate job match score
const calculateJobMatchScore = (candidate, jobPost) => {
    let score = 0;

    // Skills match (40% weight)
    const skillMatches = getMatchingSkills(candidate.skills, jobPost.required_skills);
    const skillMatchPercentage = jobPost.required_skills.length > 0 
        ? (skillMatches.length / jobPost.required_skills.length) * 40 
        : 0;
    score += skillMatchPercentage;

    // Location match (30% weight)
    if (candidate.preferred_locations.includes(jobPost.address.state)) {
        score += 30;
    } else if (jobPost.address.state === candidate.address.state) {
        score += 20; // Partial score for current state
    }

    // Salary match (30% weight)
    if (candidate.expected_salary.min > 0 || candidate.expected_salary.max > 0) {
        if (jobPost.salary_range.min <= candidate.expected_salary.max &&
            jobPost.salary_range.max >= candidate.expected_salary.min) {
            score += 30;
        }
    } else {
        // Candidate has no salary expectation, give partial score
        score += 15;
    }

    return Math.min(100, Math.round(score));
};