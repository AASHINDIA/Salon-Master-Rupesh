import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
    {
        salon_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Salon",
            required: true,
        },
        worker_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        month: {
            type: Number,
            default: () => new Date().getMonth() + 1,
        },
        year: {
            type: Number,
            default: () => new Date().getFullYear(),
        },
        total_working_days: {
            type: Number,
            default: 0,
        },
        days_present: {
            type: Number,
            default: 0,
        },
        work_details: [
            {
                date: { type: Date, required: true },
                service_name: { type: String },
                amount_earned: { type: Number, default: 0 },
            },
        ],
        total_salary: {
            type: Number,
            required: true,
        },
        paid: {
            type: Number,
            default: 0,
        },
        payment_status: {
            type: String,
            enum: ["pending", "partial", "paid"],
            default: "pending",
        },
    },
    {
        timestamps: true,
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
    }
);

// Virtual field to calculate total amount earned from work_details
salarySchema.virtual("total_amount_earned").get(function () {
    return this.work_details.reduce((sum, work) => sum + (work.amount_earned || 0), 0);
});

const Salary = mongoose.model("Salary", salarySchema);
export default Salary;
