import User from "../../Modal/Users/User.js";
import Company from "../../Modal/Compony/ComponyModal.js";
import Salon from "../../Modal/Salon/Salon.js";
import mongoose from "mongoose";
import Candidate from "../../Modal/Candidate/Candidate.js";
export const addUser = async (req, res) => {
    try {
        const { name, email, password, whatsapp_number, domain_type } = req.body;

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
            domain_type
        });

        await newUser.save();

        if (domain_type === 'company') {
            const newCompany = new Company({
                user_id: newUser._id,
                whatsapp_number:newUser.whatsapp_number,

                
            });
            await newCompany.save();
        } else if (domain_type === 'salon') {
            const newSalon = new Salon({
                user_id: newUser._id,
                whatsapp_number:newUser.whatsapp_number,
                
            });
            await newSalon.save();
        } else if (domain_type === 'worker') {
            const newCandidate = new Candidate({
                user_id: newUser._id,
                contact_no:newUser.whatsapp_number,
            });

            await newCandidate.save();
        }
            res.status(201).json({
                message: 'User created successfully',
                user: newUser
            });
        } catch (error) {
            console.error('Error adding user:', error);
            res.status(500).json({ message: 'Server error' });
        }
    };
