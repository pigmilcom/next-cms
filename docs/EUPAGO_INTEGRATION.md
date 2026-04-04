# EuPago Payment Integration Documentation

## Overview

This document describes the EuPago payment integration that has been added to the Next.js 15 platform. EuPago is a Portuguese payment service provider that supports Multibanco, MB WAY, and credit card payments.

## Architecture (Updated for Next.js 15 & React 19)

The integration now uses **API routes instead of server actions** for better compatibility with Next.js 15:

- **Primary API**: `/api/eupago` - Centralized EuPago operations
- **Service Layer**: `/src/lib/server/admin.js` - Core business logic (EuPago functions)

## Features

- **Multiple Payment Methods**: Supports Multibanco and MB WAY payments
- **Payment Status Monitoring**: Automatic and manual checking of pending payments
- **Admin Management**: Complete admin interface for EuPago configuration and monitoring
- **Easy Configuration**: Simple API key and URL configuration
- **Easy Removal**: Clean integration that can be easily disabled or removed
- **Next.js 15 Compatible**: Uses API routes only (no server actions)

## Configuration

### 1. Admin Settings

Configure EuPago in the admin panel:

1. Go to **Admin → Store → Settings → Payments**
2. Enable the **EuPago Payment Processing** toggle
3. Configure the following settings:
   - **API URL**: `https://sandbox.eupago.pt/` for testing or `https://eupago.pt/` for production
   - **API Key**: Your EuPago API key
   - **Supported Methods**: Enable Multibanco and/or MB WAY

### 2. Environment Variables (Optional)

For enhanced security, you can set a cron job secret:

```env
CRON_SECRET_KEY=your-secret-key-here
```

## API Usage (Updated)

### Payment Processing

**POST/GET** `/api/eupago`
- Process new EuPago payments
- Check payment status
- Check all pending payments
- Create payment references

### Webhook (Future Implementation)

**POST** `/api/eupago/webhook`
- Handle EuPago payment notifications

## Usage

### Customer Experience

1. **Checkout Process**: Customers can select Multibanco or MB WAY during checkout
2. **MB WAY**: Enter mobile number for instant payment request
3. **Multibanco**: Receive Entity and Reference numbers for ATM payment
4. **Success Page**: Clear payment instructions and status

### Admin Experience

1. **Order Management**: View EuPago payment status in orders list
2. **Bulk Checking**: Check all pending EuPago payments at once
3. **Individual Checking**: Check specific order payment status
4. **Automatic Updates**: Orders automatically update when payments are confirmed

## Payment Flow

### Multibanco Flow

1. Customer selects Multibanco payment method
2. System creates payment reference via EuPago API
3. Customer receives Entity and Reference numbers
4. Customer pays at ATM or online banking
5. System checks payment status periodically
6. Order status updates automatically when paid

### MB WAY Flow

1. Customer selects MB WAY and enters mobile number
2. System creates MB WAY payment request via EuPago API
3. Customer receives payment request on MB WAY app
4. Customer confirms payment in app
5. Payment status updates immediately or via polling

## Security Features

- **API Key Protection**: API keys are stored securely and never exposed to client
- **CSRF Protection**: All payment endpoints include CSRF validation
- **Rate Limiting**: API endpoints include rate limiting protection
- **Cron Security**: Optional secret key for automated cron job access

## Monitoring & Maintenance

### Manual Checking

1. **Bulk Check**: Use "Check EuPago" button in admin orders page
2. **Individual Check**: Use order dropdown menu for specific orders
3. **API Direct**: Call the API endpoints directly

## Integration Points

### Store Settings

- Configured in `src/app/admin/store/settings/page.jsx`
- Stored in store_settings collection
- paymentMethods.euPago object structure

### Order Processing

- Integrated into checkout flow in `src/app/shop/checkout/PaymentForm.jsx`
- Service booking support in `src/app/book-service/page.jsx`
- Success page instructions in `src/app/shop/checkout/success/page.jsx`

### Admin Management

- Orders page integration in `src/app/admin/store/orders/page.jsx`
- Payment status checking and monitoring
- EuPago-specific payment method recognition

## Service Architecture

### EuPago Service (`src/lib/server/eupago.js`)

Main service class that handles:
- Payment processing and reference generation
- Status checking and order updates
- Email notifications for confirmed payments
- Initialization and configuration management

### API Routes

- **Main Route**: `/api/eupago/route.js`
- **Server Functions**: `/lib/server/admin.js` (EuPago functions)

## Removal Instructions

To remove EuPago integration if no longer needed:

1. **Disable in Admin**: Turn off EuPago toggle in store settings
2. **Remove Files**:
   - `src/app/api/eupago/` (entire folder)
   - Remove EuPago functions from `src/lib/server/admin.js`
3. **Clean UI Code**:
   - Remove EuPago options from checkout forms
   - Remove EuPago configuration from store settings
   - Remove EuPago buttons from admin orders page
4. **Clean Database**: Remove EuPago configuration from store_settings

## Error Handling

- **Configuration Errors**: Clear error messages when API keys are missing
- **Network Errors**: Graceful handling of API communication failures
- **Payment Failures**: User-friendly error messages and retry options
- **Status Check Failures**: Fallback to manual checking when automatic fails

## Testing

### Sandbox Testing

Use EuPago sandbox environment:
- **API URL**: `https://sandbox.eupago.pt/`
- **Test API Key**: Use provided sandbox API key
- **Test Payments**: Use sandbox payment methods for testing

### Production Deployment

Switch to production:
- **API URL**: `https://eupago.pt/`
- **Live API Key**: Use your live EuPago API key
- **Monitor**: Set up proper monitoring for payment status checks

## Support

For issues or questions:
- Check EuPago API documentation
- Monitor server logs for payment processing errors
- Use admin interface for manual payment verification
- Contact EuPago support for API-related issues