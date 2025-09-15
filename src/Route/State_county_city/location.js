import express from "express";
import { getLocationData,importAllData } from "../../Controller/Countroy-State-City/Country_State_City.js";

const router = express.Router(); // ✅ Correct way

// Route for countries → states → cities
router.get("/", getLocationData);
router.post("/", importAllData);

export default router; // ✅ Correct export