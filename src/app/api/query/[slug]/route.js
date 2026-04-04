// app/api/query/public/[slug]/route.js
import { NextResponse } from 'next/server';
import DBService from '@/data/rest.db.js';
import { withPublicAccess } from '@/lib/server/auth.js';

// ============================================================================
// PUBLIC API CACHE SYSTEM
// ============================================================================

/**
 * In-memory cache for public API responses
 * Prevents redundant database queries for frequently accessed public data
 */
const publicApiCache = new Map();

/**
 * Cache duration for different collection types (in milliseconds)
 */
const PUBLIC_CACHE_DURATIONS = {
    site_settings: 10 * 60 * 1000, // 10 minutes - rarely changes
    roles: 15 * 60 * 1000, // 15 minutes - very static
    blocks: 5 * 60 * 1000, // 5 minutes - moderately dynamic
    categories: 10 * 60 * 1000, // 10 minutes - fairly static
    collections: 10 * 60 * 1000, // 10 minutes - fairly static
    catalog: 3 * 60 * 1000, // 3 minutes - more dynamic
    default: 5 * 60 * 1000 // 5 minutes - default for other collections
};

/**
 * Generate cache key from collection and query params
 */
function generatePublicCacheKey(collection, params = {}) {
    const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
            if (params[key] !== null && params[key] !== undefined) {
                acc[key] = params[key];
            }
            return acc;
        }, {});
    return `public_api:${collection}:${JSON.stringify(sortedParams)}`;
}

/**
 * Get cached public API response if valid
 */
function getPublicCachedResponse(cacheKey, duration) {
    const cached = publicApiCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp < duration) {
        return cached.data;
    }

    // Expired, remove from cache
    publicApiCache.delete(cacheKey);
    return null;
}

/**
 * Set public API cache
 */
