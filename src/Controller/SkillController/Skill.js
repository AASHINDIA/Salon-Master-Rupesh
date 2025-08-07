import Skill from "../../Modal/skill/skill.js";

// Add Skill
export const addSkill = async (req, res) => {
    try {
        const { skill_name, skill_description, skill_level, skill_category } = req.body;

        const skillData = new Skill({
            skill_name,
            skill_description,
            skill_level,
            skill_category
        });

        await skillData.save();

        res.status(200).json({
            success: true,
            message: 'Skill saved successfully',
            data: skillData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error in creating skill',
            error: error.message
        });
    }
};

// Update Skill
export const updateSkill = async (req, res) => {
    try {
        const { id } = req.params;

        const existingSkill = await Skill.findById(id);
        if (!existingSkill) {
            return res.status(404).json({
                success: false,
                message: 'Skill not found'
            });
        }

        const updatedSkill = await Skill.findByIdAndUpdate(id, req.body, { new: true });

        res.status(200).json({
            success: true,
            message: 'Skill updated successfully',
            data: updatedSkill
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error in updating skill',
            error: error.message
        });
    }
};

// Delete Skill
export const deleteSkill = async (req, res) => {
    try {
        const { id } = req.query;

        const existingSkill = await Skill.findById(id);
        if (!existingSkill) {
            return res.status(404).json({
                success: false,
                message: 'Skill not found'
            });
        }

        await Skill.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Skill deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Something went wrong',
            error: error.message
        });
    }
};

// Get Skills with Pagination and Search
export const getAllSkills = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const query = {
            skill_name: { $regex: search, $options: 'i' } // case-insensitive search
        };

        const total = await Skill.countDocuments(query);
        const skills = await Skill.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 }); // Optional: sort newest first

        res.status(200).json({
            success: true,
            message: 'Skills fetched successfully',
            data: skills,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch skills',
            error: error.message
        });
    }
};
