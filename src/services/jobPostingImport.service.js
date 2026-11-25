import mongoose from 'mongoose';
import moment from 'moment';
import User from '../Modal/Users/User.js';
import Salon from '../Modal/Salon/Salon.js';
import JobPosting from '../Modal/JOB/JobPosting.js';
import Skill from '../Modal/skill/skill.js';

const JOB_TITLES = [
    'Hair Stylist',
    'Beautician',
    'Nail Technician',
    'Spa Therapist',
    'Receptionist',
    'Manager',
    'Trainee',
    'Other',
];

const JOB_TITLE_SYNONYMS = [
    ['Hair Stylist', /hair\s*(stylist|dresser)|hairstylist|hair stylist|senior stylist|stylist/i],
    ['Beautician', /beautician|beauty\s*(therapist|expert)|facial\s*therapist|makeup|make\s*up/i],
    ['Nail Technician', /nail\s*(tech|technician)|manicurist|pedicurist/i],
    ['Spa Therapist', /spa\s*(therapist|specialist)?|massage\s*therapist|masseur|masseuse/i],
    ['Receptionist', /receptionist|front\s*(desk|office)|reception/i],
    ['Manager', /manager|supervisor|in[\s-]?charge/i],
    ['Trainee', /trainee|intern|apprentice|apprenticeship/i],
];

const EXPERIENCE_ENUM = ['Fresher', '6 months', '1 year', '2 years', '3+ years'];
const SALARY_TYPE_ENUM = ['Fixed', 'Commission', 'Fixed + Commission', 'Negotiable'];
const JOB_TYPE_ENUM = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
const GENDER_ENUM = ['Male', 'Female', 'Any'];
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_DESCRIPTION = (title, salonName) =>
    `We are hiring a ${title} at ${salonName || 'our salon'}. Apply to join the team.`;

const toStr = (value) => (value === undefined || value === null ? '' : String(value).trim());

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const truncate = (value, max) => (value.length > max ? value.slice(0, max) : value);

export const normalizePhone = (value) => {
    const digits = toStr(value).replace(/\D/g, '');
    if (!digits) return { normalized: '', variants: [] };

    let normalized = digits;
    if (digits.length === 11 && digits.startsWith('0')) normalized = digits.slice(1);
    else if (digits.length === 12 && digits.startsWith('91')) normalized = digits.slice(2);

    const variants = new Set([digits, normalized]);
    if (normalized.length === 10) {
        variants.add(`0${normalized}`);
        variants.add(`91${normalized}`);
        variants.add(`+91${normalized}`);
    }
    if (digits.length >= 10) variants.add(digits.slice(-10));

    return { normalized, variants: [...variants] };
};

export const normalizeJobTitle = (value, customValue = '') => {
    const raw = toStr(value);
    const custom = toStr(customValue);

    if (!raw) {
        return { job_title: custom ? 'Other' : 'Hair Stylist', custom_job_title: custom };
    }

    const exact = JOB_TITLES.find((title) => title.toLowerCase() === raw.toLowerCase());
    if (exact) {
        return { job_title: exact, custom_job_title: exact === 'Other' ? custom || raw : custom };
    }

    for (const [title, pattern] of JOB_TITLE_SYNONYMS) {
        if (pattern.test(raw)) {
            return { job_title: title, custom_job_title: custom };
        }
    }

    return { job_title: 'Other', custom_job_title: custom || raw };
};

export const normalizeExperience = (value) => {
    const raw = toStr(value).toLowerCase();
    if (!raw) return 'Fresher';

    const exact = EXPERIENCE_ENUM.find((item) => item.toLowerCase() === raw);
    if (exact) return exact;

    if (/fresher|no\s*experience|entry\s*level/.test(raw)) return 'Fresher';

    const range = raw.match(/(\d+)\s*(?:-|–|to)\s*(\d+)/);
    const rangeMin = range ? Math.min(Number(range[1]), Number(range[2])) : null;

    const months = raw.match(/(\d+)\s*month/);
    if (months) {
        const count = rangeMin ?? Number(months[1]);
        if (count >= 36) return '3+ years';
        if (count >= 24) return '2 years';
        if (count >= 12) return '1 year';
        if (count >= 6) return '6 months';
        return 'Fresher';
    }

    const years = raw.match(/(\d+)\s*\+?\s*year/) || raw.match(/^(\d+)$/);
    if (years) {
        const count = rangeMin ?? Number(years[1]);
        if (count >= 3) return '3+ years';
        if (count >= 2) return '2 years';
        if (count >= 1) return '1 year';
        return 'Fresher';
    }

    return 'Fresher';
};

