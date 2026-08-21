
import { Schema, model } from 'mongoose';

const ListingInterestSchema = new Schema({
    interestedUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['FranchiseList', 'TraningList', 'SellerListing'] 
    },
    adId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'category' // Dynamically reference based on category
    },
    status: {
        type: String,
        enum: ['interested', 'not_interested'],
        default: 'interested'
    },
    // The user who posted the ad   
    adUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Prevent duplicate interest records for the same user + listing (idempotency)
ListingInterestSchema.index(
    { interestedUserId: 1, category: 1, adId: 1 },
    { unique: true, name: 'uniq_user_category_ad' }
);

// Speeds up owner-side queries (getInterestsForUserListings)
ListingInterestSchema.index({ adUserId: 1, createdAt: -1 });

export default model('ListingInterest', ListingInterestSchema);