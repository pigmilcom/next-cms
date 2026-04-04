// @/emails/partials/OrderFooter.jsx
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
 * Order-specific Email Footer Component
 * Includes order-related messaging and company info
 * @param {string} companyName - Company name
 * @param {string} companyUrl - Company website URL
 * @param {string} supportEmail - Support email address
 * @param {Array} socialNetworks - Array of social network objects [{name, url}]
 * @param {string} unsubscribeUrl - Unsubscribe URL (optional)
 * @param {object} translations - Translation object (optional)
 * @param {object} customStyles - Optional custom styles override
 */
export const OrderFooter = ({
    companyName = 'Your Company',
    companyUrl = '',
    supportEmail = '',
    socialNetworks = [],
    unsubscribeUrl = '',
    translations = {},
    customStyles = {}
}) => {
    const footerStyles = {
        backgroundColor: '#f9fafb',
        padding: '30px 20px',
        textAlign: 'center',
        marginTop: '40px',
        borderTop: '1px solid #e5e7eb',
        ...customStyles
    };

    const footerTextStyles = {
        fontSize: '14px',
        color: '#6b7280',
        margin: '10px 0',
        lineHeight: '1.5'
    };

    const linkStyles = {
        color: '#3b82f6',
        textDecoration: 'none'
    };

    const companyInfoStyles = {
        fontSize: '12px',
        color: '#9ca3af',
        margin: '20px 0 0',
        lineHeight: '1.4'
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
            <Text style={footerTextStyles}>
                {translations?.footerThankYou?.replace('{companyName}', companyName) ||
                    `Thank you for choosing ${companyName}! We appreciate your business.`}
            </Text>

            <Text style={footerTextStyles}>
                {translations?.footerQuestion || 'If you have any questions about your order, please contact us at'}{' '}
                <Link href={`mailto:${supportEmail}`} style={linkStyles}>
                    {supportEmail}
                </Link>
            </Text>

            {companyUrl && (
                <Text style={footerTextStyles}>
                    <Link href={companyUrl} style={linkStyles}>
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

            <Text style={companyInfoStyles}>
                {companyName}
                <br />© {new Date().getFullYear()} {translations?.allRightsReserved || 'All rights reserved'}.
            </Text>

            {/* Unsubscribe Link */}
            {unsubscribeUrl && (
                <Text style={{ ...footerTextStyles, fontSize: '12px', marginTop: '15px' }}>
                    {translations?.unsubscribeText || 'Não quer receber estes emails?'}{' '}
                    <Link href={unsubscribeUrl} style={linkStyles}>
                        {translations?.unsubscribeLink || 'Cancelar subscrição'}
                    </Link>
                </Text>
            )}
        </Section>
    );
};

export default OrderFooter;
