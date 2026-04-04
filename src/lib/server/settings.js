// @/lib/server/settings.js

'use server';

import { headers } from 'next/headers';
import DBService from '@/data/rest.db.js';
import { getAvailableLanguages } from '@/lib/server/locale.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

import { initCache } from '@/lib/shared/cache.js';

const { loadCacheData, saveCacheData } = await initCache('settings');

// ============================================================================
// SETTINGS MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Fetch site settings from database
 * @param {Object} params - Optional fetch parameters
 * @param {boolean} includeAdminData - If true, includes sensitive keys for admin use
 * @returns {Promise<Object>} Site settings object
 */
export const getSiteSettings = async (params = {}, includeAdminData = false) => {
    try {
        // Check cache first with different prefixes for admin vs public
        const cachePrefix = includeAdminData ? 'site_settings_admin' : 'site_settings';
        const cachedData = await loadCacheData(cachePrefix, params);
        if (cachedData) return cachedData;

        const settingsData = await DBService.readAll('site_settings');

        const settings = settingsData.data ? Object.values(settingsData.data)[0] : [];

        if (!settings) {
            return null;
        }

        let baseUrl = process.env.NEXTAUTH_URL || settings.baseUrl || '';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

        // Fallback baseUrl if not in settings
        if (!baseUrl) {
            // Server-side: use environment variables
            const host =
                process.env.NEXTAUTH_URL ||
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
            baseUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
        } else {
            // Ensure baseUrl does not have trailing slash and has protocol
            baseUrl = baseUrl.startsWith('http') ? baseUrl : `${protocol}://${baseUrl}`;
            baseUrl = baseUrl.replace(/\/+$/, '');
        }

        // Construct canonicalUrl from baseUrl
        const canonicalUrl = `${baseUrl}/`;

        // Fetch available frontend languages from filesystem
        const frontendLanguagesResult = await getAvailableLanguages({ frontend: true });
        const frontendLanguagesFromFilesystem = frontendLanguagesResult.success && frontendLanguagesResult.data.length > 0 
            ? frontendLanguagesResult.data 
            : ['en']; 

        // Fetch available backend/admin languages from filesystem
        const backendLanguagesResult = await getAvailableLanguages({ frontend: false });
        const backendLanguagesFromFilesystem = backendLanguagesResult.success && backendLanguagesResult.data.length > 0 
            ? backendLanguagesResult.data 
            : ['en'];

        // Validate and set default language (must be from available frontend languages)
        const defaultLanguage = frontendLanguagesFromFilesystem.includes(settings.language) 
            ? settings.language 
            : frontendLanguagesFromFilesystem[0]; 

        const selectedBackendLanguages = settings.adminLanguages && Array.isArray(settings.adminLanguages) && settings.adminLanguages.length > 0
            ? settings.adminLanguages.filter(lang => backendLanguagesFromFilesystem.includes(lang)) // only keep valid ones
            : backendLanguagesFromFilesystem; // if none selected, default to all available

        // Validate and set admin language (must be from selected backend languages)
        const defaultAdminLanguage = selectedBackendLanguages.includes(settings.adminLanguage) 
            ? settings.adminLanguage 
            : selectedBackendLanguages[0];

        const isNewSetup = !settings.key;

        // Determine which settings to return based on includeAdminData flag
        let processedSettings = {
            key: settings.key || settings.id || 'site_settings',
            id: settings.id || 'site_settings',
            setup_complete: !isNewSetup,
            siteName: settings.siteName || '',
            siteTitle: settings.siteTitle || '',
            siteKeywords: settings.siteKeywords || '',
            siteDescription: settings.siteDescription || '',
            siteEmail: settings.siteEmail || '',
            sitePhone: settings.sitePhone || '',
            businessAddress: settings.businessAddress || '',
            businessCity: settings.businessCity || '',
            businessCp: settings.businessCp || '',
            latitude: settings.latitude,
            longitude: settings.longitude,
            country: settings.country || '',
            countryIso: settings.countryIso || '',
            currency: settings.currency || 'EUR',
            language: defaultLanguage,
            languages: frontendLanguagesFromFilesystem,
            adminLanguage: defaultAdminLanguage,
            adminLanguages: selectedBackendLanguages,
            baseUrl: baseUrl,
            canonicalUrl: canonicalUrl,
            ogImage: settings.ogImage || '',
            serviceArea: settings.serviceArea || '',
            serviceRadius: settings.serviceRadius,
            siteLogo: settings.siteLogo || '',
            socialNetworks: settings.socialNetworks || [],
            workingHours: settings.workingHours || [],
            allowRegistration: settings.allowRegistration !== false,
            enableFrontend: settings.enableFrontend !== false,
            // SMS Integration (with sensitive keys)
            smsEnabled: settings.smsEnabled === true,
            twilioAccountSid: settings.twilioAccountSid || '',
            twilioAuthToken: settings.twilioAuthToken || '',
            twilioPhoneNumber: settings.twilioPhoneNumber || '',
            // Google Maps (with sensitive key)
            googleMapsEnabled: settings.googleMapsEnabled === true,
            googleMapsApiKey: settings.googleMapsApiKey || '',
            // Turnstile Security (with sensitive key)
            turnstileEnabled: settings.turnstileEnabled === true,
            turnstileSiteKey: settings.turnstileSiteKey || '',
            // Email Configuration (with sensitive credentials)
            emailProvider: settings.emailProvider || 'none',
            emailUser: settings.emailUser || '',
            emailPass: settings.emailPass || '',
            smtpHost: settings.smtpHost || '',
            smtpPort: settings.smtpPort || 587,
            smtpSecure: settings.smtpSecure || false,
            // OAuth Providers (with sensitive credentials)
            providers: settings.providers || {},
            // Web3 Configuration (with sensitive data)
            web3Active: settings.web3Active === true,
            web3ContractAddress: settings.web3ContractAddress || '',
            web3ContractSymbol: settings.web3ContractSymbol || '',
            web3ChainSymbol: settings.web3ChainSymbol || '',
            web3InfuraRpc: settings.web3InfuraRpc || '',
            web3ChainId: settings.web3ChainId || 1,
            web3NetworkName: settings.web3NetworkName || 'Ethereum Mainnet',
            // Google Analytics Configuration
            googleAnalyticsEnabled: settings.googleAnalyticsEnabled === true,
            googleAnalyticsApiKey: settings.googleAnalyticsApiKey || '',
            // AI Agent Configuration
            aiEnabled: settings.aiEnabled === true,
            replicateApiKey: settings.replicateApiKey || '',
            // S3/R2 Storage Configuration (with sensitive keys)
            s3: {
                enabled: process.env.S3_ENDPOINT ? true : settings.s3?.enabled === true,
                endpoint: process.env.S3_ENDPOINT || settings.s3?.endpoint || '',
                region: process.env.S3_REGION || settings.s3?.region || 'auto',
                accessKey: process.env.S3_ACCESS_KEY || settings.s3?.accessKey || '',
                secretKey: process.env.S3_SECRET_KEY || settings.s3?.secretKey || '',
                bucket: process.env.S3_BUCKET || settings.s3?.bucket || '',
                publicUrl: process.env.S3_PUBLIC_URL || settings.s3?.publicUrl || ''
            },
            // Interface Menu Configuration
            enabledMenuItems: settings.enabledMenuItems || {
                store: true,
                media: true,
                workspace: true,
                marketing: true,
                club: true,
                tickets: true
            },
            updatedAt: settings.updatedAt || null
        };

        if (!includeAdminData) {
            // Public settings - filter out sensitive data
            // Note: turnstileSiteKey and googleMapsApiKey are PUBLIC keys meant for client-side use
            processedSettings = {
                ...processedSettings,
                twilioAccountSid: '[PROTECTED]',
                twilioAuthToken: '[PROTECTED]',
                twilioPhoneNumber: '[PROTECTED]',
                emailUser: '[PROTECTED]',
                emailPass: '[PROTECTED]',
                smtpHost: '[PROTECTED]',
                smtpPort: '[PROTECTED]',
                smtpSecure: '[PROTECTED]',
                replicateApiKey: '[PROTECTED]',
                providers: Object.fromEntries(
                    Object.entries(processedSettings.providers).map(([key, value]) => [
                        key,
                        {
                            ...value,
                            clientId: '[PROTECTED]',
                            clientSecret: '[PROTECTED]'
                        }
                    ])
                ),
                s3: {
                    enabled: processedSettings.s3.enabled,
                    endpoint: '[PROTECTED]',
                    region: '[PROTECTED]',
                    accessKey: '[PROTECTED]',
                    secretKey: '[PROTECTED]',
                    bucket: '[PROTECTED]',
                    publicUrl: '[PROTECTED]'
                }
            };
        }

        const result = {
            success: true,
            data: processedSettings
        };

        // Cache the complete result object with appropriate prefix
        await saveCacheData(cachePrefix, params, result);

        return result;
    } catch (error) {
        console.error('Error fetching site settings:', error);
        return {
            success: false,
            error: 'Failed to fetch site settings',
            message: error.message,
            data: null
        };
    }
};

