// @/lib/client/translations.js

'use client';

import { useLocale } from 'next-intl';

// Helper function to get nested object value by dot notation path
const getNestedValue = (obj, path) => {
    if (!path) return '';
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return '';
        }
    }
    return result || '';
};

// Load translations dynamically based on locale and namespace
// Returns a simple translator function: t(key, vars?)
export const loadTranslations = (namespace = '', system = false) => {
    try {
        if(!namespace) {
            console.warn('Translation namespace is empty. Please provide a valid namespace to load translations.');
            return () => '';
        }
        const locale = useLocale();
        let file;
        if(system) {
            file = require(`@/locale/messages/${locale}/${namespace}.json`);
        } else {    
            file = require(`@/app/(frontend)/locale/${locale}/${namespace}.json`);
        }

        const data = (file && (file[namespace] || file)) || {};

        return (key = '', vars = {}) => {
            // Support nested keys with dot notation (e.g., 'tabs.overview')
            let text = getNestedValue(data, key);
            
            // Replace variables in the format {varName}
            if (text && typeof text === 'string' && vars && Object.keys(vars).length > 0) {
                Object.entries(vars).forEach(([k, v]) => {
                    const pattern = new RegExp(`{\\s*${k}\\s*}`, 'g');
                    text = text.replace(pattern, v);
                });
            }
            
            return text;
        };
    } catch (error) {
        console.error('Failed to load translations:', error);
        return () => '';
    }
};