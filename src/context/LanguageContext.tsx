// @/context/LanguageContext.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { formatAvailableLanguages } from '@/lib/i18n';
import { COOKIE_NAME } from '@/locale/config';

// Type definitions
interface Language {
    id: string;
    code: string;
    name: string;
    flag: string;
    countryCode?: string;
}

interface LanguageContextType {
    currentLanguage: string;
    availableLanguages: Language[];
    availableFrontendLanguages: Language[];
    availableBackendLanguages: Language[];
    setCurrentLanguage: (languageCode: string) => void;
    isLoading: boolean;
}

interface LanguageProviderProps {
    children: React.ReactNode;
    initialLanguage?: string;
    initialBackendLanguage?: string;
    availableLanguagesList?: string[];
    frontendLanguages?: string[];
    backendLanguages?: string[];
}

const LanguageContext = createContext<LanguageContextType>({
    currentLanguage: 'en',
    availableLanguages: [],
    availableFrontendLanguages: [],
    availableBackendLanguages: [],
    setCurrentLanguage: (languageCode: string) => {},
    isLoading: true
});

export function LanguageProvider({
    children,
    initialLanguage = 'en',
    initialBackendLanguage = 'en',
    availableLanguagesList = ['en'],
    frontendLanguages = ['en'],
    backendLanguages = ['en']
}: LanguageProviderProps) {
    const router = useRouter();
    const pathname = usePathname();

    // Initialize with props from server (via root layout)
    const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const savedLanguage = localStorage.getItem('selectedLanguage');
            return savedLanguage || initialLanguage;
        }
        return initialLanguage;
    });

    const [availableLanguages, setAvailableLanguages] = useState<Language[]>(() => {
        return formatAvailableLanguages(availableLanguagesList);
    });

    const [availableFrontendLanguages, setAvailableFrontendLanguages] = useState<Language[]>(() => {
        return formatAvailableLanguages(frontendLanguages);
    });

    const [availableBackendLanguages, setAvailableBackendLanguages] = useState<Language[]>(() => {
        return formatAvailableLanguages(backendLanguages);
    });

    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Update available languages when props change
    useEffect(() => {
        const languagesWithNames = formatAvailableLanguages(availableLanguagesList);
        setAvailableLanguages(languagesWithNames);
        
        const frontendWithNames = formatAvailableLanguages(frontendLanguages);
        setAvailableFrontendLanguages(frontendWithNames);
        
        const backendWithNames = formatAvailableLanguages(backendLanguages);
        setAvailableBackendLanguages(backendWithNames);
    }, [availableLanguagesList, frontendLanguages, backendLanguages]);

    // Ensure current locale is valid for current route context (frontend/admin)
    useEffect(() => {
        const isAdminRoute = pathname?.startsWith('/admin');

        const allowedLanguages =
            isAdminRoute && Array.isArray(backendLanguages) && backendLanguages.length > 0
                ? backendLanguages
                : Array.isArray(frontendLanguages) && frontendLanguages.length > 0
                  ? frontendLanguages
                  : ['en'];

        const contextDefault = isAdminRoute ? initialBackendLanguage || initialLanguage : initialLanguage;

        const fallbackLanguage = allowedLanguages.includes(contextDefault)
            ? contextDefault
            : allowedLanguages[0] || contextDefault || 'en';

        if (!allowedLanguages.includes(currentLanguage) && fallbackLanguage && fallbackLanguage !== currentLanguage) {
            setCurrentLanguage(fallbackLanguage);

            try {
                localStorage.setItem('selectedLanguage', fallbackLanguage);
            } catch (_e) {
                // ignore storage errors
            }

            try {
                const maxAge = 60 * 60 * 24 * 365;
                document.cookie = `${COOKIE_NAME}=${encodeURIComponent(fallbackLanguage)}; Path=/; max-age=${maxAge}; SameSite=Lax`;
            } catch (_e) {
                // ignore cookie write errors
            }

            try {
                if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                    const bc = new BroadcastChannel('site-locale');
                    bc.postMessage({ language: fallbackLanguage });
                    bc.close();
                }
            } catch (_e) {
                // ignore
            }

            try {
                router.refresh();
            } catch (_e) {
                try {
                    window.location.reload();
                } catch (_err) {
                    // ignore
                }
            }
        }
    }, [
        pathname,
        currentLanguage,
        frontendLanguages,
        backendLanguages,
        initialLanguage,
        initialBackendLanguage,
        router
    ]);

    // Listen for language changes from other tabs (BroadcastChannel preferred, storage as fallback)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let bc: BroadcastChannel | null = null;

        const handleExternalChange = (newLang?: string) => {
            if (!newLang) return;
            // If it's already the same, do nothing
            if (newLang === currentLanguage) return;

            // Update local state and trigger refresh so next-intl reloads messages
            setCurrentLanguage(newLang);
            try {
                router.refresh();
            } catch (e) {
                try {
                    window.location.reload();
                } catch (err) {
                    // ignore
                }
            }
        };

        try {
            if ('BroadcastChannel' in window) {
                bc = new BroadcastChannel('site-locale');
                bc.onmessage = (ev) => {
                    const lang = ev?.data?.language;
                    if (lang) handleExternalChange(lang);
                };
            }
        } catch (e) {
            bc = null;
        }

        const onStorage = (e: StorageEvent) => {
            if (e.key === 'selectedLanguage' && e.newValue) {
                handleExternalChange(e.newValue);
            }
        };

        window.addEventListener('storage', onStorage);

        return () => {
            window.removeEventListener('storage', onStorage);
            if (bc) {
                try {
                    bc.close();
                } catch (e) {
                    // ignore
                }
            }
        };
    }, [currentLanguage, router]);

    // Handle language change
    const handleLanguageChange = (languageCode: string) => {
        // Update local state for immediate UI update in this tab
        setCurrentLanguage(languageCode);

        // Persist to localStorage (used for cross-tab fallback)
        try {
            localStorage.setItem('selectedLanguage', languageCode);
        } catch (e) {
            // ignore storage errors
        }

        // Persist selection to cookie so server-side getRequestConfig can read it
        try {
            // 1 year max-age
            const maxAge = 60 * 60 * 24 * 365;
            document.cookie = `${COOKIE_NAME}=${encodeURIComponent(languageCode)}; Path=/; max-age=${maxAge}; SameSite=Lax`;
        } catch (e) {
            // ignore cookie write errors
        }

        // Broadcast the change to other tabs/windows using BroadcastChannel (if available)
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                const bc = new BroadcastChannel('site-locale');
                bc.postMessage({ language: languageCode });
                bc.close();
            }
        } catch (e) {
            // ignore
        }

        // Refresh server data so next-intl loads new messages for this tab
        try {
            router.refresh();
        } catch (e) {
            // If hooks cannot be used here for some reason, fallback to full reload
            try {
                window.location.reload();
            } catch (err) {
                // ignore
            }
        }
    };

    const value = {
        currentLanguage,
        availableLanguages,
        availableFrontendLanguages,
        availableBackendLanguages,
        setCurrentLanguage: handleLanguageChange,
        isLoading
    };

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
