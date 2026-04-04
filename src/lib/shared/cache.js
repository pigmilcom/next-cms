// @/lib/shared/cache.js

'use server';
import { revalidatePath } from 'next/cache';

/**
 * CENTRALIZED CACHE MANAGEMENT SYSTEM
 *
 * Provides reusable cache instances for different parts of the application.
 * Each cache instance has its own storage, metrics, and configuration.
 *
 * Features:
 * - LRU eviction when max size reached
 * - TTL-based expiration
 * - Cache metrics (hits, misses, evictions)
 * - Pattern-based cache clearing
 * - Automatic periodic cleanup
 */

/**
 * Module-level cache instances Map
 * Tracks all initialized cache instances
 */
const cacheMap = new Map();

/**
 * Path revalidation map
 * Maps cache instances to paths that should be revalidated when cache is cleared
 */
const revalidationMap = {
    settings: ['/', '/admin'],
    users: ['/', '/admin'],
    store: ['/', '/admin'],
    orders: ['/', '/admin'],
    notifications: ['/', '/admin']
};

/**
 * Create a new cache instance with isolated storage and metrics
 * @param {Object} config - Cache configuration
 * @param {string} config.name - Cache instance name
 * @param {number} config.maxSize - Maximum number of entries (default: 1000)
 * @param {Object} config.durations - Cache durations by type in milliseconds
 * @returns {Object} Cache instance with methods
 */
function createCacheInstance(config = {}) {
    const { name = 'cache', maxSize = 1000, durations = {} } = config;

    // Isolated cache storage for this instance
    const instanceCacheMap = new Map();

    // Isolated metrics for this instance
    const metrics = {
        hits: 0,
        misses: 0,
        evictions: 0,
        clears: 0
    };

    /**
     * Generate cache key from prefix and params
     */
    function generateCacheKey(prefix, params = {}) {
        try {
            const sortedParams = Object.keys(params)
                .sort()
                .reduce((acc, key) => {
                    acc[key] = params[key];
                    return acc;
                }, {});
            return `${prefix}:${JSON.stringify(sortedParams)}`;
        } catch (error) {
            console.error('[Cache] Error generating cache key:', error);
            // Fallback to simpler key
            return `${prefix}:${Object.keys(params).sort().join(',')}`;
        }
    }

    /**
     * Get cached data if valid
     */
    function getCachedData(cacheKey, duration) {
        const cached = instanceCacheMap.get(cacheKey);
        if (!cached) {
            metrics.misses++;
            return null;
        }

        const now = Date.now();
        if (now - cached.timestamp < duration) {
            // Increment hit counter for this entry
            cached.hits = (cached.hits || 0) + 1;
            metrics.hits++;
            return cached.data;
        }

        // Expired, remove from cache and accessOrder
        instanceCacheMap.delete(cacheKey);
        const index = accessOrder.indexOf(cacheKey);
        if (index > -1) {
            accessOrder.splice(index, 1);
        }
        metrics.misses++;
        return null;
    }

    /**
     * Set cache data with size calculation and LRU eviction
     */
    const accessOrder = []; // Track access order

    function setCacheData(cacheKey, data, duration) {
        if (instanceCacheMap.size >= maxSize && !instanceCacheMap.has(cacheKey)) {
            // Remove oldest (first in array)
            const oldestKey = accessOrder.shift();
            if (oldestKey) {
                instanceCacheMap.delete(oldestKey);
                metrics.evictions++;
            }
        }

        // Update access order
        const existingIndex = accessOrder.indexOf(cacheKey);
        if (existingIndex > -1) {
            accessOrder.splice(existingIndex, 1);
        }
        accessOrder.push(cacheKey);

        instanceCacheMap.set(cacheKey, {
            data,
            timestamp: Date.now(),
            size: JSON.stringify(data).length,
            hits: 0,
            duration
        });
    }

    // Return cache instance interface
    return {
        name,
        durations,
        cacheMap: instanceCacheMap,
        metrics,
        accessOrder,
        generateCacheKey,
        getCachedData,
        setCacheData
    };
}

// ============================================================================
// GLOBAL CACHE OPERATIONS
// ============================================================================

