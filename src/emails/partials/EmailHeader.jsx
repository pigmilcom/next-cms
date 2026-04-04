// @/emails/partials/EmailHeader.jsx
import { Img, Section, Text } from '@react-email/components';

/**
 * Universal Email Header Component
 * Responsive logo with fallback to text
 * @param {string} companyLogo - Logo URL
 * @param {string} companyName - Company name (fallback if no logo)
 * @param {object} customStyles - Optional custom styles override
 */
export const EmailHeader = ({ companyLogo = '', companyName = 'Your Company', customStyles = {} }) => {
    const headerStyles = {
        backgroundColor: '#ffffff',
        padding: '20px',
        textAlign: 'center',
        borderBottom: '1px solid #e5e7eb',
        ...customStyles
    };

    const logoStyles = {
        margin: '0 auto',
        display: 'block',
        width: '100%',
        maxWidth: '98px',
        height: 'auto'
    };

    const logoTextStyles = {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1f2937',
        margin: '0',
        textAlign: 'center'
    };

    return (
        <Section style={headerStyles}>
            {companyLogo ? (
                <Img src={companyLogo} width="80" height="auto" alt={companyName} style={logoStyles} />
            ) : (
                <Text style={logoTextStyles}>{companyName}</Text>
            )}
        </Section>
    );
};

export default EmailHeader;
