// @/app/(frontend)/example/page.client.jsx

'use client';

/**
 * EXAMPLE PAGE - CLIENT COMPONENT
 *
 * This component runs on the CLIENT (browser).
 * Client components:
 * - Can use React hooks (useState, useEffect, useContext)
 * - Can handle user interactions and events
 * - Can access browser APIs (localStorage, window, document)
 * - Increase JavaScript bundle size
 * - Should NOT use server resources directly (load data from server components)
 *
 * RESPONSIBILITIES:
 * 1. Receive page-specific data from server component as props
 * 2. Access session/auth via useAuth() hook (centralized in root layout)
 * 3. Access settings via useSettings() hook (centralized in root layout)
 * 4. Handle UI state and user interactions
 * 5. Render interactive components
 */

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { CircleChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl'; 
import { useEffect, useState } from 'react';
import { useCart } from 'react-use-cart';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth, useSettings } from '@/context/providers';
import useVisitorTracking from '@/hooks/useVisitorTracking';
import { initializeVisitorTracking } from '@/lib/client/visitor-tracking';

// Initial client state with props from server component
const ExamplePageClient = ({ products: initialProducts, categories: initialCategories, processedData }) => {
    // ============================================================================
    // 1. HOOKS & TRANSLATIONS
    // ============================================================================
    const t = useTranslations('Common'); // Translation hook
    const router = useRouter(); // Next.js router for navigation
    const { addItem } = useCart(); // Shopping cart hook
    const skipDataFetch = typeof window !== 'undefined' && window.__SKIP_DATA_FETCH__; // Prevent data fetch on 404 pages

    /**
     * VISITOR TRACKING HOOK
     * Provides methods to track user interactions and analytics events.
     *
     * Available tracking methods:
     * - trackEvent(eventName, metadata) - Track custom events
     * - trackButtonClick(buttonId, section) - Track button clicks
     * - trackFormSubmit(formId, formData) - Track form submissions
     * - trackAddToCart(product) - Track add to cart actions
     * - trackSearch(query, resultsCount) - Track search queries
     * - trackDownload(fileName, fileType) - Track file downloads
     * - getVisitorId() - Get unique visitor identifier
     * - getSessionId() - Get current session identifier
     * - isTrackingAvailable() - Check if tracking is enabled
     *
     * BEST PRACTICES:
     * - Always check isTrackingAvailable() before tracking in critical flows
     * - Don't track sensitive user data (passwords, credit cards, PII)
     * - Use descriptive IDs for buttons/forms/events
     * - Track at the right time (after action completes, not before)
     * - Include relevant metadata for custom events
     * - Use try-catch for tracking calls to prevent app errors
     * - Batch similar events when possible (e.g., scroll events)
     * - Respect user privacy settings and consent
     *
     * PRIVACY CONSIDERATIONS:
     * - Visitor tracking respects user privacy settings
     * - No personally identifiable information is tracked
     * - Users can opt-out via browser settings
     * - Data is anonymized and aggregated
     * - Compliant with GDPR and privacy regulations
     *
     * DEBUGGING:
     * - Check browser console for tracking events
     * - Use isTrackingAvailable() to verify setup
     * - Verify visitor/session IDs are generated
     * - Check network tab for tracking API calls
     */

    const {
        trackEvent,
        trackButtonClick,
        trackFormSubmit,
        trackAddToCart,
        trackSearch,
        trackDownload,
        getVisitorId,
        getSessionId,
        isTrackingAvailable
    } = useVisitorTracking();

    // ============================================================================
    // 2. CONTEXT DATA (SETTINGS & AUTH)
    // ============================================================================
    /**
     * SETTINGS from useSettings() hook:
     * - Fetched once in root layout.jsx via getSettings()
     * - Passed through Providers context
     * - Available throughout entire app
     * - No prop drilling needed
     */
    const { siteSettings, storeSettings } = useSettings();

    /**
     * AUTH & SESSION from useAuth() hook:
     * - Fetched once in root layout.jsx via auth()
     * - Passed through Providers context
     * - Available throughout entire app
     * - No additional auth() calls needed
     */
    const { session, isAuthenticated, user } = useAuth();

    // ============================================================================
    // 4. CLIENT-SIDE STATE
    // ============================================================================
    /**
     * useState for managing component state
     * Examples of common state needs:
     *
     * NOTE: The server component (page.jsx) demonstrates all available query parameters:
     * - getCatalog: page, limit, search, categoryId, activeOnly, options
     * - getCategories: page, limit, search, options
     *
     * In a real implementation, you would:
     * 1. Use router.replace() with query params to trigger server-side fetching
     * 2. Or create a separate search page with searchParams
     * 3. This example shows how to work with server-provided data
     */
    const [localData, setLocalData] = useState(initialProducts?.data || []);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [currentPage, setCurrentPage] = useState(initialProducts?.pagination?.currentPage || 1);

    // ============================================================================
    // 5. JSON-LD STRUCTURED DATA FOR SEO
    // ============================================================================
    /**
     * JSON-LD (JavaScript Object Notation for Linked Data):
     * - Provides structured data for search engines (Google, Bing)
     * - Improves SEO and enables rich snippets in search results
     * - Use different schema types for different page types
     * - Implemented using next-seo components for simplicity
     *
     * ALL COMPONENTS AVAILABLE IN next-seo:
     *   AggregateRatingJsonLd,
     *   ArticleJsonLd,
     *   CarouselJsonLd,
     *   ClaimReviewJsonLd,
     *   CourseJsonLd,
     *   CreativeWorkJsonLd,
     *   DatasetJsonLd,
     *   DiscussionForumPostingJsonLd,
     *   EmployerAggregateRatingJsonLd,
     *   EventJsonLd,
     *   FAQJsonLd,
     *   ImageJsonLd,
     *   JobPostingJsonLd,
     *   JsonLdScript,
     *   LocalBusinessJsonLd,
     *   MerchantReturnPolicyJsonLd,
     *   MovieCarouselJsonLd,
     *   OrganizationJsonLd,
     *   ProductJsonLd,
     *   ProfilePageJsonLd,
     *   QuizJsonLd,
     *   RecipeJsonLd,
     *   ReviewJsonLd,
     *   SoftwareApplicationJsonLd,
     *   VacationRentalJsonLd,
     *   VideoJsonLd
     *
     * IMPLEMENTATION:
     * - Generate schema objects using helper functions
     * - Can use multiple schemas on same page
     * - Validate with Google Rich Results Test
     *
     * VALIDATION & TESTING:
     * - Google Rich Results Test: https://search.google.com/test/rich-results
     * - Schema.org Validator: https://validator.schema.org/
     * - Check Google Search Console for structured data issues
     * - Ensure required fields are present for each schema type
     *
     * COMMON PITFALLS TO AVOID:
     * - Don't add Product schema to non-product pages
     * - Don't use Article schema for product descriptions
     * - Always validate schema data exists before rendering
     * - Don't duplicate schemas (one type per page)
     * - Ensure dates are in ISO 8601 format
     * - Include all required properties for each schema type
     *
     * BENEFITS:
     * - Rich snippets in search results (stars, prices, etc.)
     * - Better click-through rates (CTR)
     * - Enhanced brand visibility in Knowledge Graph
     * - Improved local search visibility
     * - Better understanding by search engines
     */

    // ============================================================================
    // 6. SIDE EFFECTS WITH useEffect
    // ============================================================================
    /**
     * useEffect runs after component mounts/updates
     * Common use cases:
     */

    // Example 1: Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            // Uncomment to enable redirect
            // router.replace('/auth/login');
        }
    }, [isAuthenticated, router]);

    // Example 2: Load data from localStorage
    useEffect(() => {
        const savedData = localStorage.getItem('example-page-data');
        if (savedData) {
            // setLocalData(JSON.parse(savedData));
        }
    }, []);

    // Example 3: Save data to localStorage when it changes
    useEffect(() => {
        if (localData.length > 0) {
            localStorage.setItem('example-page-data', JSON.stringify(localData));
        }
    }, [localData]);

    // Example 4: Fetch additional data client-side (if needed)
    useEffect(() => {
        const fetchAdditionalData = async () => {
            setIsLoading(true);
            try {
                // const response = await fetch('/api/query/some-endpoint');
                // const data = await response.json();
                // setLocalData(data);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load data');
            } finally {
                setIsLoading(false);
            }
        };

        // Uncomment to enable
        // fetchAdditionalData();
    }, []);

    // Example 5: Initialize visitor tracking (analytics)
    useEffect(() => {
        /**
         * Visitor Tracking Integration
         * - Tracks page views, user interactions, and analytics
         * - Runs once on component mount
         * - Handles errors gracefully
         * - Can be disabled by setting skipDataFetch (window.__SKIP_DATA_FETCH__)
         */

        if (skipDataFetch) return;

        const initTracking = async () => {
            try {
                await initializeVisitorTracking();
                console.log('Visitor tracking initialized');
            } catch (error) {
                console.error('Failed to initialize visitor tracking:', error);
            }
        };

        initTracking();
    }, []); // Empty deps - run only once on mount

    // ============================================================================
    // 7. EVENT HANDLERS
    // ============================================================================
    /**
     * Functions to handle user interactions
     */

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchTerm(query);

        /**
         * TRACK SEARCH EVENT
         * Tracks user search queries to understand what users are looking for.
         * Parameters:
         * - query: The search term entered by the user
         * - resultsCount: Number of results found (useful for analyzing zero-result searches)
         *
         * Use case: Identify popular search terms, find content gaps, improve search relevance
         *
         * NOTE: In a real implementation with server-side search:
         * - Update URL with search params: router.replace(`/shop?search=${query}`)
         * - Server component will re-fetch with search parameter
         * - This triggers getCatalog({ search: query, ... })
         * - Example: router.replace(`?search=${encodeURIComponent(query)}`);
         */
        if (query.length >= 3) {
            const resultsCount = localData.filter((p) => p.name?.toLowerCase().includes(query.toLowerCase())).length;
            trackSearch(query, resultsCount);
        }
    };

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setCurrentPage(1); // Reset to first page

        /**
         * TRACK BUTTON CLICK EVENT
         * Tracks button clicks to measure user engagement with specific UI elements.
         * Parameters:
         * - buttonId: Unique identifier for the button/element clicked
         * - section: Section/area of the page where the button is located
         *
         * Use case: Measure feature adoption, identify popular navigation paths, A/B testing
         *
         * NOTE: In a real implementation with server-side category filtering:
         * - Update URL with categoryId: router.replace(`/shop?categoryId=${category}`)
         * - Server component will re-fetch with categoryId parameter
         * - This triggers getCatalog({ categoryId: category, ... })
         * - Example: router.replace(`?categoryId=${encodeURIComponent(category)}`);
         */
        trackButtonClick(`category-${category}`, 'category-filter');
    };

    const handleAddToCart = (product) => {
        // Ensure user is authenticated before adding to cart (if applied, otherwise skip condition)
        if (!isAuthenticated) {
            toast.error('Please login to add items to cart');
            router.replace('/auth/login');
            return;
        }

        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image
        });

        /**
         * TRACK ADD TO CART EVENT
         * Tracks when users add products to their cart for conversion funnel analysis.
         * Parameters:
         * - product: Object containing product details (id, name, price, quantity)
         *
         * Use case: Measure conversion rates, identify popular products, analyze cart abandonment
         * Important: This is a critical e-commerce tracking event for revenue optimization
         */
        trackAddToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });

        toast.success(`${product.name} added to cart`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        /**
         * TRACK FORM SUBMIT EVENT
         * Tracks form submissions to measure form completion rates and identify issues.
         * Parameters:
         * - formId: Unique identifier for the form
         * - formData: Object containing submitted form data (anonymized if sensitive)
         *
         * Use case: Track form abandonment, identify problematic fields, measure conversion
         * Note: Avoid tracking sensitive data (passwords, credit cards). Only track necessary metadata.
         */
        trackFormSubmit('demo-form', {
            hasSearchTerm: !!searchTerm,
            category: selectedCategory,
            timestamp: new Date().toISOString()
        });

        try {
            // Example: Submit form data
            const response = await fetch('/api/some-endpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchTerm, selectedCategory })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Success!');
            } else {
                toast.error(data.error || 'Something went wrong');
            }
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Failed to submit');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * TRACK DOWNLOAD EVENT
     * Example handler for tracking file downloads.
     * Parameters:
     * - fileName: Name of the downloaded file
     * - fileType: File extension/type (pdf, jpg, zip, etc.)
     *
     * Use case: Track resource downloads, measure content engagement, identify popular resources
     */
    const handleDownload = (fileName, fileType) => {
        trackDownload(fileName, fileType);
        toast.success(`Downloading ${fileName}`);
    };

    /**
     * TRACK CUSTOM EVENT
     * Example handler for tracking custom interactions.
     * Parameters:
     * - eventName: Name of the custom event (e.g., 'video_play', 'tab_switch')
     * - metadata: Additional data about the event
     *
     * Use case: Track any custom interaction not covered by standard events
     * Examples: video plays, tab switches, modal opens, filter changes, etc.
     */
    const handleCustomInteraction = (eventName, metadata) => {
        trackEvent(eventName, metadata);
    };

    // ============================================================================
    // 8. DATA FILTERING & PROCESSING
    // ============================================================================
    /**
     * Process data on the client for UI rendering
     *
     * IMPORTANT: Server-side filtering is preferred for better performance:
     * - Search, category filtering, pagination happen on server (see page.jsx)
     * - Client receives only the filtered/paginated results
     * - Use localData directly if server handles all filtering
     * - Available server parameters: page, limit, search, categoryId, activeOnly
     *
     * This client-side filtering is shown for demonstration purposes.
     * In production, rely on server-side parameters demonstrated in page.jsx:
     * - getCatalog({ search: 'query', categoryId: 'cat_123', page: 1, limit: 12 })
     * - Update URL params and let server refetch: router.replace('?search=query')
     */
    const filteredProducts = localData.filter((product) => {
        const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Pagination info from server (demonstrated in page.jsx with getCatalog response)
    const paginationInfo = initialProducts?.pagination || {
        totalItems: filteredProducts.length,
        currentPage: 1,
        totalPages: Math.ceil(filteredProducts.length / 12),
        hasNext: false,
        hasPrev: false
    };

    // ============================================================================
    // 9. RENDER UI
    // ============================================================================
    return (
        <>
            {/* ============================================================================
                JSON-LD STRUCTURED DATA (using next-seo components)
                ============================================================================
                next-seo components automatically render <script type="application/ld+json">
                - Simpler API: Pass props directly instead of building schema objects
                - Automatic validation and schema generation
                - Better TypeScript support
                - No need for dangerouslySetInnerHTML
                
                USAGE PATTERN:
                1. Import component from 'next-seo': import { ProductJsonLd } from 'next-seo'
                2. Render component with props: <ProductJsonLd name="Product" ... />
                3. Component handles schema generation automatically
                4. Multiple components can be used on same page
                
                BEST PRACTICES:
                1. Only include schemas relevant to the current page type
                2. Use conditional rendering when data might not exist
                3. Validate with Google Rich Results Test tool
                4. Common page type combinations:
                   - Homepage: OrganizationJsonLd 
                   - Product Page: ProductJsonLd + AggregateRatingJsonLd
                   - Article Page: ArticleJsonLd
                   - FAQ Page: FAQJsonLd
                   - Contact Page: OrganizationJsonLd + LocalBusinessJsonLd
            */} 

            {/* 
                ========================================================================
                ADDITIONAL next-seo JSON-LD COMPONENT EXAMPLES
                ========================================================================
                Uncomment and customize as needed for different page types.
                All components automatically generate valid schema.org markup.
                
                PRODUCT PAGE EXAMPLE:
                ----------------------------------------------------------------
                import { ProductJsonLd, AggregateRatingJsonLd } from 'next-seo';
                
                <ProductJsonLd
                    productName="Premium Oil 1000mg"
                    images={[
                        'https://example.com/photos/product.jpg',
                        'https://example.com/photos/product-2.jpg'
                    ]}
                    description="Premium oil for wellness"
                    brand="Your Brand"
                    manufacturerName="Manufacturer Name"
                    manufacturerLogo="https://example.com/logo.png"
                    offers={[
                        {
                            price: '29.99',
                            priceCurrency: 'USD',
                            priceValidUntil: '2025-12-31',
                            itemCondition: 'https://schema.org/NewCondition',
                            availability: 'https://schema.org/InStock',
                            url: 'https://example.com/product',
                            seller: {
                                name: 'Your Store'
                            }
                        }
                    ]}
                    aggregateRating={{
                        ratingValue: '4.8',
                        reviewCount: '125'
                    }}
                    sku="SKU-1000"
                    gtin13="0123456789123"
                    mpn="MPN1000"
                />  
                
                ARTICLE/BLOG POST EXAMPLE:
                ----------------------------------------------------------------
                import { ArticleJsonLd } from 'next-seo';
                
                <ArticleJsonLd
                    type="Article"
                    url="https://example.com/article"
                    title="Benefits of Premium Oil"
                    images={[
                        'https://example.com/photos/article.jpg'
                    ]}
                    datePublished="2024-01-15T08:00:00+08:00"
                    dateModified="2024-02-01T09:00:00+08:00"
                    authorName="John Doe"
                    publisherName="Your Site"
                    publisherLogo="https://example.com/logo.png"
                    description="Learn about the amazing benefits of Premium oil"
                />
                
                LOCAL BUSINESS EXAMPLE:
                ----------------------------------------------------------------
                import { LocalBusinessJsonLd } from 'next-seo';
                
                <LocalBusinessJsonLd
                    type="Store"
                    id="https://example.com"
                    name="Premium Wellness Store"
                    description="Premium products and wellness consultation"
                    url="https://example.com"
                    telephone="+1-234-567-8900"
                    address={{
                        streetAddress: '123 Main Street',
                        addressLocality: 'Los Angeles',
                        addressRegion: 'CA',
                        postalCode: '90001',
                        addressCountry: 'US'
                    }}
                    geo={{
                        latitude: '34.0522',
                        longitude: '-118.2437'
                    }}
                    images={[
                        'https://example.com/photos/storefront.jpg'
                    ]}
                    openingHours={[
                        {
                            opens: '09:00',
                            closes: '18:00',
                            dayOfWeek: [
                                'Monday',
                                'Tuesday',
                                'Wednesday',
                                'Thursday',
                                'Friday'
                            ]
                        },
                        {
                            opens: '10:00',
                            closes: '16:00',
                            dayOfWeek: 'Saturday'
                        }
                    ]}
                    rating={{
                        ratingValue: '4.8',
                        ratingCount: '250'
                    }}
                />
                
                REVIEW EXAMPLE:
                ----------------------------------------------------------------
                import { ReviewJsonLd } from 'next-seo';
                
                <ReviewJsonLd
                    itemReviewed={{
                        type: 'Product',
                        name: 'Premium Oil 1000mg'
                    }}
                    author={{
                        type: 'Person',
                        name: 'Jane Smith'
                    }}
                    reviewRating={{
                        bestRating: '5',
                        worstRating: '1',
                        ratingValue: '5'
                    }}
                    datePublished="2024-01-20T10:00:00+08:00"
                    reviewBody="This Premium oil has helped me tremendously with sleep and anxiety. Highly recommend!"
                />
                
                EVENT EXAMPLE:
                ----------------------------------------------------------------
                import { EventJsonLd } from 'next-seo';
                
                <EventJsonLd
                    name="Premium Wellness Workshop"
                    startDate="2024-03-15T19:00:00+08:00"
                    endDate="2024-03-15T21:00:00+08:00"
                    location={{
                        name: 'Wellness Center',
                        address: {
                            streetAddress: '123 Main Street',
                            addressLocality: 'Los Angeles',
                            addressRegion: 'CA',
                            postalCode: '90001',
                            addressCountry: 'US'
                        }
                    }}
                    url="https://example.com/events/workshop"
                    images={[
                        'https://example.com/photos/workshop.jpg'
                    ]}
                    description="Learn about Premium oil benefits and usage"
                    offers={[
                        {
                            price: '25',
                            priceCurrency: 'USD',
                            url: 'https://example.com/events/workshop/register',
                            availability: 'https://schema.org/InStock',
                            validFrom: '2024-01-01T00:00:00+08:00'
                        }
                    ]}
                    performer={[
                        {
                            name: 'Dr. John Doe'
                        }
                    ]}
                />
                
                RECIPE EXAMPLE (for recipe pages):
                ----------------------------------------------------------------
                import { RecipeJsonLd } from 'next-seo';
                
                <RecipeJsonLd
                    name="Premium Infused Smoothie"
                    description="A healthy smoothie with Premium oil"
                    datePublished="2024-01-15T08:00:00+08:00"
                    authorName="Chef Jane"
                    prepTime="PT10M"
                    cookTime="PT0M"
                    totalTime="PT10M"
                    keywords="Premium, smoothie, healthy"
                    yields="2 servings"
                    category="Beverages"
                    cuisine="American"
                    calories={150}
                    images={[
                        'https://example.com/photos/smoothie.jpg'
                    ]}
                    ingredients={[
                        '1 banana',
                        '1 cup spinach',
                        '1/2 cup almond milk',
                        '1 dropper Premium oil',
                        '1 tbsp honey'
                    ]}
                    instructions={[
                        {
                            name: 'Blend',
                            text: 'Add all ingredients to blender and blend until smooth',
                            url: 'https://example.com/recipe#step1',
                            image: 'https://example.com/photos/step1.jpg'
                        }
                    ]}
                    aggregateRating={{
                        ratingValue: '4.9',
                        ratingCount: '89'
                    }}
                />
                
                VIDEO EXAMPLE:
                ----------------------------------------------------------------
                import { VideoJsonLd } from 'next-seo';
                
                <VideoJsonLd
                    name="How to Use Premium Oil"
                    description="A comprehensive guide to using Premium oil"
                    contentUrl="https://example.com/videos/premium-guide.mp4"
                    uploadDate="2024-01-15T08:00:00+08:00"
                    duration="PT5M30S"
                    thumbnailUrls={[
                        'https://example.com/photos/video-thumb.jpg'
                    ]}
                />
                
                SOFTWARE APPLICATION EXAMPLE:
                ----------------------------------------------------------------
                import { SoftwareApplicationJsonLd } from 'next-seo';
                
                <SoftwareApplicationJsonLd
                    name="Premium Tracker App"
                    price="0"
                    priceCurrency="USD"
                    aggregateRating={{
                        ratingValue: '4.7',
                        ratingCount: '1000'
                    }}
                    operatingSystem="iOS, Android"
                    applicationCategory="HealthApplication"
                />
            */}

            <motion.div
                className="container mx-auto py-8 px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}>
                {/* Page Header */}
                <div className="flex flex-col gap-4 mb-6">
                     <h1 className="text-3xl font-bold flex flex-nowrap items-center gap-4">
                        <Link href="/" className="hover:text-primary transition-colors duration-200">
                        <CircleChevronLeft className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-200" />
                        </Link>
                        Example Page
                    </h1> 
                    <p className="text-muted-foreground">
                        Example page showing client/server component pattern with JSON-LD schemas
                    </p>
                </div>

                {/* User Info Section */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>User Information</CardTitle>
                        <CardDescription>Data from server component</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isAuthenticated ? (
                            <div className="space-y-2">
                                <p>
                                    <strong>Name:</strong> {user?.displayName || user?.name || 'N/A'}
                                </p>
                                <p>
                                    <strong>Email:</strong> {user?.email || 'N/A'}
                                </p>
                                <p>
                                    <strong>Role:</strong> {user?.role || 'N/A'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p>Not authenticated</p>
                                <Button asChild>
                                    <Link href="/auth/login">Login</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Settings Info Section */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Site Settings</CardTitle>
                        <CardDescription>Data from LayoutProvider</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p>
                                <strong>Site Name:</strong> {siteSettings?.siteName || 'N/A'}
                            </p>
                            <p>
                                <strong>Currency:</strong> {storeSettings?.currency || 'EUR'}
                            </p>
                            <p>
                                <strong>VAT Enabled:</strong> {storeSettings?.vatEnabled ? 'Yes' : 'No'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Processed Data Section */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Server-Processed Data</CardTitle>
                        <CardDescription>Data computed on server</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p>
                                <strong>Product Count:</strong> {processedData?.productCount || 'N/A'}
                            </p>
                            <p>
                                <strong>Category Count:</strong> {processedData?.categoryCount || 'N/A'}
                            </p>
                            <p>
                                <strong>Store Name:</strong> {storeSettings?.storeName || 'N/A'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Image Optimization Example */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Image Optimization Example</CardTitle>
                        <CardDescription>Next.js Image component with automatic optimizations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Live Image Example with Inline Comments */}
                            <div className="flex justify-center bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border">
                                <Image
                                    // Required: Path to image file (public folder or external URL)
                                    src="/next.svg"
                                    // Required: Descriptive text for accessibility and SEO
                                    // Screen readers announce this text, search engines index it
                                    alt="Next.js Logo - Framework for Production"
                                    // Required: Explicit dimensions prevent layout shift (CLS)
                                    // Improves Core Web Vitals and user experience
                                    width={180}
                                    height={37}
                                    // Optional: Disable lazy loading for above-the-fold images
                                    // Use ONLY for hero images, logos, or critical content
                                    // priority={true}

                                    // Optional: Image quality (1-100, default: 75)
                                    // Higher = better quality but larger file size
                                    // quality={85}

                                    // Optional: Responsive sizing hints for browser
                                    // Optimizes which image size to load based on viewport
                                    // sizes="(max-width: 768px) 100vw, 50vw"

                                    // Optional: Additional CSS classes
                                    className="dark:invert"
                                />
                            </div>

                            {/* Optimization Features */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                                    <div>
                                        <strong className="block text-green-900 dark:text-green-100">
                                            Automatic WebP/AVIF
                                        </strong>
                                        <span className="text-green-700 dark:text-green-300">
                                            Serves modern formats for smaller file sizes
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                                    <div>
                                        <strong className="block text-green-900 dark:text-green-100">
                                            Lazy Loading
                                        </strong>
                                        <span className="text-green-700 dark:text-green-300">
                                            Images load only when visible in viewport
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                                    <div>
                                        <strong className="block text-green-900 dark:text-green-100">
                                            Layout Shift Prevention
                                        </strong>
                                        <span className="text-green-700 dark:text-green-300">
                                            Width/height prevent CLS (Core Web Vitals)
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                                    <div>
                                        <strong className="block text-green-900 dark:text-green-100">
                                            Responsive Sizing
                                        </strong>
                                        <span className="text-green-700 dark:text-green-300">
                                            Serves optimal size per device/viewport
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Reference */}
                            <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-950 rounded-r">
                                <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                                    📖 Key Attributes Reference
                                </h4>
                                <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
                                    <li>
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1">src</code> - Image path
                                        (required)
                                    </li>
                                    <li>
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1">alt</code> - Alt text for
                                        accessibility & SEO (required)
                                    </li>
                                    <li>
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1">width/height</code> -
                                        Dimensions to prevent layout shift (required)
                                    </li>
                                    <li>
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1">priority</code> - Disable
                                        lazy load for above-fold images (optional)
                                    </li>
                                    <li>
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1">quality</code> - Image
                                        quality 1-100, default 75 (optional)
                                    </li>
                                    <li>
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1">fill</code> - Responsive
                                        fill container (alternative to width/height)
                                    </li>
                                    <li>
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1">sizes</code> -
                                        Viewport-based size hints for responsive (optional)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Interactive Section */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Interactive Example</CardTitle>
                        <CardDescription>Client-side state and interactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Search Input */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Search</label>
                                <Input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    placeholder="Search products..."
                                />
                            </div>

                            {/* Category Select */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md">
                                    <option value="all">All Categories</option>
                                    {initialCategories?.data?.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Results */}
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Found {filteredProducts.length} products
                                </p>
                            </div>

                            {/* Submit Button */}
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Submitting...' : 'Submit'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Visitor Tracking Examples */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Visitor Tracking Examples</CardTitle>
                        <CardDescription>Interactive examples of visitor tracking functionality</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isTrackingAvailable() ? (
                            <div className="space-y-4">
                                {/* Tracking Action Buttons */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {/* Track Button Click - Basic interaction tracking */}
                                    <Button
                                        onClick={() => {
                                            trackButtonClick('demo-button', 'tracking-examples');
                                            toast.success('Button click tracked!');
                                        }}
                                        variant="outline">
                                        Track Button Click
                                    </Button>

                                    {/* Track Download - File download tracking */}
                                    <Button
                                        onClick={() => {
                                            handleDownload('example-guide.pdf', 'pdf');
                                        }}
                                        variant="outline">
                                        Track Download
                                    </Button>

                                    {/* Track Custom Event - Custom interaction tracking */}
                                    <Button
                                        onClick={() => {
                                            handleCustomInteraction('feature_demo', {
                                                feature: 'tracking_examples',
                                                value: 1,
                                                timestamp: Date.now()
                                            });
                                            toast.success('Custom event tracked!');
                                        }}
                                        variant="outline">
                                        Track Custom Event
                                    </Button>
                                </div>

                                {/* Tracking Information */}
                                <div className="pt-4 border-t space-y-2">
                                    <div className="text-sm">
                                        <span className="font-medium">Visitor ID:</span>{' '}
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                            {getVisitorId() || 'Not available'}
                                        </code>
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-medium">Session ID:</span>{' '}
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                            {getSessionId() || 'Not available'}
                                        </code>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        💡 Tracking events are automatically sent to your analytics system. Check your
                                        browser console for details.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                <p>Visitor tracking is not available.</p>
                                <p className="text-sm mt-2">Ensure tracking is enabled in your site settings.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Products Grid Example */}
                {filteredProducts.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Products</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {filteredProducts.slice(0, 6).map((product) => (
                                <Card key={product.id}>
                                    <CardHeader>
                                        <CardTitle>{product.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold text-primary mb-2">
                                            €{(parseFloat(product.price) || 0).toFixed(2)}
                                        </p>
                                        <Button onClick={() => handleAddToCart(product)} className="w-full">
                                            Add to Cart
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation Examples */}
                <div className="mt-8 flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/">Back to Home</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/shop">Go to Shop</Link>
                    </Button>
                </div>

                {/* SEO Information Card */}
                <Card className="mt-8 border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            JSON-LD Structured Data Active
                        </CardTitle>
                        <CardDescription>
                            Automatic schemas applied globally + page-specific examples available
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Global Schemas (from providers.jsx) */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3 text-primary">
                                    🌐 Global Schemas (Auto-loaded via providers.jsx)
                                </h4>
                                <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-green-600">✓</span>
                                        <span className="font-medium">OrganizationJsonLd:</span>
                                        <span className="text-muted-foreground">Business info for Knowledge Graph</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-green-600">✓</span>
                                        <span className="font-medium">LocalBusinessJsonLd:</span>
                                        <span className="text-muted-foreground">
                                            Store details with opening hours
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-green-600">✓</span>
                                        <span className="font-medium">BreadcrumbsLd (Custom):</span>
                                        <span className="text-muted-foreground">
                                            Auto-generated navigation breadcrumbs
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                    These schemas are automatically applied to all pages via the global context provider
                                </p>
                            </div>

                            {/* Page-Specific Schemas */}
                            <div className="pt-3 border-t">
                                <h4 className="text-sm font-semibold mb-3 text-blue-600 dark:text-blue-400">
                                    📄 Page-Specific Schemas (Add as needed)
                                </h4>
                                <div className="space-y-2 pl-3 border-l-2 border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">○</span>
                                        <span className="font-medium">ProductJsonLd:</span>
                                        <span className="text-muted-foreground text-xs">
                                            For product pages (price, reviews, availability)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">○</span>
                                        <span className="font-medium">FAQJsonLd:</span>
                                        <span className="text-muted-foreground text-xs">
                                            For FAQ sections (featured snippets)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">○</span>
                                        <span className="font-medium">ArticleJsonLd:</span>
                                        <span className="text-muted-foreground text-xs">
                                            For blog/article pages
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">○</span>
                                        <span className="font-medium">WebsiteJsonLd:</span>
                                        <span className="text-muted-foreground text-xs">
                                            For homepage (site search box)
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                    Import from 'next-seo' and add to page component when needed (see commented examples
                                    above)
                                </p>
                            </div>

                            {/* Validation */}
                            <div className="pt-3 border-t">
                                <p className="text-sm text-muted-foreground mb-3">
                                    <strong>📊 Validation & Testing:</strong>
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button asChild variant="outline" size="sm" className="flex-1">
                                        <a
                                            href="https://search.google.com/test/rich-results"
                                            target="_blank"
                                            rel="noopener noreferrer">
                                            Google Rich Results →
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="flex-1">
                                        <a
                                            href="https://validator.schema.org/"
                                            target="_blank"
                                            rel="noopener noreferrer">
                                            Schema.org Validator →
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            {/* Quick Reference */}
                            <div className="pt-3 border-t bg-muted/30 -mx-4 -mb-4 p-4 rounded-b-lg">
                                <p className="text-xs text-muted-foreground">
                                    <strong>💡 Pro Tip:</strong> The commented examples in this file show how to add
                                    page-specific schemas using next-seo components. For Breadcrumbs, always use the
                                    custom <code className="bg-muted px-1.5 py-0.5 rounded">BreadcrumbsLd</code>{' '}
                                    component from{' '}
                                    <code className="bg-muted px-1.5 py-0.5 rounded">
                                        @/components/common/BreadcrumbsLd.jsx
                                    </code>{' '}
                                    instead of next-seo's BreadcrumbJsonLd.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </>
    );
};

export default ExamplePageClient;

/**
 * ============================================================================
 * ADDITIONAL PATTERNS & BEST PRACTICES
 * ============================================================================
 *
 * 1. DATA SOURCES:
 *    - Server props: Page-specific data (products, categories, etc.)
 *    - useSettings(): Global settings (siteSettings, storeSettings) from root layout
 *    - useAuth(): Session, auth status, and user data from root layout
 *
 * 2. PERFORMANCE OPTIMIZATION:
 *    - Lazy load heavy components: const Heavy = lazy(() => import('./Heavy'))
 *    - Memoize expensive calculations: useMemo(() => expensiveCalc(data), [data])
 *    - Memoize callbacks: useCallback(() => handleClick(), [deps])
 *
 * 3. ERROR BOUNDARIES:
 *    Wrap components in ErrorBoundary for graceful error handling
 *
 * 4. ACCESSIBILITY:
 *    - Use semantic HTML (nav, main, article, section)
 *    - Add aria-labels for screen readers
 *    - Ensure keyboard navigation works
 *
 * 5. MOBILE RESPONSIVENESS:
 *    - Use Tailwind responsive classes (sm:, md:, lg:)
 *    - Test on mobile devices
 *    - Use useMobile() hook for mobile-specific logic
 *
 * 6. FORM VALIDATION:
 *    - Use react-hook-form + zod for complex forms
 *    - Show validation errors inline
 *    - Disable submit while loading
 *
 * 7. API CALLS:
 *    - Always handle loading states
 *    - Always handle errors
 *    - Use try-catch blocks
 *    - Show user feedback (toast notifications)
 *
 * 8. ROUTING:
 *    - Use Link component for internal navigation
 *    - Use router.replace() for programmatic navigation
 *    - Use router.replace() to prevent back button
 *    - Use router.back() to go back
 *
 * 9. IMAGE OPTIMIZATION:
 *    - Always use Next.js Image component
 *    - Specify sizes for responsive images
 *    - Use priority for above-the-fold images
 *
 * 10. ANIMATIONS:
 *     - Use framer-motion for smooth animations
 *     - Keep animations subtle and fast (<300ms)
 *     - Respect prefers-reduced-motion
 *
 */
