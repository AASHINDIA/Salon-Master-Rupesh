import express from "express";
import { createRecord, getSalesFigures } from "../../Controller/Slaes/SalesFigure.js";
const router = express.Router();


router.post("/records", createRecord);
router.get("/sales-figures", getSalesFigures);


export default router;