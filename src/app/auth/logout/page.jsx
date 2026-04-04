// @/app/auth/logout/page.js
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/useAuth';

export default function LogoutPage() {
    const t = useTranslations('Auth');
    const { logout, status, session } = useAuth();
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [hasSignedOut, setHasSignedOut] = useState(false);
    const [showManualRedirect, setShowManualRedirect] = useState(false);

    useEffect(() => {
        const handleSignOut = async () => {
            if (status !== 'loading' && session && !isSigningOut && !hasSignedOut) {
                setIsSigningOut(true);
                try {
                    // Show toast once before logout
                    toast.success(t('loggedOutSuccessfully'));
                    // Sign out without redirect to avoid page refresh
                    await logout('/auth/login');
                    setHasSignedOut(true);
                } catch (error) {
                    console.error('Sign out error:', error);
                    // Navigate without refresh even on error
                    router.push('/auth/login');
                }
            } else if (status !== 'loading' && !session && !hasSignedOut) {
                // Already signed out, navigate to login
                router.push('/auth/login');
            }
        };

        // Small delay to prevent flash
        const timeout = setTimeout(handleSignOut, 1500);
        return () => clearTimeout(timeout);
    }, [session, isSigningOut, hasSignedOut, status, logout, router]);

    useEffect(() => {
        // Show manual redirect link after 10 seconds if still on page
        const timer = setTimeout(() => {
            setShowManualRedirect(true);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const handleManualRedirect = () => {
        router.push('/auth/login');
    };

    // Show different content based on auth status
    if (status === 'loading' || status === 'unauthenticated' || hasSignedOut) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="text-lg">{t('loading')}...</div>
                    {showManualRedirect && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={handleManualRedirect}
                            className="mt-6 text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer">
                            {t('clickHereToRedirect')}
                        </motion.button>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="text-lg">{t('signingOut')}...</div>
                <div className="mt-4">
                    <LoadingSpinner size="lg" className="mx-auto" />
                </div>
                {showManualRedirect && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={handleManualRedirect}
                        className="mt-6 text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer">
                        {t('clickHereToRedirect')}
                    </motion.button>
                )}
            </motion.div>
        </div>
    );
}
