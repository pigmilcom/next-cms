// @/components/common/InitialLoadingHandler.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/context/providers';

/**
 * Initial Loading Handler
 *
 * Shows LoadingPage on:
 * - First visit to the website (Or page/browser refresh F5, Ctrl+R)
 * - Until settings are fully loaded and hydrated
 * - Until all images and resources are fully loaded
 *
 */
export default function InitialLoadingHandler({ firstLoadOnly = false, children }) {
    const { siteSettings, storeSettings } = useSettings();

    // Check if initial load already happened (only if firstLoadOnly is true)
    const hasLoadedBefore =
        firstLoadOnly && typeof window !== 'undefined'
            ? sessionStorage.getItem('initialLoadComplete') === 'true'
            : false;

    // Simple initialization - determine loading state in useEffect
    const [shouldShowLoading, setShouldShowLoading] = useState(!hasLoadedBefore);
    const [isSettingsReady, setIsSettingsReady] = useState(false);
    const [isImagesLoaded, setIsImagesLoaded] = useState(false);
    const hasInitialized = useRef(false);
    const isInitialMount = useRef(true);
    const mountTime = useRef(Date.now());
    const MIN_LOADING_TIME = 1000; // 1 second

    // Detect if this is a page load (first visit or refresh) vs navigation
    useEffect(() => {
        // Only run once on initial mount
        if (!isInitialMount.current) return;
        isInitialMount.current = false;

        // Settings are ready when both are available
        if (siteSettings && storeSettings) {
            setIsSettingsReady(true);
        }

        hasInitialized.current = true;
    }, [siteSettings, storeSettings]); // Empty deps - run only once on mount

    // Check if settings are loaded and ready
    useEffect(() => {
        // Settings are ready when both are available
        if (siteSettings && storeSettings) {
            setIsSettingsReady(true);
        }

        // Wait for all images and resources to load
        const handleLoad = () => {
            // All resources including images are loaded
            setIsImagesLoaded(true);
        };

        if (document.readyState === 'complete') {
            // Page already loaded before component mounted
            setIsImagesLoaded(true);
        } else {
            // Wait for window load event (includes all images)
            window.addEventListener('load', handleLoad, { once: true });
            return () => window.removeEventListener('load', handleLoad);
        }
    }, [siteSettings, storeSettings]);

    // Hide loading when everything is ready (with minimum 1s delay)
    useEffect(() => {
        if (isImagesLoaded && isSettingsReady && hasInitialized.current) {
            const elapsedTime = Date.now() - mountTime.current;
            const remainingTime = MIN_LOADING_TIME - elapsedTime;

            if (remainingTime > 0) {
                // Everything loaded fast, delay to meet minimum time
                const timer = setTimeout(() => {
                    setShouldShowLoading(false);
                    // Mark initial load as complete in session (only if firstLoadOnly is true)
                    if (firstLoadOnly && typeof window !== 'undefined') {
                        sessionStorage.setItem('initialLoadComplete', 'true');
                    }
                }, remainingTime);
                return () => clearTimeout(timer);
            } else {
                // Already exceeded minimum time, hide immediately
                setShouldShowLoading(false);
                // Mark initial load as complete in session (only if firstLoadOnly is true)
                if (firstLoadOnly && typeof window !== 'undefined') {
                    sessionStorage.setItem('initialLoadComplete', 'true');
                }
            }
        }
    }, [isImagesLoaded, isSettingsReady, firstLoadOnly]);

    // Manage loading class on body
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (shouldShowLoading) {
            // Ensure loading-active class is present
            if (!document.body.classList.contains('loading-active')) {
                document.body.classList.add('loading-active');
            }
        } else {
            // Remove loading-active class when loading is complete
            document.body.classList.remove('loading-active');
        }
    }, [shouldShowLoading]);

    return <>{children}</>;
}
