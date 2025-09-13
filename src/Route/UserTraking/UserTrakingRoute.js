import express from "express";
import { getAllUsers,getUserProfileById } from "../../Controller/userTrakingSystem/userTraking.js";
const router = express.Router();

// Get profile of a particular user
router.get("/:userId/profile", getUserProfileById);
router.get("/getAllUsers", getAllUsers);

export default router;
