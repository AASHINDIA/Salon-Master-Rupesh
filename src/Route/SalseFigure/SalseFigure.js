import express from "express";
import {
    createRecord,
    getSalesFigures,
    getRecords,
    exportRecordExcel,
    updateRecord
} from "../../Controller/Slaes/SalesFigure.js";

import { protect } from "../../Middlewares/authMiddleware/auth.js";

const router = express.Router();

/** ---------------------------------------
 *  📌 CREATE NEW SALES RECORD
 *  POST: /api/sales/records
 ----------------------------------------*/
router.post("/records", protect, createRecord);

/** ---------------------------------------
 *  📌 GET SALES TOTALS (daily / monthly / yearly)
 *  GET: /api/sales/sales-figures?period=daily
 ----------------------------------------*/
router.get("/sales-figures", protect, getSalesFigures);

/** ---------------------------------------
 *  📌 GET RECORDS (pagination + search + filter)
 *  GET: /api/sales/records?search=facial&page=1&limit=10
 ----------------------------------------*/
router.get("/records", protect, getRecords);

/** ---------------------------------------
 *  📌 EXPORT ALL RECORDS TO EXCEL
 *  GET: /api/sales/export-excel
 ----------------------------------------*/
router.get("/export-excel", protect, exportRecordExcel);

/** ---------------------------------------
 *  📌 UPDATE A RECORD
 *  PUT: /api/sales/records/:id
 ----------------------------------------*/
router.put("/records/:id", protect, updateRecord);

export default router;
