// @/lib/server/navigation.js
'use server';

/**
 * Navigation badge counts without using backend-data.js
 * This module provides badge counts for sidebar navigation items
 */

/**
 * Get navigation section counts for sidebar badges
 * @param {Array<string>} sections - Array of section names to get counts for
 * @param {string} userId - User ID (optional, for user-specific counts)
 * @returns {Promise<Object>} Object with counts for each section
 */
export async function getNavigationSectionCounts(sections = [], userId = null) {
    try {
        const counts = {};

        for (const section of sections) {
            switch (section) {
                case 'orders': {
                    // Import orders function dynamically to avoid circular dependencies
                    const { getPendingOrdersCount } = await import('@/lib/server/orders.js');
                    const ordersResult = await getPendingOrdersCount();
                    counts.orders = ordersResult.success ? ordersResult.data.count : 0;
                    break;
                }

                case 'store':
                case 'storeOrders': {
                    // For now, use the same orders count for store section
                    const { getPendingOrdersCount } = await import('@/lib/server/orders.js');
                    const storeResult = await getPendingOrdersCount();
                    counts.store = storeResult.success ? storeResult.data.count : 0;
                    counts.storeOrders = counts.store;
                    break;
                }

                case 'catalog':
                case 'storeCatalog': {
                    // Count out-of-stock catalog items
                    const { getOutOfStockCount } = await import('@/lib/server/store.js');
                    const catalogResult = await getOutOfStockCount();
                    counts.catalog = catalogResult.success ? catalogResult.data.count : 0;
                    counts.storeCatalog = counts.catalog;
                    break;
                }

                case 'reviews':
                case 'storeReviews': {
                    // Count pending reviews
                    const { getPendingReviewsCount } = await import('@/lib/server/store.js');
                    const reviewsResult = await getPendingReviewsCount();
                    counts.reviews = reviewsResult.success ? reviewsResult.data.count : 0;
                    counts.storeReviews = counts.reviews;
                    break;
                }

                case 'tickets':
                case 'supportTickets': {
                    // Count open support tickets
                    const { getOpenTicketsCount } = await import('@/lib/server/tickets.js');
                    const ticketsResult = await getOpenTicketsCount();
                    counts.tickets = ticketsResult.success ? ticketsResult.data.count : 0;
                    counts.supportTickets = counts.tickets;
                    break;
                }

                case 'system': {
                    // System notifications (settings, maintenance)
                    // Placeholder - can be implemented later
                    counts.system = 0;
                    break;
                }

                case 'marketing': {
                    // Marketing notifications (newsletter, subscribers)
                    // Placeholder - can be implemented later
                    counts.marketing = 0;
                    break;
                }

                default:
                    counts[section] = 0;
            }
        }

        return { success: true, data: counts };
    } catch (error) {
        console.error('Error getting navigation section counts:', error);
        return { success: false, error: error.message, data: {} };
    }
}
