// @/lib/server/email.js

'use server';

import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import { getSettings } from '@/lib/server/settings';
import { recordCampaignEvent } from '@/lib/server/web-stats';

const DEFAULT_APP_NAME = 'App';
const DEFAULT_COMPANY_NAME = 'Company';
const DEFAULT_SUPPORT_EMAIL = 'support@yourdomain.com';
const DEFAULT_SENDER_EMAIL = 'noreply@yourdomain.com';
const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_SMTP_CONNECTION_TIMEOUT = 45000;
const DEFAULT_SMTP_GREETING_TIMEOUT = 20000;
const DEFAULT_SMTP_SOCKET_TIMEOUT = 45000;
const DEFAULT_SMTP_DNS_TIMEOUT = 20000;
const RETRYABLE_SMTP_ERROR_CODES = ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ENOTFOUND', 'EAI_AGAIN'];

const toBool = (value, defaultValue = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
        if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
    }
    if (typeof value === 'number') return value === 1;
    return defaultValue;
};

const toInt = (value, defaultValue) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const hasSettingValue = (settings, key) => {
    if (!settings || typeof settings !== 'object') return false;
    return Object.prototype.hasOwnProperty.call(settings, key) && settings[key] !== undefined && settings[key] !== null;
};

const toBoolFromSetting = (settings, key, defaultValue = false) => {
    if (!hasSettingValue(settings, key)) return defaultValue;
    return toBool(settings[key], defaultValue);
};

// Load translations for emails
const loadEmailTranslations = async (locale = 'en') => {
    const normalizedLocale =
        typeof locale === 'string' && locale.trim().length > 0 ? locale.trim() : 'en';

    const localesToTry = [normalizedLocale, normalizedLocale.split('-')[0], 'en'].filter(
        (value, index, array) => value && array.indexOf(value) === index
    );

    for (const localeCode of localesToTry) {
        try {
            const translations = await import(`@/locale/messages/${localeCode}/Email.json`);
            return translations.default.Email;
        } catch (_error) {
            // Try next fallback locale
        }
    }

    return {};
};

const UNIVERSAL_LOCALE_FALLBACK = 'en-US';

const resolveCountryIsoCode = (siteSettings = {}) => {
    const rawIso = siteSettings?.countryIso;
    const rawCountry = siteSettings?.country;
    const candidate =
        typeof rawIso === 'string' && rawIso.trim().length > 0
            ? rawIso.trim()
            : typeof rawCountry === 'string' && rawCountry.trim().length === 2
              ? rawCountry.trim()
              : '';

    const normalized = candidate.toUpperCase();
    return normalized.length === 2 ? normalized : '';
};

const resolveEmailLocale = (preferredLocale = null, siteSettings = null) => {
    const explicitLocale =
        typeof preferredLocale === 'string' && preferredLocale.trim().length > 0
            ? preferredLocale.trim()
            : '';

    if (explicitLocale) {
        return explicitLocale;
    }

    const language =
        typeof siteSettings?.language === 'string' && siteSettings.language.trim().length > 0
            ? siteSettings.language.trim().toLowerCase()
            : 'en';

    if (language.includes('-')) {
        return language;
    }

    const countryIso = resolveCountryIsoCode(siteSettings || {});
    return countryIso ? `${language}-${countryIso}` : language;
};

const formatEmailDateTime = (dateInput, locale, siteSettings = null) => {
    const date = dateInput ? new Date(dateInput) : new Date();

    if (Number.isNaN(date.getTime())) {
        return typeof dateInput === 'string' && dateInput.trim().length > 0
            ? dateInput
            : new Date().toISOString();
    }

    const localizedLocale = resolveEmailLocale(locale, siteSettings);
    const formatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    try {
        return new Intl.DateTimeFormat(localizedLocale || UNIVERSAL_LOCALE_FALLBACK, formatOptions).format(date);
    } catch (_error) {
        try {
            return new Intl.DateTimeFormat(UNIVERSAL_LOCALE_FALLBACK, formatOptions).format(date);
        } catch (_fallbackError) {
            return date.toISOString();
        }
    }
};
let mailTransport = null;

// Function to reset mail transporter (useful when testing new configurations)
const resetMailTransporter = () => {
    mailTransport = null;
    transport = null;
    initialized = false;
};

// Cache settings for performance
const getEmailSettings = async () => {
    let emailSettings = {};

    try {
        const { adminSiteSettings, adminStoreSettings } = await getSettings();
        const siteSettings = adminSiteSettings;
        const storeSettings = adminStoreSettings;

        if (siteSettings) {
            const smtpPort = toInt(siteSettings.smtpPort, DEFAULT_SMTP_PORT);
            const smtpSecure =
                hasSettingValue(siteSettings, 'smtpSecure')
                    ? toBoolFromSetting(siteSettings, 'smtpSecure', false)
                    : smtpPort === 465;

            // Map database fields to email settings following admin system settings structure
            emailSettings = {
                // Email provider configuration (from adminSiteSettings)
                emailProvider: siteSettings.emailProvider || 'none',
                emailUser: siteSettings.emailUser || '',
                emailPass: siteSettings.emailPass || '',
                smtpHost: siteSettings.smtpHost || '',
                smtpPort,
                smtpSecure,
                smtpForceIpv4: toBoolFromSetting(siteSettings, 'smtpForceIpv4', false),

                // Site information (from adminSiteSettings)
                siteName: siteSettings.siteName || DEFAULT_APP_NAME,
                siteTitle: siteSettings.siteTitle || siteSettings.siteName || '',
                siteEmail: siteSettings.siteEmail || siteSettings.emailUser || '',
                sitePhone: siteSettings.sitePhone || '',
                siteUrl: siteSettings.baseUrl || DEFAULT_BASE_URL,
                businessAddress: siteSettings.businessAddress || '',
                country: siteSettings.country || '',
                language: siteSettings.language || 'en',
                siteLogo: siteSettings.siteLogo || '',
                // Email branding (from adminSiteSettings, with fallbacks)
                emailSenderName: siteSettings.siteName || DEFAULT_APP_NAME,
                emailSenderEmail: siteSettings.emailUser || DEFAULT_SENDER_EMAIL,
                emailSupportEmail:
                    siteSettings.siteEmail ||
                    siteSettings.emailUser ||
                    DEFAULT_SUPPORT_EMAIL,

                // Store/Business information (from adminStoreSettings with fallbacks to adminSiteSettings)
                businessName: storeSettings?.businessName || siteSettings.siteName || 'Store',
                companyName:
                    storeSettings?.businessName ||
                    siteSettings.siteName ||
                    DEFAULT_COMPANY_NAME,
                storeAddress: storeSettings?.address || siteSettings.businessAddress || '',
                tvaNumber: storeSettings?.tvaNumber || '',
                vatEnabled: storeSettings?.vatEnabled || false,
                vatPercentage: storeSettings?.vatPercentage || 0,
                vatIncludedInPrice: storeSettings?.vatIncludedInPrice || false,
                currency: storeSettings?.currency || 'EUR'
            };
        }
    } catch (error) {
        console.warn('Could not load email settings from database, falling back to defaults:', error.message);
    }

    return emailSettings;
};

const isRetryableSmtpError = (error) => {
    const errorCode = error?.code || '';
    const errorMessage = `${error?.message || ''}`.toLowerCase();

    return (
        RETRYABLE_SMTP_ERROR_CODES.includes(errorCode) ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('connection')
    );
};

