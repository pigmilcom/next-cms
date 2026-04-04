// @/app/(frontend)/example/page.jsx

/**
 * EXAMPLE PAGE - SERVER COMPONENT
 *
 * This is the main page component that runs on the SERVER.
 * Server components:
 * - Can directly access backend resources (databases, file system, environment variables)
 * - Can use async/await for data fetching
 * - Reduce client-side JavaScript bundle size
 * - Are SEO-friendly (pre-rendered with data)
 * - Cannot use client-side hooks (useState, useEffect, event handlers)
 *
 * RESPONSIBILITIES:
 * 1. Fetch ONLY page-specific data (products, categories, etc.)
 * 2. Pass data to client component as props
 *
 * NOTE: Authentication and settings are now centralized:
 * - Session: Available via useAuth() hook in client components (from root layout)
 * - Settings: Available via useSettings() hook in client components (from root layout)
 * - DO NOT call auth() or getSettings() here unless absolutely necessary
 */

import { getCatalog, getCategories } from '@/lib/server/store';
import ExamplePageClient from './page.client';

const ExamplePage = async () => {
    // ============================================================================
    // 1. DATA FETCHING WITH CACHING
    // ============================================================================
    /**
     * Fetch ONLY page-specific data here.
     *
     * DO NOT FETCH:
     * - Session/Auth: Available via useAuth() hook (from root layout auth() call)
     * - siteSettings/storeSettings: Available via useSettings() hook (from root layout)
     *
     * REVALIDATE OPTIONS FOR PAGE-SPECIFIC DATA:
     * - { next: { revalidate: 0 } }    - No caching (always fresh)
     * - { next: { revalidate: 180 } }  - Cache for 3 minutes
     * - { next: { revalidate: 300 } }  - Cache for 5 minutes
     * - OR use custom durations in seconds: '0', '30S', '1M', '3M', '5M', '10M', '15M', '30M', '1H', '2H', '3H', '6H', '12H', '1D', '2D', '3D', '7D', '30D'
     * - { duration: "0" }   - No caching (always fresh)
     * - { duration: "3M" }  - Cache for 3 minutes
     * - { duration: "5M" }  - Cache for 5 minutes
     *
     * WHEN TO USE:
     * - 0s (no cache): Order status, real-time data, user-specific data
     * - 180s (3min): Product catalog, frequently changing content
     * - 300s (5min): Categories, less dynamic content
     * - 600s+ (10min+): Static content, rarely changing data
     */

    let products = null;
    let categories = null;

    try {
        // Parallel fetch: only page-specific data
        // Demonstrating ALL available query parameters:
        const [productsData, categoriesData] = await Promise.all([
            // getCatalog() - All available parameters:
            // - page: Page number (default: 1)
            // - limit: Items per page (default: 10)
            // - search: Search query for name, description, SKU (default: '')
            // - category: Filter by category ID (default: '')
            // - activeOnly: Show only active items (default: true)
            // - options: Next.js fetch options for cache revalidation
            getCatalog({
                page: 1,
                limit: 12,
                search: '', // Example: 'My Product' to search for specific products
                category: '', // Example: 'cat_123' to filter by category
                activeOnly: true, // Set to true to include featured items (Default: false)
                //featured: true, // Set to true to include featured items (Default: false)
                options: { duration: '3M' } // 3 minute cache
            }),

            // getCategories() - All available parameters:
            // - page: Page number (default: 1)
            // - limit: Items per page (default: 10)
            // - search: Search query for name, description (default: '')
            // - options: Next.js fetch options for cache revalidation
            getCategories({
                page: 1,
                limit: 20,
                search: '', // Example: 'wellness' to search categories
                options: { next: { revalidate: 300 } } // 5 minute cache
            })
        ]);

        products = productsData;
        categories = categoriesData;
    } catch (error) {
        console.error('Error fetching data:', error);
        // Graceful error handling - set fallback values
        // Page still renders with null data, client can show error state
    }

    // ============================================================================
    // 2. OPTIONAL: SERVER-SIDE DATA PROCESSING
    // ============================================================================
    /**
     * Process or transform data on the server before passing to client
     * This reduces client-side bundle size and improves performance
     */
    const processedData = {
        productCount: products?.data?.length || 0,
        categoryCount: categories?.data?.length || 0
    };

    // ============================================================================
    // 3. RETURN CLIENT COMPONENT WITH PROPS
    // ============================================================================
    /**
     * Pass only page-specific data to client component
     * - Keep props serializable (no functions, no complex objects)
     * - Client gets session/user from useAuth() hook (centralized in root layout)
     * - Client gets siteSettings/storeSettings from useSettings() hook
     * - Client component handles UI and interactivity
     */
    return <ExamplePageClient products={products} categories={categories} processedData={processedData} />;
};

