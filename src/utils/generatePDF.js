import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { getCountryName } from '@/lib/i18n.js';
import { buildPublicInvoiceUrl } from '@/lib/shared/order-links.js';

export const generatePDF = async (order, settingsInput = null, locale = 'pt', options = {}) => {
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

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Backward-compatible settings normalization:
    // 1) generatePDF(order, { siteSettings, storeSettings }, locale)
    // 2) generatePDF(order, storeSettings, locale)
    const siteSettings =
        settingsInput && typeof settingsInput === 'object' && 'siteSettings' in settingsInput
            ? settingsInput.siteSettings || {}
            : {};
    const storeSettings =
        settingsInput && typeof settingsInput === 'object' && 'storeSettings' in settingsInput
            ? settingsInput.storeSettings || {}
            : settingsInput || {};

    const settings = {
        businessName: storeSettings.businessName || siteSettings.siteName ||  siteSettings.baseUrl?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
        tvaNumber: storeSettings.tvaNumber || '',
        address: storeSettings.address || siteSettings.businessAddress || '',
        currency: storeSettings.currency || siteSettings.currency || 'EUR',
        vatEnabled: storeSettings.vatEnabled !== false,
        vatPercentage: storeSettings.vatPercentage || 0,
        vatIncludedInPrice: storeSettings.vatIncludedInPrice !== false,
        siteEmail: siteSettings.siteEmail || '',
        sitePhone: siteSettings.sitePhone || '',
        baseUrl: siteSettings.baseUrl || '',
        businessWebsite: siteSettings.baseUrl || '',
        logoPath: siteSettings.siteLogo || 'images/logo.png'
    };

    const orderId = order.id || order.uid || order.orderId || '';
    const origin =
        (settings.baseUrl && String(settings.baseUrl).trim()) ||
        (typeof window !== 'undefined' ? window.location.origin : '');
    const invoiceUrl = buildPublicInvoiceUrl(origin, orderId, locale);

    let qrCodeDataUrl = null;
    try {
        if (invoiceUrl) {
            qrCodeDataUrl = await QRCode.toDataURL(invoiceUrl, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 180
            });
        }
    } catch {
        qrCodeDataUrl = null;
    }

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

    const isAbsoluteUrl = (value = '') => /^https?:\/\//i.test(String(value || '').trim());

    const buildImageCandidates = (src) => {
        const cleaned = String(src || '').trim();
        if (!cleaned) return [];

        if (isAbsoluteUrl(cleaned)) {
            if (typeof window !== 'undefined') {
                return [`/api/assets/proxy-image?url=${encodeURIComponent(cleaned)}`];
            }

            return [cleaned];
        }

        return Array.from(
            new Set([
                cleaned,
                cleaned.startsWith('/') ? cleaned : `/${cleaned}`,
                cleaned.startsWith('/public/') ? cleaned.replace('/public/', '/') : cleaned,
                cleaned.startsWith('public/') ? `/${cleaned.replace('public/', '')}` : cleaned
            ])
        );
    };

    const loadImageAsDataUrl = async (src) => {
        try {
            if (!src) return null;
            const candidates = buildImageCandidates(src);

            for (const candidate of candidates) {
                const response = await fetch(candidate);
                if (!response.ok) continue;

                const blob = await response.blob();
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                const mime = blob.type || '';
                let format = 'PNG';
                if (mime.includes('jpeg') || mime.includes('jpg')) format = 'JPEG';
                if (mime.includes('webp')) format = 'WEBP';

                return { dataUrl, format };
            }

            return null;
        } catch {
            return null;
        }
    };

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
        const methodKey = String(method || 'none').trim().toLowerCase();
        const paymentMethodAliases = {
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
            none: 'none'
        };

        const normalizedMethodKey = paymentMethodAliases[methodKey] || methodKey;

        return t(`paymentMethods.${normalizedMethodKey}`) || t(`paymentMethods.${methodKey}`) || method || t('paymentMethods.none');
    };

    // Helper function to format order status
    const formatOrderStatus = (status) => {
        const statusMap = {
            pending: t('statusLabels.pending'),
            paid: t('statusLabels.paid'),
            failed: t('statusLabels.failed'),
            cancelled: t('statusLabels.cancelled')
        };
        return statusMap[status] || status || t('statusLabels.pending');
    };

    const line = {
        dark: [17, 24, 39],
        medium: [75, 85, 99],
        light: [229, 231, 235],
        lighter: [243, 244, 246]
    };

    const marginX = 16;
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightEdge = pageWidth - marginX;

    const textLines = (value, maxWidth) => doc.splitTextToSize(String(value || ''), maxWidth);
    const drawTextLines = (lines, x, y, options = {}) => {
        if (!lines || lines.length === 0) return y;
        const lineHeight = options.lineHeight || 4;
        doc.text(lines, x, y, options);
        return y + lineHeight * lines.length;
    };

    const drawKv = (label, value, x, y, valueX) => {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...line.medium);
        doc.text(`${label}:`, x, y);
        doc.setTextColor(...line.dark);
        doc.text(String(value || ''), valueX, y, { align: 'right' });
        return y + 4.5;
    };

    const drawFooter = (pageNumber, totalPages) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const footerTopY = pageHeight - 24;
        const qrSize = 16;

        doc.setDrawColor(...line.light);
        doc.setLineWidth(0.25);
        doc.line(marginX, footerTopY - 2, rightEdge, footerTopY - 2);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...line.medium);

        const disclaimerText = t('invoiceDisclaimer');
        const disclaimerLines = textLines(disclaimerText, 120);
        doc.text(disclaimerLines, marginX, footerTopY + 2);

        if (qrCodeDataUrl) {
            doc.addImage(qrCodeDataUrl, 'PNG', rightEdge - qrSize, footerTopY - 1, qrSize, qrSize);
            doc.setFontSize(6.5);
            doc.text(t('scanToViewInvoice'), rightEdge - qrSize / 2, footerTopY + qrSize + 2, { align: 'center' });
        }

        doc.setFontSize(7);
        doc.text(`${pageNumber}/${totalPages}`, rightEdge, pageHeight - 4, { align: 'right' });
    };

    // ===== INVOICE HEADER =====
    let yPos = 18;
    doc.setDrawColor(...line.light);
    doc.setLineWidth(0.4);

    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...line.dark);
    doc.text(t('invoiceTitle').toUpperCase(), marginX, yPos);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...line.medium);
    doc.text(`${orderId || 'N/A'}`, marginX, yPos + 5);

    const logoResult = await loadImageAsDataUrl(settings.logoPath);
    let brandY = yPos;
    if (logoResult?.dataUrl) {
        const logoHeight = 14;
        const imageProperties = doc.getImageProperties(logoResult.dataUrl);
        const logoWidth = imageProperties?.width && imageProperties?.height ? (imageProperties.width / imageProperties.height) * logoHeight : 14;
        doc.addImage(logoResult.dataUrl, logoResult.format, rightEdge - logoWidth, brandY - 8, logoWidth, logoHeight);
        brandY += 12;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...line.dark);
    doc.text(settings.businessName || '', rightEdge, brandY, { align: 'right' });
    brandY += 5;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...line.medium);

    if (settings.siteEmail) {
        const emailLines = textLines(settings.siteEmail, 70);
        brandY = drawTextLines(emailLines, rightEdge, brandY, { align: 'right', lineHeight: 3.6 });
    }
    if (settings.sitePhone) {
        const phoneLines = textLines(settings.sitePhone, 70);
        brandY = drawTextLines(phoneLines, rightEdge, brandY, { align: 'right', lineHeight: 3.6 });
    }
    if (settings.baseUrl) {
        const urlLines = textLines(settings.baseUrl, 70);
        brandY = drawTextLines(urlLines, rightEdge, brandY, { align: 'right', lineHeight: 3.6 });
    }

    if (settings.address) {
        const addressLines = textLines(settings.address, 70);
        brandY = drawTextLines(addressLines, rightEdge, brandY, { align: 'right', lineHeight: 3.6 });
    }
    if (settings.tvaNumber) {
        doc.text(`${settings.tvaNumber}`, rightEdge, brandY, { align: 'right' });
        brandY += 4;
    }

    yPos = Math.max(yPos + 12, brandY + 2);
    doc.line(marginX, yPos, rightEdge, yPos);
    yPos += 8;

    // ===== BILL TO & INVOICE DETAILS SECTION =====
    const leftColX = marginX;
    const rightColX = 110;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...line.dark);
    doc.text(`${t('billTo')}:`, leftColX, yPos);
    doc.text(`${t('invoiceDetails')}:`, rightColX, yPos);

    yPos += 5;
    let leftY = yPos;
    let rightY = yPos;

    doc.setFontSize(8);
    doc.setTextColor(...line.dark);

    const customerBusinessName =
        customer.customerBusinessName || shippingAddress.customerBusinessName || order.customer?.customerBusinessName;

    if (customerBusinessName) {
        doc.setFont(undefined, 'bold');
        leftY = drawTextLines(textLines(customerBusinessName, 82), leftColX, leftY, { lineHeight: 3.8 });
    }

    // Customer name
    const customerName =
        `${customer.firstName || shippingAddress.firstName || ''} ${customer.lastName || shippingAddress.lastName || ''}`.trim() ||
        order.customerName ||
        order.cst_name ||
        'N/A';
    doc.setFont(undefined, 'bold');
    leftY = drawTextLines(textLines(customerName, 82), leftColX, leftY, { lineHeight: 3.8 });

    doc.setFont(undefined, 'normal');
    doc.setTextColor(...line.medium);
    // Customer email
    const customerEmail =
        customer.email || shippingAddress.email || order.email || order.customerEmail || order.cst_email;
    if (customerEmail) {
        leftY = drawTextLines(textLines(customerEmail, 82), leftColX, leftY, { lineHeight: 3.8 });
    }

    // Customer phone
    const customerPhone = customer.phone || shippingAddress.phone;
    if (customerPhone) {
        leftY = drawTextLines(textLines(`${t('phone')}: ${customerPhone}`, 82), leftColX, leftY, { lineHeight: 3.8 });
    }

    // Customer address
    leftY += 1;
    const streetAddress =
        customer.streetAddress || shippingAddress.streetAddress || customer.street || shippingAddress.street;
    if (streetAddress) {
        leftY = drawTextLines(textLines(streetAddress, 82), leftColX, leftY, { lineHeight: 3.8 });
    }

    const apartmentUnit =
        customer.apartmentUnit || shippingAddress.apartmentUnit || customer.apartment || shippingAddress.apartment;
    if (apartmentUnit) {
        leftY = drawTextLines(textLines(apartmentUnit, 82), leftColX, leftY, { lineHeight: 3.8 });
    }

    const city = customer.city || shippingAddress.city;
    const state = customer.state || shippingAddress.state;
    const zipCode = customer.zipCode || shippingAddress.zipCode || customer.zip || shippingAddress.zip;
    if (city || state || zipCode) {
        leftY = drawTextLines(textLines(`${city || ''}${state ? ', ' + state : ''} ${zipCode || ''}`, 82), leftColX, leftY, {
            lineHeight: 3.8
        });
    }

    const country = customer.country || shippingAddress.country || customer.countryIso || shippingAddress.countryIso;
    if (country) {
        leftY = drawTextLines(textLines(getCountryName(country, locale), 82), leftColX, leftY, { lineHeight: 3.8 });
    }

    const customerTvaNumber =
        customer.customerTvaNumber || shippingAddress.customerTvaNumber || order.customer?.customerTvaNumber;
    if (customerTvaNumber) {
        leftY = drawTextLines(textLines(`${t('vatNumberLabel')}: ${customerTvaNumber}`, 82), leftColX, leftY, {
            lineHeight: 3.8
        });
    }

    // Invoice Details (Right Column)
    rightY = drawKv(t('invoiceDate'), formatDate(order.createdAt || order.created_at || order.orderDate), rightColX, rightY, rightEdge);
    rightY = drawKv(t('paymentMethod'), formatPaymentMethod(order.paymentMethod || order.method), rightColX, rightY, rightEdge);

    // EuPago details if available
    if (order.eupagoReference) {
        rightY = drawKv(t('reference'), order.eupagoReference, rightColX, rightY, rightEdge);

        if (order.eupagoEntity) {
            rightY = drawKv(t('entity'), order.eupagoEntity, rightColX, rightY, rightEdge);
        }
    }

    // Order Status
    rightY = drawKv(t('status'), formatOrderStatus(order.paymentStatus || 'pending'), rightColX, rightY, rightEdge);

    // ===== ITEMS TABLE =====
    yPos = Math.max(leftY, rightY) + 10;

    // Table Header
    doc.setFillColor(...line.lighter); // gray-100
    doc.rect(marginX, yPos - 3, 178, 7, 'F');

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...line.dark);
    doc.text(t('description'), marginX + 2, yPos);
    doc.text(t('qty'), 130, yPos, { align: 'center' });
    doc.text(t('price'), 155, yPos, { align: 'right' });
    doc.text(t('total'), 188, yPos, { align: 'right' });

    yPos += 7;

    // Table border line
    doc.setDrawColor(...line.light); // gray-200
    doc.setLineWidth(0.3);
    doc.line(marginX, yPos, rightEdge, yPos);
    yPos += 4;

    // Items
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...line.dark);
    doc.setFontSize(8);

    if (items && items.length > 0) {
        items.forEach((item, index) => {
            // Check if we need a new page
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
                doc.setFillColor(...line.lighter);
                doc.rect(marginX, yPos - 3, 178, 7, 'F');
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...line.dark);
                doc.text(t('description'), marginX + 2, yPos);
                doc.text(t('qty'), 130, yPos, { align: 'center' });
                doc.text(t('price'), 155, yPos, { align: 'right' });
                doc.text(t('total'), 188, yPos, { align: 'right' });
                yPos += 7;
                doc.setDrawColor(...line.light);
                doc.line(marginX, yPos, rightEdge, yPos);
                yPos += 4;
            }

            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity, 10) || 1;
            const itemTotal = itemPrice * itemQuantity;

            const productName = item.name || t('item');
            const itemLines = textLines(productName, 105);
            const rowHeight = Math.max(4.5, itemLines.length * 3.8);

            doc.text(itemLines, marginX + 2, yPos);
            doc.text(`${itemQuantity}`, 130, yPos, { align: 'center' });
            doc.text(formatCurrency(itemPrice), 155, yPos, { align: 'right' });
            doc.setFont(undefined, 'bold');
            doc.text(formatCurrency(itemTotal), 188, yPos, { align: 'right' });
            doc.setFont(undefined, 'normal');

            yPos += rowHeight;

            // Light separator line between items
            if (index < items.length - 1) {
                doc.setDrawColor(...line.lighter); // gray-100
                doc.line(marginX, yPos, rightEdge, yPos);
                yPos += 3;
            }
        });
    } else {
        doc.setTextColor(107, 114, 128);
        doc.text(t('noItemsFound'), marginX + 2, yPos);
        yPos += 5;
    }

    yPos += 5;

    // ===== TOTALS SECTION =====
    doc.setDrawColor(...line.light); // gray-200
    doc.setLineWidth(0.3);
    doc.line(marginX, yPos, rightEdge, yPos);
    yPos += 8;

    // Calculate totals
    const subtotal = parseFloat(order.subtotal || 0) || 0;
    const shippingCost = parseFloat(order.shippingCost || order.shipping || 0) || 0;
    const discountAmount = parseFloat(order.discountAmount || 0) || 0;
    const vatAmount = parseFloat(order.vatAmount || 0) || 0;
    const totalAmount = parseFloat(order.finalTotal || order.total || order.amount || 0) || 0;

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...line.dark);

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
    doc.setDrawColor(...line.dark); // gray-900
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
        doc.setTextColor(...line.medium);
        doc.text(t('deliveryNotes') + ':', marginX, yPos);
        yPos += 4;

        doc.setFont(undefined, 'normal');
        const notes = order.deliveryNotes || order.delivery_notes;
        const maxWidth = 178;
        const lines = doc.splitTextToSize(notes, maxWidth);
        doc.text(lines, marginX, yPos);
        yPos += lines.length * 4 + 8;
    } 

    // Save the PDF
    const totalPages = doc.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        doc.setPage(pageNumber);
        drawFooter(pageNumber, totalPages);
    }

    const fileName = `invoice-${orderId}-${formatDate(order.createdAt || order.created_at || order.orderDate).replace(/\//g, '-')}.pdf`;
    const action = typeof options === 'string' ? options : options.action || 'download';

    if (action === 'blob') {
        return {
            fileName,
            blob: doc.output('blob')
        };
    }

    if (action === 'blob-url') {
        const blob = doc.output('blob');
        return {
            fileName,
            blob,
            url: URL.createObjectURL(blob)
        };
    }

    doc.save(fileName);

    return {
        fileName
    };
};