function setPublicCache(cacheKey, data) {
    publicApiCache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Get cache duration for a collection
 */
function getCacheDuration(collection) {
    return PUBLIC_CACHE_DURATIONS[collection] || PUBLIC_CACHE_DURATIONS.default;
}

/**
 * Clear public API cache for specific collection
 */
export function clearPublicApiCache(collection) {
    const keysToDelete = [];
    for (const key of publicApiCache.keys()) {
        if (key.startsWith(`public_api:${collection}:`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach((key) => publicApiCache.delete(key));
}

// Helper function to get request body safely
async function getRequestBody(request) {
    try {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('multipart/form-data')) {
            return await request.formData();
        }
        return await request.json();
    } catch (error) {
        console.error('Error parsing request body:', error);
        return null;
    }
}

// Check if API is enabled
async function checkApiAccess(request) {
    try {
        // Get API settings from database
        const apiSettingsResponse = await DBService.readAll('api_settings');
        const apiSettings = Object.values(apiSettingsResponse || {})[0];

        // If no settings exist, allow access (fail open)
        if (!apiSettings) {
            return { allowed: true };
        }

        // Check if API is disabled
        if (!apiSettings.apiEnabled) {
            return {
                allowed: false,
                error: 'API access is currently disabled',
                status: 503
            };
        }

        // Check allowed origins if configured
        const origin = request.headers.get('origin');
        const allowedOrigins = apiSettings.allowedOrigins || ['*'];

        if (!allowedOrigins.includes('*') && origin && !allowedOrigins.includes(origin)) {
            return {
                allowed: false,
                error: 'Origin not allowed',
                status: 403
            };
        }

        return { allowed: true, settings: apiSettings };
    } catch (error) {
        console.error('Error checking API access:', error);
        // Fail open - allow access if we can't check settings
        return { allowed: true };
    }
}

// Track API usage if API key is provided
async function trackApiUsage(request) {
    try {
        const url = new URL(request.url);
        const authHeader = request.headers.get('authorization');
        const apiKeyFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const apiKeyFromQuery = url.searchParams.get('api_key');
        const apiKey = apiKeyFromHeader || apiKeyFromQuery;

        if (apiKey) {
            // Log API usage for analytics (could be stored in a separate analytics collection)
            console.log(`API Key used: ${apiKey.substring(0, 8)}... for ${request.method} ${url.pathname}`);

            // Optional: Store usage statistics in a separate analytics collection
            try {
                await DBService.create(
                    {
                        apiKey: `${apiKey.substring(0, 8)}...`,
                        method: request.method,
                        endpoint: url.pathname,
                        timestamp: new Date().toISOString(),
                        userAgent: request.headers.get('user-agent') || 'unknown'
                    },
                    'api_usage_logs'
                );
            } catch (logError) {
                // Ignore logging errors to not affect the main request
                console.error('Failed to log API usage:', logError);
            }
        }
    } catch (error) {
        console.error('Error tracking API usage:', error);
        // Don't fail the request if tracking fails
    }
}

// GET all items or single item - public access with CSRF protection
async function handlePublicGet(request, { params }) {
    try {
        const { slug } = await params;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const key = url.searchParams.get('key');
        const value = url.searchParams.get('value');
        const page = parseInt(url.searchParams.get('page'), 10) || 1;
        const limit = Math.min(parseInt(url.searchParams.get('limit'), 10) || null); // All values
        const search = url.searchParams.get('search');

        if (!slug) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        // Generate cache key from collection and query params
        const cacheParams = { id, key, value, page, limit, search };
        const cacheKey = generatePublicCacheKey(slug, cacheParams);
        const cacheDuration = getCacheDuration(slug);

        // Check cache first (only for GET requests without API key - authenticated requests skip cache)
        const authHeader = request.headers.get('authorization');
        const apiKeyFromQuery = url.searchParams.get('api_key');
        const hasApiKey = authHeader?.startsWith('Bearer ') || apiKeyFromQuery;

        if (!hasApiKey) {
            const cachedResponse = getPublicCachedResponse(cacheKey, cacheDuration);
            if (cachedResponse) {
                // Return cached response with cache header
                return NextResponse.json(cachedResponse, {
                    headers: {
                        'X-Cache': 'HIT',
                        'Cache-Control': `public, max-age=${Math.floor(cacheDuration / 1000)}`
                    }
                });
            }
        }

        // Check if API access is allowed
        const accessCheck = await checkApiAccess(request);
        if (!accessCheck.allowed) {
            return NextResponse.json(
                { error: accessCheck.error || 'API access denied' },
                { status: accessCheck.status || 403 }
            );
        }

        // Track API usage if API key provided
        await trackApiUsage(request);

        let result;

        // Get single item by ID
        if (id) {
            result = await DBService.read(id, slug);
            if (!result) {
                return NextResponse.json({ error: 'Record not found' }, { status: 404 });
            }

            const responseData = {
                success: true,
                data: result
            };

            // Cache the single item response
            if (cacheKey) {
                setPublicCache(cacheKey, responseData);
            }

            const response = NextResponse.json(responseData);
            if (cacheKey) {
                response.headers.set('X-Cache', 'MISS');
                const duration = getCacheDuration(slug);
                response.headers.set('Cache-Control', `public, max-age=${duration}`);
            }

            return response;
        }
        // Get items by key-value pair
        else if (key && value) {
            result = await DBService.getItemsByKeyValue(key, value, slug);
            if (!result || Object.keys(result).length === 0) {
                return NextResponse.json({ error: 'No records found' }, { status: 404 });
            }
        }
        // Get all items
        else {
            result = await DBService.readAll(slug);
            if (!result) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    pagination: {
                        currentPage: page,
                        totalItems: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                });
            }
        }

        // Convert result to array format for pagination and search
        let items = [];
        if (Array.isArray(result)) {
            items = result;
        } else if (typeof result === 'object' && result !== null) {
            // Handle object format where keys are IDs and values are items
            items = Object.entries(result).map(([id, item]) => ({
                id,
                ...item
            }));
        }

        // Search functionality
        if (search && items.length > 0) {
            const searchTerm = search.toLowerCase();
            items = items.filter((item) => {
                if (!item) return false;

                const searchableFields = [
                    item.name,
                    item.title,
                    item.description,
                    item.category,
                    item.email,
                    item.displayName
                ];

                return searchableFields.some(
                    (field) => field && typeof field === 'string' && field.toLowerCase().includes(searchTerm)
                );
            });
        }

        // Sort by created date (newest first)
        if (items.length > 0) {
            items.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });
        }

        // Pagination
        let paginatedItems = items;
        let startIndex = 1;
        let endIndex = items.length;

        if (limit) {
            startIndex = (page - 1) * limit;
            endIndex = startIndex + limit;
            paginatedItems = items.slice(startIndex, endIndex);
        }

        const responseData = {
            success: true,
            data: paginatedItems,
            pagination: {
                currentPage: page,
                totalItems: items.length,
                totalPages: limit ? Math.ceil(items.length / limit) : 1,
                hasNext: limit ? endIndex < items.length : false,
                hasPrev: limit ? page > 1 : false
            }
        };

        // Cache the response for non-authenticated requests
        if (cacheKey) {
            setPublicCache(cacheKey, responseData);
        }

        // Return response with cache MISS header
        const response = NextResponse.json(responseData);
        if (cacheKey) {
            response.headers.set('X-Cache', 'MISS');
            const duration = getCacheDuration(slug);
            response.headers.set('Cache-Control', `public, max-age=${duration}`);
        }

        return response;
    } catch (error) {
        console.error('Public get data error:', error);
        return NextResponse.json(
            {
                error: 'Failed to retrieve data.',
                message: error.message
            },
            { status: 500 }
        );
    }
}

