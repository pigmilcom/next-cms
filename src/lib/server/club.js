// @/lib/server/club.js

'use server';

import DBService from '@/data/rest.db.js';
import { generateUID } from '@/lib/shared/helpers.js';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

import { cacheFunctions, initCache } from '@/lib/shared/cache.js';
import { email } from 'zod';

// Initialize cache utilities for club data
const { loadCacheData, saveCacheData } = await initCache('club');

// Import universal cache management functions
const { createWithCacheClear, updateWithCacheClear, deleteWithCacheClear } = await cacheFunctions();

// ============================================================================
// CLUB MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get all club settings
 * Server-side function to fetch club settings with levels, rewards, and config
 * @param {Object} options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Club settings with levels, rewards, and config
 */
export const getClubSettings = async (options = {}) => {
    try {
        // Check cache first
        const params = { options };
        const cached = await loadCacheData('settings', params);
        if (cached) return cached;

        const settingsResponse = await DBService.readAll('club');

        if (!settingsResponse?.success || !settingsResponse.data || Object.keys(settingsResponse.data).length === 0) {
            return {
                success: true,
                data: {
                    enabled: false,
                    levels: [],
                    rewards: [],
                    pointsPerEuro: 10,
                    voucherExchangeRate: 100, // 100 points = 1 EUR voucher
                    enabledFeatures: {
                        pointsForOrders: true,
                        levelMultipliers: true,
                        rewardClaims: true,
                        voucherExchange: true
                    }
                }
            };
        }

        const allSettings = settingsResponse.data;
        let settingsObj = null;

        if (Array.isArray(allSettings)) {
            settingsObj = allSettings[0];
        } else if (allSettings && typeof allSettings === 'object') {
            // Database may return object with timestamp keys - extract first value
            const keys = Object.keys(allSettings);
            settingsObj = keys.length > 0 ? allSettings[keys[0]] : null;
        }

        const result = {
            success: true,
            data: settingsObj || {
                enabled: false,
                levels: [],
                rewards: [],
                pointsPerEuro: 10, // Default to 10 points per euro (matches admin panel)
                voucherExchangeRate: 100,
                enabledFeatures: {
                    pointsForOrders: true,
                    levelMultipliers: true,
                    rewardClaims: true,
                    voucherExchange: true
                }
            }
        };

        // Cache the result
        await saveCacheData('settings', params, result);
        return result;
    } catch (error) {
        console.error('Error getting club settings:', error);
        return {
            success: false,
            error: 'Failed to fetch club settings',
            message: error.message
        };
    }
};

/**
 * Award points to user
 * @param {string} userId - User email
 * @param {number} points - Points to award
 * @param {string} reason - Reason for points
 * @param {string} orderId - Related order ID (optional)
 * @returns {Promise<Object>} Award result
 */
export async function awardPointsToUser(userId, points, reason, orderId = null) {
    try { 
        const { getUser } = await import('@/lib/server/users.js');
        const userResponse = await getUser({email: userId});
        
        if (!userResponse?.success || !userResponse.data) {
            return {
                success: false,
                error: 'User not found',
                message: 'User with provided email does not exist'
            };
        }

        const user = userResponse.data;
        const currentPoints = user.club?.clubPoints || 0;
        const newPoints = currentPoints + points;

        const pointsHistory = user.club?.pointsHistory || [];
        pointsHistory.push({
            points,
            reason,
            orderId,
            timestamp: new Date().toISOString(),
            type: 'earned'
        });

        // Use user key directly
        const userKey = user.key || user.id;

        if (!userKey) {
            return {
                success: false,
                error: 'Failed to get user key',
                message: 'Could not retrieve user record key'
            };
        }

        await updateWithCacheClear(
            userKey,
            {  
                clubPoints: newPoints,
                pointsHistory
            },
            'users',
            ['club', 'users']
        );

        return { success: true, data: { newPoints, awarded: points } };
    } catch (error) {
        console.error('Error awarding points:', error);
        return {
            success: false,
            error: 'Failed to award points',
            message: error.message
        };
    }
}

