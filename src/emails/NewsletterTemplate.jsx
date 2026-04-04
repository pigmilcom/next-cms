// emails/NewsletterTemplate.jsx
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
import { NewsletterFooter } from './partials/NewsletterFooter';
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

export const NewsletterTemplate = ({
    subject = 'Newsletter Update',
    content = 'Thank you for subscribing to our newsletter.',
    previewText = '',
    subscriberName = null,
    companyName = 'Your App Name',
    companyLogo = '',
    companyUrl = '',
    senderName = 'Your App Name',
    senderEmail = 'noreply@yourdomain.com',
    supportEmail = 'support@yourdomain.com',
    unsubscribeUrl = '#',
    webVersionUrl = '#',
    locale = 'en'
}) => {
    const t = loadTranslations(locale);

    // Convert content to HTML if it's plain text
    const htmlContent = content.includes('<')
        ? content
        : content
              .split('\n')
              .map((line) => (line.trim() ? `<p style="margin: 0 0 15px 0;">${line}</p>` : '<br />'))
              .join('');

    return (
        <Html>
            <Head />
            <Preview>{previewText || subject}</Preview>
            <Body style={emailStyles.body}>
                <Container style={{ ...emailStyles.container, margin: '30px 0 !important', padding: '0 !important' }}>
                    {/* Header */}
                    <Section style={emailStyles.header}>
                        <div style={emailStyles.headerContent}>
                            <EmailHeader
                                companyLogo={companyLogo}
                                companyName={companyName}
                                customStyles={{ border: 'none', padding: '0' }}
                            />
                            <Text style={emailStyles.headerText}>
                                <Link href={webVersionUrl} style={emailStyles.link}>
                                    {t.newsletter?.viewBrowser || 'View in browser'}
                                </Link>
                            </Text>
                        </div>
                    </Section>

                    {/* Main Content */}
                    <Section style={emailStyles.section}>
                        <Heading style={emailStyles.heading}>{subject}</Heading>

                        {subscriberName && (
                            <Text style={emailStyles.text}>
                                {t.newsletter?.greeting?.replace('{name}', subscriberName.split(' ')[0]) ||
                                    `Hi ${subscriberName.split(' ')[0]},`}
                            </Text>
                        )}

                        {/* Content Section */}
                        <Section style={emailStyles.messageSection}>
                            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                        </Section>

                        {/* Call to Action */}
                        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                            <Text style={emailStyles.text}>
                                {t.newsletter?.thankYou || 'Thank you for being part of our community!'}
                            </Text>
                            <Button href={companyUrl || webVersionUrl} style={emailStyles.button}>
                                {t.newsletter?.visitWebsite || 'Visit Our Website'}
                            </Button>
                        </Section>
                    </Section>

                    <Hr style={emailStyles.separator} />

                    {/* Footer */}
                    <NewsletterFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        senderName={senderName}
                        senderEmail={senderEmail}
                        supportEmail={supportEmail}
                        unsubscribeUrl={unsubscribeUrl}
                        translations={{
                            ...t.common,
                            ...t.newsletter
                        }}
                    />
                </Container>
            </Body>
        </Html>
    );
};

export default NewsletterTemplate;