export default ExamplePage;

/**
 * BEST PRACTICES & PATTERNS:
 * 
 * 1. CENTRALIZED AUTH & SETTINGS (NEW PATTERN):
 *    DO NOT call auth() or fetch siteSettings/storeSettings in page server components.
 *    They're already available via hooks in client components.
 *    
 *    ✅ Server Component (page.jsx):
 *    - Only fetch page-specific data (products, categories, etc.)
 *    - Don't import auth() or getSettings() unless absolutely necessary
 *    
 *    ✅ Client Component (page.client.jsx):
 *    - Use useAuth() hook: const { session, isAuthenticated, user } = useAuth();
 *    - Use useSettings() hook: const { siteSettings, storeSettings } = useSettings();
 *    - Both are fetched once in root layout and passed via context
 * 
 * 2. WHEN TO USE auth() OR getSettings() IN SERVER COMPONENTS:
 *    Only use in special cases when necessary:
 *    - Server actions that need settings or authenticated users data:
 *    
 *    Example:
 *    import { auth } from '@/lib/server/auth';
 *    import { getAllOrders } from '@/lib/server/store';
 *    import { getSettings } from '@/lib/server/settings';
 * 
 *    const { user } = await auth();
 *    const { siteSettings } = await getSettings();
 *    const userOrders = user ? await getAllOrders({ userId: user.email }) : null; 
 *    const settingsInfo = siteSettings ? siteSettings.someSetting : null; 
 * 
 * 3. PARALLEL DATA FETCHING:
 *    Use Promise.all() for better performance when fetching multiple resources.
 *    Fetch only page-specific data.
 *    
 *    Example:
 *    const [products, categories] = await Promise.all([
 *        fetchProducts({ next: { revalidate: 180 } }),
 *        fetchCategories({ next: { revalidate: 300 } })
 *    ]);
 * 
 * 4. SERVER ACTIONS:
 *    Import server functions from @/lib/server/*.js for server operations:
 *    
 *    import { getAllOrders } from '@/lib/server/store';
 *    const orders = await getAllOrders({ page: 1, limit: 10 });
 * 
 * 5. DATABASE DIRECT ACCESS:
 *    Use DBService for custom database queries:
 *    
 *    import DBService from '@/data/rest.db';
 *    const users = await DBService.readAll('users');
 *    const user = await DBService.getItemByKey('email', 'user@example.com', 'users');
 * 
 * 7. ERROR HANDLING:
 *    Always wrap fetches in try-catch and provide fallback values:
 *    
 *    try {
 *        const data = await fetchData();
 *    } catch (error) {
 *        console.error('Fetch error:', error);
 *        // Return null or default value
 *    }
 * 
 * 8. METADATA GENERATION:
 *    Use generatePageMetadata in layout.js for shared metadata across all pages in /blank/* routes.
 *    Unless page-specific metadata is needed:
 *    
 *    Example:
*     import { generatePageMetadata } from '@/utils/metadata';

 *    export async function generateMetadata() {
 *        const { siteSettings } = await getSettings();
 *        return generatePageMetadata({
 *            title: 'Page Title',
 *            description: 'Page description',
 *            keywords: 'keywords, here'
 *        });
 *    }
 * 
 */
