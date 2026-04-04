// @/utils/metadata.js
// Universal SEO metadata helper for client-side and server-side pages

/**
 * USAGE GUIDE:
 *
 * 1. ROOT LAYOUT (@/app/layout.jsx):
 *    Use generateSiteMetadata() with siteSettings fetched once:
 *
 *    export async function generateMetadata() {
 *        const { siteSettings } = await getSettings();
 *        return generateSiteMetadata({ siteSettings });
 *    }
 *
 * 2. CHILD LAYOUTS (e.g., @/app/(backend)/layout.jsx):
 *    Use generatePageMetadata() to override specific fields:
 *
 *    export async function generateMetadata() {
 *        return generatePageMetadata({
 *            title: 'Administration',
 *            description: 'Admin panel'
 *        });
 *    }
 *
 * Next.js automatically merges child metadata with parent metadata.
 * No need to fetch siteSettings again in child layouts!
 */

/**
 * Generate Next.js metadata object for child routes (without siteSettings)
 * This function creates partial metadata that Next.js will merge with parent layout metadata.
 * Use this in child layouts when the root layout already provides siteSettings.
 *
 * @param {Object} options - Metadata generation options
 * @param {string} [options.title] - Page title (will be appended to site title)
 * @param {string} [options.description] - Page description (overrides parent)
 * @param {string} [options.keywords] - Page keywords (comma-separated or array)
 * @param {string} [options.image] - OG/Twitter image URL
 * @param {string} [options.canonical] - Canonical URL path
 * @param {Object} [options.openGraph] - Custom OpenGraph properties
 * @param {Object} [options.twitter] - Custom Twitter card properties
 * @param {Object} [options.robots] - Custom robots settings
 * @returns {Object} Partial Next.js metadata object
 */
export function generatePageMetadata(options = {}) {
    const { title, description, keywords, image, canonical, openGraph, twitter, robots } = options;

    const metadata = {};

    // Add title if provided
    if (title) {
        metadata.title = title;
    }

    // Add description if provided
    if (description) {
        metadata.description = description;
    }

    // Add keywords if provided
    if (keywords) {
        metadata.keywords = typeof keywords === 'string' ? keywords.split(',').map((k) => k.trim()) : keywords;
    }

    // Add OpenGraph overrides
    if (openGraph || title || description || image) {
        metadata.openGraph = {
            ...(openGraph || {}),
            ...(title && { title }),
            ...(description && { description }),
            ...(image && {
                images: [{ url: image, width: 1200, height: 630, alt: title || 'Page image' }]
            })
        };
    }

    // Add Twitter card overrides
    if (twitter || title || description || image) {
        metadata.twitter = {
            ...(twitter || {}),
            ...(title && { title }),
            ...(description && { description }),
            ...(image && { images: [image] })
        };
    }

    // Add robots if provided
    if (robots) {
        metadata.robots = robots;
    }

    // Add canonical if provided
    if (canonical) {
        metadata.alternates = {
            canonical
        };
    }

    return metadata;
}

/**
 * Generate Next.js metadata object for server-side rendering (ROOT LAYOUT ONLY)
 *
 * IMPORTANT: This function is synchronous (not async) because Next.js metadata
 * generation must return metadata synchronously even though generateMetadata() itself is async.
 *
 * Use this ONLY in the root layout (@/app/layout.jsx).
 * For child layouts, use generatePageMetadata() instead.
 *
 * @param {Object} options - Metadata generation options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} [options.keywords] - Page keywords (comma-separated or array)
 * @param {string} [options.image] - OG/Twitter image URL
 * @param {string} [options.canonical] - Canonical URL path (will be prefixed with base URL)
 * @param {Object} options.siteSettings - Site settings object (REQUIRED - must be passed from layout)
 * @param {Object} [options.storeSettings] - Store settings object (required only for product pages with productMeta)
 * @param {Object} [options.productMeta] - Product-specific metadata (price, currency, availability) - requires storeSettings
 * @returns {Object|null} Next.js metadata object or null if siteSettings not provided
 */
