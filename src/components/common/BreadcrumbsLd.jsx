// @/components/common/BreadcrumbsLd.jsx
'use client';

/**
 * Custom Breadcrumb JSON-LD Component
 *
 * Generates BreadcrumbList structured data for SEO.
 * Compatible with React 19 and Next.js 16.
 * Uses the same pattern as next-seo components.
 *
 * USAGE:
 * ```jsx
 * import BreadcrumbsLd from '@/components/common/BreadcrumbsLd';
 *
 * // Manual items
 * <BreadcrumbsLd
 *   items={[
 *     { name: 'Home', url: 'https://example.com' },
 *     { name: 'Products', url: 'https://example.com/products' }
 *   ]}
 * />
 *
 * // Auto-generate from URL (no items prop needed)
 * <BreadcrumbsLd />
 * ```
 *
 * PROPS:
 * - items (optional): Array of breadcrumb objects { name: string, url: string }
 *   If not provided, automatically generates from current URL
 * - schemaId (optional): Custom @id for the schema
 *
 * FEATURES:
 * - Automatic breadcrumb generation from URL pathname
 * - Portuguese path translations
 * - Automatic position numbering
 * - SEO-friendly JSON-LD format
 * - React 19 compatible
 */

import { usePathname } from 'next/navigation';
import { useSettings } from '@/context/providers';

// Portuguese translations for common paths
const pathTranslations = {
    shop: 'Loja',
    products: 'Produtos',
    cart: 'Carrinho',
    checkout: 'Finalizar Compra',
    account: 'Conta',
    orders: 'Encomendas',
    about: 'Sobre Nós',
    contact: 'Contacto',
    help: 'Ajuda',
    blog: 'Blog',
    news: 'Notícias',
    legal: 'Legal',
    privacy: 'Privacidade',
    terms: 'Termos',
    faq: 'FAQ',
    support: 'Suporte',
    search: 'Pesquisar',
    category: 'Categoria',
    categories: 'Categorias',
    press: 'Imprensa',
    research: 'Investigação',
    resources: 'Recursos',
    club: 'Clube'
};

/**
 * Generate breadcrumb items from current URL pathname
 */
const generateBreadcrumbsFromUrl = (pathname, baseUrl) => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', url: baseUrl }];

    let currentPath = '';
    paths.forEach((path) => {
        currentPath += `/${path}`;

        // Get translated name or format the path segment
        const name = pathTranslations[path] || path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');

        breadcrumbs.push({
            name,
            url: `${baseUrl}${currentPath}`
        });
    });

    return breadcrumbs;
};

const BreadcrumbsLd = ({ items, schemaId }) => {
    const pathname = usePathname();
    const { siteSettings } = useSettings();

    const baseUrl = siteSettings?.baseUrl || 'https://yourdomain.com';
    let breadcrumbItems;

    // If items provided manually, prepend Home if not already present
    if (items && Array.isArray(items) && items.length > 0) {
        const firstItem = items[0];
        const isFirstItemHome =
            firstItem?.name?.toLowerCase() === 'home' || firstItem?.url === baseUrl || firstItem?.item === baseUrl;

        if (isFirstItemHome) {
            // Home already exists, use items as-is
            breadcrumbItems = items;
        } else {
            // Prepend Home to the items
            breadcrumbItems = [{ name: 'Home', url: baseUrl }, ...items];
        }
    } else {
        // Auto-generate breadcrumbs from URL
        breadcrumbItems = generateBreadcrumbsFromUrl(pathname, baseUrl);
    }

    // Validate items
    if (!Array.isArray(breadcrumbItems) || breadcrumbItems.length === 0) {
        return null;
    }

    // Generate JSON-LD schema
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        ...(schemaId && { '@id': schemaId }),
        itemListElement: breadcrumbItems.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name || item.title || 'Untitled',
            item: item.url || item.item || ''
        }))
    };

    // Return script tag directly (same pattern as next-seo)
    return (
        <script
            type="application/ld+json"
            id="breadcrumbs-jsonld"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
    );
};

export default BreadcrumbsLd;

/**
 * HELPER FUNCTIONS
 * Optional utilities for generating breadcrumb items
 */

/**
 * Generate breadcrumbs from URL pathname
 * @param {string} baseUrl - Base URL of the site
 * @param {string} pathname - Current pathname (e.g., '/shop/products/cbd-oil')
 * @param {Object} labels - Custom labels for paths { 'shop': 'Loja', 'products': 'Produtos' }
 * @returns {Array} Breadcrumb items array
 */
export const generateBreadcrumbsFromPath = (baseUrl, pathname, labels = {}) => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', url: baseUrl }];

    let currentPath = '';
    paths.forEach((path) => {
        currentPath += `/${path}`;
        breadcrumbs.push({
            name: labels[path] || path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
            url: `${baseUrl}${currentPath}`
        });
    });

    return breadcrumbs;
};

/**
 * Create breadcrumb item
 * @param {string} name - Display name
 * @param {string} url - Full URL
 * @returns {Object} Breadcrumb item
 */
export const createBreadcrumbItem = (name, url) => ({ name, url });
