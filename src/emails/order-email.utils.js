const ORDER_ITEM_TYPE_PHYSICAL = 'physical';
const NON_SHIPPING_ITEM_TYPES = new Set(['service', 'digital']);

export const loadOrderEmailTranslations = (locale = 'en') => {
    try {
        const translations = require(`@/locale/messages/${locale}/Email.json`);
        return translations.Email || {};
    } catch (error) {
        try {
            const fallback = require('@/locale/messages/en/Email.json');
            return fallback.Email || {};
        } catch {
            return {};
        }
    }
};

export const getOrderEmailCurrencyLocale = (locale = 'en', currency = 'EUR') => {
    const normalizedLocale = String(locale || 'en').toLowerCase();
    const normalizedCurrency = String(currency || 'EUR').toUpperCase();

    if (normalizedLocale.startsWith('pt')) return 'pt-PT';
    if (normalizedLocale.startsWith('fr')) return 'fr-FR';
    if (normalizedLocale.startsWith('es')) return 'es-ES';
    if (normalizedCurrency === 'EUR') return 'en-GB';
    if (normalizedCurrency === 'USD') return 'en-US';

    return 'en-US';
};

export const formatOrderEmailCurrency = (amount, currency = 'EUR', locale = 'en') => {
    const parsedAmount = parseFloat(amount || 0) || 0;

    return new Intl.NumberFormat(getOrderEmailCurrencyLocale(locale, currency), {
        style: 'currency',
        currency: String(currency || 'EUR').toUpperCase()
    }).format(parsedAmount);
};

export const formatOrderEmailPaymentMethod = (method, translations = {}) => {
    const methodKey = String(method || 'none').trim().toLowerCase();
    const aliases = {
        stripe: 'stripe',
        card: 'card',
        credit_card: 'credit_card',
        debit_card: 'debit_card',
        bank_transfer: 'bank_transfer',
        pay_on_delivery: 'pay_on_delivery',
        paypal: 'paypal',
        cash: 'cash',
        crypto: 'crypto',
        sumup: 'sumup',
        eupago: 'eupago',
        eupago_mb: 'eupago_mb',
        eupago_mbway: 'eupago_mbway',
        mb: 'multibanco',
        multibanco: 'multibanco',
        mbway: 'mbway',
        none: 'none',
        pending: 'none'
    };

    const normalizedKey = aliases[methodKey] || methodKey;
    const translated = translations?.paymentMethods?.[normalizedKey] || translations?.paymentMethods?.[methodKey];

    if (translated) {
        return translated;
    }

    const fallbackLabels = {
        stripe: 'Credit / Debit Card',
        card: 'Credit / Debit Card',
        credit_card: 'Credit Card',
        debit_card: 'Debit Card',
        bank_transfer: 'Bank Transfer',
        pay_on_delivery: 'Pay on Delivery',
        paypal: 'PayPal',
        cash: 'Cash',
        crypto: 'Cryptocurrency',
        sumup: 'SumUp',
        eupago: 'EuPago',
        eupago_mb: 'Multibanco',
        eupago_mbway: 'MB WAY',
        multibanco: 'Multibanco',
        mbway: 'MB WAY',
        none: 'Pending'
    };

    return fallbackLabels[normalizedKey] || method || fallbackLabels.none;
};

export const formatOrderEmailAddress = (address = {}) => {
    return [
        address.streetAddress,
        address.apartmentUnit,
        [address.city, address.state].filter(Boolean).join(', '),
        address.zipCode,
        address.country
    ]
        .filter(Boolean)
        .join(', ');
};

export const getOrderEmailFlags = ({ items = [], shippingAddress = {}, shippingCost = 0, isServiceAppointment = false }) => {
    const normalizedItems = Array.isArray(items) ? items : [];
    const itemTypes = normalizedItems.map((item) => String(item?.type || '').toLowerCase()).filter(Boolean);
    const hasServiceItems = isServiceAppointment || itemTypes.includes('service');
    const hasDigitalItems = itemTypes.includes('digital');
    const hasPhysicalItems =
        itemTypes.includes(ORDER_ITEM_TYPE_PHYSICAL) ||
        itemTypes.some((type) => type && !NON_SHIPPING_ITEM_TYPES.has(type)) ||
        (parseFloat(shippingCost || 0) || 0) > 0;
    const hasShippingAddress = Boolean(
        shippingAddress?.streetAddress ||
            shippingAddress?.apartmentUnit ||
            shippingAddress?.city ||
            shippingAddress?.state ||
            shippingAddress?.zipCode ||
            shippingAddress?.country
    );

    return {
        hasServiceItems,
        hasDigitalItems,
        hasPhysicalItems,
        isServiceOnlyOrder: hasServiceItems && !hasPhysicalItems && !hasDigitalItems,
        isDigitalOnlyOrder: hasDigitalItems && !hasPhysicalItems && !hasServiceItems,
        showShippingAddress: hasPhysicalItems && hasShippingAddress,
        showServiceDetails: hasServiceItems,
        showDigitalDetails: hasDigitalItems
    };
};

export const getOrderItemMetaLines = (item = {}, translations = {}) => {
    const lines = [];
    const appointment = item.appointment || {};

    if (item.type === 'service' && (appointment.date || appointment.time || item.appointmentDate || item.appointmentTime)) {
        const appointmentLabel = translations?.common?.appointment || 'Appointment';
        const appointmentDate = appointment.date || item.appointmentDate || item.startDate || '';
        const appointmentTime = appointment.time || item.appointmentTime || item.startTime || '';
        lines.push(`${appointmentLabel}: ${[appointmentDate, appointmentTime].filter(Boolean).join(' ')}`.trim());
    }

    if (item.deliveryMethod) {
        const deliveryMethodLabel = translations?.common?.deliveryMethod || 'Delivery Method';
        lines.push(`${deliveryMethodLabel}: ${item.deliveryMethod}`);
    }

    if (item.type === 'digital' && item.downloadUrl) {
        const digitalLabel = translations?.common?.digitalDelivery || 'Digital Delivery';
        lines.push(`${digitalLabel}: ${item.downloadUrl}`);
    }

    return lines.filter(Boolean);
};