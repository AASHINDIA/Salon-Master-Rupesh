import Emp from '../../Modal/Dummaydata/Emp.js'
import JobPostingDummy from '../../Modal/Dummaydata/jobsDummay.js'
import Skill from '../../Modal/skill/skill.js'
import csv from "csv-parser";
import fs from "fs";
import { getPagination,paginateResult } from '../../Utils/pagination.js';
import moment from "moment";



export const uploadJobPostingCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const results = [];
    const errors = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          if (!row.salon_name || !row.job_title) {
            errors.push({ row: row.job_title || "unknown", error: "salon_name and job_title are required" });
            return;
          }

          let genderPref = "Any";
          if (row.gender_preference) {
            const g = row.gender_preference.trim();
            if (["Male", "Female", "Any"].includes(g)) genderPref = g;
          }

          const entry = {
            salon_id: {
              name: row.salon_name,
              brand_name: row.brand_name || "",
              contact_no: row.contact_no || "",
            },
            job_title: row.job_title,
            required_skills: row.required_skills
              ? row.required_skills.split(",").map((s) => s.trim())
              : [],
            custom_job_title: row.custom_job_title || "",
            job_description: row.job_description || "",
            gender_preference: genderPref,
            required_experience: row.required_experience || "Fresher",
            salary_range: {
              min: row.salary_min ? Number(row.salary_min) : undefined,
              max: row.salary_max ? Number(row.salary_max) : undefined,
            },
            job_type: row.job_type || "Full-time",
            work_timings: {
              start: row.start_time || "",
              end: row.end_time || "",
            },
            benefits: row.benefits
              ? row.benefits.split(",").map((b) => b.trim())
              : [],
            address: {
              country: row.country || "",
              state: row.state || "",
              city: row.city || "",
              pincode: row.pincode || "",
              countryIsoCode: row.countryIsoCode || "",
              stateIsoCode: row.stateIsoCode || "",
            },
            location: row.location || "",
            contact_person: {
              name: row.contact_name || "",
              phone: row.contact_phone || "",
              email: row.contact_email || "",
            },
          };

          if (row.is_Preuime) entry.is_Preuime = row.is_Preuime.toLowerCase() === "true";
          if (row.salary_type) entry.salary_type = row.salary_type;
          if (row.working_days) entry.working_days = row.working_days.split(",").map((d) => d.trim());
          if (row.vacancy_count) entry.vacancy_count = Number(row.vacancy_count);
          if (row.is_active) entry.is_active = row.is_active.toLowerCase() === "true";
          if (row.posted_date) {
            const pd = moment(row.posted_date, ["YYYY-MM-DD", "DD-MM-YYYY", "MM/DD/YYYY"], true);
            if (pd.isValid()) entry.posted_date = pd.toDate();
          }

          results.push(entry);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (results.length === 0) {
      return res.status(400).json({
        message: "No valid rows to insert",
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    await JobPostingDummy.insertMany(results);
    res.json({
      message: "Job postings uploaded successfully",
      count: results.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Error uploading job postings", error: err.message });
  }
};





export const uploadEmpCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const results = [];
    const errors = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          if (!row.user_name || !row.user_contact_no) {
            errors.push({ row: row.name || "unknown", error: "user_name and user_contact_no are required" });
            return;
          }

          let dob = null;
          if (row.date_of_birth) {
            const parsed = moment(row.date_of_birth, [
              "YYYY-MM-DD", "DD-MM-YYYY", "MM/DD/YYYY",
            ], true);
            dob = parsed.isValid() ? parsed.toDate() : null;
          }

          let joiningDate = null;
          if (row.joining_date) {
            const parsed = moment(row.joining_date, [
              "YYYY-MM-DD", "DD-MM-YYYY", "MM/DD/YYYY",
            ], true);
            joiningDate = parsed.isValid() ? parsed.toDate() : null;
          }

          let gender = null;
          if (row.gender) {
            const g = row.gender.trim().toLowerCase();
            gender = ["male", "female", "other"].includes(g) ? g : null;
          }

          const entry = {
            user_id: {
              name: row.user_name,
              contact_no: row.user_contact_no,
            },
            name: row.name || "",
            date_of_birth: dob,
            gender: gender,
            skills: row.skills
              ? row.skills.split(",").map((s) => s.trim())
              : [],
            joining_date: joiningDate,
            expected_salary: {
              min: row.salary_min ? Number(row.salary_min) : undefined,
              max: row.salary_max ? Number(row.salary_max) : undefined,
            },
            looking_job_location: row.looking_job_location || "india",
            preferred_locations: row.preferred_locations
              ? row.preferred_locations.split(",").map((l) => l.trim())
              : [],
          };

          if (row.is_Preuime) entry.is_Preuime = row.is_Preuime.toLowerCase() === "true";
          if (row.available_for_join) entry.available_for_join = row.available_for_join.toLowerCase() === "true";

          results.push(entry);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (results.length === 0) {
      return res.status(400).json({
        message: "No valid rows to insert",
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    await Emp.insertMany(results, { ordered: false });
    res.json({
      message: "Employees uploaded successfully",
      count: results.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Upload CSV Error:", err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Error uploading employees", error: err.message });
  }
};

// ✅ Get All Job Postings with pagination
export const getJobPostings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { skip } = getPagination(page, limit);

    const total = await JobPostingDummy.countDocuments();
    const jobs = await JobPostingDummy.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json(paginateResult(jobs, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: "Error fetching job postings", error });
  }
};

// ✅ Update Job Posting
export const updateJobPosting = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedJob = await JobPostingDummy.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedJob) {
      return res.status(404).json({ message: "Job posting not found" });
    }

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: "Error updating job posting", error });
  }
};

// ✅ Delete Job Posting
export const deleteJobPosting = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedJob = await JobPostingDummy.findByIdAndDelete(id);

    if (!deletedJob) {
      return res.status(404).json({ message: "Job posting not found" });
    }

    res.json({ message: "Job posting deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting job posting", error });
  }
};









// ✅ Get Employees with pagination
export const getEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { skip } = getPagination(page, limit);

    const total = await Emp.countDocuments();
    const employees = await Emp.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json(paginateResult(employees, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: "Error fetching employees", error });
  }
};

// ✅ Update Employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEmp = await Emp.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedEmp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(updatedEmp);
  } catch (error) {
    res.status(500).json({ message: "Error updating employee", error });
  }
};

// ✅ Delete Employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEmp = await Emp.findByIdAndDelete(id);

    if (!deletedEmp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting employee", error });
  }
};
