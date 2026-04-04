// @/lib/server/database.js

'use server';

import DBService from '@/data/rest.db.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize cache for database operations
const { loadCacheData, saveCacheData } = await initCache('database');
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// DATABASE INFORMATION FUNCTIONS
// ============================================================================

/**
 * Get database statistics and collection information
 * @param {Object} params - Query parameters
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Database statistics and collection data
 */
export async function getDatabaseInfo(params = {}) {
    try {
        // Try loading from cache first
        const cached = await loadCacheData('database_info', params);
        if (cached) return cached;

        // Known collections to scan
        const knownCollections = [
            'users',
            'roles',
            'site_settings',
            'store_settings',
            'catalog',
            'categories',
            'collections',
            'attributes',
            'orders',
            'customers',
            'coupons',
            'reviews',
            'testimonials',
            'blocks',
            'appointments',
            'newsletter_campaigns',
            'newsletter_subscribers',
            'newsletter_templates',
            'tasks',
            'agenda_items',
            'schedule_items',
            'api_keys',
            'api_endpoints',
            'api_settings',
            'notifications',
            'favorites',
            'backups',
            'db_activities'
        ];

        const collections = [];
        let totalEntries = 0;
        let totalSizeBytes = 0;

        for (const collectionName of knownCollections) {
            try {
                const response = await DBService.readAll(collectionName);
                if (response?.success !== false && response?.data) {
                    const data = response.data;
                    let entries = Array.isArray(data) ? data : Object.values(data);
                    
                    // Filter out null/undefined items
                    entries = entries.filter(item => item && typeof item === 'object');
                    const documentCount = entries.length;
                    const sizeBytes = JSON.stringify(data).length;

                    totalEntries += documentCount;
                    totalSizeBytes += sizeBytes;

                    // Get latest modified date
                    let lastModified = null;
                    if (entries.length > 0) {
                        const sorted = entries
                            .filter(item => item?.updatedAt || item?.createdAt)
                            .sort((a, b) => {
                                const dateA = new Date(a.updatedAt || a.createdAt);
                                const dateB = new Date(b.updatedAt || b.createdAt);
                                return dateB - dateA;
                            });
                        if (sorted.length > 0) {
                            lastModified = sorted[0].updatedAt || sorted[0].createdAt;
                        }
                    }

                    collections.push({
                        id: `${collectionName}_${Date.now()}_${Math.random()}`,
                        name: collectionName,
                        documentCount,
                        size: formatBytes(sizeBytes),
                        sizeBytes,
                        type: 'collection',
                        lastModified: lastModified || new Date().toISOString(),
                        indexes: 1 // Default to 1 for simplicity
                    });
                }
            } catch (error) {
                // Collection might not exist or be empty
                console.log(`Collection ${collectionName} not accessible:`, error.message);
            }
        }

        // Sort collections by document count (descending)
        collections.sort((a, b) => b.documentCount - a.documentCount);

        // Detect database provider
        let provider = 'Unknown';
        if (process.env.POSTGRES_URL) {
            provider = 'PostgreSQL';
        } else if (process.env.REDIS_URL) {
            provider = 'Redis';
        } else if (process.env.FIREBASE_PROJECT_ID) {
            provider = 'Firebase';
        }

        const stats = {
            totalCollections: collections.length,
            totalEntries,
            totalSize: formatBytes(totalSizeBytes),
            connections: 0, // Not available in KV store
            uptime: getUptime(),
            provider
        };

        const result = {
            success: true,
            data: {
                collections,
                stats,
                timestamp: new Date().toISOString()
            }
        };

        // Save to cache
        await saveCacheData('database_info', params, result);
        return result;
    } catch (error) {
        console.error('Error getting database info:', error);
        return {
            success: false,
            error: error.message || 'Failed to get database information'
        };
    }
}

/**
 * Get collection data with all documents
 * @param {string} collectionName - Name of the collection
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Collection data
 */
export async function getCollectionData(collectionName, params = {}) {
    try {
        // Try loading from cache first
        const cacheKey = `collection_${collectionName}`;
        const cached = await loadCacheData(cacheKey, params);
        if (cached) return cached;

        const response = await DBService.readAll(collectionName);
        
        if (!response || response.success === false) {
            return {
                success: false,
                error: `Collection ${collectionName} not found or empty`
            };
        }

        const data = response.data || response;
        let entries = Array.isArray(data) ? data : Object.values(data);
        
        // Filter out null/undefined items
        entries = entries.filter(item => item && typeof item === 'object');

        const result = {
            success: true,
            data: {
                collectionName,
                entries,
                count: entries.length,
                timestamp: new Date().toISOString()
            }
        };

        // Save to cache
        await saveCacheData(cacheKey, params, result);
        return result;
    } catch (error) {
        console.error(`Error getting collection ${collectionName}:`, error);
        return {
            success: false,
            error: error.message || `Failed to get collection ${collectionName}`
        };
    }
}