/**
 * Clear cache by pattern (prefix matching) for a specific instance
 * @param {string} instanceName - Cache instance name
 * @param {string} pattern - Pattern to match cache keys
 * @returns {number} Number of entries cleared
 */
function clearCacheByPattern(instanceName, pattern) {
    const instance = cacheMap.get(instanceName);
    if (!instance) {
        console.warn(`[Cache] Instance '${instanceName}' not found`);
        return 0;
    }

    const keys = Array.from(instance.cacheMap.keys());
    let cleared = 0;
    keys.forEach((key) => {
        if (key.startsWith(pattern)) {
            instance.cacheMap.delete(key);
            // Remove from accessOrder
            const index = instance.accessOrder.indexOf(key);
            if (index > -1) {
                instance.accessOrder.splice(index, 1);
            }
            cleared++;
        }
    });

    if (cleared > 0) {
        instance.metrics.clears += cleared;
    }

    return cleared;
}

/**
 * Clear all cache entries in a specific instance
 * @param {string} instanceName - Cache instance name
 * @returns {number} Number of entries cleared
 */
function clearAllCacheInInstance(instanceName) {
    const instance = cacheMap.get(instanceName);
    if (!instance) {
        console.warn(`[Cache] Instance '${instanceName}' not found`);
        return 0;
    }

    const size = instance.cacheMap.size;
    instance.cacheMap.clear();
    instance.accessOrder.length = 0; // Clear accessOrder array

    if (size > 0) {
        instance.metrics.clears += size;
    }

    return size;
}

/**
 * Reset cache metrics for a specific instance
 * @param {string} instanceName - Cache instance name
 * @returns {Object} Previous metrics before reset
 */
async function resetMetrics(instanceName) {
    const instance = cacheMap.get(instanceName);
    if (!instance) {
        console.warn(`[Cache] Instance '${instanceName}' not found`);
        return null;
    }

    const previousMetrics = { ...instance.metrics };
    instance.metrics.hits = 0;
    instance.metrics.misses = 0;
    instance.metrics.evictions = 0;
    instance.metrics.clears = 0;

    return previousMetrics;
}

/**
 * Get cache statistics for a specific instance
 * @param {string} instanceName - Cache instance name
 * @returns {Object} Cache statistics
 */
async function getInstanceStats(instanceName) {
    const instance = cacheMap.get(instanceName);
    if (!instance) {
        return { error: `Instance '${instanceName}' not found` };
    }

    const stats = {
        name: instance.name,
        totalEntries: instance.cacheMap.size,
        entries: instance.cacheMap.size, // For display compatibility
        cacheSize: 0,
        metrics: {
            hits: instance.metrics.hits,
            misses: instance.metrics.misses,
            hitRate:
                instance.metrics.hits + instance.metrics.misses > 0
                    ? ((instance.metrics.hits / (instance.metrics.hits + instance.metrics.misses)) * 100).toFixed(2) +
                      '%'
                    : '0%',
            evictions: instance.metrics.evictions,
            clears: instance.metrics.clears
        },
        keys: [],
        entryDetails: []
    };

    instance.cacheMap.forEach((value, key) => {
        const size = value.size || 0;
        stats.cacheSize += size;

        // Add to keys array for display
        stats.keys.push(key);

        // Add detailed entry info
        stats.entryDetails.push({
            key,
            size,
            age: Date.now() - value.timestamp,
            timestamp: value.timestamp,
            hits: value.hits || 0
        });
    });

    return stats;
}

/**
 * Start periodic TTL-based cleanup for a specific instance
 * Respects individual entry TTLs for accurate expiration
 * @param {string} instanceName - Cache instance name
 * @param {number} interval - Cleanup interval in milliseconds (default: 5 minutes)
 */
