import JobPosting from "../../Modal/JOB/JobPosting.js";
import Candidate from "../../Modal/Candidate/Candidate.js";

import Salon from "../../Modal/Salon/Salon.js";
import JobPostingDummy from "../../Modal/Dummaydata/jobsDummay.js";
import Emp from '../../Modal/Dummaydata/jobsDummay.js'
import JobApplication from "../../Modal/JOB/JobApplication.js";
import SuggestedCandidate from "../../Modal/RequestJobSuggestedCandidate/RequestJobSuggestCandidate.js";

// Helper function to mask sensitive information
// const maskData = {
//     // Mask name: John Doe -> J*** D***
//     maskName: (name) => {
//         if (!name) return '';
//         const names = name.split(' ');
//         return names.map(n => n.length > 2 ? n.charAt(0) + '*'.repeat(n.length - 2) + n.charAt(n.length - 1) : n).join(' ');
//     },

//     // Mask phone number: 1234567890 -> 123****890
//     maskPhone: (phone) => {
//         if (!phone) return '';
//         if (phone.length <= 6) return phone;
//         const visibleDigits = 3;
//         const firstPart = phone.substring(0, visibleDigits);
//         const lastPart = phone.substring(phone.length - visibleDigits);
//         return firstPart + '*'.repeat(phone.length - visibleDigits * 2) + lastPart;
//     },

//     // Mask WhatsApp number
//     maskWhatsApp: (whatsapp) => {
//         if (!whatsapp) return '';
//         return maskData.maskPhone(whatsapp);
//     },

//     // Partial address display
//     partialAddress: (address) => {
//         if (!address) return {};
//         return {
//             country: address.country,
//             state: address.state,
//             city: address.city,
//             // Don't show full pincode for privacy
//             pincode: address.pincode ? address.pincode.substring(0, 2) + '***' : ''
//         };
//     }
// };

// // Find workers matching a job post
// export const findWorkersForJob = async (req, res) => {
//     try {
//         const { jobId } = req.params;

//         // Find the job post with populated salon details
//         const jobPost = await JobPosting.findById(jobId)
//             .populate('required_skills')
//             .populate('salon_id')
//             .exec();

//         if (!jobPost) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Job post not found'
//             });
//         }

//         if (!jobPost.is_active) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Job post is not active'
//             });
//         }

//         // Build match criteria
//         const matchCriteria = {
//             available_for_join: true,
//             $or: [
//                 { 'preferred_locations': { $in: [jobPost.address.state] } },
//                 { 'preferred_locations': { $size: 0 } } // Include candidates with no location preference
//             ]
//         };

//         // Add gender filter if specified (not 'Any')
//         if (jobPost.gender_preference !== 'Any') {
//             matchCriteria.gender = jobPost.gender_preference.toLowerCase();
//         }

//         // Add salary range filter
//         if (jobPost.salary_range.min > 0 || jobPost.salary_range.max > 0) {
//             matchCriteria.$or = [
//                 ...(matchCriteria.$or || []),
//                 {
//                     $and: [
//                         { 'expected_salary.min': { $lte: jobPost.salary_range.max || Number.MAX_SAFE_INTEGER } },
//                         { 'expected_salary.max': { $gte: jobPost.salary_range.min } }
//                     ]
//                 },
//                 {
//                     $and: [
//                         { 'expected_salary.min': 0 },
//                         { 'expected_salary.max': 0 }
//                     ]
//                 }
//             ];
//         }

//         // Find matching candidates
//         const matchingCandidates = await Candidate.find(matchCriteria)
//             .populate('skills')
//             .exec();

