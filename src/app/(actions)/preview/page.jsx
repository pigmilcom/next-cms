// @/app/(frontend)/preview/page.jsx (Server Component)

import { notFound } from 'next/navigation';
import { getCampaign } from '@/lib/server/newsletter';
import PreviewPageClient from './page.client';

// Metadata for preview page
export const metadata = {
    title: 'Campaign Preview',
    description: 'Preview email and SMS campaign content in your browser',
    robots: {
        index: false,
        follow: false
    }
};

const PreviewPage = async ({ searchParams }) => {
    // Await searchParams (Next.js 15+ requirement)
    const params = await searchParams;

    // Get campaign ID from URL params (base64 encoded)
    const encodedId = params?.id;

    if (!encodedId) {
        notFound();
    }

    // Decode base64 campaign ID
    let campaignId;
    try {
        campaignId = Buffer.from(encodedId, 'base64').toString('utf-8');
    } catch (error) {
        console.error('Failed to decode campaign ID:', error);
        notFound();
    }

    // Validate campaign ID format
    if (!campaignId || campaignId.length === 0) {
        notFound();
    }

    // Fetch campaign data
    const campaignResult = await getCampaign(campaignId);

    if (!campaignResult?.success || !campaignResult.data) {
        notFound();
    }

    const campaign = campaignResult.data;

    // Only allow preview for email campaigns (SMS doesn't need browser preview)
    if (campaign.type !== 'email') {
        notFound();
    }

    return <PreviewPageClient campaign={campaign} />;
};

export default PreviewPage;
