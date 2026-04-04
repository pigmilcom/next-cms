// @/lib/server/endpoints.js
'use server';

import DBService from '@/data/rest.db.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';
import { getDatabaseInfo } from '@/lib/server/database.js';

// Initialize cache for endpoints operations
const { loadCacheData, saveCacheData } = await initCache('endpoints');
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// API KEYS MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get all API keys
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (optional)
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} API keys data
 */
export async function getAllAPIKeys(params = {}) {
    try {
        const cachedData = await loadCacheData('api_keys', params);
        if (cachedData) return cachedData;

        const result = await DBService.readAll('api_keys');
        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to fetch API keys',
                data: []
            };
        }

        let records = [];
        if (Array.isArray(result.data)) {
            records = result.data;
        } else if (typeof result.data === 'object') {
            records = Object.values(result.data || {});
        }

        // Apply status filter
        if (params.status) {
            records = records.filter((key) => key.status === params.status);
        }

        // Sort by creation date (newest first)
        records.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        const response = {
            success: true,
            data: records
        };

        await saveCacheData('api_keys', params, response);
        return response;
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch API keys',
            data: []
        };
    }
}

/**
 * Get API key by key string (for authentication)
 * @param {string} apiKeyString - The API key string to validate
 * @returns {Promise<Object>} API key data
 */
export async function getAPIKeyByString(apiKeyString) {
    try {
        const result = await DBService.readBy('key', apiKeyString, 'api_keys');
        if (!result?.success) {
            return {
                success: false,
                error: 'API key not found'
            };
        }

        const apiKey = result.data;

        // Check if API key is active and not expired
        if (apiKey.status !== 'active') {
            return {
                success: false,
                error: 'API key is not active'
            };
        }

        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
            return {
                success: false,
                error: 'API key has expired'
            };
        }

        return {
            success: true,
            data: apiKey
        };
    } catch (error) {
        console.error('Error validating API key:', error);
        return {
            success: false,
            error: error.message || 'Failed to validate API key'
        };
    }
}

/**
 * Create a new API key
 * @param {Object} apiKeyData - API key data to create
 * @returns {Promise<Object>} Created API key data
 */
export async function createAPIKey(apiKeyData) {
    try {
        const timeNow = new Date().toISOString();

        // Generate API key
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 15);
        const random2 = Math.random().toString(36).substring(2, 15);
        const apiKey = `pk_live_${timestamp}_${random}_${random2}`;

        const payload = {
            id: `api_key_${Date.now()}`,
            name: apiKeyData.name || 'Unnamed API Key',
            description: apiKeyData.description || '',
            key: apiKey,
            keyPreview: `${apiKey.substring(0, 20)}...${apiKey.slice(-4)}`,
            permissions: apiKeyData.permissions || ['READ'],
            rateLimit: apiKeyData.rateLimit || 100,
            rateLimitWindow: apiKeyData.rateLimitWindow || 3600000,
            status: 'active',
            usage: 0,
            lastUsed: null,
            expiresAt: apiKeyData.expiresAt || null,
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(payload, 'api_keys', ['endpoints']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating API key:', error);
        return {
            success: false,
            error: error.message || 'Failed to create API key'
        };
    }
}

/**
 * Update an API key
 * @param {string} keyId - ID of the API key to update
 * @param {Object} apiKeyData - API key data to update
 * @returns {Promise<Object>} Updated API key data
 */
export async function updateAPIKey(keyId, apiKeyData) {
    try {
        const updateData = {
            ...apiKeyData,
            updatedAt: new Date().toISOString()
        };

        // Remove undefined values and prevent changing the actual key
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined || key === 'key') {
                delete updateData[key];
            }
        });

        const result = await updateWithCacheClear(keyId, updateData, 'api_keys', ['endpoints'], ['api_keys']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating API key:', error);
        return {
            success: false,
            error: error.message || 'Failed to update API key'
        };
    }
}

/**
 * Delete an API key
 * @param {string} keyId - ID of the API key to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAPIKey(keyId) {
    try {
        const result = await deleteWithCacheClear(keyId, 'api_keys', ['endpoints']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting API key:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete API key'
        };
    }
}

/**
 * Increment API key usage
 * @param {string} apiKeyString - The API key string
 * @returns {Promise<Object>} Update result
 */
export async function incrementAPIKeyUsage(apiKeyString) {
    try {
        const apiKeyResult = await getAPIKeyByString(apiKeyString);
        if (!apiKeyResult.success) {
            return apiKeyResult;
        }

        const apiKey = apiKeyResult.data;
        const updateData = {
            usage: (apiKey.usage || 0) + 1,
            lastUsed: new Date().toISOString()
        };

        const keyId = apiKey.id || apiKey.key;
        const result = await updateWithCacheClear(keyId, updateData, 'api_keys', ['endpoints'], ['api_keys']);

        return {
            success: true,
            data: { ...apiKey, ...updateData }
        };
    } catch (error) {
        console.error('Error incrementing API key usage:', error);
        return {
            success: false,
            error: error.message || 'Failed to update API key usage'
        };
    }
}

