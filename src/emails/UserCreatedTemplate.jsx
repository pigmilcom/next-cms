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

export const UserCreatedTemplate = ({
    userDisplayName,
    email,
    password,
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
            <Preview>{t.userCreated?.preview || 'Your Account Has Been Created'}</Preview>
            <Body style={emailStyles.body}>
                <Container style={emailStyles.container}>
                    {/* Header */}
                    <EmailHeader companyLogo={companyLogo} companyName={companyName} />

                    {/* Main Content */}
                    <Section style={emailStyles.section}>
                        <Heading style={emailStyles.heading}>
                            {t.userCreated?.title?.replace('{companyName}', companyName) ||
                                `Welcome to ${companyName}!`}
                        </Heading>

                        <Text style={emailStyles.paragraph}>
                            {t.userCreated?.greeting?.replace('{userDisplayName}', userDisplayName) ||
                                `Hello ${userDisplayName},`}
                        </Text>

                        <Text style={emailStyles.paragraph}>
                            {t.userCreated?.message ||
                                'Your account has been successfully created. Here are your login details:'}
                        </Text>

                        <Section style={emailStyles.featuresSection}>
                            <Text style={emailStyles.featureText}>
                                {t.userCreated?.email || 'Email'}: {email}
                            </Text>
                            <Text style={emailStyles.featureText}>
                                {t.userCreated?.password || 'Password'}: {password}
                            </Text>
                        </Section>

                        <Text style={emailStyles.paragraph}>
                            {t.userCreated?.changePassword ||
                                'Please login to your account and change your password as soon as possible.'}
                        </Text>

                        <Section style={emailStyles.buttonSection}>
                            <Button style={emailStyles.button} href={loginUrl}>
                                {t.userCreated?.loginButton || 'Login to Your Account'}
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

export default UserCreatedTemplate;
