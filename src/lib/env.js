// lib/env.js
// Environment configuration helper

/**
 * Check if we're in a build context where database connections aren't needed
 */
export function isBuildContext() {
    return process.env.NODE_ENV === 'development' && !process.env.POSTGRES_URL && !process.env.REDIS_URL;
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured() {
    return !!(process.env.POSTGRES_URL || process.env.REDIS_URL);
}

/**
 * Get environment with fallbacks for builds
 */
export function getEnvWithFallback(key, fallback = '') {
    return process.env[key] || fallback;
}

/**
 * Required environment variables for production
 */
export const REQUIRED_ENV_VARS = ['NEXTAUTH_URL', 'NEXTAUTH_SECRET'];

/**
 * Optional environment variables with defaults
 */
export const ENV_DEFAULTS = {
    NODE_ENV: 'development',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: 'your-secret-key-change-in-production'
};

/**
 * Validate environment configuration
 */
export function validateEnvironment() {
    const missing = [];
    const warnings = [];

    // Check required vars in production
    if (process.env.NODE_ENV === 'production') {
        for (const varName of REQUIRED_ENV_VARS) {
            if (!process.env[varName]) {
                missing.push(varName);
            }
        }
    }

    // Check database configuration
    if (!isDatabaseConfigured()) {
        warnings.push('No database configured (POSTGRES_URL or REDIS_URL). Using mock provider.');
    }

    // Check auth configuration
    if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
        warnings.push('NEXTAUTH_URL not set. This may cause authentication issues in production.');
    }

    return {
        isValid: missing.length === 0,
        missing,
        warnings,
        hasDatabase: isDatabaseConfigured(),
        isBuild: isBuildContext()
    };
}
