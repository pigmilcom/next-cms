// @/context/providers.jsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { createContext, useContext, useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConnectionMonitor from '@/components/common/ConnectionMonitor';
import ScrollToTop from '@/components/common/ScrollToTop';
import { getUser } from '@/lib/server/users.js';
import { LanguageProvider } from './LanguageContext';
import SafeCartProvider from './SafeCartProvider';
import { initializeVisitorTracking } from '@/lib/client/visitor-tracking';

export { useTheme } from 'next-themes';

// Settings context (from server-side fetch)
const SettingsContext = createContext({
    siteSettings: null,
    storeSettings: null
});

export const useSettings = () => useContext(SettingsContext);

// Auth context (enhanced with session management and logout)
const AuthContext = createContext({
    session: null,
    isAuthenticated: false,
    user: null,
    status: 'loading',
    logout: () => {}
});

// Enhanced Auth Provider component
const AuthProvider = ({ children, initialSession }) => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sessionState, setSessionState] = useState(initialSession);
    const [userData, setUserData] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    // Update session state when NextAuth session changes
    useEffect(() => {
        if (status !== 'loading') {
            setSessionState(session);
        }
    }, [session, status]);

    // Fetch full user data from getUser when session is available
    useEffect(() => {
        const fetchUserData = async () => {
            // Only fetch if we have a session with user data
            if (sessionState?.user) {
                setIsLoadingUser(true);
                try {
                    const userKey = sessionState.user.key || sessionState.user.id || sessionState.user.email;
                    const result = await getUser({ userId: userKey });

                    if (result?.success && result?.data) {
                        setUserData(result.data);
                    } else {
                        // If getUser fails, fallback to session user data
                        setUserData(sessionState.user);
                    }
                } catch (error) {
                    // Fallback to session user data on error
                    setUserData(sessionState.user);
                } finally {
                    setIsLoadingUser(false);
                }
            } else {
                // No session, clear user data
                setUserData(null);
            }
        };

        fetchUserData();
    }, [sessionState]);

    // Logout function that clears session state and redirects
    const logout = async (redirectTo = '/auth/login') => {
        try {
            // Clear local session state and user data immediately
            setSessionState(null);
            setUserData(null);

            // Sign out from NextAuth
            await signOut({
                redirect: false, // Don't auto-redirect, we'll handle it
                callbackUrl: redirectTo
            });

            // Small delay to ensure session is fully cleared
            setTimeout(() => {
                // Navigate to login page
                router.push(redirectTo);
            }, 100);
        } catch (error) {
            console.error('Logout error:', error);
            // Force navigation even on error
            router.push(redirectTo);
        }
    };

    const authValue = {
        session: sessionState,
        isAuthenticated: !!sessionState?.user,
        user: userData, // Use fetched user data instead of session.user
        status: isLoadingUser ? 'loading' : status,
        logout
    };

    return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

// Visitor Tracking Initialization Component
// Initializes visitor analytics tracking on mount
const VisitorTrackingInit = () => {
    useEffect(() => {
        /**
         * Visitor Tracking Integration
         * - Tracks page views, user interactions, and analytics
         * - Runs once on component mount
         * - Handles errors gracefully
         * - Can be disabled by setting window.__SKIP_DATA_FETCH__
         */
        
        // Skip tracking on 404 pages or when explicitly disabled
        const skipDataFetch = typeof window !== 'undefined' && window.__SKIP_DATA_FETCH__;
        if (skipDataFetch) return;

        const initTracking = async () => {
            try {
                await initializeVisitorTracking(); 
            } catch (error) {
                console.error('Failed to initialize visitor tracking:', error);
            }
        };

        initTracking();
    }, []); // Empty deps - run only once on mount
    
    return null; // This component doesn't render anything
};

// Referral Handler Component - Checks for 'ref' query param and redirects
const ReferralHandler = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (hasChecked) return;

        const referral = searchParams.get('ref');
        
        if (referral) {
            setHasChecked(true);
            // Redirect to registration with referral code
            router.push(`/auth/register?ref=${encodeURIComponent(referral)}`);
        } else {
            setHasChecked(true);
        }
    }, [searchParams, router, hasChecked]);

    return null; // This component doesn't render anything
};

// Theme Provider Wrapper - Handles conditional theme forcing for frontend vs admin
const ConditionalThemeProvider = ({ children }) => {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin');

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={true}
            // forcedTheme={isAdminRoute ? undefined : 'light'}
        >
            {children}
        </ThemeProvider>
    ) }
    

export default function Providers({
    children,
    siteSettings,
    storeSettings,
    session,
    setupExists = false,
    availableFrontendLanguages = ['en']
}) {
    const settingsValue = {
        siteSettings,
        storeSettings,
        setupExists
    };

    // Extract language settings from siteSettings for LanguageProvider
    const initialLanguage = siteSettings?.language || 'en';
    const initialBackendLanguage = siteSettings?.adminLanguage || initialLanguage;
    const availableBackendLanguages = siteSettings?.adminLanguages || ['en'];

    const availableLanguagesList = [...new Set([...availableFrontendLanguages, ...availableBackendLanguages])];

    return (
        <ConditionalThemeProvider>
        <Toaster position="top-center" /> 
        <ConnectionMonitor />
        <ErrorBoundary>
            <SettingsContext.Provider value={settingsValue}>
                <SessionProvider session={session}>
                    <AuthProvider initialSession={session}>
                        <ReferralHandler />
                        <VisitorTrackingInit />
                        <SafeCartProvider>
                                <LanguageProvider
                                    initialLanguage={initialLanguage}
                                    initialBackendLanguage={initialBackendLanguage}
                                    availableLanguagesList={availableLanguagesList}
                                    frontendLanguages={availableFrontendLanguages}
                                    backendLanguages={availableBackendLanguages}>
                                    <ScrollToTop />
                                    {children}
                                </LanguageProvider> 
                        </SafeCartProvider>
                    </AuthProvider>
                </SessionProvider>
            </SettingsContext.Provider>
        </ErrorBoundary> 
        </ConditionalThemeProvider>
    );
}
