// @/app/(actions)/invoice/[id]/page.jsx (Public Invoice View)

import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/server/orders.js';
import { getAvailableInvoiceLanguages } from '@/lib/server/locale.js';
import { getSettings } from '@/lib/server/settings.js';
import { getCatalog } from '@/lib/server/store.js';
import { decodePublicInvoiceId } from '@/lib/shared/order-links.js';
import InvoicePageClient from './page.client';

export const revalidate = 0;

export const metadata = {
    title: 'Invoice',
    description: 'Public invoice view',
    robots: {
        index: false,
        follow: false
    }
};

const parseJSON = (data, fallback = {}) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data);
    } catch {
        return fallback;
    }
};

const loadInvoiceTranslations = async (language) => {
    try {
        return await import(`@/locale/messages/${language}/Invoice.json`).then((mod) => mod.default.Invoice);
    } catch {
        return null;
    }
};

const buildCatalogLookup = (catalogItems = []) => {
    const lookup = new Map();

    for (const item of catalogItems) {
        if (!item) continue;

        if (item.id) {
            lookup.set(String(item.id), item);
        }

        if (item.slug) {
            lookup.set(String(item.slug), item);
        }
    }

    return lookup;
};

const normalizeInvoiceItemType = (value) => {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ');

    if (['physical', 'product', 'physical product'].includes(normalized)) {
        return 'physical';
    }

    if (['service', 'booking'].includes(normalized)) {
        return 'service';
    }

    if (['digital', 'download', 'digital product'].includes(normalized)) {
        return 'digital';
    }

    return normalized || 'catalog';
};

const normalizeOrderForInvoice = (orderData, catalogLookup) => {
    const customer = parseJSON(orderData.customer, {});
    const shippingAddress = parseJSON(orderData.shippingAddress || orderData.shipping_address, customer);
    const shipping = parseJSON(orderData.shipping, {});
    const rawItems = parseJSON(orderData.items, []);

    const items = rawItems.map((item) => {
        const catalogItem =
            catalogLookup.get(String(item.id || '')) ||
            catalogLookup.get(String(item.productId || '')) ||
            catalogLookup.get(String(item.slug || ''));

        const appointment =
            item.appointment ||
            (item.appointmentDate || item.appointmentTime
                ? {
                      date: item.appointmentDate || item.appointment?.date || item.startDate || '',
                      time: item.appointmentTime || item.appointment?.time || item.startTime || ''
                  }
                : null);

        return {
            ...item,
            id: item.id || item.productId || item.slug || '',
            productId: item.productId || item.id || '',
            type: normalizeInvoiceItemType(item.type || catalogItem?.type || 'catalog'),
            image: item.image || catalogItem?.image || catalogItem?.cover || '',
            appointment,
            deliveryMethod: item.deliveryMethod || orderData.deliveryMethod || item.shippingMethod || item.method || null
        };
    });

    return {
        id: orderData.id || orderData.uid || orderData.orderId,
        uid: orderData.uid || orderData.id || orderData.orderId,
        orderId: orderData.orderId || orderData.id || orderData.uid,
        key: orderData.key || orderData.id || orderData.orderId,
        paymentIntentId: orderData.paymentIntentId || orderData.tx || '',
        paymentMethod: orderData.paymentMethod || orderData.method || 'pending',
        paymentStatus: orderData.paymentStatus || 'pending',
        status: orderData.status || 'pending',
        createdAt: orderData.createdAt,
        created_at: orderData.created_at || orderData.createdAt,
        updatedAt: orderData.updatedAt || null,
        customerName:
            `${customer.firstName || shippingAddress.firstName || ''} ${customer.lastName || shippingAddress.lastName || ''}`.trim() ||
            orderData.customerName ||
            orderData.cst_name ||
            'Customer',
        email: customer.email || shippingAddress.email || orderData.email || orderData.customerEmail || orderData.cst_email,
        cst_email: customer.email || shippingAddress.email || orderData.email || orderData.customerEmail || orderData.cst_email,
        cst_name: orderData.cst_name || '',
        customer,
        shippingAddress,
        shipping_address: shippingAddress,
        items,
        subtotal: parseFloat(orderData.subtotal || 0) || 0,
        shippingCost: parseFloat(orderData.shippingCost || orderData.shipping || shipping.cost || 0) || 0,
        shipping: {
            ...shipping,
            cost: parseFloat(shipping.cost || orderData.shippingCost || orderData.shipping || 0) || 0
        },
        vatAmount: parseFloat(orderData.vatAmount || 0) || 0,
        vatPercentage: parseFloat(orderData.vatPercentage || 0) || 0,
        vatIncluded: orderData.vatIncluded || false,
        vatEnabled: orderData.vatEnabled || false,
        discountAmount: parseFloat(orderData.discountAmount || 0) || 0,
        total: parseFloat(orderData.total || orderData.finalTotal || orderData.amount || 0) || 0,
        amount: parseFloat(orderData.amount || orderData.total || orderData.finalTotal || 0) || 0,
        finalTotal: parseFloat(orderData.finalTotal || orderData.total || orderData.amount || 0) || 0,
        currency: orderData.currency || 'EUR',
        deliveryNotes: orderData.deliveryNotes || orderData.delivery_notes || '',
        delivery_notes: orderData.deliveryNotes || orderData.delivery_notes || '',
        shippingNotes: orderData.shippingNotes || '',
        bankTransferDetails: orderData.bankTransferDetails || null,
        eupagoReference: orderData.eupagoReference || '',
        eupagoEntity: orderData.eupagoEntity || '',
        eupagoTransactionId: orderData.eupagoTransactionId || orderData.tx || '',
        eupagoMethod: orderData.eupagoMethod || '',
        eupagoMobile: orderData.eupagoMobile || '',
        expiryTime: orderData.expiryTime || null
    };
};

