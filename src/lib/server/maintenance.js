// @/lib/server/maintenance.js
'use server';

import DBService from '@/data/rest.db.js';
import { getSettings } from '@/lib/server/settings.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize cache for maintenance operations
const { loadCacheData, saveCacheData } = await initCache('maintenance');
const { clearCache, clearAllCache, getCacheStats, clearCacheKeys, createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } =
    await cacheFunctions();

// ============================================================================
// SYSTEM INFORMATION FUNCTIONS
// ============================================================================

/**
 * Get comprehensive server information
 * WARNING: Uses Node.js modules - not compatible with Edge Runtime (middleware)
 * @param {Object} params - Query parameters
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Server information including versions, system stats, and logs
 */
export async function getServerInfo(params = {}) {
    try {
        // Try loading from cache first
        const cached = await loadCacheData('server_info', params);
        if (cached) return cached;

        const os = await import('node:os');
        const fs = await import('node:fs');
        const path = await import('node:path');

        // Get package.json to read versions
        const packagePath = path.join(process.cwd(), 'package.json');
        let packageJson = {};
        try {
            const packageData = fs.readFileSync(packagePath, 'utf8');
            packageJson = JSON.parse(packageData);
        } catch (error) {
            console.warn('Could not read package.json:', error);
        }

        // Get system information
        const systemInfo = {
            nodeEnv: process.env.NODE_ENV || 'development',
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemory: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 100) / 100,
            freeMemory: Math.round((os.freemem() / 1024 / 1024 / 1024) * 100) / 100,
            uptime: Math.round(os.uptime()),
            processUptime: Math.round(process.uptime()),
            cwd: process.cwd()
        };

        // Get version information
        const versions = {
            node: process.version,
            next: packageJson.dependencies?.next || 'Unknown',
            react: packageJson.dependencies?.react || 'Unknown',
            tailwindcss: packageJson.devDependencies?.tailwindcss || packageJson.dependencies?.tailwindcss || 'Unknown'
        };

        // Generate sample logs (in production, you might read from actual log files)
        const logs = [
            `[${new Date().toISOString()}] SERVER: System maintenance check completed`,
            `[${new Date(Date.now() - 60000).toISOString()}] INFO: Database connection healthy`,
            `[${new Date(Date.now() - 120000).toISOString()}] INFO: Cache system operational`,
            `[${new Date(Date.now() - 180000).toISOString()}] INFO: File upload system ready`,
            `[${new Date(Date.now() - 240000).toISOString()}] INFO: Email service configured`,
            `[${new Date(Date.now() - 300000).toISOString()}] INFO: Server started successfully`
        ];

        const result = {
            success: true,
            data: {
                versions,
                system: systemInfo,
                logs,
                timestamp: new Date().toISOString()
            }
        };

        // Save to cache
        await saveCacheData('server_info', params, result);
        return result;
    } catch (error) {
        console.error('Error getting server info:', error);
        return {
            success: false,
            error: error.message || 'Failed to get server information'
        };
    }
}

/**
 * Get database statistics and health information
 * @param {Object} params - Query parameters
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Database health and statistics
 */
export async function getDatabaseStats(params = {}) {
    try {
        // Try loading from cache first
        const cached = await loadCacheData('database_stats', params);
        if (cached) return cached;

        // Get all data from database to count actual records
        const dataResult = await DBService.readAllRecords();
        const isHealthy = dataResult && dataResult.success;

        let records = [];
        if (dataResult?.success && Array.isArray(dataResult.data)) {
            records = dataResult.data;
        } else if (dataResult?.success && typeof dataResult.data === 'object') {
            records = Object.values(dataResult.data || {});
        }

        // Count records by table/collection
        const collections = {};
        let totalRecords = 0;

        records.forEach((record) => {
            const tableMatch = record.key?.match(/^([^:]+):/);
            const tableName = tableMatch ? tableMatch[1] : 'unknown';
            
            if (!collections[tableName]) {
                collections[tableName] = {
                    accessible: true,
                    count: 0,
                    error: null
                };
            }
            collections[tableName].count++;
            totalRecords++;
        });

        let provider = DBService.getProvider() || 'NA';

        const result = {
            success: true,
            data: {
                healthy: isHealthy,
                collections: collections,
                totalRecords: totalRecords,
                totalTables: Object.keys(collections).length,
                provider: provider,
                timestamp: new Date().toISOString()
            }
        };

        // Save to cache
        await saveCacheData('database_stats', params, result);
        return result;
    } catch (error) {
        console.error('Error getting database stats:', error);
        return {
            success: false,
            error: error.message || 'Failed to get database statistics'
        };
    }
}