// POST create new item - public access with CSRF protection
async function handlePublicPost(request, { params }) {
    try {
        // Check if API access is allowed
        const accessCheck = await checkApiAccess(request);
        if (!accessCheck.allowed) {
            return NextResponse.json(
                { error: accessCheck.error || 'API access denied' },
                { status: accessCheck.status || 403 }
            );
        }

        // Track API usage if API key provided
        await trackApiUsage(request);

        const { slug } = await params;
        const data = await getRequestBody(request);

        if (!slug) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
        }

        // Add metadata - use user info if available (from optional auth)
        const createData = {
            ...data,
            createdAt: new Date().toISOString(),
            createdBy: request.user?.id || 'anonymous',
            updatedAt: new Date().toISOString(),
            updatedBy: request.user?.id || 'anonymous'
        };

        const newItem = await DBService.create(createData, slug);

        if (!newItem) {
            return NextResponse.json({ error: 'Failed to create record.' }, { status: 500 });
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: newItem.id || newItem.key || Date.now().toString(),
                    ...createData
                },
                message: 'Record created successfully!'
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Public create data error:', error);
        return NextResponse.json(
            {
                error: 'Failed to create record.',
                message: error.message
            },
            { status: 500 }
        );
    }
}

// PUT update item - public access with CSRF protection
async function handlePublicPut(request, { params }) {
    try {
        // Check if API access is allowed
        const accessCheck = await checkApiAccess(request);
        if (!accessCheck.allowed) {
            return NextResponse.json(
                { error: accessCheck.error || 'API access denied' },
                { status: accessCheck.status || 403 }
            );
        }

        // Track API usage if API key provided
        await trackApiUsage(request);

        const { slug } = await params;
        const data = await getRequestBody(request);

        if (!slug) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        if (!data || !data.id) {
            return NextResponse.json({ error: 'Request body with id is required' }, { status: 400 });
        }

        // Check if item exists
        const existingItem = await DBService.read(data.id, slug);
        if (!existingItem) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // Prepare update data
        const { id, ...updateFields } = data;
        const updateData = {
            ...existingItem,
            ...updateFields,
            updatedAt: new Date().toISOString(),
            updatedBy: request.user?.id || 'anonymous'
        };

        const updatedItem = await DBService.update(id, updateData, slug);

        if (!updatedItem) {
            return NextResponse.json({ error: 'Failed to update record.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: { id, ...updateData },
            message: 'Record updated successfully!'
        });
    } catch (error) {
        console.error('Public update data error:', error);
        return NextResponse.json(
            {
                error: 'Failed to update record.',
                message: error.message
            },
            { status: 500 }
        );
    }
}

// DELETE item - public access with CSRF protection
async function handlePublicDelete(request, { params }) {
    try {
        // Check if API access is allowed
        const accessCheck = await checkApiAccess(request);
        if (!accessCheck.allowed) {
            return NextResponse.json(
                { error: accessCheck.error || 'API access denied' },
                { status: accessCheck.status || 403 }
            );
        }

        // Track API usage if API key provided
        await trackApiUsage(request);

        const { slug } = await params;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!slug) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        if (!id) {
            return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
        }

        // Check if item exists
        const existingItem = await DBService.read(id, slug);
        if (!existingItem) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        const deleted = await DBService.delete(id, slug);

        if (!deleted) {
            return NextResponse.json({ error: 'Failed to delete record.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Record deleted successfully!',
            data: { id }
        });
    } catch (error) {
        console.error('Public delete record error:', error);
        return NextResponse.json(
            {
                error: 'Failed to delete record.',
                message: error.message
            },
            { status: 500 }
        );
    }
}

// Export handlers with secure public access middleware (API key tracking integrated)
export const GET = withPublicAccess(handlePublicGet, {
    requireApiKey: true,
    requireIpWhitelist: false,
    skipCsrfForApiKey: false,
    requiredPermission: true,
    logAccess: true
});

export const POST = withPublicAccess(handlePublicPost, {
    requireApiKey: true,
    requireIpWhitelist: false,
    skipCsrfForApiKey: false,
    requiredPermission: true,
    logAccess: true
});

export const PUT = withPublicAccess(handlePublicPut, {
    requireApiKey: true,
    requireIpWhitelist: false,
    skipCsrfForApiKey: false,
    requiredPermission: true,
    logAccess: true
});

export const DELETE = withPublicAccess(handlePublicDelete, {
    requireApiKey: false,
    requireIpWhitelist: false,
    skipCsrfForApiKey: false,
    requiredPermission: true,
    logAccess: true
});
