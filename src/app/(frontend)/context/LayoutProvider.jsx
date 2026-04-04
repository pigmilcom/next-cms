// @/app/(frontend)/context/LayoutProvider.jsx (Main Frontend Layout Context Provider)
'use client';

import { Inter } from 'next/font/google';
import { createContext, useContext } from 'react';
import { useAuth, useSettings } from '@/context/providers'; 
import CookieConsentBanner from '@/components/common/CookieConsent';
import DynamicPageTitle from '@/components/common/DynamicPageTitle';
import '../styles.css'; 

const LayoutContext = createContext();

// Frontend Font
export const font = Inter({
    weight: '400',
    subsets: ['latin'],
    display: 'swap',
    adjustFontFallback: true,
    variable: '--font-inter'
});

export const LayoutProvider = ({ children }) => {
    // Skip all data fetching if on 404 page
    const skipDataFetch = typeof window !== 'undefined' && window.__SKIP_DATA_FETCH__;

    // Get auth and settings from root providers context
    const { session, isAuthenticated, user } = useAuth();
    const { siteSettings, storeSettings } = useSettings();

    // layout value to be provided via context (removed catalog, categories, collections)
    const layoutValue = {
        session,
        isAuthenticated,
        user,
        siteSettings,
        storeSettings
    }; 

    return (
        <LayoutContext.Provider value={layoutValue}> 
            <LayoutInner>{children}</LayoutInner> 
        </LayoutContext.Provider>
    );
};

// Inner component that renders the actual layout structure, separated for better organization
const LayoutInner = ({ children }) => { 
    const attractiveTitles = [
        "🚀 Build faster with a modern Next.js stack",
        "⚡ Turn ideas into production-ready apps instantly",
        "🧠 Smart CMS for developers and creators",
        "📦 All-in-one platform to manage your content",
        "🔥 Launch scalable apps without the headache"
    ];
    return (
        <div className={font.variable} data-frontend-layout>
            <main> 
                {children}  
            </main> 
            <CookieConsentBanner />
            <DynamicPageTitle titles={attractiveTitles} />
        </div>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};