/**
 * Deduct points from user
 * @param {string} userId - User email
 * @param {number} points - Points to deduct
 * @param {string} reason - Reason for deduction
 * @returns {Promise<Object>} Deduction result
 */
export async function deductPointsFromUser(userId, points, reason) {
    try {
        const userResponse = await DBService.readBy('email', userId, 'users');

        if (!userResponse?.success || !userResponse.data) {
            return {
                success: false,
                error: 'User not found',
                message: 'User with provided email does not exist'
            };
        }

        const user = userResponse.data;
        const currentPoints = user.clubPoints || 0;

        if (currentPoints < points) {
            return {
                success: false,
                error: 'Insufficient points',
                message: `User only has ${currentPoints} points, cannot deduct ${points}`
            };
        }

        const newPoints = currentPoints - points;

        const pointsHistory = user.pointsHistory || [];
        pointsHistory.push({
            points: -points,
            reason,
            timestamp: new Date().toISOString(),
            type: 'spent'
        });

        // Use user key directly
        const userKey = user.key || user.id;

        if (!userKey) {
            return {
                success: false,
                error: 'Failed to get user key',
                message: 'Could not retrieve user record key'
            };
        }

        await updateWithCacheClear(
            userKey,
            {
                clubPoints: newPoints,
                pointsHistory
            },
            'users',
            ['club', 'users']
        );

        return { success: true, data: { newPoints, deducted: points } };
    } catch (error) {
        console.error('Error deducting points:', error);
        return {
            success: false,
            error: 'Failed to deduct points',
            message: error.message
        };
    }
}

/**
 * Calculate order points without awarding them to user
 * @param {number} orderTotal - Order total amount
 * @param {string} userEmail - User email (optional for level multiplier)
 * @returns {Promise<Object>} Calculated points result
 */
export async function calculateOrderPoints(orderTotal, userEmail = null) {
    try {
        // Get club settings
        const clubSettings = await getClubSettings();

        if (!clubSettings?.success || !clubSettings.data?.enabled) {
            return {
                success: true,
                data: { clubPoints: 0 },
                message: 'Club program not enabled'
            };
        }

        const settings = clubSettings.data;

        if (!settings.enabledFeatures?.pointsForOrders) {
            return {
                success: true,
                data: { clubPoints: 0 },
                message: 'Points for orders feature is disabled'
            };
        }

        // Calculate base points
        const basePoints = Math.floor(orderTotal * (settings.pointsPerEuro || 10));

        // Apply level multiplier if user email is provided
        let multiplier = 1;
        if (userEmail && settings.enabledFeatures?.levelMultipliers) {
            const userResponse = await DBService.readBy('email', userEmail, 'users');
            if (userResponse?.success && userResponse.data) {
                const user = userResponse.data;
                const userLevel = user.clubLevel || 'Bronze';
                const level = settings.levels?.find((l) => l.name === userLevel);
                multiplier = level?.pointsMultiplier || 1;
            }
        }

        const totalPoints = Math.floor(basePoints * multiplier);

        return {
            success: true,
            data: { clubPoints: totalPoints }
        };
    } catch (error) {
        console.error('Error calculating order points:', error);
        return {
            success: false,
            error: 'Failed to calculate order points',
            message: error.message,
            data: { clubPoints: 0 }
        };
    }
}

/**
 * Calculate and award points for an order based on current club settings
 * Prevents duplicate awards by checking order.clubPointsAwardedAt
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Award result
 */
