import State from "../../Modal/StateCityDataSet/State.js";
import mongoose from "mongoose";
import fs from 'fs/promises';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const uploadDataset = async () => {
    try {
        // Use path relative to the current file location
        const filePath = path.join(__dirname, '../../dataset.json');
        const rawData = await fs.readFile(filePath, 'utf-8');
        const states = JSON.parse(rawData);

        await State.insertMany(states);
        console.log("Dataset uploaded successfully");
    } catch (err) {
        console.error("Error:", err);
    }
};

export const getLocations = async (req, res) => {
    try {
        const { stateId, districtId } = req.query;

        // Case 1: Fetch a specific district of a specific state
        if (stateId && districtId) {
            const state = await State.findOne(
                { id: stateId, "districts.id": districtId },
                { name: 1, districts: { $elemMatch: { id: districtId } } }
            );

            if (!state) {
                return res.status(404).json({
                    success: false,
                    message: "State or district not found"
                });
            }

            return res.status(200).json({
                success: true,
                stateName: state.name,
                district: state.districts[0] || null
            });
        }

        // Case 2: Fetch all cities/districts of a state
        if (stateId) {
            const state = await State.findOne(
                { id: stateId },
                { districts: 1, name: 1 }
            );

            if (!state) {
                return res.status(404).json({
                    success: false,
                    message: "State not found"
                });
            }

            return res.status(200).json({
                success: true,
                stateName: state.name,
                cities: state.districts
            });
        }

        // Case 3: Fetch all states
        const states = await State.find({}, { name: 1, id: 1 });
        return res.status(200).json({ success: true, states });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};
