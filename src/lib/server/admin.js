// @/lib/server/admin.js

'use server';

import DBService from '@/data/rest.db.js';
import { getSettings } from '@/lib/server/settings.js';
import { generateUID } from '@/lib/shared/helpers.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

// Import centralized data fetching functions 
import { getAllOrders } from '@/lib/server/orders.js';
import { getCatalog, getCategories, getCollections, getCustomers, getCoupons } from '@/lib/server/store.js';
import { getUser } from '@/lib/server/users.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize dashboard cache instance
const { loadCacheData, saveCacheData } = await initCache('dashboard');

// Cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// DASHBOARD FUNCTIONS
// ============================================================================

/**
 * Get dashboard statistics
 * @param {Object} params - Query parameters
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Dashboard statistics with counts, revenue, and recent activity
 */
export async function getDashboardStats(params = {}) {
    try {
        // Fetch all data using centralized functions with limit: 0 for unlimited results
        // These functions handle their own caching and data transformation
        const [customersResult, ordersResult, productsResult, categoriesResult, collectionsResult] = await Promise.all([
            getCustomers({ limit: 0 }),
            getAllOrders({ limit: 0 }),
            getCatalog({ limit: 0, activeOnly: false }),
            getCategories({ limit: 0, activeOnly: false }),
            getCollections({ limit: 0 })
        ]);

        // Extract data arrays from responses (already formatted and cached by individual functions)
        const customersArray = customersResult?.data || [];
        const ordersArray = ordersResult?.data || [];
        const productsArray = productsResult?.data || [];
        const categoriesArray = categoriesResult?.data || [];
        const collectionsArray = collectionsResult?.data || [];

        // Calculate revenue from orders (only paid orders)
        const revenue = ordersArray.reduce((acc, order) => {
            if (order.paymentStatus === 'paid') {
                return acc + (parseFloat(order.total) || 0);
            }
            return acc;
        }, 0);

        // Sort by created date (newest first)
        const sortByDate = (arr) => {
            return arr.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });
        };

        // Prepare response data
        const result = {
            success: true,
            data: {
                counts: {
                    users: customersArray.length,
                    orders: ordersArray.length,
                    products: productsArray.length,
                    categories: categoriesArray.length,
                    collections: collectionsArray.length
                },
                revenue: revenue,
                recentActivity: {
                    users: sortByDate([...customersArray])
                        .slice(0, 3)
                        .map((user) => ({
                            id: user.id,
                            name: user?.firstName + ' ' + user?.lastName,
                            email: user.email,
                            createdAt: user.createdAt
                        })),
                    orders: sortByDate([...ordersArray])
                        .slice(0, 2)
                        .map((order) => ({
                            id: order.id,
                            total: order.total,
                            status: order.status,
                            createdAt: order.createdAt
                        })),
                    products: sortByDate([...productsArray])
                        .slice(0, 2)
                        .map((product) => ({
                            id: product.id,
                            name: product.name,
                            createdAt: product.createdAt
                        }))
                }
            }
        };

        return result;
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            success: false,
            error: 'Failed to fetch dashboard statistics',
            message: error.message
        };
    }
}

// ============================================================================
// CATALOG/PRODUCTS CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new catalog item utility function
 * @param {Object} catalogData - Catalog item data to create
 * @returns {Promise<Object>} Created catalog item data
 */
