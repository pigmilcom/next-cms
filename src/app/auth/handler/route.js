// @/app/auth/handler/route.js
import { NextResponse } from 'next/server';
import { v6 as uuidv6 } from 'uuid';
import DBService from '@/data/rest.db';
import { decryptHash, encryptHash, encryptPassword, generateSalt, validatePassword } from '@/lib/crypt';
import { sendWelcomeEmail } from '@/lib/server/email';
import { getAllUsers } from '@/lib/server/users';
import { createWallet, loadWeb3Config } from '@/lib/server/web3';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize cache
const { loadCacheData, saveCacheData } = await initCache('auth');
// Cache management functions
const { createWithCacheClear, updateWithCacheClear } = await cacheFunctions();

// ============================================================================
// AUTH HANDLER ROUTE
// ============================================================================
export async function POST(request) {
    try {
        const { email, password, client, action, name, referralCode } = await request.json();

        // Input validation
        if (!action) {
            return NextResponse.json({ error: 'actionRequired' });
        } else if (!client) {
            return NextResponse.json({ error: 'clientNotProvided' });
        } else if (!email || !password) {
            return NextResponse.json({ error: 'emailPasswordRequired' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'invalidEmailFormat' });
        }

        // Process based on action type
        if (action === 'register') {
            return await handleRegistration(email, password, name, { client, referralCode });
        } else if (action === 'registerNoCrypto') {
            return await handleRegistration(email, password, name, { client, referralCode }, (hasCrypto = false));
        } else if (action === 'login') {
            return await handleLogin(email, password, { client });
        } else {
            return NextResponse.json({ error: 'invalidAction' });
        }
    } catch (error) {
        // General error handling
        return NextResponse.json({ error: 'authSystemError' }, { status: 401 });
    }
}

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

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

async function handleLogin(email, passwordHash, { client }) {
    try {
        // Handle mock database provider
        if (DBService.provider === 'mock') {
            return NextResponse.json({ error: 'databaseNotConfigured' }, { status: 401 });
        }

        // Retrieve user by email
        const userRes = await DBService.readBy('email', email, 'users');
        const user = userRes?.data;

        // User not found
        if (!user) {
            return NextResponse.json({ error: 'invalidCredentials' });
        }

        // User found, get user key
        const userKey = user.key || user.id || null;
        if (!userKey) {
            return NextResponse.json({ error: 'userKeyMissing' });
        }

        // Check if password and salt exist
        if (!user.password || !user.salt) {
            return NextResponse.json({ error: 'invalidCredentials' });
        }

        // Decrypt input password and validate
        const decryptedPassword = decryptHash(passwordHash, client);
        const cryptoResult = await validatePassword(decryptedPassword, user.salt, user.password);

        // Invalid password
        if (!cryptoResult) {
            return NextResponse.json({ error: 'invalidCredentials' });
        }

        // Prepare user data for session
        let userLoginData = { ...user, client };

        // Load web3 config and handle web3 wallet generation if needed
        const web3UserData = userLoginData.web3 || null;
        const web3WalletExists = web3UserData && web3UserData.public_key && web3UserData.private_key;

        let web3data = null;

        // Setup web3 wallet if enabled and user has no wallet
        if (!web3WalletExists) {
            const web3Result = await web3WalletHandler();
            if (web3Result.web3data) {
                // Update user DB record with new web3 data if aplicable
                await updateWithCacheClear(userKey, { web3: web3Result.web3data }, 'users', ['users']);
                // Protect web3 private key and salt in output
                web3data = {
                    ...web3data,
                    private_key: '[PROTECTED]',
                    salt: '[PROTECTED]'
                };
            }
            // Attach web3 data to user login data
            userLoginData = { ...userLoginData, web3: web3data };
        }

        // Remove sensitive data before output
        const userLoginSecure = {
            key: userKey,
            id: userLoginData.id || userLoginData._id || userKey,
            displayName: userLoginData.displayName || '',
            email: userLoginData.email || '',
            phone: userLoginData.phone || '',
            role: userLoginData.role || 'client',
            web3: userLoginData.web3 || null,
            client: client,
            password: '[PROTECTED]',
            isDeveloper: userLoginData.isDeveloper || false
        };

        // Return success response with user data
        const responseData = { success: true, data: userLoginSecure, action: 'login' };
        return NextResponse.json({ hash: encryptHash(responseData, client) });
    } catch (error) {
        // Don't log validation errors (like invalid credentials)
        // They are expected and should not clutter logs
        return NextResponse.json({ error: 'authSystemError' }, { status: 401 });
    }
}

