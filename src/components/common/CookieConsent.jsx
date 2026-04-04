// @/components/common/CookieConsent.jsx

'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';
import { useSettings } from '@/context/providers';
import { isSearchEngineCrawler } from '@/utils/crawlerDetection';
import getConfig from './CookieConsentConfig';

// Load Google Analytics directly for crawlers (SEO purposes) with Consent Mode v2
const loadGoogleAnalyticsForCrawlers = async (siteSettings) => {
    try {
        if (siteSettings?.googleAnalyticsEnabled && siteSettings.googleAnalyticsApiKey) {
            const GA_ID = siteSettings.googleAnalyticsApiKey;
            // Check if script is already loaded
            if (document.getElementById('ga-script')) return;

            // Initialize dataLayer and gtag
            window.dataLayer = window.dataLayer || [];
            function gtag() {
                window.dataLayer.push(arguments);
            }
            window.gtag = gtag;

            // Set Consent Mode v2 defaults (granted for crawlers)
            gtag('consent', 'default', {
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted',
                analytics_storage: 'granted',
                functionality_storage: 'granted',
                personalization_storage: 'granted',
                security_storage: 'granted'
            });

            // Load gtag script
            const script = document.createElement('script');
            script.id = 'ga-script';
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
            document.head.appendChild(script);

            script.onload = () => {
                window.gtag('js', new Date());
                window.gtag('config', GA_ID, {
                    anonymize_ip: true,
                    cookie_flags: 'SameSite=None;Secure'
                });
                console.log('Google Analytics with Consent Mode v2 loaded for SEO crawler:', GA_ID);
            };
        }
    } catch (error) {
        console.warn('Failed to load Google Analytics for crawler:', error);
    }
};

const CookieConsentBanner = () => {
    const router = useRouter();
    const t = useTranslations('GDPR');
    const locale = useLocale();
    const { siteSettings } = useSettings();
    const [isInitialized, setIsInitialized] = useState(false);
    const [isCrawler, setIsCrawler] = useState(false);

    useEffect(() => {
        // detect crawler and load GA directly
        const crawlerDetected = isSearchEngineCrawler();
        setIsCrawler(crawlerDetected);

        if (crawlerDetected) {
            loadGoogleAnalyticsForCrawlers(siteSettings);
            setIsInitialized(true);
            return;
        }

        // build translations object dynamically
        const loadCookieBanner = async () => {
            try {
                const translations = {
                    consentModal: {
                        title: `${t('consentModal.title')}`,
                        description: t('consentModal.description'),
                        acceptAllBtn: t('consentModal.acceptAllBtn'),
                        acceptNecessaryBtn: t('consentModal.acceptNecessaryBtn'),
                        showPreferencesBtn: t('consentModal.showPreferencesBtn'),
                        footer: t('consentModal.footer')
                    },
                    preferencesModal: {
                        title: t('preferencesModal.title'),
                        acceptAllBtn: t('preferencesModal.acceptAllBtn'),
                        acceptNecessaryBtn: t('preferencesModal.acceptNecessaryBtn'),
                        savePreferencesBtn: t('preferencesModal.savePreferencesBtn'),
                        closeIconLabel: t('preferencesModal.closeIconLabel'),
                        serviceCounterLabel: t('preferencesModal.serviceCounterLabel'),
                        sections: {
                            privacyChoices: {
                                title: t('preferencesModal.sections.privacyChoices.title'),
                                description: t('preferencesModal.sections.privacyChoices.description')
                            },
                            necessary: {
                                title: t('preferencesModal.sections.necessary.title'),
                                description: t('preferencesModal.sections.necessary.description')
                            },
                            analytics: {
                                title: t('preferencesModal.sections.analytics.title'),
                                description: t('preferencesModal.sections.analytics.description')
                            },
                            advertising: {
                                title: t('preferencesModal.sections.advertising.title'),
                                description: t('preferencesModal.sections.advertising.description')
                            },
                            moreInfo: {
                                title: t('preferencesModal.sections.moreInfo.title'),
                                description: t('preferencesModal.sections.moreInfo.description')
                            }
                        },
                        cookieTable: {
                            caption: t('preferencesModal.cookieTable.caption'),
                            headers: {
                                name: t('preferencesModal.cookieTable.headers.name'),
                                domain: t('preferencesModal.cookieTable.headers.domain'),
                                desc: t('preferencesModal.cookieTable.headers.desc')
                            },
                            cookies: {
                                ga: t('preferencesModal.cookieTable.cookies.ga'),
                                gid: t('preferencesModal.cookieTable.cookies.gid')
                            }
                        }
                    }
                };

                window.CookieConsent = CookieConsent;
                window.next = { router };
                CookieConsent.run(getConfig(translations, siteSettings, locale));
                setIsInitialized(true);
            } catch (error) {
                console.error(`Failed to load GDPR: `, error);
            }
        };

        loadCookieBanner();

        return () => {
            if (isInitialized && !crawlerDetected) {
                delete window.CookieConsent;
                delete window.next;
            }
        };
    }, [router, t, locale, siteSettings]);

    /*
  return ( <div>
            <button type="button" onClick={CookieConsent.showPreferences}>
                Manage cookie preferences
            </button>
            <button type="button" onClick={ResetCookieConsent}>
                Reset cookie consent
            </button>
     </div>
    );
   */

    return <></>;
};

export default CookieConsentBanner;
