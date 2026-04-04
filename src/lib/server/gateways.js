// @/lib/server/gateway.js

'use server';

import Stripe from 'stripe';
import { calculateOrderPoints } from '@/lib/server/club.js';
import { createOrUpdateCustomerFromOrder, getAllOrders } from '@/lib/server/orders.js';
import { getSettings } from '@/lib/server/settings.js';
import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const { loadCacheData, saveCacheData } = await initCache('payments');

// Cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// STRIPE PAYMENT GATEWAY
// ============================================================================

/**
 * Get Stripe instance with settings-based key
 * @returns {Promise<Stripe>} Stripe instance
 */
async function getStripeInstance() {
    try {
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;

        if (!storeSettings?.paymentMethods?.stripe?.apiSecretKey) {
            throw new Error('Stripe secret key not configured in store settings');
        }

        return new Stripe(storeSettings.paymentMethods.stripe.apiSecretKey);
    } catch (error) {
        console.error('Failed to initialize Stripe:', error);
        throw error;
    }
}

/**
 * Create Stripe payment intent (server action)
 * @param {Object} paymentData - Payment data { amount, currency, email, automatic_payment_methods, metadata }
 * @returns {Promise<Object>} Payment intent result { success, client_secret, customer_id, payment_intent_id, error }
 */
