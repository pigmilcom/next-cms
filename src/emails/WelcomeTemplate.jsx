// emails/WelcomeTemplate.jsx
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components';
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

export const WelcomeTemplate = ({
    userDisplayName = '[User Name]',
    companyName = '[Your Company]',
    companyLogo = '',
    companyUrl = '',
    supportEmail = '',
    loginUrl = 'https://yourapp.com/auth/login',
    locale = 'en'
}) => {
    const t = loadTranslations(locale);

    return (
        <Html>
            <Head />
            <Preview>{t.welcome?.preview || 'Bem-vindo à família! 👋🧡'}</Preview>
            <Body style={emailStyles.main}>
                <Container style={emailStyles.container}>
                    {/* Header */}
                    <EmailHeader companyLogo={companyLogo} companyName={companyName} />

                    {/* Header */}
                    <Heading style={emailStyles.heading}>
                        {t.welcome?.title?.replace('{userName}', userDisplayName) || `Hello ${userDisplayName}! 👋`}
                    </Heading>

                    {/* Main Message */}
                    <Text style={emailStyles.paragraph}>
                        {t.welcome?.excited || "On est super heureux de t'accueillir parmi nous 🎉"}
                    </Text>

                    <Text style={emailStyles.paragraph}>
                        {t.welcome?.familyMessage?.replace('{companyName}', companyName) ||
                            `Tu viens de rejoindre la famille ${companyName}, et on peut te le dire : tu vas te sentir ici comme à la maison.`}
                    </Text>

                    <Text style={emailStyles.paragraph}>
                        {t.welcome?.whatWeDo ||
                            "Des vêtements stylés, confortables et pensés avec amour, c'est ce qu'on fait de mieux. Et maintenant, c'est pour toi aussi !"}
                    </Text>

                    {/* Features Section */}
                    <Section style={emailStyles.featuresSection}>
                        <Text style={emailStyles.featuresTitle}>
                            {t.welcome?.stayTuned || 'Garde un œil sur ta boîte mail :'}
                        </Text>
                        <Text style={emailStyles.featureText}>
                            {t.welcome?.surprises ||
                                "👉 Des surprises, des nouveautés, des offres exclusives (et un peu d'amour aussi 💌) arrivent très vite."}
                        </Text>
                    </Section>

                    {/* CTA Section */}
                    <Text style={emailStyles.paragraph}>
                        {t.welcome?.browseCollections ||
                            'En attendant, fais comme chez toi et jette un œil à nos collections :'}
                    </Text>

                    <Section style={emailStyles.buttonSection}>
                        <Button style={emailStyles.button} href={loginUrl}>
                            {t.welcome?.accessAccount || '🔗 Access Your Account'}
                        </Button>
                    </Section>

                    <Text style={emailStyles.paragraph}>
                        {t.welcome?.needHelp ||
                            "Besoin d'un coup de main ou d'un conseil taille/style ? Écris-nous, on est là pour toi !"}
                    </Text>

                    {/* Footer */}
                    <EmailFooter
                        companyName={companyName}
                        companyUrl={companyUrl}
                        supportEmail={supportEmail}
                        translations={{
                            ...t.common,
                            bestRegards: t.welcome?.welcomeAgain || 'Welcome again',
                            needHelp: t.welcome?.anyQuestion || 'Any question?'
                        }}
                    />
                </Container>
            </Body>
        </Html>
    );
};

export default WelcomeTemplate;
