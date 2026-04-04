# Unsubscribe Feature Documentation

## Overview
The unsubscribe feature allows users to manage their email and SMS communication preferences through a dedicated page. Users can access this page via a secure link sent in emails/SMS messages.

## File Structure
```
src/app/(frontend)/unsubscribe/
├── page.jsx              # Server component - fetches subscriber data
├── page.client.jsx       # Client component - renders form and handles UI
├── loading.js            # Loading skeleton
└── not-found.jsx         # Error page for invalid links
```

## How It Works

### 1. Link Generation
To generate an unsubscribe link, encode the email or phone number in base64:

```javascript
// Example: Generate unsubscribe link
const email = 'user@example.com';
const encodedEmail = Buffer.from(email).toString('base64');
const unsubscribeUrl = `${siteUrl}/unsubscribe?id=${encodedEmail}&type=email`;

// For SMS/Phone
const phone = '+351912345678';
const encodedPhone = Buffer.from(phone).toString('base64');
const unsubscribeUrl = `${siteUrl}/unsubscribe?id=${encodedPhone}&type=phone`;
```

### 2. URL Parameters
- `id` or `email` or `phone`: Base64 encoded identifier
- `type`: Either 'email' (default) or 'phone'

**Example URLs:**
```
/unsubscribe?id=dXNlckBleGFtcGxlLmNvbQ==&type=email
/unsubscribe?phone=KzM1MTkxMjM0NTY3OA==&type=phone
```

### 3. Page Flow

#### Server Component (`page.jsx`)
1. Receives URL parameters
2. Decodes base64 identifier
3. Validates identifier format
4. Fetches subscriber data using `getSubscriber()`
5. Passes data to client component
6. Returns 404 if subscriber not found

#### Client Component (`page.client.jsx`)
1. Displays current preferences
2. Allows user to toggle individual preferences
3. Includes "Select All" option
4. Optional feedback textarea
5. On submit: calls server action to update preferences
6. Shows success message after update

## Server Functions

### `getSubscriber(identifier, type)`
Fetches subscriber data from either `subscribers` or `users` table.

**Parameters:**
- `identifier`: Email address or phone number
- `type`: 'email' or 'phone' (default: 'email')

**Returns:**
```javascript
{
    success: true,
    data: {
        id: 'SUB_xxx',
        email: 'user@example.com',
        name: 'John Doe',
        phone: '+351912345678',
        status: 'active',
        preferences: {
            emailNotifications: true,
            orderUpdates: true,
            marketingEmails: true,
            newsletter: true,
            smsNotifications: false,
            promotions: true,
            newProducts: true
        },
        isUser: false, // true if from users table
        userKey: null  // user key if from users table
    }
}
```

### `updateSubscriberPreferences(identifier, preferences, reason)`
Updates subscriber communication preferences.

**Parameters:**
- `identifier`: Email address or phone number
- `preferences`: Object with preference flags
- `reason`: Optional unsubscribe reason text

**Behavior:**
- Updates `subscribers` table if subscriber exists there
- Updates `users` table if it's a registered user
- Sets status to 'unsubscribed' if all preferences are disabled
- Clears cache for 'users' and 'subscribers' instances

**Returns:**
```javascript
{
    success: true,
    message: 'Preferences updated successfully',
    data: { /* updated data */ }
}
```

## Preferences Structure

All preferences are boolean flags:

```javascript
{
    emailNotifications: true,  // Important account notifications
    orderUpdates: true,        // Order status updates
    marketingEmails: true,     // Promotional emails
    newsletter: true,          // Newsletter subscription
    smsNotifications: false,   // SMS notifications
    promotions: true,          // Promotions and offers
    newProducts: true          // New product announcements
}
```

## Data Sources

The system checks two data sources:
1. **Subscribers Table**: For newsletter-only subscribers
2. **Users Table**: For registered user accounts

If a subscriber is found in the users table, the `isUser` flag is set to `true`, and updates are applied to the users table instead.

## Cache Management

The feature uses the centralized cache system:
- Reads from 'newsletter' cache instance
- Updates clear both 'users' and 'subscribers' cache instances
- Ensures data consistency across the platform

## Integration with Email Templates

Include unsubscribe links in your email templates:

```javascript
import { generateUnsubscribeLink } from '@/lib/server/newsletter';

// In your email template
const unsubscribeUrl = generateUnsubscribeLink(userEmail);

// Add to email footer
<a href={unsubscribeUrl}>Cancelar subscrição</a>
```

## User Experience

1. User clicks unsubscribe link in email/SMS
2. Redirected to unsubscribe page with pre-filled preferences
3. Can toggle individual preferences or select/deselect all
4. Optional: Provide feedback about why unsubscribing
5. Submit changes
6. See success message
7. Return to homepage

## Security Considerations

- Links use base64 encoding (not encryption)
- No authentication required (by design for easy unsubscribe)
- Page has `robots: noindex, nofollow` to prevent indexing
- Server-side validation of identifier format
- Rate limiting should be applied at server level

## Testing

**Test unsubscribe link generation:**
```javascript
const email = 'test@example.com';
const encoded = Buffer.from(email).toString('base64');
console.log(`/unsubscribe?id=${encoded}&type=email`);
```

**Test decoding:**
```javascript
const decoded = Buffer.from('dGVzdEBleGFtcGxlLmNvbQ==', 'base64').toString('utf-8');
console.log(decoded); // Should output: test@example.com
```

## Future Enhancements

- Add one-click unsubscribe (no form required)
- Track unsubscribe analytics
- Add re-subscription confirmation email
- Implement preference center for all communication types
- Add unsubscribe reason analytics dashboard
