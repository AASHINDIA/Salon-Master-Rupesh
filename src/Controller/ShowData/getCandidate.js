
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



/**
 * Safely converts a value to a plain string, returns null if not usable.
 */
const safeString = (val) => {
  if (val === undefined || val === null) return null;
  return String(val);
};

/**
 * Safely converts a Date-like value to ISO string, returns null if invalid.
 */
const safeDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Normalize a single job document (premium or dummy) into one unified shape.
 * Wrapped defensively so a single malformed document can never crash the
 * whole request — worst case that one job comes back with mostly nulls.
 */
const normalizeJob = (job, isPremium) => {
  try {
    if (!job) return null;

    // salon_id may be: a populated object, a raw ObjectId, or missing entirely
    const salonDoc =
      job.salon_id && typeof job.salon_id === "object" ? job.salon_id : null;

    const salaryRange =
      job.salary_range && typeof job.salary_range === "object"
        ? {
            min:
              typeof job.salary_range.min === "number"
                ? job.salary_range.min
                : null,
            max:
              typeof job.salary_range.max === "number"
                ? job.salary_range.max
                : null,
          }
        : null;

    const workTimings =
      job.work_timings && typeof job.work_timings === "object"
        ? {
            start: safeString(job.work_timings.start),
            end: safeString(job.work_timings.end),
          }
        : null;

    const address =
      job.address && typeof job.address === "object"
        ? {
            country: safeString(job.address.country),
            state: safeString(job.address.state),
            city: safeString(job.address.city),
            pincode: safeString(job.address.pincode),
            countryIsoCode: safeString(job.address.countryIsoCode),
            stateIsoCode: safeString(job.address.stateIsoCode),
          }
        : null;

    let requiredSkills = [];
    if (Array.isArray(job.required_skills)) {
      requiredSkills = job.required_skills
        .map((skill) => {
          if (!skill) return null;
          if (isPremium) {
            // populated -> { skill_name: "..." }
            return typeof skill === "object"
              ? safeString(skill.skill_name)
              : null;
          }
          // dummy schema stores plain strings (or could be anything odd)
          return typeof skill === "string" ? skill : safeString(skill);
        })
        .filter((s) => s !== null && s !== undefined && s !== "");
    }

    const salon = {
      name: isPremium
        ? safeString(salonDoc?.salon_name)
        : safeString(salonDoc?.name),
      brand_name: isPremium ? null : safeString(salonDoc?.brand_name),
      year_of_start: isPremium
        ? safeString(salonDoc?.year_of_start)
        : null,
      contact_number: isPremium
        ? safeString(salonDoc?.contact_number)
        : safeString(salonDoc?.contact_no),
    };

    return {
      _id: safeString(job._id),
      job_title: safeString(job.job_title),
      custom_job_title: safeString(job.custom_job_title),
      job_description: safeString(job.job_description),
      gender_preference: safeString(job.gender_preference) || "Any",
      required_experience: safeString(job.required_experience),
      salary_type: safeString(job.salary_type),
      salary_range: salaryRange,
      job_type: safeString(job.job_type),
      work_timings: workTimings,
      working_days: Array.isArray(job.working_days) ? job.working_days : [],
      benefits: Array.isArray(job.benefits) ? job.benefits : [],
      vacancy_count:
        typeof job.vacancy_count === "number" ? job.vacancy_count : null,
      is_active: typeof job.is_active === "boolean" ? job.is_active : null,
      posted_date: safeDate(job.posted_date),
      address,
      location: safeString(job.location),
      required_skills: requiredSkills,
      salon,
      is_premium: !!isPremium,
    };
  } catch (err) {
    console.error("Error normalizing job document:", err, "job _id:", job?._id);
    return null; // drop the broken doc rather than crash the response
  }
};

export const getJobPostings = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100; // sane upper bound so nobody can request the whole DB

    // Build manual filter from query params.
    // A filter key is added ONLY if the client explicitly sent that param.
    // If nothing is sent, filter stays {} and ALL jobs (active + inactive) return.
    const filter = {};

    if (req.query.is_active !== undefined) {
      filter.is_active = req.query.is_active === "true";
    }

    if (req.query.job_title) {
      filter.job_title = { $regex: String(req.query.job_title).trim(), $options: "i" };
    }

    if (req.query.gender) {
      filter.gender_preference = String(req.query.gender).trim();
    }

    if (req.query.job_type) {
      filter.job_type = String(req.query.job_type).trim();
    }

    if (req.query.location) {
      const locationRegex = { $regex: String(req.query.location).trim(), $options: "i" };
      filter.$or = [
        { location: locationRegex },
        { "address.city": locationRegex },
        { "address.state": locationRegex },
      ];
    }

    // Fetch from both schemas with the SAME filter, so behavior is consistent.
    // Each promise is guarded individually — if one collection errors out,
    // we still return data from the other instead of failing the whole request.
    const [premiumResult, dummyResult] = await Promise.allSettled([
      JobPosting.find(filter)
        .populate("salon_id", "salon_name year_of_start contact_number")
        .populate("required_skills", "skill_name")
        .lean(),
      JobPostingDummy.find(filter).lean(),
    ]);

    const premiumJobs =
      premiumResult.status === "fulfilled" && Array.isArray(premiumResult.value)
        ? premiumResult.value
        : [];

    const dummyJobs =
      dummyResult.status === "fulfilled" && Array.isArray(dummyResult.value)
        ? dummyResult.value
        : [];

    if (premiumResult.status === "rejected") {
      console.error("JobPosting query failed:", premiumResult.reason);
    }
    if (dummyResult.status === "rejected") {
      console.error("JobPostingDummy query failed:", dummyResult.reason);
    }

    // Normalize + drop any doc that failed to normalize (null)
    const allJobs = [
      ...premiumJobs.map((job) => normalizeJob(job, true)),
      ...dummyJobs.map((job) => normalizeJob(job, false)),
    ].filter(Boolean);

    // Sort by posted_date (newest first), treating missing dates as oldest
    allJobs.sort((a, b) => {
      const dateA = a.posted_date ? new Date(a.posted_date).getTime() : 0;
      const dateB = b.posted_date ? new Date(b.posted_date).getTime() : 0;
      return dateB - dateA;
    });

    // Paginate combined results
    const total = allJobs.length;
    const start = (page - 1) * limit;
    const jobs = allJobs.slice(start, start + limit);

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      jobs,
    });
  } catch (error) {
    console.error("Error fetching job postings:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching job postings",
      error: error?.message || "Unknown error",
    });
  }
};