function startPeriodicCleanup(instanceName, interval = 5 * 60 * 1000) {
    const instance = cacheMap.get(instanceName);
    if (!instance || typeof setInterval === 'undefined') return;

    // Clear existing interval to prevent memory leaks (especially during hot reloading)
    if (instance.cleanupIntervalId) {
        clearInterval(instance.cleanupIntervalId);
        instance.cleanupIntervalId = null;
    }

    const intervalId = setInterval(() => {
        const now = Date.now();
        let cleaned = 0;
        const expiredKeys = [];

        for (const [key, value] of instance.cacheMap.entries()) {
            // Use the actual duration stored with each entry
            const entryDuration = value.duration || 5 * 60 * 1000; // Default 5 MIN if not set
            if (now - value.timestamp > entryDuration) {
                expiredKeys.push(key);
            }
        }

        // Delete expired entries and update accessOrder
        expiredKeys.forEach((key) => {
            instance.cacheMap.delete(key);
            const index = instance.accessOrder.indexOf(key);
            if (index > -1) {
                instance.accessOrder.splice(index, 1);
            }
            cleaned++;
        });

        if (cleaned > 0) {
            console.log(`[${instance.name}] Cleaned ${cleaned} expired entries`);
        }
    }, interval);

    // Store interval ID for potential cleanup later
    instance.cleanupIntervalId = intervalId;
}

/**
 * Stop periodic cleanup for a specific instance
 * @param {string} instanceName - Cache instance name
 */
function stopPeriodicCleanup(instanceName) {
    const instance = cacheMap.get(instanceName);
    if (!instance) {
        console.warn(`[Cache] Instance '${instanceName}' not found`);
        return;
    }

    if (instance.cleanupIntervalId) {
        clearInterval(instance.cleanupIntervalId);
        instance.cleanupIntervalId = null;
        console.log(`[${instance.name}] Stopped periodic cleanup`);
    }
}

/**
 * Trigger Next.js path revalidation for cache instances
 * This forces server components to refetch data after cache clear
 * @param {string[]} instanceNames - Array of cache instance names
 */
function triggerPathRevalidation(instanceNames) {
    const pathsToRevalidate = new Set();

    // Collect all paths that need revalidation
    for (const instanceName of instanceNames) {
        const paths = revalidationMap[instanceName];
        if (paths && paths.length > 0) {
            paths.forEach((path) => pathsToRevalidate.add(path));
        }
    }

    // Revalidate each unique path
    if (pathsToRevalidate.size > 0) {
        for (const path of pathsToRevalidate) {
            try {
                revalidatePath(path, 'layout');
                console.log(`[Cache] Revalidated path: ${path}`);
            } catch (error) {
                console.error(`[Cache] Failed to revalidate path ${path}:`, error.message);
            }
        }
    }
}

// ============================================================================
// PRE-CONFIGURED CACHE INSTANCES
// ============================================================================

/**
 * Initialize a cache instance with predefined configuration
 * Centralizes cache creation logic and returns utility functions
 * @param {string} cacheInstance - Cache type ('settings', 'store', 'orders', 'users', etc)
 * @returns {Object} Object with loadCacheData and saveCacheData utility functions
 */
