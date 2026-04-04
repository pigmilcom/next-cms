// @/app/(backend)/admin/context/LayoutProvider.jsx
'use client';

import { SquareArrowLeft, SquareArrowRight, AlertCircle } from 'lucide-react';
import { Inter } from 'next/font/google';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createContext, Fragment, useContext, useEffect, useState } from 'react';
import IntlSelector from '@/components/common/IntlSelector';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeSwitchGroup } from '@/components/ui/theme-mode';
import { useAuth, useSettings } from '@/context/providers';
import { cn } from '@/lib/utils';
import { AppSidebar } from '../components/app-sidebar'; 
import { useAdminBreadcrumbPath } from '../config/navigation';
import '../styles.css';

const LayoutContext = createContext();

// Admin Backend Font
export const font = Inter({
    subsets: ['latin'],
    display: 'swap',
    adjustFontFallback: true,
    variable: '--font-inter'
});

// Settings context (from server-side fetch)
const AdminSettingsContext = createContext({
    siteSettings: null,
    storeSettings: null
});

export const useAdminSettings = () => useContext(AdminSettingsContext);

// Main LayoutProvider component
export const LayoutProvider = ({ children, siteSettings, storeSettings }) => {
    const router = useRouter();
    const pathname = usePathname();
    const breadcrumbs = useAdminBreadcrumbPath(pathname);
    const [showMobileActions, setShowMobileActions] = useState(false);

    // Use centralized auth from main providers (includes enriched user data from getUser)
    const { session, isAuthenticated, user } = useAuth();

    // Read server-provided flags from SettingsContext
    const { setupExists } = useSettings();

    // Use NextAuth's useSession for session update functionality
    const { update: updateSession } = useSession();

    useEffect(() => {
        // Check authentication and role on client side
        if (!isAuthenticated || !session?.user) {
            router.replace('/auth/login?callbackUrl=/admin');
            return;
        }
    }, [session, isAuthenticated, router]);

    // Add data-admin-layout attribute to body when admin layout is active
    useEffect(() => {
        if (isAuthenticated && session?.user && session.user.role?.toLowerCase() === 'admin') {
            document.body.setAttribute('data-admin-layout', '');
        }

        // Cleanup: remove attribute when component unmounts
        return () => {
            document.body.removeAttribute('data-admin-layout');
        };
    }, [isAuthenticated, session]);

    // Don't render admin content if not authenticated or not admin
    if (!isAuthenticated || !session?.user || session.user.role?.toLowerCase() !== 'admin') {
        return null;
    }

    /**
     * Refresh session with updated user data from database
     * This updates the JWT token and session without page reload
     * Forces a full session refetch from database via JWT callback
     * @param {Object} updatedUserData - Optional updated user fields (for logging/validation)
     */
    const refreshSession = async (updatedUserData = {}) => {
        try {
            // Trigger session update - this calls JWT callback with trigger='update'
            // The JWT callback will fetch fresh data from database via getRefreshedSessionData
            const result = await updateSession();

            // Small delay to ensure session propagation
            await new Promise((resolve) => setTimeout(resolve, 100));

            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // layout value to be provided via context
    const layoutValue = {
        session,
        isAuthenticated,
        user, // Now includes enriched data from getUser (club stats, preferences, etc.)
        siteSettings,
        storeSettings,
        refreshSession
    };

    // Admin settings value for AdminSettingsContext
    const adminSettingsValue = {
        siteSettings,
        storeSettings
    };

    const content = (
        <>
            <div className={`admin-layout-wrapper ${font.variable}`}>
                <SidebarProvider>
                    <AppSidebar />
                    <SidebarInset>
                        <header className="w-full m-0 top-0 right-0 fixed bg-background z-100 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                            <div className="flex w-full items-center gap-2 px-4">
                                <SidebarTrigger className="-ml-1" />
                                <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                                <Breadcrumb className={cn('md:block', showMobileActions && 'hidden')}>
                                    <BreadcrumbList>
                                        {breadcrumbs.map((crumb, index) => (
                                            <Fragment key={index}>
                                                {index > 0 && <BreadcrumbSeparator>{'>'}</BreadcrumbSeparator>}
                                                <BreadcrumbItem>
                                                    {index === breadcrumbs.length - 1 ? (
                                                        <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                                                    ) : (
                                                        <BreadcrumbLink prefetch={false} href={crumb.url}>
                                                            {crumb.title}
                                                        </BreadcrumbLink>
                                                    )}
                                                </BreadcrumbItem>
                                            </Fragment>
                                        ))}
                                    </BreadcrumbList>
                                </Breadcrumb>

                                {/* Mobile Actions Toggle Button */}
                                <div className="ms-auto flex md:hidden">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShowMobileActions(!showMobileActions)}
                                        className={cn(
                                            'transition-transform duration-200',
                                            showMobileActions && 'hidden'
                                        )}>
                                        <SquareArrowLeft />
                                    </Button>
                                </div>

                                {/* Layout Actions */}
                                <div
                                    className={`ms-auto items-center gap-2 ${showMobileActions ? 'flex' : 'hidden'} md:flex`}>
                                    <Button
                                        variant="default"
                                        size="icon"
                                        onClick={() => setShowMobileActions(!showMobileActions)}
                                        className={cn('md:hidden', !showMobileActions && 'hidden')}>
                                        <SquareArrowRight />
                                    </Button>
                                    {/*  For future use 
                                        <NotificationsPopover />
                                    */}
                                    <IntlSelector slim={true} target="backend" />
                                    <ThemeSwitchGroup compact={true} />
                                </div>
                            </div>
                        </header>
                        {/* Page Content */}
                        <div className="relative w-full h-screen px-4 py-18 overflow-y-auto scrollbar-thin">
                            {/* Check if setup dir exists and display danger alert */}
                                {setupExists && (
                                    <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200 flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-300 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium">Setup directory detected</div>
                                            <div className="text-xs">A setup directory exists on the server. Remove or secure it after setup to avoid security issues.</div>
                                        </div>
                                    </div>
                                )}

                                {children}
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </div>
        </>
    );

    return (
        <LayoutContext.Provider value={layoutValue}>
            <AdminSettingsContext.Provider value={adminSettingsValue}>{content}</AdminSettingsContext.Provider>
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};
