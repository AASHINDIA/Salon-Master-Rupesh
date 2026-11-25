import express from "express";
import { uploadJobPostingCSV, uploadEmpCSV, getEmployees, updateEmployee, deleteEmployee } from "../../Controller/importdummaydata/dummaydata.js";
import upload from "../../Middlewares/Uploadcsv/Uploadcsv.js";
import { protect, authorizeDomain } from "../../Middlewares/authMiddleware/auth.js";

const router = express.Router();

router.post(
    "/upload-jobpostings",
    protect,
    authorizeDomain('superadmin', 'admin'),
    upload.single("file"),
    uploadJobPostingCSV
);
router.post("/upload-employees", upload.single("file"), uploadEmpCSV);

router.get("/getEmployees", getEmployees);
router.put("/updateEmployee/:id", updateEmployee);
router.delete("/deleteEmployee/:id", deleteEmployee);

export default router;
