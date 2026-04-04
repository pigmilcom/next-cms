// @/auth.js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { decryptHash } from '@/lib/crypt';

const authConfig = {
    providers: [
        CredentialsProvider({
            id: 'credentials',
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                client: { label: 'Client', type: 'text' },
                name: { label: 'Name', type: 'text' }
            },
            async authorize(credentials) {
                try {
                    // Check if userData is passed (from callback function)
                    if (credentials?.data) {
                        // Parse and return user data for session creation
                        const resHash = decryptHash(credentials.data, credentials.client);
                        const hashData = resHash || null;
                        if (hashData && hashData.success && hashData.data) {
                            return hashData.data;
                        }
                    }

                    // Fallback - should not reach here with callback pattern
                    return null;
                } catch (error) {
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60 // 30 days
    },
    jwt: {
        maxAge: 30 * 24 * 60 * 60 // 30 days
    },
    callbacks: {
        async jwt({ token, user, trigger }) {
            // On sign in, populate token with user data
            if (user) {
                token.key = user.key || user.id;
                token.id = user.id;
                token.email = user.email;
                token.name = user.displayName || user.name || user.email;
                token.role = user.role;
                // Mark token as valid on initial sign-in
                token.valid = true;
            }

            // On session update trigger, refresh user data from database
            if (trigger === 'update' && token.key) {
                try {
                    // Dynamically import to avoid circular dependencies
                    const { getRefreshedSessionData } = await import('@/lib/server/auth');
                    const refreshedUser = await getRefreshedSessionData(token.key);

                    if (refreshedUser) {
                        // Update ALL token fields with fresh data from database
                        token.key = refreshedUser.key || refreshedUser.id;
                        token.id = refreshedUser.id;
                        token.email = refreshedUser.email;
                        token.name = refreshedUser.displayName || refreshedUser.name || refreshedUser.email;
                        token.role = refreshedUser.role;
                        token.valid = true;
                    } else {
                        // User no longer exists, mark token as invalid instead of returning null
                        token.valid = false;
                    }
                } catch (error) {
                    console.error('[NextAuth] JWT refresh error:', error.message);
                    // On error during refresh, mark token as invalid
                    token.valid = false;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (!session.user) session.user = {};

            // Check if token is explicitly marked as invalid
            if (token && token.valid === false) {
                // Token marked invalid, return null to force logout
                return null;
            }

            if (token) {
                // Populate session with token data (no database validation on every request)
                session.user.key = token.key || token.id;
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.name = token.name;
                session.user.role = token.role;
            }

            return session;
        }
    },
    pages: {
        signIn: '/auth/login',
        signOut: '/auth/logout',
        error: '/auth/error'
    },
    logger: {
        error(code, ...message) {
            //console.error(code, ...message);
        }
    },
    secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
    debug: false // Disable debug logging to prevent console errors for expected validation failures
};

// Export authConfig as authOptions for compatibility with getServerSession
export const authOptions = authConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
