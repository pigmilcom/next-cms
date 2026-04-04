// @/lib/i18n.js
// Utilities to format language codes into display names, flags and country codes.

export function countryCodeToFlagEmoji(cc) {
    if (!cc || cc.length !== 2) return '🌐';
    const codePoints = [...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
    return String.fromCodePoint(...codePoints);
}

export function getCountryName(countryCode, userLocale = undefined) {
    if (!countryCode) return '';

    // If it's already a full name (length > 2), return as is
    if (countryCode.length > 2) return countryCode;

    const hasDisplayNames = typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function';
    if (!hasDisplayNames) return countryCode;

    const locale =
        userLocale ||
        (typeof document !== 'undefined' && document.documentElement.lang) ||
        (typeof navigator !== 'undefined' && navigator.language) ||
        'en';

    try {
        const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
        return displayNames.of(countryCode.toUpperCase()) || countryCode;
    } catch (_e) {
        // Fallback to country code if Intl.DisplayNames fails
        return countryCode;
    }
}

export function formatAvailableLanguages(availableLangs = [], userLocale = undefined) {
    const hasDisplayNames = typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function';
    const locale =
        userLocale ||
        (typeof document !== 'undefined' && document.documentElement.lang) ||
        (typeof navigator !== 'undefined' && navigator.language) ||
        'en';
    const displayNames = hasDisplayNames ? new Intl.DisplayNames([locale], { type: 'language' }) : null;

    return availableLangs.map((code) => {
        let name = code.toUpperCase();
        try {
            if (displayNames) name = displayNames.of(code) || name;
        } catch (_e) {
            // ignore and fallback to code
        }

        let region;
        try {
            const localeObj = new Intl.Locale(code);
            region = localeObj.region || localeObj.maximize?.().region || undefined;
        } catch (_e) {
            region = undefined;
        }

        const flag = region ? countryCodeToFlagEmoji(region) : '🌐';

        return {
            id: code,
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag,
            countryCode: region || undefined
        };
    });
}
