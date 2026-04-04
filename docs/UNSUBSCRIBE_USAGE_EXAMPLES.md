// Example: How to use the unsubscribe feature in your email templates

import { generateUnsubscribeLink } from '@/lib/server/newsletter';
import { EmailFooter } from '@/emails/partials/EmailFooter';

// Example 1: Generate unsubscribe link for an email
const userEmail = 'user@example.com';
const unsubscribeUrl = generateUnsubscribeLink(userEmail, 'email');
// Result: https://yoursite.com/unsubscribe?id=dXNlckBleGFtcGxlLmNvbQ==&type=email

// Example 2: Generate unsubscribe link for SMS/phone
const userPhone = '+351912345678';
const unsubscribeUrl = generateUnsubscribeLink(userPhone, 'phone');
// Result: https://yoursite.com/unsubscribe?id=KzM1MTkxMjM0NTY3OA==&type=phone

// Example 3: Using in email template
export const MyEmailTemplate = ({ 
    recipientEmail,
    companyName,
    supportEmail,
    companyUrl,
    baseUrl 
}) => {
    const unsubscribeUrl = generateUnsubscribeLink(recipientEmail, 'email', baseUrl);
    
    return (
        <Html>
            <Body>
                {/* Email content */}
                
                <EmailFooter
                    companyName={companyName}
                    companyUrl={companyUrl}
                    supportEmail={supportEmail}
                    unsubscribeUrl={unsubscribeUrl}
                    socialNetworks={[
                        { name: 'Facebook', url: 'https://facebook.com/...' },
                        { name: 'Instagram', url: 'https://instagram.com/...' }
                    ]}
                />
            </Body>
        </Html>
    );
};

// Example 4: Manually creating the link (for testing)
const email = 'test@example.com';
const encodedEmail = Buffer.from(email).toString('base64');
const testUrl = `https://yoursite.com/unsubscribe?id=${encodedEmail}&type=email`;
console.log('Test URL:', testUrl);
// Visit this URL to test the unsubscribe page

// Example 5: Decoding (for verification)
const encodedValue = 'dGVzdEBleGFtcGxlLmNvbQ==';
const decodedEmail = Buffer.from(encodedValue, 'base64').toString('utf-8');
console.log('Decoded:', decodedEmail); // Output: test@example.com
