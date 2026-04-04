import { jsPDF } from 'jspdf';

export const generatePDF = async (order, storeSettings = null, locale = 'pt') => {
    // Load translations from JSON file directly (client-safe)
    const translations = await import(`@/locale/messages/${locale}/Invoice.json`).then((mod) => mod.default.Invoice);

    // Simple translation helper
    const t = (key) => {
        const keys = key.split('.');
        let value = translations;
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) return key;
        }
        return value;
    };

    const doc = new jsPDF();

    // Fallback store settings matching the actual structure from getStoreSettings
    const defaultSettings = {
        businessName: 'My Store',
        tvaNumber: '',
        address: '123 Main St, City, Country',
        currency: 'EUR',
        vatEnabled: true,
        vatPercentage: 20,
        vatIncludedInPrice: true
    };

    const settings = storeSettings || defaultSettings;

    // Helper function to safely parse JSON strings or objects
    const parseJSON = (data, fallback = {}) => {
        if (!data) return fallback;
        if (typeof data === 'object') return data;
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return fallback;
        }
    };

    // Parse customer data - handle both shippingAddress and customer structures
    const customer = parseJSON(order.customer, {});
    const shippingAddress = parseJSON(order.shippingAddress || order.shipping_address, customer);
    const items = parseJSON(order.items, []);

    // Helper function to format currency
    const formatCurrency = (amount, currency = null) => {
        const currencyCode = currency || settings.currency || 'EUR';
        const locale = currencyCode === 'EUR' ? 'fr-FR' : currencyCode === 'USD' ? 'en-US' : 'en-GB';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode.toUpperCase()
        }).format(amount);
    };

    // Helper function to format date
    const formatDate = (timestamp) => {
        if (!timestamp) return new Date().toLocaleDateString('en-US');

        const date =
            typeof timestamp === 'number'
                ? new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
                : new Date(timestamp);

        return date.toLocaleDateString('en-US');
    };

    // Helper function to format payment method
    const formatPaymentMethod = (method) => {
        const methodKey = method || 'none';
        return t(`paymentMethods.${methodKey}`) || method || t('paymentMethods.none');
    };

    // Helper function to format order status
    const formatOrderStatus = (status) => {
        const statusMap = {
            pending: 'Pendente',
            paid: 'Pago',
            failed: 'Cancelado',
            cancelled: 'Cancelado'
        };
        return statusMap[status] || status || 'Pendente';
    };

    // Helper function to convert country ISO code to full country name
    const getCountryName = (countryCode) => {
        if (!countryCode) return '';

        // If it's already a full name (length > 2), return as is
        if (countryCode.length > 2) return countryCode;

        // Map of ISO codes to country names
        const countryMap = {
            PT: 'Portugal',
            ES: 'Spain',
            FR: 'France',
            DE: 'Germany',
            IT: 'Italy',
            GB: 'United Kingdom',
            UK: 'United Kingdom',
            US: 'United States',
            CA: 'Canada',
            BR: 'Brazil',
            MX: 'Mexico',
            AR: 'Argentina',
            CL: 'Chile',
            CO: 'Colombia',
            PE: 'Peru',
            NL: 'Netherlands',
            BE: 'Belgium',
            CH: 'Switzerland',
            SE: 'Sweden',
            NO: 'Norway',
            DK: 'Denmark',
            FI: 'Finland',
            PL: 'Poland',
            AT: 'Austria',
            IE: 'Ireland',
            GR: 'Greece',
            CZ: 'Czech Republic',
            RO: 'Romania',
            HU: 'Hungary',
            AU: 'Australia',
            NZ: 'New Zealand',
            JP: 'Japan',
            CN: 'China',
            IN: 'India',
            SG: 'Singapore',
            KR: 'South Korea',
            TH: 'Thailand',
            MY: 'Malaysia',
            ID: 'Indonesia',
            PH: 'Philippines',
            VN: 'Vietnam',
            HK: 'Hong Kong',
            TW: 'Taiwan',
            AE: 'United Arab Emirates',
            SA: 'Saudi Arabia',
            IL: 'Israel',
            TR: 'Turkey',
            QA: 'Qatar',
            KW: 'Kuwait',
            ZA: 'South Africa',
            EG: 'Egypt',
            NG: 'Nigeria',
            KE: 'Kenya'
        };

        return countryMap[countryCode.toUpperCase()] || countryCode;
    };

    // ===== INVOICE HEADER =====
    let yPos = 20;

    // Left side - INVOICE title and Order ID
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 24, 39); // gray-900
    doc.text(t('invoiceTitle').toUpperCase(), 20, yPos);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(75, 85, 99); // gray-600
    doc.text(`#${order.id || order.uid || order.orderId || 'N/A'}`, 20, yPos + 6);

    // Right side - Business Information
    yPos = 20;
    const businessName = settings.businessName || '';
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(businessName, 190, yPos, { align: 'right' });

    yPos += 6;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(75, 85, 99);

    if (settings.address) {
        doc.text(settings.address, 190, yPos, { align: 'right' });
        yPos += 4;
    }
    if (settings.tvaNumber) {
        doc.text(`${settings.tvaNumber}`, 190, yPos, { align: 'right' });
        yPos += 4;
    }

    // ===== BILL TO & INVOICE DETAILS SECTION =====
    yPos = 45;
    const leftColX = 20;
    const rightColX = 110;

    // Bill To (Left Column)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(t('billTo') + ':', leftColX, yPos);

    yPos += 6;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(75, 85, 99);

    // Customer name
    const customerName =
        `${customer.firstName || shippingAddress.firstName || ''} ${customer.lastName || shippingAddress.lastName || ''}`.trim() ||
        order.customerName ||
        order.cst_name ||
        'N/A';
    doc.setFont(undefined, 'bold');
    doc.text(customerName, leftColX, yPos);
    yPos += 4;

    doc.setFont(undefined, 'normal');
    // Customer email
    const customerEmail =
        customer.email || shippingAddress.email || order.email || order.customerEmail || order.cst_email;
    if (customerEmail) {
        doc.text(customerEmail, leftColX, yPos);
        yPos += 4;
    }

    // Customer phone
    const customerPhone = customer.phone || shippingAddress.phone;
    if (customerPhone) {
        doc.text(customerPhone, leftColX, yPos);
        yPos += 4;
    }

    // Customer address
    yPos += 2;
    const streetAddress =
        customer.streetAddress || shippingAddress.streetAddress || customer.street || shippingAddress.street;
    if (streetAddress) {
        doc.text(streetAddress, leftColX, yPos);
        yPos += 4;
    }

    const apartmentUnit =
        customer.apartmentUnit || shippingAddress.apartmentUnit || customer.apartment || shippingAddress.apartment;
    if (apartmentUnit) {
        doc.text(apartmentUnit, leftColX, yPos);
        yPos += 4;
    }

    const city = customer.city || shippingAddress.city;
    const state = customer.state || shippingAddress.state;
    const zipCode = customer.zipCode || shippingAddress.zipCode || customer.zip || shippingAddress.zip;
    if (city || state || zipCode) {
        doc.text(`${city || ''}${state ? ', ' + state : ''} ${zipCode || ''}`, leftColX, yPos);
        yPos += 4;
    }

    const country = customer.country || shippingAddress.country || customer.countryIso || shippingAddress.countryIso;
    if (country) {
        doc.text(getCountryName(country), leftColX, yPos);
    }

    // Invoice Details (Right Column)
    yPos = 45;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(t('invoiceDetails') + ':', rightColX, yPos);

    yPos += 6;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(75, 85, 99);

    // Invoice Date
    doc.text(t('invoiceDate') + ':', rightColX, yPos);
    doc.text(formatDate(order.createdAt || order.created_at || order.orderDate), 190, yPos, { align: 'right' });
    yPos += 4;

    // Payment Method
    doc.text(t('paymentMethod') + ':', rightColX, yPos);
    doc.text(formatPaymentMethod(order.paymentMethod || order.method), 190, yPos, { align: 'right' });
    yPos += 4;

    // EuPago details if available
    if (order.eupagoReference) {
        doc.text(t('reference') + ':', rightColX, yPos);
        doc.setFont(undefined, 'bold');
        doc.text(order.eupagoReference, 190, yPos, { align: 'right' });
        doc.setFont(undefined, 'normal');
        yPos += 4;

        if (order.eupagoEntity) {
            doc.text(t('entity') + ':', rightColX, yPos);
            doc.setFont(undefined, 'bold');
            doc.text(order.eupagoEntity, 190, yPos, { align: 'right' });
            doc.setFont(undefined, 'normal');
            yPos += 4;
        }
    }

    // Order Status
    doc.text(t('status') + ':', rightColX, yPos);
    doc.setFont(undefined, 'bold');
    doc.text(formatOrderStatus(order.paymentStatus || 'pending'), 190, yPos, { align: 'right' });
    doc.setFont(undefined, 'normal');

    // ===== ITEMS TABLE =====
    yPos = Math.max(yPos, 100) + 10;

    // ===== ITEMS TABLE =====
    yPos = Math.max(yPos, 100) + 10;

    // Table Header
    doc.setFillColor(249, 250, 251); // gray-50
    doc.rect(20, yPos - 3, 170, 7, 'F');

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(t('description'), 22, yPos);
    doc.text(t('qty'), 130, yPos, { align: 'center' });
    doc.text(t('price'), 155, yPos, { align: 'right' });
    doc.text(t('total'), 188, yPos, { align: 'right' });

    yPos += 7;

    // Table border line
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 190, yPos);
    yPos += 4;

    // Items
    doc.setFont(undefined, 'normal');
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(8);

    if (items && items.length > 0) {
        items.forEach((item, index) => {
            // Check if we need a new page
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity, 10) || 1;
            const itemTotal = itemPrice * itemQuantity;

            // Item name (truncate if too long)
            const productName = item.name || 'Product';
            const maxNameLength = 45;
            const displayName =
                productName.length > maxNameLength ? `${productName.substring(0, maxNameLength - 3)}...` : productName;

            doc.text(displayName, 22, yPos);
            doc.text(`${itemQuantity}`, 130, yPos, { align: 'center' });
            doc.text(formatCurrency(itemPrice), 155, yPos, { align: 'right' });
            doc.setFont(undefined, 'bold');
            doc.text(formatCurrency(itemTotal), 188, yPos, { align: 'right' });
            doc.setFont(undefined, 'normal');

            yPos += 5;

            // Light separator line between items
            if (index < items.length - 1) {
                doc.setDrawColor(243, 244, 246); // gray-100
                doc.line(20, yPos, 190, yPos);
                yPos += 3;
            }
        });
    } else {
        doc.setTextColor(107, 114, 128);
        doc.text(t('noItemsFound'), 22, yPos);
        yPos += 5;
    }

    yPos += 5;

    // ===== TOTALS SECTION =====
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    // Calculate totals
    const subtotal = parseFloat(order.subtotal || 0) || 0;
    const shippingCost = parseFloat(order.shippingCost || order.shipping || 0) || 0;
    const discountAmount = parseFloat(order.discountAmount || 0) || 0;
    const vatAmount = parseFloat(order.vatAmount || 0) || 0;
    const totalAmount = parseFloat(order.finalTotal || order.total || order.amount || 0) || 0;

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 24, 39);

    // Subtotal
    doc.text(t('subtotal') + ':', 155, yPos, { align: 'right' });
    doc.text(formatCurrency(subtotal), 188, yPos, { align: 'right' });
    yPos += 5;

    // Shipping
    doc.text(t('shipping') + ':', 155, yPos, { align: 'right' });
    doc.text(formatCurrency(shippingCost), 188, yPos, { align: 'right' });
    yPos += 5;

    // VAT
    if ((order.vatEnabled || settings.vatEnabled) && vatAmount > 0) {
        const vatPercentage = order.vatPercentage || settings.vatPercentage || 20;
        const vatIncluded = order.vatIncluded !== undefined ? order.vatIncluded : settings.vatIncludedInPrice;

        doc.text(`${t('vat')} (${vatPercentage}%):`, 155, yPos, { align: 'right' });
        doc.text(vatIncluded ? t('included') : formatCurrency(vatAmount), 188, yPos, { align: 'right' });

        yPos += 5;
    }

    // Discount
    if (discountAmount > 0) {
        doc.setTextColor(22, 163, 74); // green-600
        doc.text(t('discount') + ':', 155, yPos, { align: 'right' });
        doc.text(`-${formatCurrency(discountAmount)}`, 188, yPos, { align: 'right' });
        doc.setTextColor(17, 24, 39);
        yPos += 5;
    }

    // Total line
    yPos += 2;
    doc.setDrawColor(17, 24, 39); // gray-900
    doc.setLineWidth(0.5);
    doc.line(130, yPos, 190, yPos);
    yPos += 7;

    // Total amount
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(t('total') + ':', 155, yPos, { align: 'right' });
    doc.text(formatCurrency(totalAmount), 188, yPos, { align: 'right' });

    // ===== FOOTER =====
    yPos += 20;

    // Delivery notes if present
    if (order.deliveryNotes || order.delivery_notes) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(75, 85, 99);
        doc.text(t('deliveryNotes') + ':', 20, yPos);
        yPos += 4;

        doc.setFont(undefined, 'normal');
        const notes = order.deliveryNotes || order.delivery_notes;
        const maxWidth = 170;
        const lines = doc.splitTextToSize(notes, maxWidth);
        doc.text(lines, 20, yPos);
        yPos += lines.length * 4 + 8;
    }

    // Thank you message
    if (yPos > 260) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(t('thankYouMessage'), 105, yPos, { align: 'center' });
    yPos += 5;

    if (settings.businessWebsite) {
        doc.setFontSize(8);
        doc.text(settings.businessWebsite, 105, yPos, { align: 'center' });
    }

    // Save the PDF
    const fileName = `invoice-${order.id || order.uid || order.orderId}-${formatDate(order.createdAt || order.created_at || order.orderDate).replace(/\//g, '-')}.pdf`;
    doc.save(fileName);

    return fileName;
};
