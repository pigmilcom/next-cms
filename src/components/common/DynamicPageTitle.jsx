// @/app/(frontend)/components/DynamicPageTitle.jsx
'use client';

import { useEffect } from 'react';

/**
 * DynamicPageTitle Component
 * Changes the page title with attractive messages when user leaves the tab,
 * and restores the original title when they return.
 */
const DynamicPageTitle = () => {
    useEffect(() => {
        let originalTitle = document.title;
        const attractiveTitles = [
            "🔧 Revenez vite — dépannage informatique à domicile",
            "⚡ Intervention rapide sous 24h pour PC, portable et smartphone",
            "🛡️ Diagnostic clair, prix transparent, réparation sur place",
            "📶 Problème Wi-Fi, virus ou lenteur ? On s'en occupe",
            "💾 Réparation, optimisation et récupération de données"
        ];

        let currentTitleIndex = 0;
        let titleInterval = null;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // User left the tab - start rotating titles
                currentTitleIndex = 0;
                document.title = attractiveTitles[currentTitleIndex];

                titleInterval = setInterval(() => {
                    currentTitleIndex = (currentTitleIndex + 1) % attractiveTitles.length;
                    document.title = attractiveTitles[currentTitleIndex];
                }, 3000);
            } else {
                // User came back - clear interval and restore original title
                if (titleInterval) {
                    clearInterval(titleInterval);
                    titleInterval = null;
                }
                document.title = originalTitle;
            }
        };

        // Update originalTitle when it changes
        const titleElement = document.querySelector('title');
        const observer = new MutationObserver(() => {
            if (!document.hidden) {
                originalTitle = document.title;
            }
        });

        if (titleElement) {
            observer.observe(titleElement, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (titleInterval) {
                clearInterval(titleInterval);
            }
            observer.disconnect();
        };
    }, []);

    return null; // This component doesn't render anything
};

export default DynamicPageTitle;
