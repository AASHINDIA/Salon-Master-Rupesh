
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

export default model('ListingInterest', ListingInterestSchema);