export const normalizeSalaryType = (value) => {
    const raw = toStr(value).toLowerCase();
    if (!raw) return 'Fixed';
    const exact = SALARY_TYPE_ENUM.find((item) => item.toLowerCase() === raw);
    if (exact) return exact;

    if (/negotiable|as\s*per|market/.test(raw)) return 'Negotiable';
    if (/fixed/.test(raw) && /commission|incentive/.test(raw)) return 'Fixed + Commission';
    if (/commission|incentive/.test(raw)) return 'Commission';
    if (/fixed|salary/.test(raw)) return 'Fixed';
    if (/variable|performance/.test(raw)) return 'Negotiable';
    return 'Negotiable';
};

export const normalizeJobType = (value) => {
    const raw = toStr(value).toLowerCase();
    if (!raw) return 'Full-time';
    const exact = JOB_TYPE_ENUM.find((item) => item.toLowerCase() === raw);
    if (exact) return exact;

    if (/part[\s-]?time/.test(raw)) return 'Part-time';
    if (/contract|freelance|consult/.test(raw)) return 'Contract';
    if (/temp|intern|seasonal/.test(raw)) return 'Temporary';
    return 'Full-time';
};

export const normalizeGender = (value) => {
    const raw = toStr(value).toLowerCase();
    if (!raw) return 'Any';
    if (/^(m|male|man|gents?)$/.test(raw)) return 'Male';
    if (/^(f|female|woman|ladies|lady)$/.test(raw)) return 'Female';
    return 'Any';
};

export const normalizeWorkingDays = (value) => {
    const list = Array.isArray(value) ? value : toStr(value).split(',');
    const result = [];

    for (const item of list) {
        const raw = toStr(item).toLowerCase();
        if (!raw) continue;
        const day = WEEK_DAYS.find((name) => name.toLowerCase() === raw || name.toLowerCase().startsWith(raw.slice(0, 3)));
        if (day && !result.includes(day)) result.push(day);
    }

    return result.length ? result : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
};

const parseList = (value) => {
    if (Array.isArray(value)) return value.map(toStr).filter(Boolean);
    return toStr(value).split(',').map(toStr).filter(Boolean);
};

const parseBoolean = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    const raw = toStr(value).toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(raw)) return true;
    if (['false', '0', 'no', 'n'].includes(raw)) return false;
    return fallback;
};

const parseNumber = (value, fallback = 0) => {
    if (value === undefined || value === null || value === '') return fallback;
    const number = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(number) ? number : fallback;
};

const parseDate = (value) => {
    if (!value) return undefined;
    const parsed = moment(value, ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY', moment.ISO_8601], true);
    return parsed.isValid() ? parsed.toDate() : undefined;
};

const parseLocationParts = (location) => {
    const parts = toStr(location).split(',').map(toStr).filter(Boolean);
    if (parts.length >= 3) return { city: parts[0], state: parts[1], country: parts[2] };
    if (parts.length === 2) return { city: parts[0], state: parts[1], country: '' };
    if (parts.length === 1) return { city: parts[0], state: '', country: '' };
    return { city: '', state: '', country: '' };
};

const generateUniqueName = () => `sl${Math.floor(100 + Math.random() * 900)}`;

const getSalonName = (row) =>
    toStr(row.salon_name) ||
    toStr(row.salon) ||
    toStr(row.brand_name) ||
    toStr(row.business_name) ||
    toStr(row.contact_name) ||
    'Salon';

const getPhone = (row) =>
    normalizePhone(
        row.contact_no ||
            row.contact_number ||
            row.whatsapp_number ||
            row.phone ||
            row.mobile ||
            row.contact_phone ||
            row.user_contact_no ||
            ''
    );

const buildSalonAddress = (row, existing = {}) => {
    const fromLocation = parseLocationParts(row.location);

    return {
        country: toStr(row.country) || existing.country || '',
        state: toStr(row.state) || existing.state || fromLocation.state || '',
        city: toStr(row.city) || existing.city || fromLocation.city || '',
        pincode: toStr(row.pincode) || existing.pincode || '',
        countryIsoCode: toStr(row.countryIsoCode) || existing.countryIsoCode || '',
        stateIsoCode: toStr(row.stateIsoCode) || existing.stateIsoCode || '',
    };
};

const buildJobAddress = (row, salon) => {
    const fromLocation = parseLocationParts(row.location);
    const existing = salon.address || {};

    return {
        country: toStr(row.country) || existing.country || fromLocation.country || 'India',
        state: toStr(row.state) || existing.state || fromLocation.state || 'Unknown',
        city: toStr(row.city) || existing.city || fromLocation.city || 'Unknown',
        pincode: toStr(row.pincode) || existing.pincode || '',
        countryIsoCode: toStr(row.countryIsoCode) || existing.countryIsoCode || '',
        stateIsoCode: toStr(row.stateIsoCode) || existing.stateIsoCode || '',
    };
};

const createSkill = async (name) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await Skill.create({ skill_name: name });
        } catch (error) {
            if (error.code === 11000 && attempt < 2) continue;
            throw error;
        }
    }
    throw new Error(`Unable to create skill "${name}"`);
};