export async function initCache(cacheInstance) {
    const maxSize = 1000;
    const CACHE_DURATIONS = {
        0: 0, // No caching
        '30S': 30 * 1000, // 30 seconds
        '1M': 1 * 60 * 1000, // 1 minute
        '3M': 3 * 60 * 1000, // 3 minutes
        '5M': 5 * 60 * 1000, // 5 minutes
        '10M': 10 * 60 * 1000, // 10 minutes
        '15M': 15 * 60 * 1000, // 15 minutes
        '30M': 30 * 60 * 1000, // 30 minutes
        '1H': 60 * 60 * 1000, // 1 hour
        '2H': 2 * 60 * 60 * 1000, // 2 hours
        '3H': 3 * 60 * 60 * 1000, // 3 hours
        '6H': 6 * 60 * 60 * 1000, // 6 hours
        '12H': 12 * 60 * 60 * 1000, // 12 hours
        '1D': 24 * 60 * 60 * 1000, // 1 day (24 hours)
        '2D': 2 * 24 * 60 * 60 * 1000, // 2 days
        '3D': 3 * 24 * 60 * 60 * 1000, // 3 days
        '7D': 7 * 24 * 60 * 60 * 1000, // 7 days (1 week)
        '30D': 30 * 24 * 60 * 60 * 1000 // 30 days (1 month)
    };

    // Check if instance already exists, if not create it
    if (!cacheMap.has(cacheInstance)) {
        const instance = createCacheInstance({
            name: cacheInstance,
            maxSize: maxSize,
            durations: CACHE_DURATIONS
        });

        // Store in module-level Map
        cacheMap.set(cacheInstance, instance);

        // Start periodic cleanup for this instance
        startPeriodicCleanup(cacheInstance);
    }

    // Get the instance
    const instance = cacheMap.get(cacheInstance);

    /**
     * Load cached data utility
     * @param {string} prefix - Cache key prefix (e.g., 'catalog', 'categories', 'site_settings')
     * @param {Object} params - Parameters for cache key generation and options
     * @param {Object} params.next - Next.js cache options
     * @param {number} params.next.revalidate - Revalidation time in seconds
     * @param {string} params.duration - Custom duration key ('0', '30S', '1M', '3M', '5M', '10M', '15M', '30M', '1H', '2H', '3H', '6H', '12H', '1D', '2D', '3D', '7D', '30D')
     * @returns {any|null} Cached data if valid, otherwise null
     */
    const loadCacheData = async (prefix, params = {}) => {
        const cacheKey = instance.generateCacheKey(prefix, params);
        const nextRevalidate = params?.next?.revalidate ? params.next.revalidate * 1000 : null;
        const customDuration = params?.duration ? CACHE_DURATIONS[params.duration] : null;
        const cacheDuration = nextRevalidate || customDuration || CACHE_DURATIONS['15M']; // Fallback to 15 minutes if none specified or invalid duration
        return await instance.getCachedData(cacheKey, cacheDuration);
    };

    /**
     * Save cache data utility
     * @param {string} prefix - Cache key prefix (e.g., 'catalog', 'categories')
     * @param {Object} params - Parameters for cache key generation
     * @param {Object} params.next - Next.js cache options
     * @param {number} params.next.revalidate - Revalidation time in seconds
     * @param {string} params.duration - Custom duration key ('0', '30S', '1M', '3M', '5M', '10M', '15M', '30M', '1H', '2H', '3H', '6H', '12H', '1D', '2D', '3D', '7D', '30D')
     * @param {any} data - Data to cache
     */
    const saveCacheData = async (prefix, params, data) => {
        const cacheKey = instance.generateCacheKey(prefix, params);
        const nextRevalidate = params?.next?.revalidate ? params.next.revalidate * 1000 : null;
        const customDuration = params?.duration ? CACHE_DURATIONS[params.duration] : null;
        const cacheDuration = nextRevalidate || customDuration || CACHE_DURATIONS['15M']; // Fallback to 15 minutes if none specified or invalid duration
        await instance.setCacheData(cacheKey, data, cacheDuration);
    };

    return {
        loadCacheData,
        saveCacheData
    };
}

// ============================================================================
// CACHE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create cache management functions for CRUD operations
 * Returns reusable wrapper functions with automatic cache clearing by collection
 *
 * @returns {Object} Cache management functions (createWithCacheClear, updateWithCacheClear, deleteWithCacheClear)
 */