/**
 * Validate API key permissions
 * @param {Object} apiKey - API key object
 * @param {string} requiredPermission - Required permission (READ, WRITE, DELETE, UPLOAD)
 * @returns {boolean} Whether the API key has the required permission
 */
export async function hasPermission(apiKey, requiredPermission) {
    if (!apiKey || !apiKey.permissions) return false;
    return apiKey.permissions.includes(requiredPermission);
}

// ============================================================================
// API SETTINGS FUNCTIONS
// ============================================================================

/**
 * Get API settings
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API settings data
 */
export async function getAPISettings(params = {}) {
    try {
        const cachedData = await loadCacheData('api_settings', params);
        if (cachedData) return cachedData;

        const result = await DBService.readAll('api_settings');
        let record = null;

        if (result?.success && result.data) {
            if (Array.isArray(result.data)) {
                record = result.data.length ? result.data[0] : null;
            } else if (typeof result.data === 'object') {
                const firstKey = Object.keys(result.data)[0];
                record = firstKey ? result.data[firstKey] : null;
            }
        }

        // Return default settings if none exist
        if (!record) {
            const defaultSettings = {
                apiEnabled: true,
                allowedOrigins: ['*'],
                rateLimit: {
                    enabled: true,
                    defaultLimit: 100,
                    windowMs: 3600000
                }
            };
            return {
                success: true,
                data: defaultSettings
            };
        }

        const response = {
            success: true,
            data: record
        };

        await saveCacheData('api_settings', params, response);
        return response;
    } catch (error) {
        console.error('Error fetching API settings:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch API settings'
        };
    }
}

/**
 * Update API settings
 * @param {Object} settingsData - API settings data to save
 * @returns {Promise<Object>} Save result
 */
export async function updateAPISettings(settingsData) {
    try {
        const payload = {
            apiEnabled: settingsData.apiEnabled !== false,
            allowedOrigins: settingsData.allowedOrigins || ['*'],
            rateLimit: settingsData.rateLimit || {
                enabled: true,
                defaultLimit: 100,
                windowMs: 3600000
            },
            updatedAt: new Date().toISOString()
        };

        // Check for existing record
        const existingResult = await DBService.readAll('api_settings');
        let existingKey = null;

        if (existingResult?.success && existingResult.data) {
            if (Array.isArray(existingResult.data) && existingResult.data.length) {
                const first = existingResult.data[0];
                existingKey = first.id || first.key || null;
            } else if (existingResult.data && typeof existingResult.data === 'object') {
                const firstKey = Object.keys(existingResult.data)[0];
                if (firstKey) existingKey = firstKey;
            }
        }

        let result;
        if (existingKey) {
            // Update existing record
            result = await updateWithCacheClear(existingKey, payload, 'api_settings', ['endpoints'], ['api_settings']);
        } else {
            // Create new record
            payload.id = 'api_settings_main';
            result = await createWithCacheClear(payload, 'api_settings', ['endpoints']);
        }

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating API settings:', error);
        return {
            success: false,
            error: error.message || 'Failed to update API settings'
        };
    }
}

// ============================================================================
// ENDPOINTS MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get all database collections/tables for endpoint generation
 * Uses the same method as database.js to get all tables
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Collections data
 */
export async function getDatabaseCollections(params = {}) {
    try {
        // Use getDatabaseInfo from database.js to get collections
        const dbInfo = await getDatabaseInfo(params);
        
        if (!dbInfo.success || !dbInfo.data) {
            return {
                success: false,
                error: 'Failed to fetch database collections',
                data: []
            };
        }

        const collections = dbInfo.data.collections || [];
        
        // Format collections for endpoint use
        const formattedCollections = collections.map(col => ({
            name: col.name,
            documentCount: col.documentCount,
            size: col.size,
            lastModified: col.lastModified
        }));

        return {
            success: true,
            data: formattedCollections
        };
    } catch (error) {
        console.error('Error fetching database collections:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch database collections',
            data: []
        };
    }
}

/**
 * Get default endpoints configuration (built-in API endpoints)
 * @returns {Array} Default endpoints array
 */
