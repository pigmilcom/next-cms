// @/lib/server/orders.js

'use server';

import DBService from '@/data/rest.db.js';
import { calculateOrderPoints } from '@/lib/server/club.js';
import {
    clearOrderNotifications,
    createOrderNotification,
    triggerOrderStatusChangeNotification
} from '@/lib/server/notifications.js';
import { getSettings } from '@/lib/server/settings.js';
import { createUserFromCustomer } from '@/lib/server/users.js';
import { generateUID, validateOrderData } from '@/lib/shared/helpers.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize cache
const { loadCacheData, saveCacheData } = await initCache('orders');

// Cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

/**
 * Get all orders
 * @param {Object} params - Query parameters (page, limit, search, status, options, etc.)
 * @param {string} params.tracking - Filter orders by tracking number (optional)
 * @param {string} params.status - Filter orders by status (optional)
 * @param {string} params.orderId - Filter orders by order ID (optional)
 * @param {string} params.userId - Filter orders by user ID / Email (optional)
 * @param {string} params.productId - Filter orders by product ID (optional)
 * @param {string} params.startDate - Filter orders from this date (YYYY-MM-DD) (optional)
 * @param {string} params.endDate - Filter orders to this date (YYYY-MM-DD) (optional)
 * @returns {Promise<Object>} Orders data with pagination info
 */