export async function cacheFunctions() {
    /**
     * Wrapped DBService.create with flexible cache clearing
     * @param {Object} data - Data to create
     * @param {string} collection - Database collection name
     * @param {string[]} instances - Array of cache instance names to clear (e.g., ['store'], ['store', 'orders'])
     * @param {string[]} [keys] - Optional array of cache key patterns to clear within instances (e.g., ['favorites', 'catalog'])
     * @returns {Promise<Object>} Created data result
     *
     * @example
     * // Clear specific keys from instance
     * await createWithCacheClear(data, 'favorites', ['store'], ['favorites']);
     *
     * @example
     * // Clear entire instance
     * await createWithCacheClear(data, 'favorites', ['store']);
     *
     * @example
     * // Clear multiple instances
     * await createWithCacheClear(data, 'favorites', ['store', 'orders']);
     */
    async function createWithCacheClear(data, collection, instances = [], keys = null) {
        // Lazy import to avoid circular dependencies
        const DBService = (await import('@/data/rest.db.js')).default;
        let result = await DBService.create(data, collection);
        const instancesToClear = instances && Array.isArray(instances) && instances.length > 0 ? instances : null;

        if (!result?.success) {
            result = { success: false, message: 'Create operation failed' };
        } else {
            if (instancesToClear) {
                if (keys && Array.isArray(keys) && keys.length > 0) {
                    // Clear specific keys from each instance
                    for (const instance of instancesToClear) {
                        await clearCacheKeys(instance, ...keys);
                    }
                } else {
                    // Clear entire instances
                    await clearCache(...instancesToClear);
                }
                // Trigger path revalidation for affected instances
                triggerPathRevalidation(instancesToClear);
            }
        }

        return result;
    }

    /**
     * Wrapped DBService.update with flexible cache clearing
     * @param {string} id - Item ID
     * @param {Object} data - Data to update
     * @param {string} collection - Database collection name
     * @param {string[]} instances - Array of cache instance names to clear (e.g., ['store'], ['store', 'orders'])
     * @param {string[]} [keys] - Optional array of cache key patterns to clear within instances (e.g., ['favorites', 'catalog'])
     * @returns {Promise<Object>} Updated data result
     *
     * @example
     * // Clear specific keys from instance
     * await updateWithCacheClear(id, data, 'favorites', ['store'], ['favorites']);
     *
     * @example
     * // Clear entire instance
     * await updateWithCacheClear(id, data, 'favorites', ['store']);
     *
     * @example
     * // Clear multiple instances
     * await updateWithCacheClear(id, data, 'favorites', ['store', 'orders']);
     */
    async function updateWithCacheClear(id, data, collection, instances = [], keys = null) {
        // Lazy import to avoid circular dependencies
        const DBService = (await import('@/data/rest.db.js')).default;
        let result; 
        try {
            result = await DBService.update(id, data, collection); 
        } catch (error) { 
            result = null; 
        }
        const instancesToClear = instances && Array.isArray(instances) && instances.length > 0 ? instances : null;

        if (!result?.success) {
            result = { success: false, message: 'Update operation failed' };
        } else {
            if (instancesToClear) {
                if (keys && Array.isArray(keys) && keys.length > 0) {
                    // Clear specific keys from each instance
                    for (const instance of instancesToClear) {
                        await clearCacheKeys(instance, ...keys);
                    }
                } else {
                    // Clear entire instances
                    await clearCache(...instancesToClear);
                }
                // Trigger path revalidation for affected instances
                triggerPathRevalidation(instancesToClear);
            }
        }

        return result;
    }

    /**
     * Wrapped DBService.delete with flexible cache clearing
     * @param {string} id - Item ID
     * @param {string} collection - Database collection name
     * @param {string[]} instances - Array of cache instance names to clear (e.g., ['store'], ['store', 'orders'])
     * @param {string[]} [keys] - Optional array of cache key patterns to clear within instances (e.g., ['favorites', 'catalog'])
     * @returns {Promise<Object>} Delete result
     *
     * @example
     * // Clear specific keys from instance
     * await deleteWithCacheClear(id, 'favorites', ['store'], ['favorites']);
     *
     * @example
     * // Clear entire instance
     * await deleteWithCacheClear(id, 'favorites', ['store']);
     *
     * @example
     * // Clear multiple instances
     * await deleteWithCacheClear(id, 'favorites', ['store', 'orders']);
     */
    async function deleteWithCacheClear(id, collection, instances = [], keys = null) {
        // Lazy import to avoid circular dependencies
        const DBService = (await import('@/data/rest.db.js')).default;
        let result; 
        try {
            result = await DBService.delete(id, collection); 
        } catch (error) {
            result = null;
        }

        const instancesToClear = instances && Array.isArray(instances) && instances.length > 0 ? instances : null;

        if (!result?.success) {
            result = { success: false, message: 'Delete operation failed' };
        } else {
            if (instancesToClear) {
                if (keys && Array.isArray(keys) && keys.length > 0) {
                    // Clear specific keys from each instance
                    for (const instance of instancesToClear) {
                        await clearCacheKeys(instance, ...keys);
                    }
                } else {
                    // Clear entire instances
                    await clearCache(...instancesToClear);
                }
                // Trigger path revalidation for affected instances
                triggerPathRevalidation(instancesToClear);
            }
        }

        return result;
    }

    /**
     * Clear ALL cache and keys from specific instance(s)
     *
     * @param {...string} instanceNames - One or more instance names to clear completely
     * @returns {number} Total number of entries cleared
     *
     * @example
     * clearCache('store') - Clear all cache from 'store' instance
     * clearCache('store', 'orders') - Clear all cache from both 'store' and 'orders' instances
     */
    async function clearCache(...instanceNames) {
        if (instanceNames.length === 0) {
            console.warn('[Cache] No instance names provided');
            return 0;
        }

        let totalCleared = 0;

        for (const instanceName of instanceNames) {
            const cleared = clearAllCacheInInstance(instanceName);
            totalCleared += cleared;
        }

        console.log(`[Cache] Cleared ${totalCleared} total entries from instance(s): ${instanceNames.join(', ')}`);

        // Trigger path revalidation for affected instances
        triggerPathRevalidation(instanceNames);

        return totalCleared;
    }

    /**
     * Clear specific key(s) from a specific cache instance
     *
     * @param {string} instanceName - Instance name
     * @param {...string|string[]} keys - One or more cache key patterns to clear (or array of keys)
     * @returns {number} Total number of entries cleared
     *
     * @example
     * clearCacheKeys('store', 'catalog') - Clear 'catalog' key from 'store' instance
     * clearCacheKeys('store', 'catalog', 'categories') - Clear multiple keys from 'store' instance
     * clearCacheKeys('store', ['catalog', 'categories']) - Clear array of keys from 'store' instance
     */
    async function clearCacheKeys(instanceName, ...keys) {
        if (!instanceName || keys.length === 0) {
            console.warn('[Cache] Instance name and keys are required');
            return 0;
        }

        // Flatten keys in case an array was passed
        const keyList = keys.flat();
        let totalCleared = 0;

        for (const key of keyList) {
            const cleared = clearCacheByPattern(instanceName, key);
            totalCleared += cleared;
        }

        console.log(
            `[Cache] Cleared ${totalCleared} entries for key(s) [${keyList.join(', ')}] from instance: ${instanceName}`
        );

        // Trigger path revalidation for affected instance
        triggerPathRevalidation([instanceName]);

        return totalCleared;
    }

    /**
     * Clear ALL cache entries from ALL instances
     * Use this to completely clear the entire cache system
     *
     * @returns {Object} Result with success status and details
     *
     * @example
     * clearAllCache() - Clear all cache instances completely
     */
    async function clearAllCache() {
        const results = {};
        let totalCleared = 0;
        const allInstances = [];

        for (const instanceName of cacheMap.keys()) {
            const cleared = clearAllCacheInInstance(instanceName);
            results[instanceName] = cleared;
            totalCleared += cleared;
            allInstances.push(instanceName);
        }

        console.log(`[Cache] Cleared ${totalCleared} total entries from ALL instances`);

        // Trigger path revalidation for all instances
        triggerPathRevalidation(allInstances);

        return {
            success: true,
            cleared: totalCleared,
            details: results
        };
    }

    /**
     * Get cache statistics for one or more instances
     * @param {...string} instanceNames - One or more cache instance names (if none provided, returns all)
     * @returns {Object|Array} Statistics for single or multiple instances
     *
     * @example
     * getCacheStats() - Get stats for all cache instances
     * getCacheStats('store') - Get stats for store cache
     * getCacheStats('store', 'orders') - Get stats for multiple caches
     */
    async function getCacheStats(...instanceNames) {
        // If no instance names provided, get all instances
        if (instanceNames.length === 0) {
            instanceNames = Array.from(cacheMap.keys());

            // If still no instances exist, return empty array
            if (instanceNames.length === 0) {
                return [];
            }
        }

        if (instanceNames.length === 1) {
            // Single instance - return the stats object directly
            const singleStats = await getInstanceStats(instanceNames[0]);
            return singleStats;
        }

        // Multiple instances - return array of stats objects
        const stats = [];
        for (const instanceName of instanceNames) {
            const instanceStats = await getInstanceStats(instanceName);
            if (instanceStats && !instanceStats.error) {
                stats.push(instanceStats);
            }
        }

        return stats;
    }

    return {
        createWithCacheClear,
        updateWithCacheClear,
        deleteWithCacheClear,
        clearCache,
        clearCacheKeys,
        clearAllCache,
        getCacheStats
    };
}
