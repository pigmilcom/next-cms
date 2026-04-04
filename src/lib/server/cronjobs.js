// @/lib/server/cronjobs.js

'use server';

import DBService from '@/data/rest.db.js';
import { generateUID } from '@/lib/shared/helpers.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize cronjobs cache instance
const { loadCacheData, saveCacheData } = await initCache('cronjobs');

// Cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear, clearCache } = await cacheFunctions();

// ============================================================================
// SYSTEM CRONJOBS CONFIGURATION
// ============================================================================
 
const SYSTEM_CRONJOBS = [
    {
        id: 'check-pending-payments',
        name: 'Check Pending Payments',
        description: 'Check and update pending payment statuses (EuPago, Stripe, etc.)',
        type: 'system',
        endpoint: '/api/cron/payments',
        method: 'GET',
        defaultInterval: 5, // minutes
        category: 'payments'
    },
    {
        id: 'data-backups',
        name: 'Data Backups',
        description: 'Perform database backups and store to cloud storage',
        type: 'system',
        endpoint: '/api/cron/backup',
        method: 'POST',
        defaultInterval: 1440, // 24 hours
        category: 'maintenance'
    }
];

/**
 * Validate frequency value
 * @param {number} minutes - Frequency in minutes
 * @returns {Object} Validation result
 */
export async function validateFrequency(minutes, FREQUENCY_LIMITS = {}) {
    const num = Number(minutes);
    
    if (isNaN(num)) {
        return {
            valid: false,
            error: 'Frequency must be a valid number'
        };
    }
    
    if (num < FREQUENCY_LIMITS.min) {
        return {
            valid: false,
            error: `Frequency must be at least ${FREQUENCY_LIMITS.min} minute(s)`
        };
    }
    
    if (num > FREQUENCY_LIMITS.max) {
        return {
            valid: false,
            error: `Frequency cannot exceed ${FREQUENCY_LIMITS.max} minutes (30 days)`
        };
    }
    
    return {
        valid: true,
        value: num
    };
}

/**
 * Get system cronjob configuration
 * @param {string} jobId - System cronjob ID
 * @returns {Promise<Object>} System cronjob configuration
 */
export async function getSystemCronjobConfig(jobId) {
    try {
        const result = await DBService.readBy('id', jobId, 'cronjobs');
        
        if (result?.success && result.data) {
            return {
                success: true,
                data: result.data
            };
        }
        
        // Return default config if not found
        const systemJob = SYSTEM_CRONJOBS.find(job => job.id === jobId);
        if (systemJob) {
            return {
                success: true,
                data: {
                    id: systemJob.id,
                    name: systemJob.name,
                    description: systemJob.description,
                    type: 'system',
                    enabled: true,
                    intervalMinutes: systemJob.defaultInterval,
                    endpoint: systemJob.endpoint,
                    method: systemJob.method,
                    category: systemJob.category,
                    lastRun: null,
                    lastStatus: null,
                    runCount: 0
                }
            };
        }
        
        return {
            success: false,
            error: 'System cronjob not found'
        };
    } catch (error) {
        console.error('Error getting system cronjob config:', error);
        return {
            success: false,
            error: error.message || 'Failed to get system cronjob config'
        };
    }
}

/**
 * Get all system cronjobs with their configurations
 * @returns {Promise<Object>} All system cronjobs with configs
 */
export async function getAllSystemCronjobs() {
    try {
        const configs = await Promise.all(
            SYSTEM_CRONJOBS.map(job => getSystemCronjobConfig(job.id))
        );
        
        const systemJobs = configs
            .filter(config => config.success)
            .map(config => config.data);
        
        return {
            success: true,
            data: systemJobs
        };
    } catch (error) {
        console.error('Error getting system cronjobs:', error);
        return {
            success: false,
            error: error.message || 'Failed to get system cronjobs',
            data: []
        };
    }
}

/**
 * Update system cronjob configuration
 * @param {string} jobId - System cronjob ID
 * @param {Object} config - Configuration to update
 * @returns {Promise<Object>} Updated configuration
 */
