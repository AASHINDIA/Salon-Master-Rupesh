import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../Modal/Users/Permission.js';

dotenv.config();

const defaultPermissions = [
    // Dashboard
    { name: 'view_dashboard', description: 'View dashboard statistics and overview', category: 'Dashboard' },

    // Products
    { name: 'view_products', description: 'View product listings', category: 'Products' },
    { name: 'add_products', description: 'Create new products', category: 'Products' },
    { name: 'edit_products', description: 'Edit existing products', category: 'Products' },
    { name: 'delete_products', description: 'Delete products', category: 'Products' },
    { name: 'manage_categories', description: 'Manage product categories', category: 'Products' },

    // Training
    { name: 'manage_training', description: 'Create and edit training videos', category: 'Training' },
    { name: 'view_training', description: 'View training videos', category: 'Training' },

    // Orders
    { name: 'view_orders', description: 'View order data and history', category: 'Orders' },
    { name: 'manage_orders', description: 'Manage and update orders', category: 'Orders' },

    // Users
    { name: 'manage_companies', description: 'Manage company accounts', category: 'Users' },
    { name: 'manage_workers', description: 'Manage worker accounts', category: 'Users' },
    { name: 'manage_salons', description: 'Manage salon accounts', category: 'Users' },
    { name: 'manage_users', description: 'General user management', category: 'Users' },
    { name: 'view_user_details', description: 'View detailed user profiles', category: 'Users' },
    { name: 'AddUser', description: 'Create new users in the system', category: 'Users' },

    // Listings
    { name: 'manage_listings', description: 'Create and edit listings', category: 'Listings' },
    { name: 'UserTracking', description: 'Track user activity', category: 'Users' },

    // Plans
    { name: 'PlansManagement', description: 'Manage subscription plans', category: 'Plans' },
    { name: 'ListingPlanManagement', description: 'Manage listing fee plans', category: 'Plans' },

    // Reports
    { name: 'view_reports', description: 'View analytics and reports', category: 'Reports' },

    // Settings
    { name: 'manage_settings', description: 'Manage system settings', category: 'Settings' },

    // Tools
    { name: 'UploadPage', description: 'Upload and import data', category: 'Tools' },
];

const seedPermissions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        let createdCount = 0;
        let skippedCount = 0;

        for (const perm of defaultPermissions) {
            const exists = await Permission.findOne({ name: perm.name });
            if (!exists) {
                await Permission.create(perm);
                createdCount++;
                console.log(`Created: ${perm.name}`);
            } else {
                skippedCount++;
                console.log(`Skipped (exists): ${perm.name}`);
            }
        }

        console.log(`\nDone! Created: ${createdCount}, Skipped: ${skippedCount}`);
        console.log(`Total permissions in DB: ${await Permission.countDocuments()}`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding permissions:', error);
        process.exit(1);
    }
};

seedPermissions();
