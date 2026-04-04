// @/app/setup/init/route.js
import { NextResponse } from 'next/server';
import DBService from '@/data/rest.db.js';
import { v6 as uuidv6 } from 'uuid';
import { encryptPassword, generateSalt } from '@/lib/crypt';
import { createWallet, loadWeb3Config } from '@/lib/server/web3'; 

const timeNow = () => new Date().toISOString();

// ============================================================================
// WEB3 WALLET HANDLER
// ============================================================================
async function web3WalletHandler() {
    // Initialize web3 global data
    let web3active = false; 
    let web3data = null;

    // Load web3 config and handle web3 wallet generation
    try {
        const web3load = await loadWeb3Config();
        web3active = web3load?.WEB3_ACTIVE > 0;
        // Check if web3 is active
        if (web3active) {   
                // Generate salt for web3
                const salt = await generateSalt(); 
                // Create new web3 wallet
                const web3create = await createWallet();

                // Save new web3 wallet to user record
                if (web3create?.address && web3create?.privateKey) {
                    // Encrypt web3 private key 
                    const encryptResult = await encryptPassword(web3create.privateKey, salt);
                    // Prepare web3 data
                    web3data = {
                        isActive: true,
                        web3data: {
                            salt: salt,
                            public_key: web3create.address,
                            private_key: encryptResult,
                            createdAt: timeNow()
                        }
                    };  
                }  
        } 
        // Return web3 status and user data 
        return web3data || { isActive: web3active };
            
    // On error, return inactive status with error details
    } catch (e) { 
        return { error: e || 'Web3 wallet generation error', isActive: false };
    }
}

// Default data structures based on admin pages
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

const getDefaultUser = async () => {
    // Generate salt via crypto API
    const salt = await generateSalt();
    
    // Default admin credentials
    const defaultEmail = 'admin@localhost.xyz';
    const defaultPassword = 'AdminPass123';
    const defaultName = 'Administrator';
    
    // Encrypt password via crypto API
    const encryptedPassword = await encryptPassword(defaultPassword, salt);
    
    // Generate unique user ID
    const uid = uuidv6();
    
    // Generate unique referral code (6-8 characters) - same as auth handler
    const generateReferralCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };
    
    const userReferralCode = generateReferralCode();
    
    // Prepare user registration data - EXACT same structure as auth handler
    let userRegisterData = {
        id: uid,
        displayName: defaultName,
        email: defaultEmail,
        password: encryptedPassword,
        salt: salt,
        role: 'admin', // First user is always admin
        referralCode: userReferralCode,
        referredBy: null,
        emailNotifications: true,
        orderUpdates: true,
        marketingEmails: true,
        newsletter: true,
        smsNotifications: false,
        isDeveloper: true,
        createdAt: timeNow()
    };
    
    // Setup Web3 data if enabled - same as auth handler
    try {
        const web3Result = await web3WalletHandler();
        if(web3Result.isActive && web3Result.web3data) {  
            userRegisterData = { ...userRegisterData, web3: web3Result.web3data };
        }
    } catch (error) {
        console.log('Web3 setup failed for default user:', error.message);
    }
    
    return {
        userData: userRegisterData,
        credentials: {
            email: defaultEmail,
            password: defaultPassword
        }
    };
};

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
            // Handle DBService response structure properly
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
            // Handle DBService response structure properly
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
            // Handle DBService response structure properly
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
            // Handle DBService response structure properly
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

