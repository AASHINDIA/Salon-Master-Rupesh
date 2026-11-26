import mongoose from "mongoose";

const employeeLeadsSchema = new mongoose.Schema(

    {
        name: {
            type: String,
            required: true
        },
       
        phone: {
            type: String,
            required: true
        },
        location: {
            type: String,
        },
        skills: {
            type: [String],
        },
        lookingFor: {
            type: String,
            enum: ["full-time", "part-time", "freelance" ,"job","jobTraining","Training"],
        }


    }
);

const EmployeeLeads = mongoose.model("EmployeeLeads", employeeLeadsSchema);
export default EmployeeLeads;
