// routes/leads.routes.js
import express from "express";


import {
    getEmployeeLeads,
    getEmployeeLeadById,
    createEmployeeLeads,
    getSalonLeads,
    getSalonLeadById,
    createSalonLeads,
    createLead,
    getAllLeads,
    exportLeads,
} from "../../Controller/leadsdata/Leadsdata.js";
const router = express.Router();

/* Employee */
router.route("/employee-leads")
    .get(getEmployeeLeads)
    .post(createEmployeeLeads);

router.get("/employee-leads/:id", getEmployeeLeadById);

/* Salon */
router.route("/salon-leads")
    .get(getSalonLeads)
    .post(createSalonLeads);

router.get("/salon-leads/:id", getSalonLeadById);

router.post("/leads", createLead);
router.get("/leads", getAllLeads);
router.get("/export", exportLeads);

export default router;