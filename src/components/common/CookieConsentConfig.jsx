// @/components/common/CookieConsentConfig.jsx
'use client';

// removed hook usage: locale must be passed in by caller
const getConfig = (translations, siteSettings, locale) => {
    const GA_ID = siteSettings?.googleAnalyticsApiKey || null;

    // Initialize gtag with Consent Mode v2 defaults (before script loads)
    const initializeConsentMode = () => {
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            window.dataLayer.push(arguments);
        }
        window.gtag = gtag;

        // Set default consent state (denied for GDPR compliance)
        // This should be called BEFORE loading the gtag script
        gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'granted', // Usually granted for essential site functionality
            personalization_storage: 'denied',
            security_storage: 'granted', // Usually granted for security purposes
            wait_for_update: 500 // Wait up to 500ms for consent update
        });

        console.log('Google Consent Mode v2 initialized with default settings');
    };

    // Update consent state based on user preferences
    const updateConsent = (categories) => {
        if (!window.gtag) return;

        const hasAnalytics = categories.includes('analytics');
        const hasAds = categories.includes('ads');

        window.gtag('consent', 'update', {
            ad_storage: hasAds ? 'granted' : 'denied',
            ad_user_data: hasAds ? 'granted' : 'denied',
            ad_personalization: hasAds ? 'granted' : 'denied',
            analytics_storage: hasAnalytics ? 'granted' : 'denied',
            personalization_storage: hasAnalytics ? 'granted' : 'denied'
        });

        console.log('Consent updated:', {
            analytics: hasAnalytics ? 'granted' : 'denied',
            ads: hasAds ? 'granted' : 'denied'
        });
    };

    // Google Analytics loading function
    const loadGoogleAnalytics = async () => {
        // Only load if measurement ID is available and integration is enabled
        if (!GA_ID || !siteSettings?.googleAnalyticsEnabled) {
            return;
        }

        // Initialize Consent Mode v2 if not already done
        if (!window.gtag) {
            initializeConsentMode();
        }

        // Check if script is already loaded
        if (document.getElementById('ga-script')) {
            console.log('Google Analytics script already loaded');
            return;
        }

        // Load gtag script
        const script = document.createElement('script');
        script.id = 'ga-script';
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        document.head.appendChild(script);

        // Wait for script to load before configuring
        script.onload = () => {
            window.gtag('js', new Date());
            window.gtag('config', GA_ID, {
                anonymize_ip: true, // Anonymize IP for GDPR compliance
                cookie_flags: 'SameSite=None;Secure'
            });
            console.log('Google Analytics loaded with measurement ID:', GA_ID);
        };
    };

    // Google Analytics removal function
    const removeGoogleAnalytics = () => {
        // Update consent to denied before removing
        if (window.gtag) {
            window.gtag('consent', 'update', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                personalization_storage: 'denied'
            });
        }

        // Remove script
        const script = document.getElementById('ga-script');
        if (script) {
            script.remove();
        }

        // Clear GA cookies (but keep consent state)
        const cookies = document.cookie.split(';');
        cookies.forEach((cookie) => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.startsWith('_ga') || name.startsWith('_gid')) {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${location.hostname}`;
            }
        });

        console.log('Google Analytics removed and consent revoked');
    };

    const config = {
        // root: 'body',
        // autoShow: true,
        // disablePageInteraction: true,
        // hideFromBots: true,
        // mode: 'opt-in',
        // revision: 0,

        cookie: {
            // name: 'cc_cookie',
            // domain: location.hostname,
            // path: '/',
            // sameSite: "Lax",
            // expiresAfterDays: 365,
        },

        /**
         * Callback functions
         */
        onFirstConsent: ({ cookie }) => {
            // console.log('onFirstConsent fired', cookie);

            // Update consent state immediately
            updateConsent(cookie.categories);

            // Load Google Analytics if analytics category is accepted
            if (cookie.categories.includes('analytics')) {
                loadGoogleAnalytics().catch((err) => console.error('Failed to load Google Analytics:', err));
            }
        },

        onConsent: ({ cookie }) => {
            // console.log('onConsent fired!', cookie);

            // Update consent state
            updateConsent(cookie.categories);

            // Load Google Analytics if analytics category is accepted
            if (cookie.categories.includes('analytics')) {
                loadGoogleAnalytics().catch((err) => console.error('Failed to load Google Analytics:', err));
            }
        },

        onChange: ({ changedCategories, changedServices, cookie }) => {
            // console.log('onChange fired!', changedCategories, changedServices);

            // Always update consent state when preferences change
            updateConsent(cookie.categories);

            // Handle analytics category changes
            if (changedCategories.includes('analytics')) {
                // Check if analytics is now accepted or rejected
                if (cookie.categories.includes('analytics')) {
                    loadGoogleAnalytics().catch((err) => console.error('Failed to load Google Analytics:', err));
                } else {
                    removeGoogleAnalytics();
                }
            }
        },

        onModalReady: ({ modalName }) => {
            // Add click handlers for privacy policy links to use router navigation
            const setupPrivacyLinks = () => {
                const links = document.querySelectorAll('#cc-main a[href="/legal/privacy-policy"]');
                links.forEach((link) => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (typeof window !== 'undefined' && window.next?.router) {
                            window.next.router.push('/legal/privacy-policy');
                        } else {
                            window.location.href = '/legal/privacy-policy';
                        }
                    });
                });
            };

            // Setup links when modal is ready
            setTimeout(setupPrivacyLinks, 100);
        },

        // https://cookieconsent.orestbida.com/reference/configuration-reference.html#guioptions
        guiOptions: {
            consentModal: {
                layout: 'cloud inline',
                position: 'bottom',
                equalWeightButtons: true,
                flipButtons: false
            },
            preferencesModal: {
                layout: 'box',
                equalWeightButtons: true,
                flipButtons: false
            }
        },

        categories: {
            necessary: {
                enabled: true, // this category is enabled by default
                readOnly: true // this category cannot be disabled
            },
            analytics: {
                autoClear: {
                    cookies: [
                        {
                            name: /^_ga/ // regex: match all cookies starting with '_ga'
                        },
                        {
                            name: '_gid' // string: exact cookie name
                        }
                    ]
                },

                // https://cookieconsent.orestbida.com/reference/configuration-reference.html#category-services
                services: {
                    ga: {
                        label: 'Google Analytics',
                        onAccept: () => {
                            updateConsent(['analytics']);
                            loadGoogleAnalytics().catch((err) =>
                                console.error('Failed to load Google Analytics:', err)
                            );
                        },
                        onReject: () => {
                            updateConsent([]);
                            removeGoogleAnalytics();
                        }
                    },
                    youtube: {
                        label: 'Youtube Embed',
                        onAccept: () => {
                            updateConsent(['analytics']);
                        },
                        onReject: () => {
                            updateConsent([]);
                        }
                    }
                }
            },
            ads: {
                services: {
                    google_ads: {
                        label: 'Google Ads',
                        onAccept: () => {
                            updateConsent(['ads']);
                        },
                        onReject: () => {
                            updateConsent([]);
                        }
                    }
                }
            }
        },

        language: {
            default: locale || 'en',
            translations: {
                [locale || 'en']: {
                    consentModal: {
                        title: translations?.consentModal?.title || '🍪 We use cookies',
                        description:
                            translations?.consentModal?.description ||
                            'We use cookies to improve your experience. Manage your preferences below.',
                        acceptAllBtn: translations?.consentModal?.acceptAllBtn || 'Accept all',
                        acceptNecessaryBtn: translations?.consentModal?.acceptNecessaryBtn || 'Reject all',
                        showPreferencesBtn:
                            translations?.consentModal?.showPreferencesBtn || 'Manage Individual preferences',
                        footer: `<a href="/legal/privacy-policy">${translations?.consentModal?.footer || 'Privacy Policy'}</a>`
                    },
                    preferencesModal: {
                        title: translations?.preferencesModal?.title || 'Manage cookie preferences',
                        acceptAllBtn: translations?.preferencesModal?.acceptAllBtn || 'Accept all',
                        acceptNecessaryBtn: translations?.preferencesModal?.acceptNecessaryBtn || 'Reject all',
                        savePreferencesBtn:
                            translations?.preferencesModal?.savePreferencesBtn || 'Accept current selection',
                        closeIconLabel: translations?.preferencesModal?.closeIconLabel || 'Close modal',
                        serviceCounterLabel: translations?.preferencesModal?.serviceCounterLabel || 'Service|Services',
                        sections: [
                            {
                                title:
                                    translations?.preferencesModal?.sections?.privacyChoices?.title ||
                                    'Your Privacy Choices',
                                description:
                                    translations?.preferencesModal?.sections?.privacyChoices?.description ||
                                    'In this panel you can express some preferences related to the processing of your personal information. You may review and change expressed choices at any time by resurfacing this panel via the provided link. To deny your consent to the specific processing activities described below, switch the toggles to off or use the "Reject all" button and confirm you want to save your choices.'
                            },
                            {
                                title:
                                    translations?.preferencesModal?.sections?.necessary?.title || 'Strictly Necessary',
                                description:
                                    translations?.preferencesModal?.sections?.necessary?.description ||
                                    'These cookies are essential for the proper functioning of the website and cannot be disabled.',
                                linkedCategory: 'necessary'
                            },
                            {
                                title:
                                    translations?.preferencesModal?.sections?.analytics?.title ||
                                    'Performance and Analytics',
                                description:
                                    translations?.preferencesModal?.sections?.analytics?.description ||
                                    'These cookies collect information about how you use our website. All of the data is anonymized and cannot be used to identify you.',
                                linkedCategory: 'analytics',
                                cookieTable: {
                                    caption: translations?.preferencesModal?.cookieTable?.caption || 'Cookie table',
                                    headers: {
                                        name: translations?.preferencesModal?.cookieTable?.headers?.name || 'Cookie',
                                        domain:
                                            translations?.preferencesModal?.cookieTable?.headers?.domain || 'Domain',
                                        desc:
                                            translations?.preferencesModal?.cookieTable?.headers?.desc || 'Description'
                                    },
                                    body: [
                                        {
                                            name: '_ga',
                                            domain: location.hostname,
                                            desc:
                                                translations?.preferencesModal?.cookieTable?.cookies?.ga ||
                                                'Google Analytics tracking cookie'
                                        },
                                        {
                                            name: '_gid',
                                            domain: location.hostname,
                                            desc:
                                                translations?.preferencesModal?.cookieTable?.cookies?.gid ||
                                                'Google Analytics identifier cookie'
                                        }
                                    ]
                                }
                            },
                            {
                                title:
                                    translations?.preferencesModal?.sections?.advertising?.title ||
                                    'Targeting and Advertising',
                                description:
                                    translations?.preferencesModal?.sections?.advertising?.description ||
                                    'These cookies are used to make advertising messages more relevant to you and your interests. The intention is to display ads that are relevant and engaging for the individual user and thereby more valuable for publishers and third party advertisers.',
                                linkedCategory: 'ads'
                            },
                            {
                                title: translations?.preferencesModal?.sections?.moreInfo?.title || 'More information',
                                description:
                                    translations?.preferencesModal?.sections?.moreInfo?.description ||
                                    'For any queries in relation to my policy on cookies and your choices, please <a href="/legal/privacy-policy">contact us</a>'
                            }
                        ]
                    }
                }
            }
        }
    };

    return config;
};

export default getConfig;