export async function processOrderPoints(order) {
    try { 

        if (order.clubPointsAwardedAt) {
            return {
                success: true,
                message: 'Points already awarded for this order',
                data: {
                    pointsAwarded: 0,
                    alreadyAwarded: true,
                    clubPoints: order.clubPoints || 0
                }
            };
        }

        const clubSettings = await getClubSettings();
        if (!clubSettings?.success || !clubSettings.data?.enabled) {
            return {
                success: true,
                message: 'Club program not enabled',
                data: { pointsAwarded: 0 }
            };
        }

        if (!clubSettings.data?.enabledFeatures?.pointsForOrders) {
            return {
                success: true,
                message: 'Points for orders feature is disabled',
                data: { pointsAwarded: 0 }
            };
        }

        const userEmail = order.cst_email || order.customer?.email;
        const orderTotal = parseFloat(order.finalTotal || order.total || 0);

        if (!userEmail) {
            return {
                success: false,
                error: 'Customer email not found in order',
                message: 'Cannot process points without customer email'
            };
        }

        if (orderTotal <= 0) {
            return {
                success: true,
                message: 'No valid order total to calculate points',
                data: { pointsAwarded: 0 }
            };
        }

        let calculatedPointsResult = order.clubPoints || null;
        
        if (!calculatedPointsResult) {
            calculatedPointsResult = await calculateOrderPoints(orderTotal, userEmail); 
            if (!calculatedPointsResult.success) {
                return {
                success: false,
                error: calculatedPointsResult?.error || 'Failed to calculate points'
                };
            } else {
                calculatedPointsResult = calculatedPointsResult.data.clubPoints || 0;
            }
        }
        
        const clubPoints = calculatedPointsResult || 0;

        if (clubPoints <= 0) {
            return {
                success: true,
                message: 'No points to award for this order',
                data: { pointsAwarded: 0 }
            };
        }

        // Award points using calculated value
        const result = await awardPointsToUser(userEmail, clubPoints, `Order #${order.id}`, order.id);

        if (result.success) {
            const orderKey = order.key || order.id || order.id;
            const timestamp = new Date().toISOString();

            await updateWithCacheClear(
                orderKey,
                {
                    clubPoints,
                    clubPointsAwardedAt: timestamp,
                    clubPointsAwardedStatus: order.status,
                    updatedAt: timestamp
                },
                'orders',
                ['store', 'orders', 'users', 'newsletter', 'club', 'web_stats']
            );

            await updateUserClubLevel(userEmail);

            return {
                success: true,
                data: {
                    pointsAwarded: clubPoints,
                    clubPoints,
                    alreadyAwarded: false
                }
            };
        }

        return result;
    } catch (error) {
        console.error('Error processing order points:', error);
        return {
            success: false,
            error: 'Failed to process order points',
            message: error.message
        };
    }
}

/**
 * Sync order points based on target status
 * Awards points on delivered/complete and reverts points when moving away
 * @param {string} orderId - Order ID
 * @param {string} targetStatus - New order status
 * @returns {Promise<Object>} Sync result
 */
