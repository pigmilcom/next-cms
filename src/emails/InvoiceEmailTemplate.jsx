import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';
import { EmailHeader } from './partials/EmailHeader';
import { OrderFooter } from './partials/OrderFooter';
import {
    formatOrderEmailCurrency,
    formatOrderEmailPaymentMethod,
    loadOrderEmailTranslations
} from './order-email.utils';
import { emailStyles } from './styles';

export const InvoiceEmailTemplate = ({
    customerName = '[Customer Name]',
    companyName = '[Your Company]',
    companyLogo = '',
    orderId = '#12345',
    orderDate = '[Date]',
    total = 0,
    currency = 'EUR',
    paymentMethod = null,
    paymentStatus = 'pending',
    orderSummaryUrl = 'https://yourapp.com/invoice/example',
    companyUrl = 'https://yourapp.com',
    supportEmail = 'support@yourcompany.com',
    socialNetworks = [],
    locale = 'en'
}) => {
    const t = loadOrderEmailTranslations(locale);
    const paymentMethodLabel = paymentMethod ? formatOrderEmailPaymentMethod(paymentMethod, t) : null;

    return (
        <Html>
            <Head />
            <Preview>
                {t.invoiceEmail?.preview?.replace('{orderId}', orderId) || `Invoice available for order #${orderId}`}
            </Preview>
            <Body style={emailStyles.main}>
                <Container style={emailStyles.container}>
                    <EmailHeader companyLogo={companyLogo} companyName={companyName} />

                    <Section style={emailStyles.header}>
                        <div style={emailStyles.headerContent}>
                            <div style={emailStyles.orderBadge}>
                                <Text style={emailStyles.orderBadgeText}>
                                    {t.invoiceEmail?.badge || 'Invoice Ready'}
                                </Text>
                            </div>
                        </div>
                    </Section>

                    <Section style={{ padding: '40px 20px' }}>
                        <Heading style={emailStyles.mainHeading}>
                            {t.invoiceEmail?.title || 'Your invoice is ready'}
                        </Heading>

                        <Text style={emailStyles.greeting}>
                            {t.invoiceEmail?.greeting?.replace('{customerName}', customerName) || `Hello ${customerName},`}
                        </Text>

                        <Text style={emailStyles.confirmationText}>
                            {t.invoiceEmail?.message || 'Your order was created successfully and your invoice is now available online.'}
                        </Text>

                        <div style={emailStyles.orderCard}>
                            <div style={emailStyles.orderHeader}>
                                <Text style={emailStyles.orderTitle}>{t.invoiceEmail?.summaryTitle || 'Invoice Summary'}</Text>
                                <Text style={emailStyles.orderId}>{orderId}</Text>
                            </div>
                            <div style={emailStyles.orderMeta}>
                                <div>
                                    <Text style={emailStyles.metaLabel}>{t.orderConfirmation?.orderDate || 'Order Date'}</Text>
                                    <Text style={emailStyles.metaValue}>{orderDate}</Text>
                                </div>
                                <div>
                                    <Text style={emailStyles.metaLabel}>{t.orderConfirmation?.total || 'Total'}</Text>
                                    <Text style={emailStyles.metaValue}>{formatOrderEmailCurrency(total, currency, locale)}</Text>
                                </div>
                                {paymentMethodLabel ? (
                                    <div>
                                        <Text style={emailStyles.metaLabel}>{t.orderConfirmation?.paymentMethod || 'Payment Method'}</Text>
                                        <Text style={emailStyles.metaValue}>{paymentMethodLabel}</Text>
                                    </div>
                                ) : null}
                                <div>
                                    <Text style={emailStyles.metaLabel}>{t.orderUpdate?.status || 'Status'}</Text>
                                    <Text style={emailStyles.metaValue}>{paymentStatus}</Text>
                                </div>
                            </div>
                        </div>

                        <Section style={emailStyles.actionSection}>
                            <Button style={emailStyles.primaryButton} href={orderSummaryUrl}>
                                {t.invoiceEmail?.viewInvoice || 'View Invoice'}
                            </Button>
                        </Section>
                    </Section>

                    <OrderFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        supportEmail={supportEmail}
                        socialNetworks={socialNetworks}
                        translations={{
                            ...t.common,
                            ...t.orderConfirmation
                        }}
                    />
                </Container>
            </Body>
        </Html>
    );
};

export default InvoiceEmailTemplate;