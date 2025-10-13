import ListingInterestSchema from "../../Modal/InterstedSchema/ListingInterestSchema.js";
import mongoose from "mongoose";
import FranchiseList from "../../Modal/franchise/FranchiseList.js";
import TraningList from "../../Modal/traininginstitute/TraningList.js";
import SellerListing from "../../Modal/sales/SellerListing.js";


// Function to express interest in a listing
export const expressInterest = async (req, res) => {
    const { category, adId } = req.body;
    const interestedUserId = req.user.id;
    try {
        // Validate category
        const validCategories = ['FranchiseList', 'TraningList', 'SellerListing'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ message: 'Invalid category' });
        }
        // Check if the interest already exists
        const existingInterest = await ListingInterestSchema.findOne({ interestedUserId, category, adId });
        if (existingInterest) {
            return res.status(400).json({ message: 'You have already expressed interest in this listing. Our Team Will Connect You' });
        }

        // Validate adId
        if (!mongoose.Types.ObjectId.isValid(adId)) {
            return res.status(400).json({ message: 'Invalid adId' });
        }
        let ad;
        switch (category) {
            case 'FranchiseList':
                ad = await FranchiseList.findById(adId);
                break;
            case 'TraningList':
                ad = await TraningList.findById(adId);
                break;
            case 'SellerListing':
                ad = await SellerListing.findById(adId);
                break;
            default:
                return res.status(400).json({ message: 'Invalid category' });
        }
        if (!ad) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        // Create a new interest entry
        const newInterest = new ListingInterestSchema({
            interestedUserId,
            category,
            adId,
            adUserId: ad.userId // Assuming adUserId is sent in the request 
        });
        await newInterest.save();
        // Send notification to the listing owner

        res.status(201).json({ message: 'Interest expressed successfully.' });
    }

    catch (error) {
        console.error('Error expressing interest:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


// Function to get all interests expressed by the logged-in user    
export const getUserInterests = async (req, res) => {
    const interestedUserId = req.user._id;
    try {
        const interests = await ListingInterestSchema.find({
            interestedUserId
        }).populate('adId').populate('adUserId', 'name phone'); // Populate ad details and ad owner details
        res.status(200).json(interests);
    }
    catch (error) {
        console.error('Error fetching user interests:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


// Function to get all interests for listings owned by the logged-in user   
// export const getInterestsForUserListings = async (req, res) => {
//     const adUserId = req.user._id;
//     const { adId } = req.body
//     try {
//         // Query params for pagination & filtering
//         const {
//             page = 1,
//             limit = 10,
//             search = "",   // optional: search by interested user's name or phone
//         } = req.query;

//         const skip = (page - 1) * limit;

//         // Build filter object
//         let filter = { adUserId };

//         // Optional search filter on interested user
//         if (search) {
//             filter = {
//                 ...filter,
//                 // Using regex for partial match on name or phone
//                 $or: [
//                     { 'interestedUserId.name': { $regex: search, $options: 'i' } },
//                     { 'interestedUserId.phone': { $regex: search, $options: 'i' } }
//                 ]
//             };
//         }

//         // Fetch total count for pagination info
//         const total = await ListingInterestSchema.countDocuments({ adUserId });

//         // Fetch interests with populate, pagination, and sort by latest first
//         const interests = await ListingInterestSchema.find({ adUserId, adId })
//             .populate('adId')
//             .populate('interestedUserId', 'name phone')
//             .sort({ createdAt: -1 }) // latest first
//             .skip(parseInt(skip))
//             .limit(parseInt(limit));

//         res.status(200).json({
//             page: parseInt(page),
//             limit: parseInt(limit),
//             total,
//             totalPages: Math.ceil(total / limit),
//             data: interests
//         });
//     } catch (error) {
//         console.error('Error fetching interests for user listings:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };



export const getInterestsForUserListings = async (req, res) => {

    const adUserId = req.user._id;
    const { adId } = req.body;

    try {
        const {
            page = 1,
            limit = 10,
            search = "",
        } = req.query;

        const skip = (page - 1) * limit;

        // Base match
        const matchStage = {
            adUserId: new mongoose.Types.ObjectId(adUserId),
            ...(adId && { adId: new mongoose.Types.ObjectId(adId) })
        };

        // Aggregation pipeline
        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'users',
                    localField: 'interestedUserId',
                    foreignField: '_id',
                    as: 'interestedUser'
                }
            },
            { $unwind: '$interestedUser' }
        ];

        // Apply search filter
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'interestedUser.name': { $regex: search, $options: 'i' } },
                        { 'interestedUser.phone': { $regex: search, $options: 'i' } }
                    ]
                }
            });
        }

        // Count total after filters
        const totalCountPipeline = [...pipeline, { $count: 'total' }];
        const totalResult = await ListingInterestSchema.aggregate(totalCountPipeline);
        const total = totalResult[0]?.total || 0;

        // Add dynamic ad lookup based on category
        pipeline.push(
            {
                $addFields: {
                    adCollection: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$category', 'FranchiseList'] }, then: 'franchiselists' },
                                { case: { $eq: ['$category', 'TraningList'] }, then: 'traninglists' },
                                { case: { $eq: ['$category', 'SellerListing'] }, then: 'sellerlistings' }
                            ],
                            default: null
                        }
                    }
                }

            },
            {
                $lookup: {
                    from: { $toString: '$adCollection' }, // Dynamic collection name
                    localField: 'adId',
                    foreignField: '_id',
                    as: 'adDetails'
                }
            },
            { $unwind: { path: '$adDetails', preserveNullAndEmptyArrays: true } },
            { $sort: { createdAt: -1 } },
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );

        const interests = await ListingInterestSchema.aggregate(pipeline);

        res.status(200).json({
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            data: interests
        });

    } catch (error) {
        console.error('Error fetching interests for user listings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};






// Function to withdraw interest from a listing
export const withdrawInterest = async (req, res) => {
    const { interestId } = req.params;
    const interestedUserId = req.user._id;
    try {
        const interest = await ListingInterestSchema.findOne({ _id: interestId, interestedUserId });
        if (!interest) {
            return res.status(404).json({ message: 'Interest not found' });
        }
        await ListingInterestSchema.deleteOne({ _id: interestId });
        res.status(200).json({ message: 'Interest withdrawn successfully.' });
    }

    catch (error) {
        console.error('Error withdrawing interest:', error);
        res.status(500).json({ message: 'Server error' });
    }

};




// Function to get all interests (Admin only)
export const getAllInterests = async (req, res) => {
    try {
        const { adId } = req.body; // optional filter by adId
        let { page = 1, limit = 10, search = "" } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        // Build query
        const query = {};
        if (adId) query.adId = adId;
        if (search) {
            // search by interestedUser name or email
            query.$or = [
                { "interestedUserId.name": { $regex: search, $options: "i" } },
                { "interestedUserId.email": { $regex: search, $options: "i" } }
            ];
        }

        const total = await ListingInterestSchema.countDocuments(query);

        const interests = await ListingInterestSchema.find(query)
            .populate('adId') // populate ad details
            .populate('interestedUserId', 'name whatsapp_number') // interested user info
            .populate('adUserId', 'name whatsapp_number') // ad owner info
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 }); // latest first

        res.status(200).json({
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            interests
        });

    } catch (error) {
        console.error('Error fetching all interests:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Function to delete an interest (Admin only)
export const deleteInterest = async (req, res) => {
    const { interestId } = req.params;
    try {
        const interest = await ListingInterestSchema.findById(interestId);
        if (!interest) {
            return res.status(404).json({ message: 'Interest not found' });
        }
        await ListingInterestSchema.deleteOne({ _id: interestId });
        res.status(200).json({ message: 'Interest deleted successfully.' });
    }
    catch (error) {
        console.error('Error deleting interest:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
