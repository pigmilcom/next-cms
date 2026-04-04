// @/app/(frontend)/page.jsx (Homepage Server Component)

/**
 * HOMEPAGE - SERVER COMPONENT
 *
 * This is the main homepage component that runs on the SERVER.
 * Server components:
 * - Can directly access backend resources (databases, file system, environment variables)
 * - Can use async/await for data fetching
 * - Reduce client-side JavaScript bundle size
 * - Are SEO-friendly (pre-rendered with data)
 * - Cannot use client-side hooks (useState, useEffect, event handlers)
 *
 * RESPONSIBILITIES:
 * 1. Fetch ONLY page-specific data if needed (currently none required)
 * 2. Pass data to client component as props
 *
 * NOTE: Authentication and settings are now centralized:
 * - Session: Available via useAuth() hook in client components (from root layout)
 * - Settings: Available via useSettings() hook in client components (from root layout)
 * - DO NOT call auth() or getSettings() here unless absolutely necessary
 */

import PageClient from './page.client';

const Page = async () => {
    // ============================================================================
    // DATA FETCHING (OPTIONAL)
    // ============================================================================
    /**
     * Fetch page-specific data here if needed.
     * Homepage doesn't require additional server-side data fetching.
     * All components use static data from JSON files or fetch via client-side hooks.
     * 
     * Examples for future use:
     * - const products = await getCatalog({ page: 1, limit: 10, options: { duration: '3M' } });
     * - const categories = await getCategories({ options: { next: { revalidate: 300 } } });
     * 
     * Note: Session and settings available via hooks in client component.
     */

    // ============================================================================
    // RETURN CLIENT COMPONENT
    // ============================================================================
    return <PageClient />;
};

export default Page;
