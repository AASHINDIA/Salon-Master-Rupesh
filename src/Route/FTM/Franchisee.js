import { createFranchisee, getAllFranchisees, getFranchiseeByUserId } from "../../Controller/FTC/Franchisee.js";
import express from 'express';

const route = express.Router();

route.post('/createFranchisee', createFranchisee);
route.get('/getAllFranchisees', getAllFranchisees);

export default route;