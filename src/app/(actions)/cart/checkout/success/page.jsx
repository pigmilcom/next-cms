// @/app/(actions)/cart/checkout/success/page.jsx (Checkout Success Server Component)

import { getOrder } from '@/lib/server/orders.js';
import CheckoutSuccessPageClient from './page.client';

// No caching for success page (always fresh order status)
export const revalidate = 0;

const CheckoutSuccessPage = async ({ searchParams }) => {
    // Get URL parameters
    const params = await searchParams;
    const orderId = params.tx || params.order_id;
    const paymentMethod = params.payment_method;
    const eupagoMethod = params.eupago_method;
    const eupagoReference = params.reference;
    const eupagoEntity = params.entity;
    const eupagoAmount = params.amount;

    let orderDetails = null;
    let error = null;

    let actualOrderId = orderId || null;

    try {
        actualOrderId = atob(orderId);
    } catch (_e) {
        actualOrderId = orderId || null;
    }

    try {
        if (!actualOrderId) {
            error = 'Order not found';
        } else {
            // Fetch order directly from database
            const orderResult = await getOrder(actualOrderId);

            if (!orderResult.success || !orderResult.data) {
                error = orderResult.error || orderResult.message || 'Order data not found';
            } else {
                const orderData = orderResult.data;

                // Parse items and customer data if they are stored as strings
                const rawItems =
                    typeof orderData.items === 'string' ? JSON.parse(orderData.items) : orderData.items || [];
                const customerData =
                    typeof orderData.customer === 'string' ? JSON.parse(orderData.customer) : orderData.customer || {};
                const shippingAddress =
                    typeof orderData.shippingAddress === 'string'
                        ? JSON.parse(orderData.shippingAddress)
                        : orderData.shippingAddress || {};

                // Normalize items for display
                const items = rawItems.map((item) => {
                    const appointmentFromFields =
                        item.appointment ||
                        (item.appointmentDate || item.appointmentTime
                            ? {
                                  date: item.appointmentDate || item.appointment?.date || item.startDate || '',
                                  time: item.appointmentTime || item.appointment?.time || item.startTime || ''
                              }
                            : null);

                    const deliveryMethod =
                        item.deliveryMethod || orderData.deliveryMethod || item.shippingMethod || item.method || null;

                    return {
                        ...item,
                        appointment: appointmentFromFields,
                        deliveryMethod
                    };
                });

                // Build order details object with exact database values
                orderDetails = {
                    id: orderData.id || actualOrderId,
                    uid: orderData.id || actualOrderId,
                    orderId: orderData.id || actualOrderId,
                    paymentIntentId: orderData.paymentIntentId || orderData.tx,
                    paymentMethod: orderData.paymentMethod || paymentMethod,
                    status: orderData.status || 'pending',
                    paymentStatus: orderData.paymentStatus || 'pending',
                    createdAt: orderData.createdAt,
                    created_at: orderData.createdAt,
                    email: customerData.email || orderData.cst_email,
                    cst_email: customerData.email || orderData.cst_email,
                    customerName: customerData.firstName
                        ? `${customerData.firstName} ${customerData.lastName}`
                        : orderData.cst_name,
                    cst_name: customerData.firstName
                        ? `${customerData.firstName} ${customerData.lastName}`
                        : orderData.cst_name,
                    customer: customerData,
                    shippingAddress: shippingAddress,
                    shipping_address: shippingAddress,
                    items,
                    // Use exact values from database order record
                    total: parseFloat(orderData.total || 0),
                    amount: parseFloat(orderData.total || 0),
                    finalTotal: parseFloat(orderData.total || 0),
                    subtotal: parseFloat(orderData.subtotal || 0),
                    shipping: parseFloat(orderData.shippingCost || orderData.shipping || 0),
                    shippingCost: parseFloat(orderData.shippingCost || orderData.shipping || 0),
                    vatAmount: parseFloat(orderData.vatAmount || 0),
                    vatPercentage: orderData.vatPercentage || 0,
                    vatIncluded: orderData.vatIncluded || false,
                    vatEnabled: orderData.vatEnabled || false,
                    discountAmount: parseFloat(orderData.discountAmount || 0),
                    totalItems: orderData.totalItems,
                    currency: orderData.currency || 'EUR',
                    deliveryNotes: orderData.deliveryNotes || orderData.delivery_notes || '',
                    delivery_notes: orderData.deliveryNotes || orderData.delivery_notes || '',
                    shippingNotes: orderData.shippingNotes || '',
                    // EuPago payment details
                    eupagoReference: orderData.eupagoReference || eupagoReference || '',
                    eupagoEntity: orderData.eupagoEntity || eupagoEntity || '',
                    eupagoTransactionId: orderData.eupagoTransactionId || orderData.tx || '',
                    eupagoAmount: parseFloat(orderData.eupagoAmount) || parseFloat(eupagoAmount || 0).toFixed(2),
                    mbwayExpiryTime: orderData.mbwayExpiryTime,
                    mbExpiryTime: orderData.mbExpiryTime,
                    expiryTime: orderData.expiryTime,
                    orderDate: orderData.createdAt
                        ? new Date(orderData.createdAt).toLocaleDateString('pt-PT', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                          })
                        : new Date().toLocaleDateString('pt-PT', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                          })
                };
            }
        }
    } catch (e) {
        error = 'Order retrieval error';
    }

    return (
        <CheckoutSuccessPageClient
            initialOrderDetails={orderDetails}
            initialError={error}
            orderId={actualOrderId}
            paymentMethod={paymentMethod}
            eupagoMethod={eupagoMethod}
            eupagoReference={eupagoReference}
            eupagoEntity={eupagoEntity}
            eupagoAmount={eupagoAmount}
        />
    );
};

export default CheckoutSuccessPage;
