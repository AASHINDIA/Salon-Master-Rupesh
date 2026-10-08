// routes/permissionRoutes.js
import express from "express";
import {
    assignPermissions,
    getUserPermissions,
    createPermission,
    listPermissions
} from "../../Controller/AuthController/permissionController.js";
import { assignAdminPermissions } from "../../Controller/AddPermision/assignAdminPermissions.js";
import { protect, authorizeDomain } from "../../Middlewares/authMiddleware/auth.js";
const router = express.Router();

// Only superadmins can create permissions
router.post("/create", protect, authorizeDomain('superadmin'), createPermission);

// Only superadmins can assign permissions to users
router.post("/assign", protect, authorizeDomain('superadmin'), assignPermissions);

// Any logged-in user can get their permissions
router.get("/my", protect, getUserPermissions);

// Only superadmins can see all permissions
router.get("/all", protect, authorizeDomain('superadmin'), listPermissions);

// Superadmin can assign permissions to admin users
router.put("/admin/:userId/permissions", protect, authorizeDomain('superadmin'), assignAdminPermissions);

export default router;