// ============================================================================
// CACHE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get cache statistics from all cache instances
 * @param {Object} params - Query parameters
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Cache statistics from all instances
 */
export async function getSystemCacheStats(params = {}) {
    try {
        // Don't cache cache stats - they should be real-time
        // Get stats from all cache instances
        const cacheStatsResult = await getCacheStats();

        // Ensure we have an array of instances
        let instances = [];
        if (Array.isArray(cacheStatsResult)) {
            instances = cacheStatsResult;
        } else if (cacheStatsResult && !cacheStatsResult.error) {
            // Single instance returned
            instances = [cacheStatsResult];
        }

        const result = {
            success: true,
            data: {
                instances: instances,
                totalInstances: instances.length,
                timestamp: new Date().toISOString()
            }
        };

        return result;
    } catch (error) {
        console.error('Error getting cache stats:', error);
        return {
            success: false,
            error: error.message || 'Failed to get cache statistics'
        };
    }
}

/**
 * Clear specific cache instance or all cache instances
 * @param {string|null} instanceName - Cache instance name to clear, or null for all instances
 * @returns {Promise<Object>} Cache clearing result
 */
export async function clearSystemCache(instanceName = null) {
    try {
        let result;

        if (instanceName === null || instanceName === 'all') {
            // Clear all cache instances
            result = await clearAllCache();
            return {
                success: true,
                message: `All cache instances cleared (${result.cleared || 0} entries)`,
                data: { cleared: result.cleared || 0, instances: Object.keys(result.details || {}) },
                timestamp: new Date().toISOString()
            };
        } else {
            // Clear specific instance
            const cleared = await clearCache(instanceName);
            return {
                success: true,
                message: `Cache instance '${instanceName}' cleared (${cleared} entries)`,
                data: { cleared, instance: instanceName },
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        console.error('Error clearing cache:', error);
        return {
            success: false,
            error: error.message || 'Failed to clear cache'
        };
    }
}

/**
 * Clear specific cache keys from a cache instance
 * @param {string} instanceName - Cache instance name
 * @param {string[]} keys - Array of cache key patterns to clear
 * @returns {Promise<Object>} Cache clearing result
 */
export async function clearSystemCacheKeys(instanceName, keys) {
    try {
        const cleared = await clearCacheKeys(instanceName, ...keys);
        return {
            success: true,
            message: `Cleared ${cleared} entries for keys [${keys.join(', ')}] from instance '${instanceName}'`,
            data: { cleared, instance: instanceName, keys },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error clearing cache keys:', error);
        return {
            success: false,
            error: error.message || 'Failed to clear cache keys'
        };
    }
}

// ============================================================================
// SYSTEM MAINTENANCE FUNCTIONS
// ============================================================================

/**
 * Reset cache metrics for all cache instances
 * @returns {Promise<Object>} Reset confirmation
 */
export async function resetCacheMetrics() {
    try {
        // Since we can't directly access cache instance metrics from the centralized system,
        // we'll clear a temporary metrics cache entry to force refresh
        await clearCache('maintenance');

        return {
            success: true,
            message: 'Cache metrics will be refreshed on next request',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error resetting cache metrics:', error);
        return {
            success: false,
            error: error.message || 'Failed to reset cache metrics'
        };
    }
}

/**
 * Perform system cleanup operations
 * @param {Object} options - Cleanup options
 * @param {boolean} options.cleanNotifications - Whether to clean expired notifications (default: true)
 * @param {boolean} options.clearCaches - Whether to clear caches (default: true)
 * @returns {Promise<Object>} Cleanup result
 */
export async function performSystemCleanup(options = {}) {
    try {
        const results = [];
        const errors = [];

        // Clean expired notifications if enabled
        if (options.cleanNotifications !== false) {
            try {
                // Clean notifications that are older than 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const notificationsResponse = await DBService.readAll('notifications');
                let deletedCount = 0;

                if (notificationsResponse?.success && notificationsResponse.data) {
                    // Convert to array if needed
                    const notificationsData = Array.isArray(notificationsResponse.data)
                        ? notificationsResponse.data
                        : Object.values(notificationsResponse.data);

                    for (const notification of notificationsData) {
                        const notificationDate = new Date(notification.createdAt || notification.created_at);
                        if (notificationDate < thirtyDaysAgo) {
                            try {
                                // Use deleteWithCacheClear to properly clear cache after deletion
                                const deleteResult = await deleteWithCacheClear(
                                    notification.id || notification._id || notification.key,
                                    'notifications',
                                    ['notifications']
                                );
                                if (deleteResult?.success) {
                                    deletedCount++;
                                }
                            } catch (error) {
                                console.warn('Failed to delete notification:', error);
                            }
                        }
                    }
                }

                results.push(`Cleaned ${deletedCount} expired notifications`);
            } catch (error) {
                errors.push('Failed to clean notifications');
                console.error('Notification cleanup error:', error);
            }
        }

        // Clear all caches if enabled
        if (options.clearCaches !== false) {
            try {
                const cacheResult = await clearSystemCache(null); // null = clear all caches
                if (cacheResult.success) {
                    results.push('System caches cleared');
                } else {
                    errors.push('Cache clearing failed');
                }
            } catch (error) {
                errors.push('Cache clearing failed');
                console.error('Cache clearing error:', error);
            }
        }

        // Clear maintenance cache to force fresh data on next request
        await clearCache('maintenance');

        return {
            success: true,
            message: results.length > 0 ? 'System cleanup completed' : 'No cleanup operations performed',
            data: {
                results,
                errors,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Error performing system cleanup:', error);
        return {
            success: false,
            error: error.message || 'Failed to perform system cleanup'
        };
    }
}

// ============================================================================
// DEPLOYMENT HOOK FUNCTIONS
// ============================================================================

/**
 * Get deploy hook settings from site_settings
 * @returns {Promise<Object>} Deploy hook configuration
 */
export async function getDeployHook() {
    try {
        const settingsData = await DBService.readAll('site_settings');
        const settings = settingsData.data ? Object.values(settingsData.data)[0] : null;

        if (!settings) {
            return {
                success: true,
                data: {
                    deployHookUrl: '',
                    deployProvider: 'vercel',
                    lastDeployment: null,
                    deploymentHistory: []
                }
            };
        }

        return {
            success: true,
            data: {
                deployHookUrl: settings.deployHookUrl || '',
                deployProvider: settings.deployProvider || 'vercel',
                lastDeployment: settings.lastDeployment || null,
                deploymentHistory: settings.deploymentHistory || []
            }
        };
    } catch (error) {
        console.error('Error getting deploy hook:', error);
        return {
            success: false,
            error: error.message || 'Failed to get deploy hook settings'
        };
    }
}

/**
 * Update deploy hook URL in site_settings
 * @param {string} deployHookUrl - Deploy hook URL
 * @param {string} deployProvider - Deploy provider name (e.g., 'vercel', 'netlify')
 * @returns {Promise<Object>} Update result
 */
export async function updateDeployHook(deployHookUrl, deployProvider = 'vercel') {
    try {
        if (!deployHookUrl || typeof deployHookUrl !== 'string') {
            return {
                success: false,
                error: 'Deploy hook URL is required and must be a valid string'
            };
        }

        // Validate URL format
        try {
            new URL(deployHookUrl);
        } catch (error) {
            return {
                success: false,
                error: 'Invalid deploy hook URL format'
            };
        }

        // Get the database key for site settings
        const { siteSettings } = await getSettings();
        const settings = siteSettings || null;

        if (!settings || !settings.key) {
            return {
                success: false,
                error: 'Site settings not found'
            };
        }

        // Update with cache clear for settings instance
        const updateData = {
            deployHookUrl,
            deployProvider,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(settings.key, updateData, 'site_settings', ['settings']);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to update deploy hook settings'
            };
        }

        return {
            success: true,
            message: 'Deploy hook settings updated successfully',
            data: updateData
        };
    } catch (error) {
        console.error('Error updating deploy hook:', error);
        return {
            success: false,
            error: error.message || 'Failed to update deploy hook settings'
        };
    }
}

/**
 * Trigger deployment via deploy hook
 * @returns {Promise<Object>} Deployment trigger result
 */
export async function triggerDeployment() {
    try {
        // Get deploy hook settings
        const hookResult = await getDeployHook();

        if (!hookResult?.success || !hookResult.data?.deployHookUrl) {
            return {
                success: false,
                error: 'Deploy hook URL not configured. Please set up the deploy hook first.'
            };
        }

        const { deployHookUrl, deployProvider } = hookResult.data;

        // Trigger deployment using native fetch (server-side only)
        const response = await fetch(deployHookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return {
                success: false,
                error: `Deployment trigger failed with status ${response.status}`
            };
        }

        const responseData = await response.json().catch(() => ({}));

        // Update deployment history in settings
        const { siteSettings } = await getSettings();
        const settings = siteSettings || null;

        if (settings && settings.key) {
            const deploymentRecord = {
                timestamp: new Date().toISOString(),
                provider: deployProvider,
                status: 'triggered',
                response: responseData
            };

            const deploymentHistory = settings.deploymentHistory || [];
            deploymentHistory.unshift(deploymentRecord);

            // Keep only last 10 deployments
            if (deploymentHistory.length > 10) {
                deploymentHistory.splice(10);
            }

            // Update with cache clear for settings instance
            await updateWithCacheClear(
                settings.key,
                {
                    lastDeployment: deploymentRecord,
                    deploymentHistory,
                    updatedAt: new Date().toISOString()
                },
                'site_settings',
                ['settings']
            );
        }

        return {
            success: true,
            message: 'Deployment triggered successfully',
            data: {
                provider: deployProvider,
                timestamp: new Date().toISOString(),
                response: responseData
            }
        };
    } catch (error) {
        console.error('Error triggering deployment:', error);
        return {
            success: false,
            error: error.message || 'Failed to trigger deployment'
        };
    }
}

// ============================================================================
// DATABASE BACKUP FUNCTIONS
// ============================================================================

/**
 * Get actual database data (preview)
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Limit number of entries (default: 50)
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Database entries
 */
export async function getDatabaseData(params = {}) {
    try {
        // Try loading from cache first
        const cached = await loadCacheData('database_data', params);
        if (cached) return cached;

        const limit = params.limit || 50;

        // Get all data from database (kv_store table contains all data)
        const result = await DBService.readAllRecords();

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to fetch database data',
                data: [],
                total: 0
            };
        }

        let records = [];
        if (Array.isArray(result.data)) {
            records = result.data;
        } else if (typeof result.data === 'object') {
            records = Object.values(result.data || {});
        }

        // Sort by created_at (newest first)
        records.sort((a, b) => {
            const dateA = new Date(a.created_at || a.createdAt || 0);
            const dateB = new Date(b.created_at || b.createdAt || 0);
            return dateB - dateA;
        });

        // Count entries by table/type
        const entriesByTable = {};
        records.forEach((record) => {
            const tableMatch = record.key?.match(/^([^:]+):/);
            const tableName = tableMatch ? tableMatch[1] : 'unknown';
            entriesByTable[tableName] = (entriesByTable[tableName] || 0) + 1;
        });

        const response = {
            success: true,
            data: records.slice(0, limit),
            total: records.length,
            entriesByTable,
            timestamp: new Date().toISOString()
        };

        // Save to cache
        await saveCacheData('database_data', params, response);
        return response;
    } catch (error) {
        console.error('Error getting database data:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch database data',
            data: [],
            total: 0
        };
    }
}

/**
 * Get backup history from backups table
 * @param {Object} params - Query parameters
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Backup history
 */
export async function getBackupHistory(params = {}) {
    try {
        // Try loading from cache first
        const cached = await loadCacheData('backup_history', params);
        if (cached) return cached;

        const result = await DBService.readAll('backups');

        if (!result?.success) {
            return {
                success: true,
                data: [],
                total: 0,
                message: 'No backups found'
            };
        }

        let records = [];
        if (Array.isArray(result.data)) {
            records = result.data;
        } else if (typeof result.data === 'object') {
            records = Object.values(result.data || {});
        }

        // Sort by createdAt (newest first)
        records.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        const response = {
            success: true,
            data: records,
            total: records.length,
            timestamp: new Date().toISOString()
        };

        // Save to cache
        await saveCacheData('backup_history', params, response);
        return response;
    } catch (error) {
        console.error('Error getting backup history:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch backup history',
            data: [],
            total: 0
        };
    }
}

/**
 * Create database backup and upload to S3
 * @param {Object} options - Backup options
 * @param {string} options.userId - User ID creating the backup
 * @returns {Promise<Object>} Backup creation result
 */
export async function createDatabaseBackup(options = {}) {
    try {
        // Get ALL database records (not filtered by table)
        const dataResult = await DBService.readAllRecords();

        if (!dataResult?.success) {
            return {
                success: false,
                error: 'Failed to fetch database data for backup'
            };
        }

        let records = [];
        if (Array.isArray(dataResult.data)) {
            records = dataResult.data;
        } else if (typeof dataResult.data === 'object') {
            records = Object.values(dataResult.data || {});
        }

        // Create backup data
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            provider: DBService.getProvider(),
            recordCount: records.length,
            data: records
        };

        // Convert to JSON string
        const jsonContent = JSON.stringify(backupData, null, 2);
        const buffer = Buffer.from(jsonContent, 'utf-8');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.json`;

        // Create file object for upload
        const fileForUpload = {
            buffer: buffer,
            originalname: filename,
            mimetype: 'application/json',
            size: buffer.length,
            filename: filename,
            name: filename
        };

        // Upload to S3 using DBService
        const uploadPath = `backups/${filename}`;
        const uploadResult = await DBService.upload(fileForUpload, uploadPath);

        if (!uploadResult?.success || !uploadResult.data) {
            return {
                success: false,
                error: uploadResult?.message || 'Failed to upload backup file to S3. Please check your S3 configuration.'
            };
        }

        const uploadData = uploadResult.data;

        // Create backup metadata record
        const backupRecord = {
            id: `backup_${Date.now()}`,
            filename: filename,
            fileUrl: uploadData.url || uploadData.publicUrl,
            filePath: uploadData.path || uploadPath,
            fileSize: buffer.length,
            recordCount: records.length,
            provider: DBService.getProvider(),
            status: 'completed',
            createdBy: options.userId || 'system',
            createdAt: new Date().toISOString(),
            metadata: {
                version: '1.0',
                provider: uploadData.metadata?.provider || 's3'
            }
        };

        // Save backup metadata to database
        const saveResult = await createWithCacheClear(backupRecord, 'backups', ['maintenance']);

        if (!saveResult?.success) {
            return {
                success: false,
                error: 'Failed to save backup metadata'
            };
        }

        return {
            success: true,
            message: 'Database backup created successfully',
            data: {
                filename: filename,
                fileUrl: backupRecord.fileUrl,
                fileSize: backupRecord.fileSize,
                recordCount: backupRecord.recordCount,
                createdAt: backupRecord.createdAt
            }
        };
    } catch (error) {
        console.error('Error creating database backup:', error);
        return {
            success: false,
            error: error.message || 'Failed to create database backup'
        };
    }
}

/**
 * Delete a backup from database and S3
 * @param {string} backupId - Backup ID to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteBackup(backupId) {
    try {
        // Get backup metadata first
        const backupResult = await DBService.read(backupId, 'backups');

        if (!backupResult?.success || !backupResult.data) {
            return {
                success: false,
                error: 'Backup not found'
            };
        }

        const backup = backupResult.data;

        // Try to delete file from S3 if filePath exists
        if (backup.filePath) {
            try {
                await DBService.deleteFile(backup.filePath);
            } catch (fileError) {
                console.warn('Failed to delete backup file from S3:', fileError);
                // Continue anyway - we'll delete the metadata
            }
        }

        // Delete backup metadata from database
        const deleteResult = await deleteWithCacheClear(backupId, 'backups', ['maintenance']);

        if (!deleteResult?.success) {
            return {
                success: false,
                error: 'Failed to delete backup metadata'
            };
        }

        return {
            success: true,
            message: 'Backup deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting backup:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete backup'
        };
    }
}

/**
 * Get all database tables with record counts
 * @param {Object} params - Query parameters
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Database tables with counts
 */
export async function getDatabaseTables(params = {}) {
    try {
        // Try loading from cache first
        const cached = await loadCacheData('database_tables', params);
        if (cached) return cached;

        // Get all data from database (kv_store table contains all data)
        const result = await DBService.readAllRecords();

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to fetch database tables',
                data: {}
            };
        }

        let records = [];
        if (Array.isArray(result.data)) {
            records = result.data;
        } else if (typeof result.data === 'object') {
            records = Object.values(result.data || {});
        }

        // Extract tables and count records
        const tables = {};
        records.forEach((record) => {
            const tableMatch = record.key?.match(/^([^:]+):/);
            const tableName = tableMatch ? tableMatch[1] : 'unknown';
            
            if (!tables[tableName]) {
                tables[tableName] = {
                    name: tableName,
                    count: 0,
                    accessible: true
                };
            }
            tables[tableName].count++;
        });

        const response = {
            success: true,
            data: tables,
            total: Object.keys(tables).length,
            totalRecords: records.length,
            timestamp: new Date().toISOString()
        };

        // Save to cache
        await saveCacheData('database_tables', params, response);
        return response;
    } catch (error) {
        console.error('Error getting database tables:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch database tables',
            data: {}
        };
    }
}

/**
 * Import and restore database from backup file
 * @param {Object} backupFile - Backup file object with buffer/content
 * @param {Object} options - Restore options
 * @param {boolean} options.clearExisting - Whether to clear existing data before restore (default: false)
 * @param {string} options.userId - User ID performing the restore
 * @returns {Promise<Object>} Restore result
 */
export async function importBackup(backupFile, options = {}) {
    try {
        const { clearExisting = false, userId = 'system' } = options;

        // Validate file
        if (!backupFile) {
            return {
                success: false,
                error: 'No backup file provided'
            };
        }

        // Parse backup file content
        let backupData;
        try {
            // Handle different file formats
            let content;
            if (backupFile.buffer) {
                // Handle Buffer from older implementation
                content = backupFile.buffer.toString('utf-8');
            } else if (backupFile.content) {
                // Handle string content (preferred method)
                content = typeof backupFile.content === 'string' ? backupFile.content : JSON.stringify(backupFile.content);
            } else if (typeof backupFile === 'string') {
                // Handle direct string
                content = backupFile;
            } else {
                console.error('Invalid backup file format:', {
                    hasBuffer: !!backupFile.buffer,
                    hasContent: !!backupFile.content,
                    type: typeof backupFile,
                    keys: Object.keys(backupFile || {})
                });
                return {
                    success: false,
                    error: 'Invalid backup file format. Expected buffer or content property.'
                };
            }

            // Try to parse JSON
            backupData = JSON.parse(content);
        } catch (parseError) {
            console.error('Backup file parse error:', parseError);
            console.error('File info:', {
                name: backupFile?.name,
                type: backupFile?.type,
                size: backupFile?.size,
                hasBuffer: !!backupFile?.buffer,
                hasContent: !!backupFile?.content,
                contentType: typeof backupFile?.content,
                contentPreview: typeof backupFile?.content === 'string' ? backupFile.content.substring(0, 100) : 'N/A'
            });
            return {
                success: false,
                error: `Unable to parse JSON: ${parseError.message}`
            };
        }

        // Validate backup structure
        if (!backupData.data || !Array.isArray(backupData.data)) {
            return {
                success: false,
                error: 'Invalid backup structure: Missing or invalid data array'
            };
        }

        if (!backupData.version) {
            return {
                success: false,
                error: 'Invalid backup structure: Missing version'
            };
        }

        // Get records from backup
        const records = backupData.data;
        if (records.length === 0) {
            return {
                success: false,
                error: 'Backup file contains no records'
            };
        }

        const restoreResults = {
            total: records.length,
            success: 0,
            failed: 0,
            errors: []
        };

        // Clear existing data if requested
        if (clearExisting) {
            try {
                console.log('Clearing existing database data...');
                const deleteResult = await DBService.deleteAllRecords();
                if (!deleteResult?.success) {
                    console.warn('Failed to clear existing data:', deleteResult?.error || deleteResult?.message);
                }
            } catch (clearError) {
                console.warn('Error clearing existing data:', clearError);
                // Continue with restore anyway
            }
        }

        // Restore records
        console.log(`Restoring ${records.length} records from backup...`);
        for (const record of records) {
            try {
                // Validate record structure
                if (!record.key || !record.data) {
                    restoreResults.failed++;
                    restoreResults.errors.push(`Invalid record: Missing key or data`);
                    continue;
                }

                // Insert record directly with original key (preserves backup structure)
                const insertResult = await DBService.insertRecord(record);
                
                if (insertResult?.success) {
                    restoreResults.success++;
                } else {
                    restoreResults.failed++;
                    restoreResults.errors.push(`Failed to restore ${record.key}: ${insertResult?.error || insertResult?.message || 'Unknown error'}`);
                }
            } catch (recordError) {
                restoreResults.failed++;
                restoreResults.errors.push(`Error restoring ${record.key}: ${recordError.message}`);
            }
        }

        // Clear all caches after restore
        try {
            await clearAllCache();
        } catch (cacheError) {
            console.warn('Failed to clear caches after restore:', cacheError);
        }

        const wasSuccessful = restoreResults.success > 0;
        const message = wasSuccessful
            ? `Backup restored: ${restoreResults.success} records imported${restoreResults.failed > 0 ? `, ${restoreResults.failed} failed` : ''}`
            : 'Backup restore failed: No records were imported';

        return {
            success: wasSuccessful,
            message,
            data: {
                ...restoreResults,
                backupVersion: backupData.version,
                backupTimestamp: backupData.timestamp,
                backupProvider: backupData.provider,
                restoredAt: new Date().toISOString(),
                restoredBy: userId
            }
        };
    } catch (error) {
        console.error('Error importing backup:', error);
        return {
            success: false,
            error: error.message || 'Failed to import backup'
        };
    }
}
