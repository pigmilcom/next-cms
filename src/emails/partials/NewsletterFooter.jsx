// @/emails/partials/NewsletterFooter.jsx
import { Link, Section, Text } from '@react-email/components';
import { emailStyles } from '../styles';

// Social network emoji mapping (email-safe)
const getSocialEmoji = (name) => {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('facebook')) return '📘';
    if (lowerName.includes('twitter') || lowerName === 'x') return '🐦';
    if (lowerName.includes('instagram')) return '📷';
    if (lowerName.includes('linkedin')) return '💼';
    if (lowerName.includes('youtube')) return '▶️';
    if (lowerName.includes('tiktok')) return '🎵';
    if (lowerName.includes('whatsapp')) return '💬';
    if (lowerName.includes('telegram')) return '✈️';
    if (lowerName.includes('pinterest')) return '📌';
    if (lowerName.includes('snapchat')) return '👻';
    if (lowerName.includes('reddit')) return '🤖';
    if (lowerName.includes('discord')) return '🎮';
    if (lowerName.includes('github')) return '🐙';

    return '🌐';
};

/**
 * Newsletter-specific Email Footer Component
 * Includes unsubscribe link and sender information
 * @param {string} companyName - Company name
 * @param {string} companyUrl - Company website URL
 * @param {string} senderName - Sender name
 * @param {string} senderEmail - Sender email
 * @param {string} supportEmail - Support email address
 * @param {string} unsubscribeUrl - Unsubscribe URL
 * @param {Array} socialNetworks - Array of social network objects [{name, url}]
 * @param {object} translations - Translation object (optional)
 * @param {object} customStyles - Optional custom styles override
 */
export const NewsletterFooter = ({
    companyName = 'Your Company',
    companyUrl = '',
    senderName = 'Your Company',
    senderEmail = '',
    supportEmail = '',
    unsubscribeUrl = '#',
    socialNetworks = [],
    translations = {},
    customStyles = {}
}) => {
    const footerStyles = {
        ...emailStyles.footer,
        ...customStyles
    };

    const socialContainerStyles = {
        margin: '20px 0',
        textAlign: 'center'
    };

    const socialLinkStyles = {
        display: 'inline-block',
        margin: '0 8px',
        fontSize: '24px',
        textDecoration: 'none',
        color: '#6b7280'
    };

    return (
        <Section style={footerStyles}>
            <Text style={emailStyles.footerText}>
                {translations?.subscriptionNotice?.replace('{companyName}', companyName) ||
                    `You're receiving this email because you subscribed to our newsletter from ${companyName}.`}
            </Text>

            <Text style={emailStyles.footerText}>
                <Link href={unsubscribeUrl} style={{ ...emailStyles.link, color: '#dc2626' }}>
                    {translations?.unsubscribe || 'Unsubscribe'}
                </Link>
                {' | '}
                <Link href={`mailto:${supportEmail}`} style={emailStyles.link}>
                    {translations?.contactSupport || 'Contact Support'}
                </Link>
            </Text>

            <Text style={emailStyles.footerText}>
                {translations?.bestRegards || 'Best regards'},
                <br />
                <strong>{senderName}</strong>
                <br />
                <Link href={`mailto:${senderEmail}`} style={emailStyles.link}>
                    {senderEmail}
                </Link>
            </Text>

            {companyUrl && (
                <Text style={emailStyles.footerText}>
                    <Link href={companyUrl} style={emailStyles.link}>
                        {companyUrl}
                    </Link>
                </Text>
            )}

            {/* Social Networks */}
            {socialNetworks && socialNetworks.length > 0 && (
                <div style={socialContainerStyles}>
                    {socialNetworks.map((social, index) => (
                        <Link
                            key={`${social.name}-${index}`}
                            href={social.url}
                            style={socialLinkStyles}
                            target="_blank"
                            title={social.name}>
                            {getSocialEmoji(social.name)}
                        </Link>
                    ))}
                </div>
            )}

            <Text style={emailStyles.footerText}>
                {companyName}
                <br />© {new Date().getFullYear()} {translations?.allRightsReserved || 'All rights reserved.'}
            </Text>

            <Text style={{ ...emailStyles.footerText, fontSize: '12px', fontStyle: 'italic' }}>
                {translations?.privacyNotice ||
                    '🔒 Your email address is safe with us. We never share or sell your information.'}
            </Text>
        </Section>
    );
};

export default NewsletterFooter;
