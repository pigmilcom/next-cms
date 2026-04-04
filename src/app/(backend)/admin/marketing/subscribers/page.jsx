// @/app/(backend)/admin/marketing/subscribers/page.jsx

import { getAllSubscribers } from '@/lib/server/newsletter';
import SubscribersPageClient from './page.client';

export default async function SubscribersPage() {
    // Fetch all subscribers (includes both subscribers table + customers with email preferences)
    const subscribersResult = await getAllSubscribers(1, 0); // High limit to get all
    const allSubscribers = subscribersResult?.success ? subscribersResult.data || [] : [];

    // Calculate stats
    const activeSubscribers = allSubscribers.filter((sub) => sub.status === 'active');
    const unsubscribedSubscribers = allSubscribers.filter((sub) => sub.status === 'unsubscribed');
    const bouncedSubscribers = allSubscribers.filter((sub) => sub.status === 'bounced');

    // Calculate recent subscribers (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = allSubscribers.filter((sub) => {
        const createdDate = new Date(sub.subscribedDate || 0);
        return createdDate >= weekAgo;
    }).length;

    const stats = {
        total: allSubscribers.length,
        active: activeSubscribers.length,
        unsubscribed: unsubscribedSubscribers.length,
        bounced: bouncedSubscribers.length,
        recentSubscribers: recentCount,
        churnRate:
            allSubscribers.length > 0 ? Math.round((unsubscribedSubscribers.length / allSubscribers.length) * 100) : 0
    };

    return <SubscribersPageClient initialSubscribers={allSubscribers} initialStats={stats} />;
}
