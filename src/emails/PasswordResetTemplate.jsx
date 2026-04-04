// emails/PasswordResetTemplate.jsx
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

export const PasswordResetTemplate = ({
    resetCode = '123456',
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
                {t.passwordReset?.preview?.replace('{resetCode}', resetCode) ||
                    `Your password reset code: ${resetCode}`}
            </Preview>
            <Body style={emailStyles.body}>
                <Container style={emailStyles.container}>
                    {/* Header */}
                    <EmailHeader companyLogo={companyLogo} companyName={companyName} />

                    {/* Main Content */}
                    <Section style={emailStyles.section}>
                        <Heading style={emailStyles.heading}>
                            {t.passwordReset?.title || 'Password Reset Request'}
                        </Heading>

                        <Text style={emailStyles.text}>
                            {userDisplayName
                                ? t.passwordReset?.greeting?.replace('{userName}', userDisplayName) ||
                                  `Hi ${userDisplayName},`
                                : t.passwordReset?.greetingGeneric || 'Hi there,'}
                        </Text>

                        <Text style={emailStyles.text}>
                            {t.passwordReset?.message?.replace('{companyName}', companyName) ||
                                `We received a request to reset your password for your ${companyName} account. Use the verification code below to reset your password:`}
                        </Text>

                        {/* Reset Code */}
                        <Section style={emailStyles.codeSection}>
                            <Text style={emailStyles.codeText}>{resetCode}</Text>
                        </Section>

                        <Text style={emailStyles.text}>
                            {t.passwordReset?.codeExpiry || 'This code will expire in 15 minutes for security reasons.'}
                        </Text>

                        <Text style={emailStyles.text}>
                            {t.passwordReset?.noRequest ||
                                "If you didn't request this password reset, please ignore this email or contact our support team if you have concerns."}
                        </Text>
                    </Section>

                    {/* Security Notice */}
                    <Section style={emailStyles.alertWarning}>
                        <Text style={emailStyles.alertText}>
                            {t.common?.securityNotice?.replace('{companyName}', companyName) ||
                                `For security reasons, never share this code with anyone. ${companyName} will never ask for your password or verification codes via email or phone.`}
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

export default PasswordResetTemplate;
