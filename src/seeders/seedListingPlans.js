import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import ListingPlan from "../Modal/sales/ListingPlan.js";

const defaultPlans = [
    {
        name: "Seller Listing Create",
        actionType: "create",
        description: "One-time fee to publish a new seller listing",
        price: 499,
        currency: "INR",
        durationDays: 60,
        discount: 0,
    },
    {
        name: "Seller Listing Update",
        actionType: "update",
        description: "Fee to update an existing active listing",
        price: 199,
        currency: "INR",
        durationDays: 30,
        discount: 0,
    },
    {
        name: "Seller Listing Renew",
        actionType: "renew",
        description: "Fee to renew an expired or inactive listing",
        price: 499,
        currency: "INR",
        durationDays: 60,
        discount: 0,
    },
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

        let created = 0;
        for (const plan of defaultPlans) {
            const existing = await ListingPlan.findOne({ actionType: plan.actionType });
            if (!existing) {
                await ListingPlan.create(plan);
                created++;
                console.log(`Created plan: ${plan.name} (${plan.actionType})`);
            } else {
                console.log(`Plan already exists: ${plan.actionType} -> ${existing.name}`);
            }
        }

        console.log(`Seeding finished. ${created} plan(s) created.`);
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seed();