export async function syncOrderPointsByStatus(order) {
    try { 
        const currentOrderPoints = order.clubPoints || 0;
        const targetStatus = order.status;
        const eligibleStatuses = ['delivered', 'complete'];
        const isEligibleStatus = eligibleStatuses.includes(targetStatus);

        if (currentOrderPoints > 0 && isEligibleStatus) {
            const awardResult = await processOrderPoints(order);
            return {
                success: !!awardResult?.success,
                data: {
                    pointsAwarded: awardResult?.data?.pointsAwarded || 0,
                    pointsDeducted: 0,
                    alreadyAwarded: awardResult?.data?.alreadyAwarded || false
                },
                message: awardResult?.message,
                error: awardResult?.error
            };
        }

        if (!order.clubPointsAwardedAt) {
            return {
                success: true,
                data: {
                    pointsAwarded: 0,
                    pointsDeducted: 0,
                    alreadyReverted: true
                },
                message: 'No awarded points to revert for this order'
            };
        }

        const clubSettings = await getClubSettings();
        if (!clubSettings?.success || !clubSettings.data?.enabled || !clubSettings.data?.enabledFeatures?.pointsForOrders) {
            return {
                success: true,
                data: {
                    pointsAwarded: 0,
                    pointsDeducted: 0
                },
                message: 'Club points sync skipped (feature disabled)'
            };
        }

        const userEmail = order.cst_email || order.customer?.email;
        const pointsToDeduct = parseInt(order.clubPoints || 0, 10);

        if (!userEmail || pointsToDeduct <= 0) {
            const orderKey = order.key || order.id || orderId;
            const timestamp = new Date().toISOString();

            await updateWithCacheClear(
                orderKey,
                {
                    clubPointsAwardedAt: null,
                    clubPointsAwardedStatus: targetStatus,
                    updatedAt: timestamp
                },
                'orders',
                ['store', 'orders', 'users', 'newsletter', 'club', 'web_stats']
            );

            return {
                success: true,
                data: {
                    pointsAwarded: 0,
                    pointsDeducted: 0
                },
                message: 'Order points metadata cleared'
            };
        }

        const deductResult = await deductPointsFromUser(
            userEmail,
            pointsToDeduct,
            `Order #${orderId} status changed to ${targetStatus} (points reverted)`
        );

        if (!deductResult?.success) {
            return {
                success: false,
                error: deductResult?.error || 'Failed to deduct points',
                message: deductResult?.message
            };
        }

        const orderKey = order.key || order.id || orderId;
        const timestamp = new Date().toISOString();

        await updateWithCacheClear(
            orderKey,
            {
                clubPointsAwardedAt: null,
                clubPointsAwardedStatus: targetStatus,
                updatedAt: timestamp
            },
            'orders',
            ['store', 'orders', 'users', 'newsletter', 'club', 'web_stats']
        );

        await updateUserClubLevel(userEmail);

        return {
            success: true,
            data: {
                pointsAwarded: 0,
                pointsDeducted: pointsToDeduct,
                alreadyReverted: false
            }
        };
    } catch (error) {
        console.error('Error syncing order points by status:', error);
        return {
            success: false,
            error: 'Failed to sync order points',
            message: error.message
        };
    }
}

/**
 * Update user club level based on total spent
 * @param {string} userId - User email
 * @returns {Promise<Object>} Update result
 */
export async function updateUserClubLevel(userId) {
    try {
        const userResponse = await DBService.read(userId, 'users');

        if (!userResponse?.success || !userResponse.data) {
            return {
                success: false,
                error: 'User not found',
                message: 'User with provided email does not exist'
            };
        }

        const user = userResponse.data;
        const clubSettings = await getClubSettings();

        if (!clubSettings?.success || !clubSettings.data?.enabled) {
            return {
                success: true,
                message: 'Club program not enabled',
                data: { upgraded: false }
            };
        }

        // Calculate totalSpent and pendingSpent from user orders
        const { getAllOrders } = await import('@/lib/server/orders.js');
        const userOrdersResult = await getAllOrders({ userId: userId, limit: 0 });
        const userOrders = userOrdersResult?.data || [];

        // Calculate totalSpent: orders with paymentStatus === 'paid' and status === 'complete'
        const totalSpent = userOrders
            .filter((order) => order.paymentStatus === 'paid' && order.status === 'complete')
            .reduce((sum, order) => sum + (order.finalTotal || order.total || 0), 0);

        // Calculate pendingSpent: orders with paymentStatus === 'paid' and status !== 'complete'
        const pendingSpent = userOrders
            .filter((order) => order.paymentStatus === 'paid' && order.status !== 'complete')
            .reduce((sum, order) => sum + (order.finalTotal || order.total || 0), 0);

        const levels = clubSettings.data.levels || [];

        // Sort levels by minSpend
        const sortedLevels = levels.sort((a, b) => (b.minSpend || 0) - (a.minSpend || 0));

        // Find highest level user qualifies for
        const newLevel = sortedLevels.find((level) => totalSpent >= (level.minSpend || 0));

        // Use user key directly
        const userKey = user.key || user.id;

        if (!userKey) {
            return {
                success: false,
                error: 'Failed to get user key',
                message: 'Could not retrieve user record key'
            };
        }

        // Update user with totalSpent, pendingSpent, and level
        const updateData = {
            totalSpent: parseFloat(totalSpent.toFixed(2)),
            pendingSpent: parseFloat(pendingSpent.toFixed(2))
        };

        // Only update clubLevel if it changed
        if (newLevel && newLevel.name !== user.clubLevel) {
            updateData.clubLevel = newLevel.name;
        }

        await updateWithCacheClear(userKey, updateData, 'users', ['club', 'users']);

        return {
            success: true,
            data: {
                totalSpent,
                pendingSpent,
                newLevel: newLevel?.name || user.clubLevel,
                upgraded: newLevel && newLevel.name !== user.clubLevel
            }
        };
    } catch (error) {
        console.error('Error updating user club level:', error);
        return {
            success: false,
            error: 'Failed to update user club level',
            message: error.message
        };
    }
}

