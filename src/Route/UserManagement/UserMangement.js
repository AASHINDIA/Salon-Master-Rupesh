import express from 'express';

import {
    getAllUsers,
    getUserById,
    updateUser,
    toggleUserSuspension,
    deleteUser
} from '../../Controller/UserManagement/UserMangement.js';
import { protect } from '../../Middlewares/authMiddleware/auth.js'

const router = express.Router();

// Admin routes
router.route('/getAllUsers')
    .get(protect, getAllUsers);

router.route('/getAllUsersbyId/:id')
    .get(protect, getUserById)
    .put(protect, updateUser)
    .delete(protect, deleteUser);

router.route('/:id/suspend')
    .patch(protect, toggleUserSuspension);

export default router;