import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
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

export const OrderAdminConfirmationTemplate = ({
    customerName = '[Customer Name]',
    customerEmail = '[customer@email.com]',
    customerPhone = '',
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
    vatEnabled = false,
    vatPercentage = 0,
    vatAmount = '0.00',
    vatIncluded = false,
    total = '30.00',
    currency = 'EUR',
    orderSummaryUrl = 'https://yourapp.com/admin/orders/12345',
    locale = 'en',
    paymentMethod = null,
    paymentStatus = 'pending',
    paymentReference = null,
    paymentEntity = null,
    bankTransferDetails = null,
    trackingNumber = null,
    estimatedDelivery = null,
    deliveryNotes = null,
    isServiceAppointment = false
}) => {
    const t = loadOrderEmailTranslations(locale);
    const logo_img = companyLogo || '';
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

    return (
        <Html>
            <Head />
            <Preview>
                {t.adminNotification.paymentConfirmedPreview
                    ?.replace('{orderId}', orderId)
                    .replace('{customerName}', customerName)
                    .replace('{total}', formatOrderEmailCurrency(total, currency, locale)) ||
                    t.adminNotification.preview
                        .replace('{orderId}', orderId)
                        .replace('{customerName}', customerName)
                        .replace('{total}', formatOrderEmailCurrency(total, currency, locale))}
            </Preview>
            <Body style={emailStyles.main}>
                <Container style={emailStyles.container}>
                    <EmailHeader companyLogo={logo_img} companyName={companyName} customStyles={emailStyles.header} />

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

                    <Heading style={emailStyles.mainHeading}>{t.adminNotification.actionRequired}</Heading>

                    <Text style={emailStyles.greeting}>
                        {t.adminNotification.paymentConfirmedMessage || t.adminNotification.newOrderMessage}
                    </Text>

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
                                    {formatOrderEmailCurrency(total, currency, locale)}
                                </Text>
                            </div>
                        </div>
                    </Section>

                    <Section style={emailStyles.shippingSection}>
                        <Text style={emailStyles.sectionTitle}>{customerInfoLabel}</Text>
                        <div style={emailStyles.addressCard}>
                            <Text style={emailStyles.addressName}>{customerName}</Text>
                            <Text style={emailStyles.addressDetails}>
                                {t.adminNotification.email}: {customerEmail}
                            </Text>
                            {customerPhone ? (
                                <Text style={emailStyles.addressDetails}>
                                    {phoneLabel}: {customerPhone}
                                </Text>
                            ) : null}
                        </div>
                    </Section>

                    <Section style={emailStyles.productsSection}>
                        <Text style={emailStyles.sectionTitle}>{t.adminNotification.productsOrdered}</Text>

                        {items.map((item, index) => (
                            <div key={index} style={emailStyles.productRow}>
                                <div style={emailStyles.productInfo}>
                                    <Text style={emailStyles.productName}>{item.name}</Text>
                                    {item.size ? (
                                        <Text style={emailStyles.productDetails}>
                                            {t.adminNotification.size}: {item.size}
                                        </Text>
                                    ) : null}
                                    <Text style={emailStyles.productDetails}>
                                        {t.adminNotification.quantity}: {item.quantity}
                                    </Text>
                                    <Text style={emailStyles.productDetails}>
                                        {t.adminNotification.unitPrice}: {formatOrderEmailCurrency(item.price, currency, locale)}
                                    </Text>
                                    {getOrderItemMetaLines(item, t).map((line, metaIndex) => (
                                        <Text key={`${index}-meta-${metaIndex}`} style={emailStyles.productDetails}>
                                            {line}
                                        </Text>
                                    ))}
                                </div>
                                <div>
                                    <Text style={emailStyles.productPrice}>
                                        {formatOrderEmailCurrency((item.price || 0) * (item.quantity || 1), currency, locale)}
                                    </Text>
                                </div>
                            </div>
                        ))}
                    </Section>

                    <Section style={emailStyles.totalsSection}>
                        <div style={emailStyles.totalRow}>
                            <Text style={emailStyles.totalLabel}>
                                {vatEnabled && vatIncluded
                                    ? t.orderStatusUpdate?.subtotalExclVat || 'Subtotal (excl. VAT)'
                                    : t.adminNotification.productsSubtotal}
                            </Text>
                            <Text style={emailStyles.totalValue}>
                                {formatOrderEmailCurrency(
                                    vatEnabled && vatIncluded && vatAmount > 0 ? subtotal - vatAmount : subtotal,
                                    currency,
                                    locale
                                )}
                            </Text>
                        </div>
                        {shippingCost > 0 && (
                            <div style={emailStyles.totalRow}>
                                <Text style={emailStyles.totalLabel}>{t.adminNotification.shippingCost}</Text>
                                <Text style={emailStyles.totalValue}>
                                    {formatOrderEmailCurrency(shippingCost, currency, locale)}
                                </Text>
                            </div>
                        )}
                        {discountAmount > 0 && (
                            <div style={emailStyles.totalRow}>
                                <Text style={emailStyles.totalLabel}>{t.orderConfirmation.discount}</Text>
                                <Text style={emailStyles.discountValue}>
                                    -{formatOrderEmailCurrency(discountAmount, currency, locale)}
                                </Text>
                            </div>
                        )}
                        {vatEnabled && vatAmount > 0 && (
                            <div style={emailStyles.totalRow}>
                                <Text style={emailStyles.totalLabel}>
                                    {t.orderConfirmation.vat} ({parseFloat(vatPercentage || 0).toFixed(1)}%)
                                </Text>
                                <Text style={emailStyles.totalValue}>
                                    {vatIncluded
                                        ? t.orderConfirmation?.included || 'Included'
                                        : formatOrderEmailCurrency(vatAmount, currency, locale)}
                                </Text>
                            </div>
                        )}
                        <Hr style={emailStyles.totalDivider} />
                        <div style={emailStyles.finalTotalRow}>
                            <Text style={emailStyles.finalTotalLabel}>{t.adminNotification.total}</Text>
                            <Text style={emailStyles.finalTotalValue}>
                                {formatOrderEmailCurrency(total, currency, locale)}
                            </Text>
                        </div>
                    </Section>

                    {(paymentMethodFormatted || paymentReference || paymentEntity || bankTransferDetails) && (
                        <Section style={emailStyles.paymentSection}>
                            <Text style={emailStyles.sectionTitle}>{paymentDetailsLabel}</Text>
                            <div style={emailStyles.addressCard}>
                                {paymentMethodFormatted ? (
                                    <Text style={emailStyles.addressDetails}>
                                        {t.orderConfirmation?.paymentMethod || 'Payment Method'}: {paymentMethodFormatted}
                                    </Text>
                                ) : null}
                                <Text style={emailStyles.addressDetails}>
                                    {t.orderUpdate?.status || 'Status'}: {paymentStatus}
                                </Text>
                                {paymentEntity ? (
                                    <Text style={emailStyles.addressDetails}>
                                        {t.orderConfirmation?.paymentEntity || 'Entity'}: {paymentEntity}
                                    </Text>
                                ) : null}
                                {paymentReference ? (
                                    <Text style={emailStyles.addressDetails}>
                                        {t.orderConfirmation?.paymentReference || 'Reference'}: {paymentReference}
                                    </Text>
                                ) : null}
                                {bankTransferDetails
                                    ? Object.entries(bankTransferDetails).map(([key, value]) => (
                                          <Text key={key} style={emailStyles.addressDetails}>
                                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}: {String(value)}
                                          </Text>
                                      ))
                                    : null}
                            </div>
                        </Section>
                    )}

                    {orderFlags.showShippingAddress && (
                        <Section style={emailStyles.shippingSection}>
                            <Text style={emailStyles.sectionTitle}>{t.adminNotification.shippingAddress}</Text>
                            <div style={emailStyles.addressCard}>
                                <Text style={emailStyles.addressName}>{customerName}</Text>
                                <Text style={emailStyles.addressDetails}>{addressText}</Text>
                            </div>
                        </Section>
                    )}

                    {(trackingNumber || estimatedDelivery || deliveryNotes) && (
                        <Section style={emailStyles.trackingSection}>
                            <Text style={emailStyles.sectionTitle}>
                                {t.orderConfirmation?.trackingInfo || 'Tracking Information'}
                            </Text>
                            {trackingNumber ? (
                                <Text style={emailStyles.trackingNumber}>
                                    {t.orderConfirmation?.trackingNumber || 'Tracking Number'}: {trackingNumber}
                                </Text>
                            ) : null}
                            {estimatedDelivery ? (
                                <Text style={emailStyles.addressDetails}>
                                    {t.orderConfirmation?.estimatedDelivery || 'Estimated Delivery'}: {estimatedDelivery}
                                </Text>
                            ) : null}
                            {deliveryNotes ? (
                                <Text style={emailStyles.addressDetails}>{deliveryNotes}</Text>
                            ) : null}
                        </Section>
                    )}

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

                    <OrderFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        supportEmail={supportEmail}
                        translations={{
                            footerThankYou: t.adminNotification.autoGenerated,
                            footerQuestion: t.adminNotification.adminEmail,
                            allRightsReserved: t.common?.allRightsReserved
                        }}
                    />

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
