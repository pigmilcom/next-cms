// @/lib/server/locale.js

'use server';

import fs from 'fs';
import path from 'path';

// ============================================================================
// LOCALE & LANGUAGE FUNCTIONS
// ============================================================================

/**
 * Get all available languages from a specific context (frontend, backend, auth)
 * @param {Object} options - Options object
 * @param {boolean} options.frontend - If true, reads from frontend locale, else from messages
 * @returns {Promise<Object>} Available languages result
 */
export const getAvailableLanguages = async ({ frontend = false } = {}) => {
    try { 
        let localeDir = path.join(process.cwd(), 'src', 'locale', 'messages');
        if(frontend) {
            localeDir = path.join(process.cwd(), 'src', 'app', '(frontend)', 'locale');
        }
        // Check if context directory exists
        if (!fs.existsSync(localeDir)) {
            return {
                success: false,
                error: `Locale context directory not found: ${localeDir}`,
                data: []
            };
        }

        // Get all directories in the context folder (each directory represents a language)
        const items = fs.readdirSync(localeDir, { withFileTypes: true });
        const languages = items
            .filter((item) => item.isDirectory())
            .map((item) => item.name)
            .filter((name) => name !== 'node_modules' && !name.startsWith('.'))
            .sort();

        return {
            success: true,
            data: languages
        };
    } catch (error) {
        console.error(`Failed to get available languages:`, error);
        return {
            success: false,
            error: `Failed to read locale directory: ${error.message || 'Unknown error'}`,
            data: []
        };
    }
};

/**
 * Get available languages for all contexts
 * @returns {Promise<Object>} Available languages for frontend, backend, and auth
 */
export const getAllAvailableLanguages = async () => {
    try {
        // Get languages for frontend (from @/app/(frontend)/locale)
        const frontendResult = await getAvailableLanguages({ frontend: true });
        
        // Get languages for backend/system (from @/locale/messages)
        const messagesResult = await getAvailableLanguages({ frontend: false });

        return {
            success: true,
            data: {
                frontend: frontendResult.success ? frontendResult.data : [],
                backend: messagesResult.success ? messagesResult.data : [],
                auth: messagesResult.success ? messagesResult.data : []
            }
        };
    } catch (error) {
        console.error('Failed to get all available languages:', error);
        return {
            success: false,
            error: error?.message || 'Failed to get all available languages',
            data: {
                frontend: [],
                backend: [],
                auth: []
            }
        };
    }
};

/**
 * Get merged available languages across frontend and backend contexts.
 * Removes duplicates and falls back to English when none are available.
 * @returns {Promise<Object>} Merged languages result
 */
export const getMergedAvailableLanguages = async () => {
    try {
        const result = await getAllAvailableLanguages();

        if (!result.success || !result.data) {
            return {
                success: true,
                data: ['en']
            };
        }

        const frontendLanguages = result.data.frontend || [];
        const backendLanguages = result.data.backend || [];
        const mergedLanguages = [...new Set([...frontendLanguages, ...backendLanguages])].filter(Boolean);

        return {
            success: true,
            data: mergedLanguages.length > 0 ? mergedLanguages : ['en']
        };
    } catch (error) {
        console.error('Failed to get merged available languages:', error);
        return {
            success: false,
            error: error.message || 'Failed to get merged available languages',
            data: ['en']
        };
    }
};

/**
 * Get languages that can be used for invoices.
 * Returns backend/frontend language sets and the shared set where Invoice.json exists.
 * @returns {Promise<Object>} Invoice languages result
 */
export const getAvailableInvoiceLanguages = async () => {
    try {
        const [frontendResult, backendResult] = await Promise.all([
            getAvailableLanguages({ frontend: true }),
            getAvailableLanguages({ frontend: false })
        ]);

        const frontendLanguages = frontendResult?.success ? frontendResult.data : [];
        const backendLanguages = backendResult?.success ? backendResult.data : [];

        const backendWithInvoice = backendLanguages.filter((lang) => {
            const invoiceFile = path.join(process.cwd(), 'src', 'locale', 'messages', lang, 'Invoice.json');
            return fs.existsSync(invoiceFile);
        });

        const sharedInvoiceLanguages = backendWithInvoice.filter((lang) => frontendLanguages.includes(lang));
        const available = sharedInvoiceLanguages.length > 0 ? sharedInvoiceLanguages : backendWithInvoice;

        return {
            success: true,
            data: available,
            frontend: frontendLanguages,
            backend: backendLanguages,
            backendWithInvoice,
            shared: sharedInvoiceLanguages
        };
    } catch (error) {
        console.error('Failed to get available invoice languages:', error);
        return {
            success: false,
            error: error?.message || 'Failed to get available invoice languages',
            data: [],
            frontend: [],
            backend: [],
            backendWithInvoice: [],
            shared: []
        };
    }
};

/**
 * Check if a specific language exists in a context directory
 * @param {string} languageCode - The language code to check (e.g., 'en', 'es')
 * @param {string} context - Context to check ('frontend', 'backend', 'auth')
 * @returns {Promise<Object>} Result indicating if language exists
 */
