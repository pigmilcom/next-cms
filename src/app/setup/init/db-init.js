// @/app/setup/init/db-init.js
import DBService from '@/data/rest.db.js';

const getDefaultSiteSettings = () => ({
    id: "site_settings", 
    siteName: 'My App',
    siteTitle: '',
    siteKeywords: '',
    siteDescription: '',
    siteEmail: 'admin@example.com',
    sitePhone: '',
    businessAddress: '',
    businessCity: '',
    businessCp: '',
    latitude: undefined,
    longitude: undefined,
    country: '',
    countryIso: '',
    language: 'en',
    languages: ['en'],
    adminLanguage: 'en',
    adminLanguages: ['en'],
    baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    ogImage: '',
    serviceArea: '',
    serviceRadius: undefined,
    siteLogo: '',
    socialNetworks: [],
    workingHours: [],
    allowRegistration: true,
    enableFrontend: true,
    smsEnabled: false,
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    googleMapsEnabled: false,
    googleMapsApiKey: '',
    turnstileEnabled: false,
    turnstileSiteKey: '',
    emailProvider: 'none',
    emailUser: '',
    emailPass: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    providers: {
        google: { clientId: '', clientSecret: '', enabled: false },
        github: { clientId: '', clientSecret: '', enabled: false },
        facebook: { clientId: '', clientSecret: '', enabled: false },
        twitter: { clientId: '', clientSecret: '', enabled: false },
        discord: { clientId: '', clientSecret: '', enabled: false },
        linkedin: { clientId: '', clientSecret: '', enabled: false }
    },
    web3Active: false,
    web3ContractAddress: '',
    web3ContractSymbol: '',
    web3ChainSymbol: '',
    web3InfuraRpc: '',
    web3ChainId: 1,
    web3NetworkName: 'Ethereum Mainnet',
    googleAnalyticsEnabled: false,
    googleAnalyticsApiKey: '',
    enabledMenuItems: {
        store: true,
        media: true,
        workspace: true,
        marketing: true,
        club: true,
        tickets: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
});

const getDefaultStoreSettings = () => ({
    id: 'store_settings',
    businessName: 'My Store',
    tvaNumber: '',
    address: '',
    vatEnabled: true,
    vatPercentage: 20,
    vatIncludedInPrice: true,
    applyVatAtCheckout: false,
    paymentMethods: {
        bankTransfer: {
            enabled: false,
            bankName: '',
            accountHolder: '',
            iban: '',
            bic: '',
            instructions: ''
        },
        payOnDelivery: false,
        euPago: {
            enabled: false,
            apiUrl: 'https://sandbox.eupago.pt/',
            apiKey: '',
            supportedMethods: ['mb', 'mbway'],
            mbwayExpiryTime: 5,
            mbExpiryTime: 2880
        },
        stripe: {
            enabled: false,
            apiPuplicKey: '',
            apiSecretKey: ''
        }
    },
    freeShippingEnabled: false,
    freeShippingThreshold: 50,
    freeShippingCarrier: '',
    allowedCountries: [],
    bannedCountries: [],
    internationalShipping: false,
    carriers: [],
    currency: 'EUR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
});

const getDefaultRoles = () => [
    {
        id: 'admin',
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access to all features and settings',
        permissions: ['*'],
        isDefault: true,
        isProtected: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: null
    },
];

// Cache for initialization status to prevent duplicate runs
let initializationInProgress = false;
let initializationComplete = false;

// Initialize default database tables and data
export const initializeDatabase = async () => {
    // Prevent duplicate initialization
    if (initializationInProgress) {
        return {
            success: true,
            tablesCreated: [],
            errors: [],
            message: 'Initialization already in progress'
        };
    }

    if (initializationComplete) {
        return {
            success: true,
            tablesCreated: [],
            errors: [],
            message: 'Database already initialized'
        };
    }

    initializationInProgress = true;

    const results = {
        success: false,
        tablesCreated: [],
        errors: [],
        message: ''
    };

    try {
        // Check and create site_settings
        try { 
            const existingSiteSettings = await DBService.readAll('site_settings');
            const settingsData = existingSiteSettings?.success ? existingSiteSettings.data : {};
            const settingsArray = Array.isArray(settingsData) 
                ? settingsData 
                : Object.values(settingsData || {});
            const hasData = settingsArray.length > 0;

            console.log('Existing site_settings data:', hasData);

            if (!hasData) {
                const defaultSiteSettings = getDefaultSiteSettings();
                const createResult = await DBService.create(defaultSiteSettings, 'site_settings');
                if (createResult?.success) {
                    results.tablesCreated.push('site_settings');
                } else {
                    results.errors.push('Failed to create site_settings');
                }
            }
        } catch (error) {
            console.log('Creating site_settings table with default data...', error.message);
            try {
                const defaultSiteSettings = getDefaultSiteSettings();
                const createResult = await DBService.create(defaultSiteSettings, 'site_settings');
                if (createResult?.success) {
                    results.tablesCreated.push('site_settings');
                } else {
                    results.errors.push('Failed to create site_settings: ' + (createResult?.error || 'Unknown error'));
                }
            } catch (createError) {
                results.errors.push('Failed to create site_settings: ' + createError.message);
            }
        }

        // Check and create store_settings
        try {
            const existingStoreSettings = await DBService.readAll('store_settings');
            const settingsData = existingStoreSettings?.success ? existingStoreSettings.data : {};
            const settingsArray = Array.isArray(settingsData) 
                ? settingsData 
                : Object.values(settingsData || {});
            const hasData = settingsArray.length > 0;

            if (!hasData) {
                const defaultStoreSettings = getDefaultStoreSettings();
                const createResult = await DBService.create(defaultStoreSettings, 'store_settings');
                if (createResult?.success) {
                    results.tablesCreated.push('store_settings');
                } else {
                    results.errors.push('Failed to create store_settings');
                }
            }
        } catch (error) {
            console.log('Creating store_settings table with default data...', error.message);
            try {
                const defaultStoreSettings = getDefaultStoreSettings();
                const createResult = await DBService.create(defaultStoreSettings, 'store_settings');
                if (createResult?.success) {
                    results.tablesCreated.push('store_settings');
                } else {
                    results.errors.push('Failed to create store_settings: ' + (createResult?.error || 'Unknown error'));
                }
            } catch (createError) {
                results.errors.push('Failed to create store_settings: ' + createError.message);
            }
        }

        // Check and create roles
        try {
            const existingRoles = await DBService.readAll('roles');
            const rolesData = existingRoles?.success ? existingRoles.data : {};
            const rolesArray = Array.isArray(rolesData) 
                ? rolesData 
                : Object.values(rolesData || {});
            const hasData = rolesArray.length > 0;

            if (!hasData) {
                const defaultRoles = getDefaultRoles();
                let rolesCreated = 0;
                for (const role of defaultRoles) {
                    try {
                        const createResult = await DBService.create(role, 'roles');
                        if (createResult?.success) {
                            rolesCreated++;
                        } else {
                            results.errors.push(`Failed to create role ${role.id}`);
                        }
                    } catch (roleError) {
                        results.errors.push(`Failed to create role ${role.id}: ${roleError.message}`);
                    }
                }
                if (rolesCreated > 0) {
                    results.tablesCreated.push('roles');
                }
            }
        } catch (error) {
            console.log('Creating roles table with default data...', error.message);
            try {
                const defaultRoles = getDefaultRoles();
                let rolesCreated = 0;
                for (const role of defaultRoles) {
                    try {
                        const createResult = await DBService.create(role, 'roles');
                        if (createResult?.success) {
                            rolesCreated++;
                        } else {
                            results.errors.push(`Failed to create role ${role.id}: ${createResult?.error || 'Unknown error'}`);
                        }
                    } catch (roleError) {
                        results.errors.push(`Failed to create role ${role.id}: ${roleError.message}`);
                    }
                }
                if (rolesCreated > 0) {
                    results.tablesCreated.push('roles');
                }
            } catch (createError) {
                results.errors.push('Failed to create roles: ' + createError.message);
            }
        }

        // Check users table existence (but don't auto-create admin)
        try {
            const existingUsers = await DBService.readAll('users');
            const usersData = existingUsers?.success ? existingUsers.data : {};
            const usersArray = Array.isArray(usersData) 
                ? usersData 
                : Object.values(usersData || {});
            const hasData = usersArray.length > 0;

            if (hasData) {
                results.tablesCreated.push('users (existing)');
            } else {
                results.tablesCreated.push('users (ready for admin creation)');
            }
        } catch (error) {
            console.log('Users table check - table will be created on first user registration:', error.message);
            results.tablesCreated.push('users (will be created on first admin)');
        }

        results.success = true;
        results.message = results.tablesCreated.length > 0 
            ? `Database initialized successfully. Created: ${results.tablesCreated.join(', ')}`
            : 'Database already initialized with default data';

        initializationComplete = true;
        return results;
    } catch (error) {
        console.error('Database initialization error:', error);
        results.errors.push(error.message);
        results.message = 'Failed to initialize database';
        return results;
    } finally {
        initializationInProgress = false;
    }
};
