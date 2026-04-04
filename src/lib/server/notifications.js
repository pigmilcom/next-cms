// @/lib/server/notifications.js

'use server';

import DBService from '@/data/rest.db.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize cache utilities for notifications data
const { loadCacheData, saveCacheData } = await initCache('notifications');

// Import universal cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = cacheFunctions();

// ============================================================================
// NOTIFICATIONS MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Clean up expired notifications utility function
 * @returns {Promise<Object>} Cleanup result
 */
export async function cleanupExpiredNotifications() {
    try {
        const allNotifications = await DBService.readAll('notifications');
        const now = new Date();
        let deletedCount = 0;

        for (const [id, notification] of Object.entries(allNotifications || {})) {
            // Delete notifications that have expired
            if (notification.expiresAt && new Date(notification.expiresAt) < now) {
                await deleteWithCacheClear(id, 'notifications');
                deletedCount++;
            }
            // Delete old read notifications (older than 30 days)
            else if (notification.isRead && notification.readAt) {
                const readDate = new Date(notification.readAt);
                const daysDiff = (now - readDate) / (1000 * 60 * 60 * 24);
                if (daysDiff > 30) {
                    await deleteWithCacheClear(id, 'notifications');
                    deletedCount++;
                }
            }
        }

        return { success: true, data: { deletedCount } };
    } catch (error) {
        console.error('Error cleaning up expired notifications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get unread notifications count utility function
 * @param {string} userId - ID of the user (null for global notifications)
 * @returns {Promise<Object>} Unread count data
 */
export const getUnreadNotificationsCount = async (userId = null) => {
    try {
        // Check cache first
        const params = { userId };
        const cached = await loadCacheData('unread_all', params);
        if (cached) return cached;

        const notificationsResult = await getAllNotifications({
            userId,
            unreadOnly: true
        });

        if (!notificationsResult.success) {
            return { success: false, error: notificationsResult.error };
        }

        const count = notificationsResult.data.length;
        const result = { success: true, data: { count } };

        // Cache the result
        await saveCacheData('unread_all', params, result);
        return result;
    } catch (error) {
        console.error('Error getting unread notifications count:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Mark notification as read
 * @param {string} notificationId - ID of the notification to mark as read
 * @param {string} userId - ID of the user marking as read (for audit)
 * @returns {Promise<Object>} Update result
 */
export async function markNotificationAsRead(notificationId, userId = null) {
    try {
        const existingNotification = await DBService.read(notificationId, 'notifications');
        if (!existingNotification) {
            return { success: false, error: 'Notification not found' };
        }

        const updatedNotification = {
            ...existingNotification,
            isRead: true,
            readAt: new Date().toISOString(),
            readBy: userId,
            updatedAt: new Date().toISOString()
        };

        const _result = await updateWithCacheClear(notificationId, updatedNotification, 'notifications');
        return { success: true, data: updatedNotification };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark multiple notifications as read
 * @param {Array} notificationIds - Array of notification IDs to mark as read
 * @param {string} userId - ID of the user marking as read
 * @returns {Promise<Object>} Update result
 */
export async function markMultipleNotificationsAsRead(notificationIds, userId = null) {
    try {
        const results = [];

        for (const notificationId of notificationIds) {
            const result = await markNotificationAsRead(notificationId, userId);
            results.push({ notificationId, ...result });
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        return {
            success: failCount === 0,
            data: {
                total: notificationIds.length,
                success: successCount,
                failed: failCount,
                results
            }
        };
    } catch (error) {
        console.error('Error marking multiple notifications as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all notifications
 * Server-side function to fetch all notifications with filtering
 * @param {Object} params - Query parameters
 * @param {string} params.userId - User ID to filter (null for global notifications)
 * @param {boolean} params.unreadOnly - Filter unread only
 * @param {string} params.type - Filter by type
 * @param {number} params.limit - Limit results
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Notifications data
 */
export const getAllNotifications = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('notify_all', params);
        if (cachedData) return cachedData;

        const { userId = null, unreadOnly = false, type = null, limit = null } = params;

        const notificationsResponse = await DBService.readAll('notifications');

        if (
            !notificationsResponse?.success ||
            !notificationsResponse.data ||
            Object.keys(notificationsResponse.data).length === 0
        ) {
            return { success: true, data: [] };
        }

        const allNotifications = notificationsResponse.data;
        let notifications = Object.entries(allNotifications).map(([key, notification]) => ({
            ...notification,
            key,
            id: notification.id || notification._id || key
        }));

        // Filter by user (null userId means global notifications)
        if (userId !== undefined) {
            notifications = notifications.filter(
                (notification) => notification.userId === userId || notification.userId === null
            );
        }

        // Filter by read status
        if (unreadOnly) {
            notifications = notifications.filter((notification) => !notification.isRead);
        }

        // Filter by type
        if (type) {
            notifications = notifications.filter((notification) => notification.type === type);
        }

        // Sort by createdAt (newest first)
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply limit
        if (limit) {
            notifications = notifications.slice(0, limit);
        }

        const result = { success: true, data: notifications };

        // Cache the result
        await saveCacheData('notify_all', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return {
            success: false,
            error: 'Failed to fetch notifications',
            message: error.message,
            data: []
        };
    }
};

/**
 * Auto-mark order notifications as read when status changes
 * @param {string} orderId - ID of the order
 * @param {string} newStatus - New order status
 * @param {string} userId - ID of the user who changed the status
 * @returns {Promise<Object>} Update result
 */
export async function autoMarkOrderNotificationsRead(orderId, newStatus, userId) {
    try {
        // Get all notifications related to this order
        const allNotifications = await DBService.readAll('notifications');
        const orderNotifications = Object.entries(allNotifications || {})
            .filter(
                ([_id, notification]) =>
                    notification.relatedId === orderId &&
                    notification.type === 'order' &&
                    !notification.isRead &&
                    notification.autoMarkRead
            )
            .map(([id]) => id);

        if (orderNotifications.length === 0) {
            return { success: true, data: { marked: 0 } };
        }

        // Mark notifications as read if status is not 'pending' or 'unconfirmed'
        if (newStatus !== 'pending' && newStatus !== 'unconfirmed') {
            const result = await markMultipleNotificationsAsRead(orderNotifications, userId);
            return result;
        }

        return { success: true, data: { marked: 0, reason: 'Status still pending/unconfirmed' } };
    } catch (error) {
        console.error('Error auto-marking order notifications as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data to create
 * @returns {Promise<Object>} Created notification data
 */
export async function createNotification(notificationData) {
    try {
        const notification = {
            id: `notification_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            title: notificationData.title || 'New Notification',
            message: notificationData.message || '',
            type: notificationData.type || 'info', // 'order', 'security', 'report', 'maintenance', 'info', 'warning', 'error'
            priority: notificationData.priority || 'medium', // 'low', 'medium', 'high', 'critical'
            userId: notificationData.userId || null, // null for global notifications
            isRead: false,
            requiresAction: notificationData.requiresAction || false,
            actionLink: notificationData.actionLink || null,
            actionText: notificationData.actionText || null,
            autoMarkRead: notificationData.autoMarkRead || false,
            relatedId: notificationData.relatedId || null, // Related order ID, user ID, etc.
            relatedType: notificationData.relatedType || null, // 'order', 'user', 'backup', etc.
            metadata: notificationData.metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            expiresAt: notificationData.expiresAt || null
        };

        const _result = await createWithCacheClear(notification, 'notifications');
        return { success: true, data: notification };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update a notification
 * @param {string} notificationId - ID of the notification to update
 * @param {Object} updateData - Notification data to update
 * @returns {Promise<Object>} Updated notification data
 */
export async function updateNotification(notificationId, updateData) {
    try {
        const existingNotification = await DBService.read(notificationId, 'notifications');
        if (!existingNotification) {
            return { success: false, error: 'Notification not found' };
        }

        const updatedNotification = {
            ...existingNotification,
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        const _result = await updateWithCacheClear(notificationId, updatedNotification, 'notifications');
        return { success: true, data: updatedNotification };
    } catch (error) {
        console.error('Error updating notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a notification
 * @param {string} notificationId - ID of the notification to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteNotification(notificationId) {
    try {
        const result = await deleteWithCacheClear(notificationId, 'notifications');
        return { success: true, data: result };
    } catch (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create order notification
 * @param {Object} orderData - Order data to create notification for
 * @param {string} orderType - 'online' or 'manual'
 * @returns {Promise<Object>} Created notification data
 */
export async function createOrderNotification(orderData, orderType = 'online') {
    try {
        // Only create notifications for online orders
        if (orderType !== 'online') {
            return { success: true, data: null, message: 'No notification created for manual order' };
        }

        // Extract email from multiple possible locations
        const customerEmail = orderData.email || orderData.cst_email || orderData.customer?.email || 'customer';
        const customerName =
            orderData.customerName ||
            orderData.cst_name ||
            (orderData.customer ? `${orderData.customer.firstName} ${orderData.customer.lastName}` : 'customer');

        const notification = {
            title: `New Online Order #${orderData.orderNumber || orderData.id}`,
            message: `A new order has been placed by ${customerName} for $${orderData.total || orderData.finalTotal || orderData.amount || '0.00'}`,
            type: 'order',
            priority: 'high',
            userId: null, // Global notification for all admins
            requiresAction: true,
            actionLink: `/admin/store/orders?orderId=${orderData.id}`,
            actionText: 'View Order',
            autoMarkRead: true, // Will be marked as read when order status changes
            relatedId: orderData.id,
            relatedType: 'order',
            metadata: {
                orderNumber: orderData.orderNumber || orderData.id,
                customerEmail: customerEmail,
                orderTotal: orderData.total || orderData.finalTotal || orderData.amount,
                orderStatus: orderData.status || 'pending',
                orderType: orderType, // Mark as online order
                createdAt: new Date().toISOString()
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating order notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create system notification
 * @param {Object} systemData - System notification data
 * @returns {Promise<Object>} Created notification data
 */
export async function createSystemNotification(systemData) {
    try {
        const {
            type,
            title,
            message,
            priority = 'medium',
            requiresAction = false,
            actionLink = null,
            actionText = null
        } = systemData;

        const notification = {
            title: title || 'System Notification',
            message: message || '',
            type: type || 'maintenance',
            priority,
            userId: null, // Global notification
            requiresAction,
            actionLink,
            actionText,
            autoMarkRead: !requiresAction, // Auto-mark if no action required
            metadata: {
                systemType: type,
                ...systemData.metadata
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating system notification:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// NAVIGATION NOTIFICATION BADGE FUNCTIONS
// ============================================================================

/**
 * Get notification count for Store Orders
 * Returns count of unread order notifications (online orders only)
 * @param {string} userId - ID of the user (null for global notifications)
 * @returns {Promise<Object>} Order notifications count
 */
export const getStoreOrdersNotificationCount = async (userId = null) => {
    try {
        // Check cache first
        const params = { userId };
        const cached = await loadCacheData('unread_orders', params);
        if (cached) return cached;

        const result = await getAllNotifications({
            userId,
            unreadOnly: true,
            type: 'order'
        });

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // Filter for online orders only (not manual orders)
        const onlineOrderNotifications = result.data.filter(
            (notification) => notification.metadata?.orderType !== 'manual' && notification.relatedType === 'order'
        );

        const response = {
            success: true,
            data: {
                count: onlineOrderNotifications.length,
                notifications: onlineOrderNotifications
            }
        };

        // Cache the result
        await saveCacheData('unread_orders', params, response);
        return response;
    } catch (error) {
        console.error('Error getting store orders notification count:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get notification count for System (Settings & Maintenance)
 * Returns count of unread system, security, and maintenance notifications
 * @param {string} userId - ID of the user (null for global notifications)
 * @returns {Promise<Object>} System notifications count
 */
export const getSystemNotificationCount = async (userId = null) => {
    try {
        // Check cache first
        const params = { userId };
        const cached = await loadCacheData('unread_system', params);
        if (cached) return cached;

        const result = await getAllNotifications({
            userId,
            unreadOnly: true
        });

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // Filter for system-related notifications
        const systemNotifications = result.data.filter((notification) =>
            ['security', 'maintenance', 'error', 'warning'].includes(notification.type)
        );

        const response = {
            success: true,
            data: {
                count: systemNotifications.length,
                notifications: systemNotifications,
                breakdown: {
                    security: systemNotifications.filter((n) => n.type === 'security').length,
                    maintenance: systemNotifications.filter((n) => n.type === 'maintenance').length,
                    errors: systemNotifications.filter((n) => n.type === 'error').length,
                    warnings: systemNotifications.filter((n) => n.type === 'warning').length
                }
            }
        };

        // Cache the result
        await saveCacheData('unread_system', params, response);
        return response;
    } catch (error) {
        console.error('Error getting system notification count:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get notification count for Marketing
 * Returns count of unread marketing and report notifications
 * @param {string} userId - ID of the user (null for global notifications)
 * @returns {Promise<Object>} Marketing notifications count
 */
export const getMarketingNotificationCount = async (userId = null) => {
    try {
        // Check cache first
        const params = { userId };
        const cached = await loadCacheData('unread_marketing', params);
        if (cached) return cached;

        const result = await getAllNotifications({
            userId,
            unreadOnly: true
        });

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // Filter for marketing-related notifications
        const marketingNotifications = result.data.filter(
            (notification) =>
                ['report', 'info'].includes(notification.type) &&
                (notification.metadata?.reportType || notification.metadata?.campaignType)
        );

        const response = {
            success: true,
            data: {
                count: marketingNotifications.length,
                notifications: marketingNotifications
            }
        };

        // Cache the result
        await saveCacheData('unread_marketing', params, response);
        return response;
    } catch (error) {
        console.error('Error getting marketing notification count:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all navigation notification counts
 * Returns counts for all navigation sections with badges
 * @param {string} userId - ID of the user (null for global notifications)
 * @returns {Promise<Object>} All navigation notification counts
 */
export const getAllNavigationNotificationCounts = async (userId = null) => {
    try {
        // Check cache first
        const params = { userId };
        const cached = await loadCacheData('unread_navigation', params);
        if (cached) return cached;

        const [storeOrders, system, marketing] = await Promise.all([
            getStoreOrdersNotificationCount(userId),
            getSystemNotificationCount(userId),
            getMarketingNotificationCount(userId)
        ]);

        const response = {
            success: true,
            data: {
                storeOrders: storeOrders.success ? storeOrders.data.count : 0,
                system: system.success ? system.data.count : 0,
                marketing: marketing.success ? marketing.data.count : 0,
                total:
                    (storeOrders.success ? storeOrders.data.count : 0) +
                    (system.success ? system.data.count : 0) +
                    (marketing.success ? marketing.data.count : 0)
            }
        };

        // Cache the result
        await saveCacheData('unread_navigation', params, response);
        return response;
    } catch (error) {
        console.error('Error getting all navigation notification counts:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Clear order notifications for specific order
 * Called when order status changes from pending/unconfirmed
 * @param {string} orderId - ID of the order
 * @param {string} newStatus - New order status
 * @param {string} userId - ID of the user who changed the status
 * @returns {Promise<Object>} Clear result
 */
export async function clearOrderNotifications(orderId, newStatus, userId) {
    try {
        // Only clear if status is not pending/unconfirmed
        if (newStatus === 'pending' || newStatus === 'unconfirmed') {
            return { success: true, data: { cleared: 0, reason: 'Status still pending/unconfirmed' } };
        }

        const result = await autoMarkOrderNotificationsRead(orderId, newStatus, userId);
        return result;
    } catch (error) {
        console.error('Error clearing order notifications:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// SERVER ACTION WRAPPERS & HELPER FUNCTIONS
// ============================================================================

/**
 * Get all notifications (server action wrapper)
 * @param {Object} options - Query options (userId, limit, unreadOnly, type)
 * @returns {Promise<Object>} Notifications data
 */
export async function getNotifications(options = {}) {
    return await getAllNotifications(options);
}

/**
 * Mark notification as read (server action wrapper)
 * @param {string} notificationId - ID of the notification
 * @param {string} userId - ID of the user marking as read
 * @returns {Promise<Object>} Update result
 */
export async function markAsRead(notificationId, userId = null) {
    return await markNotificationAsRead(notificationId, userId);
}

/**
 * Mark multiple notifications as read (server action wrapper)
 * @param {Array} notificationIds - Array of notification IDs
 * @param {string} userId - ID of the user marking as read
 * @returns {Promise<Object>} Update result
 */
export async function markMultipleAsRead(notificationIds, userId = null) {
    return await markMultipleNotificationsAsRead(notificationIds, userId);
}

/**
 * Get unread notifications count (server action wrapper)
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} Unread count
 */
export async function getUnreadCount(userId = null) {
    return await getUnreadNotificationsCount(userId);
}

// ============================================================================
// NOTIFICATION TRIGGERS
// ============================================================================

/**
 * Trigger notification for new user signup
 * @param {Object} userData - User data from signup
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerNewUserNotification(userData) {
    try {
        const notification = {
            title: `New User Signup: ${userData.name || userData.email}`,
            message: `A new user has registered: ${userData.email}`,
            type: 'info',
            priority: 'medium',
            userId: null, // Global notification
            requiresAction: false,
            actionLink: `/admin/users?userId=${userData.id}`,
            actionText: 'View User',
            autoMarkRead: true,
            relatedId: userData.id,
            relatedType: 'user',
            metadata: {
                userEmail: userData.email,
                userName: userData.name || 'Unknown',
                signupDate: new Date().toISOString()
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating new user notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger notification for security alerts
 * @param {Object} alertData - Security alert data
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerSecurityAlert(alertData) {
    try {
        const notification = {
            title: alertData.title || 'Security Alert',
            message: alertData.message || 'A security event has occurred',
            type: 'security',
            priority: alertData.priority || 'high',
            userId: null, // Global notification
            requiresAction: alertData.requiresAction || true,
            actionLink: alertData.actionLink || '/admin/settings/security',
            actionText: alertData.actionText || 'Review Alert',
            autoMarkRead: false, // Security alerts should not auto-mark
            metadata: {
                alertType: alertData.type || 'security',
                ipAddress: alertData.ipAddress || null,
                userAgent: alertData.userAgent || null,
                timestamp: new Date().toISOString(),
                ...alertData.metadata
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating security alert notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger notification for maintenance events
 * @param {Object} maintenanceData - Maintenance event data
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerMaintenanceNotification(maintenanceData) {
    try {
        const notification = {
            title: maintenanceData.title || 'Maintenance Notification',
            message: maintenanceData.message || 'A maintenance event has occurred',
            type: 'maintenance',
            priority: maintenanceData.priority || 'medium',
            userId: null, // Global notification
            requiresAction: false,
            autoMarkRead: true,
            metadata: {
                maintenanceType: maintenanceData.type || 'general',
                timestamp: new Date().toISOString(),
                ...maintenanceData.metadata
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating maintenance notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger notification for low inventory alerts
 * @param {Object} productData - Product inventory data
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerLowInventoryNotification(productData) {
    try {
        const notification = {
            title: `Low Inventory: ${productData.name || 'Product'}`,
            message: `Product "${productData.name}" is running low (${productData.stock || 0} remaining)`,
            type: 'warning',
            priority: 'medium',
            userId: null, // Global notification
            requiresAction: true,
            actionLink: `/admin/store/products?productId=${productData.id}`,
            actionText: 'Update Inventory',
            autoMarkRead: false,
            relatedId: productData.id,
            relatedType: 'product',
            metadata: {
                productName: productData.name,
                currentStock: productData.stock || 0,
                threshold: productData.lowStockThreshold || 10,
                timestamp: new Date().toISOString()
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating low inventory notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger notification for payment failures
 * @param {Object} paymentData - Payment failure data
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerPaymentFailureNotification(paymentData) {
    try {
        const notification = {
            title: `Payment Failed: Order #${paymentData.orderNumber || paymentData.orderId}`,
            message: `A payment has failed for order #${paymentData.orderNumber || paymentData.orderId}: ${paymentData.error || 'Unknown error'}`,
            type: 'error',
            priority: 'high',
            userId: null, // Global notification
            requiresAction: true,
            actionLink: `/admin/store/orders?orderId=${paymentData.orderId}`,
            actionText: 'View Order',
            autoMarkRead: false,
            relatedId: paymentData.orderId,
            relatedType: 'payment',
            metadata: {
                orderNumber: paymentData.orderNumber,
                paymentMethod: paymentData.paymentMethod || 'Unknown',
                amount: paymentData.amount || 0,
                errorMessage: paymentData.error || 'Unknown error',
                timestamp: new Date().toISOString()
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating payment failure notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger notification for backup successes
 * @param {Object} backupData - Backup success data
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerBackupSuccessNotification(backupData) {
    try {
        const notification = {
            title: 'Backup Completed Successfully',
            message: `Database backup completed successfully. ${backupData.fileCount || 0} files backed up.`,
            type: 'maintenance',
            priority: 'low',
            userId: null, // Global notification
            requiresAction: false,
            autoMarkRead: true,
            metadata: {
                backupType: backupData.type || 'full',
                fileCount: backupData.fileCount || 0,
                timestamp: new Date().toISOString()
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating backup success notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger notification for backup failures
 * @param {Object} errorData - Backup error data
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerBackupFailureNotification(errorData) {
    try {
        const notification = {
            title: 'Backup Failed',
            message: `Database backup failed: ${errorData.error || 'Unknown error'}`,
            type: 'error',
            priority: 'high',
            userId: null, // Global notification
            requiresAction: true,
            actionLink: '/admin/settings/backups',
            actionText: 'Review Backups',
            autoMarkRead: false,
            metadata: {
                backupType: errorData.type || 'full',
                errorMessage: errorData.error || 'Unknown error',
                timestamp: new Date().toISOString()
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating backup failure notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger notification for monthly reports
 * @param {Object} reportData - Monthly report data
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerMonthlyReportNotification(reportData) {
    try {
        const notification = {
            title: `Monthly Report - ${reportData.month || new Date().toLocaleString('default', { month: 'long' })}`,
            message: `Monthly sales report is available: $${reportData.totalRevenue || 0} in revenue, ${reportData.totalOrders || 0} orders.`,
            type: 'report',
            priority: 'medium',
            userId: null, // Global notification
            requiresAction: false,
            actionLink: reportData.reportLink || '/admin/analytics',
            actionText: 'View Report',
            autoMarkRead: true,
            metadata: {
                reportType: 'monthly',
                month: reportData.month,
                year: reportData.year,
                totalRevenue: reportData.totalRevenue || 0,
                totalOrders: reportData.totalOrders || 0,
                timestamp: new Date().toISOString()
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating monthly report notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger notification for order status changes
 * @param {Object} orderData - Order data with status change
 * @returns {Promise<Object>} Created notification data
 */
export async function triggerOrderStatusChangeNotification(orderData) {
    try {
        // Only notify for customer-facing status changes
        const notifyStatuses = ['processing', 'delivered', 'complete', 'cancelled'];
        if (!notifyStatuses.includes(orderData.status)) {
            return { success: true, data: null, message: 'No notification for this status' };
        }

        const statusMessages = {
            processing: 'is now being processed',
            delivered: 'has been delivered',
            complete: 'has been completed',
            cancelled: 'has been cancelled'
        };

        const notification = {
            title: `Order #${orderData.orderNumber || orderData.id} ${statusMessages[orderData.status]}`,
            message: `Order status updated to: ${orderData.status}`,
            type: 'order',
            priority: 'medium',
            userId: orderData.userId || null,
            requiresAction: false,
            actionLink: `/account/orders/${orderData.id}`,
            actionText: 'View Order',
            autoMarkRead: false,
            relatedId: orderData.id,
            relatedType: 'order',
            metadata: {
                orderNumber: orderData.orderNumber || orderData.id,
                orderStatus: orderData.status,
                previousStatus: orderData.previousStatus || null,
                timestamp: new Date().toISOString()
            }
        };

        return await createNotification(notification);
    } catch (error) {
        console.error('Error creating order status change notification:', error);
        return { success: false, error: error.message };
    }
}
