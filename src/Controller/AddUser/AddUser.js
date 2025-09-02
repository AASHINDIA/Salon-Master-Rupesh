import User from "../../Modal/Users/User.js";

export const addUser = async (req, res) => {
    try {
        const { name, email, password, whatsapp_number, role } = req.body;

        // Check if user already exists (by email OR WhatsApp number)
        const existingUser = await User.findOne({
            $or: [{ email }, { whatsapp_number }]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email or WhatsApp number' });
        }

        // Create new user
        const newUser = new User({
            name,
            email,
            password,
            whatsapp_number,
            role
        });

        await newUser.save();

        res.status(201).json({
            message: 'User created successfully',
            user: newUser
        });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