export async function createCatalogItem(catalogData) {
    try {
        // Validate slug is provided
        if (!catalogData.slug || catalogData.slug.trim() === '') {
            return {
                success: false,
                error: 'Slug is required for catalog items'
            };
        }

        // Check if slug already exists in database
        const catalogResponse = await DBService.readAll('catalog');
        if (!catalogResponse?.success) {
            return { success: false, error: 'Failed to fetch catalog data' };
        }
        const allCatalog = catalogResponse.data || {};
        const catalogArray = Array.isArray(allCatalog) ? allCatalog : Object.values(allCatalog);

        const existingSlug = catalogArray.find((item) => item.slug === catalogData.slug);
        if (existingSlug) {
            return {
                success: false,
                error: 'A catalog item with this slug already exists. Please choose a different slug.'
            };
        }

        // Helper functions for processing
        const parseNumber = (n) => parseFloat(n || 0);
        const parseIntNumber = (n) => parseInt(n || 0, 10);
        
        // Process discount calculations at creation time
        const originalPrice = parseNumber(catalogData.compareAtPrice || catalogData.price);
        const discountAmount = parseNumber(catalogData.discountAmount);
        const discountType = catalogData.discountType || 'none';
        
        let finalPrice = originalPrice;
        let discountPercentage = 0;
        
        if (discountAmount > 0 && discountType !== 'none') {
            if (discountType === 'percentage') {
                discountPercentage = Math.floor(discountAmount);
                finalPrice = originalPrice * (1 - discountAmount / 100);
            } else if (discountType === 'fixed') {
                discountPercentage = Math.floor((discountAmount / originalPrice) * 100);
                finalPrice = Math.max(0, originalPrice - discountAmount);
            }
        }

        // Base catalog item with processed prices
        const baseItem = {
            ...catalogData,
            id: generateUID('ITEM'),
            compareAtPrice: parseFloat(originalPrice).toFixed(2),
            price: parseFloat(finalPrice).toFixed(2),
            discount: discountPercentage,
            discountAmount: discountAmount,
            discountType: discountType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Process type-specific fields and calculations at creation time
        let newCatalogItem;
        
        if (catalogData.type === 'physical') {
            // Process quantity pricing for physical products
            const processedQuantityPricing = (catalogData.quantityPricing || []).map((tier) => {
                const tierOriginalPrice = parseNumber(tier.compareAtPrice || tier.price);
                let tierFinalPrice = tierOriginalPrice;
                let tierDiscountPercentage = 0;
                
                if (discountAmount > 0 && discountType !== 'none') {
                    if (discountType === 'percentage') {
                        tierDiscountPercentage = Math.floor(discountAmount);
                        tierFinalPrice = tierOriginalPrice * (1 - discountAmount / 100);
                    } else if (discountType === 'fixed') {
                        tierDiscountPercentage = Math.floor((discountAmount / tierOriginalPrice) * 100);
                        tierFinalPrice = Math.max(0, tierOriginalPrice - discountAmount);
                    }
                }
                
                return {
                    ...tier,
                    compareAtPrice: parseFloat(tierOriginalPrice).toFixed(2),
                    price: parseFloat(tierFinalPrice).toFixed(2),
                    discount: tierDiscountPercentage,
                    discountAmount: discountAmount,
                    discountType: discountType
                };
            });
            
            newCatalogItem = {
                ...baseItem,
                quantity: parseNumber(catalogData.quantity),
                quantityUnit: catalogData.quantityUnit || 'g',
                stock: parseIntNumber(catalogData.stock),
                lowStockAlert: parseIntNumber(catalogData.lowStockAlert || 5),
                hasQuantityPricing: catalogData.hasQuantityPricing === true,
                quantityPricing: processedQuantityPricing
            };
        } else if (catalogData.type === 'digital') {
            newCatalogItem = {
                ...baseItem,
                downloadLink: catalogData.downloadLink || '',
                downloadNotes: catalogData.downloadNotes || ''
            };
        } else if (catalogData.type === 'service') {
            newCatalogItem = {
                ...baseItem,
                serviceType: catalogData.serviceType || 'standard',
                duration: catalogData.duration || null,
                durationUnit: catalogData.durationUnit || 'minutes',
                hasDuration: catalogData.hasDuration !== false,
                deliveryMethod: catalogData.deliveryMethod || 'in-person',
                platform: catalogData.platform || '',
                maxParticipants: catalogData.maxParticipants || null,
                hasCapacityLimit: catalogData.hasCapacityLimit !== false,
                prerequisites: catalogData.prerequisites || '',
                serviceIncludes: catalogData.serviceIncludes || '',
                serviceNotes: catalogData.serviceNotes || '',
                requiresAppointment: catalogData.requiresAppointment === true,
                appointmentSettings: catalogData.requiresAppointment === true ? 
                    (catalogData.appointmentSettings || {
                        allowOnlineBooking: true,
                        bufferTime: 15,
                        advanceBookingDays: 30,
                        workingHours: {
                            monday: { enabled: true, start: '09:00', end: '17:00' },
                            tuesday: { enabled: true, start: '09:00', end: '17:00' },
                            wednesday: { enabled: true, start: '09:00', end: '17:00' },
                            thursday: { enabled: true, start: '09:00', end: '17:00' },
                            friday: { enabled: true, start: '09:00', end: '17:00' },
                            saturday: { enabled: false, start: '09:00', end: '17:00' },
                            sunday: { enabled: false, start: '09:00', end: '17:00' }
                        }
                    }) : undefined
            };
        } else {
            // Default/unknown type - keep all fields
            newCatalogItem = baseItem;
        }

        const result = await createWithCacheClear(newCatalogItem, 'catalog', ['store', 'web_stats']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create catalog item' };
        }
    } catch (error) {
        console.error('Error creating catalog item:', error);
        return {
            success: false,
            error: 'Failed to create catalog item',
            message: error.message
        };
    }
}

/**
 * Update a catalog item utility function
 * @param {string} catalogId - ID of the catalog item to update
 * @param {Object} catalogData - Catalog item data to update
 * @returns {Promise<Object>} Updated catalog item data
 */
export async function updateCatalogItem(catalogId, catalogData) {
    try {
        // Validate slug is provided
        if (!catalogData.slug || catalogData.slug.trim() === '') {
            return {
                success: false,
                error: 'Slug is required for catalog items'
            };
        }

        // Check if slug already exists in other items
        const catalogResponse = await DBService.readAll('catalog');
        if (!catalogResponse?.success) {
            return { success: false, error: 'Failed to fetch catalog data' };
        }
        const allCatalog = catalogResponse.data || {};
        const catalogArray = Array.isArray(allCatalog) ? allCatalog : Object.values(allCatalog);
        
        const existingSlug = catalogArray.find(
            (item) => item.slug === catalogData.slug && item.key !== catalogId && item.id !== catalogId
        );

        if (existingSlug) {
            return {
                success: false,
                error: 'A catalog item with this slug already exists. Please choose a different slug.'
            };
        }

        // Helper functions for processing
        const parseNumber = (n) => parseFloat(n || 0);
        const parseIntNumber = (n) => parseInt(n || 0, 10);
        
        // Process discount calculations at update time
        const originalPrice = parseNumber(catalogData.compareAtPrice || catalogData.price);
        const discountAmount = parseNumber(catalogData.discountAmount);
        const discountType = catalogData.discountType || 'none';
        
        let finalPrice = originalPrice;
        let discountPercentage = 0;
        
        if (discountAmount > 0 && discountType !== 'none') {
            if (discountType === 'percentage') {
                discountPercentage = Math.floor(discountAmount);
                finalPrice = originalPrice * (1 - discountAmount / 100);
            } else if (discountType === 'fixed') {
                discountPercentage = Math.floor((discountAmount / originalPrice) * 100);
                finalPrice = Math.max(0, originalPrice - discountAmount);
            }
        }

        // Base item with processed prices
        const baseItem = {
            ...catalogData,
            compareAtPrice: parseFloat(originalPrice).toFixed(2),
            price: parseFloat(finalPrice).toFixed(2),
            discount: discountPercentage,
            discountAmount: discountAmount,
            discountType: discountType,
            updatedAt: new Date().toISOString()
        };

        // Process type-specific fields and calculations at update time
        let updatedData;
        
        if (catalogData.type === 'physical') {
            // Process quantity pricing for physical products
            const processedQuantityPricing = (catalogData.quantityPricing || []).map((tier) => {
                const tierOriginalPrice = parseNumber(tier.compareAtPrice || tier.price);
                let tierFinalPrice = tierOriginalPrice;
                let tierDiscountPercentage = 0;
                
                if (discountAmount > 0 && discountType !== 'none') {
                    if (discountType === 'percentage') {
                        tierDiscountPercentage = Math.floor(discountAmount);
                        tierFinalPrice = tierOriginalPrice * (1 - discountAmount / 100);
                    } else if (discountType === 'fixed') {
                        tierDiscountPercentage = Math.floor((discountAmount / tierOriginalPrice) * 100);
                        tierFinalPrice = Math.max(0, tierOriginalPrice - discountAmount);
                    }
                }
                
                return {
                    ...tier,
                    compareAtPrice: parseFloat(tierOriginalPrice).toFixed(2),
                    price: parseFloat(tierFinalPrice).toFixed(2),
                    discount: tierDiscountPercentage,
                    discountAmount: discountAmount,
                    discountType: discountType
                };
            });
            
            updatedData = {
                ...baseItem,
                quantity: parseNumber(catalogData.quantity),
                quantityUnit: catalogData.quantityUnit || 'g',
                stock: parseIntNumber(catalogData.stock),
                lowStockAlert: parseIntNumber(catalogData.lowStockAlert || 5),
                hasQuantityPricing: catalogData.hasQuantityPricing === true,
                quantityPricing: processedQuantityPricing
            };
        } else if (catalogData.type === 'digital') {
            updatedData = {
                ...baseItem,
                downloadLink: catalogData.downloadLink || '',
                downloadNotes: catalogData.downloadNotes || ''
            };
        } else if (catalogData.type === 'service') {
            updatedData = {
                ...baseItem,
                serviceType: catalogData.serviceType || 'standard',
                duration: catalogData.duration || null,
                durationUnit: catalogData.durationUnit || 'minutes',
                hasDuration: catalogData.hasDuration !== false,
                deliveryMethod: catalogData.deliveryMethod || 'in-person',
                platform: catalogData.platform || '',
                maxParticipants: catalogData.maxParticipants || null,
                hasCapacityLimit: catalogData.hasCapacityLimit !== false,
                prerequisites: catalogData.prerequisites || '',
                serviceIncludes: catalogData.serviceIncludes || '',
                serviceNotes: catalogData.serviceNotes || '',
                requiresAppointment: catalogData.requiresAppointment === true,
                appointmentSettings: catalogData.requiresAppointment === true ? 
                    (catalogData.appointmentSettings || {
                        allowOnlineBooking: true,
                        bufferTime: 15,
                        advanceBookingDays: 30,
                        workingHours: {
                            monday: { enabled: true, start: '09:00', end: '17:00' },
                            tuesday: { enabled: true, start: '09:00', end: '17:00' },
                            wednesday: { enabled: true, start: '09:00', end: '17:00' },
                            thursday: { enabled: true, start: '09:00', end: '17:00' },
                            friday: { enabled: true, start: '09:00', end: '17:00' },
                            saturday: { enabled: false, start: '09:00', end: '17:00' },
                            sunday: { enabled: false, start: '09:00', end: '17:00' }
                        }
                    }) : undefined
            };
        } else {
            // Default/unknown type - keep all fields
            updatedData = baseItem;
        }

        // CRITICAL FIX: Get the actual database key (not the item's id field)
        const dbKey = catalogId;

        if (!dbKey) {
            return {
                success: false,
                error: 'Catalog item database key not found'
            };
        }

        // Use the actual database key for the update
        const result = await updateWithCacheClear(dbKey, updatedData, 'catalog', ['store', 'web_stats']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update catalog item' };
        }
    } catch (error) {
        console.error('Error updating catalog item:', error);
        return {
            success: false,
            error: 'Failed to update catalog item',
            message: error.message
        };
    }
}

/**
 * Delete a catalog item utility function
 * @param {string} catalogId - ID of the catalog item to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCatalogItem(catalogId) {
    try {
        // Get the actual database key (not the item's id field)
        const dbKey = catalogId;
        if (!dbKey) {
            return {
                success: false,
                error: 'Catalog item database key not found'
            };
        }

        // Use the actual database key for deletion
        const result = await deleteWithCacheClear(dbKey, 'catalog', ['store', 'web_stats']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete catalog item' };
        }
    } catch (error) {
        console.error('Error deleting catalog item:', error);
        return {
            success: false,
            error: 'Failed to delete catalog item',
            message: error.message
        };
    }
}

// ============================================================================
// ATTRIBUTES CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new attribute utility function
 * @param {Object} attributeData - Attribute data to create
 * @returns {Promise<Object>} Created attribute data
 */
export async function createAttribute(attributeData) {
    try {
        // Validate slug
        if (!attributeData.slug || attributeData.slug.trim() === '') {
            return { success: false, error: 'Slug is required. Please provide a valid slug.' };
        }

        // Check for slug uniqueness
        const attributesResponse = await DBService.readAll('attributes');
        if (!attributesResponse?.success) {
            return { success: false, error: 'Failed to fetch attributes data' };
        }
        const allAttributes = attributesResponse.data || {};
        const attributesArray = Array.isArray(allAttributes) ? allAttributes : Object.values(allAttributes);
        const existingSlug = attributesArray.find((attr) => attr.slug === attributeData.slug);

        if (existingSlug) {
            return {
                success: false,
                error: 'An attribute with this slug already exists. Please choose a different slug.'
            };
        }

        // Generate unique ID if not provided
        const attributeWithId = {
            ...attributeData,
            id: generateUID('ATTR'),
            createdAt: attributeData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await createWithCacheClear(attributeWithId, 'attributes', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create attribute' };
        }
    } catch (error) {
        console.error('Error creating attribute:', error);
        return {
            success: false,
            error: 'Failed to create attribute',
            message: error.message
        };
    }
}

/**
 * Update an attribute utility function
 * @param {string} attributeId - ID of the attribute to update
 * @param {Object} attributeData - Attribute data to update
 * @returns {Promise<Object>} Updated attribute data
 */
export async function updateAttribute(attributeId, attributeData) {
    try {
        // Validate slug if provided
        if (attributeData.slug !== undefined) {
            if (!attributeData.slug || attributeData.slug.trim() === '') {
                return { success: false, error: 'Slug is required. Please provide a valid slug.' };
            }

            // Check for slug uniqueness (exclude current attribute)
            const attributesResponse = await DBService.readAll('attributes');
            if (!attributesResponse?.success) {
                return { success: false, error: 'Failed to fetch attributes data' };
            }
            const allAttributes = attributesResponse.data || {};
            const attributesArray = Array.isArray(allAttributes) ? allAttributes : Object.values(allAttributes);
            const existingSlug = attributesArray.find(
                (attr) => attr.slug === attributeData.slug && attr.key !== attributeId && attr.id !== attributeId
            );

            if (existingSlug) {
                return {
                    success: false,
                    error: 'An attribute with this slug already exists. Please choose a different slug.'
                };
            }
        }

        const updatedData = {
            ...attributeData,
            updatedAt: new Date().toISOString()
        };

        // Check if attribute exists
        const existingAttributeResponse = await DBService.read(attributeId, 'attributes');
        if (!existingAttributeResponse?.success || !existingAttributeResponse.data) {
            return {
                success: false,
                error: 'Attribute not found'
            };
        }

        const result = await updateWithCacheClear(attributeId, updatedData, 'attributes', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update attribute' };
        }
    } catch (error) {
        console.error('Error updating attribute:', error);
        return {
            success: false,
            error: 'Failed to update attribute',
            message: error.message
        };
    }
}

/**
 * Delete an attribute utility function
 * @param {string} attributeId - ID of the attribute to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAttribute(attributeId) {
    try {
        const result = await deleteWithCacheClear(attributeId, 'attributes', ['store']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete attribute' };
        }
    } catch (error) {
        console.error('Error deleting attribute:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

// ============================================================================
// CATEGORIES CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new category utility function
 * @param {Object} categoryData - Category data to create
 * @returns {Promise<Object>} Created category data
 */
export async function createCategory(categoryData) {
    try {
        // Validate slug is provided
        if (!categoryData.slug || categoryData.slug.trim() === '') {
            return {
                success: false,
                error: 'Slug is required for categories'
            };
        }

        // Check if slug already exists in database
        const categoriesResponse = await DBService.readAll('categories');
        if (!categoriesResponse?.success) {
            return { success: false, error: 'Failed to fetch categories data' };
        }
        const allCategories = categoriesResponse.data || {};
        const categoriesArray = Array.isArray(allCategories) ? allCategories : Object.values(allCategories);

        const existingSlug = categoriesArray.find((cat) => cat.slug === categoryData.slug);
        if (existingSlug) {
            return {
                success: false,
                error: 'A category with this slug already exists. Please choose a different slug.'
            };
        }

        const newCategory = {
            ...categoryData,
            id: generateUID('CAT'),
            isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await createWithCacheClear(newCategory, 'categories', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create category' };
        }
    } catch (error) {
        console.error('Error creating category:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Update a category utility function
 * @param {string} categoryId - ID of the category to update
 * @param {Object} categoryData - Category data to update
 * @returns {Promise<Object>} Updated category data
 */
export async function updateCategory(categoryId, categoryData) {
    try {
        // Validate slug is provided
        if (!categoryData.slug || categoryData.slug.trim() === '') {
            return {
                success: false,
                error: 'Slug is required for categories'
            };
        }

        // Get the existing category to compare slug changes
        const existingCategoryResponse = await DBService.read(categoryId, 'categories');
        if (!existingCategoryResponse?.success || !existingCategoryResponse.data) {
            return {
                success: false,
                error: 'Category not found'
            };
        }

        const existingCategory = existingCategoryResponse.data;

        // Only check for slug uniqueness if the slug is being changed
        if (existingCategory.slug !== categoryData.slug) {
            const categoriesResponse = await DBService.readAll('categories');
            if (!categoriesResponse?.success) {
                return { success: false, error: 'Failed to fetch categories data' };
            }
            const allCategories = categoriesResponse.data || {};
            const categoriesArray = Array.isArray(allCategories) ? allCategories : Object.values(allCategories);

            const existingSlug = categoriesArray.find((cat) => cat.slug === categoryData.slug && cat.key !== categoryId && cat.id !== categoryId);
            if (existingSlug) {
                return {
                    success: false,
                    error: 'A category with this slug already exists. Please choose a different slug.'
                };
            }
        }

        const updatedData = {
            ...categoryData,
            isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(categoryId, updatedData, 'categories', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update category' };
        }
    } catch (error) {
        console.error('Error updating category:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Delete a category utility function
 * @param {string} categoryId - ID of the category to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCategory(categoryId) {
    try {
        const result = await deleteWithCacheClear(categoryId, 'categories', ['store']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete category' };
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

// ============================================================================
// COLLECTIONS CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new collection utility function
 * @param {Object} collectionData - Collection data to create
 * @returns {Promise<Object>} Created collection data
 */
export async function createCollection(collectionData) {
    try {
        // Validate slug
        if (!collectionData.slug || collectionData.slug.trim() === '') {
            return { success: false, error: 'Slug is required. Please provide a valid slug.' };
        }

        // Check for slug uniqueness
        const collectionsResponse = await DBService.readAll('collections');
        if (!collectionsResponse?.success) {
            return { success: false, error: 'Failed to fetch collections data' };
        }
        const allCollections = collectionsResponse.data || {};
        const collectionsArray = Array.isArray(allCollections) ? allCollections : Object.values(allCollections);
        const existingSlug = collectionsArray.find((col) => col.slug === collectionData.slug);

        if (existingSlug) {
            return {
                success: false,
                error: 'A collection with this slug already exists. Please choose a different slug.'
            };
        }

        // Generate unique ID if not provided
        const collectionWithId = {
            ...collectionData,
            id: collectionData.id || generateUID('COL'),
            createdAt: collectionData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await createWithCacheClear(collectionWithId, 'collections', ['store']);
        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create collection' };
        }
    } catch (error) {
        console.error('Error creating collection:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Update a collection utility function
 * @param {string} collectionId - ID of the collection to update
 * @param {Object} collectionData - Collection data to update
 * @returns {Promise<Object>} Updated collection data
 */
export async function updateCollection(collectionId, collectionData) {
    try {
        // Validate slug if provided
        if (collectionData.slug !== undefined) {
            if (!collectionData.slug || collectionData.slug.trim() === '') {
                return { success: false, error: 'Slug is required. Please provide a valid slug.' };
            }

            // Check for slug uniqueness (exclude current collection)
            const collectionsResponse = await DBService.readAll('collections');
            if (!collectionsResponse?.success) {
                return { success: false, error: 'Failed to fetch collections data' };
            }
            const allCollections = collectionsResponse.data || {};
            const collectionsArray = Array.isArray(allCollections) ? allCollections : Object.values(allCollections);
            const existingSlug = collectionsArray.find(
                (col) => col.slug === collectionData.slug && col.key !== collectionId && col.key !== collectionId && col.id !== collectionId
            );

            if (existingSlug) {
                return {
                    success: false,
                    error: 'A collection with this slug already exists. Please choose a different slug.'
                };
            }
        }

        const updatedData = {
            ...collectionData,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(collectionId, updatedData, 'collections', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update collection' };
        }
    } catch (error) {
        console.error('Error updating collection:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Delete a collection utility function
 * @param {string} collectionId - ID of the collection to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCollection(collectionId) {
    try {
        const result = await deleteWithCacheClear(collectionId, 'collections', ['store']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete collection' };
        }
    } catch (error) {
        console.error('Error deleting collection:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

// ============================================================================
// COUPONS CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new coupon utility function
 * @param {Object} couponData - Coupon data to create
 * @returns {Promise<Object>} Created coupon data
 */
export async function createCoupon(couponData) {
    try {
        // Validate coupon code
        if (!couponData.code || couponData.code.trim() === '') {
            return { success: false, error: 'Coupon code is required. Please provide a valid code.' };
        }

        // Check for code uniqueness
        const couponsResponse = await getCoupons();
        if (!couponsResponse?.success) {
            return { success: false, error: 'Failed to fetch coupons data' };
        }
        const allCoupons = couponsResponse.data || {};
        const couponsArray = Array.isArray(allCoupons) ? allCoupons : Object.values(allCoupons);
        const existingCode = couponsArray.find((coup) => coup.code?.toUpperCase() === couponData.code.toUpperCase());

        if (existingCode) {
            return { success: false, error: 'A coupon with this code already exists. Please use a different code.' };
        }

        const couponWithTimestamp = {
            ...couponData,
            id: couponData.id || generateUID('COUPON'),
            code: couponData.code.toUpperCase(),
            createdAt: new Date().toISOString(),
            usedCount: 0
        };

        const result = await createWithCacheClear(couponWithTimestamp, 'coupons', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create coupon' };
        }
    } catch (error) {
        console.error('Error creating coupon:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update a coupon utility function
 * @param {string} couponId - ID of the coupon to update
 * @param {Object} couponData - Coupon data to update
 * @returns {Promise<Object>} Updated coupon data
 */
export async function updateCoupon(couponId, couponData) {
    try {
        // Validate coupon code if provided
        if (couponData.code !== undefined) {
            if (!couponData.code || couponData.code.trim() === '') {
                return { success: false, error: 'Coupon code is required. Please provide a valid code.' };
            }

            // Check for code uniqueness (exclude current coupon)
            const couponsResponse = await getCoupons();
            if (!couponsResponse?.success) {
                return { success: false, error: 'Failed to fetch coupons data' };
            }
            const allCoupons = couponsResponse.data || {};
            const couponsArray = Array.isArray(allCoupons) ? allCoupons : Object.values(allCoupons);
            const existingCode = couponsArray.find(
                (coup) => coup.code?.toUpperCase() === couponData.code.toUpperCase() && coup.key !== couponId && coup.id !== couponId
            );

            if (existingCode) {
                return {
                    success: false,
                    error: 'A coupon with this code already exists. Please use a different code.'
                };
            }
        }

        const updateData = {
            ...couponData,
            code: couponData.code ? couponData.code.toUpperCase() : undefined,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(couponId, updateData, 'coupons', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update coupon' };
        }
    } catch (error) {
        console.error('Error updating coupon:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a coupon utility function
 * @param {string} couponId - ID of the coupon to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCoupon(couponId) {
    try {
        const result = await deleteWithCacheClear(couponId, 'coupons', ['store']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete coupon' };
        }
    } catch (error) {
        console.error('Error deleting coupon:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// REVIEWS CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new review utility function
 * @param {Object} reviewData - Review data to create
 * @returns {Promise<Object>} Created review data
 */
export async function createReview(reviewData) {
    try {
        // Generate unique review ID with REV_ prefix
        const reviewId = generateUID('REV');

        // Get product name if not provided
        let productName = reviewData.productName;
        if (!productName && reviewData.productId) {
            const productResult = await getCatalog({ item: reviewData.productId, limit: 1 });
            if (productResult?.success && productResult.data?.length > 0) {
                productName = productResult.data[0].name;
            }
        }

        // Create review with consistent structure (matches frontend submitReview)
        const newReview = {
            id: reviewId,
            productId: reviewData.productId,
            productName: productName || 'Unknown Product',
            customerName: reviewData.isAnonymous ? 'Anonymous' : reviewData.customerName || 'Anonymous',
            customerEmail: reviewData.isAnonymous ? '' : reviewData.customerEmail || '',
            rating: parseInt(reviewData.rating, 10),
            comment: reviewData.comment || '',
            status: reviewData.status || 'pending',
            isAnonymous: reviewData.isAnonymous || false,
            isVerified: reviewData.isVerified || false,
            createdBy: reviewData.customerEmail || 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await createWithCacheClear(newReview, 'reviews', ['store']);
        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create review' };
        }
    } catch (error) {
        console.error('Error creating review:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Update a review utility function
 * @param {string} reviewId - ID of the review to update
 * @param {Object} reviewData - Review data to update
 * @returns {Promise<Object>} Updated review data
 */
export async function updateReview(reviewId, reviewData) {
    try {
        const updatedData = {
            ...reviewData,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(reviewId, updatedData, 'reviews', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update review' };
        }
    } catch (error) {
        console.error('Error updating review:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Delete a review utility function
 * @param {string} reviewId - ID of the review to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteReview(reviewId) {
    try {
        const result = await deleteWithCacheClear(reviewId, 'reviews', ['store']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete review' };
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Approve a review utility function
 * @param {string} reviewId - ID of the review to approve
 * @returns {Promise<Object>} Update result
 */
export async function approveReview(reviewId) {
    try {
        const result = await updateReview(reviewId, {
            status: 'approved',
            approvedAt: new Date().toISOString()
        });
        return result;
    } catch (error) {
        console.error('Error approving review:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Reject a review utility function
 * @param {string} reviewId - ID of the review to reject
 * @returns {Promise<Object>} Update result
 */
export async function rejectReview(reviewId) {
    try {
        const result = await updateReview(reviewId, {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        });
        return result;
    } catch (error) {
        console.error('Error rejecting review:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

// ============================================================================
// TESTIMONIALS CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new testimonial utility function
 * @param {Object} testimonialData - Testimonial data to create
 * @returns {Promise<Object>} Created testimonial data
 */
export async function createTestimonial(testimonialData) {
    try {
        // Generate unique testimonial ID with TT_ prefix
        const testimonialId = generateUID('TT');

        const newTestimonial = {
            id: testimonialId,
            ...testimonialData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: testimonialData.isActive !== false
        };

        const result = await createWithCacheClear(newTestimonial, 'testimonials', ['store']);
        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create testimonial' };
        }
    } catch (error) {
        console.error('Error creating testimonial:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Update a testimonial utility function
 * @param {string} testimonialId - ID of the testimonial to update
 * @param {Object} testimonialData - Testimonial data to update
 * @returns {Promise<Object>} Updated testimonial data
 */
export async function updateTestimonial(testimonialId, testimonialData) {
    try {
        const updatedData = {
            ...testimonialData,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(testimonialId, updatedData, 'testimonials', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update testimonial' };
        }
    } catch (error) {
        console.error('Error updating testimonial:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

/**
 * Delete a testimonial utility function
 * @param {string} testimonialId - ID of the testimonial to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteTestimonial(testimonialId) {
    try {
        const result = await deleteWithCacheClear(testimonialId, 'testimonials', ['store']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete testimonial' };
        }
    } catch (error) {
        console.error('Error deleting testimonial:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

// ============================================================================
// BLOCKS CRUD FUNCTIONS
// ============================================================================

/**
 * Get all blocks with filtering and pagination
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search term
 * @param {string} params.type - Block type filter ('all' or specific type)
 * @param {string} params.status - Status filter ('all', 'active', 'inactive')
 * @param {string} params.sortBy - Sort field (default: 'createdAt')
 * @param {string} params.sortOrder - Sort order ('asc' or 'desc', default: 'desc')
 * @returns {Promise<Object>} Blocks data with pagination info
 */
export async function getAllBlocks(params = {}) {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            type = 'all',
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        // Fetch all blocks from database
        const blocksResult = await DBService.readAll('blocks');
        const blocksData = blocksResult?.data || blocksResult || {};

        // Convert to array if needed
        let blocks = Array.isArray(blocksData) ? blocksData : Object.values(blocksData);

        // Apply search filter
        if (search?.trim()) {
            const searchTerm = search.toLowerCase().trim();
            blocks = blocks.filter((block) => {
                return (
                    (block.name || '').toLowerCase().includes(searchTerm) ||
                    (block.description || '').toLowerCase().includes(searchTerm) ||
                    (block.id || '').toLowerCase().includes(searchTerm)
                );
            });
        }

        // Apply type filter
        if (type && type !== 'all') {
            blocks = blocks.filter((block) => block.type === type);
        }

        // Apply status filter
        if (status && status !== 'all') {
            const isActive = status === 'active';
            blocks = blocks.filter((block) => block.isActive === isActive);
        }

        // Sort blocks
        blocks.sort((a, b) => {
            const aValue = a[sortBy] || '';
            const bValue = b[sortBy] || '';

            if (sortOrder === 'desc') {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            } else {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            }
        });

        // Calculate pagination
        const total = blocks.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedBlocks = blocks.slice(offset, offset + limit);

        const pagination = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };

        return {
            success: true,
            data: paginatedBlocks,
            pagination
        };
    } catch (error) {
        console.error('Error fetching blocks:', error);
        return {
            success: false,
            error: 'Failed to fetch blocks data',
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        };
    }
}

/**
 * Create a new block utility function
 * @param {Object} blockData - Block data to create
 * @returns {Promise<Object>} Created block data
 */
export async function createBlock(blockData) {
    try {
        // Generate unique ID if not provided
        const blockId = blockData.id || generateUID('BLOCK');

        // Prepare block data
        const newBlock = {
            id: blockId,
            name: blockData.name || '',
            description: blockData.description || '',
            type: blockData.type || 'text',
            content: blockData.content || '',
            data: blockData.data || {},
            settings: blockData.settings || {},
            isActive: blockData.isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: blockData.createdBy || 'admin'
        };

        // Validate required fields
        if (!newBlock.name.trim()) {
            return {
                success: false,
                error: 'Block name is required'
            };
        }

        // Check for duplicate ID
        const existingBlock = await DBService.readBy('id', blockId, 'blocks');
        if (existingBlock) {
            return {
                success: false,
                error: 'Block ID already exists'
            };
        }

        const result = await createWithCacheClear(newBlock, 'blocks', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to create block' };
        }
    } catch (error) {
        console.error('Error creating block:', error);
        return {
            success: false,
            error: 'Failed to create block'
        };
    }
}

/**
 * Update a block utility function
 * @param {string} blockId - ID of the block to update
 * @param {Object} blockData - Block data to update
 * @returns {Promise<Object>} Updated block data
 */
export async function updateBlock(blockId, blockData) {
    try {
        // Fetch existing block
        const existingBlockResponse = await DBService.readBy('id', blockId, 'blocks');

        if (!existingBlockResponse?.success || !existingBlockResponse.data) {
            return {
                success: false,
                error: 'Block not found'
            };
        }

        // Prepare update data
        const updateData = {
            ...existingBlock,
            ...blockData,
            id: blockId, // Ensure ID doesn't change
            updatedAt: new Date().toISOString()
        };

        // Validate required fields
        if (!updateData.name.trim()) {
            return {
                success: false,
                error: 'Block name is required'
            };
        }

        const result = await updateWithCacheClear(blockId, updateData, 'blocks', ['store']);

        if (result?.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'Failed to update block' };
        }
    } catch (error) {
        console.error('Error updating block:', error);
        return {
            success: false,
            error: 'Failed to update block'
        };
    }
}

/**
 * Delete a block utility function
 * @param {string} blockId - ID of the block to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteBlock(blockId) {
    try {
        // Check if block exists
        const existingBlockResponse = await DBService.readBy('id', blockId, 'blocks');

        if (!existingBlockResponse?.success || !existingBlockResponse.data) {
            return {
                success: false,
                error: 'Block not found'
            };
        }

        const result = await deleteWithCacheClear(blockId, 'blocks', ['store']);

        if (result?.success) {
            return { success: true, data: result };
        } else {
            return { success: false, error: 'Failed to delete block' };
        }
    } catch (error) {
        console.error('Error deleting block:', error);
        return {
            success: false,
            error: 'Failed to delete block'
        };
    }
}

// ============================================================================
// APPOINTMENTS CRUD FUNCTIONS
// ============================================================================
// NOTE: These functions are now exported from @/lib/server/workspace.js

/**
 * @deprecated Use createAppointment from @/lib/server/workspace.js instead
 * Create a new appointment utility function
 * @param {Object} appointmentData - Appointment data to create
 * @returns {Promise<Object>} Created appointment data
 */
export async function createAppointment(appointmentData) {
    const { createAppointment: workspaceCreateAppointment } = await import('@/lib/server/workspace.js');
    return workspaceCreateAppointment(appointmentData);
}

/**
 * @deprecated Use updateAppointment from @/lib/server/workspace.js instead
 * Update an appointment utility function
 * @param {string} appointmentId - ID of the appointment to update
 * @param {Object} appointmentData - Appointment data to update
 * @returns {Promise<Object>} Updated appointment data  
 */
export async function updateAppointment(appointmentId, appointmentData) {
    const { updateAppointment: workspaceUpdateAppointment } = await import('@/lib/server/workspace.js');
    return workspaceUpdateAppointment(appointmentId, appointmentData);
}

/**
 * @deprecated Use deleteAppointment from @/lib/server/workspace.js instead
 * Delete an appointment utility function
 * @param {string} appointmentId - ID of the appointment to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAppointment(appointmentId) {
    const { deleteAppointment: workspaceDeleteAppointment } = await import('@/lib/server/workspace.js');
    return workspaceDeleteAppointment(appointmentId);
}

// ============================================================================
// NEWSLETTER SUBSCRIBERS CRUD FUNCTIONS
// ============================================================================
// NOTE: These functions are now exported from @/lib/server/newsletter.js

/**
 * @deprecated Use createSubscriber from @/lib/server/newsletter.js instead
 * Create a new newsletter subscriber utility function
 * @param {Object} subscriberData - Subscriber data to create
 * @returns {Promise<Object>} Created subscriber data
 */
export async function createNewsletterSubscriber(subscriberData) {
    // Import dynamically to avoid circular dependencies
    const { createSubscriber } = await import('@/lib/server/newsletter.js');
    return createSubscriber(subscriberData);
}

/**
 * @deprecated Use updateSubscriber from @/lib/server/newsletter.js instead
 * Update a subscriber utility function
 * @param {string} subscriberId - ID of the subscriber to update
 * @param {Object} subscriberData - Subscriber data to update
 * @returns {Promise<Object>} Updated subscriber data
 */
export async function updateNewsletterSubscriber(subscriberId, subscriberData) {
    // Import dynamically to avoid circular dependencies
    const { updateSubscriber } = await import('@/lib/server/newsletter.js');
    return updateSubscriber(subscriberId, subscriberData);
}

/**
 * @deprecated Use deleteSubscriber from @/lib/server/newsletter.js instead
 * Delete a subscriber utility function
 * @param {string} subscriberId - ID of the subscriber to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteNewsletterSubscriber(subscriberId) {
    // Import dynamically to avoid circular dependencies
    const { deleteSubscriber } = await import('@/lib/server/newsletter.js');
    return deleteSubscriber(subscriberId);
}

// ============================================================================
// SITE SETTINGS CRUD FUNCTIONS
// ============================================================================

/**
 * Update or create site settings
 * Server-side function to save site settings
 * @param {Object} settingsData - The settings data to save
 * @returns {Promise<Object>} Save result
 */
export async function updateSiteSettings(settingsData) {
    try {
        const timeNow = new Date().toISOString();

        const envUrl = process.env.NEXTAUTH_URL || settingsData?.baseUrl || '';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        
        let baseUrl = envUrl; 

        // Fallback baseUrl if not in settingsData
        if (!baseUrl) {
            // Server-side: use environment variables
            const host =
                process.env.NEXTAUTH_URL || 
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
            baseUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
        } else {
            // Ensure baseUrl does not have trailing slash and has protocol
            baseUrl = baseUrl.startsWith('http') ? baseUrl : `${protocol}://${baseUrl}`;
            baseUrl = baseUrl.replace(/\/+$/, '');
        }

        // Ensure id is set to 'site_settings'
        const payload = {
            ...settingsData,
            id: 'site_settings',
            baseUrl,
            updatedAt: timeNow
        };

        // Get the database key for site settings
        const { siteSettings } = await getSettings();

        const dbKey = siteSettings?.key || siteSettings?.id || null;
        let result;

        if (dbKey) {
            // Update existing record using the database key and clear 'settings' cache
            result = await updateWithCacheClear(dbKey, payload, 'site_settings', ['settings']);
        }  

        if (!dbKey || !result?.success) {
            return {
                success: false,
                error: 'Failed to update site settings',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            data: result.data,
            message: 'Site settings updated successfully'
        };
    } catch (error) {
        console.error('Error updating site settings:', error);
        return {
            success: false,
            error: 'Failed to update site settings',
            message: error.message
        };
    }
}

/**
 * Update or create store settings
 * Server-side function to save store settings
 * @param {Object} settingsData - The settings data to save
 * @returns {Promise<Object>} Save result
 */
export async function updateStoreSettings(settingsData) {
    try {
        let result;
        console.log('Updating store settings with data:', settingsData);
        try { 
            // Get the database key for store settings
            const { storeSettings } = await getSettings();

            const dbKey = storeSettings?.key || storeSettings?.id || null;
            let result;

            // Update or create accordingly
            if (settingsData && dbKey) {
                // Update existing settings using the database key 
                result = await updateWithCacheClear(dbKey, settingsData, 'store_settings', ['settings']);
            } else {
                console.log('Failed to update store settings');
                return {
                    success: false,
                    error: 'No store settings data provided'
                };
            }
        } catch (checkError) { 
            console.error('Error checking existing store settings:', checkError);
            return {
                success: false,
                error: 'Error checking existing store settings: ' + (checkError.message || 'Unknown error')
            };
        }

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating store settings:', error);
        return {
            success: false,
            error: 'Failed to update store settings',
            message: error.message
        };
    }
}

// ============================================================================
// ANALYTICS SETTINGS FUNCTIONS
// ============================================================================

/**
 * Get Google Analytics settings
 * @param {Object} params - Query parameters
 * @param {Object} params.next - Next.js cache options
 * @param {number} params.next.revalidate - Revalidation time in seconds
 * @param {string} params.duration - Custom duration key (e.g., '5M', '15M', '1H', '1D')
 * @returns {Promise<Object>} Google Analytics settings
 */
export async function getAnalyticsSettings(params = {}) {
    try {
        // Check cache first (defaults to 24h, can be overridden)
        const cached = await loadCacheData('analytics_settings', params);
        if (cached) return cached;

        const settingsResult = await DBService.readAll('analytics_settings');
        const settings = settingsResult?.data || settingsResult || {};

        if (!settings || (Array.isArray(settings) && settings.length === 0)) {
            const emptyResult = {
                success: true,
                data: {
                    enabled: false,
                    apiKey: ''
                }
            };
            await saveCacheData('analytics_settings', params, emptyResult);
            return emptyResult;
        }

        // Convert to array and get first item
        const settingsArray = Array.isArray(settings) ? settings : Object.values(settings);
        const data = settingsArray[0] || { enabled: false, apiKey: '' };

        const result = {
            success: true,
            data: {
                enabled: data.enabled || false,
                apiKey: data.apiKey || ''
            }
        };

        // Cache the result
        await saveCacheData('analytics_settings', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching analytics settings:', error);
        return {
            success: false,
            error: 'Failed to retrieve analytics settings',
            message: error.message
        };
    }
}

/**
 * Save Google Analytics settings
 * @param {Object} settings - Settings to save
 * @param {boolean} settings.enabled - Whether Google Analytics is enabled
 * @param {string} settings.apiKey - Google Analytics API key/Measurement ID
 * @returns {Promise<Object>} Save result
 */
export async function saveAnalyticsSettings(settings) {
    try {
        const { enabled, apiKey } = settings;

        // Check if settings already exist
        const existingSettingsResult = await DBService.readAll('analytics_settings');
        const existingSettings = existingSettingsResult?.data || existingSettingsResult || {};
        const settingsArray = existingSettings
            ? Array.isArray(existingSettings)
                ? existingSettings
                : Object.values(existingSettings)
            : [];

        const settingsData = {
            enabled: enabled || false,
            apiKey: apiKey || '',
            updatedAt: new Date().toISOString()
        };

        let result;
        if (settingsArray.length > 0) {
            // Update existing settings with automatic cache clearing
            const existingId = settingsArray[0].id || settingsArray[0].key;
            result = await updateWithCacheClear(existingId, settingsData, 'analytics_settings', ['dashboard']);
        } else {
            // Create new settings with automatic cache clearing
            settingsData.id = 'analytics_config';
            settingsData.createdAt = new Date().toISOString();
            result = await createWithCacheClear(settingsData, 'analytics_settings', ['dashboard']);
        }

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to save analytics settings'
            };
        }

        return {
            success: true,
            data: settingsData
        };
    } catch (error) {
        console.error('Error saving analytics settings:', error);
        return {
            success: false,
            error: 'Failed to save analytics settings',
            message: error.message
        };
    }
}

// ============================================================================
// CLUB MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Update club settings (unified function for all club updates)
 * @param {Object} data - Data to update
 * @param {string} type - Type of update: 'levels', 'rewards', 'points', 'integration', or 'full'
 * @returns {Promise<Object>} Update result
 */
export async function updateClub(data, type = 'full') {
    try {
        const timeNow = new Date().toISOString();

        // Import getClubSettings from club.js
        const { getClubSettings } = await import('@/lib/server/club.js');

        // Get current club settings
        const settingsResult = await getClubSettings();

        if (!settingsResult.success) {
            return { success: false, error: 'Failed to fetch current club settings' };
        }

        const currentSettings = settingsResult.data;
        let updatedSettings;

        // Build updated settings based on type
        switch (type) {
            case 'levels':
                updatedSettings = {
                    ...currentSettings,
                    levels: data
                };
                break;
            case 'rewards':
                updatedSettings = {
                    ...currentSettings,
                    rewards: data
                };
                break;
            case 'points':
                updatedSettings = {
                    ...currentSettings,
                    pointsPerEuro: data.pointsPerEuro || currentSettings.pointsPerEuro,
                    voucherExchangeRate: data.voucherExchangeRate || currentSettings.voucherExchangeRate
                };
                break;
            case 'integration':
                updatedSettings = {
                    ...currentSettings,
                    enabled: data.enabled !== undefined ? data.enabled : currentSettings.enabled,
                    enabledFeatures: data.enabledFeatures || currentSettings.enabledFeatures
                };
                break;
            case 'full':
            default:
                updatedSettings = {
                    ...currentSettings,
                    ...data
                };
                break;
        }

        // Ensure id is set to 'club_settings'
        const payload = {
            ...updatedSettings,
            id: 'club_settings',
            updatedAt: timeNow
        };

        // Get the database key for the existing record
        const dbKey = await DBService.getItemKey('id', 'club_settings', 'club');
        let result;

        if (dbKey) {
            // Update existing record using the database key and clear 'club' cache
            result = await updateWithCacheClear(dbKey, payload, 'club', ['club']);
        } else {
            // Create new record with id='club_settings' and clear 'club' cache
            payload.createdAt = timeNow;
            result = await createWithCacheClear(payload, 'club', ['club']);
        }

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to update club settings',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            data: result.data,
            message: 'Club settings updated successfully'
        };
    } catch (error) {
        console.error('Error updating club settings:', error);
        return {
            success: false,
            error: 'Failed to update club settings',
            message: error.message
        };
    }
}

// ============================================================================
// USERS CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new user utility function
 * @param {Object} userData - User data to create
 * @param {boolean} userData.sendEmail - Whether to send welcome email
 * @param {string} userData.plainPassword - Plain password for email (not stored)
 * @param {boolean} userData.confirmOverride - Whether to override existing user with role 'user'
 * @returns {Promise<Object>} Created user data
 */
export async function createUser(userData) {
    try {
        if (!userData || !userData.email) {
            return {
                success: false,
                error: 'Email is required'
            };
        }

        // Check if user already exists
        const existingUserResult = await getUser({ email: userData.email });

        if (existingUserResult?.success && existingUserResult?.data) {
            const existingUser = existingUserResult.data;

            // If user exists but is not a 'user' role, return error
            if (existingUser.role !== 'user') {
                return {
                    success: false,
                    error: 'User already exists with the current email address',
                    userExists: true,
                    existingRole: existingUser.role
                };
            }

            // If user exists with role 'user' but no confirmation provided
            if (existingUser.role === 'user' && !userData.confirmOverride) {
                return {
                    success: false,
                    error: 'User already exists as a client',
                    requiresConfirmation: true,
                    existingUser: {
                        id: existingUser.key || existingUser.id,
                        email: existingUser.email,
                        displayName: existingUser.displayName,
                        role: existingUser.role
                    }
                };
            }

            // If user exists with role 'user' and confirmation provided, update existing user
            if (existingUser.role === 'user' && userData.confirmOverride) {
                const userKey = existingUser.key || existingUser.id;

                // Merge existing data with new data
                const updateData = {
                    ...existingUser,
                    ...userData,
                    id: userKey,
                    key: userKey,
                    updatedAt: new Date().toISOString()
                };

                // Remove undefined values
                Object.keys(updateData).forEach((key) => {
                    if (updateData[key] === undefined) {
                        delete updateData[key];
                    }
                });

                // Update the existing user
                const updateResult = await updateWithCacheClear(userKey, updateData, 'users', ['users']);

                if (!updateResult?.success) {
                    return {
                        success: false,
                        error: 'Failed to update existing user'
                    };
                }

                // Send notification email if requested
                if (userData.sendEmail && userData.plainPassword) {
                    try {
                        const { sendUserCreatedEmail } = await import('@/lib/server/email.js');
                        await sendUserCreatedEmail(
                            userData.email,
                            userData.displayName || userData.email,
                            userData.plainPassword
                        );
                    } catch (emailError) {
                        console.error('Failed to send user updated email:', emailError);
                        // Don't fail the whole operation for email issues
                    }
                }

                return {
                    success: true,
                    data: updateResult.data,
                    message: 'Existing user updated successfully'
                };
            }
        }

        const timeNow = new Date().toISOString();
        const { sendEmail, plainPassword, confirmOverride, ...userDataToStore } = userData;

        // Import crypto functions
        const { encryptPassword, generateSalt } = await import('@/lib/crypt.js');
        const { createWallet, loadWeb3Config } = await import('@/lib/server/web3.js');

        // Validate password complexity
        const passwordValid = (pwd) => {
            return (
                pwd.length >= 8 &&
                pwd.length <= 32 &&
                /[a-z]/.test(pwd) &&
                /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
            );
        };

        // Handle password encryption if new password provided
        let passwordData = {};
        if (plainPassword) {
            if (!passwordValid(plainPassword)) {
                return {
                    success: false,
                    error: 'Password must be at least 8 characters with lowercase and one uppercase or special character'
                };
            }
            // Import crypto functions
            const { encryptPassword, generateSalt } = await import('@/lib/crypt.js');
            const passwordSalt = await generateSalt();
            const encryptedPassword = await encryptPassword(plainPassword, passwordSalt);
            passwordData = {
                password: encryptedPassword,
                salt: passwordSalt
            };
        }

        // Generate unique ID (matching handleRegistration pattern)
        const { v6: uuidv6 } = await import('uuid');
        const uniqueId = userDataToStore.uid || uuidv6();

        // Prepare user registration data (matching handleRegistration structure)
        const newUser = {
            id: uniqueId,
            displayName: userDataToStore.displayName || '',
            email: userDataToStore.email || '',
            phone: userDataToStore.phone || '',
            country: userDataToStore.country || '',
            password: passwordData.password || '',
            salt: passwordData.salt || '',
            role: userDataToStore.role || 'client',
            clubPoints: userDataToStore.clubPoints || 0,
            // User preferences (matching handleRegistration defaults)
            emailNotifications: userDataToStore.emailNotifications ?? true,
            orderUpdates: userDataToStore.orderUpdates ?? true,
            marketingEmails: userDataToStore.marketingEmails ?? true,
            newsletter: userDataToStore.newsletter ?? true,
            smsNotifications: userDataToStore.smsNotifications ?? false,
            createdAt: timeNow
        };

        // Setup web3 wallet if enabled
        try {
            const web3load = await loadWeb3Config();
            const web3active = web3load?.WEB3_ACTIVE > 0;

            if (web3active) {
                const web3Salt = await generateSalt();
                const web3create = await createWallet();

                if (web3create?.address && web3create?.privateKey) {
                    const encryptedPrivateKey = await encryptPassword(web3create.privateKey, web3Salt);
                    newUser.web3 = {
                        salt: web3Salt,
                        public_key: web3create.address,
                        private_key: encryptedPrivateKey,
                        createdAt: timeNow
                    };
                }
            }
        } catch (web3Error) {
            console.error('Web3 setup error:', web3Error);
            // Continue without web3 if it fails
        }

        const result = await createWithCacheClear(newUser, 'users', ['users']);

        // Send welcome email if requested and password was provided
        if (sendEmail && plainPassword && plainPassword.trim() && newUser.email && newUser.displayName) {
            try {
                const { sendUserCreatedEmail } = await import('@/lib/server/email.js');
                await sendUserCreatedEmail(newUser.email, newUser.displayName, plainPassword);
            } catch (emailError) {
                console.error('Failed to send user created email:', emailError);
                // Don't fail the user creation if email fails
            }
        }

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating user:', error);
        return {
            success: false,
            error: 'Failed to create user',
            message: error.message
        };
    }
}

/**
 * Update a user utility function
 * @param {string} userKey - User key (user.key || user.id)
 * @param {Object} userData - User data to update
 * @param {boolean} userData.sendEmail - Whether to send update notification email
 * @param {boolean} userData.passwordChanged - Whether password was changed
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUser(userKey, userData) {
    try {
        // Validate user key
        if (!userKey) {
            return {
                success: false,
                error: 'User not found',
                message: 'User key is required'
            };
        }

        const { sendEmail, passwordChanged, plainPassword, ...dataToUpdate } = userData;

        const updateData = {
            ...dataToUpdate,
            updatedAt: new Date().toISOString()
        };

        // If password is being changed, encrypt it
        if (passwordChanged && plainPassword) {
            // Validate password complexity
            const passwordValid = (pwd) => {
                return (
                    pwd.length >= 8 &&
                    pwd.length <= 32 &&
                    /[a-z]/.test(pwd) &&
                    /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
                );
            };

            if (!passwordValid(plainPassword)) {
                return {
                    success: false,
                    error: 'Password must be at least 8 characters with lowercase and one uppercase or special character'
                };
            }

            const { encryptPassword, generateSalt } = await import('@/lib/crypt.js');
            const salt = await generateSalt();
            const encryptedPassword = await encryptPassword(plainPassword, salt);
            updateData.password = encryptedPassword;
            updateData.salt = salt;
        }

        const result = await updateWithCacheClear(userKey, updateData, 'users', ['users']);

        // Send update email if requested and password was changed
        if (sendEmail && passwordChanged && updateData.email && updateData.displayName) {
            try {
                const { sendUserUpdatedEmail } = await import('@/lib/server/email.js');
                await sendUserUpdatedEmail(updateData.email, updateData.displayName, {
                    password: '********' // Don't send actual password in email
                });
            } catch (emailError) {
                console.error('Failed to send user updated email:', emailError);
                // Don't fail the update if email fails
            }
        }

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating user:', error);
        return {
            success: false,
            error: 'Failed to update user',
            message: error.message
        };
    }
}

/**
 * Delete a user utility function
 * @param {string} userKey - User key (user.key || user.id)
 * @returns {Promise<Object>} Delete result
 */
export async function deleteUser(userKey) {
    try {
        // Validate user key
        if (!userKey) {
            return {
                success: false,
                error: 'User not found',
                message: 'User key is required'
            };
        }

        const result = await deleteWithCacheClear(userKey, 'users', ['users']);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting user:', error);
        return {
            success: false,
            error: 'Failed to delete user',
            message: error.message
        };
    }
}

// ============================================================================
// ROLES CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new role utility function
 * @param {Object} roleData - Role data to create
 * @returns {Promise<Object>} Created role data
 */
export async function createRole(roleData) {
    try {
        const timeNow = new Date().toISOString();
        const newRole = {
            ...roleData,
            id: roleData.id || generateUID('ROLE'),
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(newRole, 'roles', ['users']);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating role:', error);
        return {
            success: false,
            error: 'Failed to create role',
            message: error.message
        };
    }
}

/**
 * Update a role utility function
 * @param {string} roleId - Id of the role to update
 * @param {Object} roleData - Role data to update
 * @returns {Promise<Object>} Updated role data
 */
export async function updateRole(roleId, roleData) {
    try {
        // First, find the role key using getItemKey function
        const roleKey = await DBService.getItemKey('id', roleId, 'roles');
        if (!roleKey) {
            return {
                success: false,
                error: 'Role not found',
                message: `Role with id '${roleId}' does not exist`
            };
        }

        const updateData = {
            ...roleData,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(roleKey, updateData, 'roles', ['users']);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating role:', error);
        return {
            success: false,
            error: 'Failed to update role',
            message: error.message
        };
    }
}

/**
 * Delete a role utility function
 * @param {string} roleId - ID of the role to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteRole(roleId) {
    try {
        // First, check if the role exists and get its data
        const existingRoleResponse = await DBService.readBy('id', roleId, 'roles');
        if (!existingRoleResponse?.success || !existingRoleResponse.data) {
            return {
                success: false,
                error: 'Role not found',
                message: `Role with id '${roleId}' does not exist`
            };
        }

        const existingRole = existingRoleResponse.data;

        // Check if the role is a default/system role (cannot be deleted)
        if (existingRole.isDefault === true) {
            return {
                success: false,
                error: 'Cannot delete default role',
                message: 'System roles cannot be deleted'
            };
        }

        // Get the actual database key for deletion
        const roleKey = await DBService.getItemKey('id', roleId, 'roles');
        if (!roleKey) {
            return {
                success: false,
                error: 'Role database key not found'
            };
        }

        const result = await deleteWithCacheClear(roleKey, 'roles', ['users']);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting role:', error);
        return {
            success: false,
            error: 'Failed to delete role',
            message: error.message
        };
    }
}

// ============================================================================
// CUSTOMERS CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new customer utility function
 * @param {Object} customerData - Customer data to create
 * @returns {Promise<Object>} Created customer data
 */
export async function createCustomer(customerData) {
    try {
        // Validate email
        if (!customerData.email || customerData.email.trim() === '') {
            return { success: false, error: 'Email is required. Please provide a valid email.' };
        }

        // Check for email uniqueness
        const customersResponse = await DBService.readAll('customers');
        if (!customersResponse?.success) {
            return { success: false, error: 'Failed to check existing customers' };
        }
        const allCustomers = customersResponse.data || {};
        const customersArray = Array.isArray(allCustomers) ? allCustomers : Object.values(allCustomers);
        const existingEmail = customersArray.find(
            (cust) => cust.email?.toLowerCase() === customerData.email.toLowerCase()
        );

        if (existingEmail) {
            return {
                success: false,
                error: 'A customer with this email already exists. Please use a different email.'
            };
        }

        const timeNow = new Date().toISOString();
        const newCustomer = {
            ...customerData,
            id: customerData.id || `CST_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            createdAt: timeNow,
            updatedAt: timeNow
        };

        const result = await createWithCacheClear(newCustomer, 'customers', ['orders']);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error creating customer:', error);
        return {
            success: false,
            error: 'Failed to create customer',
            message: error.message
        };
    }
}

/**
 * Update a customer utility function
 * @param {string} customerId - ID of the customer to update
 * @param {Object} customerData - Customer data to update
 * @returns {Promise<Object>} Updated customer data
 */
export async function updateCustomer(customerId, customerData) {
    try {
        // Validate email if provided
        if (customerData.email !== undefined) {
            if (!customerData.email || customerData.email.trim() === '') {
                return { success: false, error: 'Email is required. Please provide a valid email.' };
            }

            // Check for email uniqueness (exclude current customer)
            const customersResponse = await DBService.readAll('customers');
            if (!customersResponse?.success) {
                return { success: false, error: 'Failed to check existing customers' };
            }
            const allCustomers = customersResponse.data || {};
            const customersArray = Array.isArray(allCustomers) ? allCustomers : Object.values(allCustomers);
            const existingEmail = customersArray.find(
                (cust) => cust.email?.toLowerCase() === customerData.email.toLowerCase() && cust.key !== customerId
            );

            if (existingEmail) {
                return {
                    success: false,
                    error: 'A customer with this email already exists. Please use a different email.'
                };
            }
        }

        // First, find the customer key using getItemKey function
        const customerKey = customerId;
        if (!customerKey) {
            return {
                success: false,
                error: 'Customer not found',
                message: `Customer not found`
            };
        }

        const updateData = {
            ...customerData,
            updatedAt: new Date().toISOString()
        };

        const result = await updateWithCacheClear(customerKey, updateData, 'customers', ['orders', 'users']);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error updating customer:', error);
        return {
            success: false,
            error: 'Failed to update customer',
            message: error.message
        };
    }
}

/**
 * Delete a customer utility function
 * @param {string} customerId - ID of the customer to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCustomer(customerId) {
    try {
        // First, find the customer key using getItemKey function
        const customerKey = await DBService.getItemKey('id', customerId, 'customers');
        if (!customerKey) {
            return {
                success: false,
                error: 'Customer not found',
                message: `Customer with id '${customerId}' does not exist`
            };
        }

        const result = await deleteWithCacheClear(customerKey, 'customers', ['orders']);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('Error deleting customer:', error);
        return {
            success: false,
            error: 'Failed to delete customer',
            message: error.message
        };
    }
}

// ============================================================================
// FILE UPLOAD FUNCTION
// ============================================================================

/**
 * Upload files utility function
 * @param {Array|Object} files - Files to upload (array or single file)
 * @param {string} path - Upload path (default: 'uploads')
 * @param {Object} options - Upload options (e.g., userId)
 * @returns {Promise<Object>} Upload result with files array
 */
export async function uploadFiles(files, path = 'uploads', options = {}) {
    try {
        // Ensure files is an array
        const fileArray = Array.isArray(files) ? files : [files];

        if (fileArray.length === 0) {
            return {
                success: false,
                error: 'No files provided',
                files: [],
                count: 0
            };
        }

        const uploadedFiles = [];
        const maxFileSize = 50 * 1024 * 1024; // 50MB limit for larger files like videos

        // Comprehensive list of blocked extensions for security
        const blockedExtensions = [
            '.exe',
            '.bat',
            '.cmd',
            '.com',
            '.pif',
            '.scr',
            '.vbs',
            '.vb',
            '.js',
            '.jar',
            '.sh',
            '.ps1',
            '.msi',
            '.app',
            '.deb',
            '.rpm',
            '.dmg',
            '.pkg',
            '.bin',
            '.run',
            '.out',
            '.o',
            '.so',
            '.dll',
            '.sys',
            '.drv',
            '.ocx',
            '.cpl',
            '.gadget',
            '.workflow',
            '.action',
            '.lnk',
            '.url',
            '.website',
            '.hta',
            '.htaccess',
            '.htpasswd',
            '.asp',
            '.aspx',
            '.php',
            '.jsp',
            '.jspx',
            '.cgi',
            '.pl',
            '.py',
            '.rb',
            '.lua',
            '.tcl',
            '.awk',
            '.sed',
            '.elf',
            '.macho',
            '.dex',
            '.apk',
            '.ipa',
            '.xap'
        ];

        // Comprehensive list of blocked MIME types
        const suspiciousMimeTypes = [
            'application/x-executable',
            'application/x-msdownload',
            'application/x-msdos-program',
            'application/x-ms-dos-executable',
            'application/x-winexe',
            'application/x-msi',
            'application/x-msdownload',
            'application/x-sh',
            'application/x-shellscript',
            'application/x-csh',
            'application/x-tcsh',
            'application/x-perl',
            'application/x-python-code',
            'application/x-ruby',
            'application/x-httpd-php',
            'application/x-httpd-cgi',
            'application/x-javascript',
            'text/javascript',
            'application/javascript',
            'application/vnd.android.package-archive',
            'application/java-archive',
            'application/x-java-archive',
            'application/octet-stream-executable'
        ];

        // Safe file types with their categories for better organization
        const allowedFileTypes = {
            images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg', '.ico', '.avif'],
            documents: [
                '.pdf',
                '.doc',
                '.docx',
                '.xls',
                '.xlsx',
                '.ppt',
                '.pptx',
                '.txt',
                '.rtf',
                '.odt',
                '.ods',
                '.odp'
            ],
            audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.aiff'],
            video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp'],
            archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
            fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
            data: ['.json', '.xml', '.csv', '.yaml', '.yml', '.toml']
        };

        // Helper function to get file category
        const getFileCategory = (extension) => {
            for (const [category, extensions] of Object.entries(allowedFileTypes)) {
                if (extensions.includes(extension)) {
                    return category;
                }
            }
            return 'other';
        };

        for (const file of fileArray) {
            // Skip if no file or no name
            if (!file || !file.name) {
                continue;
            }

            // Validation: File size (different limits based on file type)
            const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
            const fileCategory = getFileCategory(fileExtension);

            // Different size limits based on file type
            let sizeLimit = maxFileSize; // Default 50MB
            if (fileCategory === 'images') {
                sizeLimit = 10 * 1024 * 1024; // 10MB for images
            } else if (fileCategory === 'audio' || fileCategory === 'video') {
                sizeLimit = 100 * 1024 * 1024; // 100MB for audio/video
            }

            if (file.size > sizeLimit) {
                const sizeLimitMB = Math.round(sizeLimit / (1024 * 1024));
                throw new Error(
                    `File ${file.name} is too large. Maximum size for ${fileCategory} files is ${sizeLimitMB}MB.`
                );
            }

            // Security checks: Extension
            if (blockedExtensions.includes(fileExtension)) {
                throw new Error(`File type ${fileExtension} is not allowed for security reasons.`);
            }

            // Additional check: Only allow known safe extensions or explicitly allowed types
            const allAllowedExtensions = Object.values(allowedFileTypes).flat();
            const isKnownSafeType = allAllowedExtensions.includes(fileExtension);
            const hasNoExtension = !fileExtension || fileExtension === '.';

            if (!isKnownSafeType && !hasNoExtension) {
                throw new Error(`File type ${fileExtension} is not supported. Please upload a supported file format.`);
            }

            // Security checks: MIME type
            if (suspiciousMimeTypes.includes(file.type)) {
                throw new Error(`File type ${file.type} is not allowed for security reasons.`);
            }

            try {
                // Generate unique filename with original extension
                const { v4: uuidv4 } = await import('uuid');
                const extension = file.name.split('.').pop();
                const uniqueFilename = `${uuidv4()}.${extension}`;
                const uploadPath = `${path}/${uniqueFilename}`;

                // Convert file to buffer for DBService.upload
                let buffer;
                if (file.buffer) {
                    // Already a buffer
                    buffer = file.buffer;
                } else if (file.arrayBuffer) {
                    // Web File API
                    const bytes = await file.arrayBuffer();
                    buffer = Buffer.from(bytes);
                } else if (Buffer.isBuffer(file)) {
                    // Already a Node.js Buffer
                    buffer = file;
                } else {
                    throw new Error(`Unsupported file format for ${file.name}`);
                }

                // Create a File-like object for DBService.upload
                const fileForUpload = {
                    buffer: buffer,
                    originalname: file.name,
                    mimetype: file.type || 'application/octet-stream',
                    size: file.size || buffer.length,
                    filename: uniqueFilename
                };

                // Upload using DBService
                const uploadResult = await DBService.upload(fileForUpload, uploadPath);

                // DBService.upload returns { success: true, data: { url, publicUrl, ... } }
                if (!uploadResult || !uploadResult.success || !uploadResult.data) {
                    throw new Error(`Failed to upload ${file.name}: ${uploadResult?.message || 'Unknown error'}`);
                }

                const uploadData = uploadResult.data;

                const rawUrl =
    uploadData.url ||
    uploadData.publicUrl ||
    uploadData.blobUrl ||
    `/uploads/${uniqueFilename}`;

const finalUrl = rawUrl.startsWith('http')
    ? rawUrl
    : `https://${rawUrl.replace(/^\/+/, '')}`;

                // Create response object with uploaded file info
                uploadedFiles.push({
                    id: uuidv4(),
                    filename: uniqueFilename,
                    originalName: file.name,
                    url: finalUrl,
                    size: uploadData.size || file.size || buffer.length,
                    type: file.type || 'application/octet-stream',
                    extension: fileExtension,
                    category: getFileCategory(fileExtension),
                    uploadedAt: new Date().toISOString(),
                    uploadPath: uploadData.path || uploadPath,
                    uploadedBy: options.userId || 'system',
                    metadata: uploadData.metadata,
                    provider: uploadData.metadata?.provider || 'unknown'
                });
            } catch (fileError) {
                console.error(`Error uploading file ${file.name}:`, fileError);
                throw new Error(`Failed to upload ${file.name}: ${fileError.message}`);
            }
        }

        return {
            success: true,
            files: uploadedFiles,
            count: uploadedFiles.length,
            message: `${uploadedFiles.length} file(s) uploaded successfully`
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            success: false,
            error: error.message || 'Failed to upload files',
            files: [],
            count: 0
        };
    }
}

// ============================================================================
// API MANAGEMENT FUNCTIONS
// ============================================================================

// ============================================================================
// API KEYS & ENDPOINTS MANAGEMENT FUNCTIONS
// ============================================================================
// NOTE: These functions are now exported from @/lib/server/endpoints.js

/**
 * @deprecated Use getAllAPIKeys from @/lib/server/endpoints.js instead
 * Get all API keys
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API keys data
 */
export async function getAllAPIKeys(params = {}) {
    const { getAllAPIKeys: endpointsGetAllAPIKeys } = await import('@/lib/server/endpoints.js');
    return await endpointsGetAllAPIKeys(params);
}

/**
 * @deprecated Use getAPIKeyByString from @/lib/server/endpoints.js instead
 * Get API key by key string (for authentication)
 * @param {string} apiKeyString - The API key string to validate
 * @returns {Promise<Object>} API key data
 */
export async function getAPIKeyByString(apiKeyString) {
    const { getAPIKeyByString: endpointsGetAPIKeyByString } = await import('@/lib/server/endpoints.js');
    return await endpointsGetAPIKeyByString(apiKeyString);
}

/**
 * @deprecated Use createAPIKey from @/lib/server/endpoints.js instead
 * Create a new API key
 * @param {Object} apiKeyData - API key data to create
 * @returns {Promise<Object>} Created API key data
 */
export async function createAPIKey(apiKeyData) {
    const { createAPIKey: endpointsCreateAPIKey } = await import('@/lib/server/endpoints.js');
    return await endpointsCreateAPIKey(apiKeyData);
}

/**
 * @deprecated Use updateAPIKey from @/lib/server/endpoints.js instead
 * Update an API key
 * @param {string} keyId - ID of the API key to update
 * @param {Object} apiKeyData - API key data to update
 * @returns {Promise<Object>} Updated API key data
 */
export async function updateAPIKey(keyId, apiKeyData) {
    const { updateAPIKey: endpointsUpdateAPIKey } = await import('@/lib/server/endpoints.js');
    return await endpointsUpdateAPIKey(keyId, apiKeyData);
}

/**
 * @deprecated Use deleteAPIKey from @/lib/server/endpoints.js instead
 * Delete an API key
 * @param {string} keyId - ID of the API key to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAPIKey(keyId) {
    const { deleteAPIKey: endpointsDeleteAPIKey } = await import('@/lib/server/endpoints.js');
    return await endpointsDeleteAPIKey(keyId);
}

/**
 * @deprecated Use incrementAPIKeyUsage from @/lib/server/endpoints.js instead
 * Increment API key usage
 * @param {string} apiKeyString - The API key string
 * @returns {Promise<Object>} Update result
 */
export async function incrementAPIKeyUsage(apiKeyString) {
    const { incrementAPIKeyUsage: endpointsIncrementAPIKeyUsage } = await import('@/lib/server/endpoints.js');
    return await endpointsIncrementAPIKeyUsage(apiKeyString);
}

/**
 * @deprecated Use getAPISettings from @/lib/server/endpoints.js instead
 * Get API settings
 * @returns {Promise<Object>} API settings data
 */
export async function getAPISettings() {
    const { getAPISettings: endpointsGetAPISettings } = await import('@/lib/server/endpoints.js');
    return await endpointsGetAPISettings();
}

/**
 * @deprecated Use updateAPISettings from @/lib/server/endpoints.js instead
 * Update API settings
 * @param {Object} settingsData - API settings data to save
 * @returns {Promise<Object>} Save result
 */
export async function updateAPISettings(settingsData) {
    const { updateAPISettings: endpointsUpdateAPISettings } = await import('@/lib/server/endpoints.js');
    return await endpointsUpdateAPISettings(settingsData);
}

/**
 * @deprecated Use getAllEndpoints from @/lib/server/endpoints.js instead
 * Get all endpoints
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Endpoints data
 */
export async function getAllEndpoints(params = {}) {
    const { getAllEndpoints: endpointsGetAllEndpoints } = await import('@/lib/server/endpoints.js');
    return await endpointsGetAllEndpoints(params);
}

/**
 * @deprecated Use getEndpointById from @/lib/server/endpoints.js instead
 * Get endpoint by ID
 * @param {string} endpointId - ID of the endpoint to get
 * @returns {Promise<Object>} Endpoint data
 */
export async function getEndpointById(endpointId) {
    const { getEndpointById: endpointsGetEndpointById } = await import('@/lib/server/endpoints.js');
    return await endpointsGetEndpointById(endpointId);
}

/**
 * @deprecated Use createCustomEndpoint from @/lib/server/endpoints.js instead
 * Create a custom endpoint
 * @param {Object} endpointData - Endpoint data to create
 * @returns {Promise<Object>} Created endpoint data
 */
export async function createCustomEndpoint(endpointData) {
    const { createCustomEndpoint: endpointsCreateCustomEndpoint } = await import('@/lib/server/endpoints.js');
    return await endpointsCreateCustomEndpoint(endpointData);
}

/**
 * @deprecated Use updateCustomEndpoint from @/lib/server/endpoints.js instead
 * Update a custom endpoint
 * @param {string} endpointId - ID of the endpoint to update
 * @param {Object} endpointData - Endpoint data to update
 * @returns {Promise<Object>} Updated endpoint data
 */
export async function updateCustomEndpoint(endpointId, endpointData) {
    const { updateCustomEndpoint: endpointsUpdateCustomEndpoint } = await import('@/lib/server/endpoints.js');
    return await endpointsUpdateCustomEndpoint(endpointId, endpointData);
}

/**
 * @deprecated Use deleteCustomEndpoint from @/lib/server/endpoints.js instead
 * Delete a custom endpoint
 * @param {string} endpointId - ID of the endpoint to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCustomEndpoint(endpointId) {
    const { deleteCustomEndpoint: endpointsDeleteCustomEndpoint } = await import('@/lib/server/endpoints.js');
    return await endpointsDeleteCustomEndpoint(endpointId);
}

// ============================================================================
// DATABASE UTILITY FUNCTIONS
// ============================================================================
// NOTE: These functions are now exported from @/lib/server/database.js

/**
 * @deprecated Use dbReadAll from @/lib/server/database.js instead
 * Read all items from a collection
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Collection data
 */
export async function dbReadAll(collectionName) {
    const { dbReadAll: dbReadAllFunc } = await import('@/lib/server/database.js');
    return await dbReadAllFunc(collectionName);
}

/**
 * @deprecated Use dbCreate from @/lib/server/database.js instead
 * Create item in collection
 * @param {Object} item - Item to create
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Created item
 */
export async function dbCreate(item, collectionName) {
    const { dbCreate: dbCreateFunc } = await import('@/lib/server/database.js');
    return await dbCreateFunc(item, collectionName);
}

/**
 * @deprecated Use dbDelete from @/lib/server/database.js instead
 * Delete item from collection
 * @param {string} itemId - ID of item to delete
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Delete result
 */
export async function dbDelete(itemId, collectionName) {
    const { dbDelete: dbDeleteFunc } = await import('@/lib/server/database.js');
    return await dbDeleteFunc(itemId, collectionName);
}

// ============================================================================
// WORKSPACE MANAGEMENT FUNCTIONS
// ============================================================================
// NOTE: These functions are now exported from @/lib/server/workspace.js

/**
 * @deprecated Use getAllTasks from @/lib/server/workspace.js instead
 * Get all tasks
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Tasks data
 */
export async function getAllTasks(options = {}) {
    const { getAllTasks: workspaceGetAllTasks } = await import('@/lib/server/workspace.js');
    return workspaceGetAllTasks(options);
}

/**
 * @deprecated Use createTask from @/lib/server/workspace.js instead
 * Create a new task
 * @param {Object} taskData - Task data to create
 * @returns {Promise<Object>} Created task data
 */
export async function createTask(taskData) {
    const { createTask: workspaceCreateTask } = await import('@/lib/server/workspace.js');
    return workspaceCreateTask(taskData);
}

/**
 * @deprecated Use updateTask from @/lib/server/workspace.js instead
 * Update a task
 * @param {string} taskId - ID of the task to update
 * @param {Object} taskData - Task data to update
 * @returns {Promise<Object>} Updated task data
 */
export async function updateTask(taskId, taskData) {
    const { updateTask: workspaceUpdateTask } = await import('@/lib/server/workspace.js');
    return workspaceUpdateTask(taskId, taskData);
}

/**
 * @deprecated Use deleteTask from @/lib/server/workspace.js instead
 * Delete a task
 * @param {string} taskId - ID of the task to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteTask(taskId) {
    const { deleteTask: workspaceDeleteTask } = await import('@/lib/server/workspace.js');
    return workspaceDeleteTask(taskId);
}

/**
 * @deprecated Use getAllAppointments from @/lib/server/workspace.js instead
 * Get all appointments
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Appointments data
 */
export async function getAllAppointments(options = {}) {
    const { getAllAppointments: workspaceGetAllAppointments } = await import('@/lib/server/workspace.js');
    return workspaceGetAllAppointments(options);
}

/**
 * @deprecated Use getAllScheduleItems from @/lib/server/workspace.js instead
 * Get all schedule items
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Schedule items data
 */
export async function getAllScheduleItems(options = {}) {
    const { getAllScheduleItems: workspaceGetAllScheduleItems } = await import('@/lib/server/workspace.js');
    return workspaceGetAllScheduleItems(options);
}

/**
 * @deprecated Use getAllAgenda from @/lib/server/workspace.js instead
 * Get all agenda items
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Agenda items data
 */
export async function getAllAgenda(options = {}) {
    const { getAllAgenda: workspaceGetAllAgenda } = await import('@/lib/server/workspace.js');
    return workspaceGetAllAgenda(options);
}

/**
 * @deprecated Use createScheduleItem from @/lib/server/workspace.js instead
 * Create a schedule item
 * @param {Object} scheduleData - Schedule item data to create
 * @returns {Promise<Object>} Created schedule item data
 */
export async function createScheduleItem(scheduleData) {
    const { createScheduleItem: workspaceCreateScheduleItem } = await import('@/lib/server/workspace.js');
    return workspaceCreateScheduleItem(scheduleData);
}

/**
 * @deprecated Use updateScheduleItem from @/lib/server/workspace.js instead
 * Update a schedule item
 * @param {string} scheduleId - ID of the schedule item to update
 * @param {Object} scheduleData - Schedule item data to update
 * @returns {Promise<Object>} Updated schedule item data
 */
export async function updateScheduleItem(scheduleId, scheduleData) {
    const { updateScheduleItem: workspaceUpdateScheduleItem } = await import('@/lib/server/workspace.js');
    return workspaceUpdateScheduleItem(scheduleId, scheduleData);
}

/**
 * @deprecated Use deleteScheduleItem from @/lib/server/workspace.js instead
 * Delete a schedule item
 * @param {string} scheduleId - ID of the schedule item to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteScheduleItem(scheduleId) {
    const { deleteScheduleItem: workspaceDeleteScheduleItem } = await import('@/lib/server/workspace.js');
    return workspaceDeleteScheduleItem(scheduleId);
}

/**
 * @deprecated Use createOrderTask from @/lib/server/workspace.js instead
 * Create an order task
 * @param {Object} taskData - Task data to create (with order context)
 * @returns {Promise<Object>} Created task data
 */
export async function createOrderTask(taskData) {
    const { createOrderTask: workspaceCreateOrderTask } = await import('@/lib/server/workspace.js');
    return workspaceCreateOrderTask(taskData);
} 