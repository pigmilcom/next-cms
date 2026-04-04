// @/app/(frontend)/blank/page.jsx

/**
 * BLANK PAGE - SERVER COMPONENT
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

// import { getCatalog, getCategories } from '@/lib/server/store';
import BlankPageClient from './page.client';

const BlankPage = async () => {
    // ============================================================================
    // DATA FETCHING (OPTIONAL)
    // ============================================================================
    /**
     * Fetch page-specific data here if needed.
     * 
     * Examples:
     * - const data = await getCatalog({ page: 1, limit: 10, options: { duration: '3M' } });
     * - const categories = await getCategories({ options: { next: { revalidate: 300 } } });
     * 
     * Note: Session and settings available via hooks in client component.
     */

    // Example data fetching (uncomment if needed):
    // const data = null;
    // try {
    //     data = await getCatalog({ page: 1, limit: 12, options: { duration: '3M' } });
    // } catch (error) {
    //     console.error('Error fetching data:', error);
    // }

    // ============================================================================
    // RETURN CLIENT COMPONENT
    // ============================================================================
    return <BlankPageClient />;
};

export default BlankPage;

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
