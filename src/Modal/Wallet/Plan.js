import mongoose from "mongoose";

const { Schema } = mongoose;

const FeatureSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    included: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        maxlength: 300
    }
}, { _id: false });

const PlanSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        maxlength: 120
    },

    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    description: {
        type: String,
        required: true,
        maxlength: 2000
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    currency: {
        type: String,
        enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"],
        default: "INR"
    },

    token: {
        type: Number,
        required: true,
        min: 0
    },

    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    features: [FeatureSchema],

    priority: {
        type: Number,
        default: 0,
        index: true
    }

}, {
    timestamps: true,
    versionKey: false
});

/* Virtual */
PlanSchema.virtual("discountedPrice").get(function () {
    const final = this.price - (this.price * this.discount / 100);
    return Number(final.toFixed(2));
});

/* Compound index */
PlanSchema.index({ isActive: 1, priority: -1 });
PlanSchema.index({ slug: 1 });

export default mongoose.model("Plan", PlanSchema);