const buildNodeMailerConfig = (settings, transportOptions = {}) => {
    const nodeMailerConfig = {
        auth: {
            user: settings.emailUser,
            pass: settings.emailPass
        },
        connectionTimeout: toInt(settings.smtpConnectionTimeout, DEFAULT_SMTP_CONNECTION_TIMEOUT),
        greetingTimeout: toInt(settings.smtpGreetingTimeout, DEFAULT_SMTP_GREETING_TIMEOUT),
        socketTimeout: toInt(settings.smtpSocketTimeout, DEFAULT_SMTP_SOCKET_TIMEOUT),
        dnsTimeout: toInt(settings.smtpDnsTimeout, DEFAULT_SMTP_DNS_TIMEOUT)
    };

    if (settings.emailProvider === 'custom' && settings.smtpHost) {
        const resolvedPort =
            typeof transportOptions.forcePort === 'number'
                ? transportOptions.forcePort
                : toInt(settings.smtpPort, DEFAULT_SMTP_PORT);

        const resolvedSecure =
            typeof transportOptions.forceSecure === 'boolean'
                ? transportOptions.forceSecure
                : toBoolFromSetting(settings, 'smtpSecure', resolvedPort === 465);

        nodeMailerConfig.host = settings.smtpHost;
        nodeMailerConfig.port = resolvedPort;
        nodeMailerConfig.secure = resolvedSecure;

        const shouldForceIpv4 =
            transportOptions.forceIpv4 === true || toBoolFromSetting(settings, 'smtpForceIpv4', false);

        if (shouldForceIpv4) {
            nodeMailerConfig.family = 4;
        }

        // Improve TLS negotiation robustness with some SMTP providers.
        nodeMailerConfig.tls = {
            servername: settings.smtpHost,
            minVersion: 'TLSv1.2'
        };
    } else {
        const serviceMap = {
            gmail: 'gmail',
            outlook: 'hotmail',
            yahoo: 'yahoo'
        };
        const service = serviceMap[settings.emailProvider] || 'gmail';
        nodeMailerConfig.service = service;
    }

    return nodeMailerConfig;
};

const getTransportRetryOptions = (settings) => {
    if (settings.emailProvider !== 'custom' || !settings.smtpHost) {
        return [{ forceIpv4: true }];
    }

    return [
        { forceIpv4: true },
        { forcePort: 465, forceSecure: true },
        { forcePort: 587, forceSecure: false, forceIpv4: true }
    ];
};

// Create mail transporter based on settings
const getMailTransporter = async (transportOptions = {}) => {
    if (!mailTransport || transportOptions.forceRefresh === true) {
        const settings = transportOptions.settings || (await getEmailSettings());

        // Check if email service is disabled
        if (settings.emailProvider === 'none' || !settings.emailProvider) {
            console.warn('Email service is disabled (provider: none)');
            return null;
        }

        // Validate required credentials
        if (!settings.emailUser || !settings.emailPass) {
            console.error('Email credentials missing:', {
                hasUser: !!settings.emailUser,
                hasPass: !!settings.emailPass
            });
            throw new Error('Email user and password are required');
        }

        const nodeMailerConfig = buildNodeMailerConfig(settings, transportOptions);

        try {
            mailTransport = nodemailer.createTransport(nodeMailerConfig);
        } catch (error) {
            console.error('Failed to create email transport:', error);
            throw error;
        }
    }
    return mailTransport;
};

// Dynamic getters for email config
const getEmailFrom = async () => {
    const settings = await getEmailSettings();
    return settings.emailUser;
};

const getEmailName = async () => {
    const settings = await getEmailSettings();
    return settings.siteName || 'App';
};

const getEmailPublic = async () => {
    const settings = await getEmailSettings();
    return settings.siteEmail || settings.emailUser;
};

// Helper function to add UTM parameters to URLs
const addUTMParameters = (url, campaignId, campaignType = 'email') => {
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('utm_source', 'newsletter');
        urlObj.searchParams.set('utm_medium', campaignType);
        urlObj.searchParams.set('utm_campaign', campaignId);
        return urlObj.toString();
    } catch (error) {
        // Invalid URL, return as-is
        return url;
    }
};

// Helper function to add tracking to all links in HTML content
const addTrackingToLinks = (html, campaignId, campaignType = 'email') => {
    if (!html || typeof html !== 'string') return html;

    // Add UTM parameters to all anchor tags
    return html.replace(/<a\s+([^>]*href=["']([^"']*)["'][^>]*)>/gi, (match, attrs, url) => {
        // Skip unsubscribe, preview, and mailto links
        if (url.includes('unsubscribe') || url.includes('preview') || url.startsWith('mailto:')) {
            return match;
        }

        const trackedUrl = addUTMParameters(url, campaignId, campaignType);
        return `<a ${attrs.replace(url, trackedUrl)}>`;
    });
};

// Legacy constants for backwards compatibility
const emailFrom = '';
const emailName = DEFAULT_APP_NAME;
const emailPublic = null;

// Internal state for email service
let initialized = false;
let fromEmail = emailFrom;
let fromName = emailName;
let transport = null;

// Initialize email service
const initEmailService = async () => {
    if (!initialized) {
        fromEmail = await getEmailFrom();
        fromName = await getEmailName();
        transport = await getMailTransporter();
        initialized = true;
    }
    return transport;
};

/**
 * Send email using Nodemailer
 * @param {string} to - Recipient email address (single email only)
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 * @param {Object} options - Additional email options (from, replyTo, senderName)
 * @returns {Promise} Nodemailer response
 */
export async function sendEmailViaNodemailer(to, subject, html, text, options = {}) {
    try {
        const settings = await getEmailSettings();
        const retryOptions = getTransportRetryOptions(settings);

        // Validate HTML is a string
        if (typeof html !== 'string') {
            throw new Error(`HTML content must be a string, received: ${typeof html}`);
        }

        if (!html || html.trim() === '') {
            throw new Error('HTML content cannot be empty');
        }

        // IMPORTANT: Ensure only single recipient to prevent email address exposure
        // If array is passed, throw error to prevent privacy leak
        if (Array.isArray(to)) {
            throw new Error(
                'sendEmailViaNodemailer accepts only a single recipient email address. To send to multiple recipients, call this function multiple times (once per recipient) to ensure privacy.'
            );
        }

        // Validate single email address
        if (!to || typeof to !== 'string' || !to.includes('@')) {
            throw new Error('Invalid recipient email address');
        }

        // Use custom sender info if provided, otherwise use defaults
        const emailFromAddr = options.from || fromEmail;
        const emailFromName = options.senderName || fromName;

        // PRIVACY PROTECTION: Ensure NO CC or BCC fields are ever set
        // Each email must be sent individually to protect recipient privacy
        const mailOptions = {
            from: `${emailFromName} <${emailFromAddr}>`,
            to: to, // Single recipient only - NEVER use arrays or comma-separated strings
            subject,
            html
        };

        // Add reply-to if provided (single address only)
        if (options.replyTo) {
            mailOptions.replyTo = options.replyTo;
        }

        // EXPLICITLY ensure no CC or BCC fields exist
        delete mailOptions.cc;
        delete mailOptions.bcc;

        // Only add text if it's a valid string
        if (typeof text === 'string' && text.trim() !== '') {
            mailOptions.text = text;
        }

        const sendAttempts = [{ forceRefresh: false }, ...retryOptions.map((item) => ({ ...item, forceRefresh: true }))];

        let lastError = null;

        for (let attemptIndex = 0; attemptIndex < sendAttempts.length; attemptIndex++) {
            const attemptConfig = sendAttempts[attemptIndex];

            try {
                if (!transport || attemptConfig.forceRefresh) {
                    if (attemptConfig.forceRefresh) {
                        resetMailTransporter();
                    }

                    transport = await getMailTransporter({
                        settings,
                        forceRefresh: attemptConfig.forceRefresh,
                        forceIpv4: attemptConfig.forceIpv4,
                        forcePort: attemptConfig.forcePort,
                        forceSecure: attemptConfig.forceSecure
                    });
                }

                if (!transport) {
                    if (settings.emailProvider === 'none' || !settings.emailProvider) {
                        console.warn('Email sending skipped: Email service is disabled');
                        return { accepted: [], rejected: [], response: 'Email service disabled' };
                    }

                    throw new Error('Nodemailer transport not initialized. Check your email settings (provider, credentials).');
                }

                const response = await transport.sendMail(mailOptions);
                return response;
            } catch (attemptError) {
                lastError = attemptError;

                const isRetryable = isRetryableSmtpError(attemptError);
                const isLastAttempt = attemptIndex === sendAttempts.length - 1;

                if (!isRetryable || isLastAttempt) {
                    throw attemptError;
                }

                console.warn(
                    `SMTP send attempt ${attemptIndex + 1} failed (${attemptError?.code || 'UNKNOWN'}). Retrying with fallback transport.`
                );
            }
        }

        throw lastError || new Error('Email send failed after retries');
    } catch (error) {
        console.error('Nodemailer send failed:', error);
        throw error;
    }
}

