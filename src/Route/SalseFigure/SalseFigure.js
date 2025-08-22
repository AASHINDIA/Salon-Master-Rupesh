import express from "express";
import { createRecord, getSalesFigures } from "../../Controller/Slaes/SalesFigure.js";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
const router = express.Router();


router.post("/records", createRecord);
router.get("/sales-figures", protect, getSalesFigures);


export default router;