// ============================================================================
// DATABASE CRUD OPERATIONS
// ============================================================================

/**
 * Read all items from a collection
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Collection data
 */
export async function dbReadAll(collectionName) {
    try {
        const result = await DBService.readAll(collectionName);
        return {
            success: result?.success !== false,
            data: result?.data || result || {}
        };
    } catch (error) {
        console.error(`Error reading collection ${collectionName}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to read collection'
        };
    }
}

/**
 * Create item in collection
 * @param {Object} item - Item to create
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Created item
 */
export async function dbCreate(item, collectionName) {
    try {
        const result = await createWithCacheClear(item, collectionName, ['database', 'dashboard']);
        return { success: true, data: result };
    } catch (error) {
        console.error(`Error creating item in ${collectionName}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to create item'
        };
    }
}

/**
 * Update item in collection
 * @param {string} itemId - ID of item to update
 * @param {Object} updateData - Data to update
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Update result
 */
export async function dbUpdate(itemId, updateData, collectionName) {
    try {
        const result = await updateWithCacheClear(itemId, updateData, collectionName, ['database', 'dashboard']);
        return { success: true, data: result };
    } catch (error) {
        console.error(`Error updating item in ${collectionName}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to update item'
        };
    }
}

/**
 * Delete item from collection
 * @param {string} itemId - ID of item to delete
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Delete result
 */
export async function dbDelete(itemId, collectionName) {
    try {
        const result = await deleteWithCacheClear(itemId, collectionName, ['database', 'dashboard']);
        return { success: true, data: result };
    } catch (error) {
        console.error(`Error deleting item from ${collectionName}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to delete item'
        };
    }
}

/**
 * Delete entire collection
 * @param {string} collectionName - Name of the collection to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCollection(collectionName) {
    try {
        const result = await DBService.deleteAll(collectionName);
        
        // Clear cache for database instance
        const { clearCache } = await cacheFunctions();
        await clearCache('database');
        await clearCache('dashboard');

        return {
            success: true,
            data: result,
            message: `Collection ${collectionName} deleted successfully`
        };
    } catch (error) {
        console.error(`Error deleting collection ${collectionName}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to delete collection'
        };
    }
}

/**
 * Create a new collection with initial data
 * @param {string} collectionName - Name of the collection
 * @param {Array} initialData - Initial documents to add
 * @returns {Promise<Object>} Creation result
 */
export async function createCollection(collectionName, initialData = []) {
    try {
        // Create initial documents if provided
        const createdDocs = [];
        for (const doc of initialData) {
            const result = await dbCreate(doc, collectionName);
            if (result.success) {
                createdDocs.push(result.data);
            }
        }

        return {
            success: true,
            data: {
                collectionName,
                documentsCreated: createdDocs.length,
                documents: createdDocs
            },
            message: `Collection ${collectionName} created with ${createdDocs.length} documents`
        };
    } catch (error) {
        console.error(`Error creating collection ${collectionName}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to create collection'
        };
    }
}

// ============================================================================
// DATABASE ACTIVITIES
// ============================================================================

/**
 * Get database activities (recent operations)
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Limit number of activities (default: 20)
 * @returns {Promise<Object>} Recent activities
 */
export async function getDatabaseActivities(params = {}) {
    try {
        const limit = params.limit || 20;
        
        const result = await DBService.readAll('db_activities');
        if (!result || result.success === false) {
            return {
                success: true,
                data: [] // No activities yet
            };
        }

        const data = result.data || result;
        let activities = Array.isArray(data) ? data : Object.values(data);
        
        // Filter out null/undefined items and items without valid data
        activities = activities.filter(item => item && typeof item === 'object');
        
        // Sort by date (newest first)
        activities.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.timestamp || 0);
            const dateB = new Date(b.createdAt || b.timestamp || 0);
            return dateB - dateA;
        });

        // Limit results
        activities = activities.slice(0, limit);

        return {
            success: true,
            data: activities
        };
    } catch (error) {
        console.error('Error getting database activities:', error);
        return {
            success: false,
            error: error.message || 'Failed to get database activities'
        };
    }
}

/**
 * Log a database activity
 * @param {Object} activity - Activity details
 * @returns {Promise<Object>} Log result
 */
export async function logDatabaseActivity(activity) {
    try {
        const activityData = {
            ...activity,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        const result = await dbCreate(activityData, 'db_activities');
        return result;
    } catch (error) {
        console.error('Error logging database activity:', error);
        return {
            success: false,
            error: error.message || 'Failed to log activity'
        };
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get application uptime
 * @returns {string} Uptime string
 */
function getUptime() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    if (days > 0) {
        return `${days} days, ${hours} hours`;
    } else if (hours > 0) {
        return `${hours} hours, ${minutes} minutes`;
    } else {
        return `${minutes} minutes`;
    }
}
