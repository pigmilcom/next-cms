// @/lib/server/store.js

'use server';

import DBService from '@/data/rest.db.js';
import { getAllOrders } from '@/lib/server/orders.js';
import { getSettings } from '@/lib/server/settings.js';
import { getUser } from '@/lib/server/users.js';
import { generateUID } from '@/lib/shared/helpers.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

const { loadCacheData, saveCacheData } = await initCache('store');

// Cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// STORE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get all store items
 * Server-side function to fetch all store products/services
 * @param {Object} params - Query parameters
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (optional, default: 10)
 * @param {String} params.search - Search query (optional)
 * @param {String} params.item - Item ID / Slug to filter (optional)
 * @param {String} params.category - Category ID to filter (optional)
 * @param {String} params.type - Item type to filter: 'physical', 'service', 'digital' (optional, empty = all types)
 * @param {Boolean} params.fetchReviews - Get product reviews in data (optional) default: true
 * @param {Boolean} params.activeOnly - Filter active items only (optional) default: true
 * @param {Boolean} params.featured - Filter featured items only (optional) dsefault: false
 * @param {Boolean} params.deals - Filter deals items only (optional) default: false
 * @param {Boolean} params.hasStock - Filter items with stock only (optional) default: false
 * @returns {Promise<Object>} Catalog data with pagination info
 */
export const getCatalog = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('catalog', params);
        if (cachedData) return cachedData;

        // Get store settings for currency defaults
        const { storeSettings } = await getSettings();
        const defaultCurrency = storeSettings?.currency || 'EUR';

        const {
            page = 1,
            search = '',
            item = '',
            category = '',
            type = '',
            fetchReviews = true,
            activeOnly = true,
            featured = false,
            deals = false,
            hasStock = false
        } = params;
        const limit = 'limit' in params ? params.limit : 10;
        const catalogResponse = await DBService.readAll('catalog');

        if (!catalogResponse?.success || !catalogResponse.data || Object.keys(catalogResponse.data).length === 0) {
            return {
                success: true,
                data: [],
                pagination: { totalItems: 0, currentPage: 1, totalPages: 0, hasNext: false, hasPrev: false }
            };
        }

        const allCatalog = catalogResponse.data;
        let catalogArray = Array.isArray(allCatalog)
            ? allCatalog
            : Object.entries(allCatalog).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Filter active items only if activeOnly is true
        if (activeOnly) {
            catalogArray = catalogArray.filter((p) => p.isActive);
        }

        // Filter featured items only if featured is true
        if (featured) {
            catalogArray = catalogArray.filter((p) => p.isFeatured === true);
        }

        // Filter by specific item ID / Slug if provided
        if (item) {
            catalogArray = catalogArray.filter((p) => p.id === item || p.slug === item);
        }

        // Filter discounted items only if deals is true
        if (deals) {
            catalogArray = catalogArray.filter((p) => p.discountAmount > 0);
        }

        // Filter items with stock only if hasStock is true
        if (hasStock) {
            catalogArray = catalogArray.filter((p) => p.stock !== 0);
        }

        // Search & category filter
        let filteredCatalog = catalogArray;
        if (search?.trim()) {
            const searchLower = search.toLowerCase().trim();
            filteredCatalog = catalogArray.filter((product) => {
                // Search in name, description, and SKU
                const nameMatch = product.name?.toLowerCase().includes(searchLower) || false;
                const descMatch = product.description?.toLowerCase().includes(searchLower) || false;
                const skuMatch = product.sku?.toLowerCase().includes(searchLower) || false;

                // Search in multi-language fields
                const nameMLMatch = product.nameML
                    ? Object.values(product.nameML).some((name) => name?.toLowerCase().includes(searchLower))
                    : false;
                const descMLMatch = product.descriptionML
                    ? Object.values(product.descriptionML).some((desc) => desc?.toLowerCase().includes(searchLower))
                    : false;

                return nameMatch || descMatch || skuMatch || nameMLMatch || descMLMatch;
            });
        }

        // Apply category filter
        if (category) {
            filteredCatalog = filteredCatalog.filter((product) => product.categoryId === category);
        }

        // Apply type filter
        if (type && ['physical', 'service', 'digital'].includes(type)) {
            filteredCatalog = filteredCatalog.filter((product) => product.type === type);
        }

        // Sort by newest first
        filteredCatalog.sort((a, b) => new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id));

        // Pagination
        const totalItems = filteredCatalog.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedCatalog = limit > 0 ? filteredCatalog.slice(startIndex, endIndex) : filteredCatalog;

        // Helper: number parsing only
        const parseNumber = (n) => parseFloat(n || 0);

        // Reviews
        const reviewCounts = {};
        const reviewRatings = {};
        const reviewsData = {};

        if (fetchReviews) {
            await Promise.all(
                paginatedCatalog.map(async (product) => {
                    try {
                        // Fetch full review data using getReviews function
                        const reviewsResponse = await getReviews({
                            productId: product.id,
                            limit: 0,
                            approvedOnly: true
                        });
                        if (reviewsResponse?.success && reviewsResponse.data) {
                            const reviews = reviewsResponse.data;
                            const totalRating = reviews.reduce(
                                (sum, review) => sum + (parseFloat(review.rating) || 0),
                                0
                            );
                            reviewCounts[product.id] = reviews.length;
                            reviewRatings[product.id] = totalRating / reviews.length;
                            reviewsData[product.id] = reviews;
                        } else {
                            reviewCounts[product.id] = 0;
                            reviewRatings[product.id] = 0;
                            reviewsData[product.id] = [];
                        }
                    } catch {
                        reviewCounts[product.id] = 0;
                        reviewRatings[product.id] = 0;
                        reviewsData[product.id] = [];
                    }
                })
            );
        }

        // Fetch all collections for reference
        const collectionsResponse = await getCollections({ limit: 0 });
        const allCollections = collectionsResponse?.success ? collectionsResponse.data : [];

        // Fetch all categories once for mapping category IDs to category objects
        const categoriesResponse = await getCategories({ limit: 0 });
        const allCategories = categoriesResponse?.success ? categoriesResponse.data : [];

        // Process products/services - simplified since calculations are done at creation time
        const processedCatalog = paginatedCatalog.map((product) => {
            // Use stored prices directly (already calculated at creation time)
            const compareAtPrice = parseNumber(product.compareAtPrice || product.price);
            const price = parseNumber(product.price);
            const discountPercentage = parseNumber(product.discount || 0);

            // Handle collections - map product collection IDs/objects to complete collection data
            const productCollections = Array.isArray(product.collections) && product.collections.length > 0 ? product.collections : [];
            const collections = productCollections
                .map((collection) => {
                    // If it's already a complete object with all data, use it
                    if (collection && typeof collection === 'object' && collection.color !== undefined) {
                        return collection;
                    }
                    // Otherwise, find the complete collection data from allCollections
                    const collectionId = collection?.id || collection;
                    const fullCollection = allCollections.find((c) => c.id === collectionId || c.key === collectionId);
                    return fullCollection || null;
                })
                .filter(Boolean); // Remove null entries

            // Map category IDs to objects with id, name, and slug
            const categoryIds = Array.isArray(product.categoryId) ? product.categoryId : product.categoryId ? [product.categoryId] : [];
            const categories = categoryIds
                .map((categoryId) => {
                    const category = allCategories.find((c) => c.id === categoryId);
                    return category ? { id: category.id, name: category.name, slug: category.slug } : null;
                })
                .filter(Boolean); // Remove null entries

            // Calculate if product is new (created within last 30 days)
            const isNew = product.createdAt ? (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24) <= 30 : false;

            // Return processed product with pre-calculated values and reviews
            return {
                ...product, // Keep all existing fields (calculations already done at creation)
                price: parseFloat(price).toFixed(2),
                compareAtPrice: parseFloat(compareAtPrice).toFixed(2),
                discount: discountPercentage,
                currency: product.currency || defaultCurrency,
                gallery: product.images || [],
                image: product.images?.[product.coverImageIndex || 0]?.url || '',
                category: product.categoryId || '',
                categories,
                collections,
                attributes: product.customAttributes || [],
                isActive: product.isActive === true,
                isFeatured: product.isFeatured === true,
                isNew,
                bestof: product.bestof === true,
                rating: reviewRatings[product.id] || parseFloat(product.rating || 0),
                reviewCount: reviewCounts[product.id] || 0,
                ...(fetchReviews && { reviews: reviewsData[product.id] || [] }),
                seo: product.seo || {
                    metaTitle: '',
                    metaTitleML: {},
                    metaDescription: '',
                    metaDescriptionML: {},
                    metaKeywords: '',
                    metaKeywordsML: {},
                    ogImage: ''
                }
            };
        });

        const result = {
            success: true,
            data: processedCatalog,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        await saveCacheData('catalog', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching catalog:', error);
        return {
            success: false,
            error: 'Failed to fetch catalog',
            message: error.message,
            data: [],
            pagination: { totalItems: 0, currentPage: 1, totalPages: 0, hasNext: false, hasPrev: false }
        };
    }
};

