
import Salary from "../../Modal/SalaryManagmentSystem/Salarymanagement.js";
import mongoose from "mongoose";

export const addSalaryDetails = async (req, res) => {
    try {
        const { salon_id, worker_id, date, service_name, amount_earned } = req.body;

        if (!salon_id || !worker_id || !date || amount_earned == null) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const workDate = new Date(date);
        const month = workDate.getMonth() + 1;
        const year = workDate.getFullYear();

        // Find existing salary document for this worker, salon, and month
        let salary = await Salary.findOne({ salon_id, worker_id, month, year });

        if (!salary) {
            // If no document exists, create a new one
            salary = new Salary({
                salon_id,
                worker_id,
                month,
                year,
                total_working_days: 0,
                days_present: 0,
                work_details: [],
                total_salary: 0,
                paid: 0,
                payment_status: "pending",
            });
        }

        // Add new work detail
        salary.work_details.push({
            date: workDate,
            service_name,
            amount_earned,
        });

        // OPTIONAL: Auto-update total_salary based on earned
        const totalEarned = salary.work_details.reduce(
            (sum, item) => sum + (item.amount_earned || 0),
            0
        );
        salary.total_salary = totalEarned;

        // Optional: Update payment status based on paid vs total_salary
        if (salary.paid >= salary.total_salary) {
            salary.payment_status = "paid";
        } else if (salary.paid > 0) {
            salary.payment_status = "partial";
        } else {
            salary.payment_status = "pending";
        }

        await salary.save();

        res.status(200).json({
            message: "Salary details updated successfully",
            salary,
            total_amount_earned: totalEarned,
        });
    } catch (err) {
        console.error("Error adding salary details:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


export const getSalarySummary = async (req, res) => {
    try {
        const { worker_id, salon_id, month, year } = req.query;

        if (!worker_id || !salon_id) {
            return res.status(400).json({ message: "worker_id and salon_id are required" });
        }

        const queryMonth = parseInt(month);
        const queryYear = parseInt(year);

        // ========== 1. Daily Work Details (for given month & year) ==========
        const monthlySalary = await Salary.findOne({
            worker_id,
            salon_id,
            month: queryMonth,
            year: queryYear,
        });

        const dailyWork = monthlySalary?.work_details || [];

        // ========== 2. Monthly Total ==========
        const totalMonthlyEarned = dailyWork.reduce(
            (sum, work) => sum + (work.amount_earned || 0),
            0
        );

        // ========== 3. Yearly Total ==========
        const yearlySalaries = await Salary.find({
            worker_id,
            salon_id,
            year: queryYear,
        });

        const totalYearlyEarned = yearlySalaries.reduce((sum, sal) => {
            return sum + sal.work_details.reduce((s, w) => s + (w.amount_earned || 0), 0);
        }, 0);

        res.status(200).json({
            worker_id,
            salon_id,
            month: queryMonth,
            year: queryYear,
            totalMonthlyEarned,
            totalYearlyEarned,
            dailyWork,
        });
    } catch (err) {
        console.error("Error in getSalarySummary:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};