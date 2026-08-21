import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../Modal/Users/User.js';
import FranchiseList from '../Modal/franchise/FranchiseList.js';
import ListingInterestSchema from '../Modal/InterstedSchema/ListingInterestSchema.js';
import InterestedNotification from '../Modal/InterestedNotification/InterestedNotificationSchema.js';

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('connected');

    // Seed test data
    const user = new User({ name: 'TestUser', email: `test${Date.now()}@example.com`, domain_type: 'salon' });
    await user.save();
    const owner = new User({ name: 'OwnerUser', email: `owner${Date.now()}@example.com`, domain_type: 'salon' });
    await owner.save();
    const listing = new FranchiseList({
        userId: owner._id, fullName: 'Test Salon', shopName: 'Test Salon',
        email: `owner${Date.now()}@example.com`, heading: 'Test Heading',
        idDetails: 'test', phoneNumber: '1234567890', termsAccepted: true,
    });
    await listing.save();
    console.log('user:', user._id.toString(), 'owner:', owner._id.toString(), 'listing:', listing._id.toString());

    // Test 1: Atomic txn creates Interest + Notification
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const [interest] = await ListingInterestSchema.create([{
            interestedUserId: user._id, category: 'FranchiseList',
            adId: listing._id, adUserId: owner._id,
        }], { session });

        await InterestedNotification.create([{
            interestId: interest._id, category: 'FranchiseList',
            adId: listing._id, interestedUserId: user._id, ownerUserId: owner._id,
        }], { session });

        await session.commitTransaction();
        console.log('TEST 1 PASS: txn committed');
    } catch (e) {
        await session.abortTransaction();
        console.error('TEST 1 FAIL:', e.message);
        process.exit(1);
    }

    // Test 2: Duplicate click rejected by unique index
    try {
        await ListingInterestSchema.create([{
            interestedUserId: user._id, category: 'FranchiseList',
            adId: listing._id, adUserId: owner._id,
        }]);
        console.log('TEST 2 FAIL: duplicate was allowed');
        process.exit(1);
    } catch (e) {
        if (e.code === 11000) {
            console.log('TEST 2 PASS: duplicate rejected with E11000');
        } else {
            throw e;
        }
    }

    // Test 3: Exactly one Interest + one Notification
    const iCount = await ListingInterestSchema.countDocuments({
        interestedUserId: user._id, category: 'FranchiseList', adId: listing._id
    });
    const nCount = await InterestedNotification.countDocuments({
        interestedUserId: user._id, adId: listing._id
    });
    if (iCount !== 1 || nCount !== 1) {
        console.log(`TEST 3 FAIL: interests=${iCount} notifications=${nCount}`);
        process.exit(1);
    }
    console.log('TEST 3 PASS: exactly 1 Interest + 1 Notification');

    // Test 4: Worker claim (atomic pending -> processing)
    const notif = await InterestedNotification.findOne({ interestedUserId: user._id });
    const claimed = await InterestedNotification.findOneAndUpdate(
        { _id: notif._id, status: 'pending' },
        { $set: { status: 'processing', processingAt: new Date() }, $inc: { attempts: 1 } },
        { returnDocument: 'after' }
    );
    if (!claimed || claimed.status !== 'processing') {
        console.log('TEST 4 FAIL: claim failed');
        process.exit(1);
    }
    console.log('TEST 4 PASS: atomic claim pending->processing, attempts=', claimed.attempts);

    // Test 5: Second worker cannot claim same job
    const secondClaim = await InterestedNotification.findOneAndUpdate(
        { _id: notif._id, status: 'pending' },
        { $set: { status: 'processing', processingAt: new Date() }, $inc: { attempts: 1 } },
        { returnDocument: 'after' }
    );
    if (secondClaim !== null) {
        console.log('TEST 5 FAIL: second worker claimed same job');
        process.exit(1);
    }
    console.log('TEST 5 PASS: second claim returned null (no double-processing)');

    // Test 6: Stale recovery - processing job older than staleMs is reclaimable
    const staleCutoff = new Date(Date.now() - 300000);
    await InterestedNotification.updateOne(
        { _id: notif._id },
        { $set: { processingAt: staleCutoff } }
    );
    const now = new Date();
    const reclaimed = await InterestedNotification.findOneAndUpdate(
        {
            $or: [
                { status: 'pending', nextAttemptAt: { $lte: now } },
                { status: 'processing', processingAt: { $lt: new Date(now.getTime() - 300000) } },
            ],
        },
        { $set: { status: 'processing', processingAt: now }, $inc: { attempts: 1 } },
        { returnDocument: 'after' }
    );
    if (!reclaimed) {
        console.log('TEST 6 FAIL: stale job not reclaimed');
        process.exit(1);
    }
    console.log('TEST 6 PASS: stale job reclaimed, attempts=', reclaimed.attempts);

    // Test 7: Mark sent
    await InterestedNotification.updateOne(
        { _id: notif._id, status: 'processing' },
        { $set: { status: 'sent', sentAt: new Date() } }
    );
    const sent = await InterestedNotification.findById(notif._id);
    if (sent.status !== 'sent') {
        console.log('TEST 7 FAIL: mark-sent failed');
        process.exit(1);
    }
    console.log('TEST 7 PASS: notification marked sent');

    // Cleanup
    await ListingInterestSchema.deleteMany({ interestedUserId: user._id });
    await InterestedNotification.deleteMany({ interestedUserId: user._id });
    await FranchiseList.deleteOne({ _id: listing._id });
    await User.deleteOne({ _id: user._id });
    await User.deleteOne({ _id: owner._id });

    await mongoose.disconnect();
    console.log('\nALL TESTS PASSED');
}

run().catch((e) => { console.error(e); process.exit(1); });
