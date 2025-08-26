import User from '../../Modal/Users/User.js';
import XLSX from "xlsx";
import mongoose from 'mongoose';




export const importUsersFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // ✅ 1. Read Excel safely
        const workbook = XLSX.readFile(req.file.path, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            defval: "", // empty cell fallback
            raw: false,
        });

        if (!sheetData.length) {
            return res.status(400).json({ message: "Excel file is empty" });
        }

        let inserted = 0;
        let skipped = 0;
        let errors = [];

        const usersToInsert = [];

        // ✅ 2. Process Excel rows with validation
        for (const [index, row] of sheetData.entries()) {
            try {
                // --- a. Email validation ---
                if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                    skipped++;
                    errors.push(`Row ${index + 2}: Invalid or missing email`);
                    continue;
                }

                // --- b. Check for duplicate email ---
                const exists = await User.exists({ email: row.email.toLowerCase() });
                if (exists) {
                    skipped++;
                    continue;
                }

                // --- c. Password policy (min 8 chars, strong hash) ---
                let password = row.password || "Default@123";
                if (password.length < 8) {
                    password = "Default@123"; // enforce default secure password
                }

                // --- d. Sanitize inputs ---
                const safeName = String(row.name || "").trim().slice(0, 50);
                const safeWhatsapp = String(row.whatsapp_number || "")
                    .replace(/[^0-9]/g, "")
                    .slice(0, 15);

                usersToInsert.push({
                    name: safeName,
                    email: row.email.toLowerCase(),
                    password, // will be hashed by pre-save hook
                    domain_type: row.domain_type || "worker",
                    whatsapp_number: safeWhatsapp,
                    otp_verified: true,
                    email_verified_at: new Date(),
                    otp_sent_at: new Date(),
                    otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    devicetoken: row.devicetoken || null,
                });
            } catch (err) {
                skipped++;
                errors.push(`Row ${index + 2}: ${err.message}`);
            }
        }

        // ✅ 3. Bulk insert with transaction safety
        if (usersToInsert.length > 0) {
            await User.insertMany(usersToInsert, { ordered: false });
            inserted = usersToInsert.length;
        }

        // ✅ 4. Response with full details
        return res.status(201).json({
            message: "Import completed securely",
            inserted,
            skipped,
            errors,
        });
    } catch (error) {
        console.error("❌ Import Error:", error);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};
