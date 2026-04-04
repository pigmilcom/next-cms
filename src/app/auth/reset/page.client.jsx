// @/app/auth/reset/page.client.jsx

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useSettings } from '@/context/providers';
import { ResetForm } from '../partials/reset-form';

const ResetPasswordPageClient = ({ user }) => {
    const t = useTranslations('Auth');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { siteSettings, storeSettings } = useSettings();
    const [isValidating, setIsValidating] = useState(true);
    const [validParams, setValidParams] = useState({ email: '', code: '', token: '' });
    const isAuthenticated = !!user;

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/account');
        }
    }, [isAuthenticated, router]);

    // Extract and validate URL parameters
    useEffect(() => {
        const emailParam = searchParams.get('email');
        const codeParam = searchParams.get('code');
        const tokenParam = searchParams.get('token');

        if (emailParam && codeParam && tokenParam) {
            setValidParams({
                email: decodeURIComponent(emailParam),
                code: decodeURIComponent(codeParam),
                token: decodeURIComponent(tokenParam)
            });
        }
        setIsValidating(false);
    }, [searchParams]);

    // Show loading state while validating or checking authentication
    if (isValidating) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2"></div>
                    <p className="text-gray-600">{t('loading')}...</p>
                </div>
            </div>
        );
    }

    // If already authenticated, don't render reset form (will redirect)
    if (isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2"></div>
                    <p className="text-gray-600">{t('loading')}...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="auth-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">{t('resetPassword')}</h1>
            <p className="text-xl text-muted-foreground mb-6">{t('enterNewPassword')}</p>
            <ResetForm
                initialEmail={validParams.email}
                initialCode={validParams.code}
                initialToken={validParams.token}
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

export default ResetPasswordPageClient;
