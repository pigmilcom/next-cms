// emails/EmailVerificationTemplate.jsx
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

export const EmailVerificationTemplate = ({
    verificationCode = '123456',
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
            <Preview>
                {t.emailVerification?.preview?.replace('{verificationCode}', verificationCode) ||
                    `Verify your email address: ${verificationCode}`}
            </Preview>
            <Body style={emailStyles.body}>
                <Container style={emailStyles.container}>
                    {/* Header */}
                    <EmailHeader companyLogo={companyLogo} companyName={companyName} />

                    {/* Main Content */}
                    <Section style={emailStyles.section}>
                        <Heading style={emailStyles.heading}>
                            {t.emailVerification?.title || 'Verify Your Email Address'}
                        </Heading>

                        <Text style={emailStyles.text}>
                            {userDisplayName
                                ? t.emailVerification?.greeting?.replace('{userName}', userDisplayName) ||
                                  `Hi ${userDisplayName},`
                                : t.emailVerification?.greetingGeneric || 'Hi there,'}
                        </Text>

                        <Text style={emailStyles.text}>
                            {t.emailVerification?.message?.replace('{companyName}', companyName) ||
                                `Thank you for signing up with ${companyName}! To complete your registration and secure your account, please verify your email address using the code below:`}
                        </Text>

                        {/* Verification Code */}
                        <Section style={emailStyles.codeSection}>
                            <Text style={emailStyles.codeText}>{verificationCode}</Text>
                        </Section>

                        <Text style={emailStyles.text}>
                            {t.emailVerification?.instructions ||
                                'Enter this code in the verification form to activate your account. This code will expire in 24 hours.'}
                        </Text>

                        <Text style={emailStyles.text}>
                            {t.emailVerification?.noAccount?.replace('{companyName}', companyName) ||
                                `If you didn't create an account with ${companyName}, please ignore this email.`}
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

export default EmailVerificationTemplate;
