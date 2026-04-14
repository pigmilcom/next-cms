// @/app/(backend)/admin/marketing/newsletter/page.jsx

import { getAllCampaigns, getAllSubscribers, getCampaignAnalytics, getAllTemplates } from '@/lib/server/newsletter';
import { getMergedAvailableLanguages } from '@/lib/server/locale';
import CampaignsClient from './page.client';

export default async function NewsletterPage() {
    // Fetch all data server-side
    const [campaignsResult, subscribersResult, analyticsResult, templatesResult, languagesResult] = await Promise.all([
        getAllCampaigns(1, 0),
        getAllSubscribers(1, 0),
        getCampaignAnalytics(),
        getAllTemplates(1, 100),
        getMergedAvailableLanguages()
    ]);

    const initialData = {
        campaigns: campaignsResult.success ? campaignsResult.data : [],
        subscribers: subscribersResult.success ? subscribersResult.data : [],
        analytics: analyticsResult.success ? analyticsResult.data : {},
        templates: templatesResult.success ? templatesResult.data : [],
        availableLanguages: languagesResult.success ? languagesResult.data : ['en']
    };

    return <CampaignsClient initialData={initialData} />;
}
