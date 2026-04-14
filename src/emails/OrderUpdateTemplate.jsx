// emails/OrderUpdateTemplate.jsx
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text
} from '@react-email/components';
import { EmailHeader } from './partials/EmailHeader';
import { OrderFooter } from './partials/OrderFooter';
import {
    formatOrderEmailAddress,
    formatOrderEmailCurrency,
    formatOrderEmailPaymentMethod,
    getOrderEmailFlags,
    getOrderItemMetaLines,
    loadOrderEmailTranslations
} from './order-email.utils';
import { emailStyles } from './styles';

export const OrderUpdateTemplate = ({
    customerName = '[Customer Name]',
    customerEmail = '',
    customerPhone = '',
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
    paymentReference = null,
    paymentEntity = null,
    bankTransferDetails = null,
    trackingNumber = null,
    trackingUrl = null,
    estimatedDelivery = null,
    deliveryNotes = null,
    customMessage = null,
    isServiceAppointment = false
}) => {
    const t = loadOrderEmailTranslations(locale);
    const logo_img = companyLogo || '';

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
    const paymentMethodFormatted = paymentMethod ? formatOrderEmailPaymentMethod(paymentMethod, t) : null;
    const addressText = formatOrderEmailAddress(shippingAddress);
    const orderFlags = getOrderEmailFlags({
        items,
        shippingAddress,
        shippingCost,
        isServiceAppointment
    });
    const customerInfoLabel = t.common?.customerInformation || 'Customer Information';
    const paymentDetailsLabel = t.common?.paymentDetails || 'Payment Details';
    const phoneLabel = t.common?.phone || 'Phone';
    const emailLabel = t.adminNotification?.email || 'Email';

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
                            <Text style={emailStyles.sectionTitle}>{customerInfoLabel}</Text>
                            <div style={emailStyles.addressCard}>
                                <Text style={emailStyles.addressName}>{customerName}</Text>
                                {customerEmail ? <Text style={emailStyles.addressDetails}>{emailLabel}: {customerEmail}</Text> : null}
                                {customerPhone ? <Text style={emailStyles.addressDetails}>{phoneLabel}: {customerPhone}</Text> : null}
                            </div>
                        </Section>

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
                                        {getOrderItemMetaLines(item, t).map((line, metaIndex) => (
                                            <Text key={`${index}-meta-${metaIndex}`} style={emailStyles.productDetails}>
                                                {line}
                                            </Text>
                                        ))}
                                    </div>
                                    <Text style={emailStyles.productPrice}>
                                        {formatOrderEmailCurrency(item.price * item.quantity, currency, locale)}
                                    </Text>
                                </div>
                            ))}
                        </Section>

                        {/* Totals Section */}
                        <Section style={emailStyles.totalsSection}>
                            <div style={emailStyles.totalRow}>
                                <Text style={emailStyles.totalLabel}>
                                    {vatEnabled && vatIncluded
                                        ? t.orderStatusUpdate?.subtotalExclVat || 'Subtotal (excl. VAT)'
                                        : t.orderConfirmation?.subtotal || 'Subtotal'}
                                </Text>
                                <Text style={emailStyles.totalValue}>
                                    {formatOrderEmailCurrency(
                                        vatEnabled && vatIncluded && vatAmount > 0 ? subtotal - vatAmount : subtotal,
                                        currency,
                                        locale
                                    )}
                                </Text>
                            </div>
                            {vatEnabled && vatAmount > 0 && (
                                <div style={emailStyles.totalRow}>
                                    <Text style={emailStyles.totalLabel}>
                                        {t.orderConfirmation?.vat || 'VAT'} ({vatPercentage}%)
                                    </Text>
                                    <Text style={emailStyles.totalValue}>
                                        {vatIncluded
                                            ? t.orderConfirmation?.included || 'Included'
                                            : formatOrderEmailCurrency(vatAmount, currency, locale)}
                                    </Text>
                                </div>
                            )}
                            {shippingCost > 0 && (
                                <div style={emailStyles.totalRow}>
                                    <Text style={emailStyles.totalLabel}>
                                        {t.orderConfirmation?.shipping || 'Shipping'}
                                    </Text>
                                    <Text style={emailStyles.totalValue}>
                                        {formatOrderEmailCurrency(shippingCost, currency, locale)}
                                    </Text>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div style={emailStyles.totalRow}>
                                    <Text style={emailStyles.totalLabel}>
                                        {t.orderConfirmation?.discount || 'Discount'}
                                    </Text>
                                    <Text style={emailStyles.discountValue}>
                                        -{formatOrderEmailCurrency(discountAmount, currency, locale)}
                                    </Text>
                                </div>
                            )}
                            <Hr style={emailStyles.totalDivider} />
                            <div style={emailStyles.finalTotalRow}>
                                <Text style={emailStyles.finalTotalLabel}>{t.orderConfirmation?.total || 'Total'}</Text>
                                <Text style={emailStyles.finalTotalValue}>
                                    {formatOrderEmailCurrency(total, currency, locale)}
                                </Text>
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
                        {orderFlags.showShippingAddress && (
                            <Section style={emailStyles.shippingSection}>
                                <Text style={emailStyles.sectionTitle}>
                                    {t.orderConfirmation?.shippingAddress || 'Shipping Address'}
                                </Text>
                                <div style={emailStyles.addressCard}>
                                    <Text style={emailStyles.addressName}>{customerName}</Text>
                                    <Text style={emailStyles.addressDetails}>{addressText}</Text>
                                </div>

                                {deliveryNotes && (
                                    <div style={{ marginTop: '15px' }}>
                                        <Text style={emailStyles.metaLabel}>
                                            {t.orderStatusUpdate?.deliveryNotes || 'Delivery Notes'}
                                        </Text>
                                        <Text style={emailStyles.addressDetails}>{deliveryNotes}</Text>
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* Payment Section */}
                        {(paymentMethodFormatted || paymentReference || paymentEntity || bankTransferDetails) && (
                            <Section style={emailStyles.paymentSection}>
                                <Text style={emailStyles.sectionTitle}>{paymentDetailsLabel}</Text>
                                <div style={emailStyles.paymentMethod}>
                                    <Text style={{ margin: '0', fontWeight: '600' }}>{paymentMethodFormatted}</Text>
                                    <Text style={{ margin: '0' }}>
                                        {t.orderUpdate?.status || 'Status'}: {paymentStatus}
                                    </Text>
                                    {paymentEntity ? <Text style={{ margin: '0' }}>{t.orderConfirmation?.paymentEntity || 'Entity'}: {paymentEntity}</Text> : null}
                                    {paymentReference ? <Text style={{ margin: '0' }}>{t.orderConfirmation?.paymentReference || 'Reference'}: {paymentReference}</Text> : null}
                                </div>
                                {bankTransferDetails ? (
                                    <div style={{ ...emailStyles.addressCard, marginTop: '12px' }}>
                                        <Text style={emailStyles.addressName}>
                                            {t.orderConfirmation?.bankTransferDetails || 'Bank Transfer Details'}
                                        </Text>
                                        {Object.entries(bankTransferDetails).map(([key, value]) =>
                                            value ? (
                                                <Text key={key} style={emailStyles.addressDetails}>
                                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}: {value}
                                                </Text>
                                            ) : null
                                        )}
                                    </div>
                                ) : null}
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
