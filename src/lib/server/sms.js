// @/lib/server/sms.js

'use server';

import { getSettings } from '@/lib/server/settings';
import { recordCampaignEvent } from '@/lib/server/web-stats';

// Load translations for SMS
const loadSMSTranslations = async (locale = 'en') => {
    try {
        const translations = await import(`@/locale/messages/${locale}/SMS.json`);
        return translations.default.SMS;
    } catch (error) {
        console.error('Failed to load SMS translations:', error);
        return {};
    }
};

// ============================================================================
// TWILIO CLIENT INITIALIZATION
// ============================================================================

let twilioClient = null;

/**
 * Initialize Twilio client with credentials from store settings
 * @returns {Promise<Object>} Twilio client instance
 */
async function initializeTwilioClient() {
    if (twilioClient) return twilioClient;

    try {
        const { adminSiteSettings } = await getSettings();
        const siteSettings = adminSiteSettings;

        if (!siteSettings.smsEnabled) {
            throw new Error('SMS service is not enabled');
        }

        const twilioAccountSid = siteSettings.twilioAccountSid || null;
        const twilioAuthToken = siteSettings.twilioAuthToken || null;

        if (!twilioAccountSid || !twilioAuthToken) {
            throw new Error('Twilio credentials are not configured');
        }

        // Dynamically import Twilio
        const twilio = await import('twilio');
        twilioClient = twilio.default(twilioAccountSid, twilioAuthToken);

        return twilioClient;
    } catch (error) {
        console.error('Failed to initialize Twilio client:', error);
        throw error;
    }
}

/**
 * Get Twilio phone number from settings
 * @returns {Promise<string>} Twilio phone number
 */
async function getTwilioPhoneNumber() {
    const { adminSiteSettings } = await getSettings();
    const siteSettings = adminSiteSettings;

    if (!siteSettings.smsEnabled) {
        throw new Error('SMS service is disabled');
    }

    const twilioPhoneNumber = siteSettings.twilioPhoneNumber;
    if (!twilioPhoneNumber) {
        throw new Error('Twilio phone number is not configured');
    }

    return twilioPhoneNumber;
}

/**
 * Format phone number with international prefix
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    // Trim whitespace
    let formatted = phoneNumber.trim();

    // If already starts with +, preserve it and remove all other non-digits
    if (formatted.startsWith('+')) {
        formatted = '+' + formatted.substring(1).replace(/\D/g, '');
    } else {
        // Remove all non-digits and add + prefix
        formatted = '+' + formatted.replace(/\D/g, '');
    }

    return formatted;
}

/**
 * Personalize SMS message with recipient data
 * @param {string} message - Template message
 * @param {Object} recipient - Recipient data
 * @returns {string} Personalized message
 */
function personalizeMessage(message, recipient) {
    let personalizedMessage = message;

    if (recipient.name) {
        personalizedMessage = personalizedMessage.replace(/\{name\}/g, recipient.name);
        personalizedMessage = personalizedMessage.replace(/\{firstName\}/g, recipient.name.split(' ')[0]);
    }

    return personalizedMessage;
}

// ============================================================================
// SMS TRACKING HELPERS
// ============================================================================

/**
 * Add UTM parameters and tracking to URLs in SMS message
 * @param {string} message - SMS message content
 * @param {string} campaignId - Campaign ID for tracking
 * @param {string} campaignType - Campaign type (default: 'sms')
 * @returns {string} Message with tracking parameters added to URLs
 */
const addTrackingToSMS = (message, campaignId, campaignType = 'sms') => {
    if (!message) return message;

    // Regular expression to find URLs in text
    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    return message.replace(urlRegex, (url) => {
        try {
            // Skip unsubscribe and preview links
            if (url.includes('unsubscribe') || url.includes('preview')) {
                return url;
            }

            const urlObj = new URL(url);
            urlObj.searchParams.set('utm_source', 'newsletter');
            urlObj.searchParams.set('utm_medium', campaignType);
            urlObj.searchParams.set('utm_campaign', campaignId);
            return urlObj.toString();
        } catch (error) {
            // If URL parsing fails, return original
            return url;
        }
    });
};

