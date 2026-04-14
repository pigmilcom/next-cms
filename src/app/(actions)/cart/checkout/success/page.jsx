// @/app/(actions)/cart/checkout/success/page.jsx (Checkout Success Server Component)

import { getOrder } from '@/lib/server/orders.js';
import { getSettings } from '@/lib/server/settings.js';
import CheckoutSuccessPageClient from './page.client';

// No caching for success page (always fresh order status)
export const revalidate = 0;

const parseJSON = (data, fallback = {}) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data);
    } catch {
        return fallback;
    }
};

const normalizeSuccessOrder = (orderData, fallbackPaymentMethod, eupagoReference, eupagoEntity, eupagoAmount) => {
    const customerData = parseJSON(orderData.customer, {});
    const shippingAddress = parseJSON(orderData.shippingAddress || orderData.shipping_address, customerData);
    const shipping = parseJSON(orderData.shipping, {});
    const rawItems = parseJSON(orderData.items, []);

    const items = rawItems.map((item) => {
        const appointmentFromFields =
            item.appointment ||
            (item.appointmentDate || item.appointmentTime
                ? {
                      date: item.appointmentDate || item.appointment?.date || item.startDate || '',
                      time: item.appointmentTime || item.appointment?.time || item.startTime || ''
                  }
                : null);

        const deliveryMethod = item.deliveryMethod || orderData.deliveryMethod || item.shippingMethod || item.method || null;

        return {
            ...item,
            appointment: appointmentFromFields,
            deliveryMethod
        };
    });

    return {
        id: orderData.id || orderData.uid || orderData.orderId,
        uid: orderData.uid || orderData.id || orderData.orderId,
        orderId: orderData.orderId || orderData.id || orderData.uid,
        key: orderData.key || orderData.id || orderData.orderId,
        paymentIntentId: orderData.paymentIntentId || orderData.tx || '',
        paymentMethod: orderData.paymentMethod || orderData.method || fallbackPaymentMethod || 'pending',
        paymentStatus: orderData.paymentStatus || 'pending',
        status: orderData.status || 'pending',
        createdAt: orderData.createdAt,
        created_at: orderData.created_at || orderData.createdAt,
        updatedAt: orderData.updatedAt || null,
        email: customerData.email || orderData.cst_email,
        cst_email: customerData.email || orderData.cst_email,
        customerName: customerData.firstName
            ? `${customerData.firstName} ${customerData.lastName}`
            : orderData.cst_name,
        cst_name: customerData.firstName
            ? `${customerData.firstName} ${customerData.lastName}`
            : orderData.cst_name,
        customer: customerData,
        shippingAddress,
        shipping_address: shippingAddress,
        items,
        total: parseFloat(orderData.total || orderData.finalTotal || orderData.amount || 0) || 0,
        amount: parseFloat(orderData.amount || orderData.total || orderData.finalTotal || 0) || 0,
        finalTotal: parseFloat(orderData.finalTotal || orderData.total || orderData.amount || 0) || 0,
        subtotal: parseFloat(orderData.subtotal || 0) || 0,
        shipping: {
            ...shipping,
            cost: parseFloat(shipping.cost || orderData.shippingCost || orderData.shipping || 0) || 0
        },
        shippingCost: parseFloat(orderData.shippingCost || orderData.shipping || shipping.cost || 0) || 0,
        vatAmount: parseFloat(orderData.vatAmount || 0) || 0,
        vatPercentage: orderData.vatPercentage || 0,
        vatIncluded: orderData.vatIncluded || false,
        vatEnabled: orderData.vatEnabled || false,
        discountAmount: parseFloat(orderData.discountAmount || 0) || 0,
        totalItems: orderData.totalItems,
        currency: orderData.currency || 'EUR',
        deliveryNotes: orderData.deliveryNotes || orderData.delivery_notes || '',
        delivery_notes: orderData.deliveryNotes || orderData.delivery_notes || '',
        shippingNotes: orderData.shippingNotes || '',
        eupagoReference: orderData.eupagoReference || eupagoReference || '',
        eupagoEntity: orderData.eupagoEntity || eupagoEntity || '',
        eupagoTransactionId: orderData.eupagoTransactionId || orderData.tx || '',
        eupagoAmount: parseFloat(orderData.eupagoAmount || eupagoAmount || 0) || 0,
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
};

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
            const [orderResult, settings] = await Promise.all([getOrder(actualOrderId), getSettings()]);

            if (!orderResult.success || !orderResult.data) {
                error = orderResult.error || orderResult.message || 'Order data not found';
            } else {
                const orderData = orderResult.data;
                orderDetails = normalizeSuccessOrder(
                    orderData,
                    paymentMethod,
                    eupagoReference,
                    eupagoEntity,
                    eupagoAmount
                );

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
                        initialSiteSettings={settings?.siteSettings || {}}
                        initialStoreSettings={settings?.storeSettings || {}}
                    />
                );
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
            initialSiteSettings={{}}
            initialStoreSettings={{}}
        />
    );
};

export default CheckoutSuccessPage;
