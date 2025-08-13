// routes/permissionRoutes.js
import express from "express";
import {
    assignPermissions,
    getUserPermissions,
    createPermission,
    listPermissions
} from "../../Controller/AuthController/permissionController.js";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
const router = express.Router();

// Only superadmins can create permissions
router.post("/create", createPermission);

// Only superadmins can assign permissions to users
router.post("/assign", assignPermissions);

// Any logged-in user can get their permissions
router.get("/my", protect, getUserPermissions);

// Only superadmins can see all permissions
router.get("/all", listPermissions);

export default router;