export const getAllOrders = async (params = {}) => {
    try {
        const cachedData = await loadCacheData('transactions', params);
        if (cachedData) return cachedData;

        const {
            page = 1,
            limit = 10,
            search = '',
            tracking = '',
            status = 'all',
            orderId = '',
            userId = '',
            productId = '',
            startDate = '',
            endDate = ''
        } = params;

        const ordersResponse = await DBService.readAll('orders');

        if (!ordersResponse?.success || !ordersResponse.data || Object.keys(ordersResponse.data).length === 0) {
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

        const allOrders = ordersResponse.data;
        // Convert object to array
        let ordersArray = Array.isArray(allOrders)
            ? allOrders
            : Object.entries(allOrders).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Apply search filter
        if (search?.trim()) {
            const searchLower = search.toLowerCase().trim();
            ordersArray = ordersArray.filter((order) => {
                // Search in order ID
                const idMatch = order.id?.toLowerCase().includes(searchLower) || false;

                // Search in customer object fields
                const customerEmailMatch = order.customer?.email?.toLowerCase().includes(searchLower) || false;
                const customerFirstNameMatch = order.customer?.firstName?.toLowerCase().includes(searchLower) || false;
                const customerLastNameMatch = order.customer?.lastName?.toLowerCase().includes(searchLower) || false;

                // Search in database fields (cst_email, cst_name)
                const cstEmailMatch = order.cst_email?.toLowerCase().includes(searchLower) || false;
                const cstNameMatch = order.cst_name?.toLowerCase().includes(searchLower) || false;

                return (
                    idMatch ||
                    customerEmailMatch ||
                    customerFirstNameMatch ||
                    customerLastNameMatch ||
                    cstEmailMatch ||
                    cstNameMatch
                );
            });
        }

        // Apply tracking filter
        if (tracking?.trim()) {
            const trackingLower = tracking.toLowerCase().trim();
            ordersArray = ordersArray.filter((order) => order?.trackingNumber?.toLowerCase().includes(trackingLower));
        }

        // Apply orderId filter
        if (orderId) {
            const orderIdLower = orderId.toLowerCase();
            ordersArray = ordersArray.filter((order) => order.id?.toLowerCase() === orderIdLower);
        }
        // Apply orderId filter with tracking number
        if (orderId) {
            const orderIdLower = orderId.toLowerCase();
            ordersArray = ordersArray.filter((order) => {
                const orderById = order.id?.toLowerCase() === orderIdLower;
                const orderByTracking = order.trackingNumber?.toLowerCase() === orderIdLower;
                return orderById || orderByTracking;
            });
        }

        // Apply status filter
        if (status !== 'all') {
            ordersArray = ordersArray.filter((order) => order.status === status);
        }

        // Apply userId filter
        if (userId) {
            const userIdLower = userId.toLowerCase();
            ordersArray = ordersArray.filter((order) => {
                const customerEmailMatch = order.customer?.email?.toLowerCase() === userIdLower;
                if (customerEmailMatch) {
                    return customerEmailMatch;
                }
                const customerIdMatch = order.customer?.id?.toLowerCase() === userIdLower;
                return customerIdMatch;
            });
        }

        // Apply productId filter
        if (productId) {
            ordersArray = ordersArray.filter((order) => {
                return order.items?.some((item) => item.id?.toLowerCase() === productId.toLowerCase());
            });
        }

        // Sort by creation date (newest first)
        ordersArray.sort((a, b) => {
            const aDate = new Date(a.createdAt || a.id);
            const bDate = new Date(b.createdAt || b.id);
            return bDate - aDate;
        });

        // Ensure items field is properly parsed
        const processedOrders = ordersArray.map((order) => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [],
            total: parseFloat(order.finalTotal) || 0,
            subtotal: parseFloat(order.subtotal) || 0,
            shippingCost: parseFloat(order.shippingCost) || 0,
            vatAmount: parseFloat(order.vatAmount) || 0,
            discountAmount: parseFloat(order.discountAmount) || 0
        }));

        // Calculate pagination
        const totalItems = processedOrders.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedOrders = limit > 0 ? processedOrders.slice(startIndex, endIndex) : processedOrders;

        const result = {
            success: true,
            data: paginatedOrders,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        saveCacheData('transactions', params, result);
        return result;
    } catch (error) {
        console.error('Error fetching orders:', error);
        return {
            success: false,
            error: 'Failed to fetch orders',
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

// ============================================================================
// ORDER MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new order with full business logic
 * Handles VAT calculation, email sending, customer creation/update, and notifications
 * @param {Object} orderData - Order data to create
 * @param {Object} options - Options { sendEmail: boolean, createNotification: boolean }
 * @returns {Promise<Object>} Created order data
 */
export async function createOrder(orderData, options = { sendEmail: true, createNotification: true }) {
    try {
        // Validate and sanitize order data
        const validatedOrderData = validateOrderData(orderData);

        // Validate required fields
        if (!validatedOrderData.customer || !validatedOrderData.items || !validatedOrderData.finalTotal) {
            return {
                success: false,
                error: 'Missing required order data'
            };
        }

        // Use order ID from frontend if provided, otherwise generate new one
        const orderId = validatedOrderData.id || generateUID('ORD');

        // Use VAT values from frontend (already calculated correctly in PaymentForm)
        const vatAmount = validatedOrderData.vatAmount || 0;
        const vatPercentage = validatedOrderData.vatPercentage || 0;
        const vatEnabled = validatedOrderData.vatEnabled || false;
        const vatIncluded = validatedOrderData.vatIncluded || false;

        const timeNow = validatedOrderData.createdAt || new Date().toISOString();

        // Get store settings for currency and other configuration
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;

        // Calculate expiry time for EuPago payments
        let expiryTime = null;

        if (validatedOrderData.paymentMethod?.startsWith('eupago_')) {
            // Get store settings for expiry times
            const { adminStoreSettings } = await getSettings();
            const storeSettings = adminStoreSettings;

            const currentTime = new Date(timeNow);
            const eupagoMethod = validatedOrderData.paymentMethod.replace('eupago_', '');

            // Get expiry times from store settings (in minutes)
            const mbwayExpiryMinutes = storeSettings?.paymentMethods?.euPago?.mbwayExpiryTime || 5;
            const mbExpiryMinutes = storeSettings?.paymentMethods?.euPago?.mbExpiryTime || 2880;

            if (eupagoMethod === 'mbway') {
                // MB WAY expires based on settings (default 5 minutes)
                expiryTime = new Date(currentTime.getTime() + mbwayExpiryMinutes * 60 * 1000).toISOString();
            } else if (eupagoMethod === 'mb') {
                // Multibanco expires based on settings (default 48 hours = 2880 minutes)
                expiryTime = new Date(currentTime.getTime() + mbExpiryMinutes * 60 * 1000).toISOString();
            }
        }

        // Calculate club points if not already calculated or if calculation failed (fallback)
        let clubPoints = validatedOrderData.clubPoints || 0;
        if (clubPoints === 0 && validatedOrderData.finalTotal > 0) {
            try {
                const clubPointsResult = await calculateOrderPoints(
                    validatedOrderData.finalTotal,
                    validatedOrderData.customer?.email
                );
                if (clubPointsResult?.success) {
                    clubPoints = clubPointsResult.data?.clubPoints || 0;
                }
            } catch (error) {
                console.warn('Failed to calculate club points in order creation:', error);
                // Continue with 0 points if calculation fails
            }
        }

        // Add database-specific fields
        const finalOrderData = {
            ...validatedOrderData,
            id: orderId,
            cst_email: validatedOrderData.customer.email.toLowerCase(),
            cst_name: `${validatedOrderData.customer.firstName} ${validatedOrderData.customer.lastName}`,
            finalTotal: validatedOrderData.finalTotal,
            subtotal: validatedOrderData.subtotal,
            shippingCost: validatedOrderData.shippingCost,
            discountAmount: validatedOrderData.discountAmount,
            discountType: validatedOrderData.discountType,
            discountValue: validatedOrderData.discountValue,
            couponCode: validatedOrderData.couponCode || null,
            vatAmount: parseFloat(vatAmount.toFixed(2)),
            vatPercentage: vatPercentage,
            vatEnabled: vatEnabled,
            vatIncluded: vatIncluded,
            paymentMethod: validatedOrderData.paymentMethod,
            paymentStatus: validatedOrderData.paymentStatus,
            bankTransferDetails: validatedOrderData.bankTransferDetails,
            clubPoints: clubPoints, // Use calculated club points with fallback
            shipping_address: {
                streetAddress: validatedOrderData.customer.streetAddress,
                apartmentUnit: validatedOrderData.customer.apartmentUnit || '',
                city: validatedOrderData.customer.city,
                state: validatedOrderData.customer.state,
                zipCode: validatedOrderData.customer.zipCode,
                country: validatedOrderData.customer.country,
                countryIso: validatedOrderData.customer.countryIso
            },
            phone: validatedOrderData.customer.phone,
            deliveryNotes: validatedOrderData.deliveryNotes,
            shippingNotes: validatedOrderData.shippingNotes,
            expiryTime: expiryTime,
            currency: storeSettings?.currency || validatedOrderData.currency || 'EUR',
            createdAt: timeNow,
            updatedAt: validatedOrderData.updatedAt || timeNow
        };

        // Save order to database - clear store, orders, users, and web_stats cache instances
        const result = await createWithCacheClear(finalOrderData, 'orders', [
            'store',
            'orders',
            'users',
            'newsletter',
            'club',
            'web_stats'
        ]);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to save order to database',
                message: result?.message || 'Database operation failed'
            };
        }

        // Create or update customer using smart function
        try {
            await createOrUpdateCustomerFromOrder(validatedOrderData);
        } catch (customerError) {
            console.warn('Customer creation/update failed:', customerError);
            // Continue with order processing even if customer operation fails
        }

        // Send order confirmation email if enabled
        if (options.sendEmail) {
            try {
                const { sendOrderConfirmationEmail, sendOrderAdminConfirmationEmail } = await import('@/lib/server/email.js');
                const { siteSettings } = await getSettings();
                const emailLocale = finalOrderData.locale || siteSettings?.language || 'en';
  
                // Send confirmation email to customer with locale
                await sendOrderConfirmationEmail(finalOrderData, emailLocale);

                // Send admin notification for new order (function handles admin email check internally)
                await sendOrderAdminConfirmationEmail(finalOrderData, emailLocale);
            } catch (emailError) {
                console.error('Failed to send order confirmation email:', emailError);
                // Don't fail the order creation if email fails
            }
        }

        // Create notification for new order if it's an online order
        if (options.createNotification && validatedOrderData.orderType === 'online') {
            try {
                await createOrderNotification(finalOrderData, 'online');
            } catch (notificationError) {
                console.error('Failed to create order notification:', notificationError);
                // Don't fail the order creation if notification fails
            }
        }

        return {
            success: true,
            message: 'Order created successfully',
            orderId: orderId,
            data: finalOrderData
        };
    } catch (error) {
        console.error('Error creating order:', error);
        return {
            success: false,
            error: 'Failed to create order',
            message: error.message
        };
    }
}

/**
 * Update an order
 * @param {string} orderId - ID of the order to update
 * @param {Object} orderData - Order data to update
 * @returns {Promise<Object>} Updated order data
 */
export async function updateOrder(orderId, orderData) {
    try {
        if (!orderId) {
            return {
                success: false,
                error: 'Order not found',
                message: `Order not found`
            };
        }

        // Get original order to check previous status
        const originalOrder = await DBService.read(orderId, 'orders');
        const previousStatus = originalOrder?.data?.status;

        const orderKey = originalOrder?.data?.key || orderId;

        const updateData = {
            ...orderData,
            updatedAt: new Date().toISOString()
        };

        // Clear store, orders, users, and web_stats cache instances
        const result = await updateWithCacheClear(orderKey, updateData, 'orders', [
            'store',
            'orders',
            'users',
            'newsletter',
            'club',
            'web_stats'
        ]);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to update order',
                message: result?.message || 'Database operation failed'
            };
        }

        const updatedOrder = result.data;

        //  Points system: Sync points if order status changed
        let pointsAwarded = false;
        let pointsDeducted = false;
 
        if (previousStatus !== updatedOrder.status) {
            try {
                 // Sync points for the order status update
                const { syncOrderPointsByStatus } = await import('@/lib/server/club.js');
                const processResult = await syncOrderPointsByStatus(updatedOrder);
                if (processResult?.success) {
                    pointsAwarded = true;
                } else {
                    if(processResult?.error) {
                        console.error('Points sync failed during order update:', processResult.error);
                    }
                }
            } catch (pointsError) {
                console.error('Error syncing points for order status update:', pointsError);
            }
        }

        // Handle coupon usage when status changes
        if (updatedOrder.couponCode && previousStatus !== updatedOrder.status) {
            try {
                // If order changed to 'complete' status, increment coupon usage
                if (updatedOrder.status === 'complete' && previousStatus !== 'complete') {
                    const { incrementCouponUsage } = await import('@/lib/server/store.js');
                    const couponResult = await incrementCouponUsage(
                        updatedOrder.couponCode,
                        orderId,
                        updatedOrder.customer?.email.toLowerCase() || updatedOrder.cst_email.toLowerCase()
                    );
                    if (!couponResult.success) {
                        console.log('Failed to increment coupon usage:', couponResult.error);
                    }
                }
                // If order changed from cancelled to non-cancelled (but not complete), don't increment yet
                // Coupon will be incremented when order is marked as complete
            } catch (couponError) {
                console.warn('Failed to handle coupon usage:', couponError);
            }
        }

        return {
            success: true,
            data: result.data,
            pointsAwarded,
            pointsDeducted
        };
    } catch (error) {
        console.error('Error updating order:', error);
        return {
            success: false,
            error: 'Failed to update order',
            message: error.message
        };
    }
}

