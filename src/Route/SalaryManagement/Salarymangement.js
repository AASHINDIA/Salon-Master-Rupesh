import { addSalaryDetails, getSalarySummary } from "../../Controller/Salarymanagement/SalaryManagement.js";
import express from "express";
const router = express.Router();
// Route to add salary details
router.post("/api/v1/salary", addSalaryDetails);

router.get("/salary/summary", getSalarySummary);

// Export the router
export default router;