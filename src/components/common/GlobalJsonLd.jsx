// @/components/common/GlobalJsonLd.jsx

import Script from 'next/script';

const DEFAULT_BASE_URL = 'https://yourdomain.com';

const pathLabels = {
    shop: 'Shop',
    products: 'Products',
    cart: 'Cart',
    checkout: 'Checkout',
    account: 'Account',
    orders: 'Orders',
    about: 'About',
    contact: 'Contact',
    help: 'Help',
    blog: 'Blog',
    news: 'News',
    legal: 'Legal',
    privacy: 'Privacy',
    terms: 'Terms',
    faq: 'FAQ',
    support: 'Support',
    search: 'Search',
    category: 'Category',
    categories: 'Categories',
    press: 'Press',
    research: 'Research',
    resources: 'Resources',
    club: 'Club'
};

const toDisplayName = (segment) => {
    const lower = segment.toLowerCase();
    if (pathLabels[lower]) return pathLabels[lower];
    return lower
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const buildBreadcrumbSchema = (baseUrl, pathname) => {
    const parts = String(pathname || '/')
        .split('/')
        .filter(Boolean);

    const itemListElement = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: baseUrl
        }
    ];

    let currentPath = '';
    parts.forEach((part, index) => {
        currentPath += `/${part}`;
        itemListElement.push({
            '@type': 'ListItem',
            position: index + 2,
            name: toDisplayName(part),
            item: `${baseUrl}${currentPath}`
        });
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement
    };
};

const buildOrganizationSchema = (siteSettings, storeSettings, baseUrl) => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': baseUrl,
    name: siteSettings?.siteName || storeSettings?.businessName,
    url: baseUrl,
    logo: siteSettings?.siteLogo || `${baseUrl}/images/logo.png`,
    sameAs: siteSettings?.socialNetworks?.map((social) => social.url) || [],
    contactPoint: [
        {
            '@type': 'ContactPoint',
            telephone: siteSettings?.sitePhone,
            contactType: 'customer service',
            email: siteSettings?.siteEmail,
            availableLanguage: siteSettings?.availableLanguages || ['pt']
        }
    ],
    address: {
        '@type': 'PostalAddress',
        streetAddress: siteSettings?.businessAddress || 'Your Street Address',
        addressLocality: siteSettings?.businessCity || 'Your City',
        postalCode: siteSettings?.businessCp || 'XXXX-XXX',
        addressCountry: siteSettings?.countryIso || 'PT'
    }
});

const buildLocalBusinessSchema = (siteSettings, storeSettings, baseUrl) => ({
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': baseUrl,
    name: siteSettings?.siteName || storeSettings?.businessName,
    description: siteSettings?.siteDescription,
    url: baseUrl,
    telephone: siteSettings?.sitePhone,
    address: {
        streetAddress: siteSettings?.businessAddress || 'Your Street Address',
        addressLocality: siteSettings?.businessCity || 'Your City',
        postalCode: siteSettings?.businessCp || 'XXXX-XXX',
        addressCountry: siteSettings?.countryIso || 'PT'
    },
    geo: {
        latitude: '41.5454',
        longitude: '-8.4265'
    },
    image: siteSettings?.ogImage || `${baseUrl}/og-image.jpg`,
    priceRange: storeSettings?.currency === 'EUR' ? 'EUR' : 'USD',
    openingHoursSpecification:
        siteSettings?.workingHours && siteSettings.workingHours.length > 0
            ? siteSettings.workingHours.map((slot) => ({
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: slot.dayOfWeek,
                  opens: slot.opens,
                  closes: slot.closes
              }))
            : [
                  {
                      '@type': 'OpeningHoursSpecification',
                      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                      opens: '09:00',
                      closes: '20:00'
                  },
                  {
                      '@type': 'OpeningHoursSpecification',
                      dayOfWeek: ['Saturday'],
                      opens: '10:00',
                      closes: '18:00'
                  }
              ]
});

const GlobalJsonLd = ({ siteSettings, storeSettings, pathname = '/' }) => {
    const hasSettings = Boolean(siteSettings && storeSettings);
    if (!hasSettings) return null;

    const baseUrl = siteSettings?.baseUrl || DEFAULT_BASE_URL;

    const organizationSchema = buildOrganizationSchema(siteSettings, storeSettings, baseUrl);
    const localBusinessSchema = buildLocalBusinessSchema(siteSettings, storeSettings, baseUrl);
    const breadcrumbSchema = buildBreadcrumbSchema(baseUrl, pathname);

    return (
        <>
            <Script
                type="application/ld+json"
                id="organization-jsonld"
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <Script
                type="application/ld+json"
                id="local-business-jsonld"
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
            />
            <Script
                type="application/ld+json"
                id="breadcrumbs-jsonld"
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
        </>
    );
};

export default GlobalJsonLd;