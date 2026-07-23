import express from "express";
import { uploadJobPostingCSV, uploadEmpCSV, getJobPostings, updateJobPosting, deleteJobPosting, getEmployees, updateEmployee, deleteEmployee } from "../../Controller/importdummaydata/dummaydata.js";
import upload from "../../Middlewares/Uploadcsv/Uploadcsv.js";

const router = express.Router();

router.post("/upload-jobpostings", upload.single("file"), uploadJobPostingCSV);
router.post("/upload-employees", upload.single("file"), uploadEmpCSV);

router.get("/getEmployees", getEmployees);
router.put("/updateEmployee/:id", updateEmployee);
router.delete("/deleteEmployee/:id", deleteEmployee);

router.get("/getJobPostings", getJobPostings);
router.put("/updateJobPosting/:id", updateJobPosting);
router.delete("/deleteJobPosting/:id", deleteJobPosting);



export default router;






