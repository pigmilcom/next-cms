// emails/OrderStatusUpdateTemplate.jsx
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

export const OrderStatusUpdateTemplate = ({
    customerName = '[Customer Name]',
    companyName = '[Your Company]',
    companyLogo = '',
    orderId = '#12345',
    orderDate = '[Date]',
    status = 'pending',
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
    estimatedDelivery = null,
    deliveryNotes = null
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
            emoji: '⏳',
            title: t?.statusPending || 'Order Pending',
            message: t?.statusPendingMessage || 'Your order is being processed.',
            color: '#f59e0b'
        },
        processing: {
            emoji: '📦',
            title: t?.statusProcessing || 'Order Processing',
            message: t?.statusProcessingMessage || 'We are preparing your order.',
            color: '#3b82f6'
        },
        complete: {
            emoji: '✅',
            title: t?.statusComplete || 'Order Complete',
            message: t?.statusCompleteMessage || 'Your order is complete and ready!',
            color: '#059669'
        },
        delivered: {
            emoji: '🎉',
            title: t?.statusDelivered || 'Order Delivered',
            message: t?.statusDeliveredMessage || 'Your order has been delivered.',
            color: '#10b981'
        },
        cancelled: {
            emoji: '❌',
            title: t?.statusCancelled || 'Order Cancelled',
            message: t?.statusCancelledMessage || 'Your order has been cancelled.',
            color: '#dc2626'
        }
    };

    const currentStatus = statusConfig[status] || statusConfig.pending;
    const paymentMethodFormatted = paymentMethod ? formatPaymentMethod(paymentMethod) : null;

    return (
        <Html>
            <Head />
            <Preview>
                {currentStatus.emoji} {currentStatus.title} - {orderId}
            </Preview>
            <Body style={enhancedStyles.main}>
                <Container style={enhancedStyles.container}>
                    <EmailHeader companyLogo={logo_img} companyName={companyName} />

                    {/* Status Badge */}
                    <Section style={enhancedStyles.header}>
                        <div style={enhancedStyles.headerContent}>
                            <div
                                style={{
                                    ...enhancedStyles.orderBadge,
                                    backgroundColor: currentStatus.color
                                }}>
                                <Text style={enhancedStyles.orderBadgeText}>
                                    {currentStatus.emoji} {currentStatus.title}
                                </Text>
                            </div>
                        </div>
                    </Section>

                    {/* Main Content */}
                    <Section style={{ padding: '40px 20px' }}>
                        <Heading style={enhancedStyles.mainHeading}>
                            {t?.orderStatusUpdate || 'Order Status Update'}
                        </Heading>

                        <Text style={enhancedStyles.greeting}>
                            {t?.hiCustomer?.replace('{customerName}', customerName) || `Hi ${customerName}`},
                        </Text>

                        <Text style={enhancedStyles.confirmationText}>{currentStatus.message}</Text>

                        {/* Order Info Card */}
                        <div style={enhancedStyles.orderCard}>
                            <div style={enhancedStyles.orderHeader}>
                                <Text style={enhancedStyles.orderTitle}>{t?.orderNumber || 'Order Number'}</Text>
                                <Text style={enhancedStyles.orderId}>{orderId}</Text>
                            </div>
                            <div style={enhancedStyles.orderMeta}>
                                <div>
                                    <Text style={enhancedStyles.metaLabel}>{t?.orderDate || 'Order Date'}</Text>
                                    <Text style={enhancedStyles.metaValue}>{orderDate}</Text>
                                </div>
                                <div>
                                    <Text style={enhancedStyles.metaLabel}>{t?.orderStatus || 'Status'}</Text>
                                    <Text style={enhancedStyles.metaValue}>
                                        {currentStatus.emoji} {currentStatus.title}
                                    </Text>
                                </div>
                            </div>
                        </div>

                        {/* Products Section */}
                        <Section style={enhancedStyles.productsSection}>
                            <Text style={enhancedStyles.sectionTitle}>{t?.orderItems || 'Order Items'}</Text>
                            {items.map((item, index) => (
                                <div key={index} style={enhancedStyles.productRow}>
                                    <div style={enhancedStyles.productInfo}>
                                        <Text style={enhancedStyles.productName}>{item.name}</Text>
                                        {item.size && (
                                            <Text style={enhancedStyles.productDetails}>
                                                {t?.size || 'Size'}: {item.size}
                                            </Text>
                                        )}
                                        <Text style={enhancedStyles.productDetails}>
                                            {t?.quantity || 'Quantity'}: {item.quantity}
                                        </Text>
                                    </div>
                                    <Text style={enhancedStyles.productPrice}>
                                        {formatCurrency(item.price * item.quantity)}
                                    </Text>
                                </div>
                            ))}
                        </Section>

                        {/* Totals Section */}
                        <Section style={enhancedStyles.totalsSection}>
                            <div style={enhancedStyles.totalRow}>
                                <Text style={enhancedStyles.totalLabel}>
                                    {vatEnabled && vatIncluded
                                        ? t?.subtotalExclVat || 'Subtotal (excl. VAT)'
                                        : t?.subtotal || 'Subtotal'}
                                </Text>
                                <Text style={enhancedStyles.totalValue}>
                                    {formatCurrency(
                                        vatEnabled && vatIncluded && vatAmount > 0 ? subtotal - vatAmount : subtotal
                                    )}
                                </Text>
                            </div>
                            {vatEnabled && vatAmount > 0 && (
                                <div style={enhancedStyles.totalRow}>
                                    <Text style={enhancedStyles.totalLabel}>
                                        {t?.vat || 'VAT'} ({vatPercentage}%)
                                    </Text>
                                    <Text style={enhancedStyles.totalValue}>{formatCurrency(vatAmount)}</Text>
                                </div>
                            )}
                            {shippingCost > 0 && (
                                <div style={enhancedStyles.totalRow}>
                                    <Text style={enhancedStyles.totalLabel}>{t?.shipping || 'Shipping'}</Text>
                                    <Text style={enhancedStyles.totalValue}>{formatCurrency(shippingCost)}</Text>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div style={enhancedStyles.totalRow}>
                                    <Text style={enhancedStyles.totalLabel}>{t?.discount || 'Discount'}</Text>
                                    <Text style={enhancedStyles.discountValue}>-{formatCurrency(discountAmount)}</Text>
                                </div>
                            )}
                            <Hr style={enhancedStyles.totalDivider} />
                            <div style={enhancedStyles.finalTotalRow}>
                                <Text style={enhancedStyles.finalTotalLabel}>{t?.total || 'Total'}</Text>
                                <Text style={enhancedStyles.finalTotalValue}>{formatCurrency(total)}</Text>
                            </div>
                        </Section>

                        {/* Shipping Section */}
                        <Section style={enhancedStyles.shippingSection}>
                            <Text style={enhancedStyles.sectionTitle}>{t?.shippingAddress || 'Shipping Address'}</Text>
                            <div style={enhancedStyles.addressCard}>
                                <Text style={enhancedStyles.addressName}>{customerName}</Text>
                                <Text style={enhancedStyles.addressDetails}>{formatAddress()}</Text>
                            </div>

                            {trackingNumber && (
                                <div style={{ marginTop: '20px' }}>
                                    <Text style={enhancedStyles.sectionTitle}>
                                        {t?.trackingInformation || 'Tracking Information'}
                                    </Text>
                                    <Text style={enhancedStyles.trackingNumber}>
                                        {t?.trackingNumber || 'Tracking Number'}: {trackingNumber}
                                    </Text>
                                </div>
                            )}

                            {estimatedDelivery && (
                                <Text style={enhancedStyles.addressDetails}>
                                    {t?.estimatedDelivery || 'Estimated Delivery'}: {estimatedDelivery}
                                </Text>
                            )}

                            {deliveryNotes && (
                                <div style={{ marginTop: '15px' }}>
                                    <Text style={enhancedStyles.metaLabel}>{t?.deliveryNotes || 'Delivery Notes'}</Text>
                                    <Text style={enhancedStyles.addressDetails}>{deliveryNotes}</Text>
                                </div>
                            )}
                        </Section>

                        {/* Payment Section */}
                        {paymentMethodFormatted && (
                            <Section style={enhancedStyles.paymentSection}>
                                <Text style={enhancedStyles.sectionTitle}>{t?.paymentMethod || 'Payment Method'}</Text>
                                <div style={enhancedStyles.paymentMethod}>
                                    <Text style={{ margin: '0', fontWeight: '600' }}>{paymentMethodFormatted}</Text>
                                </div>
                            </Section>
                        )}

                        {/* Action Buttons */}
                        <Section style={enhancedStyles.actionSection}>
                            <Button style={enhancedStyles.primaryButton} href={orderSummaryUrl}>
                                {t?.viewOrderDetails || 'View Order Details'}
                            </Button>
                            <Button style={enhancedStyles.secondaryButton} href={`mailto:${supportEmail}`}>
                                {t?.contactSupport || 'Contact Support'}
                            </Button>
                        </Section>
                    </Section>

                    <OrderFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        supportEmail={supportEmail}
                        translations={t}
                    />
                </Container>
            </Body>
        </Html>
    );
};

