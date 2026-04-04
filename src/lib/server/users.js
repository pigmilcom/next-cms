// @/lib/server/users.js

'use server';

import DBService from '@/data/rest.db.js';
import { encryptPassword, generateSalt, validatePassword } from '@/lib/crypt.js';
import { getAllOrders } from '@/lib/server/orders.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

import { cacheFunctions, initCache } from '@/lib/shared/cache.js';

// Initialize cache utilities for users data
const { loadCacheData, saveCacheData } = await initCache('users');

// Cache management functions
const { updateWithCacheClear } = await cacheFunctions();

// ============================================================================
// USERS MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get single user
 * Server-side function to fetch a single user by ID or email
 * @param {Object} params - Query parameters
 * @param {string} params.userId - Search user by Key / ID
 * @param {string} params.email - Search user by email address
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} User data
 */
export const getUser = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('user', params);
        if (cachedData) return cachedData;

        const { userId, email } = params;

        let usersResponse;

        // Search by email if provided
        if (email) {
            usersResponse = await DBService.readBy('email', email, 'users');
        }
        // Otherwise search by userId
        else if (userId) {
            usersResponse = await DBService.read(userId, 'users');
            if (!usersResponse?.success) {
                usersResponse = await DBService.readBy('id', userId, 'users');
            }
        }
        // No search parameters provided
        else {
            return {
                success: false,
                error: 'User ID or email is required',
                data: []
            };
        }

        if (!usersResponse?.success || !usersResponse.data || usersResponse.data.length === 0) {
            return {
                success: true,
                data: []
            };
        }

        const userData = usersResponse.data;

        // Calculate totalSpent and pendingSpent from user orders
        const userOrdersResult = await getAllOrders({ userId: userData.email, limit: 0 });
        const userOrders = userOrdersResult?.data || [];

        // Calculate totalSpent: orders with paymentStatus === 'paid' and status === 'complete'
        const totalSpent = userOrders
            .filter((order) => order.paymentStatus === 'paid' && order.status === 'complete')
            .reduce((sum, order) => sum + (order.total || 0), 0)
            .toFixed(2);

        // Calculate pendingSpent: orders with paymentStatus === 'paid' and status !== 'complete'
        const pendingSpent = userOrders
            .filter((order) => order.paymentStatus === 'paid' && order.status !== 'complete')
            .reduce((sum, order) => sum + (order.total || 0), 0)
            .toFixed(2);

        // Enrich userData with processed data
        const processedData = {
            ...userData,
            // Developer mode
            isDeveloper: userData.isDeveloper === true,
            // Referral data
            referralCode: userData.referralCode || null,
            referredBy: userData.referredBy || null,
            // Club data
            club: {
                clubMember: userData.clubMember || false,
                clubPoints: userData.clubPoints || 0,
                clubLevel: userData.clubLevel || null,
                totalSpent: parseFloat(totalSpent),
                pendingSpent: parseFloat(pendingSpent),
                claimedRewards: userData.claimedRewards || [],
                pointsHistory: userData.pointsHistory || []
            },
            // User preferences
            preferences: {
                emailNotifications: userData.emailNotifications ?? true,
                orderUpdates: userData.orderUpdates ?? true,
                marketingEmails: userData.marketingEmails ?? true,
                newsletter: userData.newsletter ?? true,
                smsNotifications: userData.smsNotifications ?? false
            }
        };

        const result = {
            success: true,
            data: processedData
        };

        // Cache the result
        await saveCacheData('user', params, result);
        return result;
    } catch (error) {
        return {
            success: false,
            error: 'Failed to fetch user',
            message: error.message,
            data: []
        };
    }
};

/**
 * Get all users
 * Server-side function to fetch all users with pagination support
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search query
 * @param {string} params.role - Search user by Role ID (user/admin/etc)
 * @param {string} params.startDate - Filter users from this date (YYYY-MM-DD) (optional)
 * @param {string} params.endDate - Filter users to this date (YYYY-MM-DD) (optional)
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Users data with pagination info
 */