export const languageExists = async (languageCode, context = 'frontend') => {
    try {
        if (!languageCode) {
            return {
                success: false,
                error: 'Language code is required',
                exists: false
            };
        }

        const localeDir = path.join(process.cwd(), 'src', 'locale', context);
        const languageDir = path.join(localeDir, languageCode);

        const exists = fs.existsSync(languageDir) && fs.statSync(languageDir).isDirectory();

        return {
            success: true,
            exists,
            data: { languageCode, context, exists }
        };
    } catch (error) {
        console.error(`Failed to check if language exists (${languageCode} in ${context}):`, error);
        return {
            success: false,
            error: error.message || 'Failed to check language existence',
            exists: false
        };
    }
};

/**
 * Get the default language for a specific context (first available language or 'en')
 * @param {string} context - Context to get default language from ('frontend', 'backend', 'auth')
 * @returns {Promise<Object>} Default language result
 */
export const getDefaultLanguage = async (context = 'frontend') => {
    try {
        const result = await getAvailableLanguages({ frontend: context === 'frontend' });

        if (result.success && result.data.length > 0) {
            // Prefer 'en' if it exists, otherwise use first available
            const defaultLang = result.data.includes('en') ? 'en' : result.data[0];

            return {
                success: true,
                data: defaultLang,
                context
            };
        }

        // Fallback to 'en'
        return {
            success: true,
            data: 'en',
            context
        };
    } catch (error) {
        console.error(`Failed to get default language for ${context}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to get default language',
            data: 'en',
            context
        };
    }
};

/**
 * Get locale file path for a specific language, context, and namespace
 * @param {string} languageCode - The language code (e.g., 'en', 'es')
 * @param {string} context - The context ('frontend', 'backend', 'auth')
 * @param {string} namespace - The translation namespace (e.g., 'Cart', 'Shop', 'Auth')
 * @returns {string} Full path to the locale file
 */
export async function getLocaleFilePath(languageCode, context = 'frontend', namespace = 'common') {
    const localeDir = path.join(process.cwd(), 'src', 'locale', context);
    return path.join(localeDir, languageCode, `${namespace}.json`);
}

/**
 * Read translations from a specific locale file
 * @param {string} languageCode - The language code
 * @param {string} context - The context ('frontend', 'backend', 'auth')
 * @param {string} namespace - The translation namespace
 * @returns {Promise<Object>} Translations result
 */
export const getTranslations = async (languageCode, context = 'frontend', namespace = 'common') => {
    try {
        if (!languageCode) {
            return {
                success: false,
                error: 'Language code is required',
                data: {}
            };
        }

        const filePath = await getLocaleFilePath(languageCode, context, namespace);

        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                error: `Translation file not found: ${context}/${languageCode}/${namespace}.json`,
                data: {}
            };
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const translations = JSON.parse(fileContent);

        return {
            success: true,
            data: translations,
            context
        };
    } catch (error) {
        console.error(`Failed to read translations (${context}/${languageCode}/${namespace}):`, error);
        return {
            success: false,
            error: error.message || 'Failed to read translation file',
            data: {}
        };
    }
};

/**
 * Get all translation namespaces available for a language in a specific context
 * @param {string} languageCode - The language code
 * @param {string} context - The context ('frontend', 'backend', 'auth')
 * @returns {Promise<Object>} Available namespaces result
 */
export const getLanguageNamespaces = async (languageCode, context = 'frontend') => {
    try {
        if (!languageCode) {
            return {
                success: false,
                error: 'Language code is required',
                data: []
            };
        }

        const localeDir = path.join(process.cwd(), 'src', 'locale', context);
        const languageDir = path.join(localeDir, languageCode);

        if (!fs.existsSync(languageDir)) {
            return {
                success: false,
                error: `Language directory not found: ${context}/${languageCode}`,
                data: []
            };
        }

        const files = fs.readdirSync(languageDir);
        const namespaces = files
            .filter((file) => file.endsWith('.json'))
            .map((file) => file.replace('.json', ''))
            .sort();

        return {
            success: true,
            data: namespaces,
            context
        };
    } catch (error) {
        console.error(`Failed to get language namespaces (${context}/${languageCode}):`, error);
        return {
            success: false,
            error: error.message || 'Failed to read language namespaces',
            data: []
        };
    }
};

/**
 * Usage examples:
 *
 * // Get all available languages for frontend
 * const frontendLangs = await getAvailableLanguages('frontend');
 * // { success: true, data: ['en', 'es', 'fr', 'pt'], context: 'frontend' }
 *
 * // Get all available languages for backend
 * const backendLangs = await getAvailableLanguages('backend');
 * // { success: true, data: ['en', 'es', 'fr', 'pt'], context: 'backend' }
 *
 * // Get all available languages for all contexts
 * const allLangs = await getAllAvailableLanguages();
 * // { success: true, data: { frontend: ['en', 'es'...], backend: ['en', 'es'...], auth: ['en', 'es'...] } }
 *
 * // Check if a language exists in frontend
 * const exists = await languageExists('en', 'frontend');
 * // { success: true, exists: true, data: { languageCode: 'en', context: 'frontend', exists: true } }
 *
 * // Get default language for backend
 * const defaultLang = await getDefaultLanguage('backend');
 * // { success: true, data: 'en', context: 'backend' }
 *
 * // Get translations for a language/context/namespace
 * const translations = await getTranslations('en', 'frontend', 'Cart');
 * // { success: true, data: { addToCart: 'Add to Cart', ... }, context: 'frontend' }
 *
 * // Get all namespaces for a language in backend
 * const namespaces = await getLanguageNamespaces('en', 'backend');
 * // { success: true, data: ['Admin', 'Orders'], context: 'backend' }
 */