const resolveSkills = async (rawValue, cache, dryRun = false) => {
    const names = [...new Set(parseList(rawValue))].slice(0, 20);
    const ids = [];
    let created = 0;

    for (const name of names) {
        const key = name.toLowerCase();
        let skill = cache.get(key);

        if (!skill) {
            skill = await Skill.findOne({
                skill_name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
            });

            if (!skill) {
                skill = dryRun
                    ? { _id: new mongoose.Types.ObjectId(), skill_name: name }
                    : await createSkill(name);
                created += 1;
            }

            cache.set(key, skill);
        }

        ids.push(skill._id);
    }

    return { ids, created };
};

const findExistingSalon = async (phoneVariants, salonName, city, cache) => {
    const cacheKey = phoneVariants.length
        ? `phone:${phoneVariants[0]}`
        : `name:${salonName.toLowerCase()}|${city.toLowerCase()}`;

    if (cache.has(cacheKey)) return cache.get(cacheKey);

    let salon = null;
    let user = null;

    if (phoneVariants.length) {
        user = await User.findOne({
            whatsapp_number: { $in: phoneVariants },
            domain_type: 'salon',
        });

        if (user) {
            salon = await Salon.findOne({ user_id: user._id });
        }

        if (!salon) {
            salon = await Salon.findOne({
                $or: [
                    { contact_number: { $in: phoneVariants } },
                    { whatsapp_number: { $in: phoneVariants } },
                ],
            });
        }
    }

    if (!salon && salonName) {
        const query = { salon_name: { $regex: `^${escapeRegex(salonName)}$`, $options: 'i' } };
        if (city) query['address.city'] = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
        salon = await Salon.findOne(query);
    }

    if (!salon && phoneVariants.length) {
        user = user || (await User.findOne({ whatsapp_number: { $in: phoneVariants } }));
    }

    const result = { salon, user };
    cache.set(cacheKey, result);
    return result;
};

const createSalonProfile = async (row, phone, warnings) => {
    const salonName = getSalonName(row);

    let user = null;
    let createdUser = false;

    if (phone.normalized) {
        user = await User.findOne({ whatsapp_number: phone.normalized, domain_type: 'salon' });
    }

    if (!user) {
        const otherUser = phone.variants.length
            ? await User.findOne({ whatsapp_number: { $in: phone.variants } })
            : null;

        if (otherUser) {
            warnings.push(
                `Phone ${phone.normalized} already belongs to a ${otherUser.domain_type} account; created a separate salon login.`
            );
        }

        user = await User.create({
            name: salonName,
            whatsapp_number: phone.normalized || undefined,
            domain_type: 'salon',
            auth_provider: 'local',
            imported: true,
            otp_verified: false,
        });
        createdUser = true;
    }

    const address = buildSalonAddress(row);
    if (!phone.normalized) {
        warnings.push('Phone missing; this salon cannot be claimed until a phone number is added.');
    }
    if (!address.city) warnings.push('City missing; salon profile created without a city.');
    if (!address.state) warnings.push('State missing; salon profile created without a state.');

    const location = toStr(row.location) || [address.city, address.state, address.country].filter(Boolean).join(', ');

    const salon = await Salon.create({
        user_id: user._id,
        salon_name: salonName,
        brand_name: toStr(row.brand_name) || undefined,
        contact_number: phone.normalized || undefined,
        whatsapp_number: phone.normalized || undefined,
        address,
        location,
        source: 'csv',
        is_claimed: false,
        isProfileCompleted: false,
        unique_name: generateUniqueName(),
    });

    return { user, salon, createdUser, createdSalon: true };
};

