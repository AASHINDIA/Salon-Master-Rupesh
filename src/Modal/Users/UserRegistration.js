import mongoose from 'mongoose';

const UserRegistrationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referencing the User collection
        required: true,
    },
    image: {
        type: String
    },
    domain_type: { type: String },
    uniq_id: { type: String },
    location: { type: String },
    brand_name: { type: String },
    saloon_name: { type: String },
    year_of_start: { type: Number },
    address: { type: String },
    content_no: { type: String },
    company_name: { type: String },
    registration_address: { type: String },
    gst_number: { type: String },
    pan_number: { type: String },
    insta_link: { type: String },
    just_dial: { type: String },
    facebook: { type: String },
    youtube: { type: String },
    area_of_shop: { type: String },
    total_male: { type: Number },
    total_female: { type: Number },
    number_of_mang: { type: Number },
    payment_credit: { type: String },
    current_req_type: { type: String },
    name_of_can: { type: String },
    dob: { type: Date },
    id_type_prof: { type: String },
    prof_id: { type: String },
    education: { type: String },
    passing_year: { type: Number },
    profile_link: { type: String },
    cin_number: { type: String },
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

const UserRegistration = mongoose.model('UserRegistration', UserRegistrationSchema);

export default UserRegistration;
