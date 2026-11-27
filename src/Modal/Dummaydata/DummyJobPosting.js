import mongoose from 'mongoose';

// Legacy/dummy job postings live in the `jobpostingdummies` collection and do
// not follow the strict JobPosting schema:
//   - salon_id is an embedded object { name, brand_name, contact_no }
//   - required_skills are plain strings
//   - address/contact_person are embedded objects
// So the schema is intentionally permissive (strict: false).
const dummyJobPostingSchema = new mongoose.Schema({}, {
    strict: false,
    collection: 'jobpostingdummies'
});

const DummyJobPosting = mongoose.model('DummyJobPosting', dummyJobPostingSchema);

export default DummyJobPosting;
