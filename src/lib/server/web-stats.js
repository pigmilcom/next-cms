// @/lib/server/web-stats.js

'use server';

import DBService from '@/data/rest.db.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize cache
const { loadCacheData, saveCacheData } = await initCache('web_stats');

// Cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse user agent to extract browser and OS information
 * @param {string} userAgent - User agent string
 * @returns {Object} Parsed browser, os, and isMobile info
 */
function parseUserAgent(userAgent) {
    const browser = userAgent.includes('Chrome')
        ? 'Chrome'
        : userAgent.includes('Firefox')
          ? 'Firefox'
          : userAgent.includes('Safari')
            ? 'Safari'
            : userAgent.includes('Edge')
              ? 'Edge'
              : 'Other';

    const os = userAgent.includes('Windows')
        ? 'Windows'
        : userAgent.includes('Mac OS X')
          ? 'macOS'
          : userAgent.includes('Linux')
            ? 'Linux'
            : userAgent.includes('Android')
              ? 'Android'
              : userAgent.includes('iOS')
                ? 'iOS'
                : 'Other';

    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);

    return { browser, os, isMobile };
}

/**
 * Get country from IP address
 * @param {string} ip - IP address
 * @returns {Promise<string>} Country name
 */
async function getCountryFromIP(ip) {
    if (ip === '127.0.0.1' || ip === 'localhost') {
        return 'Local';
    }

    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode`);
        const data = await response.json();
        return data.country || 'Unknown';
    } catch (error) {
        console.error('Error getting country from IP:', error);
        return 'Unknown';
    }
}

// ============================================================================
// WEB STATS FUNCTIONS
// ============================================================================

/**
 * Get existing web stats from database with caching
 * Internal caching via loadCacheData/saveCacheData
 * @returns {Promise<Object>} Database response with stats data
 */
const getExistingWebStats = async () => {
    try {
        // Fetch from database - returns { success: true, data: [...] }
        const statsResponse = await DBService.readAll('web_stats');
        return statsResponse;
    } catch (error) {
        console.error('Error fetching existing web stats:', error);
        return { success: false, data: null };
    }
};

/**
 * Record batched visitor statistics from localStorage queue
 * @param {Array<Object>} batchedData - Array of visitor tracking data
 * @param {Object} headers - Request headers (optional, for server-side IP detection)
 * @returns {Promise<Object>} Result object with success status
 */
export async function recordBatchedWebStats(batchedData, headers = {}) {
    try {
        if (!Array.isArray(batchedData) || batchedData.length === 0) {
            return {
                success: true,
                message: 'No data to process',
                processed: 0
            };
        }

        // Get existing web_stats record using cached function
        const existingStats = await getExistingWebStats();
        let statsArray = [];
        let isNewTable = false;
        let recordId = null;

        // Check if database entry exists and has data
        if (existingStats?.success && existingStats.data) {
            // Handle both object (Firebase) and array responses
            const dataIsObject = typeof existingStats.data === 'object' && !Array.isArray(existingStats.data);
            const dataIsArray = Array.isArray(existingStats.data);

            if (dataIsObject) {
                // Firebase-style object response: { key1: {...}, key2: {...} }
                const keys = Object.keys(existingStats.data);
                if (keys.length > 0) {
                    // Always use the first key (oldest entry)
                    recordId = keys[0];
                    const record = existingStats.data[recordId];

                    // Extract existing stats array
                    if (record.stats && Array.isArray(record.stats)) {
                        statsArray = record.stats;
                    } else {
                        statsArray = [];
                    }

                    isNewTable = false;
                } else {
                    // Empty object - create new
                    isNewTable = true;
                }
            } else if (dataIsArray && existingStats.data.length > 0) {
                // Array response: [{ key: '...', stats: [...] }]
                const record = existingStats.data[0];
                recordId = record.key || record.id;

                // Extract existing stats array
                if (record.stats && Array.isArray(record.stats)) {
                    statsArray = record.stats;
                } else {
                    statsArray = [];
                }

                isNewTable = false;
            } else {
                // No data - create new
                isNewTable = true;
            }
        } else {
            // No existing entry - create new
            isNewTable = true;
        }

        // Process each item in the batch
        let processedCount = 0;
        const results = [];

        for (const data of batchedData) {
            try {
                // Skip unload events
                if (data.type === 'unload') {
                    continue;
                }

                // Get client information
                const ip = data.ip || headers['x-forwarded-for']?.split(',')[0] || headers['x-real-ip'] || '127.0.0.1';
                const userAgent = data.userAgent || headers['user-agent'] || '';
                const referer = data.referrer || headers['referer'] || '';

                // Parse user agent
                const { browser, os, isMobile } = parseUserAgent(userAgent);

                // Get country from IP (only once per batch, use first entry's result)
                const country = processedCount === 0 ? await getCountryFromIP(ip) : results[0]?.country || 'Unknown';

                // Create visitor record
                const visitorData = {
                    visitorId: data.visitorId || null,
                    sessionId: data.sessionId || null,
                    ip,
                    userAgent,
                    url: data.url || '',
                    pathname: data.pathname || '',
                    title: data.title || '',
                    referrer: data.referrer || referer,
                    browser,
                    os,
                    isMobile,
                    screenWidth: data.device?.screen?.width || null,
                    screenHeight: data.device?.screen?.height || null,
                    viewportWidth: data.device?.viewport?.width || null,
                    viewportHeight: data.device?.viewport?.height || null,
                    pixelRatio: data.device?.pixelRatio || null,
                    orientation: data.device?.orientation || null,
                    country,
                    language: data.language || null,
                    timezone: data.timezone || null,
                    timezoneOffset: data.timezoneOffset || null,
                    loadTime: data.performance?.loadTime || null,
                    domReadyTime: data.performance?.domReadyTime || null,
                    renderTime: data.performance?.renderTime || null,
                    timeOnPage: data.timeOnPage || null,
                    pageLoadTime: data.pageLoadTime || null,
                    eventType: data.type || 'pageview',
                    eventName: data.eventName || null,
                    eventData: data.eventData ? JSON.stringify(data.eventData) : null,
                    customData: data.customData ? JSON.stringify(data.customData) : null,
                    timestamp: data.timestamp || new Date().toISOString(),
                    date: new Date(data.timestamp || Date.now()).toISOString().split('T')[0],
                    hour: new Date(data.timestamp || Date.now()).getHours(),
                    utmSource: data.params?.utm_source || null,
                    utmMedium: data.params?.utm_medium || null,
                    utmCampaign: data.params?.utm_campaign || null,
                    utmTerm: data.params?.utm_term || null,
                    utmContent: data.params?.utm_content || null,
                    cookieEnabled: data.cookieEnabled || null,
                    doNotTrack: data.doNotTrack || false
                };

                statsArray.push(visitorData);
                results.push({ country, browser, os, isMobile });
                processedCount++;
            } catch (itemError) {
                console.error('Error processing batch item:', itemError);
            }
        }

        if (processedCount === 0) {
            return {
                success: true,
                message: 'No valid data to process',
                processed: 0
            };
        }

        // Create or update the database record (maintain single entry for all tracking data)
        let result;
        const recordData = {
            stats: statsArray,
            lastUpdated: new Date().toISOString(),
            totalRecords: statsArray.length
        };

        if (isNewTable) {
            // Create new entry with cache clearing
            result = await createWithCacheClear(recordData, 'web_stats', ['web_stats']);
        } else {
            // Update existing entry with cache clearing
            result = await updateWithCacheClear(recordId, recordData, 'web_stats', ['web_stats']);
        }

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to save batched visitor data'
            };
        }

        return {
            success: true,
            message: 'Batched visitor data recorded successfully',
            processed: processedCount,
            totalRecords: statsArray.length
        };
    } catch (error) {
        console.error('Batched web stats error:', error);
        return {
            success: false,
            error: 'Failed to record batched visitor data',
            message: error.message
        };
    }
}

/**
 * Record visitor statistics (single entry - for backward compatibility)
 * @param {Object} data - Visitor tracking data
 * @param {Object} headers - Request headers (optional, for server-side IP detection)
 * @returns {Promise<Object>} Result object with success status
 */
export async function recordWebStats(data, headers = {}) {
    try {
        // Skip unload events as they're not needed for analytics
        if (data.type === 'unload') {
            return {
                success: true,
                message: 'Unload event acknowledged'
            };
        }

        // Check for duplicate page views using client-side tracking info
        // Client should prevent duplicates via sessionStorage, but this is a server-side safety check
        if (data.type === 'pageview' && data.isDuplicateCheck === true) {
            return {
                success: true,
                message: 'Duplicate page view detected, entry skipped',
                duplicate: true
            };
        }

        // Use batched function for consistency
        return await recordBatchedWebStats([data], headers);
    } catch (error) {
        console.error('Web stats error:', error);
        return {
            success: false,
            error: 'Failed to record visitor data',
            message: error.message
        };
    }
}

/**
 * Get web statistics with aggregated analytics data
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date for filtering (optional)
 * @param {string} params.endDate - End date for filtering (optional)
 * @param {string} params.duration - Cache duration key (optional)
 * @param {Object} params.next - Next.js cache options (optional)
 * @returns {Promise<Object>} Aggregated web stats data
 */
export const getWebStats = async (params = {}) => {
    try {
        // Check cache first (defaults to 24h, can be overridden)
        const cachedData = await loadCacheData('analytics', params);
        if (cachedData) return cachedData;

        const { startDate, endDate } = params;

        // Get all web stats from database using cached function
        const statsResponse = await getExistingWebStats();

        if (!statsResponse?.success || !statsResponse.data) {
            const emptyResult = {
                success: true,
                data: {
                    overview: {
                        totalVisitors: 0,
                        uniqueVisitors: 0,
                        pageViews: 0,
                        avgLoadTime: 0,
                        bounceRate: 0
                    },
                    countries: [],
                    browsers: [],
                    devices: [],
                    os: [],
                    daily: [],
                    hourly: [],
                    pages: []
                }
            };
            await saveCacheData('analytics', params, emptyResult);
            return emptyResult;
        }

        // Handle both object (Firebase) and array responses
        let stats = [];
        const dataIsObject = typeof statsResponse.data === 'object' && !Array.isArray(statsResponse.data);
        const dataIsArray = Array.isArray(statsResponse.data);

        if (dataIsObject) {
            // Firebase-style object response: { key1: {...}, key2: {...} }
            const keys = Object.keys(statsResponse.data);
            if (keys.length > 0) {
                const record = statsResponse.data[keys[0]];
                if (record.stats && Array.isArray(record.stats)) {
                    stats = record.stats;
                }
            }
        } else if (dataIsArray && statsResponse.data.length > 0) {
            // Array response: [{ key: '...', stats: [...] }]
            const record = statsResponse.data[0];
            if (record.stats && Array.isArray(record.stats)) {
                stats = record.stats;
            }
        }

        // Filter by date range if provided
        if (startDate || endDate) {
            stats = stats.filter((stat) => {
                const statDate = new Date(stat.timestamp);
                if (startDate && statDate < new Date(startDate)) return false;
                if (endDate && statDate > new Date(endDate)) return false;
                return true;
            });
        }

        // Aggregate analytics data
        const totalVisitors = stats.length;
        // Count unique visitors by visitorId (more reliable than IP)
        const uniqueVisitors = new Set(
            stats
                .filter((stat) => stat.visitorId) // Filter out entries without visitorId
                .map((stat) => stat.visitorId)
        ).size;
        const pageViews = stats.length;

        // Group by country
        const countryStats = stats.reduce((acc, stat) => {
            const country = stat.country || 'Unknown';
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {});

        // Group by browser
        const browserStats = stats.reduce((acc, stat) => {
            const browser = stat.browser || 'Unknown';
            acc[browser] = (acc[browser] || 0) + 1;
            return acc;
        }, {});

        // Group by device type
        const deviceStats = stats.reduce((acc, stat) => {
            const device = stat.isMobile ? 'Mobile' : 'Desktop';
            acc[device] = (acc[device] || 0) + 1;
            return acc;
        }, {});

        // Group by OS
        const osStats = stats.reduce((acc, stat) => {
            const os = stat.os || 'Unknown';
            acc[os] = (acc[os] || 0) + 1;
            return acc;
        }, {});

        // Daily visitors for charts
        const dailyStats = stats.reduce((acc, stat) => {
            const date = stat.date || new Date(stat.timestamp).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        // Hourly distribution
        const hourlyStats = stats.reduce((acc, stat) => {
            const hour = stat.hour !== undefined ? stat.hour : new Date(stat.timestamp).getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});

        // Top pages
        const pageStats = stats.reduce((acc, stat) => {
            const page = stat.pathname || stat.url || 'Unknown';
            acc[page] = (acc[page] || 0) + 1;
            return acc;
        }, {});

        // Format aggregated data
        const analyticsData = {
            overview: {
                totalVisitors,
                uniqueVisitors,
                pageViews,
                avgLoadTime: 0,
                bounceRate: 0
            },
            countries: Object.entries(countryStats)
                .map(([country, count]) => ({ country, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10),
            browsers: Object.entries(browserStats)
                .map(([browser, count]) => ({ browser, count }))
                .sort((a, b) => b.count - a.count),
            devices: Object.entries(deviceStats).map(([device, count]) => ({ device, count })),
            os: Object.entries(osStats)
                .map(([os, count]) => ({ os, count }))
                .sort((a, b) => b.count - a.count),
            daily: Object.entries(dailyStats)
                .map(([date, visitors]) => ({ date, visitors }))
                .sort((a, b) => new Date(a.date) - new Date(b.date)),
            hourly: Array.from({ length: 24 }, (_, hour) => ({
                hour,
                visitors: hourlyStats[hour] || 0
            })),
            pages: Object.entries(pageStats)
                .map(([page, views]) => ({ page, views }))
                .sort((a, b) => b.views - a.views)
                .slice(0, 10)
        };

        const result = {
            success: true,
            data: analyticsData
        };

        // Save to cache (use duration from params or default to 24h)
        await saveCacheData('analytics', params, result);

        return result;
    } catch (error) {
        console.error('Failed to retrieve analytics data:', error);
        return {
            success: false,
            error: 'Failed to retrieve analytics data',
            message: error.message
        };
    }
};

/**
 * Clear web statistics by date range
 * @param {Object} params - Clear parameters
 * @param {string} params.startDate - Start date for filtering (optional)
 * @param {string} params.endDate - End date for filtering (optional)
 * @param {boolean} params.clearAll - Clear all data if true (optional)
 * @returns {Promise<Object>} Result object with success status
 */
export async function clearWebStats(params = {}) {
    try {
        const { startDate, endDate, clearAll = false } = params;

        // Get existing web stats
        const existingStats = await getExistingWebStats();

        if (!existingStats?.success || !existingStats.data) {
            return {
                success: false,
                error: 'No analytics data found'
            };
        }

        // Handle both object (Firebase) and array responses
        let stats = [];
        let recordId = null;
        const dataIsObject = typeof existingStats.data === 'object' && !Array.isArray(existingStats.data);
        const dataIsArray = Array.isArray(existingStats.data);

        if (dataIsObject) {
            const keys = Object.keys(existingStats.data);
            if (keys.length > 0) {
                recordId = keys[0];
                const record = existingStats.data[recordId];
                if (record.stats && Array.isArray(record.stats)) {
                    stats = record.stats;
                }
            }
        } else if (dataIsArray && existingStats.data.length > 0) {
            const record = existingStats.data[0];
            recordId = record.key || record.id;
            if (record.stats && Array.isArray(record.stats)) {
                stats = record.stats;
            }
        }

        if (!recordId) {
            return {
                success: false,
                error: 'No analytics data found'
            };
        }

        // Clear all data
        if (clearAll) {
            const result = await deleteWithCacheClear(recordId, 'web_stats', ['web_stats']);

            if (result?.success) {
                return {
                    success: true,
                    message: 'All analytics data cleared successfully',
                    clearedCount: stats.length
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to clear analytics data'
                };
            }
        }

        // Filter stats by date range (keep data outside the range)
        const originalCount = stats.length;
        const filteredStats = stats.filter((stat) => {
            const statDate = new Date(stat.timestamp);
            if (startDate && statDate >= new Date(startDate) && !endDate) {
                return false; // Remove data from startDate onwards
            }
            if (endDate && statDate <= new Date(endDate) && !startDate) {
                return false; // Remove data up to endDate
            }
            if (startDate && endDate && statDate >= new Date(startDate) && statDate <= new Date(endDate)) {
                return false; // Remove data in range
            }
            return true; // Keep data outside range
        });

        const clearedCount = originalCount - filteredStats.length;

        if (clearedCount === 0) {
            return {
                success: true,
                message: 'No data found in the specified date range',
                clearedCount: 0
            };
        }

        // Update database with filtered stats
        const recordData = {
            stats: filteredStats,
            lastUpdated: new Date().toISOString(),
            totalRecords: filteredStats.length
        };

        const result = await updateWithCacheClear(recordId, recordData, 'web_stats', ['web_stats']);

        if (result?.success) {
            return {
                success: true,
                message: `Cleared ${clearedCount} analytics records successfully`,
                clearedCount,
                remainingCount: filteredStats.length
            };
        } else {
            return {
                success: false,
                error: 'Failed to update analytics data after clearing'
            };
        }
    } catch (error) {
        console.error('Failed to clear analytics data:', error);
        return {
            success: false,
            error: 'Failed to clear analytics data',
            message: error.message
        };
    }
}

// ============================================================================
// CAMPAIGN TRACKING FUNCTIONS
// ============================================================================

/**
 * Record campaign event (sent, delivered, opened, clicked, bounced, failed)
 * @param {Object} eventData - Campaign event data
 * @param {string} eventData.campaignId - Campaign ID
 * @param {string} eventData.campaignType - Campaign type ('email' or 'sms')
 * @param {string} eventData.eventType - Event type ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')
 * @param {string} eventData.recipient - Recipient email or phone
 * @param {string} eventData.visitorId - Visitor ID (for tracking clicks/opens)
 * @param {string} eventData.sessionId - Session ID (for tracking clicks/opens)
 * @param {Object} eventData.metadata - Additional metadata (error message, link clicked, etc.)
 * @returns {Promise<Object>} Result object with success status
 */
export async function recordCampaignEvent(eventData) {
    try {
        const {
            campaignId,
            campaignType = 'email',
            eventType,
            recipient,
            visitorId = null,
            sessionId = null,
            metadata = {}
        } = eventData;

        if (!campaignId || !eventType || !recipient) {
            return {
                success: false,
                error: 'Missing required campaign event data'
            };
        }

        // Get existing campaign stats
        const statsResponse = await DBService.readAll('campaign_stats');
        let statsArray = [];
        let recordId = null;

        if (statsResponse?.success && statsResponse.data) {
            const dataIsObject = typeof statsResponse.data === 'object' && !Array.isArray(statsResponse.data);
            const dataIsArray = Array.isArray(statsResponse.data);

            if (dataIsObject) {
                const keys = Object.keys(statsResponse.data);
                if (keys.length > 0) {
                    recordId = keys[0];
                    const record = statsResponse.data[recordId];
                    if (record.events && Array.isArray(record.events)) {
                        statsArray = record.events;
                    }
                }
            } else if (dataIsArray && statsResponse.data.length > 0) {
                const record = statsResponse.data[0];
                recordId = record.key || record.id;
                if (record.events && Array.isArray(record.events)) {
                    statsArray = record.events;
                }
            }
        }

        // Create event record
        const campaignEvent = {
            campaignId,
            campaignType,
            eventType,
            recipient,
            visitorId,
            sessionId,
            metadata: metadata ? JSON.stringify(metadata) : null,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            hour: new Date().getHours()
        };

        statsArray.push(campaignEvent);

        // Save to database
        const recordData = {
            events: statsArray,
            lastUpdated: new Date().toISOString(),
            totalEvents: statsArray.length
        };

        let result;
        if (!recordId) {
            result = await createWithCacheClear(recordData, 'campaign_stats', ['newsletter']);
        } else {
            result = await updateWithCacheClear(recordId, recordData, 'campaign_stats', ['newsletter']);
        }

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to save campaign event'
            };
        }

        return {
            success: true,
            message: 'Campaign event recorded successfully'
        };
    } catch (error) {
        console.error('Failed to record campaign event:', error);
        return {
            success: false,
            error: 'Failed to record campaign event',
            message: error.message
        };
    }
}

/**
 * Get campaign analytics data
 * @param {string} campaignId - Campaign ID (optional, filters by campaign)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Campaign analytics data
 */
export async function getCampaignStats(campaignId = null, params = {}) {
    try {
        // Get all campaign stats
        const statsResponse = await DBService.readAll('campaign_stats');

        if (!statsResponse?.success || !statsResponse.data) {
            return {
                success: true,
                data: {
                    overview: {
                        sent: 0,
                        delivered: 0,
                        opened: 0,
                        clicked: 0,
                        bounced: 0,
                        failed: 0,
                        openRate: 0,
                        clickRate: 0,
                        bounceRate: 0
                    },
                    byCampaign: [],
                    byType: { email: 0, sms: 0 },
                    timeline: []
                }
            };
        }

        // Extract events array
        let events = [];
        const dataIsObject = typeof statsResponse.data === 'object' && !Array.isArray(statsResponse.data);
        const dataIsArray = Array.isArray(statsResponse.data);

        if (dataIsObject) {
            const keys = Object.keys(statsResponse.data);
            if (keys.length > 0) {
                const record = statsResponse.data[keys[0]];
                if (record.events && Array.isArray(record.events)) {
                    events = record.events;
                }
            }
        } else if (dataIsArray && statsResponse.data.length > 0) {
            const record = statsResponse.data[0];
            if (record.events && Array.isArray(record.events)) {
                events = record.events;
            }
        }

        // Filter by campaign if specified
        if (campaignId) {
            events = events.filter((e) => e.campaignId === campaignId);
        }

        // Calculate overview stats
        const sent = events.filter((e) => e.eventType === 'sent').length;
        const delivered = events.filter((e) => e.eventType === 'delivered').length;
        const opened = events.filter((e) => e.eventType === 'opened').length;
        const clicked = events.filter((e) => e.eventType === 'clicked').length;
        const bounced = events.filter((e) => e.eventType === 'bounced').length;
        const failed = events.filter((e) => e.eventType === 'failed').length;

        const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(2) : 0;
        const clickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(2) : 0;
        const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(2) : 0;

        // Group by campaign
        const byCampaign = events.reduce((acc, event) => {
            if (!acc[event.campaignId]) {
                acc[event.campaignId] = {
                    campaignId: event.campaignId,
                    campaignType: event.campaignType,
                    sent: 0,
                    delivered: 0,
                    opened: 0,
                    clicked: 0,
                    bounced: 0,
                    failed: 0
                };
            }
            acc[event.campaignId][event.eventType]++;
            return acc;
        }, {});

        // Group by type
        const byType = events.reduce(
            (acc, event) => {
                acc[event.campaignType] = (acc[event.campaignType] || 0) + 1;
                return acc;
            },
            { email: 0, sms: 0 }
        );

        // Timeline data
        const timeline = events.reduce((acc, event) => {
            const date = event.date;
            if (!acc[date]) {
                acc[date] = { date, sent: 0, delivered: 0, opened: 0, clicked: 0 };
            }
            if (event.eventType === 'sent') acc[date].sent++;
            if (event.eventType === 'delivered') acc[date].delivered++;
            if (event.eventType === 'opened') acc[date].opened++;
            if (event.eventType === 'clicked') acc[date].clicked++;
            return acc;
        }, {});

        return {
            success: true,
            data: {
                overview: {
                    sent,
                    delivered,
                    opened,
                    clicked,
                    bounced,
                    failed,
                    openRate: parseFloat(openRate),
                    clickRate: parseFloat(clickRate),
                    bounceRate: parseFloat(bounceRate)
                },
                byCampaign: Object.values(byCampaign),
                byType,
                timeline: Object.values(timeline).sort((a, b) => new Date(a.date) - new Date(b.date))
            }
        };
    } catch (error) {
        console.error('Failed to get campaign stats:', error);
        return {
            success: false,
            error: 'Failed to get campaign stats',
            message: error.message
        };
    }
}
