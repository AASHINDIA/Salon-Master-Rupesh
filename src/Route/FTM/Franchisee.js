import { createFranchisee, getAllFranchisees, getFranchiseeByUserId } from "../../Controller/FTC/Franchisee.js";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
import express from 'express';
import multer from 'multer';

const route = express.Router();
const storage = multer.memoryStorage(); // ✅ stores buffer in memory
const upload = multer({ storage });
route.post('/createFranchisee', protect, upload.array('image_academy', 4), createFranchisee);
route.get('/getAllFranchisees', getAllFranchisees);

export default route;