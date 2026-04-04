// @/utils/crawlerDetection.js

/**
 * Detects if the current visitor is a search engine crawler/bot
 *
 * @returns {boolean} True if the visitor is a crawler, false otherwise
 *
 * This function is used to identify automated bots and search engine crawlers
 * to provide them with full content access for SEO purposes while maintaining
 * different behavior (like age verification, cookie consent) for real users.
 *
 * Common use cases:
 * - Skip age verification for crawlers (SEO optimization)
 * - Auto-accept analytics for crawlers (SEO tool detection)
 * - Bypass GDPR consent for bots (they don't have privacy concerns)
 */
export const isSearchEngineCrawler = () => {
    // During SSR or if navigator is unavailable, assume it's a crawler
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return true;
    }

    const userAgent = navigator.userAgent.toLowerCase();

    // List of known crawler user agent strings
    const crawlers = [
        // Major Search Engines
        'googlebot', // Google Search
        'bingbot', // Bing Search
        'slurp', // Yahoo Search
        'duckduckbot', // DuckDuckGo
        'baiduspider', // Baidu (Chinese search engine)
        'yandexbot', // Yandex (Russian search engine)
        'applebot', // Apple Search
        'sogou', // Sogou (Chinese search engine)
        'exabot', // Exalead Search
        'ia_archiver', // Alexa Crawler

        // Social Media Crawlers
        'facebookexternalhit', // Facebook Link Preview
        'facebookcatalog', // Facebook Catalog
        'twitterbot', // Twitter Link Preview
        'linkedinbot', // LinkedIn Link Preview
        'pinterest', // Pinterest Bot
        'slackbot', // Slack Link Preview
        'discordbot', // Discord Link Preview
        'telegrambot', // Telegram Link Preview
        'redditbot', // Reddit Link Preview
        'whatsapp', // WhatsApp Link Preview
        'vkshare', // VKontakte (Russian social network)
        'tumblr', // Tumblr Bot
        'instagrambot', // Instagram Bot

        // SEO & Analytics Tools
        'ahrefsbot', // Ahrefs SEO
        'semrushbot', // SEMrush SEO
        'mj12bot', // Majestic SEO
        'dotbot', // Moz/OpenLinkProfiler
        'rogerbot', // Moz SEO Tools
        'petalbot', // Huawei/Aspiegel Search
        'screaming frog', // Screaming Frog SEO Spider
        'sitebulb', // Sitebulb SEO Crawler
        'seokicks', // SEOkicks Robot
        'serpstatbot', // Serpstat SEO
        'spbot', // SEO Profiler
        'linkdexbot', // Linkdex SEO

        // Content & Archive Crawlers
        'embedly', // Embedly Service
        'quora link preview', // Quora Link Preview
        'showyoubot', // ShowYou Bot
        'outbrain', // Outbrain Content Discovery
        'flipboard', // Flipboard Proxy
        'archive.org_bot', // Internet Archive
        'wayback', // Wayback Machine

        // Development & Testing Tools
        'lighthouse', // Google Lighthouse
        'chrome-lighthouse', // Chrome Lighthouse
        'pagespeed', // Google PageSpeed
        'gtmetrix', // GTmetrix
        'pingdom', // Pingdom
        'w3c_validator', // W3C Markup Validator
        'validator.nu', // HTML5 Validator

        // Other Notable Crawlers
        'seznambot', // Seznam.cz (Czech search engine)
        'scrapy', // Scrapy Framework
        'bingpreview', // Bing Preview
        'zoom.ai', // Zoom.ai Bot
        'skypeuripreview', // Skype URL Preview
        'nuzzel', // Nuzzel News Aggregator
        'mediapartners-google', // Google AdSense
        'adsbot-google', // Google Ads Bot
        'feedfetcher-google', // Google Feed Fetcher
        'feedburner', // FeedBurner
        'bot', // Generic bot identifier (catch-all, keep last)
        'crawler', // Generic crawler identifier (catch-all, keep last)
        'spider' // Generic spider identifier (catch-all, keep last)
    ];

    return crawlers.some((crawler) => userAgent.includes(crawler));
};

export default isSearchEngineCrawler;
