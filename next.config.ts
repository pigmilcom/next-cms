import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import initializeBundleAnalyzer from '@next/bundle-analyzer';

// Analyzer
const withBundleAnalyzer = initializeBundleAnalyzer({
    enabled: process.env.BUNDLE_ANALYZER_ENABLED === 'true',
});

// Intl
const withNextIntl = createNextIntlPlugin(
    './src/locale/requests.js'
);

// Base config
const nextConfig: NextConfig = {
    output: "standalone",
    // Production optimizations
    compress: true,
    poweredByHeader: false,
    generateEtags: true,
    images: {
    remotePatterns: [
    { protocol: 'https', hostname: '**' },
    { protocol: 'http', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; img-src * data: blob:; script-src 'none'; sandbox;",
    },
    experimental: {
        serverActions: {
        bodySizeLimit: '10mb',
        },
    },
    webpack: (config, { isServer }) => {
        // Exclude server-only modules from client bundles
        if (!isServer) {
            config.resolve = config.resolve || {};
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                dns: false,
                'dns/promises': false,
                'node:dns/promises': false,
                'node:net': false,
                'node:tls': false,
                'node:fs': false,
            };
        }
        return config;
    },
    // Mark server-only packages
    serverExternalPackages: ['redis', '@redis/client', 'ioredis', 'pg'],
};

// Compose plugins (order matters: rightmost runs first)
export default withBundleAnalyzer(
    withNextIntl(nextConfig)
);
