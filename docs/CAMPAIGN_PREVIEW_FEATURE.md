# Campaign Preview Feature Documentation

## Overview
The campaign preview feature allows users to view email campaign content in their browser before it's sent. This is useful for reviewing campaign content, sharing drafts, and ensuring proper rendering.

## File Structure
```
src/app/(frontend)/preview/
├── page.jsx              # Server component - fetches campaign data
├── page.client.jsx       # Client component - renders preview
├── loading.js            # Loading skeleton
└── not-found.jsx         # Error page for invalid links
```

## Server Functions Added

### `getCampaign(campaignId)`
Fetches a single campaign by ID from the campaigns table.

**Parameters:**
- `campaignId`: Campaign ID (e.g., 'CAMP_xxx')

**Returns:**
```javascript
{
    success: true,
    data: {
        id: 'CAMP_xxx',
        subject: { pt: '...', en: '...' },
        content: { pt: '...', en: '...' },
        previewText: { pt: '...', en: '...' },
        type: 'email',
        status: 'draft',
        createdAt: '2026-01-25T...',
        sentAt: null,
        recipientCount: 0
    }
}
```

### `generatePreviewLink(campaignId, baseUrl)`
Generates a preview URL for a campaign.

**Parameters:**
- `campaignId`: Campaign ID
- `baseUrl`: Base URL (optional, uses env if not provided)

**Returns:**
```javascript
Promise<string> // e.g., "https://yoursite.com/preview?id=Q0FNUF94eHg="
```

**Usage:**
```javascript
import { generatePreviewLink } from '@/lib/server/newsletter';

// In your email template or admin panel
const previewUrl = await generatePreviewLink('CAMP_abc123');
// Result: https://yoursite.com/preview?id=Q0FNUF9hYmMxMjM=
```

## How It Works

### 1. Link Generation
Campaign IDs are base64 encoded in the URL:

```javascript
// Example: Generate preview link
const campaignId = 'CAMP_abc123';
const encodedId = Buffer.from(campaignId).toString('base64');
const previewUrl = `${siteUrl}/preview?id=${encodedId}`;
```

### 2. URL Parameters
- `id`: Base64 encoded campaign ID

**Example URLs:**
```
/preview?id=Q0FNUF9hYmMxMjM=
```

### 3. Page Flow

#### Server Component (`page.jsx`)
1. Receives URL parameters
2. Decodes base64 campaign ID
3. Validates ID format
4. Fetches campaign data using `getCampaign()`
5. Validates campaign type (email only)
6. Passes data to client component
7. Returns 404 if campaign not found or invalid type

#### Client Component (`page.client.jsx`)
1. Displays campaign metadata (subject, dates, status)
2. Shows multi-language selector if available
3. Renders email content with proper HTML formatting
4. Simulates email client header/footer
5. Responsive design for mobile/desktop viewing

## Features

### Multi-Language Support
- Automatically detects available languages in campaign content
- Shows language selector if campaign has multiple translations
- Falls back to default language if selected language is unavailable

### Campaign Information Display
- **Subject**: Email subject line
- **Preview Text**: Email preview text (shown in inbox)
- **Status Badge**: Draft, Sent, or Scheduled
- **Created Date**: When campaign was created
- **Sent Date**: When campaign was sent (if applicable)
- **Recipient Count**: Number of recipients (if available)

### Email Rendering
- **Header Simulation**: Shows "From" and "Subject" fields
- **HTML Content**: Renders rich HTML content with proper styling
- **Footer Simulation**: Company info and support email
- **Responsive Design**: Works on mobile and desktop
- **Safe HTML**: Uses `dangerouslySetInnerHTML` with sanitized content

## Campaign Data Structure

Campaigns support multi-language content:

```javascript
{
    id: 'CAMP_xxx',
    subject: {
        pt: 'Bem-vindo!',
        en: 'Welcome!',
        es: '¡Bienvenido!'
    },
    content: {
        pt: '<h1>Olá!</h1><p>Conteúdo em Português</p>',
        en: '<h1>Hello!</h1><p>Content in English</p>',
        es: '<h1>¡Hola!</h1><p>Contenido en Español</p>'
    },
    previewText: {
        pt: 'Uma breve descrição...',
        en: 'A brief description...',
        es: 'Una breve descripción...'
    },
    type: 'email', // or 'sms'
    status: 'draft', // or 'sent', 'scheduled'
    createdAt: '2026-01-25T10:00:00.000Z',
    sentAt: null,
    recipientCount: 0
}
```

## Integration with Email Templates

Include preview links in your campaign emails:

```javascript
import { generatePreviewLink } from '@/lib/server/newsletter';

// In your email template component
export const CampaignEmailTemplate = async ({ campaignId, content }) => {
    const previewUrl = await generatePreviewLink(campaignId);
    
    return (
        <Html>
            <Body>
                {/* Email content */}
                <div dangerouslySetInnerHTML={{ __html: content }} />
                
                {/* Preview link in footer */}
                <p style={{ textAlign: 'center', fontSize: '12px' }}>
                    Não consegue ver este email?{' '}
                    <a href={previewUrl}>Ver no navegador</a>
                </p>
            </Body>
        </Html>
    );
};
```

## Admin Panel Integration

Add preview button to campaigns list:

```jsx
import { generatePreviewLink } from '@/lib/server/newsletter';

// In admin campaigns page
const handlePreview = async (campaignId) => {
    const previewUrl = await generatePreviewLink(campaignId);
    window.open(previewUrl, '_blank');
};

<Button onClick={() => handlePreview(campaign.id)}>
    <Eye className="h-4 w-4 mr-2" />
    Preview
</Button>
```

## Security Considerations

- **No Authentication Required**: Anyone with the link can view (by design for easy sharing)
- **Base64 Encoding**: IDs are encoded (not encrypted) for clean URLs
- **No Sensitive Data**: Preview page shows only campaign content, no recipient data
- **Type Validation**: Only email campaigns can be previewed (SMS doesn't need browser preview)
- **Robots Meta**: `noindex, nofollow` prevents search engine indexing

## Use Cases

1. **Review Before Sending**: Preview campaign content before sending to recipients
2. **Share with Team**: Share preview link with team members for review
3. **Client Approval**: Send preview link to clients for approval
4. **Testing**: Test email rendering across different devices/browsers
5. **Email Fallback**: Include "View in browser" link in emails for rendering issues

## Testing

**Test preview link generation:**
```javascript
const campaignId = 'CAMP_test123';
const encoded = Buffer.from(campaignId).toString('base64');
console.log(`/preview?id=${encoded}`);
// Output: /preview?id=Q0FNUF90ZXN0MTIz
```

**Test decoding:**
```javascript
const decoded = Buffer.from('Q0FNUF90ZXN0MTIz', 'base64').toString('utf-8');
console.log(decoded); // Output: CAMP_test123
```

## Limitations

- **Email Campaigns Only**: SMS campaigns cannot be previewed (returns 404)
- **Static Preview**: Does not show personalization variables (shows raw placeholders)
- **Client Rendering**: Actual email rendering may vary by email client
- **No Tracking**: Preview page doesn't track opens/clicks like real emails

## Future Enhancements

- Add personalization variable preview with sample data
- Include email analytics if campaign is already sent
- Add social sharing options for preview links
- Implement preview link expiration for security
- Add mobile/desktop view toggle
- Include spam score and deliverability checks