/**
 * Fetch store settings (business info, VAT, payments, shipping, currency)
 * @param {Object} params - Optional fetch parameters
 * @param {boolean} includeAdminData - If true, includes sensitive keys for admin use
 * @returns {Promise<Object>} Store settings object
 */
export const getStoreSettings = async (params = {}, includeAdminData = false) => {
    try {
        // Check cache first with different prefixes for admin vs public
        const cachePrefix = includeAdminData ? 'store_settings_admin' : 'store_settings';
        const cachedData = await loadCacheData(cachePrefix, params);
        if (cachedData) return cachedData;

        const settingsData = await DBService.readAll('store_settings');
        const settings = settingsData.data ? Object.values(settingsData.data)[0] : [];

        if (!settings) {
            return null;
        }

        // Determine which settings to return based on includeAdminData flag
        const paymentMethods = settings.paymentMethods || {};
        let storeSettings = {
            key: settings.key || settings.id || 'store_settings',
            id: settings.id || 'store_settings',
            businessName: settings.businessName || '',
            tvaNumber: settings.tvaNumber || '',
            address: settings.address || '',
            vatEnabled: settings.vatEnabled !== false,
            vatPercentage: settings.vatPercentage || 20,
            vatIncludedInPrice: settings.vatIncludedInPrice !== false,
            applyVatAtCheckout: settings.applyVatAtCheckout || false,
            paymentMethods: {
                bankTransfer: {
                    enabled: paymentMethods.bankTransfer?.enabled || false,
                    bankName: paymentMethods.bankTransfer?.bankName || '',
                    accountHolder: paymentMethods.bankTransfer?.accountHolder || '',
                    iban: paymentMethods.bankTransfer?.iban || '',
                    bic: paymentMethods.bankTransfer?.bic || '',
                    instructions: paymentMethods.bankTransfer?.instructions || ''
                },
                payOnDelivery: paymentMethods.payOnDelivery?.enabled !== undefined 
                    ? paymentMethods.payOnDelivery 
                    : { enabled: paymentMethods.payOnDelivery || false },
                euPago: {
                    enabled: paymentMethods.euPago?.enabled || false,
                    apiUrl: paymentMethods.euPago?.apiUrl || 'https://sandbox.eupago.pt/',
                    apiKey: paymentMethods.euPago?.apiKey || '',
                    supportedMethods: paymentMethods.euPago?.supportedMethods || ['mb', 'mbway'],
                    mbwayExpiryTime: paymentMethods.euPago?.mbwayExpiryTime || 5, // minutes
                    mbExpiryTime: paymentMethods.euPago?.mbExpiryTime || 2880 // minutes (48 hours)
                },
                stripe: {
                    enabled: paymentMethods.stripe?.enabled || false,
                    apiPuplicKey: paymentMethods.stripe?.apiPuplicKey || '',
                    apiSecretKey: paymentMethods.stripe?.apiSecretKey || ''
                },
                sumup: {
                    enabled: paymentMethods.sumup?.enabled || false,
                    merchantCode: paymentMethods.sumup?.merchantCode || '',
                    apiKey: paymentMethods.sumup?.apiKey || '', 
                }
            },
            freeShippingEnabled: settings.freeShippingEnabled || false,
            freeShippingThreshold: settings.freeShippingThreshold || 50,
            freeShippingCarrier: settings.freeShippingCarrier || '',
            allowedCountries: settings.allowedCountries || [],
            bannedCountries: settings.bannedCountries || [],
            internationalShipping: settings.internationalShipping || false,
            carriers: settings.carriers || [],
            currency: settings.currency || 'EUR'
        };

        if (!includeAdminData) {
            // Public settings - filter out sensitive data
            storeSettings = {
                ...storeSettings,
                paymentMethods: {
                    bankTransfer: {
                        enabled: paymentMethods.bankTransfer?.enabled || false,
                        bankName: '[PROTECTED]',
                        accountHolder: '[PROTECTED]',
                        iban: '[PROTECTED]',
                        bic: '[PROTECTED]',
                        instructions: '[PROTECTED]'
                    },
                    payOnDelivery: paymentMethods.payOnDelivery?.enabled  || false,
                    euPago: {
                        enabled: paymentMethods.euPago?.enabled || false,
                        supportedMethods: paymentMethods.euPago?.supportedMethods || ['mb', 'mbway'],
                        mbwayExpiryTime: paymentMethods.euPago?.mbwayExpiryTime || 5, // minutes (safe to expose)
                        mbExpiryTime: paymentMethods.euPago?.mbExpiryTime || 2880, // minutes (safe to expose)
                        apiUrl: '[PROTECTED]',
                        apiKey: '[PROTECTED]'
                    },
                    stripe: {
                        enabled: paymentMethods.stripe?.enabled || false,
                        apiPuplicKey: paymentMethods.stripe?.apiPuplicKey || '',
                        apiSecretKey: '[PROTECTED]'
                    },
                    sumup: {
                        enabled: paymentMethods.sumup?.enabled || false,
                        merchantCode: '[PROTECTED]', 
                        apiKey: '[PROTECTED]'
                    }
                }
            };
        }

        const result = {
            success: true,
            data: storeSettings
        };

        // Cache the complete result object with appropriate prefix
        await saveCacheData(cachePrefix, params, result);

        return result;
    } catch (error) {
        console.error('Error fetching store settings:', error);
        return {
            success: false,
            error: 'Failed to fetch store settings',
            message: error.message,
            data: null
        };
    }
};

