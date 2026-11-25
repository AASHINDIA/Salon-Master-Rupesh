import Emp from '../../Modal/Dummaydata/Emp.js'
import csv from "csv-parser";
import fs from "fs";
import { getPagination, paginateResult } from '../../Utils/pagination.js';
import moment from "moment";
import { importJobPostings } from '../../services/jobPostingImport.service.js';


// Upload job postings CSV and create real User + Salon + JobPosting records.
export const uploadJobPostingCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const results = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ message: "No valid rows to insert" });
    }

    const summary = await importJobPostings(results, { source: 'csv' });

    if (summary.jobsCreated === 0 && summary.errors.length > 0) {
      return res.status(400).json({
        message: "No valid rows to insert",
        ...summary,
      });
    }

    res.json({
      message: "Job postings uploaded successfully",
      ...summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading job postings", error: err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
    res.status(500).json({ message: "Error uploading employees", error: err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