export async function updateSystemCronjobConfig(jobId, config, FREQUENCY_LIMITS = {}) {
    try {
        // Validate system cronjob exists
        const systemJob = SYSTEM_CRONJOBS.find(job => job.id === jobId);
        if (!systemJob) {
            return {
                success: false,
                error: 'Invalid system cronjob ID'
            };
        }
        
        // Validate frequency if provided
        if (config.intervalMinutes !== undefined) {
            const validation = validateFrequency(config.intervalMinutes, FREQUENCY_LIMITS);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }
            config.intervalMinutes = validation.value;
        }
        
        // Check if config exists in database
        const existing = await DBService.readBy('id', jobId, 'cronjobs');
        
        const timeNow = new Date().toISOString();
        const updateData = {
            ...config,
            updatedAt: timeNow
        };
        
        // Calculate nextRun if interval changed
        if (updateData.intervalMinutes) {
            updateData.nextRun = new Date(Date.now() + updateData.intervalMinutes * 60000).toISOString();
        }
        
        let result;
        
        if (existing?.success && existing.data) {
            // Update existing config
            result = await updateWithCacheClear(jobId, updateData, 'cronjobs', ['cronjobs']);
        } else {
            // Create new config
            const newConfig = {
                id: jobId,
                name: systemJob.name,
                description: systemJob.description,
                type: 'system',
                enabled: config.enabled !== false,
                intervalMinutes: config.intervalMinutes || systemJob.defaultInterval,
                endpoint: systemJob.endpoint,
                method: systemJob.method,
                category: systemJob.category,
                lastRun: null,
                lastStatus: null,
                nextRun: new Date(Date.now() + (config.intervalMinutes || systemJob.defaultInterval) * 60000).toISOString(),
                runCount: 0,
                createdAt: timeNow,
                updatedAt: timeNow
            };
            result = await createWithCacheClear(newConfig, 'cronjobs', ['cronjobs']);
        }
        
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating system cronjob config:', error);
        return {
            success: false,
            error: error.message || 'Failed to update system cronjob config'
        };
    }
}

// ============================================================================
// CUSTOM CRONJOBS MANAGEMENT
// ============================================================================

/**
 * Get all cronjobs (both system and custom)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Cronjobs data
 */
export async function getAllCronjobsAction(params = {}) {
    try {
        const cachedData = await loadCacheData('cronjobs', params);
        if (cachedData) return cachedData;

        const result = await DBService.readAll('cronjobs');
        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to fetch cronjobs',
                data: []
            };
        }

        let cronjobs = [];
        if (Array.isArray(result.data)) {
            cronjobs = result.data;
        } else if (typeof result.data === 'object') {
            cronjobs = Object.values(result.data || {});
        }

        // Sort by creation date (newest first)
        cronjobs.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        // Separate system and custom jobs
        const systemJobs = cronjobs.filter(job => job.type === 'system');
        const customJobs = cronjobs.filter(job => job.type !== 'system');

        const response = {
            success: true,
            data: {
                all: cronjobs,
                system: systemJobs,
                custom: customJobs
            }
        };

        await saveCacheData('cronjobs', params, response);
        return response;
    } catch (error) {
        console.error('Error fetching cronjobs:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch cronjobs',
            data: { all: [], system: [], custom: [] }
        };
    }
}

/**
 * Create a new custom cronjob
 * @param {Object} cronjobData - Cronjob data to create
 * @returns {Promise<Object>} Created cronjob data
 */