function getDefaultEndpoints() {
    return [
        {
            id: 'query-get',
            method: 'GET',
            path: '/api/query/[slug]',
            collection: 'any',
            description: 'Retrieve data from any collection with optional pagination, search, and filtering',
            status: 'active',
            authentication: 'apikey',
            rateLimit: 100,
            usage: 0,
            responseFormat: 'JSON',
            parameters: 'slug (path), id, key, value, page, limit, search (query)',
            example: '{"success": true, "data": [...], "pagination": {...}}',
            permissions: ['READ'],
            isDefault: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'query-post',
            method: 'POST',
            path: '/api/query/[slug]',
            collection: 'any',
            description: 'Create new items in any collection',
            status: 'active',
            authentication: 'apikey',
            rateLimit: 50,
            usage: 0,
            responseFormat: 'JSON',
            parameters: 'slug (path), JSON body with item data',
            example: '{"success": true, "data": {...}, "message": "Record created successfully!"}',
            permissions: ['WRITE'],
            isDefault: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'query-put',
            method: 'PUT',
            path: '/api/query/[slug]',
            collection: 'any',
            description: 'Update existing items in any collection',
            status: 'active',
            authentication: 'apikey',
            rateLimit: 50,
            usage: 0,
            responseFormat: 'JSON',
            parameters: 'slug (path), JSON body with id and updated data',
            example: '{"success": true, "data": {...}, "message": "Record updated successfully!"}',
            permissions: ['WRITE'],
            isDefault: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'query-delete',
            method: 'DELETE',
            path: '/api/query/[slug]',
            collection: 'any',
            description: 'Delete items from any collection',
            status: 'active',
            authentication: 'apikey',
            rateLimit: 25,
            usage: 0,
            responseFormat: 'JSON',
            parameters: 'slug (path), id (query parameter)',
            example: '{"success": true, "message": "Record deleted successfully!", "data": {"id": "123"}}',
            permissions: ['DELETE'],
            isDefault: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'upload-files',
            method: 'POST',
            path: '/api/upload',
            collection: 'files',
            description: 'Upload files with support for images, documents, and media files',
            status: 'active',
            authentication: 'apikey',
            rateLimit: 20,
            usage: 0,
            responseFormat: 'JSON',
            parameters: 'file (multipart/form-data), folder, resize (query)',
            example: '{"success": true, "data": {"filename": "...", "url": "...", "size": 123456}}',
            permissions: ['UPLOAD'],
            isDefault: true,
            createdAt: new Date().toISOString()
        }
    ];
}

/**
 * Get all endpoints (default + custom)
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (optional)
 * @param {boolean} params.isDefault - Filter by default endpoints (optional)
 * @param {string} params.method - Filter by HTTP method (optional)
 * @param {string} params.collection - Filter by collection name (optional)
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Endpoints data
 */
export async function getAllEndpoints(params = {}) {
    try {
        const cachedData = await loadCacheData('endpoints', params);
        if (cachedData) return cachedData;

        // Get custom endpoints from database
        const result = await DBService.readAll('custom_endpoints');
        let records = [];

        if (result?.success && result.data) {
            if (Array.isArray(result.data)) {
                records = result.data;
            } else if (typeof result.data === 'object') {
                records = Object.values(result.data || {});
            }
        }

        // Add default endpoints
        const defaultEndpoints = getDefaultEndpoints();
        const allEndpoints = [...defaultEndpoints, ...records];

        // Apply filters
        let filteredEndpoints = allEndpoints;

        if (params.status) {
            filteredEndpoints = filteredEndpoints.filter((endpoint) => endpoint.status === params.status);
        }

        if (params.isDefault !== undefined) {
            filteredEndpoints = filteredEndpoints.filter((endpoint) => endpoint.isDefault === params.isDefault);
        }

        if (params.method) {
            filteredEndpoints = filteredEndpoints.filter((endpoint) => endpoint.method === params.method);
        }

        if (params.collection) {
            filteredEndpoints = filteredEndpoints.filter((endpoint) => 
                endpoint.collection === params.collection || endpoint.collection === 'any'
            );
        }

        // Sort by creation date (newest first)
        filteredEndpoints.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        const response = {
            success: true,
            data: filteredEndpoints
        };

        await saveCacheData('endpoints', params, response);
        return response;
    } catch (error) {
        console.error('Error fetching endpoints:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch endpoints',
            data: []
        };
    }
}

/**
 * Get endpoint by ID
 * @param {string} endpointId - ID of the endpoint to get
 * @returns {Promise<Object>} Endpoint data
 */
export async function getEndpointById(endpointId) {
    try {
        // Check if it's a default endpoint
        const defaultEndpoints = getDefaultEndpoints();
        const defaultEndpoint = defaultEndpoints.find((e) => e.id === endpointId);

        if (defaultEndpoint) {
            return {
                success: true,
                data: defaultEndpoint
            };
        }

        // Check custom endpoints in database
        const result = await DBService.readBy('id', endpointId, 'custom_endpoints');
        if (!result?.success) {
            return {
                success: false,
                error: 'Endpoint not found'
            };
        }

        return {
            success: true,
            data: result.data
        };
    } catch (error) {
        console.error('Error fetching endpoint:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch endpoint'
        };
    }
}