/**
 * Exchange points for voucher
 * @param {string} userId - User email
 * @param {number} points - Points to exchange
 * @returns {Promise<Object>} Exchange result with coupon code
 */
export async function exchangePointsForVoucher(userId, points) {
    try {
        const clubSettings = await getClubSettings();

        if (!clubSettings.success || !clubSettings.data.enabled) {
            return { success: false, error: 'Club program not enabled' };
        }

        const settings = clubSettings.data;

        if (!settings.enabledFeatures?.voucherExchange) {
            return { success: false, error: 'Voucher exchange not enabled' };
        }

        // Calculate voucher value
        const voucherValue = points / (settings.voucherExchangeRate || 100);

        if (voucherValue < 1) {
            return { success: false, error: 'Minimum voucher value is 1 EUR' };
        }

        // Deduct points
        const deductResult = await deductPointsFromUser(
            userId,
            points,
            `Exchanged for ${voucherValue.toFixed(2)} EUR voucher`
        );

        if (!deductResult.success) {
            return deductResult;
        }

        // Generate unique coupon code and ID (following same pattern as admin coupons)
        const couponCode = `CLUB${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const timestamp = new Date().toISOString();

        // Create coupon with complete structure (matching getCoupons/validateCoupon pattern)
        const couponData = {
            id: generateUID('CC'), // Unique coupon ID
            code: couponCode,
            name: `Club Voucher - €${voucherValue.toFixed(2)}`,
            description: `Redeemed from ${points} club points by ${userId}`,
            type: 'fixed',
            value: voucherValue,
            minAmount: 0,
            maxAmount: 0,
            targetType: 'specific',
            targetEmail: userId,
            usageType: 'single',
            usageLimit: 1,
            usedCount: 0,
            startDate: timestamp,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 365 days
            hasExpiration: true,
            isActive: true,
            isUnlimited: false,
            freeShipping: false,
            firstPurchaseOnly: false,
            isClubVoucher: true,
            clubPointsUsed: points,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        const coupon = await createWithCacheClear(
            couponData,
            'coupons',
            ['club', 'store', 'users'] // Clear both club and store cache instances
        );

        if (!coupon?.success) {
            // Refund points if coupon creation failed
            await awardPointsToUser(userId, points, 'Refund - Coupon creation failed');
            return {
                success: false,
                error: 'Failed to create coupon',
                message: coupon?.message || 'Coupon creation error'
            };
        }

        return {
            success: true,
            data: {
                couponCode,
                couponId: couponData.id,
                voucherValue,
                pointsUsed: points,
                remainingPoints: deductResult.data.newPoints,
                expiresAt: couponData.expiresAt
            }
        };
    } catch (error) {
        console.error('Error exchanging points for voucher:', error);
        return {
            success: false,
            error: 'Failed to exchange points for voucher',
            message: error.message
        };
    }
}

/**
 * Claim reward for user
 * @param {string} userId - User email
 * @param {string} rewardId - Reward ID
 * @returns {Promise<Object>} Claim result
 */
export async function claimReward(userId, rewardId) {
    try {
        const userResponse = await DBService.readBy('email', userId, 'users');

        if (!userResponse?.success || !userResponse.data) {
            return {
                success: false,
                error: 'User not found',
                message: 'User with provided email does not exist'
            };
        }

        const user = userResponse.data;
        const clubSettings = await getClubSettings();

        if (!clubSettings?.success || !clubSettings.data?.enabled) {
            return {
                success: false,
                error: 'Club program not enabled',
                message: 'Club rewards system is currently disabled'
            };
        }

        const reward = clubSettings.data.rewards?.find((r) => r.id === rewardId);

        if (!reward) {
            return {
                success: false,
                error: 'Reward not found',
                message: `Reward with ID ${rewardId} does not exist`
            };
        }

        // Check if user qualifies
        const totalSpent = user.totalSpent || 0;

        if (totalSpent < (reward.minSpend || 0)) {
            return {
                success: false,
                error: 'Not eligible for this reward',
                message: `Minimum spend of ${reward.minSpend} required`
            };
        }

        // Check if already claimed
        const claimedRewards = user.claimedRewards || [];

        if (claimedRewards.includes(rewardId)) {
            return {
                success: false,
                error: 'Reward already claimed',
                message: 'This reward has already been claimed by the user'
            };
        }

        // Add to claimed rewards
        claimedRewards.push(rewardId);

        // Use user key directly
        const userKey = user.key || user.id;

        if (!userKey) {
            return {
                success: false,
                error: 'Failed to get user key',
                message: 'Could not retrieve user record key'
            };
        }

        await updateWithCacheClear(
            userKey,
            {
                claimedRewards
            },
            'users',
            ['club', 'users']
        );

        return { success: true, data: { reward, claimed: true } };
    } catch (error) {
        console.error('Error claiming reward:', error);
        return {
            success: false,
            error: 'Failed to claim reward',
            message: error.message
        };
    }
}

/**
 * Join club - Initialize user club data
 * User-facing action function
 * @returns {Promise<Object>} Join result
 */
export async function joinClub(userKey) {
    try {
        if (!userKey) {
            return {
                success: false,
                error: 'Falhou ao obter dados do utilizador'
            };
        }

        // Get user data
        const userResponse = await DBService.read(userKey, 'users');

        if (!userResponse?.success || !userResponse.data) {
            return {
                success: false,
                error: 'Utilizador não encontrado'
            };
        }

        const user = userResponse.data;

        // Check if already a member
        if (user.clubMember === true) {
            return {
                success: true,
                data: { alreadyMember: true },
                message: 'Já é membro do clube'
            };
        }

        // Initialize club data
        const clubData = {
            clubMember: true,
            clubPoints: user.clubPoints || 0,
            clubLevel: user.clubLevel || null,
            totalSpent: user.totalSpent || 0,
            pendingSpent: user.pendingSpent || 0,
            claimedRewards: user.claimedRewards || [],
            pointsHistory: user.pointsHistory || [],
            clubJoinedAt: new Date().toISOString()
        };

        await updateWithCacheClear(userKey, clubData, 'users', ['club', 'users']);

        return {
            success: true,
            data: clubData,
            message: 'Bem-vindo ao clube! Comece a ganhar pontos em cada compra.'
        };
    } catch (error) {
        console.error('Error in joinClub action:', error);
        return {
            success: false,
            error: 'Erro ao juntar-se ao clube',
            message: error.message
        };
    }
}

/**
 * Exchange points for voucher (user-facing action)
 * @param {number} points - Points to exchange
 * @returns {Promise<Object>} Exchange result
 */
export async function exchangePoints(points) {
    try {
        const { auth } = await import('@/auth');
        const session = await auth();

        if (!session?.user?.email) {
            return {
                success: false,
                error: 'Autenticação necessária'
            };
        }

        if (!points || points < 1) {
            return {
                success: false,
                error: 'Número de pontos inválido'
            };
        }

        const result = await exchangePointsForVoucher(session.user.email, points);

        if (!result.success) {
            return {
                success: false,
                error: result.error || 'Falha ao trocar pontos'
            };
        }

        return {
            success: true,
            data: result.data,
            message: `Cupão criado com sucesso: ${result.data.couponCode}`
        };
    } catch (error) {
        console.error('Error in exchangePoints action:', error);
        return {
            success: false,
            error: 'Erro ao trocar pontos',
            message: error.message
        };
    }
}

/**
 * Claim reward (user-facing action)
 * @param {string} rewardId - Reward ID to claim
 * @returns {Promise<Object>} Claim result
 */
export async function claimUserReward(rewardId) {
    try {
        const { auth } = await import('@/auth');
        const session = await auth();

        if (!session?.user?.email) {
            return {
                success: false,
                error: 'Autenticação necessária'
            };
        }

        if (!rewardId) {
            return {
                success: false,
                error: 'ID da recompensa inválido'
            };
        }

        const result = await claimReward(session.user.email, rewardId);

        if (!result.success) {
            return {
                success: false,
                error: result.error || 'Falha ao reclamar recompensa'
            };
        }

        return {
            success: true,
            data: result.data,
            message: `Recompensa "${result.data.reward.name}" reclamada com sucesso!`
        };
    } catch (error) {
        console.error('Error in claimUserReward action:', error);
        return {
            success: false,
            error: 'Erro ao reclamar recompensa',
            message: error.message
        };
    }
}

/**
 * Get club statistics
 * Server-side function to fetch club statistics
 * @param {Object} options - Optional fetch options (for Next.js revalidate)
 * @returns {Promise<Object>} Club statistics
 */
export const getClubStatistics = async (options = {}) => {
    try {
        // Check cache first
        const params = { options };
        const cached = await loadCacheData('statistics', params);
        if (cached) return cached;

        const usersResponse = await DBService.readAll('users');

        if (!usersResponse?.success || !usersResponse.data || Object.keys(usersResponse.data).length === 0) {
            return {
                success: true,
                data: {
                    totalMembers: 0,
                    totalPointsAwarded: 0,
                    levelDistribution: {},
                    averagePoints: 0
                }
            };
        }

        const allUsers = usersResponse.data;
        // Convert object to array (matches users.js pattern)
        const usersArray = Array.isArray(allUsers)
            ? allUsers
            : Object.entries(allUsers).map(([key, value]) => ({
                  ...value,
                  key,
                  id: value.id || value._id || key
              }));

        const clubUsers = usersArray.filter((u) => (u.clubPoints || 0) > 0);

        const stats = {
            totalMembers: clubUsers.length,
            totalPointsAwarded: clubUsers.reduce((sum, u) => sum + (u.clubPoints || 0), 0),
            levelDistribution: {},
            averagePoints:
                clubUsers.length > 0
                    ? Math.floor(clubUsers.reduce((sum, u) => sum + (u.clubPoints || 0), 0) / clubUsers.length)
                    : 0
        };

        // Calculate level distribution
        clubUsers.forEach((user) => {
            const level = user.clubLevel || 'Bronze';
            stats.levelDistribution[level] = (stats.levelDistribution[level] || 0) + 1;
        });

        const result = { success: true, data: stats };

        // Cache the result
        await saveCacheData('statistics', params, result);
        return result;
    } catch (error) {
        console.error('Error getting club statistics:', error);
        return {
            success: false,
            error: 'Failed to fetch club statistics',
            message: error.message,
            data: {
                totalMembers: 0,
                totalPointsAwarded: 0,
                levelDistribution: {},
                averagePoints: 0
            }
        };
    }
};
