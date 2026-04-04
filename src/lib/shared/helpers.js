// @/lib/shared/helpers.js

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 * @param {string|null} prefix - Optional prefix for the UID
 * @returns {string} Unique ID in format: XXXXXXXX_timestamp or PREFIX_XXXXXXXX_timestamp
*/
export function generateUID(prefix = null) {
    return `${prefix ? prefix + '_' : ''}${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now()}`;
}

/**
 * Keyword extraction helper
 * @param {string} titleOrName - Title or name text
 * @param {string} description - Description text
 * @param {number} limit - Maximum number of keywords to extract
 * @returns {string} Comma-separated keywords
*/ 
const STOP_WORDS = new Set([
    'the', 'and', 'or', 'a', 'an', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'from',
    'is', 'are', 'this', 'that', 'it', 'as', 'be', 'your'
]);

export function generateKeywords(titleOrName = '', description = '', limit = 10) {
    let keywordLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
    let sourceTitle = titleOrName;
    let sourceDescription = description;

    // Backward compatibility: generateKeywords(description, limit)
    if (typeof description === 'number') {
        keywordLimit = Number.isFinite(description) && description > 0 ? Math.floor(description) : 10;
        sourceDescription = '';
    }

    const normalizeText = (value) =>
        String(value || '')
            .replace(/<[^>]*>/g, ' ')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const combinedText = `${normalizeText(sourceTitle)} ${normalizeText(sourceDescription)}`.trim();
    if (!combinedText) {
        return '';
    }

    const words = combinedText
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

    if (words.length === 0) {
        return '';
    }

    const frequencies = {};
    for (const word of words) {
        frequencies[word] = (frequencies[word] || 0) + 1;
    }

    return Object.entries(frequencies)
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }
            return a[0].localeCompare(b[0]);
        })
        .slice(0, keywordLimit)
        .map(([word]) => word)
        .join(', ');
}


/**
 * Validate and sanitize order data
 * @param {Object} orderData - Raw order data from frontend
 * @returns {Object} Validated order data
 * @throws {Error} If validation fails
*/
export function validateOrderData(orderData) {
    // Validate required fields
    if (!orderData.customer) {
        throw new Error('Customer information is required');
    }

    if (!orderData.customer.email || !orderData.customer.firstName || !orderData.customer.lastName) {
        throw new Error('Customer name and email are required');
    }

    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Order must contain at least one item');
    }

    if (typeof orderData.finalTotal !== 'number' || orderData.finalTotal < 0) {
        throw new Error('Invalid order total');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.customer.email)) {
        throw new Error('Invalid email address');
    }

    // Sanitize strings
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str.trim().substring(0, 500); // Limit length
    };

    // Return sanitized order data
    return {
        ...orderData,
        customer: {
            ...orderData.customer,
            firstName: sanitizeString(orderData.customer.firstName),
            lastName: sanitizeString(orderData.customer.lastName),
            email: sanitizeString(orderData.customer.email.toLowerCase()),
            phone: sanitizeString(orderData.customer.phone || ''),
            streetAddress: sanitizeString(orderData.customer.streetAddress || ''),
            apartmentUnit: sanitizeString(orderData.customer.apartmentUnit || ''),
            city: sanitizeString(orderData.customer.city || ''),
            state: sanitizeString(orderData.customer.state || ''),
            zipCode: sanitizeString(orderData.customer.zipCode || ''),
            country: sanitizeString(orderData.customer.country || ''),
            countryIso: sanitizeString(orderData.customer.countryIso || '')
        },
        items: orderData.items.map((item) => ({
            ...item,
            id: sanitizeString(item.id || ''),
            name: sanitizeString(item.name || ''),
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 1,
            type: sanitizeString(item.type || 'catalog')
        })),
        deliveryNotes: sanitizeString(orderData.deliveryNotes || ''),
        shippingNotes: sanitizeString(orderData.shippingNotes || ''),
        // Preserve order ID if provided from frontend
        id: orderData.id || null,
        // Ensure numeric fields are valid
        subtotal: parseFloat(orderData.subtotal) || 0,
        shippingCost: parseFloat(orderData.shippingCost) || 0,
        discountAmount: parseFloat(orderData.discountAmount) || 0,
        discountType: orderData.discountType || 'fixed',
        discountValue: parseFloat(orderData.discountValue) || 0,
        vatAmount: parseFloat(orderData.vatAmount) || 0,
        vatPercentage: parseFloat(orderData.vatPercentage) || 0,
        vatEnabled: orderData.vatEnabled || false,
        vatIncluded: orderData.vatIncluded || false,
        finalTotal: parseFloat(orderData.finalTotal) || 0,
        // Ensure required fields have defaults
        status: orderData.status || 'pending',
        paymentStatus: orderData.paymentStatus || 'pending',
        paymentMethod: sanitizeString(orderData.paymentMethod || ''),
        bankTransferDetails: orderData.bankTransferDetails || null,
        orderType: 'online', // Always set to 'online' for frontend orders
        sendEmail: orderData.sendEmail !== false,
        isServiceAppointment: orderData.isServiceAppointment || false,
        appointmentId: orderData.appointmentId || null,
        // Preserve timestamps if provided
        createdAt: orderData.createdAt || null,
        updatedAt: orderData.updatedAt || null
    };
}
