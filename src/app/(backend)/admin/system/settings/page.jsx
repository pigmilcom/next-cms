// @/app/(backend)/admin/system/settings/page.jsx

import { formatAvailableLanguages } from '@/lib/i18n';
import { getAllAvailableLanguages } from '@/lib/server/locale.js';
import { getSettings } from '@/lib/server/settings.js';
import SystemSettingsPageClient from './page.client';

export default async function SystemSettingsPage() {
    // Fetch settings data on server
    const settingsResponse = await getSettings();
    const initialSettings = settingsResponse?.adminSiteSettings || null;

    // Get default language from settings with fallback to 'en'
    const defaultLanguage = initialSettings?.language || 'en';

    // Fetch available languages for all contexts
    const languagesResult = await getAllAvailableLanguages();
    
    // Extract backend language arrays with proper fallbacks
    const backendLanguagesFound = languagesResult?.success && languagesResult?.data?.backend 
        ? languagesResult.data.backend
        : [defaultLanguage];

    const backendLanguages = initialSettings.adminLanguages 
        ? initialSettings.adminLanguages
        : [defaultLanguage];

    // Format backend languages for display
    const formattedBackendLanguages = formatAvailableLanguages(backendLanguages);
    const formattedBackendLanguagesFound = formatAvailableLanguages(backendLanguagesFound);

    return (
        <SystemSettingsPageClient
            initialSettings={initialSettings}
            backendLanguages={formattedBackendLanguages}
            backendLanguagesFound={formattedBackendLanguagesFound}
        />
    );
}
