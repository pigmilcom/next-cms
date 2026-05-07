// @/app/(actions)/account/AccessDenied.jsx
'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AccessDenied() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations('Auth');
    const [showManualRedirect, setShowManualRedirect] = useState(false);

    useEffect(() => {
        // Get current path with search parameters to preserve URL state
        const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
        router.push(`/auth/logout`);

        // Show manual redirect link after 10 seconds if still loading
        const timer = setTimeout(() => {
            setShowManualRedirect(true);
        }, 10000);

        return () => clearTimeout(timer);
    }, [router, pathname, searchParams]);

    const handleManualRedirect = () => {
        const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
        router.push(`/auth/logout`);
    };

    return (
        <div className="flex min-h-screen items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="text-lg">{t('loading')}...</div>
                <div className="mt-4">
                    <LoadingSpinner size="lg" className="mx-auto" />
                </div>
                {showManualRedirect && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={handleManualRedirect}
                        className="mt-6 text-sm text-primary cursor-pointer">
                        {t('clickHereToRedirect')}
                    </motion.button>
                )}
            </motion.div>
        </div>
    );
}
