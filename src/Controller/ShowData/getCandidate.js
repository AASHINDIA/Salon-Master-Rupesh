
import Candidate from "../../Modal/Candidate/Candidate.js";
import JobPosting from "../../Modal/JOB/JobPosting.js";
import JobPostingDummy from "../../Modal/JOB/JobPosting.js";
import Skill from "../../Modal/skill/skill.js";
import Salon from "../../Modal/Salon/Salon.js";
// Helper to mask name (first + last letter, rest * )
const maskName = (name) => {
  if (!name) return "";
  if (name.length <= 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
};

// Helper to mask contact (show first 2 & last 2 digits)
const maskContact = (contact) => {
  if (!contact) return "";
  if (contact.length <= 4) return "****";
  return contact.slice(0, 2) + "*".repeat(contact.length - 4) + contact.slice(-2);
};

export const getAvailableCandidates = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {
      available_for_join: true,
      looking_job_location: { $in: ["india", "both"] },
    };

    // Count total candidates
    const totalCandidates = await Candidate.countDocuments(filter);

    // Fetch paginated results
    const candidates = await Candidate.find(filter)
      .populate("skills", "skill_name")
      .skip((page - 1) * limit)
      .limit(limit);

    const result = candidates.map((candidate) => ({
      name: maskName(candidate.name),
      gender: candidate.gender,
      skills: candidate.skills.map((s) => s.skill_name),
      expected_salary: candidate.expected_salary,
      preferred_locations: candidate.preferred_locations,
      contact_no: maskContact(candidate.contact_no),
      age: candidate.age, // ✅ also include virtual age
    }));

    res.status(200).json({
      success: true,
      total: totalCandidates,
      page,
      totalPages: Math.ceil(totalCandidates / limit),
      candidates: result,
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching candidates",
      error: error.message,
    });
  }
};






// __________________________________________________Jobs____________________________________



// Mask string (first + last, rest *)
const maskString = (str) => {
  if (!str) return "";
  if (str.length <= 2) return str[0] + "*";
  return str[0] + "*".repeat(str.length - 2) + str[str.length - 1];
};

// Mask contact (show first 2 + last 2 digits)


export const getJobPostings = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Build manual filter from query params
    const filter = {};

    if (req.query.is_active !== undefined) {
      filter.is_active = req.query.is_active === "true";
    } else {
      filter.is_active = true;
    }

    if (req.query.job_title) {
      filter.job_title = { $regex: req.query.job_title, $options: "i" };
    }

    if (req.query.gender) {
      filter.gender_preference = req.query.gender;
    }

    if (req.query.job_type) {
      filter.job_type = req.query.job_type;
    }

    if (req.query.location) {
      const locationRegex = { $regex: req.query.location, $options: "i" };
      filter.$or = [
        { location: locationRegex },
        { "address.city": locationRegex },
        { "address.state": locationRegex },
      ];
    }

    // Fetch from both schemas (premium + dummy)
    const [premiumJobs, dummyJobs] = await Promise.all([
      JobPosting.find(filter)
        .populate("salon_id", "salon_name year_of_start contact_number")
        .populate("required_skills", "skill_name"),
      JobPostingDummy.find(filter),
    ]);

    // Normalize both into one unified shape
    const normalizeJob = (job, isPremium) => {
      if (isPremium) {
        return {
          _id: job._id,
          job_title: job.job_title,
          custom_job_title: job.custom_job_title,
          job_description: job.job_description,
          gender_preference: job.gender_preference,
          required_experience: job.required_experience,
          salary_type: job.salary_type,
          salary_range: job.salary_range,
          job_type: job.job_type,
          work_timings: job.work_timings,
          working_days: job.working_days,
          benefits: job.benefits,
          vacancy_count: job.vacancy_count,
          is_active: job.is_active,
          posted_date: job.posted_date,
          address: job.address,
          location: job.location,
          required_skills: job.required_skills?.map((skill) => skill.skill_name) || [],
          salon: {
            name: job.salon_id?.salon_name,
            year_of_start: job.salon_id?.year_of_start?.toString(),
            contact_number: job.salon_id?.contact_number,
          },
          is_premium: true,
        };
      }

      return {
        _id: job._id,
        job_title: job.job_title,
        custom_job_title: job.custom_job_title,
        job_description: job.job_description,
        gender_preference: job.gender_preference,
        required_experience: job.required_experience,
        salary_type: job.salary_type,
        salary_range: job.salary_range,
        job_type: job.job_type,
        work_timings: job.work_timings,
        working_days: job.working_days,
        benefits: job.benefits,
        vacancy_count: job.vacancy_count,
        is_active: job.is_active,
        posted_date: job.posted_date,
        address: job.address,
        location: job.location,
        required_skills: job.required_skills || [],
        salon: {
          name: job.salon_id?.name,
          brand_name: job.salon_id?.brand_name,
          contact_number: job.salon_id?.contact_no,
        },
        is_premium: false,
      };
    };

    const allJobs = [
      ...premiumJobs.map((job) => normalizeJob(job, true)),
      ...dummyJobs.map((job) => normalizeJob(job, false)),
    ];

    // Sort by posted_date (newest first)
    allJobs.sort((a, b) => new Date(b.posted_date) - new Date(a.posted_date));

    // Paginate combined results
    const total = allJobs.length;
    const start = (page - 1) * limit;
    const jobs = allJobs.slice(start, start + limit);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      jobs,
    });
  } catch (error) {
    console.error("Error fetching job postings:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching job postings",
      error: error.message,
    });
  }
};

