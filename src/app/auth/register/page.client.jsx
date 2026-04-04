// @/app/auth/register/page.client.jsx

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSettings } from '@/context/providers';
import { RegisterForm } from '../partials/register-form';

const RegisterPageClient = ({ user }) => {
    const t = useTranslations('Auth');
    const router = useRouter();
    const { siteSettings, storeSettings } = useSettings();
    const [isCheckingSettings, setIsCheckingSettings] = useState(true);
    const [registrationAllowed, setRegistrationAllowed] = useState(false);
    const isAuthenticated = !!user;

    // Check registration settings
    useEffect(() => {
        if (siteSettings) {
            if (siteSettings.allowRegistration === false) {
                router.push('/auth/login');
                return;
            }
            setRegistrationAllowed(true);
            setIsCheckingSettings(false);
        } else {
            // If no settings found, allow registration by default
            setRegistrationAllowed(true);
            setIsCheckingSettings(false);
        }
    }, [siteSettings, router]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    // Show loading state while checking authentication or loading settings
    if (isCheckingSettings) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // If already authenticated, don't render register form (will redirect)
    if (isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // If registration not allowed, don't render form (will redirect)
    if (!registrationAllowed) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <motion.div
            className="auth-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">{t('createAccount')}</h1>
            <p className="text-xl text-muted-foreground mb-6">{t('joinUs')}</p>
            <RegisterForm siteSettings={siteSettings} storeSettings={storeSettings} />
            <div className="mt-6 text-center">
                <Link href="/" className="text-muted-foreground hover:underline">
                    {t('backToHome')}
                </Link>
            </div>
        </motion.div>
    );
};

export default RegisterPageClient;
