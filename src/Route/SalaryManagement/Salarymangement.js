import { addSalaryDetails, getSalarySummary } from "../../Controller/Salarymanagement/SalaryManagement.js";
import express from "express";
const router = express.Router();
// Route to add salary details
router.post("/add-salary", addSalaryDetails);

router.get("/salary/summary", getSalarySummary);

// Export the router
export default router;