
import Candidate from "../../Modal/Candidate/Candidate.js";
import JobPosting from "../../Modal/JOB/JobPosting.js";
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

    const filter = { };
    // const filter = { is_active: true };

    // Count total jobs
    const totalJobs = await JobPosting.countDocuments(filter);

    // Fetch with populate + pagination
    const jobs = await JobPosting.find(filter)
      .populate("salon_id", "salon_name year_of_start contact_number")
      .populate("required_skills", "skill_name") // ✅ populate skill_name
      .skip((page - 1) * limit)
      .limit(limit);

    const result = jobs.map((job) => ({
      job_title: job.job_title,
      salary_range: job.salary_range,
      address: job.address,

      // ✅ return skill names instead of ObjectId
      required_skills: job.required_skills?.map((skill) => skill.skill_name),

      // Salon details (masked)
      salon: {
        name: maskString(job.salon_id?.salon_name),
        year_of_start: maskString(job.salon_id?.year_of_start?.toString()),
        contact_number: maskContact(job.salon_id?.contact_number),
      },
    }));

    res.status(200).json({
      success: true,
      total: totalJobs,
      page,
      totalPages: Math.ceil(totalJobs / limit),
      jobs: result,
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