export async function createStripePaymentIntent(paymentData) {
    try {
        const { amount, currency = 'EUR', email = '', automatic_payment_methods, metadata = {} } = paymentData;

        if (!amount || amount <= 0) {
            return {
                success: false,
                error: 'Invalid amount'
            };
        }

        if (!email) {
            return {
                success: false,
                error: 'Email is required'
            };
        }

        // Get Stripe instance with store settings
        const stripe = await getStripeInstance();

        const customer = await stripe.customers.create({
            email,
            description: `Customer for ${email}`
        });

        const paymentIntentParams = {
            amount: parseInt(amount, 10),
            currency,
            customer: customer.id,
            // merge client-provided metadata (order_id, service_id, etc.) with a customer_email fallback
            metadata: Object.assign({ customer_email: email }, metadata)
        };

        if (automatic_payment_methods) {
            paymentIntentParams.automatic_payment_methods = { enabled: true };
        } else {
            paymentIntentParams.payment_method_types = ['card'];
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        return {
            success: true,
            client_secret: paymentIntent.client_secret,
            customer_id: customer.id,
            payment_intent_id: paymentIntent.id
        };
    } catch (err) {
        console.error('Stripe Error:', err.message);
        return {
            success: false,
            error: err.message
        };
    }
}

// ============================================================================
// EUPAGO PAYMENT GATEWAY
// ============================================================================

/**
 * Check if EuPago is enabled
 * @returns {Promise<boolean>} Whether EuPago is enabled
 */
export async function isEuPagoEnabled() {
    try {
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;

        if (storeSettings?.paymentMethods?.euPago) {
            const apiUrl = storeSettings.paymentMethods.euPago.apiUrl;
            const apiKey = storeSettings.paymentMethods.euPago.apiKey;
            return !!(apiUrl && apiKey);
        }

        return false;
    } catch (error) {
        console.error('Failed to check EuPago status:', error);
        return false;
    }
}

/**
 * Get EuPago configuration from settings
 * @returns {Promise<Object>} EuPago configuration
 */
export async function getEuPagoConfig() {
    try {
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;

        if (storeSettings?.paymentMethods?.euPago) {
            const euPagoConfig = storeSettings.paymentMethods.euPago;

            if (!euPagoConfig.enabled) {
                return {
                    success: false,
                    error: 'EuPago is not enabled in store settings'
                };
            }

            if (!euPagoConfig.apiUrl || !euPagoConfig.apiKey) {
                return {
                    success: false,
                    error: 'EuPago API URL or API Key not configured in store settings'
                };
            }

            return {
                success: true,
                config: euPagoConfig
            };
        }

        return {
            success: false,
            error: 'EuPago not configured in store settings. Please configure EuPago in Admin > Store > Settings > Payments tab.'
        };
    } catch (error) {
        console.error('Failed to get EuPago config:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check payment status for a reference
 * @param {string} reference - Payment reference
 * @param {string} entity - Payment entity (optional)
 * @returns {Promise<Object>} Payment status result
 */
export async function checkEuPagoPaymentStatus(reference, entity = null) {
    try {
        const configResult = await getEuPagoConfig();
        if (!configResult.success) {
            throw new Error(configResult?.error || 'EuPago service not configured');
        }

        const { apiUrl, apiKey } = configResult.config;

        // Normalize API URL - remove trailing slash
        const normalizedApiUrl = apiUrl.replace(/\/$/, '');
        const endpoint = `${normalizedApiUrl}/clientes/rest_api/multibanco/info`;

        // Prepare request body as JSON (matching EuPago documentation)
        const requestBody = {
            chave: apiKey,
            referencia: reference
        };

        if (entity) {
            requestBody.entidade = entity;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse EuPago status response:', parseError);
            throw new Error(`Invalid response from EuPago API: ${responseText.substring(0, 200)}`);
        }

        // Check if payment is paid based on estado_referencia field
        const isPaid = data.estado_referencia === 'paga';
        const isPending = data.estado_referencia === 'pendente';

        return {
            success: true,
            paid: isPaid,
            pending: isPending,
            reference: data.referencia,
            entity: data.entidade,
            identifier: data.identificador,
            status: data.estado_referencia,
            paymentDate: data.pagamentos?.[0]?.data_pagamento || null,
            paymentTime: data.pagamentos?.[0]?.hora_pagamento || null,
            amount: data.pagamentos?.[0]?.valor || null,
            transactionFee: data.pagamentos?.[0]?.comissao || null,
            data: data
        };
    } catch (error) {
        console.error('Error checking EuPago payment status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create payment reference
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Payment reference result
 */
export async function createEuPagoPaymentReference(orderData) {
    try {
        const configResult = await getEuPagoConfig();
        if (!configResult.success) {
            console.error('EuPago config error:', configResult.error);
            throw new Error('EuPago service not configured. Please check your store settings.');
        }

        const { apiUrl, apiKey } = configResult.config;

        // Get store settings for currency
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;
        const currency = storeSettings?.currency || 'EUR';

        const {
            orderId,
            amount,
            method = 'mb',
            mobile = null,
            countryCode = '+351',
            customerEmail = null,
            customerName = null
        } = orderData;

        // Normalize API URL - remove trailing slash to avoid double slashes
        const normalizedApiUrl = apiUrl.replace(/\/$/, '');

        let endpoint;
        let requestBody;
        let headers;

        if (method === 'mbway') {
            // MB WAY uses the new API v1.02 format
            if (!mobile) {
                throw new Error('Mobile number required for MB WAY');
            }

            endpoint = `${normalizedApiUrl}/api/v1.02/mbway/create`;

            // Clean mobile number (remove spaces, dashes, etc.)
            const cleanMobile = mobile.replace(/[\s\-+]/g, '');

            requestBody = {
                payment: {
                    amount: {
                        currency: currency?.toUpperCase() || 'EUR',
                        value: parseFloat(amount)
                    },
                    identifier: orderId,
                    customerPhone: cleanMobile,
                    countryCode: countryCode || '+351'
                },
                customer: {
                    name: customerName || 'Customer',
                    email: customerEmail || 'customer@email.com',
                    phone: cleanMobile
                }
            };

            headers = {
                Authorization: `ApiKey ${apiKey}`,
                accept: 'application/json',
                'content-type': 'application/json'
            };
        } else {
            // Multibanco uses the old REST API format
            endpoint = `${normalizedApiUrl}/clientes/rest_api/multibanco/create`;

            // Get MB expiry time from store settings (in minutes, default 2880 = 48 hours)
            const mbExpiryMinutes = storeSettings?.paymentMethods?.euPago?.mbExpiryTime || 2880;

            // Calculate dates in YYYY-MM-DD format
            const currentDate = new Date();
            const dataInicio = currentDate.toISOString().split('T')[0]; // Current date

            // Add expiry time in minutes to current date
            const expiryDate = new Date(currentDate.getTime() + mbExpiryMinutes * 60 * 1000);
            const dataFim = expiryDate.toISOString().split('T')[0]; // Expiry date

            requestBody = {
                chave: apiKey,
                valor: amount,
                id: orderId,
                data_inicio: dataInicio,
                data_fim: dataFim,
                per_dup: 0,
                userID: customerEmail || 'customer@email.com'
            };

            headers = {
                accept: 'application/json',
                'content-type': 'application/json'
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        // Get response text first to see what we're actually receiving
        const responseText = await response.text();

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse EuPago response as JSON:', parseError);
            console.error('Response was:', responseText.substring(0, 1000));
            throw new Error(
                `EuPago API returned invalid JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`
            );
        }

        // Handle different response formats
        if (method === 'mbway') {
            // MB WAY API v1.02 response format
            if (data.transactionStatus === 'Success') {
                return {
                    success: true,
                    reference: data.reference,
                    transactionId: data.transactionID,
                    entity: null, // MB WAY doesn't use entity
                    amount: amount,
                    method: method,
                    data: data
                };
            } else {
                const errorMsg = data.message || data.error || 'Failed to create MB WAY payment';
                throw new Error(errorMsg);
            }
        } else {
            // Multibanco REST API response format
            if (data.sucesso === true || data.sucesso === 'true') {
                return {
                    success: true,
                    reference: data.referencia,
                    entity: data.entidade || null,
                    amount: data.valor,
                    method: method,
                    data: data
                };
            } else {
                const errorMsg = data.erro || data.resposta || 'Failed to create payment reference';
                throw new Error(errorMsg);
            }
        }
    } catch (error) {
        console.error('Error creating EuPago payment reference:', error);
        console.error('Error stack:', error.stack);
        return {
            success: false,
            error: error.message || 'Failed to create payment reference'
        };
    }
}

/**
 * Process payment and update order
 * @param {Object} orderData - Complete order data
 * @returns {Promise<Object>} Payment processing result
 */
export async function processEuPagoPayment(orderData) {
    try {
        const { orderId, items, customer, payment, totals } = orderData;

        // Validate required data
        if (!orderId || !items || !customer || !payment || !totals) {
            console.error('ProcessEuPagoPayment - Missing data:', {
                hasOrderId: !!orderId,
                hasItems: !!items,
                hasCustomer: !!customer,
                hasPayment: !!payment,
                hasTotals: !!totals
            });
            throw new Error('Missing required order data');
        }

        const amount = totals.total;
        const method = payment.method || 'mb';
        const mobile = payment.mobile || null;
        const countryCode = payment.countryCode || '+351';
        const customerName = `${customer.firstName} ${customer.lastName}`.trim();

        // Create payment reference with EuPago
        const referenceResult = await createEuPagoPaymentReference({
            orderId,
            amount,
            method,
            mobile,
            countryCode,
            customerEmail: customer.email,
            customerName: customerName
        });

        if (!referenceResult.success) {
            throw new Error(referenceResult.error || 'Failed to create payment reference');
        }

        // Get store settings for VAT calculations
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;

        // Create order in database with proper structure matching other payment methods
        const currentTime = new Date();

        // Get expiry times from store settings (in minutes)
        const mbwayExpiryMinutes = storeSettings?.paymentMethods?.euPago?.mbwayExpiryTime || 5;
        const mbExpiryMinutes = storeSettings?.paymentMethods?.euPago?.mbExpiryTime || 2880;

        // Calculate expiry time based on payment method
        let expiryTime = null;

        if (method === 'mbway') {
            // MB WAY expires based on settings (default 5 minutes)
            expiryTime = new Date(currentTime.getTime() + mbwayExpiryMinutes * 60 * 1000).toISOString();
        } else if (method === 'mb') {
            // Multibanco expires based on settings (default 48 hours = 2880 minutes)
            expiryTime = new Date(currentTime.getTime() + mbExpiryMinutes * 60 * 1000).toISOString();
        }

        // Calculate club points if not already calculated or if calculation failed (fallback)
        let clubPoints = orderData.clubPoints || 0;
        if (clubPoints === 0 && totals.total > 0) {
            try {
                const clubPointsResult = await calculateOrderPoints(totals.total, customer?.email);
                if (clubPointsResult?.success) {
                    clubPoints = clubPointsResult.data?.clubPoints || 0;
                }
            } catch (error) {
                console.warn('Failed to calculate club points in EuPago payment:', error);
                // Continue with 0 points if calculation fails
            }
        }

        const orderToCreate = {
            id: orderId,
            orderId: orderId,
            customer: customer,
            items: items,
            subtotal: totals.subtotal || 0,
            shippingCost: totals.shipping || 0,
            discountType: orderData.discountType || 'fixed',
            discountValue: orderData.discountValue || 0,
            discountAmount: totals.discount || 0,
            couponCode: orderData.couponCode || null,
            vatEnabled: storeSettings?.vatEnabled || false,
            vatPercentage: storeSettings?.vatPercentage || 20,
            vatAmount: totals.vat || 0,
            vatIncluded: storeSettings?.vatIncludedInPrice || false,
            clubPoints: clubPoints, // Use calculated club points with fallback
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: `eupago_${method}`,
            eupagoReference: referenceResult.reference,
            eupagoEntity: referenceResult.entity,
            eupagoTransactionId: referenceResult.transactionId || null,
            eupagoMethod: method,
            eupagoMobile: mobile,
            expiryTime: expiryTime,
            deliveryNotes: orderData.deliveryNotes || '',
            shippingNotes: orderData.shippingNotes || '',
            currency: storeSettings?.currency || 'EUR',
            sendEmail: true,
            appointmentId: orderData.appointmentId || null,
            isServiceAppointment: orderData.isServiceAppointment || false,
            createdAt: currentTime.toISOString(),
            updatedAt: currentTime.toISOString(),
            // Additional fields for compatibility
            cst_email: customer.email,
            cst_name: `${customer.firstName} ${customer.lastName}`,
            vatAmount: (totals.vat || 0).toFixed(2),
            vatPercentage: storeSettings?.vatPercentage || 20,
            vatIncluded: storeSettings?.vatIncludedInPrice || false,
            finalTotal: amount.toFixed(2),
            shipping_address: {
                streetAddress: customer.streetAddress,
                apartmentUnit: customer.apartmentUnit || '',
                city: customer.city,
                state: customer.state,
                zipCode: customer.zipCode,
                country: customer.country,
                countryIso: customer.countryIso
            },
            phone: customer.phone
        };

        // Save order to database - clear store, orders, users, newsletter, club, and web_stats cache instances
        const saveResult = await createWithCacheClear(orderToCreate, 'orders', [
            'store',
            'orders',
            'users',
            'newsletter',
            'club',
            'web_stats'
        ]);

        if (!saveResult) {
            throw new Error('Failed to save order to database');
        }

        // Increment coupon usage count if coupon was used (same logic as orders.js)
        if (orderToCreate.couponCode && orderToCreate.status !== 'cancelled') {
            try {
                const { applyCoupon } = await import('@/lib/server/store.js');
                await applyCoupon(
                    orderToCreate.couponCode,
                    orderId,
                    customer.email,
                    amount,
                    orderToCreate.discountAmount || 0
                );
            } catch (couponError) {
                console.warn('Failed to increment coupon usage:', couponError);
                // Continue with order processing even if coupon increment fails
            }
        }

        // Create or update customer using smart function
        try {
            await createOrUpdateCustomerFromOrder(customer);
        } catch (customerError) {
            console.warn('Customer creation/update failed:', customerError);
            // Continue with order processing even if customer operation fails
        }

        // Send order confirmation email
        try {
            const { sendOrderConfirmationEmail, sendOrderAdminConfirmationEmail } = await import('./email.js');
            await sendOrderConfirmationEmail(orderToCreate);
            // Send admin notification (function handles admin email check internally)
            await sendOrderAdminConfirmationEmail(orderToCreate);
        } catch (emailError) {
            console.warn('Failed to send order confirmation email:', emailError);
        }

        return {
            success: true,
            orderId: orderId,
            reference: referenceResult.reference,
            entity: referenceResult.entity,
            amount: amount,
            method: method,
            paymentData: referenceResult.data
        };
    } catch (error) {
        console.error('Error processing EuPago payment:', error);
        console.error('Error stack:', error.stack);
        return {
            success: false,
            error: error.message || 'Payment processing failed'
        };
    }
}

/**
 * Update EuPago order payment status
 * @param {string} orderId - Order ID
 * @param {Object} paymentData - Payment confirmation data
 * @returns {Promise<Object>} Update result
 */
export async function updateEuPagoOrderStatus(orderId, paymentData) {
    try {
        // Get existing order
        const orderData = await getAllOrders({ orderId: orderId, limit: 1 });
        if (!orderData.success || !orderData.data || orderData.data.length === 0) {
            return {
                success: false,
                error: 'Order not found'
            };
        }

        const existingOrder = orderData.data[0];

        const orderKey = existingOrder?.key || null;

        // Update order with payment confirmation
        const updatedOrder = {
            ...existingOrder,
            paymentStatus: 'paid',
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            eupagoPaymentData: paymentData,
            eupagoTransactionFee: paymentData?.transactionFee || null
        };
        if (orderKey) {
            // Clear store, orders, and users cache instances
            await updateWithCacheClear(orderKey, updatedOrder, 'orders', [
            'store',
            'orders',
            'users',
            'newsletter',
            'club',
            'web_stats'
        ]);
        }

        // Send payment confirmation email
        try {
            const { sendOrderConfirmationEmail, sendOrderAdminConfirmationEmail } = await import('./email.js');

            // Send confirmation email to customer
            await sendOrderConfirmationEmail(updatedOrder);

            // Send admin notification for paid order (function handles admin email check internally)
            await sendOrderAdminConfirmationEmail(updatedOrder);
        } catch (emailError) {
            console.warn('Failed to send payment confirmation emails:', emailError);
        }

        return {
            success: true,
            message: 'Order payment status updated successfully',
            order: updatedOrder
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check pending payments status (server action)
 * @returns {Promise<Object>} Pending payments result
 */
export async function checkPending() {
    try {
        return await checkEuPagoPendingPayments();
    } catch (error) {
        console.error('EuPago Check Pending Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check and update pending payments
 * @returns {Promise<Object>} Pending payments check result
 */
export async function checkEuPagoPendingPayments() {
    try {
        const isEnabled = await isEuPagoEnabled();
        if (!isEnabled) {
            return { success: false, error: 'EuPago service not configured' };
        }

        // Get all orders (not just pending) to check payment status
        const allOrders = await getAllOrders({ limit: 0 });

        if (!allOrders.success || !allOrders.data) {
            return {
                success: true,
                checked: 0,
                updated: 0,
                cancelled: 0,
                results: []
            };
        }

        const orders = allOrders.data;

        // Filter orders with EuPago payment method and pending payment status
        const pendingOrders = orders.filter(
            (order) =>
                order.paymentMethod?.startsWith('eupago_') && order.paymentStatus === 'pending' && order.eupagoReference
        );

        const results = [];
        const currentTime = new Date();

        for (const order of pendingOrders) {
            try {
                const reference = order.eupagoReference || order.reference;
                const entity = order.eupagoEntity || order.entity;
                const eupagoMethod = order.eupagoMethod || order.paymentMethod?.replace('eupago_', '');

                // Check payment status with EuPago API
                const statusCheck = await checkEuPagoPaymentStatus(reference, entity);

                if (statusCheck.success && statusCheck.paid) {
                    // Update order payment status with transaction fee
                    const updateResult = await updateEuPagoOrderStatus(order.id, {
                        ...statusCheck.data,
                        transactionFee: statusCheck.transactionFee
                    });

                    if (!updateResult.success) {
                        console.warn(`Failed to update order ${order.id}:`, updateResult.error);
                        results.push({
                            orderId: order.id,
                            status: 'update_failed',
                            error: updateResult.error
                        });
                        continue;
                    }

                    results.push({
                        orderId: order.id,
                        status: 'updated_to_paid',
                        reference: reference
                    });
                } else {
                    // Check if payment has expired
                    let hasExpired = false;
                    if (order.expiryTime) {
                        const expiryTime = new Date(order.expiryTime);
                        hasExpired = currentTime > expiryTime;
                    } else if (order.createdAt) {
                        // Fallback: calculate expiry from creation time
                        const createdTime = new Date(order.createdAt);
                        const minutesSinceCreation = (currentTime - createdTime) / (1000 * 60);

                        if (eupagoMethod === 'mbway') {
                            // MB Way: 5 minutes
                            hasExpired = minutesSinceCreation > 5;
                        } else {
                            // Multibanco: 48 hours (2880 minutes)
                            hasExpired = minutesSinceCreation > 2880;
                        }
                    }

                    // If payment expired, cancel the order
                    if (hasExpired) {
                        const orderKey = order.key || order.id;
                        // Cancel expired order - clear both orders and users cache instances
                        const cancelResult = await updateWithCacheClear(
                            orderKey,
                            {
                                status: 'cancelled',
                                paymentStatus: 'cancelled',
                                cancelledAt: currentTime.toISOString(),
                                cancelReason: `Payment expired - ${eupagoMethod === 'mbway' ? '5 minute' : '48 hour'} time limit exceeded`,
                                updatedAt: currentTime.toISOString()
                            },
                            'orders',
                            [
                                'store',
                                'orders',
                                'users',
                                'newsletter',
                                'club',
                                'web_stats'
                            ]
                        );

                        if (cancelResult?.success) {
                            results.push({
                                orderId: order.id,
                                status: 'cancelled_expired',
                                reference: reference,
                                method: eupagoMethod
                            });
                        } else {
                            results.push({
                                orderId: order.id,
                                status: 'cancel_failed',
                                error: 'Failed to cancel expired order'
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Error checking order ${order.id}:`, error);
                results.push({
                    orderId: order.id,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return {
            success: true,
            checked: pendingOrders.length,
            updated: results.filter((r) => r.status === 'updated_to_paid').length,
            cancelled: results.filter((r) => r.status === 'cancelled_expired').length,
            results: results
        };
    } catch (error) {
        console.error('Error checking pending payments:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create EuPago payment reference (server action)
 * @param {Object} paymentData - Payment data { orderId, amount, method, mobile }
 * @returns {Promise<Object>} Payment reference result
 */
export async function createEuPagoReference(paymentData) {
    try {
        const { orderId, amount, method = 'mb', mobile = null } = paymentData;

        if (!orderId || !amount || amount <= 0) {
            return {
                success: false,
                error: 'Order ID and valid amount are required'
            };
        }

        if (method === 'mbway' && !mobile) {
            return {
                success: false,
                error: 'Mobile number is required for MB WAY payments'
            };
        }

        return await createEuPagoPaymentReference({
            orderId,
            amount,
            method,
            mobile
        });
    } catch (error) {
        console.error('EuPago Create Reference Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process EuPago payment (server action)
 * @param {Object} orderData - Order data for payment processing
 * @returns {Promise<Object>} Payment processing result
 */
export async function processEuPagoPaymentAction(orderData) {
    try {
        if (!orderData) {
            return {
                success: false,
                error: 'Order data is required'
            };
        }

        return await processEuPagoPayment(orderData);
    } catch (error) {
        console.error('EuPago Process Payment Error:', error.message);
        return {
            success: false,
            error: error.message || 'Internal server error'
        };
    }
}

/**
 * Check EuPago payment status (server action)
 * @param {string} reference - Payment reference
 * @param {string} entity - Payment entity (optional)
 * @returns {Promise<Object>} Payment status result
 */
export async function checkEuPagoStatus(reference, entity = null) {
    try {
        if (!reference) {
            return {
                success: false,
                error: 'Payment reference is required'
            };
        }

        return await checkEuPagoPaymentStatus(reference, entity);
    } catch (error) {
        console.error('EuPago Check Status Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check if EuPago is enabled (server action)
 * @returns {Promise<Object>} Enabled status result
 */
export async function checkEuPagoEnabled() {
    try {
        const isEnabled = await isEuPagoEnabled();
        return {
            success: true,
            enabled: isEnabled
        };
    } catch (error) {
        console.error('EuPago Check Enabled Error:', error.message);
        return {
            success: false,
            error: error.message,
            enabled: false
        };
    }
}

/**
 * Get EuPago payment instructions (server action)
 * @param {string} method - Payment method (mb or mbway)
 * @param {string} reference - Payment reference (optional)
 * @param {string} entity - Payment entity (optional)
 * @param {number} amount - Payment amount (optional)
 * @returns {Promise<Object>} Payment instructions
 */
export async function getEuPagoInstructions(method, reference = null, entity = null, amount = null) {
    try {
        // Get store settings for currency
        const { storeSettings } = await getSettings();
        const defaultCurrency = storeSettings?.currency || 'EUR';

        const instructions = {
            success: true,
            method,
            instructions: null
        };

        if (method === 'mb' && reference && entity && amount) {
            instructions.instructions = {
                title: 'Multibanco Payment',
                description: 'Use the following details to complete your payment at any ATM or online banking:',
                reference,
                entity,
                amount: parseFloat(amount).toFixed(2),
                currency: defaultCurrency
            };
        } else if (method === 'mbway' && reference) {
            instructions.instructions = {
                title: 'MB WAY Payment',
                description: 'Check your MB WAY app to confirm the payment.',
                reference,
                expiresIn: '5 minutes'
            };
        }

        return instructions;
    } catch (error) {
        console.error('EuPago Get Instructions Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================================================
// SUMUP PAYMENT GATEWAY
// ============================================================================

/**
 * Check if SumUp is enabled
 * @returns {Promise<boolean>} Whether SumUp is enabled
 */
export async function isSumUpEnabled() {
    try {
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;

        if (storeSettings?.paymentMethods?.sumup) {
            return storeSettings.paymentMethods.sumup.enabled === true;
        }

        return false;
    } catch (error) {
        console.error('Failed to check SumUp status:', error);
        return false;
    }
}

/**
 * Get SumUp configuration from settings
 * @returns {Promise<Object>} SumUp configuration
 */
export async function getSumUpConfig() {
    try {
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;

        if (storeSettings?.paymentMethods?.sumup) {
            const { enabled, merchantCode, apiKey } = storeSettings.paymentMethods.sumup;

            if (!enabled) {
                return {
                    success: false,
                    error: 'SumUp is not enabled in store settings'
                };
            }

            // Trim whitespace from credentials
            const trimmedMerchantCode = merchantCode?.trim();
            const trimmedApiKey = apiKey?.trim();

            if (!trimmedMerchantCode || !trimmedApiKey) {
                return {
                    success: false,
                    error: 'SumUp merchant code or API key is missing. The API key must be your OAuth Bearer token from https://developer.sumup.com/apps'
                };
            }

            // Validate API key format (should be a reasonable length)
            if (trimmedApiKey.length < 20) {
                console.warn('⚠️ SumUp API Key seems too short. Expected OAuth Bearer token or API key.');
            }

            return {
                success: true,
                config: {
                    merchantCode: trimmedMerchantCode, 
                    apiKey: trimmedApiKey
                }
            };
        }

        return {
            success: false,
            error: 'SumUp not configured in store settings. Please configure SumUp in Admin > Store > Settings > Payments tab.'
        };
    } catch (error) {
        console.error('Failed to get SumUp config:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create SumUp checkout
 * @param {Object} checkoutData - Checkout data
 * @returns {Promise<Object>} Checkout creation result
 */
export async function createSumUpCheckout(checkoutData) {
    try {
        const configResult = await getSumUpConfig();
        if (!configResult.success) {
            console.error('SumUp config error:', configResult.error);
            return configResult;
        }

        const { merchantCode, apiKey } = configResult.config;

        const {
            orderId,
            amount,
            currency = 'EUR',
            customerEmail = null, 
            description = null
        } = checkoutData;

        // SumUp API endpoint for creating checkouts
        const endpoint = 'https://api.sumup.com/v0.1/checkouts';

        const requestBody = {
            checkout_reference: orderId,
            amount: parseFloat(amount),
            currency: currency.toUpperCase(),
            merchant_code: merchantCode
        };

        if (description) {
            requestBody.description = description;
        }

        if (customerEmail) {
            requestBody.pay_to_email = customerEmail;
        } 
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseText = await response.text(); 

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse SumUp response:', responseText);
            return {
                success: false,
                error: 'Invalid response from SumUp API'
            };
        }

        if (!response.ok) {
            const errorMessage = data.message || data.error_message || data.error_code || data.detail || JSON.stringify(data);
            console.error('SumUp API error response:', data);
            
            // Special handling for 409 Duplicate Checkout
            if (response.status === 409 && data.error_code === 'DUPLICATED_CHECKOUT') {
                console.warn('');
                console.warn('⚠️ SUMUP DUPLICATE CHECKOUT (409)');
                console.warn('A checkout already exists for reference:', requestBody.checkout_reference);
                console.warn('This is normal if the page was refreshed or component remounted.');
                console.warn('The existing checkout can still be used.');
                console.warn('');
                
                // Extract checkout ID from error message if possible
                // The checkout already exists, so we can try to retrieve it
                return {
                    success: false,
                    error: 'DUPLICATE_CHECKOUT',
                    message: 'A payment session already exists for this booking. Please refresh the page or contact support if the issue persists.',
                    reference: requestBody.checkout_reference
                };
            }
            
            // Special handling for 401 Unauthorized
            if (response.status === 401) {
                console.error('');
                console.error('='.repeat(80));
                console.error('❌ SUMUP AUTHENTICATION ERROR (401 Unauthorized)');
                console.error('='.repeat(80));
                console.error('');
                console.error('Your API Key is INVALID or does not match your Merchant Code.');
                console.error('');
                console.error('TROUBLESHOOTING CHECKLIST:');
                console.error('1. ✓ Verify your Merchant Code matches your SumUp account');
                console.error('   Current merchant code:', requestBody.merchant_code);
                console.error('');
                console.error('2. ✓ Check your API Key type:');
                console.error('   - For PRODUCTION: Use OAuth Access Token from https://developer.sumup.com/applications');
                console.error('   - For TESTING: Use API Key from SumUp Developer Dashboard');
                console.error('');
                console.error('3. ✓ Common mistakes:');
                console.error('   ❌ Using Client ID instead of Access Token');
                console.error('   ❌ Using Client Secret instead of Access Token');
                console.error('   ❌ Token expired (generate new one)');
                console.error('   ❌ Wrong merchant code (must match the API key\'s merchant)');
                console.error('   ❌ Extra whitespace in credentials (now auto-trimmed)');
                console.error('');
                console.error('4. ✓ How to get the correct credentials:');
                console.error('   a) Go to: https://developer.sumup.com/applications');
                console.error('   b) Select or create your application');
                console.error('   c) Copy the "API Key" or generate new "Access Token"');
                console.error('   d) Copy your "Merchant Code" from SumUp merchant dashboard');
                console.error('   e) Update both in: Admin > Store > Settings > Payments > SumUp');
                console.error('');
                console.error('API Key debug info:');
                console.error('  - Length:', apiKey.length, 'chars');
                console.error('  - Starts with:', apiKey.substring(0, 15) + '...');
                console.error('  - Expected: 40-100 chars for OAuth token');
                console.error('='.repeat(80));
                console.error('');
                
                return {
                    success: false,
                    error: `SumUp authentication failed (401). Your API Key (${apiKey.substring(0, 10)}...) does not match merchant code ${requestBody.merchant_code}. Check server console for detailed troubleshooting.`
                };
            }
            
            return {
                success: false,
                error: `SumUp API error (${response.status}): ${errorMessage}`
            };
        }

        return {
            success: true,
            checkoutId: data.id,
            reference: orderId,
            amount: data.amount,
            currency: data.currency,
            status: data.status,
            data: data
        };
    } catch (error) {
        console.error('Error creating SumUp checkout:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check SumUp payment status
 * @param {string} checkoutId - Checkout ID
 * @returns {Promise<Object>} Payment status result
 */
export async function checkSumUpPaymentStatus(checkoutId) {
    try {
        const configResult = await getSumUpConfig();
        if (!configResult.success) {
            return configResult;
        }

        const { apiKey } = configResult.config;

        const endpoint = `https://api.sumup.com/v0.1/checkouts/${checkoutId}`;

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse SumUp response:', responseText);
            return {
                success: false,
                error: 'Invalid response from SumUp API'
            };
        }

        if (!response.ok) {
            return {
                success: false,
                error: data.message || data.error_message || 'Failed to retrieve SumUp checkout status'
            };
        }

        const isPaid = data.status === 'PAID';
        const isPending = data.status === 'PENDING';

        return {
            success: true,
            paid: isPaid,
            pending: isPending,
            status: data.status,
            checkoutId: data.id,
            reference: data.checkout_reference,
            amount: data.amount,
            currency: data.currency,
            transactionId: data.transaction_id || null,
            transactionCode: data.transaction_code || null,
            date: data.date || null,
            data: data
        };
    } catch (error) {
        console.error('Error checking SumUp payment status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process SumUp payment and update order
 * @param {Object} orderData - Complete order data
 * @returns {Promise<Object>} Payment processing result
 */
export async function processSumUpPayment(orderData) {
    try {
        const { orderId, customer, totals } = orderData;

        // Validate required data
        if (!orderId || !customer || !totals) {
            return {
                success: false,
                error: 'Missing required order data (orderId, customer, or totals)'
            };
        }

        const amount = totals.total;
        const customerName = `${customer.firstName} ${customer.lastName}`.trim();

        // Get store settings for currency
        const { adminStoreSettings } = await getSettings();
        const storeSettings = adminStoreSettings;
        const currency = storeSettings?.currency || 'EUR';

        // Create SumUp checkout
        const checkoutResult = await createSumUpCheckout({
            orderId,
            amount,
            currency,
            customerEmail: customer.email,
            customerName,
            description: `Order ${orderId}`
        });

        if (!checkoutResult.success) {
            return {
                success: false,
                error: checkoutResult.error
            };
        }

        return {
            success: true,
            checkoutId: checkoutResult.checkoutId,
            checkoutUrl: checkoutResult.checkoutUrl,
            reference: orderId,
            amount: amount,
            currency: currency,
            status: checkoutResult.status
        };
    } catch (error) {
        console.error('Error processing SumUp payment:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check if SumUp is enabled (server action)
 * @returns {Promise<Object>} Enabled status result
 */
export async function checkSumUpEnabled() {
    try {
        const enabled = await isSumUpEnabled();
        return {
            success: true,
            enabled
        };
    } catch (error) {
        console.error('Error checking SumUp enabled status:', error);
        return {
            success: false,
            error: error.message,
            enabled: false
        };
    }
}

/**
 * Create SumUp checkout (server action)
 * @param {Object} checkoutData - Checkout data
 * @returns {Promise<Object>} Checkout creation result
 */
export async function createSumUpCheckoutAction(checkoutData) {
    try {
        return await createSumUpCheckout(checkoutData);
    } catch (error) {
        console.error('Error creating SumUp checkout:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check SumUp payment status (server action)
 * @param {string} checkoutId - Checkout ID
 * @returns {Promise<Object>} Payment status result
 */
export async function checkSumUpStatus(checkoutId) {
    try {
        return await checkSumUpPaymentStatus(checkoutId);
    } catch (error) {
        console.error('Error checking SumUp payment status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