// ============================================================================
// SMS SENDING FUNCTIONS
// ============================================================================

/**
 * Send SMS campaign to multiple recipients
 * @param {Object} campaign - Campaign data
 * @param {Array<Object>} subscribers - List of subscribers
 * @param {Array<Object>} manualRecipients - List of manual recipients
 * @returns {Promise<Object>} Result with success status and data
 */
export async function sendSMSCampaign(campaign, subscribers = [], manualRecipients = []) {
    try {
        if (!campaign) {
            return {
                success: false,
                error: 'Campaign is required'
            };
        }

        // Initialize Twilio client and get phone number
        const client = await initializeTwilioClient();
        const twilioPhoneNumber = await getTwilioPhoneNumber();

        // Get system settings for default language
        const { adminSiteSettings } = await getSettings();
        const siteSettings = adminSiteSettings;
        const defaultLocale = siteSettings?.language || 'en';
        const siteUrl = siteSettings?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Import functions for generating preview and unsubscribe links
        const { generatePreviewLink, generateUnsubscribeLink } = await import('@/lib/server/newsletter');

        // Generate preview link for campaign (base64 encoded)
        const previewLink = await generatePreviewLink(campaign.id, siteUrl);

        // Extract ML content - support both string and object formats
        const getMLContent = (content, locale) => {
            if (typeof content === 'object' && content !== null) {
                // ML object: { en: "...", es: "...", pt: "..." }
                const fallbackLang = campaign.locale || defaultLocale;
                return content[locale] || content[fallbackLang] || content[Object.keys(content)[0]] || '';
            }
            // Legacy: string content
            return content || '';
        };

        const campaignLocale = campaign.locale || defaultLocale;
        const campaignMessage =
            getMLContent(campaign.message, campaignLocale) || getMLContent(campaign.content, campaignLocale);

        // Combine subscribers and manual recipients
        const allRecipients = [
            ...(subscribers || []),
            ...(manualRecipients || []).map((r) => ({
                id: `manual_${Date.now()}_${Math.random()}`,
                phone: r.phone,
                name: r.name || null,
                status: 'active'
            }))
        ];

        if (allRecipients.length === 0) {
            return {
                success: false,
                error: 'At least one recipient is required'
            };
        }

        let successCount = 0;
        let failureCount = 0;
        const errors = [];

        // Send SMS to each recipient
        for (const recipient of allRecipients) {
            try {
                if (!recipient.phone) {
                    throw new Error('Phone number is required');
                }

                // Format phone number
                const phoneNumber = formatPhoneNumber(recipient.phone);

                // Personalize message
                let message = personalizeMessage(campaignMessage, recipient);

                // Add tracking to URLs in SMS message
                message = addTrackingToSMS(message, campaign.id, 'sms');

                // Generate unsubscribe link for this recipient (base64 encoded)
                // For SMS, use phone number if available, otherwise use email
                const unsubscribeIdentifier = recipient.phone || recipient.email;
                const unsubscribeType = recipient.phone ? 'phone' : 'email';
                const unsubscribeLink = await generateUnsubscribeLink(unsubscribeIdentifier, unsubscribeType, siteUrl);

                // Add preview and unsubscribe links to SMS message
                // Keep it short for SMS (160 char limit per segment)
                message += `\n\n\nVer: ${previewLink}`;
                message += `\n\n\nCancelar: ${unsubscribeLink}`;

                await client.messages.create({
                    body: message,
                    from: twilioPhoneNumber,
                    to: phoneNumber
                });

                successCount++;

                // Record successful SMS send event
                await recordCampaignEvent({
                    campaignId: campaign.id,
                    campaignType: 'sms',
                    eventType: 'sent',
                    recipient: recipient.phone,
                    metadata: {
                        recipientName: recipient.name
                    }
                });

                // Small delay to avoid overwhelming Twilio API
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`Failed to send SMS to ${recipient.phone}:`, error);
                failureCount++;
                errors.push({
                    recipient: recipient.phone,
                    error: error.message
                });

                // Record failed SMS send event
                await recordCampaignEvent({
                    campaignId: campaign.id,
                    campaignType: 'sms',
                    eventType: 'failed',
                    recipient: recipient.phone,
                    metadata: {
                        error: error.message,
                        recipientName: recipient.name
                    }
                });
            }
        }

        console.log(`SMS campaign sent: ${successCount} successful, ${failureCount} failed`);

        return {
            success: true,
            data: {
                sent: successCount,
                failed: failureCount,
                total: allRecipients.length,
                errors: errors.slice(0, 5) // Limit errors in response
            }
        };
    } catch (error) {
        console.error('SMS campaign error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send SMS campaign',
            code: error.code
        };
    }
}

