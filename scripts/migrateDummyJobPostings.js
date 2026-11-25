import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Salon from '../src/Modal/Salon/Salon.js';
import User from '../src/Modal/Users/User.js';
import { importJobPostings } from '../src/services/jobPostingImport.service.js';

dotenv.config();

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);

const apply = hasFlag('--apply') || hasFlag('--delete');
const remove = hasFlag('--delete');
const dryRun = !apply;

const toRow = (doc) => ({
    salon_name: doc?.salon_id?.name || '',
    brand_name: doc?.salon_id?.brand_name || '',
    contact_no: doc?.salon_id?.contact_no || '',
    job_title: doc?.job_title || '',
    custom_job_title: doc?.custom_job_title || '',
    job_description: doc?.job_description || '',
    required_skills: Array.isArray(doc?.required_skills)
        ? doc.required_skills.join(',')
        : doc?.required_skills || '',
    gender_preference: doc?.gender_preference || '',
    required_experience: doc?.required_experience || '',
    salary_type: doc?.salary_type || '',
    salary_min: doc?.salary_range?.min,
    salary_max: doc?.salary_range?.max,
    job_type: doc?.job_type || '',
    start_time: doc?.work_timings?.start || '',
    end_time: doc?.work_timings?.end || '',
    working_days: Array.isArray(doc?.working_days) ? doc.working_days.join(',') : '',
    benefits: Array.isArray(doc?.benefits) ? doc.benefits.join(',') : '',
    vacancy_count: doc?.vacancy_count,
    is_active: doc?.is_active,
    is_Preuime: doc?.is_Preuime,
    posted_date: doc?.posted_date,
    country: doc?.address?.country || '',
    state: doc?.address?.state || '',
    city: doc?.address?.city || '',
    pincode: doc?.address?.pincode || '',
    countryIsoCode: doc?.address?.countryIsoCode || '',
    stateIsoCode: doc?.address?.stateIsoCode || '',
    location: doc?.location || '',
    contact_name: doc?.contact_person?.name || '',
    contact_phone: doc?.contact_person?.phone || '',
    contact_email: doc?.contact_person?.email || '',
});

const backfillClaimFlags = async () => {
    const salons = await Salon.find({ is_claimed: { $exists: false } })
        .select('_id user_id createdAt source')
        .lean();

    if (salons.length === 0) {
        return { updated: 0, claimed: 0, unclaimed: 0 };
    }

    const userIds = [...new Set(salons.map((salon) => String(salon.user_id)).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
        .select('_id imported')
        .lean();
    const importedMap = new Map(users.map((user) => [String(user._id), Boolean(user.imported)]));

    const operations = salons.map((salon) => {
        const claimed = !importedMap.get(String(salon.user_id));

        return {
            updateOne: {
                filter: { _id: salon._id },
                update: {
                    $set: {
                        is_claimed: claimed,
                        claimed_at: claimed ? salon.createdAt || new Date() : null,
                        source: salon.source || 'app',
                    },
                },
            },
        };
    });

    await Salon.bulkWrite(operations);

    return {
        updated: operations.length,
        claimed: operations.filter((op) => op.updateOne.update.$set.is_claimed).length,
        unclaimed: operations.filter((op) => !op.updateOne.update.$set.is_claimed).length,
    };
};

const backupDocs = (docs) => {
    const dir = path.resolve('scripts', 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `dummy-jobs-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(docs, null, 2));
    return file;
};

const main = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not set');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    if (!apply) {
        const pending = await Salon.countDocuments({ is_claimed: { $exists: false } });
        console.log(`[dry-run] ${pending} existing salons would receive a claim flag`);
    } else {
        const backfill = await backfillClaimFlags();
        console.log(
            `Backfilled claim flags: ${backfill.updated} updated (${backfill.claimed} claimed, ${backfill.unclaimed} unclaimed)`
        );
    }

    const collection = mongoose.connection.collection('jobpostingdummies');
    const docs = await collection.find({}).toArray();

    console.log(`Found ${docs.length} dummy job postings`);

    if (docs.length === 0) {
        return;
    }

    const rows = docs.map(toRow);
    const summary = await importJobPostings(rows, { source: 'dummy-migration', dryRun });

    console.log('\nMigration summary');
    console.log(JSON.stringify(summary, null, 2));

    if (!apply) {
        console.log('\nDry run only. Re-run with --apply to write, or --delete to write and remove dummy docs.');
        return;
    }

    if (!remove) {
        return;
    }

    const failedRows = new Set(summary.errors.map((item) => item.row));
    const migratedDocs = docs.filter((_, index) => !failedRows.has(index + 2));

    if (migratedDocs.length === 0) {
        console.log('No dummy documents are safe to delete.');
        return;
    }

    const backupFile = backupDocs(migratedDocs);
    console.log(`Backup written to ${backupFile}`);

    const result = await collection.deleteMany({
        _id: { $in: migratedDocs.map((doc) => doc._id) },
    });

    console.log(`Deleted ${result.deletedCount} migrated dummy documents`);
};

main()
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