export async function createCronjobAction(cronjobData, FREQUENCY_LIMITS = {}) {
    try {
        // Validate URL for custom cronjobs
        if (!cronjobData.config?.url) {
            return {
                success: false,
                error: 'URL is required for custom cronjobs'
            };
        }
        
        // Validate frequency
        const validation = validateFrequency(cronjobData.intervalMinutes || 60, FREQUENCY_LIMITS);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }
        
        const timeNow = new Date().toISOString();
        const payload = {
            id: generateUID('cronjob'),
            name: cronjobData.name || 'Untitled Cronjob',
            type: 'custom',
            enabled: cronjobData.enabled !== false,
            intervalMinutes: validation.value,
            config: cronjobData.config || { url: '', method: 'GET' },
            lastRun: null,
            lastStatus: null,
            nextRun: new Date(Date.now() + validation.value * 60000).toISOString(),
            runCount: 0,
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(payload, 'cronjobs', ['cronjobs']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating cronjob:', error);
        return {
            success: false,
            error: error.message || 'Failed to create cronjob'
        };
    }
}

/**
 * Update a cronjob
 * @param {string} cronjobId - ID of the cronjob to update
 * @param {Object} cronjobData - Cronjob data to update
 * @returns {Promise<Object>} Updated cronjob data
 */
export async function updateCronjobAction(cronjobId, cronjobData, FREQUENCY_LIMITS = {}) {
    try {
        // Validate frequency if provided
        if (cronjobData.intervalMinutes !== undefined) {
            const validation = validateFrequency(cronjobData.intervalMinutes, FREQUENCY_LIMITS);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }
            cronjobData.intervalMinutes = validation.value;
        }
        
        const updateData = {
            ...cronjobData,
            updatedAt: new Date().toISOString()
        };

        // Update nextRun if intervalMinutes changed
        if (updateData.intervalMinutes) {
            updateData.nextRun = new Date(Date.now() + updateData.intervalMinutes * 60000).toISOString();
        }

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await updateWithCacheClear(cronjobId, updateData, 'cronjobs', ['cronjobs']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating cronjob:', error);
        return {
            success: false,
            error: error.message || 'Failed to update cronjob'
        };
    }
}

/**
 * Delete a cronjob
 * @param {string} cronjobId - ID of the cronjob to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCronjobAction(cronjobId) {
    try {
        // Prevent deletion of system cronjobs
        const cronjob = await DBService.readBy('id', cronjobId, 'cronjobs');
        if (cronjob?.success && cronjob.data?.type === 'system') {
            return {
                success: false,
                error: 'Cannot delete system cronjobs. Disable them instead.'
            };
        }
        
        const result = await deleteWithCacheClear(cronjobId, 'cronjobs', ['cronjobs']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting cronjob:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete cronjob'
        };
    }
}

/**
 * Execute due cronjobs - Calls the centralized API endpoint
 * @returns {Promise<Object>} Execution result
 */
export async function executeDueCronjobsAction() {
    try {
        // Use the centralized API endpoint to avoid code duplication
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
        const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
        
        const response = await fetch(`${url}/api/cron/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            return {
                success: false,
                error: errorData.error || `HTTP ${response.status}`
            };
        }

        const result = await response.json();
        
        return {
            success: result.success !== false,
            message: result.message || `Executed ${result.data?.length || 0} cronjob(s)`,
            data: result.data
        };
    } catch (error) {
        console.error('Error executing cronjobs:', error);
        return {
            success: false,
            error: error.message || 'Failed to execute cronjobs'
        };
    }
}

/**
 * Check if a cronjob is due to run based on its interval
 * @param {Object} job - Cronjob object
 * @returns {boolean} Whether the job is due to run
 */
export async function isCronjobDue(job) {
    if (!job.enabled) return false;
    
    const now = Date.now();
    const interval = Number(job.intervalMinutes) || 60;
    const lastRun = job.lastRun ? new Date(job.lastRun).getTime() : 0;
    const nextRunAt = lastRun + interval * 60 * 1000;
    
    return !job.lastRun || nextRunAt <= now;
}

/**
 * Execute a single cronjob (system or custom)
 * @param {Object} job - Cronjob to execute
 * @returns {Promise<Object>} Execution result
 */
export async function executeCronjob(job) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
        const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
        
        let fetchUrl, fetchOpts;
        
        if (job.type === 'system') {
            // System cronjob - use internal endpoint
            fetchUrl = `${url}${job.endpoint}`;
            fetchOpts = {
                method: job.method || 'GET',
                headers: {
                    'x-cron-secret': process.env.CRON_SECRET || 'null'
                }
            };
        } else {
            // Custom cronjob - use external URL
            fetchUrl = job.config?.url;
            fetchOpts = {
                method: (job.config?.method || 'GET').toUpperCase()
            };
            
            // Add custom headers if provided
            if (job.config?.headers) {
                fetchOpts.headers = job.config.headers;
            }
            
            // Add body for POST/PUT/PATCH requests
            if (job.config?.body && ['POST', 'PUT', 'PATCH'].includes(fetchOpts.method)) {
                fetchOpts.body =
                    typeof job.config.body === 'string'
                        ? job.config.body
                        : JSON.stringify(job.config.body);
            }
        }
        
        // Execute the request
        const res = await fetch(fetchUrl, fetchOpts);
        const text = await res.text();
        
        // Update job status
        const updatePayload = {
            lastRun: new Date().toISOString(),
            lastStatus: res.status,
            lastResult: text?.slice ? text.slice(0, 1000) : String(text),
            runCount: (job.runCount || 0) + 1,
            nextRun: new Date(Date.now() + (job.intervalMinutes || 60) * 60000).toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await DBService.update(job.id || job.key || job._id, updatePayload, 'cronjobs');
        
        // Clear cache after execution
        await clearCache('cronjobs');
        
        return {
            id: job.id || job.key || job._id,
            name: job.name,
            type: job.type,
            url: fetchUrl,
            status: res.status,
            success: res.ok
        };
    } catch (err) {
        console.error('Error executing cronjob', job.id || job.name, err);
        
        // Update job with error status
        try {
            await DBService.update(
                job.id || job.key || job._id,
                {
                    lastRun: new Date().toISOString(),
                    lastStatus: 'error',
                    lastResult: err.message,
                    nextRun: new Date(Date.now() + (job.intervalMinutes || 60) * 60000).toISOString(),
                    updatedAt: new Date().toISOString()
                },
                'cronjobs'
            );
            
            await clearCache('cronjobs');
        } catch (updateErr) {
            console.error('Failed to update job error status:', updateErr);
        }
        
        return {
            id: job.id || job.key || job._id,
            name: job.name,
            type: job.type,
            status: 'error',
            error: err.message,
            success: false
        };
    }
}