//         // Calculate match score for each candidate
//         const candidatesWithScores = matchingCandidates.map(candidate => {
//             const score = calculateMatchScore(candidate, jobPost);
//             return {
//                 candidate: {
//                     _id: candidate._id,
//                     name: maskData.maskName(candidate.name), // Masked name
//                     image: candidate.image,
//                     gender: candidate.gender,
//                     location: candidate.location,
//                     skills: candidate.skills,
//                     expected_salary: candidate.expected_salary,
//                     available_for_join: candidate.available_for_join,
//                     preferred_locations: candidate.preferred_locations,
//                     contact_no: maskData.maskPhone(candidate.contact_no), // Masked phone
//                     whatsapp_number: maskData.maskWhatsApp(candidate.whatsapp_number), // Masked WhatsApp
//                     address: maskData.partialAddress(candidate.address) // Partial address
//                 },
//                 matchScore: score,
//                 matchingSkills: getMatchingSkills(candidate.skills, jobPost.required_skills)
//             };
//         });

//         // Sort by match score (descending)
//         candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);

//         res.status(200).json({
//             success: true,
//             data: {
//                 jobPost: {
//                     _id: jobPost._id,
//                     job_title: jobPost.job_title,
//                     custom_job_title: jobPost.custom_job_title,
//                     salon_id: jobPost.salon_id ? {
//                         _id: jobPost.salon_id._id,
//                         salon_name: maskData.maskName(jobPost.salon_id.salon_name), // Masked salon name
//                         brand_name: maskData.maskName(jobPost.salon_id.brand_name), // Masked brand name
//                         contact_number: maskData.maskPhone(jobPost.salon_id.contact_number), // Masked contact
//                         whatsapp_number: maskData.maskWhatsApp(jobPost.salon_id.whatsapp_number), // Masked WhatsApp
//                         address: maskData.partialAddress(jobPost.salon_id.address) // Partial address
//                     } : null,
//                     required_skills: jobPost.required_skills,
//                     gender_preference: jobPost.gender_preference,
//                     salary_range: jobPost.salary_range,
//                     address: maskData.partialAddress(jobPost.address), // Partial address
//                     is_active: jobPost.is_active
//                 },
//                 totalMatches: candidatesWithScores.length,
//                 candidates: candidatesWithScores
//             }
//         });

//     } catch (error) {
//         console.error('Error finding workers for job:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Server error',
//             error: error.message
//         });
//     }
// };

// // Find jobs matching a candidate profile
// export const findJobsForWorker = async (req, res) => {
//     try {
//         const { candidateId } = req.params;

//         // Find the candidate
//         const candidate = await Candidate.findOne({ user_id: candidateId })
//             .populate('skills')
//             .exec();


//         if (!candidate) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Candidate not found'
//             });
//         }

//         if (!candidate.available_for_join) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Candidate is not available for joining'
//             });
//         }

//         // Build match criteria
//         const matchCriteria = {
//             is_active: true,
//             $or: [
//                 { 'address.state': { $in: candidate.preferred_locations } },
//                 { 'address.state': candidate.address.state } // Include jobs in candidate's current state
//             ]
//         };

//         // Add gender filter if candidate has specific gender
//         if (candidate.gender !== 'other') {
//             const capitalizedGender = candidate.gender.charAt(0).toUpperCase() + candidate.gender.slice(1);
//             matchCriteria.$or.push({
//                 gender_preference: { $in: [capitalizedGender, 'Any'] }
//             });
//         } else {
//             matchCriteria.gender_preference = 'Any';
//         }

//         // Add salary range filter
//         if (candidate.expected_salary.min > 0 || candidate.expected_salary.max > 0) {
//             matchCriteria.$and = [
//                 { 'salary_range.min': { $lte: candidate.expected_salary.max || Number.MAX_SAFE_INTEGER } },
//                 { 'salary_range.max': { $gte: candidate.expected_salary.min } }
//             ];
//         }

//         // Find matching job posts
//         const matchingJobs = await JobPosting.find(matchCriteria)
//             .populate('required_skills')
//             .populate('salon_id')
//             .exec();