export async function GET() {
    try {
        // Check if all required data already exists
        let allDataExists = false;
        let existingCollections = [];
        
        try {
            const [siteSettings, storeSettings, roles, users] = await Promise.all([
                DBService.readAll('site_settings'),
                DBService.readAll('store_settings'),
                DBService.readAll('roles'),
                DBService.readAll('users')
            ]);
            
            // Handle DBService response structure properly
            const siteSettingsData = siteSettings?.success ? siteSettings.data : {};
            const storeSettingsData = storeSettings?.success ? storeSettings.data : {};
            const rolesData = roles?.success ? roles.data : {};
            const usersData = users?.success ? users.data : {};
            
            const siteSettingsArray = Array.isArray(siteSettingsData) ? siteSettingsData : Object.values(siteSettingsData || {});
            const storeSettingsArray = Array.isArray(storeSettingsData) ? storeSettingsData : Object.values(storeSettingsData || {});
            const rolesArray = Array.isArray(rolesData) ? rolesData : Object.values(rolesData || {});
            const usersArray = Array.isArray(usersData) ? usersData : Object.values(usersData || {});
            
            if (siteSettingsArray.length > 0) existingCollections.push('site_settings');
            if (storeSettingsArray.length > 0) existingCollections.push('store_settings');
            if (rolesArray.length > 0) existingCollections.push('roles');
            if (usersArray.length > 0) existingCollections.push('users');
            
            // All data exists if we have site_settings, store_settings, roles, and at least one user
            allDataExists = siteSettingsArray.length > 0 && 
                           storeSettingsArray.length > 0 && 
                           rolesArray.length > 0 && 
                           usersArray.length > 0;
        } catch (error) {
            console.log('Error checking existing data:', error.message);
            // Don't throw here, just log and continue with empty data
        }
        
        // Define required environment variables
        const requiredEnvVars = {
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
            POSTGRES_URL: process.env.POSTGRES_URL || '',
            S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || '',
            S3_ENDPOINT: process.env.S3_ENDPOINT || '',
            S3_REGION: process.env.S3_REGION || '',
            S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
            S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',
            S3_BUCKET: process.env.S3_BUCKET || ''
        };

        const missingVars = [];
        const emptyVars = [];
        const presentVars = [];

        // Check each environment variable
        const dbConfigured = requiredEnvVars.POSTGRES_URL

        Object.entries(requiredEnvVars).forEach(([key, value]) => {

            if (value === undefined) {
                // Only add to missing if it's not the optional DB URL
                if (!(key === 'POSTGRES_URL') || !dbConfigured) {
                    missingVars.push(key);
                }
            } else if (value === '') {
                // Only add to empty if it's not the optional DB URL
                if (!(key === 'POSTGRES_URL') || !dbConfigured) {
                    emptyVars.push(key);
                }
            } else {
                presentVars.push(key);
            }
        });

        // Calculate setup status
        // Adjust total vars count to exclude the optional DB connection
        const totalVars = Object.keys(requiredEnvVars).length - 1; // Subtract 1 as only one DB is required
        const configuredVars = presentVars.length;
        const isSetupComplete = missingVars.length === 0 && emptyVars.length === 0 && dbConfigured;
        const setupPercentage = Math.round((configuredVars / totalVars) * 100);

        // Test connections if setup is partially or fully complete
        let connectionTests = null;
        let databaseInitialization = null;
        
        if (presentVars.length > 0) {
            connectionTests = {
                database: null,
            };

            // Test database connection (basic URL validation)
            if (requiredEnvVars.POSTGRES_URL) {
                try {
                    new URL(requiredEnvVars.POSTGRES_URL);
                    connectionTests.database = 'URL format valid';
                } catch {
                    connectionTests.database = 'Invalid URL format';
                }
            }

            // Initialize database with default tables and data if setup is complete
            if (isSetupComplete && dbConfigured) {
                console.log('Setup complete, initializing database...');
                try {
                databaseInitialization = await initializeDatabase();
                } catch (dbInitError) {
                    databaseInitialization = { success: false, error: dbInitError.message };
                }
            }
        }

        // Prepare response data
        const response = {
            setupComplete: isSetupComplete,
            allDataExists,
            existingCollections,
            setupPercentage,
            totalVariables: totalVars,
            configuredVariables: configuredVars,
            status: {
                present: presentVars,
                missing: missingVars,
                empty: emptyVars
            },
            connectionTests,
            databaseInitialization,
            message: allDataExists
                ? 'Setup already completed. All required data exists in database.'
                : isSetupComplete
                ? 'All environment variables are configured correctly and database is initialized.'
                : `Setup incomplete: ${missingVars.length + emptyVars.length} variable(s) need attention.`,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown'
        };

        // Return appropriate HTTP status
        const httpStatus = isSetupComplete ? 200 : 206; // 206 = Partial Content

        return NextResponse.json(response, { status: httpStatus });
    } catch (error) {
        console.error('Setup check error:', error);
        return NextResponse.json(
            {
                setupComplete: false,
                error: 'Failed to check environment setup',
                message: 'An error occurred while checking environment variables.',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
