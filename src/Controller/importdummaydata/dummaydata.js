import Emp from '../../Modal/Dummaydata/Emp.js'
import JobPostingDummy from '../../Modal/Dummaydata/jobsDummay.js'
import Skill from '../../Modal/skill/skill.js'
import csv from "csv-parser";
import fs from "fs";
import { getPagination,paginateResult } from '../../Utils/pagination.js';

export const uploadJobPostingCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        results.push({
          salon_id: {
            name: row.salon_name,
            brand_name: row.brand_name,
            contact_no: row.contact_no,
          },
          job_title: row.job_title || "Hair Stylist",
          required_skills: row.required_skills
            ? row.required_skills.split(",").map((s) => s.trim())
            : [],
          custom_job_title: row.custom_job_title || "",
          job_description: row.job_description,
          gender_preference: row.gender_preference || "Any",
          required_experience: row.required_experience || "Fresher",
          salary_type: row.salary_type || "Fixed",
          salary_range: {
            min: Number(row.salary_min || 0),
            max: Number(row.salary_max || 0),
          },
          job_type: row.job_type || "Full-time",
          work_timings: {
            start: row.start_time,
            end: row.end_time,
          },
          working_days: row.working_days
            ? row.working_days.split(",").map((d) => d.trim())
            : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          benefits: row.benefits
            ? row.benefits.split(",").map((b) => b.trim())
            : [],
          vacancy_count: Number(row.vacancy_count || 1),
          address: {
            country: row.country,
            state: row.state,
            city: row.city,
            pincode: row.pincode,
            countryIsoCode: row.countryIsoCode,
            stateIsoCode: row.stateIsoCode,
          },
          location: row.location,
          contact_person: {
            name: row.contact_name,
            phone: row.contact_phone,
            email: row.contact_email,
          },
        });
      })
      .on("end", async () => {
        await JobPostingDummy.insertMany(results);
        fs.unlinkSync(req.file.path); // cleanup
        res.json({
          message: "Job postings uploaded successfully",
          count: results.length,
        });
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading job postings" });
  }
};


export const uploadEmpCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        results.push({
          user_id: {
            name: row.user_name,
            contact_no: row.user_contact_no,
          },
          name: row.name,
          date_of_birth: row.date_of_birth ? new Date(row.date_of_birth) : null,
          gender: row.gender,
          skills: row.skills
            ? row.skills.split(",").map((s) => s.trim())
            : [],
          available_for_join: row.available_for_join
            ? row.available_for_join.toLowerCase() === "true"
            : true,
          joining_date: row.joining_date ? new Date(row.joining_date) : null,
          expected_salary: {
            min: Number(row.salary_min || 0),
            max: Number(row.salary_max || 0),
          },
          looking_job_location: row.looking_job_location || "india",
          preferred_locations: row.preferred_locations
            ? row.preferred_locations.split(",").map((l) => l.trim())
            : [],
        });
      })
      .on("end", async () => {
        await Emp.insertMany(results);
        fs.unlinkSync(req.file.path); // cleanup
        res.json({
          message: "Employees uploaded successfully",
          count: results.length,
        });
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading employees" });
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
