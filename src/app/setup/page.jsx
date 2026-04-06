// @/app/setup/page.jsx (Setup Server Component)
import { redirect } from 'next/navigation';
import SetupPageClient from './page.client';
import { getAllUsers, getAllRoles } from '@/lib/server/users.js';
import { getSettings } from '@/lib/server/settings';
import { initializeDatabase } from './init/db-init';
import { existsSync } from 'fs';
import { join } from 'path';

// Quick check if setup is complete (runs before heavy operations)
async function isSetupComplete() {
    try {
        // Check if settings exist
        const settingsResult = await getSettings();
        const hasSettings = settingsResult?.siteSettings?.id && settingsResult?.storeSettings?.id;
        
        if (!hasSettings) return false;
        
        // Check if users exist
        const usersResult = await getAllUsers({ page: 1, limit: 1 });
        const hasUsers = usersResult?.success && usersResult?.data?.length > 0;
        
        if (!hasUsers) return false;
        
        // Check if roles exist
        const rolesResult = await getAllRoles({ page: 1, limit: 1 });
        const hasRoles = rolesResult?.success && rolesResult?.data?.length > 0;
        
        return hasRoles;
    } catch (error) {
        return false;
    }
}

async function checkSetupStatus() {
    try {
        // Check if setup directory exists
        const setupDirPath = join(process.cwd(), 'src', 'app', 'setup');
        const setupDirExists = existsSync(setupDirPath);

        // Check if all required data exists using backend-data.js functions
        let hasSettings = false;
        let hasRoles = false;
        let needsFirstUser = false;
        let existingCollections = [];
        let databaseInitialization = null;
        
        try {
            // Check site_settings and store_settings - follow same pattern as settings.js
            const settingsResult = await getSettings();
            hasSettings = settingsResult?.siteSettings !== null && settingsResult?.storeSettings !== null;
            if (settingsResult?.siteSettings) existingCollections.push('site_settings');
            if (settingsResult?.storeSettings) existingCollections.push('store_settings');
            
            // Check roles - follow same pattern as users.js
            const rolesResult = await getAllRoles({ page: 1, limit: 1 });
            hasRoles = rolesResult?.success && rolesResult?.data?.length > 0;
            if (hasRoles) existingCollections.push('roles');
            
            // Check users - follow same pattern as users.js
            const usersResult = await getAllUsers({ page: 1, limit: 1 });
            const hasUsers = usersResult?.success && usersResult?.data?.length > 0;
            needsFirstUser = !hasUsers;
            if (hasUsers) existingCollections.push('users');
        } catch (error) {
            console.error('Error checking existing data:', error.message);
            // If there's an error checking data, assume we need setup
            needsFirstUser = true;
            hasSettings = false;
            hasRoles = false;
        }

        // Trigger database initialization directly (creates default tables/data if missing)
        try {
            databaseInitialization = await initializeDatabase();
        } catch (error) {
            console.error('Error initializing database:', error.message);
        }

        // Determine setup states:
        // 1. If tables exist (settings + roles) but no users → show user creation form
        // 2. If all tables exist AND at least one user exists → setup is complete
        const tablesReady = hasSettings && hasRoles;
        const allDataExists = tablesReady && !needsFirstUser;

        return {
            setupData: { existingCollections, databaseInitialization },
            needsFirstUser,
            tablesReady,
            allDataExists,
            showSetupDirWarning: setupDirExists && allDataExists,
            existingCollections,
            defaultCredentials: databaseInitialization?.defaultCredentials || null
        };
    } catch (error) {
        console.error('Error checking setup status:', error.message);
        return {
            setupData: null,
            needsFirstUser: true,
            tablesReady: false,
            allDataExists: false,
            showSetupDirWarning: false,
            existingCollections: []
        };
    }
}

export default async function SetupPage() {
    // Early check: if setup is complete, redirect immediately without loading the page
    const setupComplete = await isSetupComplete();
    
    if (setupComplete) {  
        // Redirect to home if setup is complete
        redirect('/');
    }
    
    // Full status check only if setup is incomplete or needs to show warning
    const status = await checkSetupStatus();

    // If all data exists and directory doesn't exist, redirect to home
    if (status.allDataExists && !status.showSetupDirWarning) {
        redirect('/');
    }

    return (
        <SetupPageClient 
            setupData={status.setupData}
            needsFirstUser={status.needsFirstUser}
            tablesReady={status.tablesReady}
            allDataExists={status.allDataExists}
            showSetupDirWarning={status.showSetupDirWarning}
            existingCollections={status.existingCollections}
            defaultCredentials={status.defaultCredentials}
        />
    );
}

