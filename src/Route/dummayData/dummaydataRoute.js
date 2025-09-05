// routes/uploadRoutes.js
import express from "express";
import multer from "multer";
import { uploadJobPostingCSV, uploadEmpCSV, getJobPostings, updateJobPosting, deleteJobPosting, getEmployees, updateEmployee, deleteEmployee } from "../../Controller/importdummaydata/dummaydata.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// JobPosting Upload
router.post("/upload-jobpostings", upload.single("file"), uploadJobPostingCSV);

// Emp Upload
router.post("/upload-employees", upload.single("file"), uploadEmpCSV);

router.get("/getEmployees", getEmployees);
router.put("/updateEmployee/:id", updateEmployee);
router.delete("/deleteEmployee/:id", deleteEmployee);

router.get("/getJobPostings", getJobPostings);
router.put("/updateJobPosting/:id", updateJobPosting);
router.delete("/deleteJobPosting/:id", deleteJobPosting);



export default router;






