// @/app/(frontend)/blank/page.client.jsx

'use client';

/**
 * HOME PAGE - CLIENT COMPONENT
 *
 * Minimal boilerplate for the home page.
 * Add your custom logic and UI components here.
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import { CircleChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth, useSettings } from '@/context/providers';

const HomePageClient = () => {
    // ============================================================================
    // HOOKS
    // ============================================================================
    const t = useTranslations('Common');
    const router = useRouter();
    const { siteSettings, storeSettings } = useSettings();
    const { session, isAuthenticated, user } = useAuth();

    // ============================================================================
    // STATE
    // ============================================================================
    const [isLoading, setIsLoading] = useState(false);

    // ============================================================================
    // EFFECTS
    // ============================================================================
    useEffect(() => {
        // Initialize page (optional)
        // Example: Fetch data, set up listeners, etc.
        if(!isLoading) {
            toast.success('Home page loaded successfully!');
            console.log('Site Settings:', siteSettings);
            console.log('Store Settings:', storeSettings);
            console.log('User Session:', isAuthenticated && user ? session : null);
        }
    }, []);
 

    // ============================================================================
    // RENDER
    // ============================================================================
    return (
        <motion.div
            className="container mx-auto py-8 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6">
                <h1 className="text-3xl font-bold flex flex-nowrap items-center gap-4">
                    <Link href="/" className="hover:text-primary transition-colors duration-200">
                        <CircleChevronLeft className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-200" />
                    </Link>
                    Home Page
                </h1>
                <p className="text-muted-foreground">Minimal boilerplate for the home page</p>
            </div> 
        </motion.div>
    );
};

export default HomePageClient;
