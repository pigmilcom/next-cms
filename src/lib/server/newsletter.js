// @/lib/server/newsletter.js
'use server';

import DBService from '@/data/rest.db.js';
import { getCustomers } from '@/lib/server/store.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';
import { generateUID } from '@/lib/shared/helpers.js';

// Initialize cache for newsletter operations
const { loadCacheData, saveCacheData } = await initCache('newsletter');
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// GENERIC CRUD FUNCTIONS
// ============================================================================

/**
 * Generic function to get all items with pagination
 * @param {string} collection - Collection name ('campaigns', 'subscribers', 'templates')
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} Items with pagination data
 */
export async function getAllItems(collection, page = 1, limit = 10, params = {}) {
    try {
        const cacheKey = `${collection}`;
        const cached = await loadCacheData(cacheKey, params);
        if (cached) return cached;

        const result = await DBService.readAll(collection);
        if (!result || !result.data) {
            return {
                success: true,
                data: [],
                pagination: {
                    currentPage: page,
                    totalItems: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }

        let items = [];
        if (result.data && result.data !== null) {
            if (Array.isArray(result.data)) {
                items = result.data;
            } else if (typeof result.data === 'object') {
                items = Object.entries(result.data).map(([key, item]) => ({
                    key,
                    ...item,
                    id: item.id || item._id || key
                }));
            }
        }

        // Sort by created date (newest first)
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        // Pagination - if limit is 0, return all items
        let paginatedData = items;
        let totalPages = 1;
        let hasNext = false;
        let hasPrev = false;

        if (limit > 0) {
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            paginatedData = items.slice(startIndex, endIndex);
            totalPages = Math.ceil(items.length / limit);
            hasNext = endIndex < items.length;
            hasPrev = page > 1;
        }

        const response = {
            success: true,
            data: paginatedData,
            pagination: {
                currentPage: page,
                totalItems: items.length,
                totalPages: totalPages,
                hasNext: hasNext,
                hasPrev: hasPrev
            }
        };

        await saveCacheData(cacheKey, params, response);
        return response;
    } catch (error) {
        console.error(`Error fetching ${collection}:`, error);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}

/**
 * Generic function to create an item
 * @param {string} collection - Collection name ('campaigns', 'subscribers', 'templates')
 * @param {Object} data - Item data to create
 * @param {Array} cacheInstances - Cache instances to clear (optional)
 * @returns {Promise<Object>} Created item data
 */
export async function createItem(collection, data, cacheInstances = []) {
    try {
        const prefixMap = {
            campaigns: 'CAMP',
            subscribers: 'SUB',
            templates: 'TPL'
        };

        const item = {
            id: generateUID(prefixMap[collection] || 'ITEM'),
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const instances = cacheInstances.length > 0 ? cacheInstances : ['newsletter', 'store', 'web_stats'];
        const result = await createWithCacheClear(item, collection, instances);

        if (result?.success) {
            return { success: true, data: result.data };
        }

        return { success: false, error: `Failed to create ${collection} item` };
    } catch (error) {
        console.error(`Error creating ${collection} item:`, error);
        return {
            success: false,
            error: `Failed to create ${collection} item`,
            message: error.message
        };
    }
}

/**
 * Generic function to update an item
 * @param {string} collection - Collection name ('campaigns', 'subscribers', 'templates')
 * @param {string} itemId - ID of the item to update
 * @param {Object} data - Item data to update
 * @param {Array} cacheInstances - Cache instances to clear (optional)
 * @returns {Promise<Object>} Updated item data
 */
export async function updateItem(collection, itemId, data, cacheInstances = []) {
    try {
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        const instances = cacheInstances.length > 0 ? cacheInstances : ['newsletter', 'store', 'web_stats'];
        const result = await updateWithCacheClear(itemId, updateData, collection, instances);

        if (result?.success) {
            return { success: true, data: result.data };
        }

        return { success: false, error: `Failed to update ${collection} item` };
    } catch (error) {
        console.error(`Error updating ${collection} item:`, error);
        return {
            success: false,
            error: `Failed to update ${collection} item`,
            message: error.message
        };
    }
}

/**
 * Generic function to delete an item
 * @param {string} collection - Collection name ('campaigns', 'subscribers', 'templates')
 * @param {string} itemId - ID of the item to delete
 * @param {Array} cacheInstances - Cache instances to clear (optional)
 * @returns {Promise<Object>} Delete result
 */
export async function deleteItem(collection, itemId, cacheInstances = []) {
    try {
        const instances = cacheInstances.length > 0 ? cacheInstances : ['newsletter', 'store', 'web_stats'];
        const result = await deleteWithCacheClear(itemId, collection, instances);

        if (result?.success) {
            return { success: true, data: result };
        }

        return { success: false, error: `Failed to delete ${collection} item` };
    } catch (error) {
        console.error(`Error deleting ${collection} item:`, error);
        return {
            success: false,
            error: `Failed to delete ${collection} item`,
            message: error.message
        };
    }
}

// ============================================================================
// CAMPAIGN FUNCTIONS (Wrappers for backward compatibility)
// ============================================================================

/**
 * Get all campaigns with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} Campaigns with pagination data
 */
export async function getAllCampaigns(page = 1, limit = 10, params = {}) {
    return await getAllItems('campaigns', page, limit, params);
}

/**
 * Get a single campaign by ID
 * @param {string} campaignId - ID of the campaign to fetch
 * @returns {Promise<Object>} Campaign data
 */
export async function getCampaign(campaignId) {
    try {
        if (!campaignId) {
            return {
                success: false,
                error: 'Campaign ID is required'
            };
        }

        const cacheKey = 'campaign';
        const cached = await loadCacheData(cacheKey, { id: campaignId });
        if (cached) return cached;

        const result = await DBService.read(campaignId, 'campaigns');

        if (!result?.success || !result.data) {
            return {
                success: false,
                error: 'Campaign not found'
            };
        }

        const response = {
            success: true,
            data: result.data
        };

        await saveCacheData(cacheKey, { id: campaignId }, response);
        return response;
    } catch (error) {
        console.error('Error fetching campaign:', error);
        return {
            success: false,
            error: 'Failed to fetch campaign'
        };
    }
}

/**
 * Create a new campaign
 * @param {Object} campaignData - Campaign data to create
 * @returns {Promise<Object>} Created campaign data
 */
export async function createCampaign(campaignData) {
    const data = {
        ...campaignData,
        status: campaignData.status || 'draft'
    };
    return await createItem('campaigns', data, ['newsletter', 'store']);
}

/**
 * Update a campaign
 * @param {string} campaignId - ID of the campaign to update
 * @param {Object} campaignData - Campaign data to update
 * @returns {Promise<Object>} Updated campaign data
 */
export async function updateCampaign(campaignId, campaignData) {
    return await updateItem('campaigns', campaignId, campaignData, ['newsletter', 'store']);
}

/**
 * Delete a campaign
 * @param {string} campaignId - ID of the campaign to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCampaign(campaignId) {
    return await deleteItem('campaigns', campaignId, ['newsletter', 'store']);
}

// ============================================================================
// SUBSCRIBER FUNCTIONS
// ============================================================================

/**
 * Subscribe to newsletter
 * Creates a new subscriber or reactivates an existing one
 * @param {Object} subscriberData - Subscriber data (email, name, source, etc.)
 * @returns {Promise<Object>} Result with success status and message
 */
export async function subscribeToNewsletter(subscriberData) {
    try {
        if (!subscriberData.email) {
            return {
                success: false,
                error: 'Email is required'
            };
        }

        // Check if subscriber already exists
        const existingSubscriber = await DBService.readBy('email', subscriberData.email, 'subscribers');

        if (existingSubscriber) {
            // If already subscribed and active
            if (existingSubscriber.status === 'active') {
                return {
                    success: false,
                    error: 'This email is already subscribed to our newsletter'
                };
            }

            // If previously unsubscribed, reactivate
            if (existingSubscriber.status === 'unsubscribed') {
                const updateData = {
                    status: 'active',
                    lastActivity: new Date().toISOString(),
                    resubscribedDate: new Date().toISOString()
                };

                const result = await updateItem('subscribers', existingSubscriber.id, updateData, [
                    'newsletter',
                    'subscribers',
                    'store'
                ]);

                if (result?.success) {
                    return {
                        success: true,
                        message: 'Welcome back! You have been resubscribed successfully'
                    };
                }
            }
        }

        // Create new subscriber with defaults matching user/customer preferences structure
        const newSubscriberData = {
            name: subscriberData.name || '',
            email: subscriberData.email,
            phone: subscriberData.phone || '',
            status: 'active',
            source: subscriberData.source || 'website',
            tags: subscriberData.tags || [],
            subscribedDate: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            preferences: subscriberData.preferences || {
                emailNotifications: true,
                orderUpdates: true,
                marketingEmails: true,
                newsletter: true,
                smsNotifications: false
            },
            metadata: {
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
                subscribedFrom: subscriberData.subscribedFrom || 'homepage',
                isCustomerAccount: false,
                ...subscriberData.metadata
            }
        };

        const result = await createItem('subscribers', newSubscriberData, ['newsletter', 'subscribers', 'store']);

        if (result?.success) {
            return {
                success: true,
                message: 'Successfully subscribed to our newsletter',
                data: result.data
            };
        }

        return {
            success: false,
            error: 'Failed to subscribe to newsletter'
        };
    } catch (error) {
        console.error('Error subscribing to newsletter:', error);
        return {
            success: false,
            error: 'An error occurred while subscribing'
        };
    }
}

/**
 * Create a new subscriber (admin function)
 * @param {Object} subscriberData - Subscriber data to create
 * @returns {Promise<Object>} Created subscriber data
 */
export async function createSubscriber(subscriberData) {
    const data = {
        name: subscriberData.name || '',
        email: subscriberData.email,
        phone: subscriberData.phone || '',
        status: subscriberData.status || 'active',
        source: subscriberData.source || 'manual',
        tags: subscriberData.tags || [],
        subscribedDate: subscriberData.subscribedDate || new Date().toISOString(),
        lastActivity: subscriberData.lastActivity || null,
        preferences: {
            emailNotifications: subscriberData.preferences?.emailNotifications ?? true,
            orderUpdates: subscriberData.preferences?.orderUpdates ?? true,
            marketingEmails: subscriberData.preferences?.marketingEmails ?? true,
            newsletter: subscriberData.preferences?.newsletter ?? true,
            smsNotifications: subscriberData.preferences?.smsNotifications ?? false
        },
        metadata: subscriberData.metadata || {},
        ...subscriberData
    };
    return await createItem('subscribers', data, ['newsletter', 'subscribers', 'store']);
}

/**
 * Update a subscriber
 * @param {string} subscriberId - ID of the subscriber to update
 * @param {Object} subscriberData - Subscriber data to update
 * @returns {Promise<Object>} Updated subscriber data
 */
export async function updateSubscriber(subscriberId, subscriberData) {
    return await updateItem('subscribers', subscriberId, subscriberData, ['newsletter', 'subscribers', 'store']);
}

/**
 * Delete a subscriber
 * @param {string} subscriberId - ID of the subscriber to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteSubscriber(subscriberId) {
    return await deleteItem('subscribers', subscriberId, ['newsletter', 'subscribers', 'store', 'users']);
}

/**
 * Generate unsubscribe link for email templates
 * @param {string} identifier - Email address or phone number
 * @param {string} type - Type of identifier ('email' or 'phone')
 * @param {string} baseUrl - Base URL of the site (optional, uses env if not provided)
 * @returns {Promise<string>} Unsubscribe URL
 */
export async function generateUnsubscribeLink(identifier, type = 'email', baseUrl = null) {
    if (!identifier) {
        return '';
    }

    const siteUrl =
        baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const encoded = Buffer.from(identifier).toString('base64');

    return `${siteUrl}/unsubscribe?id=${encoded}&type=${type}`;
}

/**
 * Generate preview link for campaign email/SMS templates
 * @param {string} campaignId - Campaign ID
 * @param {string} baseUrl - Base URL of the site (optional, uses env if not provided)
 * @returns {Promise<string>} Preview URL
 */
export async function generatePreviewLink(campaignId, baseUrl = null) {
    if (!campaignId) {
        return '';
    }

    const siteUrl =
        baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const encoded = Buffer.from(campaignId).toString('base64');

    return `${siteUrl}/preview?id=${encoded}`;
}

/**
 * Get a single subscriber by email or phone
 * Fetches data from both 'subscribers' and 'users' tables
 * Merges user data with subscriber data if found in both
 * Avoids duplicates by prioritizing subscriber table data and enriching with user data
 * @param {string} identifier - Email address or phone number to search for
 * @param {string} type - Type of identifier ('email' or 'phone')
 * @returns {Promise<Object>} Subscriber data (merged with user data if applicable) or error
 */
export async function getSubscriber(identifier, type = 'email') {
    try {
        if (!identifier) {
            return {
                success: false,
                error: 'Identifier is required'
            };
        }

        const field = type === 'phone' ? 'phone' : 'email';

        // Fetch from both tables in parallel
        const [subscriberResult, userResult] = await Promise.all([
            DBService.readBy(field, identifier, 'subscribers'),
            DBService.readBy('email', identifier, 'users')
        ]);

        const subscriber = subscriberResult;
        const user = userResult?.data;

        // If found in both tables, merge the data (subscriber takes priority, enriched with user data)
        if (subscriber && user) {
            return {
                success: true,
                data: {
                    ...subscriber,
                    // Enrich with user-specific data
                    displayName: subscriber.name || user.displayName || user.name || '',
                    role: user.role || 'user',
                    country: user.country || '',
                    isDeveloper: user.isDeveloper || false,
                    // Referral data from user
                    referralCode: user.referralCode || null,
                    referredBy: user.referredBy || null,
                    // Club data from user
                    club: user.club || {
                        clubMember: user.clubMember || false,
                        clubPoints: user.clubPoints || 0,
                        clubLevel: user.clubLevel || null,
                        totalSpent: user.totalSpent || 0,
                        pendingSpent: user.pendingSpent || 0,
                        claimedRewards: user.claimedRewards || [],
                        pointsHistory: user.pointsHistory || []
                    },
                    // Use user preferences (flat structure from users table)
                    preferences: {
                        emailNotifications:
                            user.emailNotifications ?? subscriber.preferences?.emailNotifications ?? true,
                        orderUpdates: user.orderUpdates ?? subscriber.preferences?.orderUpdates ?? true,
                        marketingEmails: user.marketingEmails ?? subscriber.preferences?.marketingEmails ?? true,
                        newsletter: user.newsletter ?? subscriber.preferences?.newsletter ?? true,
                        smsNotifications: user.smsNotifications ?? subscriber.preferences?.smsNotifications ?? false
                    },
                    isUser: true,
                    userKey: user.key || user.id
                }
            };
        }

        // If found only in subscribers table
        if (subscriber) {
            return {
                success: true,
                data: subscriber
            };
        }

        // If found only in users table, map to subscriber format
        if (user) {
            return {
                success: true,
                data: {
                    id: user.id || user.key,
                    email: user.email,
                    name: user.displayName || user.name || '',
                    displayName: user.displayName || user.name || '',
                    phone: user.phone || '',
                    country: user.country || '',
                    status: 'active',
                    source: 'user_account',
                    role: user.role || 'user',
                    isDeveloper: user.isDeveloper || false,
                    // Referral data
                    referralCode: user.referralCode || null,
                    referredBy: user.referredBy || null,
                    // Club data
                    club: user.club || {
                        clubMember: user.clubMember || false,
                        clubPoints: user.clubPoints || 0,
                        clubLevel: user.clubLevel || null,
                        totalSpent: user.totalSpent || 0,
                        pendingSpent: user.pendingSpent || 0,
                        claimedRewards: user.claimedRewards || [],
                        pointsHistory: user.pointsHistory || []
                    },
                    // User preferences (flat structure matching users.js)
                    preferences: {
                        emailNotifications: user.emailNotifications ?? true,
                        orderUpdates: user.orderUpdates ?? true,
                        marketingEmails: user.marketingEmails ?? true,
                        newsletter: user.newsletter ?? true,
                        smsNotifications: user.smsNotifications ?? false
                    },
                    subscribedDate: user.createdAt || new Date().toISOString(),
                    lastActivity: user.updatedAt || null,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    isUser: true,
                    userKey: user.key || user.id
                }
            };
        }

        return {
            success: false,
            error: 'Subscriber not found'
        };
    } catch (error) {
        console.error('Error fetching subscriber:', error);
        return {
            success: false,
            error: 'Failed to fetch subscriber'
        };
    }
}

/**
 * Update subscriber preferences (for unsubscribe page)
 * @param {string} identifier - Email or phone number
 * @param {Object} preferences - Updated preferences
 * @param {string} reason - Unsubscribe reason (optional)
 * @param {string} type - Type of identifier ('email' or 'phone')
 * @returns {Promise<Object>} Update result
 */
export async function updateSubscriberPreferences(identifier, preferences, reason = '', type = 'email') {
    try {
        if (!identifier) {
            return {
                success: false,
                error: 'Identifier is required'
            };
        }

        // Get the subscriber first to determine if it's a user or subscriber
        const subscriberResult = await getSubscriber(identifier, type);

        if (!subscriberResult?.success) {
            return {
                success: false,
                error: 'Subscriber not found'
            };
        }

        const subscriber = subscriberResult.data;

        // Prepare update data
        const updateData = {
            preferences: {
                emailNotifications: preferences.emailNotifications ?? false,
                orderUpdates: preferences.orderUpdates ?? false,
                marketingEmails: preferences.marketingEmails ?? false,
                newsletter: preferences.newsletter ?? false,
                smsNotifications: preferences.smsNotifications ?? false
            },
            lastActivity: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add unsubscribe reason if provided
        if (reason) {
            updateData.unsubscribeReason = reason;
            updateData.unsubscribedAt = new Date().toISOString();
        }

        // Check if all preferences are false (full unsubscribe)
        const allDisabled = Object.values(updateData.preferences).every((val) => val === false);
        if (allDisabled) {
            updateData.status = 'unsubscribed';
        } else {
            updateData.status = 'active';
        }

        // If it's a user account, update users table
        if (subscriber.isUser) {
            const userUpdateData = {
                emailNotifications: updateData.preferences.emailNotifications,
                orderUpdates: updateData.preferences.orderUpdates,
                marketingEmails: updateData.preferences.marketingEmails,
                newsletter: updateData.preferences.newsletter,
                smsNotifications: updateData.preferences.smsNotifications,
                updatedAt: updateData.updatedAt
            };

            if (reason) {
                userUpdateData.unsubscribeReason = reason;
                userUpdateData.unsubscribedAt = updateData.unsubscribedAt;
            }

            const result = await updateWithCacheClear(subscriber.userKey, userUpdateData, 'users', [
                'newsletter',
                'users',
                'subscribers',
                'web_stats'
            ]);

            if (result?.success) {
                return {
                    success: true,
                    message: 'Preferences updated successfully',
                    data: result.data
                };
            }
        } else {
            // Update subscribers table, 'web_stats'
            const result = await updateItem('subscribers', subscriber.id, updateData, [
                'newsletter',
                'subscribers',
                'store'
            ]);

            if (result?.success) {
                return {
                    success: true,
                    message: 'Preferences updated successfully',
                    data: result.data
                };
            }
        }

        return {
            success: false,
            error: 'Failed to update preferences'
        };
    } catch (error) {
        console.error('Error updating subscriber preferences:', error);
        return {
            success: false,
            error: 'Failed to update preferences'
        };
    }
}

/**
 * Get all subscribers with pagination
 * Fetches data from both 'subscribers' table and customers (users with orders) from getCustomers
 * Merges customer/user data (club points, orders, preferences, referrals) into subscribers data
 * Returns all customers as subscribers even if subscribers table is empty
 * Avoids duplicates where email matches between subscribers and customers
 * Updates subscribers DB if user email exists in both databases with latest preferences
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (use 0 for all items, default: 10)
 * @param {Object} params - Additional query parameters
 * @param {string} params.startDate - Filter subscribers from this date (YYYY-MM-DD) (optional)
 * @param {string} params.endDate - Filter subscribers to this date (YYYY-MM-DD) (optional)
 * @returns {Promise<Object>} Subscribers with pagination data (includes customer/user data)
 */
export async function getAllSubscribers(page = 1, limit = 10, params = {}) {
    try {
        const { search = '', status = '', startDate = '', endDate = '', ...restParams } = params;
        const cacheKey = 'subscribers';
        const cached = await loadCacheData(cacheKey, params);
        if (cached) return cached;

        // Fetch subscribers from subscribers table
        const subscribersResult = await DBService.readAll('subscribers');
        let subscribersFromTable = [];

        if (subscribersResult?.data) {
            if (Array.isArray(subscribersResult.data)) {
                subscribersFromTable = subscribersResult.data;
            } else if (typeof subscribersResult.data === 'object') {
                subscribersFromTable = Object.entries(subscribersResult.data).map(([key, subscriber]) => ({
                    key,
                    ...subscriber,
                    id: subscriber.id || subscriber._id || key
                }));
            }
        }

        // Fetch customers data (with preferences) using getCustomers from store.js
        const customersResult = await getCustomers({ limit: 0 });
        const allCustomers = customersResult?.success ? customersResult.data || [] : [];

        // Create map of subscribers from table for quick lookup
        const subscribersMap = new Map();
        subscribersFromTable.forEach((sub) => {
            if (sub.email) {
                subscribersMap.set(sub.email.toLowerCase(), sub);
            }
        });

        // Process customers and merge with subscribers data
        const processedSubscribers = [];
        const subscribersToUpdate = []; // Track subscribers that need DB updates

        for (const customer of allCustomers) {
            if (!customer.email) continue;
            if (customer.role && customer.role !== 'user') continue;

            const emailLower = customer.email.toLowerCase();
            const existingSubscriber = subscribersMap.get(emailLower);

            // Prepare customer preferences data matching getUser/getCustomers structure
            const customerPreferences = {
                emailNotifications: customer.preferences?.emailNotifications ?? true,
                orderUpdates: customer.preferences?.orderUpdates ?? true,
                marketingEmails: customer.preferences?.marketingEmails ?? true,
                newsletter: customer.preferences?.newsletter ?? true,
                smsNotifications: customer.preferences?.smsNotifications ?? false
            };

            // Prepare complete customer data including club, referral, and user info
            const customerData = {
                key: customer.key || customer.id,
                id: customer.id,
                name: customer.displayName || customer.email,
                displayName: customer.displayName || customer.email,
                firstName: customer.firstName || customer.displayName?.split(' ')[0] || '',
                lastName: customer.lastName || customer.displayName?.split(' ').slice(1).join(' ') || '',
                email: customer.email,
                phone: customer.phone || '',
                country: customer.country || '',
                role: customer.role || 'user',
                isDeveloper: customer.isDeveloper || false,
                // Referral data
                referralCode: customer.referralCode || null,
                referredBy: customer.referredBy || null,
                // Club data from getCustomers/getUser
                club: {
                    clubMember: customer.club?.clubMember || false,
                    clubPoints: customer.club?.clubPoints || 0,
                    clubLevel: customer.club?.clubLevel || null,
                    totalSpent: customer.club?.totalSpent || customer.totalSpent || 0,
                    pendingSpent: customer.club?.pendingSpent || 0,
                    claimedRewards: customer.club?.claimedRewards || [],
                    pointsHistory: customer.club?.pointsHistory || []
                },
                // Order statistics
                orderCount: customer.orderCount || 0,
                totalSpent: customer.totalSpent || 0,
                lastOrderDate: customer.lastOrderDate || null,
                orders: customer.orders || [],
                // Dates
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt
            };

            if (existingSubscriber) {
                // User exists in both databases - merge data and update subscribers DB
                const mergedData = {
                    ...existingSubscriber,
                    ...customerData,
                    // Preserve subscriber-specific fields
                    subscribedDate: existingSubscriber.subscribedDate || customer.createdAt,
                    status: existingSubscriber.status || 'active',
                    source: existingSubscriber.source || 'customer-account',
                    tags: existingSubscriber.tags || [],
                    lastActivity: customer.updatedAt || existingSubscriber.lastActivity,
                    preferences: customerPreferences,
                    metadata: {
                        ...(existingSubscriber.metadata || {}),
                        customerId: customer.id,
                        isCustomerAccount: true,
                        orderCount: customer.orderCount || 0,
                        totalSpent: customer.totalSpent || 0,
                        lastOrderDate: customer.lastOrderDate || null,
                        clubMember: customer.club?.clubMember || false,
                        clubPoints: customer.club?.clubPoints || 0,
                        clubLevel: customer.club?.clubLevel || null
                    }
                };

                processedSubscribers.push(mergedData);
                subscribersMap.delete(emailLower); // Remove from map to avoid duplicates

                // Queue for DB update if preferences or info changed
                const needsUpdate =
                    JSON.stringify(existingSubscriber.preferences) !== JSON.stringify(customerPreferences) ||
                    existingSubscriber.name !== mergedData.name ||
                    existingSubscriber.phone !== mergedData.phone;

                if (needsUpdate) {
                    subscribersToUpdate.push({
                        id: existingSubscriber.id || existingSubscriber.key,
                        data: {
                            name: mergedData.name,
                            phone: mergedData.phone,
                            preferences: customerPreferences,
                            metadata: mergedData.metadata,
                            lastActivity: new Date().toISOString()
                        }
                    });
                }
            } else {
                // Customer not in subscribers table - add as new subscriber with complete customer data
                processedSubscribers.push({
                    ...customerData,
                    // Add subscriber-specific fields
                    status: 'active',
                    source: 'customer-account',
                    subscribedDate: customer.createdAt || new Date().toISOString(),
                    lastActivity: customer.updatedAt || customer.createdAt || new Date().toISOString(),
                    tags: [],
                    preferences: customerPreferences,
                    metadata: {
                        customerId: customer.id,
                        isCustomerAccount: true,
                        orderCount: customer.orderCount || 0,
                        totalSpent: customer.totalSpent || 0,
                        lastOrderDate: customer.lastOrderDate || null,
                        clubMember: customer.club?.clubMember || false,
                        clubPoints: customer.club?.clubPoints || 0,
                        clubLevel: customer.club?.clubLevel || null
                    }
                });
            }
        }

        // Add remaining subscribers from table (those without customer accounts)
        subscribersMap.forEach((sub) => {
            processedSubscribers.push({
                ...sub,
                preferences: {
                    emailNotifications: sub.preferences?.emailNotifications ?? true,
                    orderUpdates: sub.preferences?.orderUpdates ?? true,
                    marketingEmails: sub.preferences?.marketingEmails ?? true,
                    newsletter: sub.preferences?.newsletter ?? true,
                    smsNotifications: sub.preferences?.smsNotifications ?? false,
                    promotions: sub.preferences?.promotions ?? true,
                    newProducts: sub.preferences?.newProducts ?? true
                },
                metadata: {
                    ...(sub.metadata || {}),
                    isCustomerAccount: false
                }
            });
        });

        // Update subscribers in database if needed (async, non-blocking)
        if (subscribersToUpdate.length > 0) {
            Promise.all(
                subscribersToUpdate.map((update) =>
                    updateItem('subscribers', update.id, update.data, ['newsletter', 'subscribers'])
                )
            ).catch((error) => {
                console.error('Error updating subscribers:', error);
            });
        }

        // Sort by subscribed date (newest first)
        processedSubscribers.sort((a, b) => {
            const dateA = new Date(a.subscribedDate || 0);
            const dateB = new Date(b.subscribedDate || 0);
            return dateB - dateA;
        });

        // Apply date range filter
        let finalSubscribers = processedSubscribers;
        if (startDate || endDate) {
            finalSubscribers = processedSubscribers.filter((subscriber) => {
                const subDate = new Date(
                    subscriber.subscribedDate || subscriber.createdAt || subscriber.created_at || subscriber.date
                );
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                // Set end date to end of day for inclusive filtering
                if (end) {
                    end.setHours(23, 59, 59, 999);
                }

                return (!start || subDate >= start) && (!end || subDate <= end);
            });
        }

        // Pagination - handle limit = 0 as "return all items"
        const totalItems = finalSubscribers.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedData = limit > 0 ? finalSubscribers.slice(startIndex, endIndex) : finalSubscribers;

        const response = {
            success: true,
            data: paginatedData,
            pagination: {
                currentPage: page,
                totalItems: totalItems,
                totalPages: totalPages,
                hasNext: limit > 0 ? endIndex < totalItems : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        await saveCacheData(cacheKey, params, response);
        return response;
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        return {
            success: false,
            error: error.message,
            data: [],
            pagination: {
                currentPage: page,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }
}

// ============================================================================
// TEMPLATE FUNCTIONS
// ============================================================================

/**
 * Get all templates with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} Templates with pagination data
 */
export async function getAllTemplates(page = 1, limit = 10, params = {}) {
    return await getAllItems('templates', page, limit, params);
}

/**
 * Get templates by type (email or sms)
 * @param {string} type - Template type ('email' or 'sms')
 * @returns {Promise<Object>} Templates filtered by type
 */
export async function getTemplatesByType(type = 'email') {
    try {
        const cacheKey = `templates_type_${type}`;
        const cached = await loadCacheData(cacheKey, { duration: '15M' });
        if (cached) return cached;

        const result = await DBService.readAll('templates');
        if (!result || !result.data) {
            return { success: true, data: [] };
        }

        let templates = [];
        if (result.data && result.data !== null) {
            if (Array.isArray(result.data)) {
                templates = result.data;
            } else if (typeof result.data === 'object') {
                templates = Object.entries(result.data).map(([key, template]) => ({
                    key,
                    ...template
                }));
            }
        }

        const filteredTemplates = templates
            .filter((t) => t.type === type)
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const response = {
            success: true,
            data: filteredTemplates
        };

        await saveCacheData(cacheKey, { duration: '15M' }, response);
        return response;
    } catch (error) {
        console.error('Error fetching templates by type:', error);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}

/**
 * Create a new template
 * @param {Object} templateData - Template data to create
 * @returns {Promise<Object>} Created template data
 */
export async function createTemplate(templateData) {
    return await createItem('templates', templateData, ['templates', 'newsletter', 'store']);
}

/**
 * Update a template
 * @param {string} templateId - ID of the template to update
 * @param {Object} templateData - Template data to update
 * @returns {Promise<Object>} Updated template data
 */
export async function updateTemplate(templateId, templateData) {
    return await updateItem('templates', templateId, templateData, ['templates', 'newsletter', 'store']);
}

/**
 * Delete a template
 * @param {string} templateId - ID of the template to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteTemplate(templateId) {
    return await deleteItem('templates', templateId, ['templates', 'newsletter', 'store']);
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get campaign analytics
 * @returns {Promise<Object>} Campaign analytics data
 */
export async function getCampaignAnalytics() {
    try {
        const cacheKey = 'campaign_analytics';
        const cached = await loadCacheData(cacheKey);
        if (cached) return cached;

        const campaignsResult = await DBService.readAll('campaigns');
        // Use getAllSubscribers to get merged data from both subscribers and users tables
        const subscribersResult = await getAllSubscribers(1, 0);

        let campaigns = [];
        if (campaignsResult.data && campaignsResult.data !== null) {
            if (Array.isArray(campaignsResult?.data)) {
                campaigns = campaignsResult.data;
            } else if (typeof campaignsResult?.data === 'object') {
                campaigns = Object.values(campaignsResult.data);
            }
        }

        let subscribers = [];
        if (subscribersResult?.success && subscribersResult.data && subscribersResult.data !== null) {
            if (Array.isArray(subscribersResult?.data)) {
                subscribers = subscribersResult.data;
            } else if (typeof subscribersResult?.data === 'object') {
                subscribers = Object.values(subscribersResult.data);
            }
        }

        const totalCampaigns = campaigns.length;
        const sentCampaigns = campaigns.filter((c) => c.status === 'sent').length;
        const draftCampaigns = campaigns.filter((c) => c.status === 'draft').length;
        const totalSubscribers = subscribers.filter((s) => s.status === 'active').length;

        let totalSent = 0;
        let totalOpened = 0;
        let totalClicked = 0;

        campaigns.forEach((campaign) => {
            if (campaign.stats) {
                totalSent += campaign.stats.sent || 0;
                totalOpened += campaign.stats.opened || 0;
                totalClicked += campaign.stats.clicked || 0;
            }
        });

        const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;
        const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0;

        const response = {
            success: true,
            data: {
                totalCampaigns,
                sentCampaigns,
                draftCampaigns,
                totalSubscribers,
                totalSent,
                totalOpened,
                totalClicked,
                openRate,
                clickRate,
                recentCampaigns: campaigns.slice(0, 5)
            }
        };

        await saveCacheData(cacheKey, { duration: '15M' }, response);
        return response;
    } catch (error) {
        console.error('Error fetching campaign analytics:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