//         // Calculate match score for each job
//         const jobsWithScores = matchingJobs.map(jobPost => {
//             const score = calculateJobMatchScore(candidate, jobPost);
//             return {
//                 jobPost: {
//                     _id: jobPost._id,
//                     job_title: jobPost.job_title,
//                     custom_job_title: jobPost.custom_job_title,
//                     salon_id: jobPost.salon_id ? {
//                         _id: jobPost.salon_id._id,
//                         salon_name: maskData.maskName(jobPost.salon_id.salon_name), // Masked salon name
//                         brand_name: maskData.maskName(jobPost.salon_id.brand_name), // Masked brand name
//                         contact_number: maskData.maskPhone(jobPost.salon_id.contact_number), // Masked contact
//                         whatsapp_number: maskData.maskWhatsApp(jobPost.salon_id.whatsapp_number), // Masked WhatsApp
//                         address: maskData.partialAddress(jobPost.salon_id.address) // Partial address
//                     } : null,
//                     required_skills: jobPost.required_skills,
//                     gender_preference: jobPost.gender_preference,
//                     salary_range: jobPost.salary_range,
//                     job_type: jobPost.job_type,
//                     work_timings: jobPost.work_timings,
//                     working_days: jobPost.working_days,
//                     address: maskData.partialAddress(jobPost.address), // Partial address
//                     location: jobPost.location,
//                     contact_person: jobPost.contact_person ? {
//                         name: maskData.maskName(jobPost.contact_person.name), // Masked name
//                         phone: maskData.maskPhone(jobPost.contact_person.phone), // Masked phone
//                         email: jobPost.contact_person.email // Email can be shown partially
//                     } : null
//                 },
//                 matchScore: score,
//                 matchingSkills: getMatchingSkills(candidate.skills, jobPost.required_skills)
//             };
//         });

//         // Sort by match score (descending)
//         jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);

//         res.status(200).json({
//             success: true,
//             data: {
//                 candidate: {
//                     _id: candidate._id,
//                     name: maskData.maskName(candidate.name), // Masked name
//                     image: candidate.image,
//                     gender: candidate.gender,
//                     skills: candidate.skills,
//                     expected_salary: candidate.expected_salary,
//                     preferred_locations: candidate.preferred_locations,
//                     contact_no: maskData.maskPhone(candidate.contact_no), // Masked phone
//                     whatsapp_number: maskData.maskWhatsApp(candidate.whatsapp_number), // Masked WhatsApp
//                     address: maskData.partialAddress(candidate.address) // Partial address
//                 },
//                 totalMatches: jobsWithScores.length,
//                 jobs: jobsWithScores
//             }
//         });

//     } catch (error) {
//         console.error('Error finding jobs for worker:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Server error',
//             error: error.message
//         });
//     }
// };

// // Helper functions (calculateMatchScore, calculateJobMatchScore, getMatchingSkills) remain the same
// // Helper function to calculate match score
// const calculateMatchScore = (candidate, jobPost) => {
//     let score = 0;

//     // Skills match (40% weight)
//     const skillMatches = getMatchingSkills(candidate.skills, jobPost.required_skills);
//     const skillMatchPercentage = jobPost.required_skills.length > 0
//         ? (skillMatches.length / jobPost.required_skills.length) * 40
//         : 0;
//     score += skillMatchPercentage;

//     // Location match (30% weight)
//     if (candidate.preferred_locations.includes(jobPost.address.state)) {
//         score += 30;
//     } else if (candidate.preferred_locations.length === 0) {
//         score += 15; // Partial score for no preference
//     }

//     // Salary match (30% weight)
//     if (jobPost.salary_range.min > 0 || jobPost.salary_range.max > 0) {
//         if (candidate.expected_salary.min <= (jobPost.salary_range.max || Number.MAX_SAFE_INTEGER) &&
//             candidate.expected_salary.max >= jobPost.salary_range.min) {
//             score += 30;
//         } else if (candidate.expected_salary.min === 0 && candidate.expected_salary.max === 0) {
//             score += 15; // Partial score for no salary expectation
//         }
//     }

//     return Math.min(100, Math.round(score));
// };

// // Helper function to calculate job match score
// const calculateJobMatchScore = (candidate, jobPost) => {
//     let score = 0;