export const getAllUsers = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('accounts', params);
        if (cachedData) return cachedData;

        const { page = 1, limit = 10, search = '', role = '', startDate = '', endDate = '' } = params;

        const usersResponse = await DBService.readAll('users');

        if (!usersResponse?.success || !usersResponse.data || Object.keys(usersResponse.data).length === 0) {
            return {
                success: true,
                data: [],
                pagination: {
                    totalItems: 0,
                    currentPage: 1,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }

        const allUsers = usersResponse.data;
        // Convert object to array
        let usersArray = Array.isArray(allUsers)
            ? allUsers
            : Object.entries(allUsers).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Apply search filter
        if (search?.trim()) {
            const searchLower = search.toLowerCase();
            usersArray = usersArray.filter(
                (user) =>
                    user.displayName?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower)
            );
        }

        // Filter users by role if provided
        if (role) {
            usersArray = usersArray.filter((user) => user.role === role);
        }

        // Apply date range filter
        if (startDate || endDate) {
            usersArray = usersArray.filter((user) => {
                const userDate = new Date(user.createdAt || user.created_at || user.date);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                // Set end date to end of day for inclusive filtering
                if (end) {
                    end.setHours(23, 59, 59, 999);
                }

                return (!start || userDate >= start) && (!end || userDate <= end);
            });
        }

        // Sort by creation date (newest first)
        usersArray.sort((a, b) => {
            const aDate = new Date(a.created_at || a.createdAt || a.id);
            const bDate = new Date(b.created_at || b.createdAt || b.id);
            return bDate - aDate;
        });

        // Calculate pagination
        const totalItems = usersArray.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedUsers = limit > 0 ? usersArray.slice(startIndex, endIndex) : usersArray;

        const result = {
            success: true,
            data: paginatedUsers,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('accounts', params, result);
        return result;
    } catch (error) {
        return {
            success: false,
            error: 'Failed to fetch users',
            message: error.message,
            data: [],
            pagination: {
                totalItems: 0,
                currentPage: 1,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }
};

/**
 * Get all roles
 * Server-side function to fetch all roles
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search query
 * @param {Object} params.options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Roles data with pagination info
 */
export const getAllRoles = async (params = {}) => {
    try {
        // Check cache first
        const cachedData = await loadCacheData('roles', params);
        if (cachedData) return cachedData;

        const { page = 1, limit = 10, search = '' } = params;

        const rolesResponse = await DBService.readAll('roles');

        if (!rolesResponse?.success || !rolesResponse.data || Object.keys(rolesResponse.data).length === 0) {
            return {
                success: true,
                data: [],
                pagination: {
                    totalItems: 0,
                    currentPage: 1,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }

        const roles = rolesResponse.data;
        // Convert object to array
        let rolesArray = Array.isArray(roles)
            ? roles
            : Object.entries(roles).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        // Apply search filter
        if (search?.trim()) {
            const searchLower = search.toLowerCase();
            rolesArray = rolesArray.filter(
                (role) =>
                    role.name?.toLowerCase().includes(searchLower) ||
                    role.id?.toLowerCase().includes(searchLower) ||
                    role.description?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by creation date (newest first)
        rolesArray.sort((a, b) => {
            const aDate = new Date(a.createdAt || a.id);
            const bDate = new Date(b.createdAt || b.id);
            return bDate - aDate;
        });

        // Calculate pagination
        const totalItems = rolesArray.length;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        const startIndex = limit > 0 ? (page - 1) * limit : 0;
        const endIndex = limit > 0 ? startIndex + limit : totalItems;
        const paginatedRoles = limit > 0 ? rolesArray.slice(startIndex, endIndex) : rolesArray;

        const result = {
            success: true,
            data: paginatedRoles,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages,
                hasNext: limit > 0 ? page < totalPages : false,
                hasPrev: limit > 0 ? page > 1 : false
            }
        };

        // Cache the result
        await saveCacheData('roles', params, result);
        return result;
    } catch (error) {
        return {
            success: false,
            error: 'Failed to fetch roles',
            message: error.message,
            data: [],
            pagination: {
                totalItems: 0,
                currentPage: 1,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }
};

/**
 * Change user password
 * @param {string} userKey - User key from session
 * @param {string} currentPassword - Current password (decrypted)
 * @param {string} newPassword - New password (decrypted)
 * @returns {Promise<Object>} Update result
 */
export const changeUserPassword = async (userKey, currentPassword, newPassword) => {
    try {
        if (!userKey || !currentPassword || !newPassword) {
            return { success: false, error: 'Todos os campos são obrigatórios' };
        }

        // Validate new password complexity (same as auth handler)
        const passwordValid = (pwd) => {
            return (
                pwd.length >= 8 &&
                pwd.length <= 32 &&
                /[a-z]/.test(pwd) &&
                /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
            );
        };

        if (!passwordValid(newPassword)) {
            return {
                success: false,
                error: 'A palavra-passe deve ter pelo menos 8 caracteres com minúsculas e uma maiúscula ou número'
            };
        }

        // Get user directly by key
        const userResponse = await DBService.read(userKey, 'users');

        if (!userResponse?.success || !userResponse.data) {
            return { success: false, error: 'Utilizador não encontrado' };
        }

        const user = userResponse.data;

        // Validate current password
        const isValidPassword = await validatePassword(currentPassword, user.salt, user.password);

        if (!isValidPassword) {
            return { success: false, error: 'Palavra-passe atual incorreta' };
        }

        // Generate new salt and encrypt new password (same as auth handler)
        const newSalt = await generateSalt();
        const encryptedNewPassword = await encryptPassword(newPassword, newSalt);

        // Update user with new password and salt
        const updateResult = await updateWithCacheClear(
            userKey,
            {
                password: encryptedNewPassword,
                salt: newSalt,
                updatedAt: new Date().toISOString()
            },
            'users',
            ['users', 'web_stats']
        );

        if (!updateResult?.success) {
            return { success: false, error: 'Falha ao atualizar palavra-passe' };
        }

        return { success: true, message: 'Palavra-passe alterada com sucesso' };
    } catch (error) {
        return { success: false, error: 'Erro ao alterar palavra-passe' };
    }
};

/**
 * Mark user account for deletion (30-day suspension before permanent deletion)
 * @param {string} userKey - User key from session
 * @param {string} currentPassword - Current password for verification (decrypted)
 * @returns {Promise<Object>} Deletion result
 */
export const deleteUserAccount = async (userKey, currentPassword) => {
    try {
        if (!userKey || !currentPassword) {
            return { success: false, error: 'Chave do utilizador e palavra-passe são obrigatórios' };
        }

        // Get user directly by key
        const userResponse = await DBService.read(userKey, 'users');

        if (!userResponse?.success || !userResponse.data) {
            return { success: false, error: 'Utilizador não encontrado' };
        }

        const user = userResponse.data;

        // Validate current password
        const isValidPassword = await validatePassword(currentPassword, user.salt, user.password);

        if (!isValidPassword) {
            return { success: false, error: 'Palavra-passe incorreta' };
        }

        // Calculate deletion date (30 days from now)
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 30);

        // Mark account for deletion (suspend)
        const updateResult = await updateWithCacheClear(
            userKey,
            {
                accountStatus: 'suspended',
                suspensionReason: 'user_requested_deletion',
                suspendedAt: new Date().toISOString(),
                scheduledDeletionAt: deletionDate.toISOString(),
                updatedAt: new Date().toISOString()
            },
            'users',
            ['users', 'club', 'web_stats']
        );

        if (!updateResult?.success) {
            return { success: false, error: 'Falha ao processar pedido de eliminação' };
        }

        return {
            success: true,
            message: 'Conta suspensa com sucesso',
            deletionDate: deletionDate.toISOString()
        };
    } catch (error) {
        return { success: false, error: 'Erro ao processar pedido de eliminação' };
    }
};

/**
 * Update user preferences
 * @param {string} userKey - User key from session
 * @param {Object} preferences - User preferences object
 * @returns {Promise<Object>} Update result
 */
export const updateUserPreferences = async (userKey, preferences) => {
    try {
        if (!userKey) {
            return { success: false, error: 'Chave do utilizador é obrigatória' };
        }

        // Prepare update data with preferences
        const updateData = {
            emailNotifications: preferences.emailNotifications ?? false,
            orderUpdates: preferences.orderUpdates ?? false,
            marketingEmails: preferences.marketingEmails ?? false,
            newsletter: preferences.newsletter ?? false,
            smsNotifications: preferences.smsNotifications ?? false,
            updatedAt: new Date().toISOString()
        };

        // Update user preferences
        const result = await updateWithCacheClear(userKey, updateData, 'users', [
            'users',
            'orders',
            'store',
            'newsletter',
            'subscribers',
            'club',
            'web_stats'
        ]);

        if (!result?.success) {
            return { success: false, error: 'Falha ao atualizar preferências' };
        }

        return { success: true, data: updateData };
    } catch (error) {
        return { success: false, error: 'Falha ao atualizar preferências' };
    }
};

/**
 * Update user profile information
 * @param {string} userKey - User key from session
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Update result
 */
export const updateUserProfile = async (userKey, profileData) => {
    try {
        if (!userKey) {
            return { success: false, error: 'Chave do utilizador é obrigatória' };
        }

        // Validate displayName if provided
        if (profileData.displayName !== undefined) {
            const displayName = profileData.displayName.trim();
            if (!displayName || displayName.length < 2) {
                return { success: false, error: 'O nome deve ter pelo menos 2 caracteres' };
            }
            if (displayName.length > 50) {
                return { success: false, error: 'O nome não pode ter mais de 50 caracteres' };
            }
            profileData.displayName = displayName;
        }

        // Prepare update data
        const updateData = {
            ...profileData,
            updatedAt: new Date().toISOString()
        };

        // Update user profile
        const result = await updateWithCacheClear(userKey, updateData, 'users', [
            'users',
            'orders',
            'store',
            'newsletter',
            'subscribers',
            'club',
            'web_stats'
        ]);

        if (!result?.success) {
            return { success: false, error: 'Falha ao atualizar perfil' };
        }

        return { success: true, data: updateData };
    } catch (error) {
        return { success: false, error: 'Falha ao atualizar perfil' };
    }
};

/**
 * Get user referrals
 * @param {string} userKey - User key from session
 * @returns {Promise<Object>} Referrals result
 */
export const getUserReferrals = async (referralCode) => {
    try {
        if (!referralCode) {
            return {
                success: true,
                data: []
            };
        } 

        // Get all users to find those referred by this user
        const allUsersResult = await getAllUsers({ limit: 0 });
        if (!allUsersResult?.success || !allUsersResult.data) {
            return {
                success: true,
                data: []
            };
        }

        // Filter users who were referred by this user
        const referredUsers = allUsersResult.data.filter((u) => u.referredBy === referralCode);

        // Map to return only necessary data
        const referrals = referredUsers.map((u) => ({
            key: u.key || u.id,
            id: u.id,
            displayName: u.displayName,
            email: u.email,
            createdAt: u.createdAt,
            role: u.role
        }));

        return {
            success: true,
            data: referrals
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to get referrals'
        };
    }
};

/**
 * Update developer mode status
 * @param {string} userKey - User key from session
 * @param {boolean} isDeveloper - Developer mode status
 * @returns {Promise<Object>} Update result
 */
export const updateDeveloperMode = async (userKey, isDeveloper) => {
    try {
        if (!userKey) {
            return { success: false, error: 'User key is required' };
        }

        // First verify the user exists and get the actual database key
        let userResponse = await DBService.read(userKey, 'users');
        let actualKey = userKey;

        if (!userResponse?.success) {
            userResponse = await DBService.readBy('id', userKey, 'users');

            // If found by id, get the actual key from the response
            if (userResponse?.success && userResponse.data) {
                actualKey = userResponse.data.key || userResponse.data._key || userKey;
            }
        }

        if (!userResponse?.success || !userResponse.data) {
            return { success: false, error: 'User not found' };
        }

        // Update developer mode status with cache clear using the actual database key
        const result = await updateWithCacheClear(
            actualKey,
            {
                isDeveloper: isDeveloper === true,
                updatedAt: new Date().toISOString()
            },
            'users',
            ['users', 'web_stats']
        );

        if (!result?.success) {
            const errorMsg = result?.error || result?.message || 'Failed to update developer mode';
            return { success: false, error: errorMsg };
        }

        return {
            success: true,
            message: 'Developer mode updated successfully',
            data: { isDeveloper }
        };
    } catch (error) {
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
};

/**
 * Create a new user (for order customers - no password required)
 * Used when creating users from order customer data
 * @param {Object} userData - User data to create
 * @returns {Promise<Object>} Created user result
 */
export async function createUser(userData) {
    try {
        if (!userData || !userData.email) {
            return {
                success: false,
                error: 'Missing user email',
                message: 'User email is required'
            };
        }

        // Check if user already exists
        const existingUser = await getUser({ email: userData.email });
        if (existingUser?.success && existingUser?.data && existingUser?.data.email === userData.email) {
            return {
                success: false,
                error: 'User already exists',
                message: 'A user with this email already exists'
            };
        }

        const timeNow = new Date().toISOString();

        // Generate unique ID matching auth registration pattern
        const { v6: uuidv6 } = await import('uuid');
        const uniqueId = userData.id || uuidv6();

        // Generate referral code (6 characters)
        const generateReferralCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        const userReferralCode = generateReferralCode();

        // Handle password encryption if plainPassword is provided (matching handleRegistration pattern)
        let encryptedPassword = '';
        let passwordSalt = '';

        if (userData.plainPassword) {
            // Generate salt and encrypt password (same method as handleRegistration)
            passwordSalt = await generateSalt();
            encryptedPassword = await encryptPassword(userData.plainPassword, passwordSalt);
        }

        // Prepare user data matching getUser and handleRegistration structure
        const newUser = {
            id: uniqueId,
            email: userData.email,
            displayName: userData.displayName || userData.email,
            phone: userData.phone || '',
            country: userData.country || '',
            role: userData.role || 'user',
            emailVerified: false,
            password: encryptedPassword, // Encrypted password or empty if not provided
            salt: passwordSalt, // Salt or empty if no password
            // Referral data
            referralCode: userReferralCode,
            referredBy: userData.referredBy || null,
            // Preferences matching auth registration defaults
            emailNotifications: userData.emailNotifications ?? true,
            orderUpdates: userData.orderUpdates ?? true,
            marketingEmails: userData.marketingEmails ?? true,
            newsletter: userData.newsletter ?? true,
            smsNotifications: userData.smsNotifications ?? true,
            // Club data matching getUser structure
            clubMember: userData.clubMember || false,
            clubPoints: userData.clubPoints || 0,
            clubLevel: userData.clubLevel || null,
            claimedRewards: userData.claimedRewards || [],
            pointsHistory: userData.pointsHistory || [],
            // Developer mode
            isDeveloper: userData.isDeveloper || false,
            createdAt: timeNow,
            updatedAt: timeNow
        };

        // Setup Web3 wallet if enabled (matching handleRegistration pattern)
        try {
            const { createWallet, loadWeb3Config } = await import('@/lib/server/web3.js');
            const web3load = await loadWeb3Config();
            const web3active = web3load?.WEB3_ACTIVE > 0;

            if (web3active) {
                const web3Salt = await generateSalt();
                const web3create = await createWallet();

                if (web3create?.address && web3create?.privateKey) {
                    const encryptedPrivateKey = await encryptPassword(web3create.privateKey, web3Salt);
                    newUser.web3 = {
                        salt: web3Salt,
                        public_key: web3create.address,
                        private_key: encryptedPrivateKey,
                        createdAt: timeNow
                    };
                }
            }
        } catch (web3Error) {
            console.error('Web3 setup error:', web3Error);
            // Continue without web3 if it fails
        }

        const { createWithCacheClear } = await cacheFunctions();
        const result = await createWithCacheClear(newUser, 'users', [
            'users',
            'orders',
            'store',
            'newsletter',
            'subscribers',
            'club',
            'web_stats'
        ]);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to create user',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            action: 'created',
            data: result.data,
            message: 'User created successfully'
        };
    } catch (error) {
        console.error('Error in createUser:', error);
        return {
            success: false,
            error: 'Failed to create user',
            message: error.message
        };
    }
}

/**
 * Create user from customer order data (without password)
 * Used when processing orders from non-registered users
 * @param {Object} customerData - Customer data from order
 * @returns {Promise<Object>} Created user result
 */
export async function createUserFromCustomer(orderData) {

    try {
        const customerData = orderData?.customer;
        if (!orderData || !customerData || !customerData?.email) {
            return {
                success: false,
                error: 'Missing customer email',
                message: 'Customer email is required'
            };
        }

        // Check if user already exists
        const existingUser = await getUser({ email: customerData.email });
        if (existingUser?.success && existingUser?.data && existingUser?.data.email === customerData.email) {
            // User exists, update with latest info if data has changed
            const userKey = existingUser.data.key || existingUser.data.id;
            const currentUser = existingUser.data;
            const updateData = {};

            // Build new display name from customer data
            const newDisplayName =
                customerData.firstName && customerData.lastName
                    ? `${customerData.firstName} ${customerData.lastName}`
                    : null;

            // Compare and update display name if different
            if (newDisplayName && currentUser.displayName !== newDisplayName) {
                updateData.displayName = newDisplayName;
            }

            // Compare and update phone if different and provided
            if (customerData.phone && currentUser.phone !== customerData.phone) {
                updateData.phone = customerData.phone;
            }

            // Compare and update country if different and provided
            if (customerData.country && currentUser.country !== customerData.country) {
                updateData.country = customerData.country;
            } 

            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
                updateData.updatedAt = new Date().toISOString();
                await updateWithCacheClear(userKey, updateData, 'users', [
                    'users',
                    'orders',
                    'store',
                    'newsletter',
                    'subscribers',
                    'club',
                    'web_stats'
                ]);
            }

            return {
                success: true,
                action: 'existing',
                data: existingUser.data,
                message: 'User already exists'
            };
        }

        // Prepare user data for createUser function
        const displayName =
            customerData.firstName && customerData.lastName
                ? `${customerData.firstName} ${customerData.lastName}`
                : customerData.email;

        const userData = {
            email: customerData.email,
            displayName,
            phone: customerData.phone || '',
            country: customerData.country || '',
            role: 'user'
        };

        // Use createUser function which handles creation and welcome email
        const result = await createUser(userData);

        return result;
    } catch (error) {
        console.error('Error in createUserFromCustomer:', error);
        return {
            success: false,
            error: 'Failed to create user',
            message: error.message
        };
    }
}

/**
 * Update an existing user (admin function)
 * @param {string} userKey - User key or ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} Updated user result
 */
export async function updateUser(userKey, userData) {
    try {
        if (!userKey) {
            return {
                success: false,
                error: 'User key is required'
            };
        }

        // Handle password encryption if being updated
        if (userData.password) {
            const salt = generateSalt();
            userData.password = await encryptPassword(userData.password, salt);
            userData.salt = salt;
        }

        // Add updated timestamp
        userData.updatedAt = new Date().toISOString();

        const result = await updateWithCacheClear(userKey, userData, 'users', [
            'users',
            'orders',
            'store',
            'newsletter',
            'subscribers',
            'club',
            'web_stats'
        ]);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to update user',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            data: result.data,
            message: 'User updated successfully'
        };
    } catch (error) {
        console.error('Error updating user:', error);
        return {
            success: false,
            error: 'Failed to update user',
            message: error.message
        };
    }
}

/**
 * Delete a user (admin function)
 * @param {string} userKey - User key or ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteUser(userKey) {
    try {
        if (!userKey) {
            return {
                success: false,
                error: 'User key is required'
            };
        }

        const { deleteWithCacheClear } = await cacheFunctions();
        const result = await deleteWithCacheClear(userKey, 'users', [
            'users',
            'orders',
            'store',
            'newsletter',
            'subscribers',
            'club',
            'web_stats'
        ]);

        if (!result?.success) {
            return {
                success: false,
                error: 'Failed to delete user',
                message: result?.message || 'Database operation failed'
            };
        }

        return {
            success: true,
            message: 'User deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting user:', error);
        return {
            success: false,
            error: 'Failed to delete user',
            message: error.message
        };
    }
}