/**
 * Memoized settings fetch - shared across all server components per request
 * Uses React cache() to prevent duplicate fetches in pages and components
 */
export const getSettings = async () => {
    const [siteSettingsRes, adminSiteSettingsRes, storeSettingsRes, adminStoreSettingsRes] = await Promise.all([
        getSiteSettings({ duration: '1D' }), // Public site settings
        getSiteSettings({ duration: '1D' }, true), // Admin site settings with sensitive data
        getStoreSettings({ duration: '1D' }), // Public store settings
        getStoreSettings({ duration: '1D' }, true) // Admin store settings with sensitive data
    ]);

    const settings = siteSettingsRes?.success ? siteSettingsRes.data : null;

    let baseUrl = settings?.baseUrl || '';

    // Fallback baseUrl if not in settings
    if (!baseUrl) {
        if (typeof window !== 'undefined') {
            // Client-side: use current window location
            baseUrl = `${window.location.protocol}//${window.location.host}`;
        } else {
            // Server-side: use environment variables
            baseUrl =
                process.env.NEXT_PUBLIC_BASE_URL ||
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        }
    }

    // Auto-detect current path from request headers (server-side only)
    let pathname = '/';
    try {
        const headersList = await headers();
        pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '/';
    } catch (error) {
        // Fallback to root path if headers not available
        pathname = '/';
    }

    // Construct full canonical URL: baseUrl + pathname
    const canonicalUrl = `${baseUrl}${pathname}`;

    return {
        siteSettings: {
            ...settings,
            canonicalUrl
        },
        storeSettings: storeSettingsRes?.success ? storeSettingsRes.data : null,
        adminSiteSettings: adminSiteSettingsRes?.success
            ? {
                  ...adminSiteSettingsRes.data,
                  canonicalUrl
              }
            : {
                  ...settings,
                  canonicalUrl
              },
        adminStoreSettings: adminStoreSettingsRes?.success ? adminStoreSettingsRes.data : null
    };
};   
