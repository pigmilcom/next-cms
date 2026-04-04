// @/emails/partials/EmailFooter.jsx
import { Link, Section, Text } from '@react-email/components';
import {
    FaDiscord,
    FaFacebook,
    FaGithub,
    FaGlobe,
    FaInstagram,
    FaLinkedin,
    FaPinterest,
    FaReddit,
    FaSnapchat,
    FaTelegram,
    FaTiktok,
    FaWhatsapp,
    FaXTwitter,
    FaYoutube
} from 'react-icons/fa6';

// Social network icon mapping
const getSocialIcon = (name) => {
    if (!name) return <FaGlobe />;
    const lowerName = name.toLowerCase();

    if (lowerName.includes('facebook')) return <FaFacebook />;
    if (lowerName.includes('twitter') || lowerName === 'x') return <FaXTwitter />;
    if (lowerName.includes('instagram')) return <FaInstagram />;
    if (lowerName.includes('linkedin')) return <FaLinkedin />;
    if (lowerName.includes('youtube')) return <FaYoutube />;
    if (lowerName.includes('tiktok')) return <FaTiktok />;
    if (lowerName.includes('whatsapp')) return <FaWhatsapp />;
    if (lowerName.includes('telegram')) return <FaTelegram />;
    if (lowerName.includes('pinterest')) return <FaPinterest />;
    if (lowerName.includes('snapchat')) return <FaSnapchat />;
    if (lowerName.includes('reddit')) return <FaReddit />;
    if (lowerName.includes('discord')) return <FaDiscord />;
    if (lowerName.includes('github')) return <FaGithub />;

    return <FaGlobe />;
};

/**
 * Universal Email Footer Component
 * Standard footer with support contact and company info
 * @param {string} companyName - Company name
 * @param {string} companyUrl - Company website URL
 * @param {string} supportEmail - Support email address
 * @param {Array} socialNetworks - Array of social network objects [{name, url}]
 * @param {string} unsubscribeUrl - Unsubscribe URL (optional)
 * @param {object} translations - Translation object (optional)
 * @param {object} customStyles - Optional custom styles override
 */
export const EmailFooter = ({
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
                {translations?.bestRegards || 'Best regards'},
                <br />
                {translations?.theTeam || 'The'} {companyName} {translations?.theTeam ? '' : 'Team'}
            </Text>

            {supportEmail && (
                <Text style={footerTextStyles}>
                    {translations?.needHelp || 'Need help?'}{' '}
                    <Link href={`mailto:${supportEmail}`} style={linkStyles}>
                        {supportEmail}
                    </Link>
                </Text>
            )}

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
                            {getSocialIcon(social.name)}
                        </Link>
                    ))}
                </div>
            )}

            <Text style={companyInfoStyles}>
                © {new Date().getFullYear()} {companyName}. {translations?.allRightsReserved || 'All rights reserved.'}
            </Text>

            {/* Unsubscribe Link */}
            {unsubscribeUrl && (
                <Text style={{ ...footerTextStyles, fontSize: '12px', marginTop: '15px' }}>
                    {translations?.unsubscribeText || 'Not interested?'}{' '}
                    <Link href={unsubscribeUrl} style={linkStyles}>
                        {translations?.unsubscribeLink || 'Unsubscribe from these emails'}
                    </Link>
                </Text>
            )}
        </Section>
    );
};

export default EmailFooter;
