// @/app/(actions)/unsubscribe/page.jsx (Server Component)

import { notFound } from 'next/navigation';
import { getSubscriber, updateSubscriberPreferences } from '@/lib/server/newsletter';
import UnsubscribePageClient from './page.client';

// Metadata for unsubscribe page
export const metadata = {
    title: 'Cancelar Subscrição',
    description: 'Gerir as suas preferências de comunicação e cancelar subscrição de emails e SMS',
    robots: {
        index: false,
        follow: false
    }
};

const UnsubscribePage = async ({ searchParams }) => {
    // Await searchParams (Next.js 15+ requirement)
    const params = await searchParams;

    // Get email or phone from URL params (base64 encoded)
    const encodedIdentifier = params?.id || params?.email || params?.phone;
    const type = params?.type || 'email'; // 'email' or 'phone'

    if (!encodedIdentifier) {
        notFound();
    }

    // Decode base64 identifier
    let identifier;
    try {
        identifier = Buffer.from(encodedIdentifier, 'base64').toString('utf-8');
    } catch (error) {
        console.error('Failed to decode identifier:', error);
        notFound();
    }

    // Validate identifier format
    if (!identifier || identifier.length === 0) {
        notFound();
    }

    // Fetch subscriber data
    const subscriberResult = await getSubscriber(identifier, type);

    if (!subscriberResult?.success || !subscriberResult.data) {
        notFound();
    }

    const subscriber = subscriberResult.data;

    // Server action to update preferences
    async function updatePreferencesAction(identifier, preferences, reason) {
        'use server';
        return await updateSubscriberPreferences(identifier, preferences, reason, type);
    }

    return (
        <UnsubscribePageClient
            subscriber={subscriber}
            identifier={identifier}
            type={type}
            updatePreferencesAction={updatePreferencesAction}
        />
    );
};

export default UnsubscribePage;