const updateSalonFromRow = async (salon, row, phone) => {
    let changed = false;

    if (!toStr(salon.salon_name) && toStr(row.salon_name)) {
        salon.salon_name = toStr(row.salon_name);
        changed = true;
    }
    if (!toStr(salon.brand_name) && toStr(row.brand_name)) {
        salon.brand_name = toStr(row.brand_name);
        changed = true;
    }
    if (!toStr(salon.contact_number) && phone.normalized) {
        salon.contact_number = phone.normalized;
        changed = true;
    }
    if (!toStr(salon.whatsapp_number) && phone.normalized) {
        salon.whatsapp_number = phone.normalized;
        changed = true;
    }

    const address = buildSalonAddress(row, salon.address || {});
    if (address.city && !toStr(salon.address?.city)) {
        salon.address = address;
        changed = true;
    }

    if (!toStr(salon.location) && (toStr(row.location) || address.city || address.country)) {
        salon.location =
            toStr(row.location) || [address.city, address.state, address.country].filter(Boolean).join(', ');
        changed = true;
    }

    if (changed) await salon.save();
    return salon;
};

const resolveSalonForRow = async (row, options, caches, warnings) => {
    if (options.forcedSalon) {
        return {
            salon: options.forcedSalon,
            createdSalon: false,
            createdUser: false,
        };
    }

    const phone = getPhone(row);
    const salonName = getSalonName(row);
    const city = toStr(row.city) || parseLocationParts(row.location).city;

    const { salon: existingSalon } = await findExistingSalon(
        phone.variants,
        salonName,
        city,
        caches.salons
    );

    if (existingSalon) {
        const updated = options.dryRun ? existingSalon : await updateSalonFromRow(existingSalon, row, phone);
        return { salon: updated, createdSalon: false, createdUser: false };
    }

    if (options.dryRun) {
        const address = buildSalonAddress(row);
        const salon = {
            _id: new mongoose.Types.ObjectId(),
            salon_name: salonName,
            brand_name: toStr(row.brand_name),
            address,
            location:
                toStr(row.location) ||
                [address.city, address.state, address.country].filter(Boolean).join(', '),
        };
        return { salon, createdSalon: true, createdUser: Boolean(phone.normalized) };
    }

    const created = await createSalonProfile(row, phone, warnings);

    const cacheKey = phone.variants.length
        ? `phone:${phone.variants[0]}`
        : `name:${salonName.toLowerCase()}|${city.toLowerCase()}`;
    caches.salons.set(cacheKey, { salon: created.salon, user: created.user });

    return created;
};

export const buildJobPostingData = async (row, salon, caches, warnings, options = {}) => {
    const title = normalizeJobTitle(row.job_title || row.custom_job_title, row.custom_job_title);
    const address = buildJobAddress(row, salon);
    const { ids: skillIds, created } = await resolveSkills(
        row.required_skills,
        caches.skills,
        options.dryRun
    );
    const salonName = toStr(salon.salon_name) || getSalonName(row);

    const description = truncate(
        toStr(row.job_description) || DEFAULT_DESCRIPTION(title.custom_job_title || title.job_title, salonName),
        500
    );

    const salaryRangeValue =
        row.salary_range && typeof row.salary_range === 'object' ? row.salary_range : {};
    const salaryText = typeof row.salary_range === 'string' ? row.salary_range : '';
    const salaryParts = salaryText.split(/\s*(?:-|–|to)\s*/i);

    let salaryMin = parseNumber(
        row.salary_min ?? row.min_salary ?? salaryRangeValue.min ?? salaryParts[0],
        0
    );
    let salaryMax = parseNumber(
        row.salary_max ?? row.max_salary ?? salaryRangeValue.max ?? salaryParts[1],
        0
    );

    if (salaryMax && salaryMin > salaryMax) {
        [salaryMin, salaryMax] = [salaryMax, salaryMin];
    }

    if (!address.city || !address.state || !address.country) {
        warnings.push('Address missing; used default values for this job.');
    }

    const data = {
        salon_id: salon._id,
        job_title: title.job_title,
        custom_job_title: title.custom_job_title || undefined,
        required_skills: skillIds,
        job_description: description,
        gender_preference: normalizeGender(row.gender_preference),
        required_experience: normalizeExperience(row.required_experience),
        salary_type: normalizeSalaryType(row.salary_type),
        salary_range: { min: Math.max(salaryMin, 0), max: Math.max(salaryMax, 0) },
        job_type: normalizeJobType(row.job_type),
        work_timings: {
            start: toStr(row.start_time || row.work_timings?.start) || undefined,
            end: toStr(row.end_time || row.work_timings?.end) || undefined,
        },
        working_days: normalizeWorkingDays(row.working_days),
        benefits: parseList(row.benefits),
        vacancy_count: Math.max(parseNumber(row.vacancy_count, 1), 1),
        is_active: parseBoolean(row.is_active, true),
        is_Preuime: parseBoolean(row.is_Preuime, true),
        posted_date: parseDate(row.posted_date) || new Date(),
        address,
        location:
            toStr(row.location) ||
            [address.city, address.state, address.country].filter(Boolean).join(', '),
        contact_person: {
            name: toStr(row.contact_name),
            phone: toStr(row.contact_phone),
            email: toStr(row.contact_email),
        },
    };

    if (row.application_deadline) {
        const deadline = parseDate(row.application_deadline);
        if (deadline) data.application_deadline = deadline;
    }
    if (toStr(row.interview_details)) {
        data.interview_details = truncate(toStr(row.interview_details), 200);
    }

    return { data, skillsCreated: created };
};

