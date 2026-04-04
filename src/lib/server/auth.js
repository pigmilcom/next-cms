// @/lib/server/auth.js
'use server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import DBService from '@/data/rest.db';
import { getUser } from './users';

export async function verifyToken(_request) {
    try {
        // Get session from NextAuth v5
        const session = await auth();

        if (!session?.user?.client) {
            return { error: 'No token provided.', status: 403 };
        }

        // Return user data from session
        return {
            user: {
                key: session.user.key,
                id: session.user.id,
                email: session.user.email,
                displayName: session.user.displayName,
                role: session.user.role,
                client: session.user.client,
                web3: session.user.web3,
                created_at: session.user.created_at
            }
        };
    } catch (error) {
        console.error('Token verification error:', error);
        return { error: 'Invalid token.', status: 403 };
    }
}

// Verify CSRF token for public requests (NextAuth v5)
export async function verifyCsrfToken(request) {
    try {
        // Get CSRF token from request headers
        const headerCsrfToken = request.headers.get('x-csrf-token') || request.headers.get('csrf-token');

        if (!headerCsrfToken) {
            return { error: 'CSRF token not provided in request headers.', status: 403 };
        }

        const cookieStore = await cookies();

        // Get all cookies and find the one that contains "authjs.csrf-token"
        const allCookies = cookieStore.getAll();
        const csrfCookie = allCookies.find((cookie) => cookie.name.includes('authjs.csrf-token'))?.value;

        if (!csrfCookie) {
            return { error: 'CSRF token not provided in cookies.', status: 403 };
        }

        // cookie format: "<token>|<hash>"
        const [token, hash] = csrfCookie.split('|');

        if (!token || !hash) {
            return { error: 'CSRF token hash failed.', status: 403 };
        }

        // Compare the tokens
        if (headerCsrfToken !== token) {
            console.error('CSRF token mismatch:', {
                header: headerCsrfToken,
                cookie: token
            });
            return { error: 'CSRF token mismatch.', status: 403 };
        }

        return { success: true };
    } catch (error) {
        console.error('CSRF token verification error:', error);
        return { error: 'CSRF token verification failed.', status: 500 };
    }
}

// Enhanced public access middleware
export async function withPublicAccess(handler, options = {}) {
    const {
        requireApiKey = false,
        requireIpWhitelist = false,
        skipCsrfForApiKey = true,
        requiredPermission = null,
        logAccess = false
    } = options;

    return async (request, context) => {
        try {
            // Check if request is internal first
            const ipValidation = await validateIpAndDomain(request);
            if (ipValidation.isInternal) {
                // Internal requests don't need API key or CSRF validation
                return await handler(request, context);
            }

            let hasValidApiKey = false;

            // Check for API key for external requests
            if (requireApiKey) {
                const apiKey =
                    request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

                if (!apiKey) {
                    return NextResponse.json({ error: 'API key is required for external access.' }, { status: 401 });
                }

                // Get API keys from database
                const apiKeysData = await DBService.readAll('api_keys');
                let apiKeys = [];
                if (Array.isArray(apiKeysData)) {
                    apiKeys = apiKeysData;
                } else if (apiKeysData && typeof apiKeysData === 'object') {
                    apiKeys = Object.entries(apiKeysData).map(([key, value]) => ({
                        id: key,
                        ...value
                    }));
                }

                // Validate API key against database
                const validKey = apiKeys.find(
                    (key) =>
                        key.key === apiKey &&
                        key.status === 'active' &&
                        (!key.expiresAt || new Date(key.expiresAt) > new Date())
                );

                if (!validKey) {
                    return NextResponse.json({ error: 'Invalid or expired API key.' }, { status: 401 });
                }

                // Check permissions if required
                if (requiredPermission && validKey.permissions && !validKey.permissions.includes(requiredPermission)) {
                    return NextResponse.json(
                        { error: `API key lacks required permission: ${requiredPermission}` },
                        { status: 403 }
                    );
                }

                hasValidApiKey = true;
            }

            // If we have a valid API key and skipCsrfForApiKey is true, skip CSRF check
            if (!(hasValidApiKey && skipCsrfForApiKey)) {
                // Verify CSRF token for external requests
                const csrfResult = await verifyCsrfToken(request);
                if (csrfResult.error) {
                    return NextResponse.json({ error: csrfResult.error }, { status: csrfResult.status });
                }
            }

            // Check IP whitelist if required
            if (requireIpWhitelist && !ipValidation.isInternal) {
                if (ipValidation.error) {
                    return NextResponse.json({ error: ipValidation.error }, { status: ipValidation.status });
                }
            }

            return await handler(request, context);
        } catch (error) {
            console.error('Public access middleware error:', error);
            return NextResponse.json({ error: 'Access validation failed.' }, { status: 500 });
        }
    };
}

