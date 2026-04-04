// @/locale/requests.js

import fs from 'node:fs';
import path from 'node:path';
import { cookies, headers } from 'next/headers';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { getSettings } from '@/lib/server/settings';
import { getBundledTranslations } from './_messages';
import { COOKIE_NAME, defaultLocale, locales } from './config';

function getSafeLanguages(list = []) {
    return Array.isArray(list) ? list.filter((lang) => hasLocale(locales, lang)) : [];
}

function resolveContextLocale({ context = 'frontend', candidate = null, siteSettings = null }) {
    const isAdminContext = context === 'admin';
    const allowedLanguages = getSafeLanguages(
        isAdminContext ? siteSettings?.adminLanguages : siteSettings?.languages
    );

    const defaultForContext =
        (isAdminContext ? siteSettings?.adminLanguage : siteSettings?.language) || defaultLocale || 'en';

    const safeDefault = hasLocale(locales, defaultForContext) ? defaultForContext : defaultLocale || 'en';

    if (hasLocale(locales, candidate) && allowedLanguages.includes(candidate)) {
        return candidate;
    }

    if (allowedLanguages.includes(safeDefault)) {
        return safeDefault;
    }

    if (allowedLanguages.length > 0) {
        return allowedLanguages[0];
    }

    return safeDefault;
}

async function buildI18nConfig(locale) {
    const currentMessages = await loadTranslations(locale);
    let messages = currentMessages;

    if (locale !== (defaultLocale || 'en')) {
        const fallbackMessages = await loadTranslations(defaultLocale || 'en');
        messages = mergeWithFallback(currentMessages, fallbackMessages);
    }

    return {
        locale,
        messages,
        onError: (error) => {
            if (error && error.code === 'MISSING_MESSAGE') return;
            console.error('Translation error:', error);
        },
        getMessageFallback: ({ namespace, key, error }) => {
            const keyPath = namespace ? `${namespace}.${key}` : key;
            if (process.env.NODE_ENV === 'development') {
                console.warn(`Missing translation: ${keyPath} (${error?.code})`);
            }
            return keyPath;
        }
    };
}

// Determine context based on URL path
function getContextFromPath(pathname) {
    if (!pathname) return 'frontend';

    // Normalize pathname - remove leading slashes and query params
    const normalizedPath = pathname.replace(/^\/+/, '').split('?')[0];

    if (normalizedPath.startsWith('admin')) return 'admin';
    if (normalizedPath.startsWith('auth') || normalizedPath.includes('login') || normalizedPath.includes('register')) return 'auth';

    return 'frontend';
}

// Extract pathname from various header sources
function extractPathnameFromHeaders(headersList) {
    // Try x-pathname first (set by middleware)
    const xPathname = headersList.get('x-pathname');
    if (xPathname) return xPathname;

    // Try referer header and extract pathname
    const referer = headersList.get('referer');
    if (referer) {
        try {
            const url = new URL(referer);
            return url.pathname;
        } catch (_e) {
            // If URL parsing fails, try to extract path directly
            const pathMatch = referer.match(/https?:\/\/[^\/]+(\/[^\?#]*)/);
            if (pathMatch) return pathMatch[1];
        }
    }

    // Try x-invoke-path (Vercel-specific header)
    const invokePath = headersList.get('x-invoke-path');
    if (invokePath) return invokePath;

    return '';
}

// Load and merge translation JSON files from the locale folder
async function loadTranslations(locale) {
    // Prefer bundled imports so the Next/Vercel build includes translations.
    // This avoids reading from the filesystem at runtime in production
    // (serverless/edge environments where the source files may not be available).
    try {
        const bundled = getBundledTranslations(locale);
        if (bundled && Object.keys(bundled).length > 0) return bundled;
    } catch (_e) {
        // fallthrough to fs-based loader for development/local runs
    }

    // Fallback to filesystem-based loader (works in local dev).
    // All translation files are in src/locale/messages/[locale]/
    const merged = {};
    const messagesDir = path.join(process.cwd(), 'src', 'locale', 'messages', locale);

    try {
        if (fs.existsSync(messagesDir)) {
            const files = fs.readdirSync(messagesDir).filter((f) => f.endsWith('.json'));
            
            // Define which files belong to which context
            const contextFiles = {
                system: ['Auth.json', 'Admin.json', 'Cart.json', 'Checkout.json', 'GDPR.json', 'HomePage.json', 'Shop.json', 'Email.json', 'Invoice.json', 'SMS.json']
            };

            // Always load frontend files as base
            for (const file of files) {
                if (contextFiles.system.includes(file)) {
                    try {
                        const filePath = path.join(messagesDir, file);
                        const content = fs.readFileSync(filePath, 'utf8');
                        const parsed = JSON.parse(content);
                        Object.assign(merged, parsed);
                    } catch (_e) {
                        console.error(`Error loading translation ${file}:`, _e?.message || _e);
                    }
                }
            }
        }
    } catch (_e) {
        console.error(`Error reading translations from ${messagesDir}:`, _e?.message || _e);
    }

    return merged;
}

// Merge fallback messages into current messages (only fill missing keys)
function mergeWithFallback(current, fallback) {
    const result = { ...current };
    for (const [key, value] of Object.entries(fallback || {})) {
        if (!(key in result)) {
            result[key] = value;
        } else if (
            typeof value === 'object' &&
            value !== null &&
            typeof result[key] === 'object' &&
            result[key] !== null
        ) {
            result[key] = mergeWithFallback(result[key], value);
        }
    }
    return result;
}

export default getRequestConfig(async () => {
    // Determine locale server-side without relying on URL segments.
    // Priority: cookie candidate -> context-aware validation against site settings
    let candidate = null;
    let pathname = '';
    let context = 'frontend';

    try {
        // cookies() may be async in some Next.js runtimes — await it before using
        const store = await cookies();
        candidate = store.get(COOKIE_NAME)?.value || null;
    } catch (_e) {
        candidate = null;
    }

    try {
        const headersList = await headers();
        pathname = extractPathnameFromHeaders(headersList);
        context = getContextFromPath(pathname);
    } catch (_e) {
        pathname = '';
        context = 'frontend';
    }

    let siteSettings = null;
    try {
        const settingsResult = await getSettings();
        siteSettings = settingsResult?.siteSettings || null;
    } catch (_err) {
        // ignore
    }

    const locale = resolveContextLocale({
        context,
        candidate,
        siteSettings
    });

    return buildI18nConfig(locale);
});
