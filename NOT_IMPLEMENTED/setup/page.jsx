// @/app/setup/page.jsx (Setup Server Component)
import { redirect } from 'next/navigation';
import SetupPageClient from './page.client';
import { getAllUsers, getAllRoles } from '@/lib/server/users.js';
import { getSettings } from '@/lib/server/settings';
import { existsSync } from 'fs';
import { join } from 'path';

async function checkSetupStatus() {
    try {
        // Check if setup directory exists
        const setupDirPath = join(process.cwd(), 'src', 'app', 'setup');
        const setupDirExists = existsSync(setupDirPath);

        // Fetch setup data from init route (this triggers table creation if needed)
        let setupData = null;
        try {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            const response = await fetch(`${baseUrl}/setup/init`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store'
            });

            if (response.ok) {
                const data = await response.json(); 
                setupData = data;
            } else {
                console.error('Setup init response not ok:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error fetching setup data:', error.message);
        }

        // Check if all required data exists using backend-data.js functions
        let hasSettings = false;
        let hasRoles = false;
        let needsFirstUser = false;
        
        try {
            // Check site_settings and store_settings - follow same pattern as settings.js
            const settingsResult = await getSettings();
            hasSettings = settingsResult?.siteSettings !== null && settingsResult?.storeSettings !== null;
            
            // Check roles - follow same pattern as users.js
            const rolesResult = await getAllRoles({ page: 1, limit: 1 });
            hasRoles = rolesResult?.success && rolesResult?.data?.length > 0;
            
            // Check users - follow same pattern as users.js
            const usersResult = await getAllUsers({ page: 1, limit: 1 });
            const hasUsers = usersResult?.success && usersResult?.data?.length > 0;
            needsFirstUser = !hasUsers;
        } catch (error) {
            console.error('Error checking existing data:', error.message);
            // If there's an error checking data, assume we need setup
            needsFirstUser = true;
            hasSettings = false;
            hasRoles = false;
        }

        // Determine setup states:
        // 1. If tables exist (settings + roles) but no users → show user creation form
        // 2. If all tables exist AND at least one user exists → setup is complete
        const tablesReady = hasSettings && hasRoles;
        const allDataExists = tablesReady && !needsFirstUser;

        return {
            setupData,
            needsFirstUser,
            tablesReady, // Tables are created
            allDataExists, // Everything complete including users
            showSetupDirWarning: setupDirExists && allDataExists,
            existingCollections: setupData?.existingCollections || [],
            defaultCredentials: setupData?.databaseInitialization?.defaultCredentials || null
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

