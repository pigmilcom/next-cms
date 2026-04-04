import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';
import { EmailFooter } from './partials/EmailFooter';
import { EmailHeader } from './partials/EmailHeader';
import { emailStyles } from './styles';

const loadTranslations = (locale = 'en') => {
    try {
        return require(`@/locale/messages/${locale}/Email.json`);
    } catch (error) {
        return require('@/locale/messages/en/Email.json');
    }
};

export const UserUpdatedTemplate = ({
    userDisplayName,
    changes,
    loginUrl,
    companyName = process.env.NEXT_PUBLIC_APP_NAME || 'Our Platform',
    companyLogo = '',
    companyUrl = '',
    supportEmail = '',
    locale = 'en'
}) => {
    const t = loadTranslations(locale);

    return (
        <Html>
            <Head />
            <Preview>{t.userUpdated?.preview || 'Your Account Has Been Updated'}</Preview>
            <Body style={emailStyles.body}>
                <Container style={emailStyles.container}>
                    {/* Header */}
                    <EmailHeader companyLogo={companyLogo} companyName={companyName} />

                    {/* Main Content */}
                    <Section style={emailStyles.section}>
                        <Heading style={emailStyles.heading}>
                            {t.userUpdated?.title || 'Account Update Notification'}
                        </Heading>

                        <Text style={emailStyles.paragraph}>
                            {t.userUpdated?.greeting?.replace('{userDisplayName}', userDisplayName) ||
                                `Hello ${userDisplayName},`}
                        </Text>

                        <Text style={emailStyles.paragraph}>
                            {t.userUpdated?.message ||
                                'Your account information has been updated. Here are the changes:'}
                        </Text>

                        <Section style={emailStyles.featuresSection}>
                            {Object.entries(changes).map(([key, value]) => (
                                <Text key={key} style={emailStyles.featureText}>
                                    {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
                                </Text>
                            ))}
                        </Section>

                        <Text style={emailStyles.paragraph}>
                            {t.userUpdated?.securityWarning ||
                                'If you did not make these changes, please contact our support team immediately.'}
                        </Text>

                        <Section style={emailStyles.buttonSection}>
                            <Button style={emailStyles.button} href={loginUrl}>
                                {t.userUpdated?.loginButton || 'Login to Your Account'}
                            </Button>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <EmailFooter companyName={companyName} companyUrl={companyUrl} supportEmail={supportEmail} />
                </Container>
            </Body>
        </Html>
    );
};

export default UserUpdatedTemplate;
