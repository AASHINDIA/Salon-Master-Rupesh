import cities from "../../Modal/State-City-Country/cities.js";
import Countries from "../../Modal/State-City-Country/Countries.js";
import States from "../../Modal/State-City-Country/States.js";



/**
 * Universal Location Controller
 * - If no params → returns all countries
 * - If countryId is provided → returns states for that country
 * - If stateId is provided → returns cities for that state
 */
export const getLocationData = async (req, res) => {
    try {
        const { countryId, stateId } = req.query; // take params from query string

        // Case 1: No params → return all countries
        if (!countryId && !stateId) {
            const countrie = await Countries.find().sort({ name: 1 });
            return res.status(200).json({
                success: true,
                type: "countries",
                count: countrie.length,
                data: countrie,
            });
        }

        // Case 2: countryId provided → return states
        if (countryId && !stateId) {
            const state = await States.find({ country_id: Number(countryId) }).sort({
                name: 1,
            });
            return res.status(200).json({
                success: true,
                type: "states",
                countryId,
                count: state.length,
                data: state,
            });
        }

        // Case 3: stateId provided → return cities
        if (stateId) {
            const citie = await cities.find({ state_id: Number(stateId) }).sort({
                name: 1,
            });
            return res.status(200).json({
                success: true,
                type: "cities",
                stateId,
                count: citie.length,
                data: citie,
            });
        }

        // fallback (should not hit here)
        return res.status(400).json({
            success: false,
            message: "Invalid request parameters",
        });
    } catch (error) {
        console.error("Error fetching location data:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching location data",
            error: error.message,
        });
    }
};