/**
 * Delete an order
 * @param {string} orderId - ID of the order to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteOrder(orderId) {
    try {
        if (!orderId) {
            return {
                success: false,
                error: 'Order not found',
                message: `Order not found`
            };
        }

        const orderKey = orderId;
        // Clear store, orders, users, and web_stats cache instances
        const result = await deleteWithCacheClear(orderKey, 'orders', [
            'store',
            'orders',
            'users',
            'newsletter',
            'club',
            'web_stats'
        ]);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to delete order',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            data: result.data
        };
    } catch (error) {
        console.error('Error deleting order:', error);
        return {
            success: false,
            error: 'Failed to delete order',
            message: error.message
        };
    }
}

/**
 * Get order by ID
 * @param {string} orderId - ID of the order to get
 * @returns {Promise<Object>} Order data
 */
export const getOrder = async (orderId) => {
    try {
        if (orderId == null || orderId === '') {
            return {
                success: false,
                error: 'Invalid order ID',
                message: 'Order ID is required'
            };
        }

        const orderResponse = await DBService.readBy('id', orderId, 'orders');

        if (!orderResponse?.success || !orderResponse.data) {
            return {
                success: false,
                error: 'Order not found',
                message: `Order with ID ${orderId} does not exist`
            };
        }

        const order = orderResponse.data;
        return {
            success: true,
            data: order
        };
    } catch (error) {
        console.error('Error fetching order:', error);
        return {
            success: false,
            error: 'Failed to fetch order',
            message: error.message,
            data: null
        };
    }
};