/**
 * Send a generic email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {React.Component} template - React email template
 * @param {Object} templateProps - Props to pass to the template
 * @param {Object} options - Additional email options (from, replyTo, senderName, locale)
 * @returns {Promise<Object>} Email service response {success: boolean, data?: any, error?: string}
 */
export async function sendEmail(to, subject, template, templateProps = {}, options = {}) {
    try {
        // Add locale to template props (default to site language, fallback to en)
        let locale = options.locale || templateProps.locale;

        if (!locale) {
            const { siteSettings } = await getSettings();
            locale = resolveEmailLocale(null, siteSettings);
        }

        locale = typeof locale === 'string' && locale.trim().length > 0 ? locale.trim() : 'en';

        const propsWithLocale = { ...templateProps, locale };

        // Create the React element first
        const reactElement = template(propsWithLocale);

        // Then render it to HTML string with error handling
        let html, text;
        try {
            html = await render(reactElement);
            text = await render(reactElement, { plainText: true });
        } catch (renderError) {
            console.error('React Email render failed:', renderError);
            console.error('Template props:', JSON.stringify(propsWithLocale, null, 2));
            throw new Error(`Email template render failed: ${renderError.message}`);
        }

        // Validate HTML output
        if (!html || typeof html !== 'string' || html.trim() === '') {
            throw new Error('Email template rendered empty HTML');
        }

        const response = await sendEmailViaNodemailer(to, subject, html, text, options);
        return { success: true, data: response };
    } catch (error) {
        return { success: false, error: error.message || 'Failed to send email' };
    }
}

/**
 * Send custom message to customer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} messageContent - HTML content of the message
 * @param {string} customerName - Customer's name
 * @param {string} locale - User's locale (default: 'en')
 * @returns {Promise<Object>} Email service response {success: boolean, data?: any, error?: string}
 */
export async function sendCustomerMessage(to, subject, messageContent, customerName = 'Customer', locale) {
    try {
        const { CustomerMessageTemplate } = await import('@/emails/CustomerMessageTemplate');
        const emailSettings = await getEmailSettings();
        const { siteSettings } = await getSettings();
        const resolvedLocale = resolveEmailLocale(locale, siteSettings);
        const t = await loadEmailTranslations(resolvedLocale);

        return await sendEmail(
            to,
            subject ||
                t.customerMessage?.subject?.replace('{companyName}', emailSettings.siteName) ||
                `Message from ${emailSettings.siteName}`,
            CustomerMessageTemplate,
            {
                customerName,
                messageContent,
                subject,
                companyName: emailSettings.siteName || emailSettings.companyName,
                companyLogo: emailSettings.siteLogo || '',
                companyUrl: emailSettings.siteUrl,
                supportEmail: emailSettings.emailSupportEmail || emailSettings.siteEmail,
                socialNetworks: siteSettings?.socialNetworks || [],
                locale: resolvedLocale
            },
            { locale: resolvedLocale }
        );
    } catch (error) {
        console.error('Failed to send customer message:', error);
        return { success: false, error: error.message || 'Failed to send message' };
    }
}

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} resetCode - 6-digit reset code
 * @param {string} userDisplayName - User's display name
 * @param {string} locale - User's locale (default: 'en')
 * @returns {Promise} Email service response
 */
export async function sendPasswordResetEmail(to, resetCode, userDisplayName = null, locale) {
    const { PasswordResetTemplate } = await import('@/emails/PasswordResetTemplate');
    const emailSettings = await getEmailSettings();
    const { siteSettings } = await getSettings();
    const resolvedLocale = resolveEmailLocale(locale, siteSettings);
    const t = await loadEmailTranslations(resolvedLocale);

    return sendEmail(
        to,
        t.passwordReset?.subject || 'Password Reset Code',
        PasswordResetTemplate,
        {
            resetCode,
            userDisplayName,
            companyName: emailSettings.siteName || emailSettings.companyName,
            companyLogo: emailSettings.siteLogo || '',
            companyUrl: emailSettings.siteUrl,
            supportEmail: emailSettings.emailSupportEmail || emailSettings.siteEmail,
            socialNetworks: siteSettings?.socialNetworks || [],
            locale: resolvedLocale
        },
        { locale: resolvedLocale }
    );
}

/**
 * Send welcome email
 * @param {string} to - Recipient email address
 * @param {string} userDisplayName - User's display name
 * @param {string} locale - User's locale (default: 'en')
 * @returns {Promise} Email service response
 */
export async function sendWelcomeEmail(to, userDisplayName, locale) {
    const { WelcomeTemplate } = await import('@/emails/WelcomeTemplate');
    const emailSettings = await getEmailSettings();
    const { siteSettings } = await getSettings();
    const resolvedLocale = resolveEmailLocale(locale, siteSettings);
    const t = await loadEmailTranslations(resolvedLocale);

    return sendEmail(
        to,
        t.welcome?.subject?.replace('{companyName}', emailSettings.siteName) || `Welcome to ${emailSettings.siteName}!`,
        WelcomeTemplate,
        {
            userDisplayName,
            companyName: emailSettings.siteName || emailSettings.companyName,
            companyLogo: emailSettings.siteLogo || '',
            companyUrl: emailSettings.siteUrl,
            supportEmail: emailSettings.emailSupportEmail || emailSettings.siteEmail,
            loginUrl: `${emailSettings.siteUrl}/auth/login`,
            socialNetworks: siteSettings?.socialNetworks || [],
            locale: resolvedLocale
        },
        { locale: resolvedLocale }
    );
}

/**
 * Send email verification
 * @param {string} to - Recipient email address
 * @param {string} verificationCode - Verification code
 * @param {string} userDisplayName - User's display name
 * @param {string} locale - User's locale (default: 'en')
 * @returns {Promise} Email service response
 */
export async function sendEmailVerification(to, verificationCode, userDisplayName = null, locale) {
    const { EmailVerificationTemplate } = await import('@/emails/EmailVerificationTemplate');
    const emailSettings = await getEmailSettings();
    const { siteSettings } = await getSettings();
    const resolvedLocale = resolveEmailLocale(locale, siteSettings);
    const t = await loadEmailTranslations(resolvedLocale);

    return sendEmail(
        to,
        t.emailVerification?.subject || 'Verify Your Email Address',
        EmailVerificationTemplate,
        {
            verificationCode,
            userDisplayName,
            companyName: emailSettings.siteName || emailSettings.companyName,
            companyLogo: emailSettings.siteLogo || '',
            companyUrl: emailSettings.siteUrl,
            supportEmail: emailSettings.emailSupportEmail || emailSettings.siteEmail,
            socialNetworks: siteSettings?.socialNetworks || [],
            locale: resolvedLocale
        },
        { locale: resolvedLocale }
    );
}

/**
 * Send order confirmation email (and automatically notify admin)
 * @param {Object} orderData - Order data object
 * @param {string} orderData.customerEmail - Customer's email address
 * @param {string} orderData.customerName - Customer's name
 * @param {string} orderData.orderId - Order ID
 * @param {string} orderData.orderDate - Order date
 * @param {Array} orderData.items - Array of order items
 * @param {string} orderData.subtotal - Subtotal amount
 * @param {string} orderData.shippingCost - Shipping cost
 * @param {string} orderData.discountAmount - Discount amount
 * @param {string} orderData.vatAmount - VAT amount
 * @param {number} orderData.vatPercentage - VAT rate percentage
 * @param {boolean} orderData.vatEnabled - Whether VAT is enabled
 * @param {boolean} orderData.vatIncluded - Whether VAT is included in price
 * @param {string} orderData.total - Total amount
 * @param {string} orderData.currency - Currency code
 * @param {Object} orderData.shippingAddress - Shipping address object
 * @param {string} orderData.paymentMethod - Payment method
 * @param {string} orderData.paymentStatus - Payment status
 * @param {Object} orderData.bankTransferDetails - Bank transfer details (optional)
 * @returns {Promise} Email service response (customer email response)
 */
