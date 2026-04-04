import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components';
import { EmailFooter } from './partials/EmailFooter';
import { EmailHeader } from './partials/EmailHeader';
import { emailStyles } from './styles';

const loadTranslations = (locale) => {
    try {
        const translations = require(`@/locale/messages/${locale}/Email.json`);
        return translations.Email;
    } catch (error) {
        const fallback = require('@/locale/messages/en/Email.json');
        return fallback.Email;
    }
};

export const OrderAdminConfirmationTemplate = ({
    customerName = '[Customer Name]',
    customerEmail = '[customer@email.com]',
    companyName = '[Company Name]',
    companyLogo = '',
    companyUrl = 'https://yourapp.com',
    supportEmail = 'support@yourcompany.com',
    orderId = '#12345',
    orderDate = '[date]',
    shippingAddress = {
        streetAddress: '[Street Address]',
        apartmentUnit: '',
        city: '[City]',
        state: '[State]',
        zipCode: '[Zip]',
        country: '[Country]',
        countryIso: 'US'
    },
    items = [{ name: 'T-shirt « Soleil »', size: 'M', quantity: 1, price: 25.0 }],
    subtotal = '25.00',
    shippingCost = '5.00',
    discountAmount = '0.00',
    vatAmount = '0.00',
    total = '30.00',
    currency = 'EUR',
    orderSummaryUrl = 'https://yourapp.com/admin/orders/12345',
    locale = 'en'
}) => {
    const t = loadTranslations(locale);

    // Format address for display
    const formatAddress = () => {
        const parts = [
            shippingAddress.streetAddress,
            shippingAddress.apartmentUnit,
            shippingAddress.city,
            shippingAddress.state,
            shippingAddress.zipCode,
            shippingAddress.country
        ].filter(Boolean);
        return parts.join(', ');
    };

    // Calculate total items count
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Parse numeric values
    const parseAmount = (value) => {
        if (typeof value === 'number') return value;
        return parseFloat(value) || 0;
    };

    // Format currency using Intl.NumberFormat (same as OrderConfirmationTemplate)
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'EUR'
        }).format(amount || 0);
    };

    return (
        <Html>
            <Head />
            <Preview>
                {t.adminNotification.paymentConfirmedPreview
                    ?.replace('{orderId}', orderId)
                    .replace('{customerName}', customerName)
                    .replace('{total}', total) ||
                    t.adminNotification.preview
                        .replace('{orderId}', orderId)
                        .replace('{customerName}', customerName)
                        .replace('{total}', total)}
            </Preview>
            <Body style={emailStyles.main}>
                <Container style={emailStyles.container}>
                    {/* Header */}
                    <EmailHeader
                        companyLogo={companyLogo}
                        companyName={companyName}
                        customStyles={emailStyles.header}
                    />

                    {/* Header Content */}
                    <Section style={emailStyles.header}>
                        <div style={emailStyles.headerContent}>
                            <div
                                style={{
                                    ...emailStyles.orderBadge,
                                    backgroundColor: '#059669'
                                }}>
                                <Text style={emailStyles.orderBadgeText}>
                                    {t.adminNotification.paymentConfirmed ||
                                        t.adminNotification.newOrderTitle}
                                </Text>
                            </div>
                        </div>
                    </Section>

                    {/* Main Heading */}
                    <Heading style={emailStyles.mainHeading}>{t.adminNotification.actionRequired}</Heading>

                    {/* Greeting and main message */}
                    <Text style={emailStyles.greeting}>
                        {t.adminNotification.paymentConfirmedMessage || t.adminNotification.newOrderMessage}
                    </Text>

                    {/* Order Summary Card */}
                    <Section style={emailStyles.orderCard}>
                        <div style={emailStyles.orderHeader}>
                            <Text style={emailStyles.orderTitle}>{t.adminNotification.orderDetails}</Text>
                            <Text style={emailStyles.orderId}>
                                {t.adminNotification.order}: {orderId}
                            </Text>
                        </div>

                        <div style={emailStyles.orderMeta}>
                            <div>
                                <Text style={emailStyles.metaLabel}>{t.adminNotification.date}</Text>
                                <Text style={emailStyles.metaValue}>{orderDate}</Text>
                            </div>
                            <div>
                                <Text style={emailStyles.metaLabel}>{t.adminNotification.totalAmount}</Text>
                                <Text
                                    style={{
                                        ...emailStyles.metaValue,
                                        color: '#059669',
                                        fontSize: '18px',
                                        fontWeight: 'bold'
                                    }}>
                                    {formatCurrency(parseAmount(total))}
                                </Text>
                            </div>
                        </div>
                    </Section>

                    {/* Customer Information */}
                    <Section style={emailStyles.shippingSection}>
                        <Text style={emailStyles.sectionTitle}>{t.adminNotification.customerInfo}</Text>
                        <div style={emailStyles.addressCard}>
                            <Text style={emailStyles.addressName}>{customerName}</Text>
                            <Text style={emailStyles.addressDetails}>
                                {t.adminNotification.email}: {customerEmail}
                            </Text>
                            <Text style={emailStyles.addressDetails}>
                                {t.adminNotification.shippingAddress}: {formatAddress()}
                            </Text>
                        </div>
                    </Section>

                    {/* Products Section */}
                    <Section style={emailStyles.productsSection}>
                        <Text style={emailStyles.sectionTitle}>{t.adminNotification.productsOrdered}</Text>

                        {items.map((item, index) => (
                            <div key={index} style={emailStyles.productRow}>
                                <div style={emailStyles.productInfo}>
                                    <Text style={emailStyles.productName}>{item.name}</Text>
                                    <Text style={emailStyles.productDetails}>
                                        {t.adminNotification.size}: {item.size || 'N/A'} |{' '}
                                        {t.adminNotification.quantity}: {item.quantity}
                                    </Text>
                                    <Text style={emailStyles.productDetails}>
                                        {t.adminNotification.unitPrice}: {formatCurrency(parseAmount(item.price))}
                                    </Text>
                                </div>
                                <div>
                                    <Text style={emailStyles.productPrice}>
                                        {formatCurrency(parseAmount(item.price) * item.quantity)}
                                    </Text>
                                </div>
                            </div>
                        ))}
                    </Section>

                    {/* Totals Section */}
                    <Section style={emailStyles.totalsSection}>
                        <div style={emailStyles.totalRow}>
                            <Text style={emailStyles.totalLabel}>{t.adminNotification.productsSubtotal}</Text>
                            <Text style={emailStyles.totalValue}>{formatCurrency(parseAmount(subtotal))}</Text>
                        </div>
                        <div style={emailStyles.totalRow}>
                            <Text style={emailStyles.totalLabel}>{t.adminNotification.shippingCost}</Text>
                            <Text style={emailStyles.totalValue}>{formatCurrency(parseAmount(shippingCost))}</Text>
                        </div>
                        {parseAmount(discountAmount) > 0 && (
                            <div style={emailStyles.totalRow}>
                                <Text style={emailStyles.totalLabel}>{t.orderConfirmation.discount}</Text>
                                <Text style={emailStyles.discountValue}>-{formatCurrency(parseAmount(discountAmount))}</Text>
                            </div>
                        )}
                        {parseAmount(vatAmount) > 0 && (
                            <div style={emailStyles.totalRow}>
                                <Text style={emailStyles.totalLabel}>{t.orderConfirmation.vat}</Text>
                                <Text style={emailStyles.totalValue}>{formatCurrency(parseAmount(vatAmount))}</Text>
                            </div>
                        )}
                        <div style={emailStyles.finalTotalRow}>
                            <Text style={emailStyles.finalTotalLabel}>{t.adminNotification.total}</Text>
                            <Text style={emailStyles.finalTotalValue}>{formatCurrency(parseAmount(total))}</Text>
                        </div>
                    </Section>

                    {/* Quick Actions */}
                    <Section style={emailStyles.paymentSection}>
                        <Text style={emailStyles.sectionTitle}>{t.adminNotification.quickActions}</Text>
                        <div style={emailStyles.addressCard}>
                            <Text style={emailStyles.addressDetails}>{t.adminNotification.actionCheckStock}</Text>
                            <Text style={emailStyles.addressDetails}>
                                {t.adminNotification.actionPreparePackage}
                            </Text>
                            <Text style={emailStyles.addressDetails}>{t.adminNotification.actionPrintLabel}</Text>
                            <Text style={emailStyles.addressDetails}>
                                {t.adminNotification.actionSendTracking}
                            </Text>
                        </div>
                    </Section>

                    {/* CTA Button */}
                    <Section style={emailStyles.actionSection}>
                        <Button
                            style={{
                                ...emailStyles.primaryButton,
                                backgroundColor: '#DC2626',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}
                            href={orderSummaryUrl}>
                            {t.adminNotification.viewInAdmin}
                        </Button>
                    </Section>

                    {/* Footer */}
                    <EmailFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        supportEmail={supportEmail}
                        translations={{
                            bestRegards: t.adminNotification.autoGenerated,
                            theTeam: `${t.adminNotification.orderManagementSystem} ${companyName}`
                        }}
                    />

                    {/* Support Section */}
                    <Section style={emailStyles.supportSection}>
                        <Text style={emailStyles.supportText}>
                            {t.adminNotification.adminEmail}
                            <br />
                            {t.adminNotification.orderTime} {orderDate}
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default OrderAdminConfirmationTemplate;
