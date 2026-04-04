// emails/NotificationTemplate.jsx
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

export const NotificationTemplate = ({
    message = 'You have a new notification.',
    userDisplayName = null,
    companyName = 'Your App Name',
    companyLogo = '',
    companyUrl = '',
    supportEmail = '',
    locale = 'en'
}) => {
    const t = loadTranslations(locale);

    return (
        <Html>
            <Head />
            <Preview>{message}</Preview>
            <Body style={emailStyles.body}>
                <Container style={emailStyles.container}>
                    {/* Header */}
                    <EmailHeader companyLogo={companyLogo} companyName={companyName} />

                    {/* Main Content */}
                    <Section style={emailStyles.section}>
                        <Heading style={emailStyles.heading}>{t.notification?.title || 'Notification'}</Heading>

                        <Text style={emailStyles.text}>
                            {userDisplayName
                                ? t.notification?.greeting?.replace('{userName}', userDisplayName) ||
                                  `Hi ${userDisplayName},`
                                : t.notification?.greetingGeneric || 'Hi there,'}
                        </Text>

                        {/* Message Section */}
                        <Section style={emailStyles.messageSection}>
                            <Text style={emailStyles.messageText}>{message}</Text>
                        </Section>

                        <Text style={emailStyles.text}>
                            {t.notification?.supportMessage ||
                                "If you have any questions, please don't hesitate to contact our support team."}
                        </Text>
                    </Section>

                    {/* Footer */}
                    <EmailFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        supportEmail={supportEmail}
                        translations={t.common}
                    />
                </Container>
            </Body>
        </Html>
    );
};

export default NotificationTemplate;