/**
 * Send test SMS to a single recipient
 * @param {Object} campaign - Campaign data
 * @param {string} testPhone - Test phone number
 * @param {string} testName - Test recipient name (optional)
 * @returns {Promise<Object>} Result with success status and data
 */
export async function sendSMS(campaign, testPhone, testName = null) {
    try {
        if (!campaign || !testPhone) {
            return {
                success: false,
                error: 'Campaign and test phone number are required'
            };
        }

        // Initialize Twilio client and get phone number
        const client = await initializeTwilioClient();
        const twilioPhoneNumber = await getTwilioPhoneNumber();

        // Get system settings for default language
        const { adminSiteSettings } = await getSettings();
        const siteSettings = adminSiteSettings;
        const defaultLocale = siteSettings?.language || 'en';
        const siteUrl = siteSettings?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Import functions for generating preview and unsubscribe links
        const { generatePreviewLink, generateUnsubscribeLink } = await import('@/lib/server/newsletter');

        // Generate preview and unsubscribe links (base64 encoded)
        const previewLink = await generatePreviewLink(campaign.id, siteUrl);
        const unsubscribeLink = await generateUnsubscribeLink(testPhone, 'phone', siteUrl);

        // Extract ML content - support both string and object formats
        const getMLContent = (content, locale) => {
            if (typeof content === 'object' && content !== null) {
                const fallbackLang = campaign.locale || defaultLocale;
                return content[locale] || content[fallbackLang] || content[Object.keys(content)[0]] || '';
            }
            return content || '';
        };

        const campaignLocale = campaign.locale || defaultLocale;
        const campaignMessage =
            getMLContent(campaign.message, campaignLocale) || getMLContent(campaign.content, campaignLocale);

        // Format phone number
        const phoneNumber = formatPhoneNumber(testPhone);

        // Personalize test message
        let message = campaignMessage;

        if (testName) {
            message = personalizeMessage(message, { name: testName });
        }

        await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: phoneNumber
        });

        return {
            success: true,
            data: {
                message: 'Test SMS sent successfully',
                to: phoneNumber
            }
        };
    } catch (error) {
        console.error('Test SMS error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send test SMS',
            code: error.code
        };
    }
}

/**
 * Send test SMS to a single recipient
 * @param {Object} campaign - Campaign data
 * @param {string} testPhone - Test phone number
 * @param {string} testName - Test recipient name (optional)
 * @returns {Promise<Object>} Result with success status and data
 */
export async function sendTestSMS(campaign, testPhone, testName = null) {
    return sendSMS(campaign, testPhone, testName);
}

/**
 * Send verification code to phone number
 * @param {string} phoneNumber - Phone number to verify
 * @returns {Promise<Object>} Result with success status and verification code
 */
export async function sendPhoneVerification(phoneNumber) {
    try {
        if (!phoneNumber) {
            return {
                success: false,
                error: 'Phone number is required'
            };
        }

        // Initialize Twilio client and get phone number
        const client = await initializeTwilioClient();
        const twilioPhoneNumber = await getTwilioPhoneNumber();

        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000);
        const message = `Your verification code is: ${verificationCode}. Do not share this code with anyone.`;

        await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: formattedPhone
        });

        return {
            success: true,
            data: {
                message: 'Verification code sent',
                code: verificationCode, // In production, store this securely in DB
                phone: formattedPhone
            }
        };
    } catch (error) {
        console.error('Phone verification error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send verification code',
            code: error.code
        };
    }
}

