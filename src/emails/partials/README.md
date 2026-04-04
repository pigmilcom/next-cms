# Email Partials Components

Universal, reusable components for email templates to maintain consistency and reduce code duplication.

## Components

### EmailHeader
Universal header component with responsive logo.

**Usage:**
```jsx
import { EmailHeader } from '@/emails/partials/EmailHeader';

<EmailHeader 
    companyLogo="https://example.com/logo.png" 
    companyName="Your Company"
    customStyles={{ padding: '20px' }} // Optional
/>
```

**Props:**
- `companyLogo` (string) - Logo URL
- `companyName` (string) - Company name (fallback if no logo)
- `customStyles` (object) - Optional custom styles override

**Features:**
- Responsive logo with `maxWidth: 100%` and `height: auto`
- Automatic fallback to text logo if image not provided
- Centered alignment
- Consistent styling across all templates

---

### EmailFooter
Standard footer for general email templates.

**Usage:**
```jsx
import { EmailFooter } from '@/emails/partials/EmailFooter';

<EmailFooter 
    companyName="Your Company"
    companyUrl="https://example.com"
    supportEmail="support@example.com"
    translations={t.common}
/>
```

**Props:**
- `companyName` (string) - Company name
- `companyUrl` (string) - Company website URL
- `supportEmail` (string) - Support email address
- `translations` (object) - Translation object (optional)
- `customStyles` (object) - Optional custom styles override

**Features:**
- Best regards message
- Support email with "Need help?" prompt
- Company URL link
- Copyright notice with current year
- Fully translatable

---

### OrderFooter
Specialized footer for order-related emails.

**Usage:**
```jsx
import { OrderFooter } from '@/emails/partials/OrderFooter';

<OrderFooter 
    companyName="Your Company"
    companyUrl="https://example.com"
    supportEmail="support@example.com"
    translations={{
        footerThankYou: 'Thank you for your order!',
        footerQuestion: 'Questions about your order?',
        allRightsReserved: 'All rights reserved'
    }}
/>
```

**Props:**
- `companyName` (string) - Company name
- `companyUrl` (string) - Company website URL
- `supportEmail` (string) - Support email address
- `translations` (object) - Translation object with order-specific messages
- `customStyles` (object) - Optional custom styles override

**Features:**
- Thank you message
- Order-specific support prompt
- Company URL link
- Copyright notice

---

### NewsletterFooter
Specialized footer for newsletter emails with unsubscribe functionality.

**Usage:**
```jsx
import { NewsletterFooter } from '@/emails/partials/NewsletterFooter';

<NewsletterFooter 
    companyName="Your Company"
    companyUrl="https://example.com"
    senderName="Your Team"
    senderEmail="newsletter@example.com"
    supportEmail="support@example.com"
    unsubscribeUrl="https://example.com/unsubscribe"
    translations={t.newsletter}
/>
```

**Props:**
- `companyName` (string) - Company name
- `companyUrl` (string) - Company website URL
- `senderName` (string) - Sender name
- `senderEmail` (string) - Sender email
- `supportEmail` (string) - Support email address
- `unsubscribeUrl` (string) - Unsubscribe URL
- `translations` (object) - Translation object
- `customStyles` (object) - Optional custom styles override

**Features:**
- Subscription notice
- Unsubscribe link (red color for visibility)
- Contact support link
- Sender information with email
- Company URL
- Copyright notice
- Privacy notice

---

## Benefits

1. **Consistency** - All email templates use the same header/footer components
2. **Maintainability** - Update once, applies to all templates
3. **Responsive** - Logos automatically scale on mobile devices
4. **Clean Code** - Reduced duplication, easier to read
5. **Flexibility** - Custom styles can be passed as props
6. **Translations** - Full i18n support

## Templates Using These Partials

- ✅ EmailVerificationTemplate
- ✅ PasswordResetTemplate
- ✅ WelcomeTemplate
- ✅ UserCreatedTemplate
- ✅ UserUpdatedTemplate
- ✅ OrderConfirmationTemplate
- ✅ OrderUpdateTemplate
- ✅ OrderAdminConfirmationTemplate
- ✅ OrderStatusUpdateTemplate
- ✅ NewsletterTemplate
- ✅ NotificationTemplate

## Styling

All partials use styles from `@/emails/styles.js`:
- Responsive logo sizing
- Consistent colors and typography
- Proper spacing and alignment
- Mobile-friendly layout
