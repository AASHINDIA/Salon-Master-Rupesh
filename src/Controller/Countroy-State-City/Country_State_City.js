import cities from "../../Modal/State-City-Country/cities.js";
import Countries from "../../Modal/State-City-Country/Countries.js";
import States from "../../Modal/State-City-Country/States.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';





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





// ES module me __dirname define karna
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const importAllData = async (req, res) => {
  try {
    // Paths to JSON files
    const countriesPath = path.join(__dirname, '../data/countries.json');
    const statesPath = path.join(__dirname, '../data/states.json');
    const citiesPath = path.join(__dirname, '../data/cities.json');

    // Read JSON files
    const countriesRaw = fs.readFileSync(countriesPath, 'utf-8');
    const statesRaw = fs.readFileSync(statesPath, 'utf-8');
    const citiesRaw = fs.readFileSync(citiesPath, 'utf-8');

    const countriesData = JSON.parse(countriesRaw);
    const statesData = JSON.parse(statesRaw);
    const citiesData = JSON.parse(citiesRaw);

    // Check if arrays exist in JSON
    if (!countriesData.countries || !statesData.states || !citiesData.cities) {
      return res.status(400).json({ 
        success: false, 
        message: 'JSON files structure invalid. Make sure to have countries, states, cities arrays.' 
      });
    }

    // Insert into MongoDB
    await Countries.insertMany(countriesData.countries);
    await States.insertMany(statesData.states);
    await cities.insertMany(citiesData.cities);

    res.status(200).json({ success: true, message: 'Countries, States and Cities imported successfully' });
  } catch (error) {
    console.error('Import error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

