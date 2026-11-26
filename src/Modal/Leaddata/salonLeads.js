import mongoose from "mongoose";

const SalonLeadsSchema = new mongoose.Schema(

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
        salonName: {
            type: String,
        },
        skills: {
            type: [String],
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
        }
    }
);

const SalonLeads = mongoose.model("SalonLeads", SalonLeadsSchema);
export default SalonLeads;