//     // Skills match (40% weight)
//     const skillMatches = getMatchingSkills(candidate.skills, jobPost.required_skills);
//     const skillMatchPercentage = jobPost.required_skills.length > 0
//         ? (skillMatches.length / jobPost.required_skills.length) * 40
//         : 0;
//     score += skillMatchPercentage;

//     // Location match (30% weight)
//     if (candidate.preferred_locations.includes(jobPost.address.state)) {
//         score += 30;
//     } else if (jobPost.address.state === candidate.address.state) {
//         score += 20; // Partial score for current state
//     }

//     // Salary match (30% weight)
//     if (candidate.expected_salary.min > 0 || candidate.expected_salary.max > 0) {
//         if (jobPost.salary_range.min <= candidate.expected_salary.max &&
//             jobPost.salary_range.max >= candidate.expected_salary.min) {
//             score += 30;
//         }
//     } else {
//         // Candidate has no salary expectation, give partial score
//         score += 15;
//     }

//     return Math.min(100, Math.round(score));
// };

// // Helper function to get matching skills
// const getMatchingSkills = (candidateSkills, jobSkills) => {
//     const candidateSkillIds = candidateSkills.map(skill => skill._id.toString());
//     const jobSkillIds = jobSkills.map(skill => skill._id.toString());

//     return candidateSkills.filter(skill =>
//         jobSkillIds.includes(skill._id.toString())
//     );
// };  





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

