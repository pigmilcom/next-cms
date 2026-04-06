// @/app/setup/init/route.js
import { NextResponse } from 'next/server';
import DBService from '@/data/rest.db.js';
import { initializeDatabase } from './db-init.js';

export async function GET() {
    try {
        // Check if all required data already exists
        let allDataExists = false;
        let existingCollections = [];
        
        try {
            const [siteSettings, storeSettings, roles, users] = await Promise.all([
                DBService.readAll('site_settings'),
                DBService.readAll('store_settings'),
                DBService.readAll('roles'),
                DBService.readAll('users')
            ]);
            
            // Handle DBService response structure properly
            const siteSettingsData = siteSettings?.success ? siteSettings.data : {};
            const storeSettingsData = storeSettings?.success ? storeSettings.data : {};
            const rolesData = roles?.success ? roles.data : {};
            const usersData = users?.success ? users.data : {};
            
            const siteSettingsArray = Array.isArray(siteSettingsData) ? siteSettingsData : Object.values(siteSettingsData || {});
            const storeSettingsArray = Array.isArray(storeSettingsData) ? storeSettingsData : Object.values(storeSettingsData || {});
            const rolesArray = Array.isArray(rolesData) ? rolesData : Object.values(rolesData || {});
            const usersArray = Array.isArray(usersData) ? usersData : Object.values(usersData || {});
            
            if (siteSettingsArray.length > 0) existingCollections.push('site_settings');
            if (storeSettingsArray.length > 0) existingCollections.push('store_settings');
            if (rolesArray.length > 0) existingCollections.push('roles');
            if (usersArray.length > 0) existingCollections.push('users');
            
            // All data exists if we have site_settings, store_settings, roles, and at least one user
            allDataExists = siteSettingsArray.length > 0 && 
                           storeSettingsArray.length > 0 && 
                           rolesArray.length > 0 && 
                           usersArray.length > 0;
        } catch (error) {
            console.log('Error checking existing data:', error.message);
            // Don't throw here, just log and continue with empty data
        }
        
        // Define required environment variables
        const requiredEnvVars = {
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
            POSTGRES_URL: process.env.POSTGRES_URL || '',
            S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || '',
            S3_ENDPOINT: process.env.S3_ENDPOINT || '',
            S3_REGION: process.env.S3_REGION || '',
            S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
            S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',
            S3_BUCKET: process.env.S3_BUCKET || ''
        };

        const missingVars = [];
        const emptyVars = [];
        const presentVars = [];

        // Check each environment variable
        const dbConfigured = requiredEnvVars.POSTGRES_URL

        Object.entries(requiredEnvVars).forEach(([key, value]) => {

            if (value === undefined) {
                // Only add to missing if it's not the optional DB URL
                if (!(key === 'POSTGRES_URL') || !dbConfigured) {
                    missingVars.push(key);
                }
            } else if (value === '') {
                // Only add to empty if it's not the optional DB URL
                if (!(key === 'POSTGRES_URL') || !dbConfigured) {
                    emptyVars.push(key);
                }
            } else {
                presentVars.push(key);
            }
        });

        // Calculate setup status
        // Adjust total vars count to exclude the optional DB connection
        const totalVars = Object.keys(requiredEnvVars).length - 1; // Subtract 1 as only one DB is required
        const configuredVars = presentVars.length;
        const isSetupComplete = missingVars.length === 0 && emptyVars.length === 0 && dbConfigured;
        const setupPercentage = Math.round((configuredVars / totalVars) * 100);

        // Test connections if setup is partially or fully complete
        let connectionTests = null;
        let databaseInitialization = null;
        
        if (presentVars.length > 0) {
            connectionTests = {
                database: null,
            };

            // Test database connection (basic URL validation)
            if (requiredEnvVars.POSTGRES_URL) {
                try {
                    new URL(requiredEnvVars.POSTGRES_URL);
                    connectionTests.database = 'URL format valid';
                } catch {
                    connectionTests.database = 'Invalid URL format';
                }
            }

            // Initialize database with default tables and data if setup is complete
            if (isSetupComplete && dbConfigured) {
                console.log('Setup complete, initializing database...');
                try {
                databaseInitialization = await initializeDatabase();
                } catch (dbInitError) {
                    databaseInitialization = { success: false, error: dbInitError.message };
                }
            }
        }

        // Prepare response data
        const response = {
            setupComplete: isSetupComplete,
            allDataExists,
            existingCollections,
            setupPercentage,
            totalVariables: totalVars,
            configuredVariables: configuredVars,
            status: {
                present: presentVars,
                missing: missingVars,
                empty: emptyVars
            },
            connectionTests,
            databaseInitialization,
            message: allDataExists
                ? 'Setup already completed. All required data exists in database.'
                : isSetupComplete
                ? 'All environment variables are configured correctly and database is initialized.'
                : `Setup incomplete: ${missingVars.length + emptyVars.length} variable(s) need attention.`,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown'
        };

        // Return appropriate HTTP status
        const httpStatus = isSetupComplete ? 200 : 206; // 206 = Partial Content

        return NextResponse.json(response, { status: httpStatus });
    } catch (error) {
        console.error('Setup check error:', error);
        return NextResponse.json(
            {
                setupComplete: false,
                error: 'Failed to check environment setup',
                message: 'An error occurred while checking environment variables.',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