const InvoicePage = async ({ params, searchParams }) => {
    const { id: encodedId } = await params;
    const resolvedSearchParams = (await searchParams) || {};

    if (!encodedId) {
        notFound();
    }

    const orderId = decodePublicInvoiceId(encodedId);
    if (!orderId || !orderId.startsWith('ORD')) {
        notFound();
    }

    const [orderResult, settings, catalogResult, availableInvoiceLanguagesResult] = await Promise.all([
        getOrder(orderId),
        getSettings(),
        getCatalog({ limit: 0, activeOnly: false }),
        getAvailableInvoiceLanguages()
    ]);

    const siteDefaultLocale = settings?.siteSettings?.language || 'pt';
    const availableInvoiceLanguages =
        availableInvoiceLanguagesResult?.success && Array.isArray(availableInvoiceLanguagesResult.data)
            ? availableInvoiceLanguagesResult.data
            : [siteDefaultLocale];
    const requestedLocale = String(resolvedSearchParams?.locale || '').trim().toLowerCase();
    const locale =
        requestedLocale && availableInvoiceLanguages.includes(requestedLocale)
            ? requestedLocale
            : siteDefaultLocale;
    const invoiceTranslationEntries = await Promise.all(
        availableInvoiceLanguages.map(async (language) => [language, await loadInvoiceTranslations(language)])
    );
    const invoiceTranslationsMap = Object.fromEntries(invoiceTranslationEntries.filter(([, translations]) => Boolean(translations)));
    const translations = invoiceTranslationsMap[locale] || (await loadInvoiceTranslations(locale)) || invoiceTranslationsMap.en || {};

    if (!orderResult?.success || !orderResult.data) {
        notFound();
    }

    const catalogData = Array.isArray(catalogResult?.data) ? catalogResult.data : [];
    const normalizedOrder = normalizeOrderForInvoice(orderResult.data, buildCatalogLookup(catalogData));

    return (
        <InvoicePageClient
            order={normalizedOrder}
            invoiceTranslations={translations}
            invoiceTranslationsMap={invoiceTranslationsMap}
            invoiceLocale={locale}
            availableInvoiceLanguages={availableInvoiceLanguages}
            initialSiteSettings={settings?.siteSettings || {}}
            initialStoreSettings={settings?.storeSettings || {}}
        />
    );
};

export default InvoicePage;
