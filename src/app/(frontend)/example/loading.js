// @/app/(frontend)/example/loading.js

/**
 * EXAMPLE PAGE - LOADING STATE
 *
 * This loading.js file provides a skeleton UI while the page.jsx server component
 * fetches data and renders. It's automatically shown by Next.js during:
 * - Initial page load
 * - Navigation from other pages
 * - Route transitions
 *
 * DESIGN PRINCIPLES:
 * - Matches the exact layout structure of page.client.jsx
 * - Uses static skeletons (no animations unless requested)
 * - Provides visual feedback during server-side data fetching
 * - Improves perceived performance and user experience
 *
 * WHEN TO USE loading.js:
 * - For page-level loading states during navigation
 * - When server components fetch data before rendering
 * - To show layout structure while content loads
 *
 * WHEN NOT TO USE:
 * - For form submission loading (use component state)
 * - For client-side data fetching (use useState in component)
 * - For interactive element loading (handle in component)
 */

import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

/**
 * Page Header Skeleton
 * Matches: Page title and description at top
 */
const HeaderSkeleton = () => (
    <div className="mb-8">
        <Skeleton className="h-10 w-96 mb-2" />
        <Skeleton className="h-5 w-125" />
    </div>
);

/**
 * Info Card Skeleton
 * Generic card with title, description, and content lines
 * Used for: User Info, Settings Info, Processed Data cards
 */
const InfoCardSkeleton = ({ title = 'Title', lines = 3 }) => (
    <div className="border rounded-lg shadow-sm mb-6">
        <div className="p-6">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-6 pt-0 space-y-2">
            {Array.from({ length: lines }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 flex-1 max-w-xs" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Interactive Form Card Skeleton
 * Matches: Form with search input, category select, results, and submit button
 */
const InteractiveFormSkeleton = () => (
    <div className="border rounded-lg shadow-sm mb-6">
        <div className="p-6">
            <Skeleton className="h-6 w-56 mb-2" />
            <Skeleton className="h-4 w-80" />
        </div>
        <div className="p-6 pt-0">
            <div className="space-y-4">
                {/* Search Input */}
                <div>
                    <Skeleton className="h-5 w-16 mb-2" />
                    <Skeleton className="h-10 w-full" />
                </div>

                {/* Category Select */}
                <div>
                    <Skeleton className="h-5 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                </div>

                {/* Results Count */}
                <div>
                    <Skeleton className="h-4 w-40" />
                </div>

                {/* Submit Button */}
                <Skeleton className="h-10 w-24" />
            </div>
        </div>
    </div>
);

/**
 * Product Card Skeleton
 * Matches: Individual product card in grid
 */
const ProductCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
        </div>
        <div className="p-6 pt-0 space-y-2">
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-10 w-full" />
        </div>
    </div>
);

/**
 * Products Grid Skeleton
 * Matches: 3-column grid of products (6 items)
 */
const ProductsGridSkeleton = () => (
    <div>
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
            ))}
        </div>
    </div>
);

/**
 * Navigation Buttons Skeleton
 * Matches: Bottom navigation buttons
 */
const NavigationSkeleton = () => (
    <div className="mt-8 flex gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
    </div>
);

// ============================================================================
// MAIN LOADING COMPONENT
// ============================================================================

/**
 * ExampleLoading Component
 *
 * This is the main loading state for the Example page template.
 * It provides a skeleton UI that matches the structure of page.client.jsx
 * while server-side data fetching occurs.
 *
 * STRUCTURE:
 * 1. Container with fade-in animation styles
 * 2. Page header (title + description)
 * 3. User Info card
 * 4. Settings Info card
 * 5. Processed Data card
 * 6. Interactive form card
 * 7. Products grid (6 products)
 * 8. Navigation buttons
 *
 * CUSTOMIZATION:
 * - Adjust skeleton dimensions to match your content
 * - Add/remove cards based on actual page structure
 * - Modify grid columns for different layouts
 */
export default function ExampleLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <HeaderSkeleton />

            {/* User Information Card */}
            <InfoCardSkeleton title="User Information" lines={3} />

            {/* Site Settings Card */}
            <InfoCardSkeleton title="Site Settings" lines={3} />

            {/* Server-Processed Data Card */}
            <InfoCardSkeleton title="Server-Processed Data" lines={3} />

            {/* Interactive Example Card */}
            <InteractiveFormSkeleton />

            {/* Products Grid */}
            <ProductsGridSkeleton />

            {/* Navigation Buttons */}
            <NavigationSkeleton />
        </div>
    );
}

/**
 * ============================================================================
 * LOADING.JS BEST PRACTICES
 * ============================================================================
 *
 * 1. LAYOUT MATCHING:
 *    - Skeleton should match the exact structure of your page
 *    - Use same grid columns, spacing, and container classes
 *    - Preview in browser to ensure visual consistency
 *
 * 2. PERFORMANCE:
 *    - Keep skeletons simple (avoid complex animations)
 *    - Use static skeletons unless animations improve UX
 *    - Don't render more skeletons than actual content
 *
 * 3. REUSABILITY:
 *    - Create reusable skeleton components for common patterns
 *    - Use parameters to customize skeleton components
 *    - Share skeleton components across multiple pages
 *
 * 4. TIMING:
 *    - Loading.js only shows during server-side rendering
 *    - For client-side loading, use useState in component
 *    - For form submissions, use button loading states
 *
 * 5. ACCESSIBILITY:
 *    - Skeleton UI should be perceivable by screen readers
 *    - Consider adding aria-label="Loading content"
 *    - Test with screen readers to ensure good experience
 *
 * 6. TESTING:
 *    - Test on slow connections to see loading state
 *    - Verify smooth transition to actual content
 *    - Check that layout doesn't shift when content loads
 *
 * 7. FILE LOCATION:
 *    - Place loading.js in same directory as page.jsx
 *    - Next.js automatically uses it during route transitions
 *    - Can have different loading.js for each route segment
 *
 * 8. WHEN TO SKIP LOADING.JS:
 *    - Very fast pages that render instantly
 *    - Pages with no external data fetching
 *    - Static pages with no dynamic content
 *    - When loading state would cause layout shift
 */
