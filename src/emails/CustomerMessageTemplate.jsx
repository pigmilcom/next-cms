// @/emails/CustomerMessageTemplate.jsx
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';
import { EmailFooter } from './partials/EmailFooter';
import { EmailHeader } from './partials/EmailHeader';
import { emailStyles } from './styles';

// Load translations
const loadTranslations = (locale = 'en') => {
    try {
        const translations = require(`@/locale/messages/${locale}/Email.json`);
        return translations.Email;
    } catch (error) {
        return {};
    }
};

/**
 * Customer Message Email Template
 * Used for sending custom messages to customers from admin panel
 * @param {string} customerName - Customer's name
 * @param {string} messageContent - HTML content of the message
 * @param {string} subject - Email subject
 * @param {string} companyName - Company name
 * @param {string} companyLogo - Company logo URL
 * @param {string} companyUrl - Company website URL
 * @param {string} supportEmail - Support email address
 * @param {Array} socialNetworks - Array of social network objects
 * @param {string} locale - Language locale (default: 'en')
 */
export const CustomerMessageTemplate = ({
    customerName = 'Customer',
    messageContent = '',
    subject = '',
    companyName = 'Your App Name',
    companyLogo = '',
    companyUrl = '',
    supportEmail = '',
    socialNetworks = [],
    locale = 'en'
}) => {
    const t = loadTranslations(locale);

    return (
        <Html>
            <Head />
            <Preview>{subject}</Preview>
            <Body style={emailStyles.body}>
                <Container style={emailStyles.container}>
                    {/* Header */}
                    <EmailHeader companyLogo={companyLogo} companyName={companyName} />

                    {/* Main Content */}
                    <Section style={emailStyles.section}>
                        {subject && <Heading style={emailStyles.heading}>{subject}</Heading>}

                        <Text style={emailStyles.text}>
                            {t.common?.hiCustomer?.replace('{customerName}', customerName) || `Hi ${customerName},`}
                        </Text>

                        {/* Message Content */}
                        <Section>
                            <div
                                style={{
                                    fontSize: '16px',
                                    lineHeight: '24px',
                                    color: '#374151',
                                    margin: '0'
                                }}
                                dangerouslySetInnerHTML={{ __html: messageContent }}
                            />
                        </Section>

                        <Text style={emailStyles.text}>
                            {t.common?.bestRegards || 'Best regards'},
                            <br />
                            {t.common?.theTeam || 'The Team'}
                        </Text>
                    </Section>

                    {/* Footer */}
                    <EmailFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        supportEmail={supportEmail}
                        socialNetworks={socialNetworks}
                        translations={t.common}
                    />
                </Container>
            </Body>
        </Html>
    );
};

export default CustomerMessageTemplate;