export function generateSiteMetadata(options = {}) {
    const { title, description, keywords, image, canonical, siteSettings, storeSettings, productMeta } = options;

    // Validate required siteSettings
    if (!siteSettings) {
        console.error('❌ generateSiteMetadata: siteSettings is REQUIRED. Must be passed from layout.');
        console.error('   Example: return generateSiteMetadata({ title: "Page", siteSettings });');
        return null;
    }

    const siteName = siteSettings?.siteName || '';

    // Extract canonical URL with proper fallback logic
    const canonicalUrl = canonical || siteSettings?.canonicalUrl || '/';
    const baseUrl = siteSettings?.baseUrl || 'http://localhost:3000';

    // Construct final canonical URL
    let finalCanonical;
    if (canonicalUrl.startsWith('http://') || canonicalUrl.startsWith('https://')) {
        // Already a full URL from siteSettings, use as-is
        finalCanonical = canonicalUrl;
    } else {
        // Relative path: ensure it starts with '/' and combine with baseUrl
        const path = canonicalUrl.startsWith('/') ? canonicalUrl : `/${canonicalUrl}`;
        finalCanonical = `${baseUrl}${path}`;
    }

    // Auto-extract title, description, keywords, and image from siteSettings if not provided
    const settingsTitle = siteSettings?.siteTitle || siteSettings?.siteName;
    const siteTitle = title || settingsTitle || 'MyApp';
    const finalTitle = siteTitle === settingsTitle ? siteTitle : `${siteTitle} | ${settingsTitle}`;
    const finalDescription = description || siteSettings?.siteDescription || '';
    const finalKeywords = keywords || siteSettings?.siteKeywords || '';
    const finalImage = image || siteSettings?.ogImage || `${baseUrl}/og-image.jpg`;

    // Process keywords
    const keywordsArray =
        typeof finalKeywords === 'string' ? finalKeywords.split(',').map((k) => k.trim()) : finalKeywords || [];

    // Build metadata object
    const metadata = {
        metadataBase: new URL(baseUrl),
        title: finalTitle,
        description: finalDescription,
        keywords: keywordsArray,
        openGraph: {
            type: 'website',
            title: finalTitle,
            description: finalDescription,
            siteName,
            locale: 'en_EN',
            ...(finalImage && {
                images: [{ url: finalImage, width: 1200, height: 630, alt: finalTitle }]
            })
        },
        twitter: {
            card: 'summary_large_image',
            title: finalTitle,
            description: finalDescription,
            ...(finalImage && { images: [finalImage] })
        },
        robots: {
            index: true,
            follow: true
        },
        ...(finalCanonical && {
            alternates: {
                canonical: finalCanonical
            }
        })
    };

    // Add product-specific metadata if provided (requires storeSettings)
    if (productMeta) {
        if (storeSettings) {
            metadata.other = {
                'product:price:amount': productMeta.price,
                'product:price:currency': productMeta.currency || storeSettings.currency || 'EUR',
                'product:availability': productMeta.availability,
                'product:condition': productMeta.condition || 'new'
            };
        }
    }

    return metadata;
}

/**
 * Sets SEO metadata tags for search engine crawlers (client-side only)
 * @param {Object} options - SEO metadata options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} [options.keywords] - Page keywords (comma-separated)
 * @param {string} [options.ogImage] - Open Graph image URL
 * @param {string} [options.ogUrl] - Open Graph URL (current page URL)
 * @param {string} [options.ogType] - Open Graph type (default: 'website', use 'product' for products)
 * @param {string} [options.ogSiteName] - Open Graph site name
 * @param {string} [options.twitterCard] - Twitter card type (default: 'summary_large_image')
 * @param {string} [options.twitterTitle] - Twitter title (defaults to title)
 * @param {string} [options.twitterDescription] - Twitter description (defaults to description)
 * @param {string} [options.twitterImage] - Twitter image (defaults to ogImage)
 * @param {string} [options.robots] - Robots meta tag (default: 'index, follow')
 * @param {string} [options.canonical] - Canonical URL
 * @param {Object} [options.productMeta] - Product-specific meta tags (price, currency, availability)
 * @param {Object} [options.additionalMeta] - Additional meta tags as key-value pairs
 */
