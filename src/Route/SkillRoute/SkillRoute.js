import { addSkill, getAllSkills, updateSkill, deleteSkill } from "../../Controller/SkillController/Skill.js";

import express from "express";
import { protect } from '../../Middlewares/authMiddleware/auth.js';
const router = express.Router();
// Protect all routes with auth middleware
// Get all skills
router.get('/', getAllSkills);

// Add a new skill  
router.post('/', addSkill);

// Update an existing skill
router.put('/:id', updateSkill);
// Delete a skill
router.delete('/:id', deleteSkill);
export default router;  