export const findWorkersForJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        // First try to find in premium job posts
        let jobPost = await JobPosting.findById(jobId)
            .populate('required_skills')
            .populate('salon_id')
            .exec();

        let isPremium = true;

        // If not found in premium, try in dummy data
        if (!jobPost) {
            jobPost = await JobPostingDummy.findById(jobId).exec();
            isPremium = false;

            if (!jobPost) {
                return res.status(404).json({
                    success: false,
                    message: 'Job post not found'
                });
            }
        }

        if (!jobPost.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Job post is not active'
            });
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
                ...(matchCriteria.$or || []),
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

        // Find matching candidates - for premium jobs, use Candidate model, for dummy jobs use Emp model
        let matchingCandidates;
        if (isPremium) {
            matchingCandidates = await Candidate.find(matchCriteria)
                .populate('skills')
                .exec();
        } else {
            matchingCandidates = await Emp.find(matchCriteria).exec();
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
            const score = isPremium ?
                calculateMatchScore(candidate, jobPost) :
                calculateDummyMatchScore(candidate, jobPost);

            // Check if candidate is in SuggestedCandidate for this job
            const candidateStatus = suggestedCandidateMap.get(candidate._id.toString()) || 'not_suggested';

            return {
                candidate: {
                    _id: candidate._id,
                    name: maskData.maskName(candidate.name || candidate.user_id?.name), // Masked name
                    image: candidate.image,
                    gender: candidate.gender,
                    location: candidate.location || candidate.looking_job_location,
                    skills: candidate.skills,
                    expected_salary: candidate.expected_salary,
                    available_for_join: candidate.available_for_join,
                    preferred_locations: candidate.preferred_locations,
                    contact_no: maskData.maskPhone(candidate.contact_no || candidate.user_id?.contact_no), // Masked phone
                    whatsapp_number: maskData.maskWhatsApp(candidate.whatsapp_number), // Masked WhatsApp
                    address: maskData.partialAddress(candidate.address), // Partial address
                    status: candidateStatus // Add status from SuggestedCandidate or 'Not Suggested'
                },
                matchScore: score,
                matchingSkills: isPremium ?
                    getMatchingSkills(candidate.skills, jobPost.required_skills) :
                    getDummyMatchingSkills(candidate.skills, jobPost.required_skills)
            };
        });

        // Sort by match score (descending)
        candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);

        // Prepare job post response based on whether it's premium or dummy
        let jobPostResponse;
        if (isPremium) {
            jobPostResponse = {
                _id: jobPost._id,
                job_title: jobPost.job_title,
                custom_job_title: jobPost.custom_job_title,
                salon_id: jobPost.salon_id ? {
                    _id: jobPost.salon_id._id,
                    salon_name: maskData.maskName(jobPost.salon_id.salon_name), // Masked salon name
                    brand_name: maskData.maskName(jobPost.salon_id.brand_name), // Masked brand name
                    contact_number: maskData.maskPhone(jobPost.salon_id.contact_number), // Masked contact
                    whatsapp_number: maskData.maskWhatsApp(jobPost.salon_id.whatsapp_number), // Masked WhatsApp
                    address: maskData.partialAddress(jobPost.salon_id.address) // Partial address
                } : null,
                required_skills: jobPost.required_skills,
                gender_preference: jobPost.gender_preference,
                salary_range: jobPost.salary_range,
                address: maskData.partialAddress(jobPost.address), // Partial address
                is_active: jobPost.is_active,
                is_premium: true
            };
        } else {
            jobPostResponse = {
                _id: jobPost._id,
                job_title: jobPost.job_title,
                custom_job_title: jobPost.custom_job_title,
                salon_id: {
                    _id: jobPost.salon_id?._id || jobPost._id,
                    salon_name: maskData.maskName(jobPost.salon_id?.name), // Masked salon name
                    brand_name: maskData.maskName(jobPost.salon_id?.brand_name), // Masked brand name
                    contact_number: maskData.maskPhone(jobPost.salon_id?.contact_no), // Masked contact
                    address: maskData.partialAddress(jobPost.address) // Partial address
                },
                required_skills: jobPost.required_skills,
                gender_preference: jobPost.gender_preference,
                salary_range: jobPost.salary_range,
                address: maskData.partialAddress(jobPost.address), // Partial address
                is_active: jobPost.is_active,
                is_premium: false
            };
        }

        res.status(200).json({
            success: true,
            data: {
                jobPost: jobPostResponse,
                totalMatches: candidatesWithScores.length,
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




// Find jobs matching a candidate profile
// export const findJobsForWorker = async (req, res) => {
//     try {
//         const { candidateId } = req.params;

//         // First try to find in premium candidates
//         let candidate = await Candidate.findOne({ user_id: candidateId })
//             .populate('skills')
//             .exec();

//         let isPremium = true;

//         // If not found in premium, try in dummy data
//         if (!candidate) {
//             candidate = await Emp.findOne({ user_id: candidateId }).exec();
//             isPremium = false;

//             if (!candidate) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Candidate not found'
//                 });
//             }
//         }

//         if (!candidate.available_for_join) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Candidate is not available for joining'
//             });
//         }

//         // Build match criteria for both premium and dummy jobs
//         const matchCriteria = {
//             is_active: true,
//             $or: [
//                 { 'address.state': { $in: candidate.preferred_locations || [] } },
//                 { 'address.state': candidate.address?.state || candidate.looking_job_location || '' }
//             ]
//         };

//         // Add gender filter if candidate has specific gender
//         if (candidate.gender !== 'other') {
//             const capitalizedGender = candidate.gender.charAt(0).toUpperCase() + candidate.gender.slice(1);
//             matchCriteria.$or.push({
//                 gender_preference: { $in: [capitalizedGender, 'Any'] }
//             });
//         } else {
//             matchCriteria.gender_preference = 'Any';
//         }

//         // Add salary range filter
//         if (candidate.expected_salary?.min > 0 || candidate.expected_salary?.max > 0) {
//             matchCriteria.$and = [
//                 { 'salary_range.min': { $lte: candidate.expected_salary.max || Number.MAX_SAFE_INTEGER } },
//                 { 'salary_range.max': { $gte: candidate.expected_salary.min || 0 } }
//             ];
//         }

//         // Find matching job posts - search in both premium and dummy collections
//         const premiumJobs = await JobPosting.find(matchCriteria)
//             .populate('required_skills')
//             .populate('salon_id')
//             .exec();

//         const dummyJobs = await JobPostingDummy.find(matchCriteria).exec();

//         // Combine results
//         const matchingJobs = [...premiumJobs, ...dummyJobs];

//         // Calculate match score for each job
//         const jobsWithScores = matchingJobs.map(jobPost => {
//             const isJobPremium = jobPost instanceof JobPosting;
//             const score = isPremium ?
//                 calculateJobMatchScore(candidate, jobPost) :
//                 calculateDummyJobMatchScore(candidate, jobPost);

//             let jobResponse;

//             if (isJobPremium) {
//                 jobResponse = {
//                     _id: jobPost._id,
//                     job_title: jobPost.job_title,
//                     custom_job_title: jobPost.custom_job_title,
//                     salon_id: jobPost.salon_id ? {
//                         _id: jobPost.salon_id._id,
//                         salon_name: maskData.maskName(jobPost.salon_id.salon_name || ''), // Masked salon name
//                         brand_name: maskData.maskName(jobPost.salon_id.brand_name || ''), // Masked brand name
//                         contact_number: maskData.maskPhone(jobPost.salon_id.contact_number || ''), // Masked contact
//                         whatsapp_number: maskData.maskWhatsApp(jobPost.salon_id.whatsapp_number || ''), // Masked WhatsApp
//                         address: maskData.partialAddress(jobPost.salon_id.address || {}) // Partial address
//                     } : null,
//                     required_skills: jobPost.required_skills || [],
//                     gender_preference: jobPost.gender_preference,
//                     salary_range: jobPost.salary_range,
//                     job_type: jobPost.job_type,
//                     work_timings: jobPost.work_timings,
//                     working_days: jobPost.working_days,
//                     address: maskData.partialAddress(jobPost.address || {}), // Partial address
//                     location: jobPost.location,
//                     contact_person: jobPost.contact_person ? {
//                         name: maskData.maskName(jobPost.contact_person.name || ''), // Masked name
//                         phone: maskData.maskPhone(jobPost.contact_person.phone || ''), // Masked phone
//                         email: jobPost.contact_person.email || '' // Email can be shown partially
//                     } : null,
//                     is_premium: true
//                 };
//             } else {
//                 jobResponse = {
//                     _id: jobPost._id,
//                     job_title: jobPost.job_title,
//                     custom_job_title: jobPost.custom_job_title,
//                     salon_id: {
//                         _id: jobPost.salon_id?._id || jobPost._id,
//                         salon_name: maskData.maskName(jobPost.salon_id?.name || ''), // Masked salon name
//                         brand_name: maskData.maskName(jobPost.salon_id?.brand_name || ''), // Masked brand name
//                         contact_number: maskData.maskPhone(jobPost.salon_id?.contact_no || ''), // Masked contact
//                         address: maskData.partialAddress(jobPost.address || {}) // Partial address
//                     },
//                     required_skills: jobPost.required_skills || [],
//                     gender_preference: jobPost.gender_preference,
//                     salary_range: jobPost.salary_range,
//                     job_type: jobPost.job_type,
//                     work_timings: jobPost.work_timings,
//                     working_days: jobPost.working_days,
//                     address: maskData.partialAddress(jobPost.address || {}), // Partial address
//                     location: jobPost.location,
//                     is_premium: false
//                 };
//             }

//             return {
//                 jobPost: jobResponse,
//                 matchScore: score,
//                 matchingSkills: isPremium ?
//                     getMatchingSkills(candidate.skills || [], jobPost.required_skills || []) :
//                     getDummyMatchingSkills(candidate.skills || [], jobPost.required_skills || [])
//             };
//         });

//         // Sort by match score (descending)
//         jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);

//         // Prepare candidate response
//         const candidateResponse = {
//             _id: candidate._id,
//             name: maskData.maskName(candidate.name || candidate.user_id?.name || ''), // Masked name
//             image: candidate.image,
//             gender: candidate.gender,
//             skills: candidate.skills || [],
//             expected_salary: candidate.expected_salary || { min: 0, max: 0 },
//             preferred_locations: candidate.preferred_locations || [],
//             contact_no: maskData.maskPhone(candidate.contact_no || candidate.user_id?.contact_no || ''), // Masked phone
//             whatsapp_number: maskData.maskWhatsApp(candidate.whatsapp_number || ''), // Masked WhatsApp
//             address: maskData.partialAddress(candidate.address || {}), // Partial address
//             is_premium: isPremium
//         };

//         res.status(200).json({
//             success: true,
//             data: {
//                 candidate: candidateResponse,
//                 totalMatches: jobsWithScores.length,
//                 jobs: jobsWithScores
//             }
//         });

//     } catch (error) {
//         console.error('Error finding jobs for worker:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Server error',
//             error: error.message
//         });
//     }
// };



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
            candidate = await Emp.findOne({ user_id: candidateId }).exec();
            isPremium = false;

            if (!candidate) {
                return res.status(404).json({
                    success: false,
                    message: 'Candidate not found'
                });
            }
        }

        if (!candidate.available_for_join) {
            return res.status(400).json({
                success: false,
                message: 'Candidate is not available for joining'
            });
        }

        // Build match criteria for both premium and dummy jobs
        const matchCriteria = {
            is_active: true,
            $or: [
                { 'address.state': { $in: candidate.preferred_locations || [] } },
                { 'address.state': candidate.address?.state || candidate.looking_job_location || '' }
            ]
        };

        // Add gender filter if candidate has specific gender
        if (candidate.gender !== 'other') {
            const capitalizedGender = candidate.gender.charAt(0).toUpperCase() + candidate.gender.slice(1);
            matchCriteria.$or.push({
                gender_preference: { $in: [capitalizedGender, 'Any'] }
            });
        } else {
            matchCriteria.gender_preference = 'Any';
        }

        // Add salary range filter
        if (candidate.expected_salary?.min > 0 || candidate.expected_salary?.max > 0) {
            matchCriteria.$and = [
                { 'salary_range.min': { $lte: candidate.expected_salary.max || Number.MAX_SAFE_INTEGER } },
                { 'salary_range.max': { $gte: candidate.expected_salary.min || 0 } }
            ];
        }

        // Find matching job posts - search in both premium and dummy collections
        const premiumJobs = await JobPosting.find(matchCriteria)
            .populate('required_skills')
            .populate('salon_id')
            .exec();

        const dummyJobs = await JobPostingDummy.find(matchCriteria).exec();

        // Combine results
        // const matchingJobs = [...premiumJobs, ...dummyJobs];

        const matchingJobs = [
            ...premiumJobs.filter(job => job.is_active),
            ...dummyJobs.filter(job => job.is_active)
        ];

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
            const isJobPremium = jobPost instanceof JobPosting;
            const score = isPremium ?
                calculateJobMatchScore(candidate, jobPost) :
                calculateDummyJobMatchScore(candidate, jobPost);

            // Check if candidate has applied to this job
            const applicationStatus = jobApplicationMap.get(jobPost._id.toString()) || 'Not Applied';

            let jobResponse;

            if (isJobPremium) {
                jobResponse = {
                    _id: jobPost._id,
                    job_title: jobPost.job_title,
                    custom_job_title: jobPost.custom_job_title,
                    salon_id: jobPost.salon_id ? {
                        _id: jobPost.salon_id._id,
                        salon_name: maskData.maskName(jobPost.salon_id.salon_name || ''), // Masked salon name
                        brand_name: maskData.maskName(jobPost.salon_id.brand_name || ''), // Masked brand name
                        contact_number: maskData.maskPhone(jobPost.salon_id.contact_number || ''), // Masked contact
                        whatsapp_number: maskData.maskWhatsApp(jobPost.salon_id.whatsapp_number || ''), // Masked WhatsApp
                        address: maskData.partialAddress(jobPost.salon_id.address || {}) // Partial address
                    } : null,
                    required_skills: jobPost.required_skills || [],
                    gender_preference: jobPost.gender_preference,
                    salary_range: jobPost.salary_range,
                    job_type: jobPost.job_type,
                    work_timings: jobPost.work_timings,
                    working_days: jobPost.working_days,
                    address: maskData.partialAddress(jobPost.address || {}), // Partial address
                    location: jobPost.location,
                    contact_person: jobPost.contact_person ? {
                        name: maskData.maskName(jobPost.contact_person.name || ''), // Masked name
                        phone: maskData.maskPhone(jobPost.contact_person.phone || ''), // Masked phone
                        email: jobPost.contact_person.email || '' // Email can be shown partially
                    } : null,
                    is_premium: true,
                    application_status: applicationStatus // Add application status
                };
            } else {
                jobResponse = {
                    _id: jobPost._id,
                    job_title: jobPost.job_title,
                    custom_job_title: jobPost.custom_job_title,
                    salon_id: {
                        _id: jobPost.salon_id?._id || jobPost._id,
                        salon_name: maskData.maskName(jobPost.salon_id?.name || ''), // Masked salon name
                        brand_name: maskData.maskName(jobPost.salon_id?.brand_name || ''), // Masked brand name
                        contact_number: maskData.maskPhone(jobPost.salon_id?.contact_no || ''), // Masked contact
                        address: maskData.partialAddress(jobPost.address || {}) // Partial address
                    },
                    required_skills: jobPost.required_skills || [],
                    gender_preference: jobPost.gender_preference,
                    salary_range: jobPost.salary_range,
                    job_type: jobPost.job_type,
                    work_timings: jobPost.work_timings,
                    working_days: jobPost.working_days,
                    address: maskData.partialAddress(jobPost.address || {}), // Partial address
                    location: jobPost.location,
                    is_premium: false,
                    application_status: applicationStatus // Add application status
                };
            }

            return {
                jobPost: jobResponse,
                matchScore: score,
                matchingSkills: isPremium ?
                    getMatchingSkills(candidate.skills || [], jobPost.required_skills || []) :
                    getDummyMatchingSkills(candidate.skills || [], jobPost.required_skills || [])
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

// Helper function to calculate match score for dummy data
const calculateDummyMatchScore = (candidate, jobPost) => {
    let score = 0;

    // Skills match (40% weight)
    const skillMatches = getDummyMatchingSkills(candidate.skills || [], jobPost.required_skills || []);
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

// Helper function to calculate job match score for dummy data
const calculateDummyJobMatchScore = (candidate, jobPost) => {
    let score = 0;

    // Skills match (40% weight)
    const skillMatches = getDummyMatchingSkills(candidate.skills || [], jobPost.required_skills || []);
    const skillMatchPercentage = jobPost.required_skills?.length > 0
        ? (skillMatches.length / jobPost.required_skills.length) * 40
        : 0;
    score += skillMatchPercentage;

    // Location match (30% weight)
    if (candidate.preferred_locations?.includes(jobPost.address?.state)) {
        score += 30;
    } else if (jobPost.address?.state === (candidate.address?.state || candidate.looking_job_location)) {
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

    // Map candidate skill IDs, ensuring _id exists
    const candidateSkillIds = candidateSkills
        .filter(skill => skill && skill._id) // Check for valid skill object with _id
        .map(skill => skill._id.toString());

    // Map job skill IDs, ensuring _id exists
    const jobSkillIds = jobSkills
        .filter(skill => skill && skill._id) // Check for valid skill object with _id
        .map(skill => skill._id.toString());

    // Return matching skills
    return candidateSkills.filter(skill =>
        skill && skill._id && jobSkillIds.includes(skill._id.toString())
    );
};

// Helper function to get matching skills for dummy data
const getDummyMatchingSkills = (candidateSkills, jobSkills) => {
    // Ensure inputs are arrays
    if (!Array.isArray(candidateSkills) || !Array.isArray(jobSkills)) {
        return [];
    }

    return candidateSkills.filter(skill =>
        jobSkills.includes(skill)
    );
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