async function handleRegistration(email, passwordHash, name, { client, referralCode }, hasCrypto = true) {
    try {
        // Handle mock database provider
        if (DBService.provider === 'mock') {
            return NextResponse.json({ error: 'databaseNotConfigured' }, { status: 401 });
        }

        // Validate name
        if (!name) {
            return NextResponse.json({ error: 'nameRequired' });
        }

        // Validate password complexity
        const passwordValid = (pwd) => {
            return (
                pwd.length >= 8 &&
                pwd.length <= 32 &&
                /[a-z]/.test(pwd) &&
                /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
            );
        };

        // Decrypt password and validate complexity
        let decryptedPassword = passwordHash;
        if (hasCrypto) {
            decryptedPassword = decryptHash(passwordHash, client);
        }

        // Check for existing user with same email
        const existingUserRes = await DBService.readBy('email', email, 'users');
        const existingUser = existingUserRes?.data;

        if (existingUser) {
            // Check if user has empty password/salt (created from order without account)
            const hasEmptyPassword = !existingUser.password || existingUser.password === '';
            const hasEmptySalt = !existingUser.salt || existingUser.salt === '';

            // If user has no password/salt, allow registration to complete user account
            if (!hasEmptyPassword && !hasEmptySalt) {
                // User already has password/salt - account already registered
                return NextResponse.json({ error: 'emailAlreadyRegistered' });
            }

            // User exists but without password/salt - continue to update with credentials
            // (handled below after password generation)
        }

        // Check if this is the first user (should be admin)
        let isFirstUser = false;
        try {
            const allUsersResult = await getAllUsers();
            const userArray = allUsersResult?.success ? allUsersResult.data : [];
            isFirstUser = userArray.length === 0;
        } catch (error) {
            // If error occurs, return generic error
            console.error('Error checking user count:', error.message);
            return NextResponse.json({ error: 'failedUserCount' }, { status: 401 });
        }

        // Generate salt via crypto API
        const salt = await generateSalt();

        // Encrypt password via crypto API
        const encryptedPassword = await encryptPassword(decryptedPassword, salt);

        // Generate unique user ID
        const uid = uuidv6();

        // Generate unique referral code (6-8 characters)
        const generateReferralCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        const userReferralCode = generateReferralCode();

        // Validate referral code if provided (optional - don't block registration if invalid)
        let validReferredBy = null;
        if (referralCode) {
            try {
                const referrerResult = await DBService.readBy('referralCode', referralCode, 'users');
                if (referrerResult?.success && referrerResult.data) {
                    validReferredBy = referralCode;
                }
            } catch (error) {
                // Don't fail registration if referral validation fails
                console.warn('Referral validation failed:', error);
            }
        }

        // Prepare user registration data
        let userRegisterData = {
            id: existingUser ? existingUser.id : uid,
            email: email,
            displayName: name,
            phone: existingUser ? existingUser.phone || '' : '',
            country: existingUser ? existingUser.country || '' : '',
            password: encryptedPassword,
            salt: salt,
            role: isFirstUser ? 'admin' : existingUser ? existingUser.role : 'user',
            referralCode: existingUser ? existingUser.referralCode : userReferralCode,
            referredBy: existingUser ? existingUser.referredBy : validReferredBy,
            emailVerified: existingUser ? existingUser.emailVerified ?? false : false,
            // Preferences (align defaults with createUser in users.js)
            emailNotifications: existingUser ? existingUser.emailNotifications ?? true : true,
            orderUpdates: existingUser ? existingUser.orderUpdates ?? true : true,
            marketingEmails: existingUser ? existingUser.marketingEmails ?? true : true,
            newsletter: existingUser ? existingUser.newsletter ?? true : true,
            smsNotifications: existingUser ? existingUser.smsNotifications ?? true : true,
            // Club data defaults (flattened in DB, processed into nested structure by getUser)
            clubMember: existingUser ? existingUser.clubMember ?? false : false,
            clubPoints: existingUser ? existingUser.clubPoints ?? 0 : 0,
            clubLevel: existingUser ? existingUser.clubLevel ?? null : null,
            claimedRewards: existingUser ? existingUser.claimedRewards ?? [] : [],
            pointsHistory: existingUser ? existingUser.pointsHistory ?? [] : [],
            isDeveloper: isFirstUser ? true : existingUser ? existingUser.isDeveloper ?? false : false,
            createdAt: existingUser ? existingUser.createdAt : timeNow(),
            updatedAt: timeNow()
        };

        //  Setup Web3 data if enabled (only for new users or if existing user has no web3)
        if (!existingUser || !existingUser.web3) {
            const web3Result = await web3WalletHandler();
            if (web3Result.isActive && web3Result.web3data) {
                userRegisterData = { ...userRegisterData, web3: web3Result.web3data };
            }
        }

        // Create or update user record in database
        let result;
        let userKey;

        if (existingUser) {
            // Update existing user with password and salt (complete registration)
            userKey = existingUser.key || existingUser.id;
            result = await updateWithCacheClear(userKey, userRegisterData, 'users', [
                'users',
                'store',
                'orders',
                'newsletter'
            ]);
            if (!result || !result.success) {
                return NextResponse.json({ error: 'userRegistrationFailed' });
            }
        } else {
            // Create new user record
            result = await createWithCacheClear(userRegisterData, 'users', ['users', 'store', 'orders', 'newsletter']);
            if (!result || !result.success) {
                return NextResponse.json({ error: 'userRegistrationFailed' });
            }
            userKey = result?.key || result?.id || null;
        }

        // Send welcome email
        try {
            await sendWelcomeEmail(email, name);
        } catch (e) {
            // Log email sending errors but don't block registration
            console.error('Email sending error: ', e);
        }

        // Prepare user data for session
        const responseData = { success: true, data: { key: userKey, client: client }, action: 'register' };
        return NextResponse.json({ hash: encryptHash(responseData, client) });
    } catch (error) {
        // Don't log validation errors (like invalid credentials)
        // They are expected and should not clutter logs
        return NextResponse.json({ error: 'authSystemError' }, { status: 401 });
    }
}