export async function sendOrderConfirmationEmail(orderData, locale) {
    try {
        // Get full settings for logo, baseUrl, and email config
        const { siteSettings, storeSettings } = await getSettings();
        const emailSettings = await getEmailSettings();
        const resolvedLocale = resolveEmailLocale(locale, siteSettings);
        const t = await loadEmailTranslations(resolvedLocale);

        // Extract settings values
        const companyName = siteSettings?.siteName || 'Your Company';
        const companyLogo = siteSettings?.siteLogo || '';
        const baseUrl = siteSettings?.baseUrl || DEFAULT_BASE_URL;
        const supportEmail = siteSettings?.siteEmail || emailSettings.siteEmail || 'support@yourcompany.com';

        // Transform order data to match email template structure
        const customerEmail = orderData.customer?.email || orderData.cst_email || orderData.customerEmail;
        const customerName =
            orderData.customerName ||
            orderData.cst_name ||
            `${orderData.customer?.firstName || ''} ${orderData.customer?.lastName || ''}`.trim() ||
            'Customer';
        const orderId = orderData.id || orderData.orderId;
        const orderDate =
            orderData.orderDate ||
            formatEmailDateTime(orderData.createdAt || new Date(), resolvedLocale, siteSettings);

        // Use shipping_address if shippingAddress is not available
        const shippingAddress = orderData.shippingAddress || orderData.customer || {};

        const { OrderConfirmationTemplate } = await import('@/emails/OrderConfirmationTemplate');

        const encodedOrderId = Buffer.from(orderData.id).toString('base64');

        // Send customer confirmation email
        const customerEmailResponse = await sendEmail(
            customerEmail,
            t.orderConfirmation?.subject?.replace('{orderId}', orderId) || `Order Confirmation #${orderId}`,
            OrderConfirmationTemplate,
            {
                customerName,
                orderId,
                orderDate,
                items: orderData.items || [],
                subtotal: orderData.subtotal || '0.00',
                shippingCost: orderData.shippingCost || '0.00',
                discountAmount: orderData.discountAmount || '0.00',
                vatAmount: orderData.vatAmount || '0.00',
                vatPercentage: orderData.vatPercentage || 0,
                vatEnabled: orderData.vatEnabled || false,
                vatIncluded: orderData.vatIncluded || false,
                total: orderData.finalTotal || orderData.total || '0.00',
                currency: orderData.currency || 'EUR',
                shippingAddress: shippingAddress,
                paymentMethod: orderData.paymentMethod || '',
                paymentStatus: orderData.paymentStatus || 'pending',
                paymentReference: orderData.eupagoReference || '',
                paymentEntity: orderData.eupagoEntity || '',
                bankTransferDetails: orderData.bankTransferDetails || null,
                deliveryNotes: orderData.deliveryNotes || '',
                status: orderData.status || 'pending',
                companyName: companyName,
                companyLogo: companyLogo,
                companyUrl: baseUrl,
                supportEmail: supportEmail,
                socialNetworks: siteSettings?.socialNetworks || [],
                orderSummaryUrl: `${baseUrl}/track?id=${encodedOrderId}`,
                locale: resolvedLocale
            },
            { locale: resolvedLocale }
        );

        return customerEmailResponse;
    } catch (error) {
        console.error('Failed to send order confirmation email:', error);
        throw error;
    }
}

/**
 * Send admin notification asynchronously (internal method)
 * @param {Object} orderData - Order data object
 */
export async function sendAdminNotificationAsync(orderData) {
    try {
        // Get admin email from environment variables
        if (!emailPublic) {
            console.warn('Admin email not configured - skipping admin notification for order', orderData.id || orderData.orderId);
            return;
        }

        await sendOrderAdminConfirmationEmail(orderData);
    } catch (error) {
        console.error('Failed to send admin notification:', error);
        throw error;
    }
}

/**
 * Send order admin confirmation email
 * @param {Object} orderData - Order data object
 * @param {string} orderData.customerEmail - Customer's email
 * @param {string} orderData.customerName - Customer's name
 * @param {string} orderData.orderId - Order ID
 * @param {string} orderData.orderDate - Order date
 * @param {Array} orderData.items - Array of order items
 * @param {string} orderData.subtotal - Subtotal amount
 * @param {string} orderData.shippingCost - Shipping cost
 * @param {string} orderData.discountAmount - Discount amount (optional)
 * @param {string} orderData.vatAmount - VAT amount (optional)
 * @param {string} orderData.total - Total amount
 * @param {Object} orderData.shippingAddress - Shipping address object
 * @param {string} locale - User's locale (default: 'en')
 * @returns {Promise} Email service response
 */
export async function sendOrderAdminConfirmationEmail(orderData, locale) {
    try {
        // Get full settings for logo, baseUrl, and email config (same pattern as sendOrderConfirmationEmail)
        const { siteSettings, storeSettings } = await getSettings();
        const emailSettings = await getEmailSettings();
        const resolvedLocale = resolveEmailLocale(locale, siteSettings);
        const t = await loadEmailTranslations(resolvedLocale);

        // Get admin email from settings or environment variable
        const adminEmail = siteSettings?.siteEmail || emailSettings.siteEmail || emailPublic;
        
        if (!adminEmail) {
            console.warn('Admin email not configured - skipping admin notification for order', orderData.id || orderData.orderId);
            return { success: false, error: 'Admin email not configured' };
        }

        // Extract settings values
        const companyName = siteSettings?.siteName || 'Your Company';
        const companyLogo = siteSettings?.siteLogo || '';
        const baseUrl = siteSettings?.baseUrl || DEFAULT_BASE_URL;
        const supportEmail = siteSettings?.siteEmail || emailSettings.siteEmail || 'support@yourcompany.com';
        const currency = storeSettings?.currency || 'EUR';

        // Transform order data to match email template structure
        const customerEmail = orderData.customer?.email || orderData.cst_email || orderData.customerEmail;
        const customerName =
            orderData.customerName ||
            orderData.cst_name ||
            `${orderData.customer?.firstName || ''} ${orderData.customer?.lastName || ''}`.trim() ||
            'Customer';
        const orderId = orderData.id || orderData.orderId;
        const orderDate =
            orderData.orderDate ||
            formatEmailDateTime(orderData.createdAt || new Date(), resolvedLocale, siteSettings);

        // Use shipping_address if shippingAddress is not available
        const shippingAddress = orderData.shippingAddress || orderData.customer || {};

        const { OrderAdminConfirmationTemplate } = await import('@/emails/OrderAdminConfirmationTemplate');

        // Send admin notification email
        const adminEmailResponse = await sendEmail(
            adminEmail,
            t.orderAdminConfirmation?.subject?.replace('{orderId}', orderId) || 
                `🔔 New Order #${orderId} - ${customerName} - ${parseFloat(orderData.finalTotal || orderData.total || 0).toFixed(2)} ${currency}`,
            OrderAdminConfirmationTemplate,
            {
                customerEmail,
                customerName,
                orderId,
                orderDate,
                items: orderData.items || [],
                subtotal: orderData.subtotal || '0.00',
                shippingCost: orderData.shippingCost || '0.00',
                discountAmount: orderData.discountAmount || '0.00',
                vatAmount: orderData.vatAmount || '0.00',
                total: orderData.finalTotal || orderData.total || '0.00',
                currency: currency,
                shippingAddress: shippingAddress,
                companyName: companyName,
                companyLogo: companyLogo,
                companyUrl: baseUrl,
                supportEmail: supportEmail,
                socialNetworks: siteSettings?.socialNetworks || [],
                orderSummaryUrl: `${baseUrl}/admin/store/orders?id=${orderId}`,
                locale: resolvedLocale
            },
            { locale: resolvedLocale }
        );

        return adminEmailResponse;
    } catch (error) {
        console.error('Failed to send admin confirmation email:', error);
        return { success: false, error: error.message || 'Failed to send admin email' };
    }
}

