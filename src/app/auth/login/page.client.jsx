// @/app/auth/login/page.client.jsx

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSettings } from '@/context/providers';
import { LoginForm } from '../partials/login-form';
import '@/app/auth/styles.css';

const LoginPageClient = ({ user }) => {
    const t = useTranslations('Auth');
    const router = useRouter();
    const { siteSettings, storeSettings } = useSettings();
    const isAuthenticated = !!user;

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/account');
        }
    }, [isAuthenticated, router]);

    // If already authenticated, don't render login form (will redirect)
    if (isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // Get email and callback URL from URL params if they exist
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const emailParam = urlParams?.get('email');
    const callbackUrl = urlParams?.get('redirect') || urlParams?.get('callbackUrl') || '/account';
    const initialEmail = emailParam ? decodeURIComponent(emailParam) : '';

    return (
        <motion.div
            className="auth-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">{t('signIn')}</h1>
            <p className="text-xl text-muted-foreground mb-6">{t('welcomeBack')}</p>

            <LoginForm
                initialEmail={initialEmail}
                callbackUrl={callbackUrl}
                siteSettings={siteSettings}
                storeSettings={storeSettings}
            />
            <div className="mt-6 text-center">
                <Link href="/" className="text-muted-foreground hover:underline">
                    {t('backToHome')}
                </Link>
            </div>
        </motion.div>
    );
};

export default LoginPageClient;
