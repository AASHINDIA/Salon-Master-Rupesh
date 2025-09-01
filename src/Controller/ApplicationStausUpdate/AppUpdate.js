import JobApplication from "../../Modal/JOB/JobApplication.js";
import SuggestedCandidate from "../../Modal/RequestJobSuggestedCandidate/RequestJobSuggestCandidate.js";


// Update Job Application Status Controller
export const updateJobApplicationStatus = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['Hired', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Only "Hired" or "Rejected" allowed.' });
        }

        // Find and update the job application
        const updatedApplication = await JobApplication.findByIdAndUpdate(
            applicationId,
            { status },
            { new: true } // return the updated document
        );

        if (!updatedApplication) {
            return res.status(404).json({ message: 'Job application not found.' });
        }

        return res.status(200).json({
            message: `Application status updated to ${status}.`,
            application: updatedApplication
        });

    } catch (error) {
        console.error('Error updating application status:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// Update Suggested Candidate Status
export const updateSuggestedCandidateStatus = async (req, res) => {
    try {
        const { candidateId } = req.params; // the SuggestedCandidate _id
        const { status } = req.body;

        // Validate status
        const validStatuses = ['Accepted', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Only "Accepted" or "Rejected" allowed.' });
        }

        // Find and update
        const updatedCandidate = await SuggestedCandidate.findByIdAndUpdate(
            candidateId,
            { status },
            { new: true }
        );

        if (!updatedCandidate) {
            return res.status(404).json({ message: 'Suggested candidate not found.' });
        }

        return res.status(200).json({
            message: `Suggested candidate status updated to ${status}.`,
            candidate: updatedCandidate
        });

    } catch (error) {
        console.error('Error updating suggested candidate status:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
