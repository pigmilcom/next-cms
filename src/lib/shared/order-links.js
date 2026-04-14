const toBase64 = (value) => {
    const raw = String(value || '');

    if (typeof Buffer !== 'undefined') {
        return Buffer.from(raw, 'utf-8').toString('base64');
    }

    if (typeof btoa !== 'undefined') {
        return btoa(raw);
    }

    throw new Error('Base64 encoding is not available in this environment.');
};

const fromBase64 = (value) => {
    const raw = String(value || '');

    if (typeof Buffer !== 'undefined') {
        return Buffer.from(raw, 'base64').toString('utf-8');
    }

    if (typeof atob !== 'undefined') {
        return atob(raw);
    }

    throw new Error('Base64 decoding is not available in this environment.');
};

export const encodePublicInvoiceId = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    return toBase64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const decodePublicInvoiceId = (encodedId = '') => {
    try {
        const normalized = String(encodedId || '')
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
        return fromBase64(padded);
    } catch {
        return '';
    }
};

export const buildPublicInvoiceUrl = (baseUrl = '', orderId = '', locale = '') => {
    const encodedOrderId = encodePublicInvoiceId(orderId);
    if (!encodedOrderId) {
        return '';
    }

    const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/$/, '');
    const invoicePath = `/invoice/${encodedOrderId}`;
    const normalizedLocale = String(locale || '').trim();
    const localeQuery = normalizedLocale ? `?locale=${encodeURIComponent(normalizedLocale)}` : '';

    return normalizedBaseUrl ? `${normalizedBaseUrl}${invoicePath}${localeQuery}` : `${invoicePath}${localeQuery}`;
};