// Enhanced Styles (matching OrderConfirmationTemplate)
const enhancedStyles = {
    main: {
        backgroundColor: '#f6f9fc',
        fontFamily:
            '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif'
    },
    container: {
        margin: '0 auto',
        padding: '0',
        maxWidth: '600px',
        backgroundColor: '#ffffff'
    },
    header: {
        backgroundColor: '#ffffff',
        padding: '30px 40px 20px',
        borderBottom: '2px solid #e5e7eb'
    },
    headerContent: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '15px'
    },
    orderBadge: {
        backgroundColor: '#10b981',
        color: '#ffffff',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    orderBadgeText: {
        margin: '0',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    mainHeading: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1f2937',
        margin: '0 0 30px',
        textAlign: 'center'
    },
    greeting: {
        fontSize: '18px',
        color: '#374151',
        margin: '0 0 20px',
        fontWeight: '500'
    },
    confirmationText: {
        fontSize: '16px',
        color: '#6b7280',
        margin: '0 0 30px',
        lineHeight: '1.6'
    },
    orderCard: {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        margin: '20px 0'
    },
    orderHeader: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    orderTitle: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1f2937',
        margin: '0'
    },
    orderId: {
        fontSize: '16px',
        color: '#3b82f6',
        fontWeight: '600',
        margin: '0'
    },
    orderMeta: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
    },
    metaLabel: {
        fontSize: '12px',
        color: '#6b7280',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        margin: '0 0 5px'
    },
    metaValue: {
        fontSize: '14px',
        color: '#374151',
        fontWeight: '600',
        margin: '0'
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1f2937',
        margin: '30px 0 15px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '5px'
    },
    productsSection: {
        margin: '30px 0'
    },
    productRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '15px 0',
        borderBottom: '1px solid #f3f4f6'
    },
    productInfo: {
        flex: '1'
    },
    productName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1f2937',
        margin: '0 0 5px'
    },
    productDetails: {
        fontSize: '14px',
        color: '#6b7280',
        margin: '2px 0'
    },
    productPrice: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1f2937',
        margin: '0'
    },
    totalsSection: {
        backgroundColor: '#f8fafc',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px 0'
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '8px 0'
    },
    totalLabel: {
        fontSize: '14px',
        color: '#374151',
        margin: '0'
    },
    totalValue: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#1f2937',
        margin: '0'
    },
    discountValue: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#dc2626',
        margin: '0'
    },
    totalDivider: {
        borderColor: '#d1d5db',
        margin: '15px 0'
    },
    finalTotalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '2px solid #d1d5db'
    },
    finalTotalLabel: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1f2937',
        margin: '0'
    },
    finalTotalValue: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1f2937',
        margin: '0'
    },
    shippingSection: {
        margin: '30px 0'
    },
    addressCard: {
        backgroundColor: '#f9fafb',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
    },
    addressName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1f2937',
        margin: '0 0 5px'
    },
    addressDetails: {
        fontSize: '14px',
        color: '#6b7280',
        margin: '0',
        lineHeight: '1.5'
    },
    paymentSection: {
        margin: '30px 0'
    },
    paymentMethod: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        fontSize: '14px',
        color: '#374151',
        backgroundColor: '#f9fafb',
        padding: '10px 15px',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        margin: '10px 0'
    },
    trackingNumber: {
        fontSize: '16px',
        color: '#1f2937',
        backgroundColor: '#ecfdf5',
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid #10b981',
        fontWeight: '600',
        margin: '10px 0'
    },
    actionSection: {
        textAlign: 'center',
        margin: '40px 0'
    },
    primaryButton: {
        backgroundColor: '#000',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '14px',
        display: 'inline-block',
        margin: '0 10px 10px'
    },
    secondaryButton: {
        backgroundColor: '#ffffff',
        color: '#000',
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '14px',
        display: 'inline-block',
        border: '1px solid #929292ff',
        margin: '0 10px 10px'
    }
};

export default OrderStatusUpdateTemplate;
