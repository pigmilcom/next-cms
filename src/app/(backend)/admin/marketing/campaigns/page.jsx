// @/app/(backend)/admin/marketing/newsletter/page.jsx

import { getAllCampaigns, getAllSubscribers, getCampaignAnalytics } from '@/lib/server/newsletter';
import CampaignsClient from './page.client';

export default async function NewsletterPage() {
    // Fetch all data server-side
    const [campaignsResult, subscribersResult, analyticsResult] = await Promise.all([
        getAllCampaigns(1, 0),
        getAllSubscribers(1, 0),
        getCampaignAnalytics()
    ]);

    const initialData = {
        campaigns: campaignsResult.success ? campaignsResult.data : [],
        subscribers: subscribersResult.success ? subscribersResult.data : [],
        analytics: analyticsResult.success ? analyticsResult.data : {}
    };

    return <CampaignsClient initialData={initialData} />;
}
