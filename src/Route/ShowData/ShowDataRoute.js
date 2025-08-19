import express from "express";
import { getAvailableCandidates,getJobPostings } from "../../Controller/ShowData/getCandidate.js";

const router = express.Router();

// GET /api/jobs?page=1&limit=10
router.get("/getcandidates", getJobPostings);
router.get("/getjob", getAvailableCandidates);

export default router;
