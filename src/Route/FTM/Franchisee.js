import { createFranchisee, getAllFranchisees, getFranchiseeByUserId } from "../../Controller/FTC/Franchisee.js";
import express from 'express';

const route = express.Router();

route.post('/create', createFranchisee);
route.get('/get', getAllFranchisees);

export default route;