/**
 * Send order update email to customer
 * @param {string} to - Customer email address
 * @param {Object} updateData - Order update data object
 * @param {string} updateData.customerName - Customer's name
 * @param {string} updateData.orderId - Order ID
 * @param {string} updateData.orderDate - Original order date
 * @param {string} updateData.status - Order status (pending, processing, delivered, complete, cancelled)
 * @param {Object} updateData.shippingAddress - Shipping address object
 * @param {Array} updateData.items - Array of order items
 * @param {number} updateData.subtotal - Subtotal amount
 * @param {number} updateData.shippingCost - Shipping cost
 * @param {number} updateData.discountAmount - Discount amount
 * @param {boolean} updateData.vatEnabled - Whether VAT is enabled
 * @param {number} updateData.vatPercentage - VAT rate percentage
 * @param {number} updateData.vatAmount - VAT amount
 * @param {boolean} updateData.vatIncluded - Whether VAT is included in price
 * @param {number} updateData.total - Total amount
 * @param {string} updateData.currency - Currency code
 * @param {string} updateData.paymentMethod - Payment method
 * @param {string} updateData.paymentStatus - Payment status
 * @param {string} [updateData.trackingNumber] - Tracking number (optional)
 * @param {string} [updateData.trackingUrl] - Tracking URL (optional)
 * @param {string} [updateData.estimatedDelivery] - Estimated delivery date (optional)
 * @param {string} [updateData.deliveryNotes] - Delivery notes (optional)
 * @param {string} [updateData.customMessage] - Custom message from admin (optional)
 * @param {string} locale - User's locale (default: 'en')
 * @returns {Promise} Email service response
 */
export async function sendOrderUpdateEmail(
    to,
    {
        customerName,
        orderId,
        orderDate,
        status,
        shippingAddress = {},
        items = [],
        subtotal = 0,
        shippingCost = 0,
        discountAmount = 0,
        vatEnabled = false,
        vatPercentage = 0,
        vatAmount = 0,
        vatIncluded = false,
        total = 0,
        currency = 'EUR',
        paymentMethod = null,
        paymentStatus = 'pending',
        trackingNumber = null,
        trackingUrl = null,
        estimatedDelivery = null,
        deliveryNotes = null,
        customMessage = null
    },
    locale
) {
    try {
        // Get full settings for logo, baseUrl, and email config (same pattern as sendOrderConfirmationEmail)
        const { siteSettings, storeSettings } = await getSettings();
        const emailSettings = await getEmailSettings();
        const resolvedLocale = resolveEmailLocale(locale, siteSettings);
        const t = await loadEmailTranslations(resolvedLocale);
        const localizedOrderDate = formatEmailDateTime(orderDate || new Date(), resolvedLocale, siteSettings);

        // Extract settings values
        const companyName = siteSettings?.siteName || 'Your Company';
        const companyLogo = siteSettings?.siteLogo || '';
        const baseUrl = siteSettings?.baseUrl || DEFAULT_BASE_URL;
        const supportEmail = siteSettings?.siteEmail || emailSettings.siteEmail || 'support@yourcompany.com';

        // Validate status
        const validStatuses = ['pending', 'processing', 'delivered', 'complete', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid order status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
        }

        // Use translations for subject lines (matching Email.json structure)
        const getSubjectFromTranslations = (status, orderId, t) => {
            const statusSubject = t.orderUpdate?.subject?.[status];
            const defaultSubject = t.orderUpdate?.subject?.default;

            if (statusSubject) {
                return statusSubject.replace('{orderId}', orderId);
            } else if (defaultSubject) {
                return defaultSubject.replace('{orderId}', orderId);
            }

            // Fallback to English if translations are missing
            const fallbackMap = {
                pending: `Order Pending #${orderId}`,
                processing: `Order Processing #${orderId}`,
                delivered: `Order Delivered #${orderId}`,
                complete: `Order Complete #${orderId}`,
                cancelled: `Order Cancelled #${orderId}`
            };
            return fallbackMap[status] || `Order Update #${orderId}`;
        };

        const subject = getSubjectFromTranslations(status, orderId, t);

        const { OrderUpdateTemplate } = await import('@/emails/OrderUpdateTemplate');

        const emailResponse = await sendEmail(
            to,
            subject,
            OrderUpdateTemplate,
            {
                customerName,
                orderId,
                orderDate: localizedOrderDate,
                status,
                shippingAddress,
                items: items || [],
                subtotal: parseFloat(subtotal) || 0,
                shippingCost: parseFloat(shippingCost) || 0,
                discountAmount: parseFloat(discountAmount) || 0,
                vatEnabled: vatEnabled || false,
                vatPercentage: parseFloat(vatPercentage) || 0,
                vatAmount: parseFloat(vatAmount) || 0,
                vatIncluded: vatIncluded || false,
                total: parseFloat(total) || 0,
                currency: currency || storeSettings?.currency || 'EUR',
                paymentMethod,
                paymentStatus,
                trackingNumber,
                trackingUrl,
                estimatedDelivery,
                deliveryNotes,
                customMessage,
                companyName: companyName,
                companyLogo: companyLogo,
                companyUrl: baseUrl,
                supportEmail: supportEmail,
                socialNetworks: siteSettings?.socialNetworks || [],
                orderSummaryUrl: `${baseUrl}/track?id=${orderId}`,
                locale: resolvedLocale
            },
            { locale: resolvedLocale }
        );

        return emailResponse;
    } catch (error) {
        console.error(`Failed to send order update email for order ${orderId}:`, error);
        throw error;
    }
}

/**
 * Send order status update email (wrapper function for compatibility)
 * @param {Object} orderData - Order data object
 * @param {string} locale - User's locale (optional, falls back to siteSettings.language)
 * @returns {Promise<Object>} Email send result
 */
