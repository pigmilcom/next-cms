// @/locale/config.js

// List of supported locales
export const locales = ['en', 'es', 'fr', 'pt', 'de', 'it', 'zh', 'ja', 'ko','ru', 'ar', 'hi', 'bn', 'pa', 'jv', 'ms', 'te', 'vi', 'mr', 'ta', 'ur', 'fa', 'gu', 'kn', 'ml', 'or', 'as', 'ma', 'ne', 'si', 'my', 'km', 'lo', 'am', 'af', 'zu'];

// Default locale
export const defaultLocale = 'en';

// This cookie name is used by `next-intl` on the public pages too. By
// reading/writing to this locale, we can ensure that the user's locale
// is consistent across public and private pages. In case you save the
// locale of registered users in a database, you can of course also use
// that instead when the user is logged in.
export const COOKIE_NAME = 'NEXT_LOCALE';
