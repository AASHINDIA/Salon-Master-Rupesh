import { createFranchisee, getAllFranchisees, getFranchiseeByUserId } from "../../Controller/FTC/Franchisee.js";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
import express from 'express';

const route = express.Router();

route.post('/createFranchisee', protect, createFranchisee);
route.get('/getAllFranchisees', getAllFranchisees);

export default route;