// Higher-order function for protecting API routes
export async function withAuth(handler) {
    return async (request, context) => {
        try {
            // Proceed with normal token verification for non-public requests
            const authResult = await verifyToken(request);

            if (authResult.error) {
                return NextResponse.json({ message: authResult.error }, { status: authResult.status });
            }

            // Add user data to request context
            request.user = authResult.user;

            return await handler(request, context);
        } catch (error) {
            console.error('Auth middleware error:', error);
            return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
        }
    };
}

// Higher-order function for protecting API routes with role requirement
export async function withAuthAndRole(requiredRoles = []) {
    return (handler) => async (request, context) => {
        try {
            const authResult = await verifyToken(request);

            if (authResult.error) {
                return NextResponse.json({ message: authResult.error }, { status: authResult.status });
            }

            // Create a copy of requiredRoles to avoid mutating the original array
            const roles = [...requiredRoles, 'admin'];

            // Add user data to request context
            request.user = authResult.user;

            // Check if user has required role
            const userRole = authResult.user.role;

            if (roles.length > 0 && !roles.includes(userRole)) {
                return NextResponse.json(
                    {
                        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}`
                    },
                    { status: 403 }
                );
            }

            return await handler(request, context);
        } catch (error) {
            console.error('Auth and role middleware error:', error);
            return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
        }
    };
}

// Convenience function for admin-only routes
export async function withAdminAuth(handler) {
    return withAuthAndRole(['admin'])(handler);
}

/**
 * Get refreshed session with updated user data from database
 * This is called by NextAuth's JWT callback when trigger='update'
 * @param {string} userKey - User key or ID
 * @returns {Promise<Object>} Updated session user data
 */
export const getRefreshedSessionData = async (userKey) => {
    try {
        console.log('[getRefreshedSessionData] Fetching fresh data for user:', userKey);

        if (!userKey) {
            console.error('[getRefreshedSessionData] No userKey provided');
            return null;
        }

        // Fetch latest user data from database
        const userResult = await getUser({ userId: userKey });

        console.log('[getRefreshedSessionData] User fetch result:', {
            success: userResult?.success,
            hasData: !!userResult?.data,
            isDeveloper: userResult?.data?.isDeveloper
        });

        if (!userResult?.success || !userResult.data) {
            console.error('[getRefreshedSessionData] Failed to fetch user data');
            return null;
        }

        const user = userResult.data;

        // Return session-compatible user data (matching auth.js structure)
        const sessionData = {
            key: user.key || user.id,
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            isDeveloper: user.isDeveloper === true, // Ensure boolean
            created_at: user.createdAt || user.created_at
        };

        console.log('[getRefreshedSessionData] Returning session data:', {
            key: sessionData.key,
            isDeveloper: sessionData.isDeveloper,
            role: sessionData.role
        });

        return sessionData;
    } catch (error) {
        console.error('[getRefreshedSessionData] Exception:', error);
        return null;
    }
};

// Check if request is from whitelisted IP or domain
export async function validateIpAndDomain(request) {
    try {
        // Get client IP
        const forwarded = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const clientIp = forwarded ? forwarded.split(',')[0] : realIp || 'unknown';

        // Get origin/referer
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');

        // Check if it's an internal request (same host)
        const host = request.headers.get('host');
        const isInternal =
            origin?.includes(host) ||
            referer?.includes(host) ||
            clientIp === '127.0.0.1' ||
            clientIp === '::1' ||
            clientIp === 'localhost' ||
            clientIp === 'unknown';

        if (isInternal) {
            return { success: true, isInternal: true };
        }

        // Get whitelisted IPs and domains from database
        const whitelistData = await DBService.readAll('ip_whitelist');
        let whitelistedEntries = [];
        if (Array.isArray(whitelistData)) {
            whitelistedEntries = whitelistData.filter((entry) => entry.active);
        } else if (whitelistData && typeof whitelistData === 'object') {
            whitelistedEntries = Object.entries(whitelistData)
                .map(([key, value]) => ({ id: key, ...value }))
                .filter((entry) => entry.active);
        }

        // Check IP whitelist
        const isIpWhitelisted = whitelistedEntries.some((entry) => {
            if (entry.type === 'ip') {
                if (entry.value.includes('/')) {
                    // CIDR notation support (basic)
                    const [network, mask] = entry.value.split('/');
                    return clientIp.startsWith(
                        network
                            .split('.')
                            .slice(0, parseInt(mask, 10) / 8)
                            .join('.')
                    );
                }
                return clientIp === entry.value || entry.value === 'localhost';
            }
            return false;
        });

        // Check domain whitelist
        const isDomainWhitelisted = whitelistedEntries.some((entry) => {
            if (entry.type === 'domain') {
                return origin?.includes(entry.value) || referer?.includes(entry.value);
            }
            return false;
        });

        if (!isIpWhitelisted && !isDomainWhitelisted) {
            return {
                error: `Access denied. IP: ${clientIp}, Origin: ${origin || 'none'}`,
                status: 403
            };
        }

        return { success: true, isInternal: false };
    } catch (error) {
        console.error('IP/Domain validation error:', error);
        return { error: 'Access validation failed.', status: 403 };
    }
}
