// emails/OrderConfirmationTemplate.jsx
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
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

export const OrderConfirmationTemplate = ({
    customerName = '[Customer Name]',
    companyName = '[Your Company]',
    companyLogo = '',
    orderId = '#12345',
    orderDate = '[Date]',
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
    orderSummaryUrl = 'https://yourapp.com/track',
    paymentMethod = null,
    paymentStatus = 'pending',
    paymentReference = null,
    paymentEntity = null,
    bankTransferDetails = null,
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

    const paymentMethodFormatted = paymentMethod ? formatPaymentMethod(paymentMethod) : null;

    return (
        <Html>
            <Head />
            <Preview>
                {t.orderConfirmation?.preview?.replace('{customerName}', customerName) ||
                    `Thank you ${customerName}! Your order has been confirmed 🧡`}
            </Preview>
            <Body style={emailStyles.main}>
                <Container style={emailStyles.container}>
                    {/* Header with Logo */}
                    <Section style={enhancedStyles.header}>
                        <div style={enhancedStyles.headerContent}>
                            <EmailHeader
                                companyLogo={logo_img}
                                companyName={companyName}
                                customStyles={{ border: 'none', padding: '0', backgroundColor: 'transparent' }}
                            />
                            <div
                                style={
                                    paymentStatus === 'pending'
                                        ? enhancedStyles.orderBadgePending
                                        : enhancedStyles.orderBadge
                                }>
                                <Text style={enhancedStyles.orderBadgeText}>
                                    {paymentStatus === 'pending'
                                        ? t.orderConfirmation?.awaitingPayment || 'A aguardar pagamento'
                                        : t.orderConfirmation?.orderConfirmedBadge || 'Order Confirmed ✓'}
                                </Text>
                            </div>
                        </div>
                    </Section>

                    {/* Main Content */}
                    <Section style={emailStyles.section}>
                        <Heading style={enhancedStyles.mainHeading}>
                            {t.orderConfirmation?.thankYouTitle || 'Thank you for your order!'}
                        </Heading>

                        <Text style={enhancedStyles.greeting}>
                            {t.orderConfirmation?.greeting?.replace('{customerName}', customerName) ||
                                `Hi ${customerName},`}
                        </Text>

                        <Text style={enhancedStyles.confirmationText}>
                            {paymentStatus === 'pending'
                                ? t.orderConfirmation?.paymentPendingDescription ||
                                  'Your order has been placed successfully. Please complete your payment to begin processing your order. Payment details are provided below.'
                                : t.orderConfirmation?.confirmationText ||
                                  "We've received your order and are preparing it for shipment. You'll receive another email when your order has been shipped."}
                        </Text>

                        {/* Payment Status Alert */}
                        {paymentStatus === 'pending' && (
                            <Section style={enhancedStyles.paymentStatusAlert}>
                                <Text style={enhancedStyles.paymentStatusText}>
                                    ⚠️{' '}
                                    {t.orderConfirmation?.paymentPendingMessage ||
                                        'Payment is pending. Please complete your payment to process your order.'}
                                </Text>
                            </Section>
                        )}
                        {paymentStatus === 'paid' && (
                            <Section style={enhancedStyles.paymentStatusSuccess}>
                                <Text style={enhancedStyles.paymentStatusSuccessText}>
                                    {t.orderConfirmation?.paymentConfirmedMessage ||
                                        '✓ Payment confirmed. Your order is being processed.'}
                                </Text>
                            </Section>
                        )}

                        {/* Order Summary Card */}
                        <Section style={enhancedStyles.orderCard}>
                            <div style={enhancedStyles.orderHeader}>
                                <Text style={enhancedStyles.orderTitle}>
                                    {t.orderConfirmation?.orderSummary || 'Order Summary'}
                                </Text>
                                <Text style={enhancedStyles.orderId}>{orderId}</Text>
                            </div>

                            <div style={enhancedStyles.orderMeta}>
                                <div>
                                    <Text style={enhancedStyles.metaLabel}>
                                        {t.orderConfirmation?.orderDate || 'Order Date'}
                                    </Text>
                                    <Text style={enhancedStyles.metaValue}>{orderDate}</Text>
                                </div>
                                <div>
                                    <Text style={enhancedStyles.metaLabel}>
                                        {t.orderConfirmation?.total || 'Total'}
                                    </Text>
                                    <Text style={enhancedStyles.metaValue}>{formatCurrency(total)}</Text>
                                </div>
                                {estimatedDelivery && (
                                    <div>
                                        <Text style={enhancedStyles.metaLabel}>
                                            {t.orderConfirmation?.estimatedDelivery || 'Estimated Delivery'}
                                        </Text>
                                        <Text style={enhancedStyles.metaValue}>{estimatedDelivery}</Text>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* Payment Information - Show First When Pending */}
                        {paymentStatus === 'pending' && paymentMethod && (
                            <Section style={enhancedStyles.paymentSection}>
                                <Text style={enhancedStyles.sectionTitle}>
                                    {t.orderConfirmation?.paymentMethod || 'Payment Method'}
                                </Text>
                                <Text style={enhancedStyles.paymentMethod}>
                                    {paymentMethodFormatted}
                                    {paymentEntity && (
                                        <span>
                                            {t.orderConfirmation?.paymentEntity || 'Entity'}: {paymentEntity}
                                        </span>
                                    )}
                                    {paymentReference && (
                                        <span>
                                            {t.orderConfirmation?.paymentReference || 'Ref'}: {paymentReference}
                                        </span>
                                    )}
                                    {total && (
                                        <span>
                                            {t.orderConfirmation?.total || 'Total'}: {formatCurrency(total)}
                                        </span>
                                    )}
                                </Text>
                                {bankTransferDetails && (
                                    <div style={enhancedStyles.bankDetailsCard}>
                                        <Text style={enhancedStyles.bankDetailsTitle}>
                                            {t.orderConfirmation?.bankTransferDetails || 'Bank Transfer Details'}
                                        </Text>
                                        <div style={enhancedStyles.bankDetails}>
                                            {Object.entries(bankTransferDetails).map(([key, value]) => (
                                                <div key={key} style={enhancedStyles.bankDetailRow}>
                                                    <Text style={enhancedStyles.bankDetailLabel}>
                                                        {key
                                                            .replace(/([A-Z])/g, ' $1')
                                                            .replace(/^./, (str) => str.toUpperCase())}
                                                        :
                                                    </Text>
                                                    <Text style={enhancedStyles.bankDetailValue}>{value}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* Products - Hide When Payment Pending */}
                        {paymentStatus !== 'pending' && (
                            <Section style={enhancedStyles.productsSection}>
                                <Text style={enhancedStyles.sectionTitle}>
                                    {t.orderConfirmation?.itemsOrdered || 'Items Ordered'}
                                </Text>

                                {items.map((product, index) => (
                                    <div key={index} style={enhancedStyles.productRow}>
                                        <div style={enhancedStyles.productInfo}>
                                            <Text style={enhancedStyles.productName}>{product.name}</Text>
                                            {product.size && (
                                                <Text style={enhancedStyles.productDetails}>
                                                    {t.orderConfirmation?.size || 'Size'}: {product.size}
                                                </Text>
                                            )}
                                            <Text style={enhancedStyles.productDetails}>
                                                {t.orderConfirmation?.qty || 'Qty'}: {product.quantity}
                                            </Text>
                                        </div>
                                        <Text style={enhancedStyles.productPrice}>
                                            {formatCurrency(product.price || 0)}
                                        </Text>
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* Order Totals - Hide When Payment Pending */}
                        {paymentStatus !== 'pending' && (
                            <Section style={enhancedStyles.totalsSection}>
                                <div style={enhancedStyles.totalRow}>
                                    <Text style={enhancedStyles.totalLabel}>
                                        {t.orderConfirmation?.subtotal || 'Subtotal'}
                                    </Text>
                                    <Text style={enhancedStyles.totalValue}>{formatCurrency(subtotal)}</Text>
                                </div>

                                {shippingCost > 0 && (
                                    <div style={enhancedStyles.totalRow}>
                                        <Text style={enhancedStyles.totalLabel}>
                                            {t.orderConfirmation?.shipping || 'Shipping'}
                                        </Text>
                                        <Text style={enhancedStyles.totalValue}>{formatCurrency(shippingCost)}</Text>
                                    </div>
                                )}

                                {discountAmount > 0 && (
                                    <div style={enhancedStyles.totalRow}>
                                        <Text style={enhancedStyles.totalLabel}>
                                            {t.orderConfirmation?.discount || 'Discount'}
                                        </Text>
                                        <Text style={enhancedStyles.discountValue}>
                                            -{formatCurrency(discountAmount)}
                                        </Text>
                                    </div>
                                )}

                                {vatEnabled && vatAmount > 0 && (
                                    <div style={enhancedStyles.totalRow}>
                                        <Text style={enhancedStyles.totalLabel}>
                                            {t.orderConfirmation?.vat || 'VAT'} ({parseFloat(vatPercentage).toFixed(1)}
                                            %)
                                        </Text>
                                        <Text style={enhancedStyles.totalValue}>
                                            {vatIncluded
                                                ? t.orderConfirmation?.included || 'Included'
                                                : formatCurrency(vatAmount)}
                                        </Text>
                                    </div>
                                )}

                                <Hr style={enhancedStyles.totalDivider} />

                                <div style={enhancedStyles.finalTotalRow}>
                                    <Text style={enhancedStyles.finalTotalLabel}>
                                        {t.orderConfirmation?.total || 'Total'}
                                    </Text>
                                    <Text style={enhancedStyles.finalTotalValue}>{formatCurrency(total)}</Text>
                                </div>
                            </Section>
                        )}

                        {/* Shipping Information - Hide When Payment Pending */}
                        {paymentStatus !== 'pending' && (
                            <Section style={enhancedStyles.shippingSection}>
                                <Text style={enhancedStyles.sectionTitle}>
                                    {t.orderConfirmation?.shippingAddress || 'Shipping Address'}
                                </Text>
                                <div style={enhancedStyles.addressCard}>
                                    <Text style={enhancedStyles.addressName}>{customerName}</Text>
                                    <Text style={enhancedStyles.addressDetails}>{formatAddress()}</Text>
                                </div>
                            </Section>
                        )}

                        {/* Payment Information - Show After Details When Paid */}
                        {paymentStatus !== 'pending' && paymentMethod && (
                            <Section style={enhancedStyles.paymentSection}>
                                <Text style={enhancedStyles.sectionTitle}>
                                    {t.orderConfirmation?.paymentMethod || 'Payment Method'}
                                </Text>
                                <Text style={enhancedStyles.paymentMethod}>
                                    {paymentMethodFormatted}
                                    {paymentEntity && (
                                        <span>
                                            {t.orderConfirmation?.paymentEntity || 'Entity'}: {paymentEntity}
                                        </span>
                                    )}
                                    {paymentReference && (
                                        <span>
                                            {t.orderConfirmation?.paymentReference || 'Ref'}: {paymentReference}
                                        </span>
                                    )}
                                </Text>
                                {bankTransferDetails && (
                                    <div style={enhancedStyles.bankDetailsCard}>
                                        <Text style={enhancedStyles.bankDetailsTitle}>
                                            {t.orderConfirmation?.bankTransferDetails || 'Bank Transfer Details'}
                                        </Text>
                                        <div style={enhancedStyles.bankDetails}>
                                            {Object.entries(bankTransferDetails).map(([key, value]) => (
                                                <div key={key} style={enhancedStyles.bankDetailRow}>
                                                    <Text style={enhancedStyles.bankDetailLabel}>
                                                        {key
                                                            .replace(/([A-Z])/g, ' $1')
                                                            .replace(/^./, (str) => str.toUpperCase())}
                                                        :
                                                    </Text>
                                                    <Text style={enhancedStyles.bankDetailValue}>{value}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* Tracking Information */}
                        {trackingNumber && (
                            <Section style={enhancedStyles.trackingSection}>
                                <Text style={enhancedStyles.sectionTitle}>
                                    {t.orderConfirmation?.trackingInfo || 'Tracking Information'}
                                </Text>
                                <Text style={enhancedStyles.trackingNumber}>
                                    {t.orderConfirmation?.trackingNumber || 'Tracking Number'}: {trackingNumber}
                                </Text>
                            </Section>
                        )}

                        {/* Action Buttons */}
                        <Section style={enhancedStyles.actionSection}>
                            <Button href={orderSummaryUrl} style={enhancedStyles.primaryButton}>
                                {paymentStatus === 'pending'
                                    ? t.orderConfirmation?.viewOrderAndPayment || 'View Order & Complete Payment'
                                    : t.orderConfirmation?.viewOrderDetails || 'View Order Details'}
                            </Button>
                            {paymentStatus !== 'pending' && (
                                <Button href={`mailto:${supportEmail}`} style={enhancedStyles.secondaryButton}>
                                    {t.orderConfirmation?.contactSupport || 'Contact Support'}
                                </Button>
                            )}
                        </Section>

                        {/* Footer */}
                        <OrderFooter
                            companyName={companyName}
                            companyUrl={companyUrl}
                            supportEmail={supportEmail}
                            translations={{
                                ...t.common,
                                ...t.orderConfirmation
                            }}
                        />
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Enhanced Styles
const enhancedStyles = {
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
    orderBadgePending: {
        backgroundColor: '#f59e0b',
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
    paymentStatusAlert: {
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '15px',
        margin: '20px 0'
    },
    paymentStatusText: {
        fontSize: '14px',
        color: '#92400e',
        fontWeight: '500',
        margin: '0',
        textAlign: 'center'
    },
    paymentStatusSuccess: {
        backgroundColor: '#d1fae5',
        border: '1px solid #10b981',
        borderRadius: '8px',
        padding: '15px',
        margin: '20px 0'
    },
    paymentStatusSuccessText: {
        fontSize: '14px',
        color: '#065f46',
        fontWeight: '500',
        margin: '0',
        textAlign: 'center'
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
    bankDetailsCard: {
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '15px',
        margin: '15px 0'
    },
    bankDetailsTitle: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#92400e',
        margin: '0 0 10px'
    },
    bankDetails: {
        display: 'grid',
        gap: '5px'
    },
    bankDetailRow: {
        display: 'flex',
        justifyContent: 'space-between'
    },
    bankDetailLabel: {
        fontSize: '12px',
        color: '#92400e',
        fontWeight: '500',
        margin: '0'
    },
    bankDetailValue: {
        fontSize: '12px',
        color: '#92400e',
        fontWeight: '600',
        margin: '0'
    },
    trackingSection: {
        margin: '30px 0'
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
    },
    footer: {
        backgroundColor: '#f9fafb',
        padding: '30px 20px',
        textAlign: 'center',
        marginTop: '40px',
        borderTop: '1px solid #e5e7eb'
    },
    footerText: {
        fontSize: '14px',
        color: '#6b7280',
        margin: '10px 0',
        lineHeight: '1.5'
    },
    footerLink: {
        color: '#3b82f6',
        textDecoration: 'none'
    },
    footerCompany: {
        fontSize: '12px',
        color: '#9ca3af',
        margin: '20px 0 0',
        lineHeight: '1.4'
    }
};

export default OrderConfirmationTemplate;
