// @/hooks/useVisitorTracking.js
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    getVisitorTracker,
    initializeVisitorTracking,
    isVisitorTrackingInitialized
} from '@/lib/client/visitor-tracking';

/**
 * VISITOR TRACKING HOOK
 *
 * Custom React hook for tracking user interactions and analytics events.
 * Automatically initializes visitor tracking on mount and provides
 * convenient methods for tracking various user interactions.
 *
 * @returns {Object} Tracking methods and utilities
 *
 * @example
 * const {
 *   trackButtonClick,
 *   trackSearch,
 *   isTrackingAvailable
 * } = useVisitorTracking();
 *
 * // Track a button click
 * trackButtonClick('cta-button', 'hero-section');
 *
 * // Track a search
 * trackSearch('cbd oil', 15);
 */
const useVisitorTracking = () => {
    const [isReady, setIsReady] = useState(false);
    const [tracker, setTracker] = useState(null);

    // Initialize visitor tracking on mount
    useEffect(() => {
        const init = async () => {
            try {
                // Check if already initialized
                if (isVisitorTrackingInitialized()) {
                    const existingTracker = getVisitorTracker();
                    setTracker(existingTracker);
                    setIsReady(true);
                    return;
                }

                // Initialize new tracker
                const newTracker = await initializeVisitorTracking();
                setTracker(newTracker);
                setIsReady(true);
            } catch (error) {
                console.error('Failed to initialize visitor tracking:', error);
                setIsReady(false);
            }
        };

        init();
    }, []);

    /**
     * Check if tracking is available and ready
     * @returns {boolean} True if tracking is initialized and ready
     */
    const isTrackingAvailable = useCallback(() => {
        return isReady && tracker !== null;
    }, [isReady, tracker]);

    /**
     * Get unique visitor identifier
     * @returns {string|null} Visitor ID or null if not available
     */
    const getVisitorId = useCallback(() => {
        if (!isTrackingAvailable()) return null;
        return tracker.getVisitorId();
    }, [tracker, isTrackingAvailable]);

    /**
     * Get current session identifier
     * @returns {string|null} Session ID or null if not available
     */
    const getSessionId = useCallback(() => {
        if (!isTrackingAvailable()) return null;
        return tracker.getSessionId();
    }, [tracker, isTrackingAvailable]);

    /**
     * Track a custom event
     * @param {string} eventName - Name of the event
     * @param {Object} metadata - Additional event data
     *
     * @example
     * trackEvent('video_play', { videoId: 'intro', duration: 120 });
     */
    const trackEvent = useCallback(
        (eventName, metadata = {}) => {
            if (!isTrackingAvailable()) {
                console.warn('Tracking not available');
                return;
            }

            try {
                tracker.trackEvent(eventName, metadata);
            } catch (error) {
                console.error('Error tracking event:', error);
            }
        },
        [tracker, isTrackingAvailable]
    );

    /**
     * Track a button click
     * @param {string} buttonId - Unique identifier for the button
     * @param {string} section - Section/area where button is located
     *
     * @example
     * trackButtonClick('subscribe-button', 'hero-section');
     */
    const trackButtonClick = useCallback(
        (buttonId, section) => {
            trackEvent('button_click', {
                buttonId,
                section,
                timestamp: Date.now()
            });
        },
        [trackEvent]
    );

    /**
     * Track a form submission
     * @param {string} formId - Unique identifier for the form
     * @param {Object} formData - Sanitized form data (no sensitive info)
     *
     * @example
     * trackFormSubmit('contact-form', { hasName: true, hasEmail: true });
     *
     * WARNING: Never track sensitive data like passwords, credit cards, or PII
     */
    const trackFormSubmit = useCallback(
        (formId, formData = {}) => {
            trackEvent('form_submit', {
                formId,
                formData,
                timestamp: Date.now()
            });
        },
        [trackEvent]
    );

    /**
     * Track an add-to-cart event
     * @param {Object} product - Product information
     * @param {string} product.id - Product ID
     * @param {string} product.name - Product name
     * @param {number} product.price - Product price
     * @param {number} product.quantity - Quantity added
     *
     * @example
     * trackAddToCart({
     *   id: 'prod_123',
     *   name: 'CBD Oil 500mg',
     *   price: 29.99,
     *   quantity: 1
     * });
     */
    const trackAddToCart = useCallback(
        (product) => {
            if (!product || !product.id) {
                console.warn('Invalid product data for tracking');
                return;
            }

            trackEvent('add_to_cart', {
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity: product.quantity || 1,
                timestamp: Date.now()
            });
        },
        [trackEvent]
    );

    /**
     * Track a search query
     * @param {string} query - Search term
     * @param {number} resultsCount - Number of results found
     *
     * @example
     * trackSearch('cbd oil', 15);
     */
    const trackSearch = useCallback(
        (query, resultsCount = 0) => {
            if (!query || query.trim().length === 0) {
                console.warn('Empty search query');
                return;
            }

            trackEvent('search', {
                query: query.trim(),
                resultsCount,
                hasResults: resultsCount > 0,
                timestamp: Date.now()
            });
        },
        [trackEvent]
    );

    /**
     * Track a file download
     * @param {string} fileName - Name of the downloaded file
     * @param {string} fileType - File extension/type (pdf, jpg, zip, etc.)
     *
     * @example
     * trackDownload('product-catalog.pdf', 'pdf');
     */
    const trackDownload = useCallback(
        (fileName, fileType) => {
            if (!fileName) {
                console.warn('Invalid file name for tracking');
                return;
            }

            trackEvent('download', {
                fileName,
                fileType: fileType || fileName.split('.').pop(),
                timestamp: Date.now()
            });
        },
        [trackEvent]
    );

    /**
     * Track a page view (manual)
     * Note: Page views are automatically tracked by the visitor tracking system.
     * Use this only for manual tracking in special cases (e.g., SPA route changes).
     *
     * @example
     * trackPageView();
     */
    const trackPageView = useCallback(() => {
        if (!isTrackingAvailable()) {
            console.warn('Tracking not available');
            return;
        }

        try {
            tracker.trackPageView();
        } catch (error) {
            console.error('Error tracking page view:', error);
        }
    }, [tracker, isTrackingAvailable]);

    /**
     * Set custom data for tracking
     * @param {Object} data - Custom data to include with all future events
     *
     * @example
     * setCustomData({ userId: '123', plan: 'premium' });
     */
    const setCustomData = useCallback(
        (data = {}) => {
            if (!isTrackingAvailable()) {
                console.warn('Tracking not available');
                return;
            }

            try {
                tracker.setCustomData(data);
            } catch (error) {
                console.error('Error setting custom data:', error);
            }
        },
        [tracker, isTrackingAvailable]
    );

    /**
     * Manually flush the tracking queue to the database
     * Useful for ensuring data is saved before user navigates away
     *
     * @example
     * await flushQueue();
     */
    const flushQueue = useCallback(async () => {
        if (!isTrackingAvailable()) {
            console.warn('Tracking not available');
            return;
        }

        try {
            await tracker.flush();
        } catch (error) {
            console.error('Error flushing queue:', error);
        }
    }, [tracker, isTrackingAvailable]);

    /**
     * Get current tracking queue status
     * @returns {Object|null} Queue status or null if not available
     *
     * @example
     * const status = getQueueStatus();
     * console.log(`Queue has ${status.size} items`);
     */
    const getQueueStatus = useCallback(() => {
        if (!isTrackingAvailable()) {
            return null;
        }

        try {
            return tracker.getQueueStatus();
        } catch (error) {
            console.error('Error getting queue status:', error);
            return null;
        }
    }, [tracker, isTrackingAvailable]);

    // Return all tracking methods
    return {
        // Primary tracking methods
        trackEvent,
        trackButtonClick,
        trackFormSubmit,
        trackAddToCart,
        trackSearch,
        trackDownload,

        // Additional methods
        trackPageView,
        setCustomData,

        // Queue management
        flushQueue,
        getQueueStatus,

        // Utility methods
        getVisitorId,
        getSessionId,
        isTrackingAvailable,

        // State
        isReady
    };
};

export default useVisitorTracking;
