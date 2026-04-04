// @/app/(frontend)/example/layout.jsx

/**
 * EXAMPLE PAGE LAYOUT
 *
 * Optional custom layout for this route segment.
 * If not needed, this file can be deleted and the app will use parent layouts.
 *
 * Layouts wrap all pages in this route segment and are useful for:
 * - Shared UI elements (sidebars, headers specific to this section)
 * - Route-specific providers or context
 * - Shared data fetching for all pages in this segment
 *
 * Note: Layouts persist across navigations and don't re-render
 */

import { generatePageMetadata } from '@/utils/metadata.js';

/**
 * Generate metadata for this route segment
 * Shared across all pages in /example/* routes
 *
 */
export async function generateMetadata() {
    // SEO metadata
    return generatePageMetadata({
        title: 'Example Page',
        description: 'Template page for creating new routes with optimal patterns'
        // keywords: 'template, example, page',
        // additional metadata overrides can be added here
    });
}

export default function ExampleLayout({ children }) {
    return <>{children}</>;
}
