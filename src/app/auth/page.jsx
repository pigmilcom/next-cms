// @/app/auth/page.jsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/providers';

export default function AuthPage() {
    const router = useRouter();
    const { isAuthenticated, status } = useAuth();

    useEffect(() => {
        // Wait for auth to finish loading
        if (status === 'loading') return;

        // Redirect based on authentication status  
        if (isAuthenticated) {
            router.push('/');
        } else {
            router.push('/auth/login');
        }
    }, [isAuthenticated, status, router]);

    // Show loading state while checking auth
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
            </div>
        </div>
    );
}