/**
 * Get all collections
 * Server-side function to fetch all collections
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search query
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Collections data with pagination
 */
export const getCollections = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('collections', params);
        if (cachedData) return cachedData;

        const { page = 1, search = '' } = params;
        const limit = 'limit' in params ? params.limit : 10;

        const collectionsResponse = await DBService.readAll('collections');
        if (!collectionsResponse?.success) {
            return {
                success: false,
                error: 'Failed to fetch collections',
                data: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: 10,
                    hasNextPage: false,
                    hasPrevPage: false
                }
            };
        }

        const collections = collectionsResponse.data || {};
        const collectionsArray = Array.isArray(collections)
            ? collections
            : Object.entries(collections).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Apply search filter
        let filteredCollections = collectionsArray;
        if (search?.trim()) {
            const searchLower = search.toLowerCase().trim();
            filteredCollections = collectionsArray.filter((collection) => {
                // Search in name, slug, and description
                const nameMatch = collection.name?.toLowerCase().includes(searchLower) || false;
                const slugMatch = collection.slug?.toLowerCase().includes(searchLower) || false;
                const descMatch = collection.description?.toLowerCase().includes(searchLower) || false;

                // Search in multi-language fields
                const nameMLMatch = collection.nameML
                    ? Object.values(collection.nameML).some((name) => name?.toLowerCase().includes(searchLower))
                    : false;
                const descMLMatch = collection.descriptionML
                    ? Object.values(collection.descriptionML).some((desc) => desc?.toLowerCase().includes(searchLower))
                    : false;

                return nameMatch || slugMatch || descMatch || nameMLMatch || descMLMatch;
            });
        }

        // Sort by creation date (newest first)
        filteredCollections.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        // Calculate pagination
        const totalItems = filteredCollections.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedCollections = limit > 0 ? filteredCollections.slice(startIndex, endIndex) : filteredCollections;

        const result = {
            success: true,
            data: paginatedCollections,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('collections', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching collections:', error);
        return {
            success: false,
            error: 'Failed to fetch collections',
            message: error.message,
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
};

/**
 * Get all categories
 * Server-side function to fetch all categories
 * @param {Object} params - Query parameters
 * @param {number} params.activeOnly - Page number (default: 1)
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 50)
 * @param {string} params.search - Search query
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Categories data with pagination
 */
export const getCategories = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('categories', params);
        if (cachedData) return cachedData;

        const { page = 1, search = '', activeOnly = false } = params;
        const limit = 'limit' in params ? params.limit : 10;

        const categoriesResponse = await DBService.readAll('categories');

        if (!categoriesResponse?.success) {
            return {
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
        }

        const categories = categoriesResponse.data || {};
        let categoriesArray = Array.isArray(categories)
            ? categories
            : Object.entries(categories).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key,
                  image: value.imageUrl || '',
                  // Ensure title field is properly handled
                  title: value.title || value.titleML?.[Object.keys(value.titleML || {})[0]] || ''
              }));

        // Filter active categories if activeOnly is true
        if (activeOnly) {
            categoriesArray = categoriesArray.filter((category) => category.isActive === true);
        }

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            categoriesArray = categoriesArray.filter(
                (category) =>
                    category.name?.toLowerCase().includes(searchLower) ||
                    category.title?.toLowerCase().includes(searchLower) ||
                    category.description?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by order (ascending)
        categoriesArray.sort((a, b) => {
            const aOrder = a.order || 0;
            const bOrder = b.order || 0;
            return aOrder - bOrder;
        });

        // Calculate pagination
        const totalItems = categoriesArray.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedCategories = limit > 0 ? categoriesArray.slice(startIndex, endIndex) : categoriesArray;

        const result = {
            success: true,
            data: paginatedCategories,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('categories', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching categories:', error);
        return {
            success: false,
            error: 'Failed to fetch categories',
            message: error.message,
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
};

/**
 * Get all attributes
 * Server-side function to fetch product attributes with pagination support
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search query (optional)
 * @param {Boolean} params.activeOnly - Filter active attributes only (default: true)
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Attributes data with pagination info
 */
export const getAttributes = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('attributes', params);
        if (cachedData) return cachedData;

        const { page = 1, search = '', activeOnly = true } = params;
        const limit = 'limit' in params ? params.limit : 10;

        const attributesResponse = await DBService.readAll('attributes');

        if (
            !attributesResponse?.success ||
            !attributesResponse.data ||
            Object.keys(attributesResponse.data).length === 0
        ) {
            return {
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
        }

        const allAttributes = attributesResponse.data;
        // Convert object to array
        const attributesArray = Array.isArray(allAttributes)
            ? allAttributes
            : Object.entries(allAttributes).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Filter active attributes if activeOnly is true
        let filteredAttributes = attributesArray;
        if (activeOnly) {
            filteredAttributes = attributesArray.filter((attr) => attr.isActive === true);
        }

        // Apply search filter
        if (search?.trim()) {
            const searchLower = search.toLowerCase();
            filteredAttributes = filteredAttributes.filter(
                (attr) =>
                    attr.name?.toLowerCase().includes(searchLower) ||
                    attr.slug?.toLowerCase().includes(searchLower) ||
                    attr.description?.toLowerCase().includes(searchLower) ||
                    attr.type?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by creation date (newest first)
        filteredAttributes.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        // Calculate pagination
        const totalItems = filteredAttributes.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedAttributes = limit > 0 ? filteredAttributes.slice(startIndex, endIndex) : filteredAttributes;

        // Process attributes
        const processedAttributes = paginatedAttributes.map((attr) => ({
            ...attr,
            name: attr.name || '',
            slug: attr.slug || '',
            type: attr.type || 'text',
            options: attr.options || [],
            isRequired: attr.isRequired === true
        }));

        const result = {
            success: true,
            data: processedAttributes,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('attributes', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching attributes:', error);
        return {
            success: false,
            error: 'Failed to fetch attributes',
            message: error.message,
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
};

/**
 * Get all reviews
 * Server-side function to fetch product reviews with pagination support
 * @param {Object} params - Query parameters
 * @param {string} params.userId - Optional user ID to filter reviews
 * @param {string} params.productId - Optional product ID to filter reviews
 * @param {string} params.search - Search query (optional)
 * @param {string} params.status - Filter by status: 'approved', 'pending', 'rejected' (optional)
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {Boolean} params.approvedOnly - Filter approved reviews only (default: true)
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Reviews data with pagination info
 */
export const getReviews = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('reviews', params);
        if (cachedData) return cachedData;

        const { page = 1, productId = '', userId = '', search = '', status = '', approvedOnly = true } = params;
        const limit = 'limit' in params ? params.limit : 10;

        const reviewsResponse = await DBService.readAll('reviews');

        if (!reviewsResponse?.success || !reviewsResponse.data || Object.keys(reviewsResponse.data).length === 0) {
            return {
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
        }

        const data = reviewsResponse.data;
        const allReviews = Object.entries(data).map(([key, review]) => ({
            ...review,
            key,
            id: review.id || review._id || key
        }));

        // Filter by userId if provided
        let filteredReviews = allReviews;

        if (userId) {
            const userIdLower = userId.toLowerCase();
            filteredReviews = filteredReviews.filter((review) => {
                const createdByMatch = review.createdBy?.toLowerCase() === userIdLower;
                const customerEmailMatch = review.customerEmail?.toLowerCase() === userIdLower;
                const userEmailMatch = review.userEmail?.toLowerCase() === userIdLower;
                return createdByMatch || customerEmailMatch || userEmailMatch;
            });
        }

        if (productId) {
            filteredReviews = filteredReviews.filter((review) => review.productId === productId);
        }

        // Filter by status if provided
        if (status) {
            filteredReviews = filteredReviews.filter((review) => review.status === status);
        }

        // Search filtering
        if (search?.trim()) {
            const searchLower = search.toLowerCase();
            filteredReviews = filteredReviews.filter(
                (review) =>
                    review.productName?.toLowerCase().includes(searchLower) ||
                    review.customerName?.toLowerCase().includes(searchLower) ||
                    review.customerEmail?.toLowerCase().includes(searchLower) ||
                    review.comment?.toLowerCase().includes(searchLower)
            );
        }

        // Filter approved reviews if approvedOnly is true
        if (approvedOnly) {
            filteredReviews = filteredReviews.filter((review) => review.status === 'approved');
        }

        // Sort by creation date (newest first)
        filteredReviews.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        // Calculate pagination
        const totalItems = filteredReviews.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedReviews = limit > 0 ? filteredReviews.slice(startIndex, endIndex) : filteredReviews;

        // Process reviews
        const processedReviews = paginatedReviews.map((review) => ({
            ...review,
            productId: review.productId,
            productName: review.productName,
            customerName: review.customerName || 'Anonymous',
            customerEmail: review.customerEmail,
            rating: Number(review.rating) || 5,
            comment: review.comment || '',
            approved: review.status === 'approved',
            status: review.status,
            isAnonymous: review.isAnonymous || false,
            createdAt: review.createdAt,
            createdBy: review.createdBy,
            updatedAt: review.updatedAt
        }));

        const result = {
            success: true,
            data: processedReviews,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('reviews', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return {
            success: false,
            error: 'Failed to fetch reviews',
            message: error.message,
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
};

/**
 * Get all testimonials
 * Server-side function to fetch testimonials with pagination support
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search query (optional)
 * @param {Boolean} params.activeOnly - Filter active testimonials only (default: true)
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Testimonials data with pagination info
 */
export const getTestimonials = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('testimonials', params);
        if (cachedData) return cachedData;

        const { page = 1, search = '', activeOnly = true } = params;
        const limit = 'limit' in params ? params.limit : 10;

        const testimonialsResponse = await DBService.readAll('testimonials');

        if (
            !testimonialsResponse?.success ||
            !testimonialsResponse.data ||
            Object.keys(testimonialsResponse.data).length === 0
        ) {
            return {
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
        }

        const allTestimonials = testimonialsResponse.data;
        // Convert object to array
        const testimonialsArray = Array.isArray(allTestimonials)
            ? allTestimonials
            : Object.entries(allTestimonials).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Filter active testimonials if activeOnly is true
        let filteredTestimonials = testimonialsArray;
        if (activeOnly) {
            filteredTestimonials = testimonialsArray.filter((testimonial) => testimonial.isActive === true);
        }

        // Search filtering
        if (search?.trim()) {
            const searchLower = search.toLowerCase();
            filteredTestimonials = filteredTestimonials.filter(
                (testimonial) =>
                    testimonial.name?.toLowerCase().includes(searchLower) ||
                    testimonial.location?.toLowerCase().includes(searchLower) ||
                    testimonial.quote?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by creation date (newest first)
        filteredTestimonials.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        // Calculate pagination
        const totalItems = filteredTestimonials.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedTestimonials =
            limit > 0 ? filteredTestimonials.slice(startIndex, endIndex) : filteredTestimonials;

        const result = {
            success: true,
            data: paginatedTestimonials,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('testimonials', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        return {
            success: false,
            error: 'Failed to fetch testimonials',
            message: error.message,
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
};

function normalizeCouponCode(code) {
    return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

async function getCouponUsageCounts(coupons = []) {
    try {
        const couponCodes = new Set(coupons.map((coupon) => normalizeCouponCode(coupon?.code)).filter(Boolean));
        const ordersResult = await getAllOrders({ limit: 0 });

        if (!ordersResult?.success || !Array.isArray(ordersResult.data) || ordersResult.data.length === 0) {
            return {};
        }

        const usageCounts = {};

        ordersResult.data.forEach((order) => {
            const normalizedOrderCouponCode = normalizeCouponCode(order?.couponCode);

            if (!normalizedOrderCouponCode || !couponCodes.has(normalizedOrderCouponCode)) {
                return;
            }

            usageCounts[normalizedOrderCouponCode] = (usageCounts[normalizedOrderCouponCode] || 0) + 1;
        });

        return usageCounts;
    } catch (error) {
        console.warn('Failed to derive coupon usage counts from orders:', error);
        return {};
    }
}

/**
 * Get all coupons
 * Server-side function to fetch coupons with pagination support
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search query (optional)
 * @param {string} params.filterType - Filter by coupon type: 'percentage', 'fixed' (optional)
 * @param {string} params.filterStatus - Filter by status: 'active', 'inactive', 'expired' (optional)
 * @param {string} params.code - Filter coupons by code or ID (optional)
 * @param {string} params.userId - Filter coupons by user ID / Email (optional)
 * @param {Boolean} params.activeOnly - Filter active coupons only (default: true)
 * @param {Boolean} params.validOnly - Filter coupons within valid date range (default: true)
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Coupons data with pagination info
 */
export const getCoupons = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('coupons', params);
        if (cachedData) return cachedData;

        const {
            page = 1,
            search = '',
            filterType = 'all',
            filterStatus = 'all',
            filterSource = 'all',
            activeOnly = true,
            code = null,
            userId = null,
            validOnly = false
        } = params;
        const limit = 'limit' in params ? params.limit : 10;

        const couponsResponse = await DBService.readAll('coupons');

        if (!couponsResponse?.success || !couponsResponse.data || Object.keys(couponsResponse.data).length === 0) {
            return {
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
        }

        const allCoupons = couponsResponse.data;
        const now = new Date();

        // Convert object to array
        const couponsArray = Array.isArray(allCoupons)
            ? allCoupons
            : Object.entries(allCoupons).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        let filteredCoupons = couponsArray;

        // Apply search filter
        if (search?.trim()) {
            const searchLower = search.toLowerCase();
            filteredCoupons = filteredCoupons.filter(
                (coupon) =>
                    coupon.code?.toLowerCase().includes(searchLower) ||
                    coupon.name?.toLowerCase().includes(searchLower) ||
                    coupon.description?.toLowerCase().includes(searchLower)
            );
        }

        // Filter by coupon type
        if (filterType && filterType !== 'all') {
            filteredCoupons = filteredCoupons.filter((coupon) => coupon.type === filterType);
        }

        // Filter by coupon source (club vs system)
        if (filterSource && filterSource !== 'all') {
            if (filterSource === 'club') {
                filteredCoupons = filteredCoupons.filter((coupon) => coupon.isClubVoucher === true);
            } else if (filterSource === 'system') {
                filteredCoupons = filteredCoupons.filter((coupon) => coupon.isClubVoucher !== true);
            }
        }

        // Filter by status
        if (filterStatus && filterStatus !== 'all') {
            const now = new Date();
            filteredCoupons = filteredCoupons.filter((coupon) => {
                const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
                const isExpired = expiresAt && now > expiresAt;

                if (filterStatus === 'active') {
                    return coupon.isActive === true && !isExpired;
                } else if (filterStatus === 'inactive') {
                    return coupon.isActive === false;
                } else if (filterStatus === 'expired') {
                    return isExpired;
                }
                return true;
            });
        }

        // Filter coupons by code or Id if provided
        if (code) {
            filteredCoupons = filteredCoupons.filter((coupon) => {
                const getById = coupon.id === code;
                const getByCode = coupon.code === code;
                return getById || getByCode;
            });
        }

        // Filter coupons for user email if userId is provided
        if (userId) {
            filteredCoupons = filteredCoupons.filter((coupon) => coupon.targetEmail === userId);
        }

        // Filter active coupons if activeOnly is true
        if (activeOnly) {
            filteredCoupons = filteredCoupons.filter((coupon) => coupon.isActive === true);
        }

        // Filter by valid date range if validOnly is true
        let isValidCoupon = true;
        if (validOnly) {
            filteredCoupons = filteredCoupons.filter((coupon) => {
                const startDate = coupon.startDate ? new Date(coupon.startDate) : null;
                const endDate = coupon.endDate ? new Date(coupon.endDate) : null;

                if (startDate && now < startDate) {
                    isValidCoupon = false;
                    return false;
                }
                if (endDate && now > endDate) {
                    isValidCoupon = false;
                    return false;
                }

                return true;
            });
        }

        // Sort by creation date (newest first)
        filteredCoupons.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        const usageCounts = await getCouponUsageCounts(filteredCoupons);

        // Process coupons
        const processedCoupons = filteredCoupons.map((coupon) => ({
            ...coupon,
            code: normalizeCouponCode(coupon.code) || coupon.code,
            usedCount:
                usageCounts[normalizeCouponCode(coupon.code)] !== undefined
                    ? usageCounts[normalizeCouponCode(coupon.code)]
                    : Number(coupon.usedCount || 0),
            usageLimit:
                coupon.usageType === 'single'
                    ? 1
                    : coupon.usageType === 'unlimited'
                      ? null
                      : coupon.usageLimit != null
                        ? Number(coupon.usageLimit)
                        : null,
            isValid: isValidCoupon
        }));

        // Calculate pagination
        const totalItems = processedCoupons.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedCoupons = limit > 0 ? processedCoupons.slice(startIndex, endIndex) : processedCoupons;

        const result = {
            success: true,
            data: paginatedCoupons,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('coupons', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching coupons:', error);
        return {
            success: false,
            error: 'Failed to fetch coupons',
            message: error.message,
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
};

/**
 * Validate a coupon code for checkout
 * @param {string} code - Coupon code to validate
 * @param {number} orderAmount - Total order amount before discount
 * @param {string} customerEmail - Customer email for specific coupon validation (optional)
 * @returns {Promise<Object>} Validation result with coupon data and discount
 */
export const validateCoupon = async (code, orderAmount, customerEmail = null) => {
    try {
        // Validate input
        if (!code || typeof code !== 'string') {
            return {
                success: false,
                valid: false,
                message: 'Coupon code is required'
            };
        }

        if (!orderAmount || typeof orderAmount !== 'number' || orderAmount < 0) {
            return {
                success: false,
                valid: false,
                message: 'Valid order amount is required'
            };
        }

        // Find coupon
        const normalizedCode = code.toUpperCase().trim();
        const couponsData = await getCoupons({ code: normalizedCode, limit: 1 });

        if (!couponsData?.success || !couponsData.data || couponsData.data.length === 0) {
            return {
                success: true,
                valid: false,
                message: 'Invalid coupon code'
            };
        }

        const coupon = couponsData.data[0];

        if (!coupon.code || coupon.code.toUpperCase().trim() !== normalizedCode) {
            return {
                success: true,
                valid: false,
                message: 'Invalid coupon code'
            };
        }

        // Check if coupon is active
        if (!coupon.isActive) {
            return {
                success: true,
                valid: false,
                message: 'This coupon is no longer active'
            };
        }

        // Check expiration - prioritize hasExpiration flag over direct expiresAt check
        if (coupon.hasExpiration && coupon.expiresAt) {
            if (new Date(coupon.expiresAt) <= new Date()) {
                return {
                    success: true,
                    valid: false,
                    message: 'This coupon has expired'
                };
            }
        } else if (!coupon.hasExpiration && coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) {
            // Fallback check for legacy coupons without hasExpiration flag
            return {
                success: true,
                valid: false,
                message: 'This coupon has expired'
            };
        }

        // Check usage limits based on usageType from initialFormData
        if (coupon.usageType === 'unlimited') {
            // No usage limit for unlimited coupons
        } else if (coupon.usageType === 'limited' && coupon.usedCount >= coupon.usageLimit) {
            return {
                success: true,
                valid: false,
                message: 'This coupon has reached its usage limit'
            };
        } else if (coupon.usageType === 'single' && coupon.usedCount >= 1) {
            return {
                success: true,
                valid: false,
                message: 'This coupon has already been used'
            };
        }

        // Check target restrictions from initialFormData (targetType: public/specific)
        if (coupon.targetType === 'specific') {
            if (!customerEmail) {
                return {
                    success: true,
                    valid: false,
                    message: 'Customer email is required for this coupon'
                };
            }

            if (coupon.targetEmail?.toLowerCase() !== customerEmail.toLowerCase()) {
                return {
                    success: true,
                    valid: false,
                    message: 'This coupon is not valid for your account'
                };
            }
        }

        // Check minimum order amount
        if (coupon.minAmount > 0 && orderAmount < coupon.minAmount) {
            return {
                success: true,
                valid: false,
                message: `Minimum order amount of €${coupon.minAmount} required for this coupon`
            };
        }

        // Check maximum order amount (if set and not unlimited)
        if (coupon.maxAmount > 0 && !coupon.isUnlimited && orderAmount > coupon.maxAmount) {
            return {
                success: true,
                valid: false,
                message: `This coupon is only valid for orders up to €${coupon.maxAmount}`
            };
        }

        // Check expiration if hasExpiration is enabled
        if (coupon.hasExpiration && coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) {
            return {
                success: true,
                valid: false,
                message: 'This coupon has expired'
            };
        }

        // Check if coupon is valid for first purchase only
        if (coupon.firstPurchaseOnly) {
            if (!customerEmail) {
                return {
                    success: true,
                    valid: false,
                    message: 'Customer email is required for first purchase validation'
                };
            }

            // Check if customer has previous orders (excluding cancelled/failed orders)
            const { getAllOrders } = await import('./orders.js');
            const previousOrders = await getAllOrders({
                userId: customerEmail,
                limit: 1,
                duration: '5M' // Cache for 5 minutes for performance
            });

            // If customer has previous successful orders, coupon is invalid
            if (previousOrders?.success && previousOrders.data && previousOrders.data.length > 0) {
                // Check for any successful order (paid or completed status)
                const successfulOrder = previousOrders.data.find(
                    (order) =>
                        order.status !== 'cancelled' && order.status !== 'failed' && order.paymentStatus !== 'failed'
                );

                if (successfulOrder) {
                    return {
                        success: true,
                        valid: false,
                        message: 'This coupon is only valid for first-time customers'
                    };
                }
            }
        }

        // Check if club voucher has been used in any non-cancelled order
        if (coupon.isClubVoucher && customerEmail) {
            const { getAllOrders } = await import('./orders.js');
            const orderHistory = await getAllOrders({
                userId: customerEmail,
                limit: 0,
                duration: '5M' // Cache for 5 minutes
            });

            if (orderHistory?.success && orderHistory.data && orderHistory.data.length > 0) {
                // Check if coupon code was used in any non-cancelled order
                const usedInOrder = orderHistory.data.find(
                    (order) =>
                        order.couponCode === normalizedCode &&
                        order.status !== 'cancelled' &&
                        order.status !== 'failed' &&
                        order.paymentStatus !== 'failed'
                );

                if (usedInOrder) {
                    return {
                        success: true,
                        valid: false,
                        message: 'This coupon has already been used'
                    };
                }
            }
        }

        // Calculate discount based on type from initialFormData (percentage/fixed/no_discount)
        let discountAmount = 0;
        if (coupon.type === 'no_discount') {
            // No discount coupon (might provide free shipping or other benefits)
            discountAmount = 0;
        } else if (coupon.type === 'percentage') {
            discountAmount = (orderAmount * coupon.value) / 100;
        } else if (coupon.type === 'fixed') {
            discountAmount = Math.min(coupon.value, orderAmount); // Don't exceed order amount
        }

        // Round to 2 decimal places
        discountAmount = Math.round(discountAmount * 100) / 100;

        return {
            success: true,
            valid: true,
            coupon,
            discount: {
                amount: discountAmount,
                type: coupon.type,
                value: coupon.value,
                freeShipping: coupon.freeShipping || false // Include free shipping flag
            },
            message:
                coupon.type === 'no_discount'
                    ? `Coupon applied!${coupon.freeShipping ? ' Free Shipping included' : ''}`
                    : `Coupon applied! You saved €${parseFloat(discountAmount).toFixed(2)}${coupon.freeShipping ? ' + Free Shipping' : ''}`
        };
    } catch (error) {
        console.error('Error validating coupon:', error);
        return {
            success: false,
            valid: false,
            message: 'Failed to validate coupon'
        };
    }
};

/**
 * Apply a coupon code (increment usage count and track usage)
 * @param {string} couponId - Coupon ID to apply
 * @param {string} orderId - Order ID for tracking
 * @param {string} customerEmail - Customer email (optional, defaults to 'anonymous')
 * @param {number} orderAmount - Total order amount
 * @param {number} discountAmount - Applied discount amount
 * @returns {Promise<Object>} Application result
 */
export const applyCoupon = async (couponId, orderId, customerEmail = 'anonymous', orderAmount, discountAmount) => {
    try {
        // Validate input
        if (!couponId || !orderId || !orderAmount || discountAmount === undefined) {
            return {
                success: false,
                error: 'Missing required fields'
            };
        }

        // Revalidate coupon before applying
        const validationResult = await validateCoupon(couponId, orderAmount, customerEmail);

        if (!validationResult?.success || !validationResult.valid) {
            return {
                success: false,
                error: validationResult?.message || 'Invalid coupon'
            };
        }

        const coupon = validationResult.coupon;
        const usageCounts = await getCouponUsageCounts([coupon]);
        const syncedUsedCount = usageCounts[normalizeCouponCode(coupon.code)] ?? Number(coupon.usedCount || 0);

        // Sync usage count from matching orders to avoid double increments.
        const updatedCoupon = {
            ...coupon,
            usedCount: syncedUsedCount,
            lastUsedAt: new Date().toISOString(),
            lastUsedBy: customerEmail || 'user',
            updatedAt: new Date().toISOString()
        };

        // Update coupon in database with automatic cache clearing
        const updated = await updateWithCacheClear(couponId, updatedCoupon, 'coupons', ['store']);

        if (!updated?.success) {
            return {
                success: false,
                error: 'Failed to update coupon usage'
            };
        }

        return {
            success: true,
            message: 'Coupon applied successfully',
            data: {
                couponId: coupon.id,
                code: coupon.code,
                usedCount: updatedCoupon.usedCount,
                discountAmount: discountAmount
            }
        };
    } catch (error) {
        console.error('Error applying coupon:', error);
        return {
            success: false,
            error: 'Failed to apply coupon'
        };
    }
};

/**
 * Increment coupon usage count for completed orders
 * Server-side function to increment coupon usage when order is marked as complete
 * @param {string} couponCode - Coupon code to increment
 * @param {string} orderId - Order ID for tracking
 * @param {string} customerEmail - Customer email (optional, defaults to 'anonymous')
 * @returns {Promise<{success: boolean, data?: Object, error?: string, message?: string}>} Result with success status
 */
export const incrementCouponUsage = async (couponCode, orderId, customerEmail = 'anonymous') => {
    try {
        if (!couponCode || !orderId) {
            return {
                success: false,
                error: 'Coupon code and order ID are required'
            };
        }

        // Get the coupon by code
        const couponsResult = await getCoupons({ code: couponCode, limit: 0, activeOnly: false });
        if (!couponsResult?.success || !couponsResult.data || couponsResult.data.length === 0) {
            return {
                success: false,
                error: 'Coupon not found'
            };
        }

        const coupon = couponsResult.data[0];
        const usageCounts = await getCouponUsageCounts([coupon]);
        const syncedUsedCount = usageCounts[normalizeCouponCode(coupon.code)] ?? Number(coupon.usedCount || 0);

        // Sync usage count from all matching orders.
        const updatedCoupon = {
            ...coupon,
            usedCount: syncedUsedCount,
            lastUsedAt: new Date().toISOString(),
            lastUsedBy: customerEmail || 'user',
            updatedAt: new Date().toISOString()
        };

        // Update coupon in database with automatic cache clearing
        const updated = await updateWithCacheClear(coupon.id || coupon.key, updatedCoupon, 'coupons', ['store']);

        if (!updated?.success) {
            return {
                success: false,
                error: 'Failed to update coupon usage'
            };
        }

        return {
            success: true,
            message: 'Coupon usage incremented successfully',
            data: {
                couponId: coupon.id,
                code: coupon.code,
                usedCount: updatedCoupon.usedCount
            }
        };
    } catch (error) {
        console.error('Error incrementing coupon usage:', error);
        return {
            success: false,
            error: 'Failed to increment coupon usage'
        };
    }
};

/**
 * Get all favorites
 * Server-side function to fetch user favorites with pagination support
 * @param {Object} params - Query parameters
 * @param {string} params.userId - Optional user ID to filter favorites
 * @param {string} params.productId - Optional product ID to filter favorites
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Favorites data with pagination info
 */
export const getFavorites = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('favorites', params);
        if (cachedData) return cachedData;

        const { page = 1, limit = 10, userId = '', productId = '' } = params;

        const favoritesResponse = await DBService.readAll('favorites');

        if (
            !favoritesResponse?.success ||
            !favoritesResponse.data ||
            Object.keys(favoritesResponse.data).length === 0
        ) {
            return {
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
        }

        const allFavorites = favoritesResponse.data;
        // Convert object to array
        const favoritesArray = Array.isArray(allFavorites)
            ? allFavorites
            : Object.entries(allFavorites).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Filter by userId if provided
        let filteredFavorites = favoritesArray;
        if (userId) {
            const userIdLower = userId.toLowerCase();
            filteredFavorites = filteredFavorites.filter((fav) => {
                const userIdMatch = fav.userId?.toLowerCase() === userIdLower;
                const userEmailMatch = fav.userEmail?.toLowerCase() === userIdLower;
                return userIdMatch || userEmailMatch;
            });
        }

        // Filter by productId if provided
        if (productId) {
            filteredFavorites = filteredFavorites.filter(
                (fav) => fav.productId?.toLowerCase() === productId.toLowerCase()
            );
        }

        // Sort by creation date (newest first)
        filteredFavorites.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        // Calculate pagination
        const totalItems = filteredFavorites.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedFavorites = limit > 0 ? filteredFavorites.slice(startIndex, endIndex) : filteredFavorites;

        // Process favorites - return basic data
        const processedFavorites = paginatedFavorites.map((fav) => ({
            ...fav,
            productId: fav.productId,
            userId: fav.userId,
            createdAt: fav.createdAt
        }));

        const result = {
            success: true,
            data: processedFavorites,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('favorites', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return {
            success: false,
            error: 'Failed to fetch favorites',
            message: error.message,
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
};

/**
 * Add product to watchlist
 * Server-side function to add a product to user's favorites/watchlist
 * @param {string} userId - User ID or email
 * @param {string} productId - Product ID
 * @param {string} productName - Product name
 * @returns {Promise<{success: boolean, data?: Object, error?: string, message?: string}>} Result with success status
 */
export const addToWatchlist = async (userId, productId, productName) => {
    try {
        if (!userId || !productId) {
            return {
                success: false,
                error: 'User ID and product ID are required'
            };
        }

        // Check if already in favorites using getFavorites
        const existingFavorites = await getFavorites({ userId, productId, limit: 1, next: { revalidate: 0 } });
        if (existingFavorites?.success && existingFavorites.data?.length > 0) {
            return {
                success: true,
                message: 'Product is already in your favorites'
            };
        }

        // Create new favorite
        const favoriteData = {
            id: generateUID('FAV'),
            userId,
            productId,
            productName: productName || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await createWithCacheClear(favoriteData, 'favorites', ['store'], ['favorites']);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to add to favorites',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            data: result.data,
            message: 'Product added to favorites'
        };
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        return {
            success: false,
            error: 'Failed to add to favorites',
            message: error.message
        };
    }
};

/**
 * Remove product from watchlist
 * Server-side function to remove a product from user's favorites/watchlist
 * @param {string} userId - User ID or email
 * @param {string} productId - Product ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string, message?: string}>} Result with success status
 */
export const removeFromWatchlist = async (userId, productId) => {
    try {
        if (!userId || !productId) {
            return {
                success: false,
                error: 'User ID and product ID are required'
            };
        }

        // Find the favorite using getFavorites
        const existingFavorites = await getFavorites({ userId, productId, limit: 1, next: { revalidate: 0 } });

        if (!existingFavorites?.success || !existingFavorites.data || existingFavorites.data.length === 0) {
            return {
                success: false,
                error: 'Favorite not found',
                message: 'Product is not in your favorites'
            };
        }

        // Get the favorite key/id to delete
        const favoriteToDelete = existingFavorites.data[0];
        const favoriteId = favoriteToDelete.key || favoriteToDelete.id;

        if (!favoriteId) {
            return {
                success: false,
                error: 'Invalid favorite ID',
                message: 'Could not identify favorite to remove'
            };
        }

        const result = await deleteWithCacheClear(favoriteId, 'favorites', ['store'], ['favorites']);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to remove from favorites',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            data: result.data,
            message: 'Product removed from favorites'
        };
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        return {
            success: false,
            error: 'Failed to remove from favorites',
            message: error.message
        };
    }
};

/**
 * Submit a review
 * @param {Object} reviewData - Review data to submit
 * @returns {Promise<{success: boolean, error?: string}>} Result with success status
 */
export const submitReview = async (reviewData) => {
    try {
        const {
            productId,
            productName,
            rating,
            comment,
            userEmail,
            userName,
            createdBy,
            isAnonymous = false,
            status = 'pending'
        } = reviewData;

        if (!productId) {
            return { success: false, error: 'Product ID is required' };
        }

        // Generate unique review ID
        const reviewId = generateUID('REV');

        // Create review with consistent data structure (matches admin-created reviews)
        const review = {
            id: reviewId,
            productId,
            productName,
            customerName: isAnonymous ? 'Anonymous' : userName || 'Anonymous',
            customerEmail: userEmail,
            rating: parseInt(rating, 10),
            comment: comment || '',
            status: status, // 'pending' by default
            isAnonymous: isAnonymous,
            createdBy: createdBy || userEmail || 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await createWithCacheClear(review, 'reviews', ['store'], ['reviews']);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to submit review',
                message: result?.message || 'Database operation failed'
            };
        }
        return {
            success: true,
            data: result,
            message: 'Review submitted successfully'
        };
    } catch (error) {
        console.error('Error submitting review:', error);
        return { success: false, error: 'Network error' };
    }
};

/**
 * Delete a user's own review (with authentication)
 * Server-side function to delete a user's review with full authentication and authorization
 * @param {string} reviewId - ID of the review to delete
 * @param {string} userId - ID/email of the user requesting deletion (optional, will use session if not provided)
 * @returns {Promise<{success: boolean, data?: Object, error?: string, message?: string}>} Result with success status
 */
export const deleteUserReview = async (reviewId, userId = null) => {
    try {
        // Check authentication first
        const { auth } = await import('@/auth.js');
        const session = await auth();

        if (!userId) {
            return {
                success: false,
                error: 'Authentication required. Please log in to delete reviews.'
            };
        }

        const sessionUser = session.user;

        if (!reviewId) {
            return { success: false, error: 'Review ID is required' };
        }

        // Use session user if userId not provided, otherwise validate it matches session
        const userIdentifier = userId || sessionUser.email || sessionUser.id;
        const sessionUserIdentifier = sessionUser.email || sessionUser.id;

        // Security check - ensure user can only delete their own reviews
        if (userId && userIdentifier.toLowerCase() !== sessionUserIdentifier.toLowerCase()) {
            return {
                success: false,
                error: 'You can only delete your own reviews'
            };
        }

        // Fetch the review to verify ownership
        const reviewsResponse = await DBService.readAll('reviews');
        if (!reviewsResponse?.success || !reviewsResponse.data) {
            return { success: false, error: 'Failed to fetch reviews' };
        }

        const allReviews = reviewsResponse.data;
        const reviewsArray = Array.isArray(allReviews)
            ? allReviews
            : Object.entries(allReviews).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Find the specific review
        const review = reviewsArray.find((r) => r.id === reviewId || r.key === reviewId);
        if (!review) {
            return { success: false, error: 'Review not found' };
        }

        // Check if the authenticated user owns this review
        const userIdLower = userIdentifier.toLowerCase();
        const isOwner =
            review.createdBy?.toLowerCase() === userIdLower ||
            review.customerEmail?.toLowerCase() === userIdLower ||
            review.userEmail?.toLowerCase() === userIdLower;

        if (!isOwner) {
            return { success: false, error: 'You can only delete your own reviews' };
        }

        // Delete the review
        const result = await deleteWithCacheClear(reviewId, 'reviews', ['store']);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to delete review',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            data: result,
            message: 'Review deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting user review:', error);
        return { success: false, error: 'Failed to delete review. Please try again.' };
    }
};

/**
 * Get customers (users with orders) with their order statistics
 * Returns only users who have placed orders, with aggregated order data
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search query
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Customers data with pagination info and order statistics
 */
export const getCustomers = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('customers', params);
        if (cachedData) return cachedData;

        const { page = 1, limit = 10, search = '' } = params;

        // Get all orders to determine which users are customers
        const ordersResponse = await getAllOrders({ limit: 0 }); // Get all orders without pagination

        if (!ordersResponse?.success || !ordersResponse?.data || ordersResponse.data.length === 0) {
            return {
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
        }

        // Extract unique customer emails and calculate order statistics
        const customerEmailsMap = new Map();

        ordersResponse.data.forEach((order) => {
            const email = order.customer?.email;
            if (!email) return;

            if (!customerEmailsMap.has(email)) {
                customerEmailsMap.set(email, {
                    email,
                    orderCount: 0,
                    totalSpent: 0,
                    lastOrderDate: order.createdAt,
                    orders: []
                });
            }

            const stats = customerEmailsMap.get(email);
            stats.orderCount++;
            stats.totalSpent += order.total || 0;
            stats.orders.push(order.id);

            // Update last order date if this order is more recent
            if (new Date(order.createdAt) > new Date(stats.lastOrderDate)) {
                stats.lastOrderDate = order.createdAt;
            }
        });

        // Get user data for each customer email
        const customersArray = await Promise.all(
            Array.from(customerEmailsMap.values()).map(async (stats) => {
                try {
                    const userResult = await getUser({ email: stats.email });

                    if (userResult?.success && userResult?.data) {
                        const user = userResult.data;
                        return {
                            key: user.key || user.id,
                            id: user.id,
                            email: user.email,
                            displayName: user.displayName || stats.email,
                            firstName: user.displayName?.split(' ')[0] || '',
                            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                            phone: user.phone || '',
                            role: user.role || 'user',
                            preferences: user.preferences || {
                                emailNotifications: true,
                                orderUpdates: true,
                                marketingEmails: true,
                                newsletter: true,
                                smsNotifications: false
                            },
                            club: user.club || {
                                isMember: false,
                                points: 0,
                                level: 'bronze',
                                totalSpent: 0
                            },
                            // Order statistics
                            orderCount: stats.orderCount,
                            totalSpent: stats.totalSpent,
                            lastOrderDate: stats.lastOrderDate,
                            orders: stats.orders,
                            createdAt: user.createdAt,
                            updatedAt: user.updatedAt
                        };
                    }

                    // If user not found, return basic structure with order stats only
                    return {
                        email: stats.email,
                        displayName: stats.email,
                        orderCount: stats.orderCount,
                        totalSpent: stats.totalSpent,
                        lastOrderDate: stats.lastOrderDate,
                        orders: stats.orders,
                        preferences: {
                            emailNotifications: true,
                            orderUpdates: true,
                            marketingEmails: true,
                            newsletter: true,
                            smsNotifications: false
                        }
                    };
                } catch (error) {
                    console.error(`Error fetching user for customer ${stats.email}:`, error);
                    return null;
                }
            })
        );

        // Filter out null results and apply search
        let filteredCustomers = customersArray.filter(Boolean);

        // Apply search filter
        if (search?.trim()) {
            const searchLower = search.toLowerCase();
            filteredCustomers = filteredCustomers.filter(
                (customer) =>
                    customer.displayName?.toLowerCase().includes(searchLower) ||
                    customer.firstName?.toLowerCase().includes(searchLower) ||
                    customer.lastName?.toLowerCase().includes(searchLower) ||
                    customer.email?.toLowerCase().includes(searchLower) ||
                    customer.phone?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by last order date (most recent first)
        filteredCustomers.sort((a, b) => {
            const aDate = new Date(a.lastOrderDate || a.createdAt);
            const bDate = new Date(b.lastOrderDate || b.createdAt);
            return bDate - aDate;
        });

        // Calculate pagination
        const totalItems = filteredCustomers.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedCustomers = limit > 0 ? filteredCustomers.slice(startIndex, endIndex) : filteredCustomers;

        const result = {
            success: true,
            data: paginatedCustomers,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('customers', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching customers:', error);
        return {
            success: false,
            error: 'Failed to fetch customers',
            message: error.message,
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
};

/**
 * Get customer by email
 * Server-side function to fetch a single customer by email
 * @param {string} email - Customer email
 * @returns {Promise<Object>} Customer data result
 */
export const getCustomer = async (email) => {
    try {
        if (!email) {
            return {
                success: false,
                error: 'Email is required',
                data: null
            };
        }

        // Check cache first
        const cachedData = await loadCacheData('customer', { email });
        if (cachedData) return cachedData;

        // Use getUser from users.js instead of direct database call
        const userResponse = await getUser({ email });

        if (!userResponse?.success || !userResponse.data) {
            const result = {
                success: true,
                data: null,
                message: 'Customer not found'
            };

            // Cache the result
            await saveCacheData('customer', { email }, result);
            return result;
        }

        const user = userResponse.data;
        const result = {
            success: true,
            data: {
                ...user,
                key: user.key || user.id,
                id: user.id || user._id || user.key
            }
        };

        // Cache the result
        await saveCacheData('customer', { email }, result);
        return result;
    } catch (error) {
        console.error('Error fetching customer:', error);
        return {
            success: false,
            error: 'Failed to fetch customer',
            message: error.message,
            data: null
        };
    }
};

/**
 * Get count of out-of-stock catalog items for navigation badge
 * @returns {Promise<Object>} Count of out-of-stock items
 */
export async function getOutOfStockCount() {
    try {
        // Get all catalog items without pagination
        const result = await getCatalog({
            limit: 0, // Get all items
            activeOnly: false // Include inactive items too
        });

        if (!result?.success || !result.data) {
            return {
                success: true,
                data: { count: 0 }
            };
        }

        // Count items where item type is physical and stock is 0
        const outOfStockCount = result.data.filter((item) => {
            const stock = Number(item.stock) || 0;
            return item.type === 'physical' && stock === 0;
        }).length;

        return {
            success: true,
            data: { count: outOfStockCount }
        };
    } catch (error) {
        console.error('Error getting out-of-stock count:', error);
        return {
            success: false,
            error: error.message,
            data: { count: 0 }
        };
    }
}

/**
 * Get count of pending reviews for navigation badge
 * @returns {Promise<Object>} Count of pending reviews
 */
export async function getPendingReviewsCount() {
    try {
        // Get all reviews with pending status
        const result = await getReviews({
            status: 'pending',
            limit: 0, // Get all pending reviews
            approvedOnly: false // Include all statuses
        });

        if (!result?.success) {
            return {
                success: true,
                data: { count: 0 }
            };
        }

        // Return the total count from pagination info
        const count = result.pagination?.totalItems || 0;

        return {
            success: true,
            data: { count }
        };
    } catch (error) {
        console.error('Error getting pending reviews count:', error);
        return {
            success: false,
            error: error.message,
            data: { count: 0 }
        };
    }
}
