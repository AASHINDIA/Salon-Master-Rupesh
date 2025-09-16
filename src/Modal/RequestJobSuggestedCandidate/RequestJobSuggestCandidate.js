import mongoose from "mongoose";

const SuggestedCandidateSchema = new mongoose.Schema({
    job_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobPosting',
        required: true
    },
    candidate_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    candidate_name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected'],
        default: 'Pending'
    },

}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

SuggestedCandidateSchema.index({ job_id: 1, candidate_id: 1 });
const SuggestedCandidate = mongoose.model('SuggestedCandidate', SuggestedCandidateSchema);
export default SuggestedCandidate;

// Exporting the model for use in other parts of the application