/**
 * Send order status update SMS notification to customer
 * @param {Object} orderData - Order data object
 * @param {string} orderData.id - Order ID
 * @param {string} orderData.status - New order status
 * @param {string} orderData.trackingNumber - Tracking number (optional)
 * @param {Object} orderData.customer - Customer data
 * @param {string} orderData.customer.firstName - Customer first name
 * @param {string} orderData.customer.phone - Customer phone number
 * @param {string} baseUrl - Base URL for order tracking link
 * @param {string} locale - Locale for message (optional, defaults to system language)
 * @returns {Promise<Object>} Result with success status
 */
export async function sendOrderStatusSMS(orderData, baseUrl, locale = null) {
    try {
        if (!orderData || !orderData.id || !orderData.status) {
            return {
                success: false,
                error: 'Order ID and status are required'
            };
        }

        if (!orderData.customer?.phone) {
            return {
                success: false,
                error: 'Customer phone number is required'
            };
        }

        // Initialize Twilio client and get phone number FIRST (same order as sendSMS)
        const client = await initializeTwilioClient();
        const twilioPhoneNumber = await getTwilioPhoneNumber();

        // Get system settings for default language
        const { adminSiteSettings } = await getSettings();
        const siteSettings = adminSiteSettings;
        const defaultLocale = siteSettings?.language || 'pt';
        const messageLocale = locale || defaultLocale;
        const siteUrl = baseUrl || siteSettings?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Import function for generating unsubscribe link
        const { generateUnsubscribeLink } = await import('@/lib/server/newsletter');

        // Load translations
        const t = await loadSMSTranslations(messageLocale);

        // Format customer phone number (same as sendSMS)
        const customerPhone = formatPhoneNumber(orderData.customer.phone);

        // Get customer first name or use generic greeting
        const firstName = orderData.customer.firstName || 'Customer';
        const greeting = t.hi || 'Hi';

        // Create status-specific message
        let statusMessage = '';
        let trackingInfo = '';

        const statusKey = orderData.status.toLowerCase();
        if (t.orderStatus?.[statusKey]) {
            statusMessage = t.orderStatus[statusKey];
        } else {
            statusMessage =
                t.orderStatus?.default?.replace('{{status}}', orderData.status) ||
                `Your order status has been updated to: ${orderData.status}.`;
        }

        // Add tracking info if available
        if (orderData.trackingNumber && statusKey === 'delivered') {
            const trackingLabel = t.orderStatus?.tracking || 'Tracking';
            trackingInfo = `\n${trackingLabel}: ${orderData.trackingNumber}`;
        }

        // Build tracking URL (ID only for direct access)
        const encodedOrderId = Buffer.from(orderData.orderId || orderData.id).toString('base64');
        const trackingUrl = `${baseUrl}/track?id=${encodedOrderId}`;
        const trackOrderLabel = t.orderStatus?.trackOrder || 'Track your order';

        // Generate unsubscribe link for customer (base64 encoded)
        const unsubscribeLink = await generateUnsubscribeLink(orderData.customer.phone, 'phone', siteUrl);

        // Construct SMS message (SMS has 160 character limit per segment, keep concise)
        const message = `${greeting} ${firstName}! ${statusMessage}${trackingInfo}\n\n${trackOrderLabel}: ${trackingUrl}\n\nCancelar SMS: ${unsubscribeLink}`;

        // Send SMS
        await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: customerPhone
        });

        return {
            success: true,
            data: {
                message: 'Order status SMS sent successfully',
                to: customerPhone,
                orderId: orderData.id
            }
        };
    } catch (error) {
        console.error('Order status SMS error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send order status SMS',
            code: error.code
        };
    }
}
