// @/lib/server/media.js
'use server';

import DBService from '@/data/rest.db.js';
import { uploadFiles } from '@/lib/server/admin.js'; // Import uploadFiles from admin.js
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';
import { generateUID } from '@/lib/shared/helpers.js';

// Initialize cache for media operations
const { loadCacheData, saveCacheData } = await initCache('media');
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// MEDIA FUNCTIONS
// ============================================================================

/**
 * Get all gallery media with filtering and pagination
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search term
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Gallery media data with pagination info
 */
export async function getAllGalleryMedia(params = {}) {
    try {
        // Try to load from cache first with optional duration override
        const cachedData = await loadCacheData('gallery', params);
        if (cachedData) return cachedData;

        const { page = 1, limit = 10, search = '' } = params;
        const allMediaResponse = await DBService.readAll('gallery');

        if (!allMediaResponse?.success) {
            return {
                success: false,
                error: 'Failed to fetch gallery media',
                data: [],
                pagination: {
                    totalItems: 0,
                    currentPage: 1,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }

        const allMedia = allMediaResponse.data || {};

        if (!allMedia || Object.keys(allMedia).length === 0) {
            const emptyResult = {
                success: true,
                data: [],
                pagination: {
                    totalItems: 0,
                    currentPage: 1,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
            await saveCacheData('gallery', params, emptyResult);
            return emptyResult;
        }

        // Convert object to array and filter by search if provided
        let mediaArray = Object.entries(allMedia).map(([key, value]) => ({
            ...value,
            key,
            id: value.id || value._id || key
        }));

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            mediaArray = mediaArray.filter(
                (item) => item.alt?.toLowerCase().includes(searchLower) || item.url?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by creation date or featured status
        mediaArray.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;

            const aDate = new Date(a.createdAt || a.id);
            const bDate = new Date(b.createdAt || b.id);
            return bDate - aDate;
        });

        // Calculate pagination
        const totalItems = mediaArray.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedMedia = mediaArray.slice(startIndex, endIndex);

        const result = {
            success: true,
            data: paginatedMedia,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };

        // Cache the result
        await saveCacheData('gallery', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching gallery media:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch gallery media',
            data: [],
            pagination: {
                totalItems: 0,
                currentPage: 1,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }
}

/**
 * Create a new gallery media item utility function
 * @param {Object} mediaData - Gallery media data to create
 * @returns {Promise<Object>} Created gallery media data
 */
export async function createGalleryMedia(mediaData) {
    try {
        const mediaWithTimestamp = {
            ...mediaData,
            id: mediaData.id || generateUID('MEDIA'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            featured: mediaData.featured || false
        };

        const result = await createWithCacheClear(mediaWithTimestamp, 'gallery', ['media']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create gallery media' };
        }
    } catch (error) {
        console.error('Error creating gallery media:', error);
        return { success: false, error: error.message || 'Failed to create gallery media' };
    }
}

/**
 * Update a gallery media item utility function
 * @param {string} mediaId - ID of the media item to update
 * @param {Object} mediaData - Media data to update
 * @returns {Promise<Object>} Updated media data
 */
export async function updateGalleryMedia(mediaId, mediaData) {
    try {
        const updateData = {
            ...mediaData,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(mediaId, updateData, 'gallery', ['media']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update gallery media' };
        }
    } catch (error) {
        console.error('Error updating gallery media:', error);
        return { success: false, error: error.message || 'Failed to update gallery media' };
    }
}

/**
 * Delete a gallery media item utility function
 * @param {string} mediaId - ID of the media item to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteGalleryMedia(mediaId) {
    try {
        // First, retrieve the media item to get the file path/URL
        const mediaResult = await DBService.read(mediaId, 'gallery');
        
        if (mediaResult?.success && mediaResult.data) {
            const mediaItem = mediaResult.data;
            
            // Delete file from storage (blob/s3) if URL or path exists
            if (mediaItem.url || mediaItem.uploadPath) {
                try {
                    const filePath = mediaItem.uploadPath || mediaItem.url;
                    const deleteFileResult = await DBService.deleteFile(filePath);
                    
                    if (!deleteFileResult?.success) {
                        console.warn(`Warning: Failed to delete file from storage: ${deleteFileResult?.message || 'Unknown error'}`);
                        // Continue with database deletion even if file deletion fails
                    }
                } catch (fileError) {
                    console.error('Error deleting file from storage:', fileError);
                    // Continue with database deletion even if file deletion fails
                }
            }
        }

        // Delete the database record
        const result = await deleteWithCacheClear(mediaId, 'gallery', ['media']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to delete gallery media' };
        }
    } catch (error) {
        console.error('Error deleting gallery media:', error);
        return { success: false, error: error.message || 'Failed to delete gallery media' };
    }
}