const isDuplicateJob = async (data) =>
    JobPosting.exists({
        salon_id: data.salon_id,
        job_title: data.job_title,
        custom_job_title: data.custom_job_title || null,
        job_description: data.job_description,
        is_active: true,
    });

export const importJobPostings = async (rows, options = {}) => {
    const summary = {
        count: 0,
        jobsCreated: 0,
        skipped: 0,
        salonsCreated: 0,
        salonsReused: 0,
        usersCreated: 0,
        skillsCreated: 0,
        errors: [],
        warnings: [],
    };

    const caches = {
        salons: new Map(),
        skills: new Map(),
    };

    const createdSalonIds = new Set();
    const reusedSalonIds = new Set();

    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index] || {};
        const rowNumber = index + 2; // header occupies row 1
        const rowWarnings = [];

        try {
            const hasSalonIdentity =
                toStr(row.salon_name) ||
                toStr(row.brand_name) ||
                toStr(row.contact_no) ||
                toStr(row.contact_number) ||
                toStr(row.whatsapp_number) ||
                toStr(row.phone) ||
                toStr(row.mobile) ||
                Boolean(options.forcedSalon);

            if (!hasSalonIdentity) {
                throw new Error('salon_name or contact_no is required');
            }
            if (!toStr(row.job_title) && !toStr(row.custom_job_title)) {
                throw new Error('job_title is required');
            }

            const resolved = await resolveSalonForRow(row, options, caches, rowWarnings);
            const salonKey = String(resolved.salon._id);

            if (resolved.createdSalon) createdSalonIds.add(salonKey);
            else reusedSalonIds.add(salonKey);
            if (resolved.createdUser) summary.usersCreated += 1;

            const { data, skillsCreated } = await buildJobPostingData(
                row,
                resolved.salon,
                caches,
                rowWarnings,
                options
            );
            summary.skillsCreated += skillsCreated;

            if (await isDuplicateJob(data)) {
                summary.skipped += 1;
                continue;
            }

            if (!options.dryRun) {
                const job = new JobPosting(data);
                await job.save();
            }

            summary.count += 1;
            summary.jobsCreated += 1;

            if (rowWarnings.length) {
                summary.warnings.push({ row: rowNumber, warnings: rowWarnings });
            }
        } catch (error) {
            summary.errors.push({
                row: rowNumber,
                salon_name: toStr(row.salon_name) || undefined,
                error: error.message,
            });
        }
    }

    summary.salonsCreated = createdSalonIds.size;
    summary.salonsReused = [...reusedSalonIds].filter((id) => !createdSalonIds.has(id)).length;

    return summary;
};

export const importRowsFromCsvFile = async (filePath, options = {}) => {
    const fs = await import('fs');
    const csv = (await import('csv-parser')).default;

    const rows = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', resolve)
            .on('error', reject);
    });

    return importJobPostings(rows, options);
};