export async function sendOrderStatusUpdateEmail(orderData, locale) {
    try {
        const { OrderStatusUpdateTemplate } = await import('@/emails/OrderStatusUpdateTemplate');
        const emailSettings = await getEmailSettings();
        const { siteSettings } = await getSettings();
        const resolvedLocale = resolveEmailLocale(locale || orderData.locale, siteSettings);
        const encodedOrderId = Buffer.from(orderData.orderId || orderData.id).toString('base64');
        await sendEmail(
            orderData.email || orderData.customer?.email,
            `Order Status Update - ${orderData.orderId}`,
            OrderStatusUpdateTemplate,
            {
                customerName: orderData.customerName || orderData.customer?.firstName || 'Customer',
                orderId: orderData.orderId || orderData.id,
                orderDate: formatEmailDateTime(
                    orderData.createdAt || orderData.orderDate || new Date(),
                    resolvedLocale,
                    siteSettings
                ),
                status: orderData.status || 'pending',
                shippingAddress: orderData.shippingAddress || orderData.shipping_address || {},
                items: orderData.items || [],
                subtotal: parseFloat(orderData.subtotal || 0),
                shippingCost: parseFloat(orderData.shippingCost || 0),
                discountAmount: parseFloat(orderData.discountAmount || 0),
                vatEnabled: orderData.vatEnabled || false,
                vatPercentage: parseFloat(orderData.vatPercentage || 0),
                vatAmount: parseFloat(orderData.vatAmount || 0),
                vatIncluded: orderData.vatIncluded || false,
                total: parseFloat(orderData.total || 0),
                currency: orderData.currency || 'EUR',
                paymentMethod: orderData.paymentMethod || null,
                paymentStatus: orderData.paymentStatus || 'pending',
                trackingNumber: orderData.trackingNumber || null,
                estimatedDelivery: orderData.estimatedDelivery || null,
                deliveryNotes: orderData.deliveryNotes || null,
                companyName: emailSettings.siteName || emailSettings.companyName,
                companyLogo: emailSettings.siteLogo || '',
                companyUrl: emailSettings.siteUrl,
                supportEmail: emailSettings.emailSupportEmail || emailSettings.siteEmail,
                orderSummaryUrl: `${emailSettings.siteUrl}/track?id=${encodedOrderId}`,
                locale: resolvedLocale
            },
            { locale: resolvedLocale }
        );

        return { success: true };
    } catch (error) {
        console.error('Error sending order status update email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send newsletter campaign to multiple subscribers
 * IMPORTANT: Sends individual emails to each recipient to protect privacy.
 * Each recipient will only see their own email address (not other recipients).
 * @param {Object} campaign - Campaign data object
 * @param {Array} subscribers - Array of subscriber objects
 * @param {Array} manualRecipients - Array of manual recipient objects (optional)
 * @returns {Promise<Object>} Email send result with counts
 */
export async function sendNewsletterCampaign(campaign, subscribers, manualRecipients = []) {
    try {
        const emailSettings = await getEmailSettings();
        const { siteSettings } = await getSettings();
        const siteName = await getEmailName();
        const siteUrl = siteSettings?.baseUrl || DEFAULT_BASE_URL;

        // Import functions for generating preview and unsubscribe links
        const { generatePreviewLink, generateUnsubscribeLink } = await import('@/lib/server/newsletter');

        // Generate preview link for campaign (base64 encoded)
        const previewLink = await generatePreviewLink(campaign.id, siteUrl);

        let sent = 0;
        let failed = 0;
        const errors = [];

        // Combine subscribers and manual recipients
        const allRecipients = [
            ...subscribers.map((s) => ({ email: s.email, name: s.name })),
            ...manualRecipients.map((r) => ({ email: r.email, name: r.name || 'Subscriber' }))
        ];

        // Extract ML content - support both string and object formats
        const getMLContent = (content, locale) => {
            if (typeof content === 'object' && content !== null) {
                // ML object: { en: "...", es: "...", pt: "..." }
                const defaultLang = campaign.locale || emailSettings.language || 'en';
                return content[locale] || content[defaultLang] || content[Object.keys(content)[0]] || '';
            }
            // Legacy: string content
            return content || '';
        };

        const campaignLocale = campaign.locale || emailSettings.language || 'en';
        const campaignSubject = getMLContent(campaign.subject, campaignLocale);
        const campaignContent = getMLContent(campaign.content, campaignLocale);
        const campaignPreview = getMLContent(campaign.previewText, campaignLocale) || campaignSubject;

        // Check if campaign has raw HTML content
        // or needs React Email rendering (from NewsletterTemplate component)
        const hasRawHtmlContent =
            campaignContent && typeof campaignContent === 'string' && campaignContent.trim().startsWith('<');

        // IMPORTANT: Send individual emails to each recipient (one by one)
        // This ensures privacy - each recipient only sees their own email address
        // No CC, BCC, or multiple "To" addresses are used

        for (const recipient of allRecipients) {
            try {
                // PRIVACY: Send individual email to this recipient only
                // Each call sends ONE email with ONE recipient in the "To" field

                // Generate unsubscribe link for this recipient (base64 encoded)
                const unsubscribeLink = await generateUnsubscribeLink(recipient.email, 'email', siteUrl);

                if (hasRawHtmlContent) {
                    // Campaign has raw HTML content
                    // Send directly without React Email rendering
                    // Inject preview and unsubscribe links into HTML content
                    let html = campaignContent;

                    // Add UTM tracking to all links
                    html = addTrackingToLinks(html, campaign.id, 'email');

                    // Add preview link at the top if not already present
                    if (!html.includes('preview?id=') && !html.includes('Ver no navegador')) {
                        const previewHtml = `<div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
                            Problemas para visualizar? <a href="${previewLink}" style="color: #3b82f6;">Ver no navegador</a>
                        </div>`;
                        html = previewHtml + html;
                    }

                    // Add unsubscribe link at the bottom if not already present
                    if (!html.includes('unsubscribe?id=') && !html.includes('Cancelar subscrição')) {
                        const unsubscribeHtml = `<div style="text-align: center; padding: 10px; font-size: 12px; color: #999;">
                            <a href="${unsubscribeLink}" style="color: #666;">Cancelar subscrição</a>
                        </div>`;
                        html = html + unsubscribeHtml;
                    }

                    const text = html.replace(/<[^>]*>/g, ''); // Strip HTML for plain text

                    await sendEmailViaNodemailer(recipient.email, campaignSubject || 'Newsletter Update', html, text, {
                        from: emailSettings.emailUser,
                        senderName: emailSettings.siteName || siteName
                    });

                    // Record campaign sent event
                    await recordCampaignEvent({
                        campaignId: campaign.id,
                        campaignType: 'email',
                        eventType: 'sent',
                        recipient: recipient.email,
                        metadata: { recipientName: recipient.name }
                    });
                } else {
                    // Campaign uses NewsletterTemplate component (React Email)
                    const { NewsletterTemplate } = await import('@/emails/NewsletterTemplate.jsx');

                    await sendEmail(
                        recipient.email, // Single recipient email - NEVER an array
                        campaignSubject || 'Newsletter Update',
                        NewsletterTemplate,
                        {
                            subject: campaignSubject,
                            content: addTrackingToLinks(campaignContent, campaign.id, 'email'),
                            previewText: campaignPreview,
                            subscriberName: recipient.name,
                            companyName: emailSettings.siteName || siteName,
                            companyLogo: emailSettings.siteLogo || '',
                            companyUrl: emailSettings.siteUrl,
                            senderName: emailSettings.siteName || siteName,
                            senderEmail: emailSettings.emailUser,
                            supportEmail: emailSettings.siteEmail || emailSettings.emailUser,
                            socialNetworks: siteSettings?.socialNetworks || [],
                            unsubscribeUrl: unsubscribeLink,
                            webVersionUrl: previewLink,
                            locale: campaignLocale
                        },
                        {
                            from: emailSettings.emailUser,
                            replyTo: emailSettings.siteEmail || emailSettings.emailUser,
                            senderName: emailSettings.siteName || siteName,
                            locale: campaignLocale
                        }
                    );

                    // Record campaign sent event
                    await recordCampaignEvent({
                        campaignId: campaign.id,
                        campaignType: 'email',
                        eventType: 'sent',
                        recipient: recipient.email,
                        metadata: { recipientName: recipient.name }
                    });
                }
                sent++;
            } catch (emailError) {
                console.error(`Failed to send to ${recipient.email}:`, emailError);
                failed++;
                errors.push({ email: recipient.email, error: emailError.message });

                // Record campaign failed event
                await recordCampaignEvent({
                    campaignId: campaign.id,
                    campaignType: 'email',
                    eventType: 'failed',
                    recipient: recipient.email,
                    metadata: { error: emailError.message }
                }).catch((err) => console.error('Failed to record campaign event:', err));
            }
        }

        console.log(`[Newsletter Campaign] Completed: ${sent} sent, ${failed} failed`);

        return {
            success: true,
            data: {
                sent,
                failed,
                total: allRecipients.length,
                errors: failed > 0 ? errors : undefined
            }
        };
    } catch (error) {
        console.error('Error sending newsletter campaign:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send test newsletter email
 * @param {Object} campaign - Campaign data object
 * @param {string} testEmail - Test recipient email
 * @param {string} testName - Test recipient name (optional)
 * @returns {Promise<Object>} Email send result
 */
export async function sendNewsletterTestEmail(campaign, testEmail, testName = 'Test User') {
    try {
        const emailSettings = await getEmailSettings();
        const { siteSettings } = await getSettings();
        const siteName = emailSettings.siteName || emailSettings.companyName;
        const siteUrl = siteSettings?.baseUrl || DEFAULT_BASE_URL;

        // Import functions for generating preview and unsubscribe links
        const { generatePreviewLink, generateUnsubscribeLink } = await import('@/lib/server/newsletter');

        // Generate preview and unsubscribe links (base64 encoded)
        const previewLink = await generatePreviewLink(campaign.id, siteUrl);
        const unsubscribeLink = await generateUnsubscribeLink(testEmail, 'email', siteUrl);

        // Extract ML content - support both string and object formats
        const getMLContent = (content, locale) => {
            if (typeof content === 'object' && content !== null) {
                // ML object: { en: "...", es: "...", pt: "..." }
                const defaultLang = campaign.locale || emailSettings.language || 'en';
                return content[locale] || content[defaultLang] || content[Object.keys(content)[0]] || '';
            }
            // Legacy: string content
            return content || '';
        };

        const campaignLocale = campaign.locale || emailSettings.language || 'en';
        const campaignSubject = getMLContent(campaign.subject, campaignLocale);
        const campaignContent = getMLContent(campaign.content, campaignLocale);
        const campaignPreview = getMLContent(campaign.previewText, campaignLocale) || campaignSubject;

        // Check if campaign has raw HTML content
        const hasRawHtmlContent =
            campaignContent && typeof campaignContent === 'string' && campaignContent.trim().startsWith('<');

        if (hasRawHtmlContent) {
            // Campaign has raw HTML content - send directly
            // Inject preview and unsubscribe links into HTML content
            let html = campaignContent;

            // Add preview link at the top if not already present
            if (!html.includes('preview?id=') && !html.includes('Ver no navegador')) {
                const previewHtml = `<div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
                    Problemas para visualizar? <a href="${previewLink}" style="color: #3b82f6;">Ver no navegador</a>
                </div>`;
                html = previewHtml + html;
            }

            // Add unsubscribe link at the bottom if not already present
            if (!html.includes('unsubscribe?id=') && !html.includes('Cancelar subscrição')) {
                const unsubscribeHtml = `<div style="text-align: center; padding: 10px; font-size: 12px; color: #999;">
                    <a href="${unsubscribeLink}" style="color: #666;">Cancelar subscrição</a>
                </div>`;
                html = html + unsubscribeHtml;
            }

            const text = html.replace(/<[^>]*>/g, ''); // Strip HTML for plain text

            await sendEmailViaNodemailer(testEmail, `[TEST] ${campaignSubject || 'Newsletter Update'}`, html, text, {
                from: emailSettings.emailUser,
                senderName: siteName
            });
        } else {
            // Campaign uses NewsletterTemplate component (React Email)
            const { NewsletterTemplate } = await import('@/emails/NewsletterTemplate.jsx');

            await sendEmail(
                testEmail,
                `[TEST] ${campaignSubject || 'Newsletter Update'}`,
                NewsletterTemplate,
                {
                    subject: campaignSubject,
                    content: campaignContent,
                    previewText: campaignPreview,
                    subscriberName: testName,
                    companyName: siteName,
                    companyLogo: emailSettings.siteLogo || '',
                    companyUrl: emailSettings.siteUrl,
                    senderName: siteName,
                    senderEmail: emailSettings.emailUser,
                    supportEmail: emailSettings.siteEmail || emailSettings.emailUser,
                    socialNetworks: siteSettings?.socialNetworks || [],
                    unsubscribeUrl: unsubscribeLink,
                    webVersionUrl: previewLink,
                    locale: campaignLocale
                },
                {
                    from: emailSettings.emailUser,
                    replyTo: emailSettings.siteEmail || emailSettings.emailUser,
                    senderName: siteName,
                    locale: campaignLocale
                }
            );
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending test newsletter email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Test email connection and send test email
 * @param {string} testEmail - Email address to send test to
 * @returns {Promise<Object>} Test result
 */
export async function sendTestEmail(testEmail) {
    try {
        // IMPORTANT: Clear cache to use current settings from database
        resetMailTransporter();

        const emailSettings = await getEmailSettings();
        const siteName = await getEmailName();

        // Check if email service is configured
        if (emailSettings.emailProvider === 'none' || !emailSettings.emailProvider) {
            return {
                success: false,
                error: 'Email service is disabled',
                details: 'Please configure an email provider in System Settings > Email tab'
            };
        }

        if (!emailSettings.emailUser || !emailSettings.emailPass) {
            return {
                success: false,
                error: 'Email credentials not configured',
                details: 'Please provide email username and password in System Settings > Email tab'
            };
        }

        // For custom SMTP, validate required fields
        if (emailSettings.emailProvider === 'custom') {
            if (!emailSettings.smtpHost) {
                return {
                    success: false,
                    error: 'SMTP configuration incomplete',
                    details: 'Please provide SMTP host in System Settings > Email tab'
                };
            }
        }

        // Test the connection first (cache already cleared above)
        const connectionTest = await testConnection(false);

        if (!connectionTest.success) {
            return {
                success: false,
                error: 'Email connection test failed',
                details:
                    connectionTest.error ||
                    'Could not connect to email server. Please verify your credentials and settings.'
            };
        }

        // Send test email with inline HTML
        const testHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .success { background-color: #10B981; color: white; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; }
        .info { background-color: #EFF6FF; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3B82F6; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6B7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✉️ Test Email from ${siteName}</h1>
        </div>
        <div class="content">
            <div class="success">
                <h2 style="margin: 0;">✅ Email Configuration Success!</h2>
            </div>
            <p>Congratulations! Your email service is properly configured and working.</p>
            <div class="info">
                <strong>Test Details:</strong>
                <ul style="margin: 10px 0;">
                    <li>Sent from: ${siteName}</li>
                    <li>Test time: ${new Date().toLocaleString()}</li>
                    <li>Recipient: ${testEmail}</li>
                    <li>Provider: ${emailSettings.emailProvider || 'Unknown'}</li>
                </ul>
            </div>
            <p>You can now send emails from your application including:</p>
            <ul>
                <li>Order confirmations</li>
                <li>Password reset emails</li>
                <li>User account notifications</li>
                <li>Newsletter campaigns</li>
            </ul>
        </div>
        <div class="footer">
            <p>This is an automated test email from ${siteName}</p>
        </div>
    </div>
</body>
</html>`;

        await sendEmailViaNodemailer(
            testEmail,
            `Test Email from ${siteName}`,
            testHtml,
            `Test Email - ${new Date().toLocaleString()}`
        );

        return {
            success: true,
            message: 'Test email sent successfully! Please check your inbox.',
            details: {
                provider: emailSettings.emailProvider,
                from: emailSettings.emailUser,
                to: testEmail,
                host: emailSettings.emailProvider === 'custom' ? emailSettings.smtpHost : 'Service',
                port: emailSettings.emailProvider === 'custom' ? emailSettings.smtpPort : 'Default'
            }
        };
    } catch (error) {
        console.error('Error sending test email:', error);
        
        // Provide more detailed error information
        let errorDetails = error.message || 'An unexpected error occurred';
        
        // Add helpful hints based on error type
        if (error.message?.includes('EAUTH')) {
            errorDetails += ' - Invalid credentials. Please check your email username and password.';
        } else if (error.message?.includes('ECONNECTION') || error.message?.includes('ETIMEDOUT')) {
            errorDetails += ' - Connection failed. Please check your SMTP host, port, and firewall settings.';
        } else if (error.message?.includes('ENOTFOUND')) {
            errorDetails += ' - SMTP host not found. Please verify the SMTP host address.';
        }

        return {
            success: false,
            error: 'Failed to send test email',
            details: errorDetails
        };
    }
}

/**
 * Convenience methods for specific status updates
 */

/**
 * Send order confirmed email
 * @param {string} to - Customer email address
 * @param {Object} orderData - Order data
 * @returns {Promise} Email service response
 */
export async function sendOrderConfirmedEmail(to, orderData) {
    return sendOrderUpdateEmail(to, {
        customerName: orderData.customerName || orderData.customer?.firstName || 'Customer',
        orderId: orderData.orderId || orderData.id,
        orderDate: orderData.orderDate || orderData.createdAt || new Date().toISOString(),
        status: 'confirmed',
        shippingAddress: orderData.shippingAddress || orderData.shipping_address || {},
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        shippingCost: orderData.shippingCost || 0,
        discountAmount: orderData.discountAmount || 0,
        vatEnabled: orderData.vatEnabled || false,
        vatPercentage: orderData.vatPercentage || 0,
        vatAmount: orderData.vatAmount || 0,
        vatIncluded: orderData.vatIncluded || false,
        total: orderData.total || 0,
        currency: orderData.currency || 'EUR',
        paymentMethod: orderData.paymentMethod || null,
        paymentStatus: orderData.paymentStatus || 'pending',
        trackingNumber: orderData.trackingNumber || null,
        trackingUrl: orderData.trackingUrl || null,
        estimatedDelivery: orderData.estimatedDelivery || null,
        deliveryNotes: orderData.deliveryNotes || null,
        customMessage: orderData.customMessage || null
    });
}

/**
 * Send order processing email
 * @param {string} to - Customer email address
 * @param {Object} orderData - Order data
 * @returns {Promise} Email service response
 */
export async function sendOrderProcessingEmail(to, orderData) {
    return sendOrderUpdateEmail(to, {
        customerName: orderData.customerName || orderData.customer?.firstName || 'Customer',
        orderId: orderData.orderId || orderData.id,
        orderDate: orderData.orderDate || orderData.createdAt || new Date().toISOString(),
        status: 'processing',
        shippingAddress: orderData.shippingAddress || orderData.shipping_address || {},
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        shippingCost: orderData.shippingCost || 0,
        discountAmount: orderData.discountAmount || 0,
        vatEnabled: orderData.vatEnabled || false,
        vatPercentage: orderData.vatPercentage || 0,
        vatAmount: orderData.vatAmount || 0,
        vatIncluded: orderData.vatIncluded || false,
        total: orderData.total || 0,
        currency: orderData.currency || 'EUR',
        paymentMethod: orderData.paymentMethod || null,
        paymentStatus: orderData.paymentStatus || 'pending',
        trackingNumber: orderData.trackingNumber || null,
        trackingUrl: orderData.trackingUrl || null,
        estimatedDelivery: orderData.estimatedDelivery || null,
        deliveryNotes: orderData.deliveryNotes || null,
        customMessage: orderData.customMessage || null
    });
}

/**
 * Send order delivered email
 * @param {string} to - Customer email address
 * @param {Object} orderData - Order data (should include trackingNumber and trackingUrl)
 * @returns {Promise} Email service response
 */
export async function sendOrderDeliveredEmail(to, orderData) {
    return sendOrderUpdateEmail(to, {
        customerName: orderData.customerName || orderData.customer?.firstName || 'Customer',
        orderId: orderData.orderId || orderData.id,
        orderDate: orderData.orderDate || orderData.createdAt || new Date().toISOString(),
        status: 'delivered',
        shippingAddress: orderData.shippingAddress || orderData.shipping_address || {},
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        shippingCost: orderData.shippingCost || 0,
        discountAmount: orderData.discountAmount || 0,
        vatEnabled: orderData.vatEnabled || false,
        vatPercentage: orderData.vatPercentage || 0,
        vatAmount: orderData.vatAmount || 0,
        vatIncluded: orderData.vatIncluded || false,
        total: orderData.total || 0,
        currency: orderData.currency || 'EUR',
        paymentMethod: orderData.paymentMethod || null,
        paymentStatus: orderData.paymentStatus || 'pending',
        trackingNumber: orderData.trackingNumber || null,
        trackingUrl: orderData.trackingUrl || null,
        estimatedDelivery: orderData.estimatedDelivery || null,
        deliveryNotes: orderData.deliveryNotes || null,
        customMessage: orderData.customMessage || null
    });
}

/**
 * Send order cancelled email
 * @param {string} to - Customer email address
 * @param {Object} orderData - Order data
 * @returns {Promise} Email service response
 */
export async function sendOrderCancelledEmail(to, orderData) {
    return sendOrderUpdateEmail(to, {
        customerName: orderData.customerName || orderData.customer?.firstName || 'Customer',
        orderId: orderData.orderId || orderData.id,
        orderDate: orderData.orderDate || orderData.createdAt || new Date().toISOString(),
        status: 'cancelled',
        shippingAddress: orderData.shippingAddress || orderData.shipping_address || {},
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        shippingCost: orderData.shippingCost || 0,
        discountAmount: orderData.discountAmount || 0,
        vatEnabled: orderData.vatEnabled || false,
        vatPercentage: orderData.vatPercentage || 0,
        vatAmount: orderData.vatAmount || 0,
        vatIncluded: orderData.vatIncluded || false,
        total: orderData.total || 0,
        currency: orderData.currency || 'EUR',
        paymentMethod: orderData.paymentMethod || null,
        paymentStatus: orderData.paymentStatus || 'pending',
        trackingNumber: orderData.trackingNumber || null,
        trackingUrl: orderData.trackingUrl || null,
        estimatedDelivery: orderData.estimatedDelivery || null,
        deliveryNotes: orderData.deliveryNotes || null,
        customMessage: orderData.customMessage || null
    });
}

/**
 * Test email connection (useful for debugging)
 * @param {boolean} useCurrentSettings - If true, clears cache to use current settings
 * @returns {Promise} Connection test result
 */
export async function testConnection(useCurrentSettings = false) {
    try {
        // Clear cache if we want to test with current (unsaved) settings
        if (useCurrentSettings) {
            resetMailTransporter();
        }

        // Initialize or get existing transport
        const currentTransport = await initEmailService();
        
        if (!currentTransport) {
            throw new Error('Email transport not initialized - check your email provider configuration');
        }

        // Verify the connection
        const verified = await currentTransport.verify();
        return { success: true, method: 'nodemailer', verified };
    } catch (error) {
        console.error('Email connection test failed:', error);
        return { 
            success: false, 
            method: 'nodemailer', 
            error: error.message || 'Unknown error occurred'
        };
    }
}

// ============================================================================
// USER MANAGEMENT EMAIL FUNCTIONS
// ============================================================================

/**
 * Send user created email notification
 * @param {string} email - User email
 * @param {string} name - User display name
 * @param {string} password - Generated password
 * @returns {Promise<Object>} Email send result
 */
export async function sendUserCreatedEmail(email, name, password) {
    try {
        const { UserCreatedTemplate } = await import('@/emails/UserCreatedTemplate.jsx');
        const emailSettings = await getEmailSettings();
        const { siteSettings } = await getSettings();

        await sendEmail(
            email,
            'Welcome to Your Account',
            UserCreatedTemplate,
            {
                userDisplayName: name,
                email,
                password,
                loginUrl: `${emailSettings.siteUrl}/auth/login`,
                companyName: emailSettings.companyName,
                companyLogo: emailSettings.siteLogo || '',
                companyUrl: emailSettings.siteUrl,
                supportEmail: emailSettings.emailSupportEmail,
                socialNetworks: siteSettings?.socialNetworks || []
            },
            {
                from: emailSettings.emailSenderEmail,
                replyTo: emailSettings.emailSupportEmail,
                senderName: emailSettings.emailSenderName
            }
        );

        return { success: true };
    } catch (error) {
        console.error('Error sending user created email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send user updated email notification
 * @param {string} email - User email
 * @param {string} name - User display name
 * @param {Object} changes - Object describing what was changed
 * @returns {Promise<Object>} Email send result
 */
export async function sendUserUpdatedEmail(email, name, changes) {
    try {
        const { UserUpdatedTemplate } = await import('@/emails/UserUpdatedTemplate.jsx');
        const emailSettings = await getEmailSettings();
        const { siteSettings } = await getSettings();

        await sendEmail(
            email,
            'Your Account Has Been Updated',
            UserUpdatedTemplate,
            {
                userDisplayName: name,
                changes,
                loginUrl: `${emailSettings.siteUrl}/auth/login`,
                companyName: emailSettings.companyName,
                companyLogo: emailSettings.siteLogo || '',
                companyUrl: emailSettings.siteUrl,
                supportEmail: emailSettings.emailSupportEmail,
                socialNetworks: siteSettings?.socialNetworks || []
            },
            {
                from: emailSettings.emailSenderEmail,
                replyTo: emailSettings.emailSupportEmail,
                senderName: emailSettings.emailSenderName
            }
        );

        return { success: true };
    } catch (error) {
        console.error('Error sending user updated email:', error);
        return { success: false, error: error.message };
    }
}

// Export utility functions
export { getEmailSettings, getEmailFrom, getEmailName, getEmailPublic };
