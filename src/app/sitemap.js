// @/app/sitemap.js
// Dynamic sitemap generation for Next.js 16 App Router

import { getSettings } from '@/lib/server/settings';

/**
 * Generate sitemap for all frontend routes
 * @returns {Promise<Array>} Array of sitemap entries
 */
export default async function sitemap() {
    const { siteSettings } = await getSettings();
    const baseUrl = siteSettings?.baseUrl || 'http://localhost:3000';

    // Static routes from footer menu configuration
    const staticRoutes = [
        // Main pages
        {
            url: `${baseUrl}/`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0
        }, 
        // Auth pages
        {
            url: `${baseUrl}/auth/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5
        },
        {
            url: `${baseUrl}/auth/register`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5
        }
    ];

    // TODO: Add dynamic routes (products, categories, collections) when available
    // Example:
    // const products = await getCatalog({ duration: '1D' });
    // const productUrls = products?.data?.map((product) => ({
    //     url: `${baseUrl}/product/${product.slug}`,
    //     lastModified: product.updatedAt || new Date(),
    //     changeFrequency: 'weekly',
    //     priority: 0.7
    // })) || [];

    return [...staticRoutes];
}
