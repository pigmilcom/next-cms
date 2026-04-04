// @/hooks/useAuth.js

'use client';

import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

/**
 * Lightweight auth hook - provides logout and basic session status
 *
 * For user/session data in layouts, use useLayout() from your respective LayoutProvider:
 * - Admin: import { useLayout } from '@/app/(backend)/admin/context/LayoutProvider'
 * - Frontend: import { useLayout } from '@/app/(frontend)/context/LayoutProvider'
 *
 * This hook is for special cases like the logout page that need session status
 * but are outside the layout context
 */
export const useAuth = () => {
    const router = useRouter();
    const { data: session, status } = useSession();

    const logout = async (callbackUrl = '/auth/login') => {
        try {
            // Ensure callbackUrl is a string
            const url = typeof callbackUrl === 'string' ? callbackUrl : '/auth/login';
            // Sign out without redirect to avoid full page refresh
            await signOut({ redirect: false });
            // Use router to navigate smoothly without refresh
            router.push(url);
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback to redirect if router navigation fails
            const fallbackUrl = typeof callbackUrl === 'string' ? callbackUrl : '/auth/login';
            await signOut({ callbackUrl: fallbackUrl, redirect: true });
        }
    };

    return {
        logout,
        session,
        status
    };
};

// Utility function for making authenticated API calls
export const authenticatedFetch = async (url, options = {}) => {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);

        // If session expired, sign out and navigate without refresh
        if (response.status === 401 || response.status === 403) {
            await signOut({ redirect: false });
            if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
            }
            return null;
        }

        return response;
    } catch (error) {
        console.error('Authenticated fetch error:', error);
        throw error;
    }
};

// Hook for checking authentication status
export const useAuthCheck = () => {
    const { status } = useSession();

    const checkAuth = () => {
        return status === 'authenticated';
    };

    return {
        checkAuth,
        isLoading: status === 'loading',
        isAuthenticated: status === 'authenticated'
    };
};

// HOC for protecting pages
export const withAuth = (WrappedComponent) => {
    return function AuthenticatedComponent(props) {
        const { status } = useSession();
        const router = useRouter();

        if (status === 'loading') {
            return (
                <div className="flex min-h-screen items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-blue-500 border-b-2"></div>
                </div>
            );
        }

        if (status === 'unauthenticated') {
            router.push('/auth/login');
            return null;
        }

        return <WrappedComponent {...props} />;
    };
};

// HOC for protecting pages with role requirements
export const withAuthAndRole = (requiredRoles = []) => {
    return (WrappedComponent) => {
        return function RoleAuthenticatedComponent(props) {
            const { data: session, status } = useSession();
            const router = useRouter();

            if (status === 'loading') {
                return (
                    <div className="flex min-h-screen items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-blue-500 border-b-2"></div>
                    </div>
                );
            }

            if (status === 'unauthenticated') {
                router.push('/auth/login');
                return null;
            }

            const userRole = session?.user?.role;
            const roles = [...requiredRoles, 'admin'];

            if (roles.length > 0 && !roles.includes(userRole)) {
                return (
                    <div className="flex min-h-screen items-center justify-center">
                        <div className="text-center">
                            <h1 className="font-bold text-2xl text-red-600">Access Denied</h1>
                            <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
                            <p className="mt-1 text-gray-500 text-sm">
                                Required role(s): {roles.join(', ')}. Your role: {userRole}
                            </p>
                        </div>
                    </div>
                );
            }

            return <WrappedComponent {...props} />;
        };
    };
};

// Convenience HOC for admin-only pages
export const withAdminAuth = (WrappedComponent) => {
    return withAuthAndRole(['admin'])(WrappedComponent);
};