export const setSEOMetadata = (options) => {
    const {
        title,
        description,
        keywords,
        ogImage,
        ogUrl,
        ogType = 'website',
        ogSiteName,
        twitterCard = 'summary_large_image',
        twitterTitle,
        twitterDescription,
        twitterImage,
        robots = 'index, follow',
        canonical,
        productMeta,
        additionalMeta = {}
    } = options;

    // Set page title
    if (title) {
        document.title = title;
    }

    // Set or update canonical link
    if (canonical) {
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink) {
            canonicalLink.setAttribute('href', canonical);
        } else {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            canonicalLink.setAttribute('href', canonical);
            document.head.appendChild(canonicalLink);
        }
    }

    // Set or update meta tag
    const setMetaTag = (selector, content, isProperty = false) => {
        if (!content) return;

        const attribute = isProperty ? 'property' : 'name';
        const existingTag = document.querySelector(selector);

        if (existingTag) {
            existingTag.setAttribute('content', content);
        } else {
            const meta = document.createElement('meta');
            if (isProperty) {
                meta.setAttribute('property', selector.replace('meta[property="', '').replace('"]', ''));
            } else {
                meta.setAttribute('name', selector.replace('meta[name="', '').replace('"]', ''));
            }
            meta.content = content;
            document.head.appendChild(meta);
        }
    };

    // Basic meta tags
    setMetaTag('meta[name="description"]', description);
    if (keywords) {
        setMetaTag('meta[name="keywords"]', keywords);
    }
    setMetaTag('meta[name="robots"]', robots);

    // Open Graph meta tags
    setMetaTag('meta[property="og:title"]', title, true);
    setMetaTag('meta[property="og:description"]', description, true);
    if (ogImage) {
        setMetaTag('meta[property="og:image"]', ogImage, true);
    }
    if (ogUrl) {
        setMetaTag('meta[property="og:url"]', ogUrl, true);
    }
    setMetaTag('meta[property="og:type"]', ogType, true);
    if (ogSiteName) {
        setMetaTag('meta[property="og:site_name"]', ogSiteName, true);
    }

    // Product-specific Open Graph meta tags
    if (productMeta) {
        if (productMeta.price) {
            setMetaTag('meta[property="product:price:amount"]', productMeta.price, true);
        }
        if (productMeta.currency) {
            setMetaTag('meta[property="product:price:currency"]', productMeta.currency, true);
        }
        if (productMeta.availability) {
            setMetaTag('meta[property="product:availability"]', productMeta.availability, true);
        }
    }

    // Twitter Card meta tags
    setMetaTag('meta[name="twitter:card"]', twitterCard);
    setMetaTag('meta[name="twitter:title"]', twitterTitle || title);
    setMetaTag('meta[name="twitter:description"]', twitterDescription || description);
    const twitterImageUrl = twitterImage || ogImage;
    if (twitterImageUrl) {
        setMetaTag('meta[name="twitter:image"]', twitterImageUrl);
    }

    // Additional custom meta tags
    Object.entries(additionalMeta).forEach(([key, value]) => {
        setMetaTag(`meta[name="${key}"]`, value);
    });
};

/**
 * Hook for setting SEO metadata in React components
 * @param {Object} metadata - SEO metadata options (same as setSEOMetadata)
 */
export const useSEO = (metadata) => {
    if (typeof window === 'undefined') return;

    // Use useEffect pattern
    const effect = () => {
        setSEOMetadata(metadata);
    };

    return effect;
};

/**
 * ============================================================================
 * JSON-LD STRUCTURED DATA - MIGRATED TO next-seo PLUGIN
 * ============================================================================
 *
 * All JSON-LD functions have been migrated to use the next-seo plugin.
 * next-seo provides better TypeScript support, automatic schema validation,
 * and simplified component-based API.
 *
 * Available next-seo JSON-LD Components:
 * - ProductJsonLd - Product pages
 * - OrganizationJsonLd - Organization/business info
 * - ArticleJsonLd - Blog posts and articles
 * - BreadcrumbJsonLd - Navigation breadcrumbs
 * - FAQJsonLd - FAQ pages
 * - LocalBusinessJsonLd - Local business pages
 * - ReviewJsonLd - Review pages
 * - And many more...
 *
 * For implementation examples, see: @/app/(frontend)/(blank)/page.client.jsx
 *
 * Installation: npm install next-seo
 * Documentation: https://github.com/garmeeh/next-seo
 * ============================================================================
 */