/**
 * Create a custom endpoint
 * @param {Object} endpointData - Endpoint data to create
 * @returns {Promise<Object>} Created endpoint data
 */
export async function createCustomEndpoint(endpointData) {
    try {
        const timeNow = new Date().toISOString();
        
        // Generate endpoint path based on collection
        const collection = endpointData.collection || '';
        const method = endpointData.method || 'GET';
        const path = `/api/query/${collection}`;

        const payload = {
            id: `endpoint_${Date.now()}`,
            method: method,
            path: path,
            collection: collection,
            description: endpointData.description || `Custom ${method} endpoint for ${collection}`,
            status: endpointData.status || 'active',
            authentication: 'apikey', // Always require API key for custom endpoints
            rateLimit: endpointData.rateLimit || 100,
            rateLimitWindow: endpointData.rateLimitWindow || 3600000,
            usage: 0,
            responseFormat: 'JSON',
            parameters: endpointData.parameters || '',
            example: endpointData.example || '{}',
            permissions: endpointData.permissions || ['READ'],
            isDefault: false,
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(payload, 'custom_endpoints', ['endpoints']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating custom endpoint:', error);
        return {
            success: false,
            error: error.message || 'Failed to create custom endpoint'
        };
    }
}

/**
 * Update a custom endpoint
 * @param {string} endpointId - ID of the endpoint to update
 * @param {Object} endpointData - Endpoint data to update
 * @returns {Promise<Object>} Updated endpoint data
 */
export async function updateCustomEndpoint(endpointId, endpointData) {
    try {
        // Check if it's a default endpoint
        const defaultEndpoints = getDefaultEndpoints();
        const isDefault = defaultEndpoints.some((e) => e.id === endpointId);

        if (isDefault) {
            return {
                success: false,
                error: 'Default endpoints cannot be modified'
            };
        }

        // Get the endpoint to ensure it exists
        const existingResult = await DBService.readBy('id', endpointId, 'custom_endpoints');
        if (!existingResult?.success) {
            return {
                success: false,
                error: 'Endpoint not found'
            };
        }

        const updateData = {
            ...endpointData,
            updatedAt: new Date().toISOString()
        };

        // Remove undefined values and prevent changing isDefault
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined || key === 'isDefault') {
                delete updateData[key];
            }
        });

        const result = await updateWithCacheClear(endpointId, updateData, 'custom_endpoints', ['endpoints'], ['endpoints']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating endpoint:', error);
        return {
            success: false,
            error: error.message || 'Failed to update endpoint'
        };
    }
}

/**
 * Delete a custom endpoint
 * @param {string} endpointId - ID of the endpoint to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCustomEndpoint(endpointId) {
    try {
        // Check if it's a default endpoint
        const defaultEndpoints = getDefaultEndpoints();
        const isDefault = defaultEndpoints.some((e) => e.id === endpointId);

        if (isDefault) {
            return {
                success: false,
                error: 'Default endpoints cannot be deleted'
            };
        }

        // Get the endpoint to ensure it exists
        const existingResult = await DBService.readBy('id', endpointId, 'custom_endpoints');
        if (!existingResult?.success) {
            return {
                success: false,
                error: 'Endpoint not found'
            };
        }

        const result = await deleteWithCacheClear(endpointId, 'custom_endpoints', ['endpoints']);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting endpoint:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete endpoint'
        };
    }
}

/**
 * Increment endpoint usage counter
 * @param {string} endpointId - ID of the endpoint
 * @returns {Promise<Object>} Update result
 */
export async function incrementEndpointUsage(endpointId) {
    try {
        // Check if it's a default endpoint
        const defaultEndpoints = getDefaultEndpoints();
        const isDefault = defaultEndpoints.some((e) => e.id === endpointId);

        // Don't track usage for default endpoints
        if (isDefault) {
            return { success: true };
        }

        const endpointResult = await getEndpointById(endpointId);
        if (!endpointResult.success) {
            return endpointResult;
        }

        const endpoint = endpointResult.data;
        const updateData = {
            usage: (endpoint.usage || 0) + 1
        };

        const result = await updateWithCacheClear(endpointId, updateData, 'custom_endpoints', ['endpoints'], ['endpoints']);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error incrementing endpoint usage:', error);
        return {
            success: false,
            error: error.message || 'Failed to update endpoint usage'
        };
    }
}