/**
 * Update order status with automatic notification clearing
 * @param {string} orderId - ID of the order
 * @param {string} newStatus - New order status
 * @param {string} userId - User making the change
 * @param {string} customerEmail - Customer email (optional)
 * @param {Object} options - Additional options { sendSMS: boolean, trackingNumber: string }
 * @returns {Promise<Object>} Update result
 */
export async function updateOrderStatus(orderId, newStatus, userId, customerEmail = null, options = {}) {
    try {
        if (!orderId || !newStatus) {
            return {
                success: false,
                error: 'Order ID and new status are required'
            };
        }

        // Get current order to check old status
        const currentOrderResult = await getOrder(orderId);
        if (!currentOrderResult.success) {
            return {
                success: false,
                error: 'Order not found'
            };
        }

        const oldStatus = currentOrderResult.data.status;

        // Update the order status
        const updateResult = await updateOrder(orderId, {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            statusChangedBy: userId
        });

        if (!updateResult.success) {
            return updateResult;
        }

        // Clear order notifications if status changed from pending/unconfirmed
        let notificationsCleared = false;
        let pointsAwarded = !!updateResult?.pointsAwarded;
        let pointsDeducted = !!updateResult?.pointsDeducted;
        let smsSent = false;

        if (oldStatus !== newStatus) {
            try {
                await clearOrderNotifications(orderId, newStatus, userId);
                notificationsCleared = newStatus !== 'pending' && newStatus !== 'unconfirmed';

                // Trigger order status change notification for customer
                await triggerOrderStatusChangeNotification({
                    orderId,
                    oldStatus,
                    newStatus,
                    userId,
                    customerEmail
                });

                // Send SMS notification if requested
                if (options.sendSMS) {
                    try {
                        const { sendOrderStatusSMS } = await import('@/lib/server/sms.js');
                        const { getSettings } = await import('@/lib/server/settings.js');

                        const { adminSiteSettings } = await getSettings();
                        const baseUrl =
                            adminSiteSettings?.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';

                        // Prepare order data for SMS
                        const order = updateResult.data;
                        const smsOrderData = {
                            id: order.id,
                            status: newStatus,
                            trackingNumber: options.trackingNumber || order.trackingNumber || null,
                            customer: {
                                firstName: order.customer?.firstName || order.cst_name?.split(' ')[0] || 'Customer',
                                phone: order.customer?.phone || order.phone || null
                            }
                        };

                        const smsResult = await sendOrderStatusSMS(smsOrderData, baseUrl);
                        if (smsResult.success) {
                            smsSent = true;
                        } else {
                            console.error('Failed to send SMS notification:', smsResult.error);
                        }
                    } catch (smsError) {
                        console.error('Error sending SMS notification:', smsError);
                        // Don't fail the status update if SMS sending fails
                    }
                }
            } catch (notifError) {
                console.error('Error handling notifications:', notifError);
                // Don't fail the status update if notification handling fails
            }
        }

        return {
            success: true,
            data: {
                order: updateResult.data,
                statusChanged: oldStatus !== newStatus,
                notificationsCleared,
                pointsAwarded,
                pointsDeducted,
                smsSent
            }
        };
    } catch (error) {
        console.error('Error updating order status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Track an order by order ID and customer email
 * @param {string} orderId - Order ID to track
 * @param {string} email - Customer email
 * @returns {Promise<Object>} Order tracking result
 */
export const trackOrder = async (orderId, email) => {
    try {
        if (!orderId || !email) {
            return {
                success: false,
                error: 'Order ID and email are required'
            };
        }

        // Get orders with the provided filters
        const result = await getAllOrders({
            orderId: orderId,
            userId: email,
            limit: 1
        });

        if (!result.success || !result.data || result.data.length === 0) {
            return {
                success: false,
                error: 'Order not found. Please verify your order ID and email address.'
            };
        }

        const foundOrder = result.data[0];

        // Additional validation to ensure the order ID matches and customer email matches
        const orderIdMatches =
            foundOrder.id?.toLowerCase() === orderId.toLowerCase() ||
            foundOrder.trackingNumber?.toLowerCase() === orderId.toLowerCase();
        const emailMatches = foundOrder.customer?.email?.toLowerCase() === email.toLowerCase();

        if (!orderIdMatches || !emailMatches) {
            return {
                success: false,
                error: 'The provided information does not match any order. Please verify your order ID and email address.'
            };
        }

        return {
            success: true,
            data: foundOrder
        };
    } catch (error) {
        console.error('Order tracking error:', error);
        return {
            success: false,
            error: 'Failed to track order. Please try again later.',
            message: error.message
        };
    }
};

/**
 * Create or update user from order customer data
 * Consolidates customer management into users table
 * @param {Object} orderCustomerData - Customer data from order
 * @returns {Promise<Object>} Operation result
 */
export async function createOrUpdateCustomerFromOrder(orderCustomerData) {
    try {
        if (!orderCustomerData || !orderCustomerData?.customer?.email) {
            return {
                success: false,
                error: 'Missing customer email',
                message: 'Customer email is required'
            };
        }

        // Use the new createUserFromCustomer function from users.js
        const result = await createUserFromCustomer(orderCustomerData);

        return result;
    } catch (error) {
        console.error('Error in createOrUpdateCustomerFromOrder:', error);
        return {
            success: false,
            error: 'Failed to create/update customer',
            message: error.message
        };
    }
}

/**
 * Get count of pending orders for navigation badge
 * Uses getAllOrders with status filter to count pending orders
 * @returns {Promise<Object>} Count of pending orders
 */
export async function getPendingOrdersCount() {
    try {
        // Use getAllOrders with status filter and no pagination limit
        const result = await getAllOrders({
            status: 'pending',
            limit: 0 // Get all pending orders without pagination
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
        console.error('Error getting pending orders count:', error);
        return {
            success: false,
            error: error.message,
            data: { count: 0 }
        };
    }
}

/**
 * Automatically update delivered orders to complete status if older than 30 days
 * @returns {Promise<Object>} Result with count of updated orders
 */
export async function autoCompleteDeliveredOrders() {
    try {
        // Get all delivered orders without pagination
        const result = await getAllOrders({
            status: 'delivered',
            limit: 0 // Get all delivered orders
        });

        if (!result?.success || !result.data || result.data.length === 0) {
            return {
                success: true,
                data: { updatedCount: 0, orders: [] },
                message: 'No delivered orders to process'
            };
        }

        const now = new Date();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        const ordersToUpdate = [];

        // Filter orders older than 30 days
        for (const order of result.data) {
            if (order.updatedAt) {
                const orderUpdatedDate = new Date(order.updatedAt);
                const timeDiff = now - orderUpdatedDate;

                // If order was updated more than 30 days ago
                if (timeDiff > thirtyDaysInMs) {
                    ordersToUpdate.push(order);
                }
            }
        }

        // Update orders to complete status
        const updateResults = [];
        for (const order of ordersToUpdate) {
            try {
                const updateResult = await updateOrderStatus(
                    order.id,
                    'complete',
                    'system', // System user for auto-updates
                    order.customer?.email.toLowerCase() || order.cst_email.toLowerCase()
                );

                if (updateResult.success) {
                    updateResults.push({
                        orderId: order.id,
                        success: true
                    });
                }
            } catch (updateError) {
                console.error(`Failed to auto-complete order ${order.id}:`, updateError);
                updateResults.push({
                    orderId: order.id,
                    success: false,
                    error: updateError.message
                });
            }
        }

        const successCount = updateResults.filter((r) => r.success).length;

        return {
            success: true,
            data: {
                updatedCount: successCount,
                orders: updateResults
            },
            message: `Auto-completed ${successCount} delivered orders older than 30 days`
        };
    } catch (error) {
        console.error('Error auto-completing delivered orders:', error);
        return {
            success: false,
            error: error.message,
            data: { updatedCount: 0, orders: [] }
        };
    }
}
