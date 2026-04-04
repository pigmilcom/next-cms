// emails/OrderUpdateTemplate.jsx
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text
} from '@react-email/components';
import { EmailHeader } from './partials/EmailHeader';
import { OrderFooter } from './partials/OrderFooter';
import { emailStyles } from './styles';

// Load translations (client-safe for email rendering)
const loadTranslations = (locale = 'en') => {
    try {
        const translations = require(`@/locale/messages/${locale}/Email.json`);
        return translations.Email;
    } catch (error) {
        console.error('Failed to load email translations:', error);
        return {};
    }
};

export const OrderUpdateTemplate = ({
    customerName = '[Customer Name]',
    companyName = '[Your Company]',
    companyLogo = '',
    orderId = '#12345',
    orderDate = '[Date]',
    status = 'processing',
    locale = 'en',
    shippingAddress = {
        streetAddress: '[Street Address]',
        apartmentUnit: '',
        city: '[City]',
        state: '[State]',
        zipCode: '[Zip]',
        country: '[Country]',
        countryIso: 'US'
    },
    items = [{ name: 'Sample Product', size: 'M', quantity: 1, price: 0 }],
    subtotal = 0,
    shippingCost = 0,
    discountAmount = 0,
    vatEnabled = false,
    vatPercentage = 0,
    vatAmount = 0,
    vatIncluded = false,
    total = 0,
    currency = 'EUR',
    companyUrl = 'https://yourapp.com',
    supportEmail = 'support@yourcompany.com',
    orderSummaryUrl = 'https://yourapp.com/account/orders',
    paymentMethod = null,
    paymentStatus = 'pending',
    trackingNumber = null,
    trackingUrl = null,
    estimatedDelivery = null,
    deliveryNotes = null,
    customMessage = null
}) => {
    const t = loadTranslations(locale);
    const logo_img = companyLogo || '';

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

    const formatPaymentMethod = (method) => {
        const methods = {
            stripe: 'Cartão de Crédito/Débito',
            card: 'Cartão de Crédito/Débito',
            bank_transfer: 'Transferência Bancária',
            pay_on_delivery: 'Pagamento na Entrega',
            cash: 'Dinheiro',
            crypto: 'Criptomoeda',
            eupago: 'EuPago (Multibanco/MB WAY)',
            eupago_mbway: 'MB WAY',
            eupago_mb: 'Multibanco',
            none: 'Pendente'
        };
        return methods[method] || method;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'EUR'
        }).format(amount || 0);
    };

    // Status configuration
    const statusConfig = {
        pending: {
            title: t.orderUpdate?.title?.pending || 'Order Pending',
            message: t.orderUpdate?.message?.pending || 'Your order is being processed.',
            color: '#f59e0b'
        },
        processing: {
            title: t.orderUpdate?.title?.processing || 'Order Processing',
            message: t.orderUpdate?.message?.processing || 'We are preparing your order with care!',
            color: '#3b82f6'
        },
        complete: {
            title: t.orderUpdate?.title?.complete || 'Order Complete',
            message: t.orderUpdate?.message?.complete || 'Your order is complete and ready!',
            color: '#059669'
        },
        delivered: {
            title: t.orderUpdate?.title?.delivered || 'Order Delivered',
            message: t.orderUpdate?.message?.delivered || 'Your order has been delivered! We hope you love it!',
            color: '#10b981'
        },
        cancelled: {
            title: t.orderUpdate?.title?.cancelled || 'Order Cancelled',
            message:
                t.orderUpdate?.message?.cancelled || 'Your order has been cancelled. Contact us if you have questions.',
            color: '#dc2626'
        }
    };

    const currentStatus = statusConfig[status] || statusConfig.pending;
    const paymentMethodFormatted = paymentMethod ? formatPaymentMethod(paymentMethod) : null;

    return (
        <Html>
            <Head />
            <Preview>
                {t.orderUpdate?.preview?.[status]?.replace('{orderId}', orderId) ||
                    t.orderUpdate?.preview?.default?.replace('{orderId}', orderId) ||
                    `${currentStatus.title} - ${orderId}`}
            </Preview>
            <Body style={emailStyles.main}>
                <Container style={emailStyles.container}>
                    <EmailHeader companyLogo={logo_img} companyName={companyName} />

                    {/* Status Badge */}
                    <Section style={emailStyles.header}>
                        <div style={emailStyles.headerContent}>
                            <div
                                style={{
                                    ...emailStyles.orderBadge,
                                    backgroundColor: currentStatus.color
                                }}>
                                <Text style={emailStyles.orderBadgeText}>{currentStatus.title}</Text>
                            </div>
                        </div>
                    </Section>

                    {/* Main Content */}
                    <Section style={{ padding: '40px 20px' }}>
                        <Heading style={emailStyles.mainHeading}>
                            {t.orderUpdate?.title?.default || 'Order Update'}
                        </Heading>

                        <Text style={emailStyles.greeting}>
                            {t.common?.hiCustomer?.replace('{customerName}', customerName) || `Hi ${customerName}`},
                        </Text>

                        <Text style={emailStyles.confirmationText}>{currentStatus.message}</Text>

                        {/* Custom Message */}
                        {customMessage && (
                            <div style={emailStyles.orderCard}>
                                <Text style={emailStyles.orderTitle}>
                                    💬 {t.common?.messageFromTeam || 'Message from Our Team'}
                                </Text>
                                <Text style={{ ...emailStyles.confirmationText, fontStyle: 'italic' }}>
                                    "{customMessage}"
                                </Text>
                            </div>
                        )}

                        {/* Order Info Card */}
                        <div style={emailStyles.orderCard}>
                            <div style={emailStyles.orderHeader}>
                                <Text style={emailStyles.orderTitle}>
                                    {t.orderUpdate?.orderNumber || 'Order Number'}
                                </Text>
                                <Text style={emailStyles.orderId}>{orderId}</Text>
                            </div>
                            <div style={emailStyles.orderMeta}>
                                <div>
                                    <Text style={emailStyles.metaLabel}>
                                        {t.orderConfirmation?.orderDate || 'Order Date'}
                                    </Text>
                                    <Text style={emailStyles.metaValue}>{orderDate}</Text>
                                </div>
                                <div>
                                    <Text style={emailStyles.metaLabel}>
                                        {t.orderUpdate?.status || 'Current Status'}
                                    </Text>
                                    <Text style={emailStyles.metaValue}>{currentStatus.title}</Text>
                                </div>
                            </div>
                        </div>

                        {/* Products Section */}
                        <Section style={emailStyles.productsSection}>
                            <Text style={emailStyles.sectionTitle}>
                                {t.orderConfirmation?.itemsOrdered || 'Order Items'}
                            </Text>
                            {items.map((item, index) => (
                                <div key={index} style={emailStyles.productRow}>
                                    <div style={emailStyles.productInfo}>
                                        <Text style={emailStyles.productName}>{item.name}</Text>
                                        {item.size && (
                                            <Text style={emailStyles.productDetails}>
                                                {t.orderConfirmation?.size || 'Size'}: {item.size}
                                            </Text>
                                        )}
                                        <Text style={emailStyles.productDetails}>
                                            {t.orderConfirmation?.qty || 'Quantity'}: {item.quantity}
                                        </Text>
                                    </div>
                                    <Text style={emailStyles.productPrice}>
                                        {formatCurrency(item.price * item.quantity)}
                                    </Text>
                                </div>
                            ))}
                        </Section>

                        {/* Totals Section */}
                        <Section style={emailStyles.totalsSection}>
                            <div style={emailStyles.totalRow}>
                                <Text style={emailStyles.totalLabel}>
                                    {vatEnabled && vatIncluded
                                        ? t.orderConfirmation?.subtotalExclVat || 'Subtotal (excl. VAT)'
                                        : t.orderConfirmation?.subtotal || 'Subtotal'}
                                </Text>
                                <Text style={emailStyles.totalValue}>
                                    {formatCurrency(
                                        vatEnabled && vatIncluded && vatAmount > 0 ? subtotal - vatAmount : subtotal
                                    )}
                                </Text>
                            </div>
                            {vatEnabled && vatAmount > 0 && (
                                <div style={emailStyles.totalRow}>
                                    <Text style={emailStyles.totalLabel}>
                                        {t.orderConfirmation?.vat || 'VAT'} ({vatPercentage}%)
                                    </Text>
                                    <Text style={emailStyles.totalValue}>{formatCurrency(vatAmount)}</Text>
                                </div>
                            )}
                            {shippingCost > 0 && (
                                <div style={emailStyles.totalRow}>
                                    <Text style={emailStyles.totalLabel}>
                                        {t.orderConfirmation?.shipping || 'Shipping'}
                                    </Text>
                                    <Text style={emailStyles.totalValue}>{formatCurrency(shippingCost)}</Text>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div style={emailStyles.totalRow}>
                                    <Text style={emailStyles.totalLabel}>
                                        {t.orderConfirmation?.discount || 'Discount'}
                                    </Text>
                                    <Text style={emailStyles.discountValue}>-{formatCurrency(discountAmount)}</Text>
                                </div>
                            )}
                            <Hr style={emailStyles.totalDivider} />
                            <div style={emailStyles.finalTotalRow}>
                                <Text style={emailStyles.finalTotalLabel}>{t.orderConfirmation?.total || 'Total'}</Text>
                                <Text style={emailStyles.finalTotalValue}>{formatCurrency(total)}</Text>
                            </div>
                        </Section>

                        {/* Tracking Section */}
                        {(status === 'complete' || status === 'delivered') && (trackingNumber || trackingUrl) && (
                            <Section style={emailStyles.trackingSection}>
                                <Text style={emailStyles.sectionTitle}>
                                    🔍 {t.orderUpdate?.trackingNumber || 'Tracking Number'}
                                </Text>
                                {trackingNumber && <Text style={emailStyles.trackingNumber}>{trackingNumber}</Text>}
                                {estimatedDelivery && (
                                    <Text style={emailStyles.addressDetails}>
                                        {t.orderUpdate?.estimatedDelivery || 'Estimated Delivery'}: {estimatedDelivery}
                                    </Text>
                                )}
                                {trackingUrl && (
                                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                        <Button style={emailStyles.primaryButton} href={trackingUrl}>
                                            {t.orderUpdate?.trackPackage || 'Track Package'}
                                        </Button>
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* Shipping Address */}
                        <Section style={emailStyles.shippingSection}>
                            <Text style={emailStyles.sectionTitle}>
                                {t.orderConfirmation?.shippingAddress || 'Shipping Address'}
                            </Text>
                            <div style={emailStyles.addressCard}>
                                <Text style={emailStyles.addressName}>{customerName}</Text>
                                <Text style={emailStyles.addressDetails}>{formatAddress()}</Text>
                            </div>

                            {deliveryNotes && (
                                <div style={{ marginTop: '15px' }}>
                                    <Text style={emailStyles.metaLabel}>
                                        {t.orderConfirmation?.deliveryNotes || 'Delivery Notes'}
                                    </Text>
                                    <Text style={emailStyles.addressDetails}>{deliveryNotes}</Text>
                                </div>
                            )}
                        </Section>

                        {/* Payment Section */}
                        {paymentMethodFormatted && (
                            <Section style={emailStyles.paymentSection}>
                                <Text style={emailStyles.sectionTitle}>
                                    {t.orderConfirmation?.paymentMethod || 'Payment Method'}
                                </Text>
                                <div style={emailStyles.paymentMethod}>
                                    <Text style={{ margin: '0', fontWeight: '600' }}>{paymentMethodFormatted}</Text>
                                </div>
                            </Section>
                        )}

                        {/* Action Buttons */}
                        <Section style={emailStyles.actionSection}>
                            <Button style={emailStyles.primaryButton} href={orderSummaryUrl}>
                                {t.orderUpdate?.viewOrderDetails || 'View Order Details'}
                            </Button>
                            <Button style={emailStyles.secondaryButton} href={`mailto:${supportEmail}`}>
                                {t.orderUpdate?.contactSupport || 'Contact Support'}
                            </Button>
                        </Section>
                    </Section>

                    <OrderFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        supportEmail={supportEmail}
                        translations={{
                            ...t.common,
                            ...t.orderUpdate
                        }}
                    />
                </Container>
            </Body>
        </Html>
    );
};

// Enhanced Styles (matching OrderConfirmationTemplate)
export default OrderUpdateTemplate;
