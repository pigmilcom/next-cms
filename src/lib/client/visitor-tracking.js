// @/lib/client/visitor-tracking.js
'use client';

import { generateUID } from '@/lib/shared/helpers';

let isInitialized = false;
let visitorTracker = null;
let sessionStartTime = null;

// Utility functions
const utils = {
    generateSessionId() {
        return generateUID('sess');
    },

    getVisitorId() {
        let visitorId = localStorage.getItem('visitor_id');
        if (!visitorId) {
            visitorId = generateUID('visitor');
            localStorage.setItem('visitor_id', visitorId);
        }
        return visitorId;
    },

    getSessionId() {
        let sessionId = sessionStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = this.generateSessionId();
            sessionStorage.setItem('session_id', sessionId);
            sessionStartTime = Date.now();
            sessionStorage.setItem('session_start_time', sessionStartTime.toString());
        } else {
            sessionStartTime = parseInt(sessionStorage.getItem('session_start_time'), 10) || Date.now();
        }
        return sessionId;
    },

    getDeviceInfo() {
        const viewport = {
            width: window.innerWidth || document.documentElement.clientWidth,
            height: window.innerHeight || document.documentElement.clientHeight
        };

        const screenInfo = {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            colorDepth: window.screen.colorDepth,
            pixelDepth: window.screen.pixelDepth
        };

        return {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isTablet: /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent),
            isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            screen: screenInfo,
            viewport,
            orientation: window.screen.orientation
                ? window.screen.orientation.type
                : window.screen.width > window.screen.height
                  ? 'landscape'
                  : 'portrait',
            pixelRatio: window.devicePixelRatio || 1
        };
    },

    getPerformanceData() {
        if (!window.performance || !window.performance.timing) {
            return null;
        }

        const timing = window.performance.timing;
        const navigation = window.performance.navigation;

        return {
            loadTime: timing.loadEventEnd - timing.navigationStart,
            domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
            redirectTime: timing.redirectEnd - timing.redirectStart,
            dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
            connectTime: timing.connectEnd - timing.connectStart,
            responseTime: timing.responseEnd - timing.requestStart,
            renderTime: timing.loadEventEnd - timing.responseEnd,
            navigationType: navigation.type,
            redirectCount: navigation.redirectCount
        };
    },

    getUrlParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

class VisitorTracker {
    constructor() {
        // Prevent multiple instances
        if (window.VisitorTrackerInstance) {
            return window.VisitorTrackerInstance;
        }

        window.VisitorTrackerInstance = this;

        this.visitorId = utils.getVisitorId();
        this.sessionId = utils.getSessionId();
        this.pageLoadTime = Date.now();
        this.lastPageView = null;
        this.isTracking = false;
        this.isFlushing = false;
        this.trackedPages = new Set();
        this.flushInterval = null;
        this.queueKey = 'visitor_tracking_queue';
        this.lastFlushKey = 'visitor_tracking_last_flush';
        this.flushIntervalMs = 180000; // 3 minutes

        // Get the current page key for this session
        this.currentPageKey = `${this.sessionId}_${window.location.pathname}`;

        // Bind methods first, then debounce
        this.trackPageView = this.trackPageView.bind(this);
        this.trackEvent = this.trackEvent.bind(this);
        this.flushQueue = this.flushQueue.bind(this);

        // Create debounced versions for navigation events
        this.debouncedTrackPageView = utils.debounce(this.trackPageView, 1000);
        this.debouncedTrackEvent = utils.debounce(this.trackEvent, 500);

        this.init();
    }

    init() {
        try {
            // Check for stale queued data from previous session
            this.checkAndFlushStaleData();

            // Check if we've tracked this exact page in this session
            const trackingKey = `tracked_${this.currentPageKey}`;
            let hasTrackedThisPage = false;

            try {
                hasTrackedThisPage = sessionStorage.getItem(trackingKey);
            } catch (_storageError) {
                console.warn('SessionStorage not available, using memory tracking');
                hasTrackedThisPage = this.trackedPages.has(this.currentPageKey);
            }

            if (!hasTrackedThisPage) {
                // Check localStorage for recent tracking (30 seconds window)
                const recentTrackKey = `recent_track_${this.sessionId}_${window.location.pathname}`;
                const recentTrack = this.getRecentTracking(recentTrackKey);

                if (!recentTrack) {
                    // Mark this page as tracked for this session
                    try {
                        sessionStorage.setItem(trackingKey, 'true');
                        this.setRecentTracking(recentTrackKey);
                    } catch (_storageError) {
                        console.warn('SessionStorage write failed, using memory tracking');
                        this.trackedPages.add(this.currentPageKey);
                    }

                    // Track page view (add to queue)
                    this.trackPageView();
                }
            }
        } catch (error) {
            console.error('Error in init():', error);
        }

        // Set up periodic flush (every 3 minutes)
        this.setupFlushInterval();

        // Set up event listeners for navigation
        this.setupEventListeners();
    }

    /**
     * Check for stale queued data and flush if older than 3 minutes
     * This ensures data from previous sessions gets sent
     */
    async checkAndFlushStaleData() {
        try {
            const lastFlush = localStorage.getItem(this.lastFlushKey);
            const queue = this.getQueue();

            if (queue.length === 0) {
                return;
            }

            // If no last flush recorded, or it's been more than 3 minutes, flush now
            const now = Date.now();
            const lastFlushTime = lastFlush ? parseInt(lastFlush, 10) : 0;
            const timeSinceLastFlush = now - lastFlushTime;

            // Check if oldest item in queue is older than 3 minutes
            const oldestItem = queue[0];
            const oldestItemAge = now - (oldestItem.queuedAt || now);

            if (timeSinceLastFlush >= this.flushIntervalMs || oldestItemAge >= this.flushIntervalMs) {
                await this.flushQueue();
            }
        } catch (error) {
            console.error('Error checking stale data:', error);
        }
    }

    /**
     * Setup periodic flush interval (every 3 minutes)
     */
    setupFlushInterval() {
        // Clear any existing interval
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }

        // Set up new interval
        this.flushInterval = setInterval(() => {
            const queueSize = this.getQueue().length;
            if (queueSize > 0) {
                this.flushQueue();
            }
        }, this.flushIntervalMs);
    }

    /**
     * Check if page was recently tracked (within 30 seconds)
     * @param {string} key - Tracking key
     * @returns {boolean} True if recently tracked
     */
    getRecentTracking(key) {
        try {
            const tracked = localStorage.getItem(key);
            if (!tracked) return false;

            const timestamp = parseInt(tracked, 10);
            const now = Date.now();
            const timeWindow = 30000; // 30 seconds

            // Check if within time window
            if (now - timestamp < timeWindow) {
                return true;
            }

            // Expired, remove it
            localStorage.removeItem(key);
            return false;
        } catch (error) {
            console.warn('localStorage not available:', error);
            return false;
        }
    }

    /**
     * Mark page as recently tracked in localStorage
     * @param {string} key - Tracking key
     */
    setRecentTracking(key) {
        try {
            localStorage.setItem(key, Date.now().toString());
        } catch (error) {
            console.warn('localStorage write failed:', error);
        }
    }

    /**
     * Add tracking data to localStorage queue
     * @param {Object} data - Tracking data to queue
     */
    addToQueue(data) {
        try {
            const queue = this.getQueue();
            queue.push({
                ...data,
                queuedAt: Date.now()
            });
            localStorage.setItem(this.queueKey, JSON.stringify(queue));
        } catch (error) {
            console.error('Failed to add to tracking queue:', error);
        }
    }

    /**
     * Get current tracking queue from localStorage
     * @returns {Array} Queue of tracking data
     */
    getQueue() {
        try {
            const queue = localStorage.getItem(this.queueKey);
            return queue ? JSON.parse(queue) : [];
        } catch (error) {
            console.warn('Failed to read tracking queue:', error);
            return [];
        }
    }

    /**
     * Clear tracking queue from localStorage
     */
    clearQueue() {
        try {
            localStorage.removeItem(this.queueKey);
        } catch (error) {
            console.warn('Failed to clear tracking queue:', error);
        }
    }

    /**
     * Flush queue to database
     * Sends all queued tracking data to server and clears queue on success
     */
    async flushQueue() {
        // Prevent concurrent flushes
        if (this.isFlushing) {
            return;
        }

        const queue = this.getQueue();
        if (queue.length === 0) {
            return;
        }

        this.isFlushing = true;

        try {
            // Import server action dynamically
            const { recordBatchedWebStats } = await import('@/lib/server/web-stats.js');
            const result = await recordBatchedWebStats(queue);

            if (result.success) {
                // Clear queue on successful flush
                this.clearQueue();

                // Update last flush timestamp
                try {
                    localStorage.setItem(this.lastFlushKey, Date.now().toString());
                } catch (e) {
                    console.warn('Failed to save last flush timestamp:', e);
                }

                // Call success callback if available
                if (typeof window.onVisitorTrackingFlush === 'function') {
                    window.onVisitorTrackingFlush(result);
                }
            } else {
                console.error('Failed to flush tracking queue:', result.error);
            }
        } catch (error) {
            console.error('Error flushing tracking queue:', error);
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Synchronous flush for page unload
     * Attempts to flush immediately using server action
     * Data will be flushed on next visit if this fails
     */
    flushQueueSync() {
        const queue = this.getQueue();
        if (queue.length === 0) {
            return;
        }

        try {
            // Try to flush using async server action
            // If page unloads before completion, data stays in localStorage
            // and will be flushed on next visit (via checkAndFlushStaleData)
            this.flushQueue().catch((error) => {
                console.warn('[Visitor Tracking] Unload flush failed, will retry on next visit:', error);
            });
        } catch (error) {
            console.error('Error in sync flush:', error);
        }
    }

    setupEventListeners() {
        // Track hash changes (SPA navigation)
        window.addEventListener('hashchange', () => {
            this.handleNavigation();
        });

        // Track popstate (browser navigation)
        window.addEventListener('popstate', () => {
            this.handleNavigation();
        });

        // Track page visibility changes - flush queue when tab becomes hidden
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // User switched tabs or minimized - flush queue
                this.flushQueue();
            }
        });

        // Track page unload and flush queue using sendBeacon for reliability
        window.addEventListener('beforeunload', (e) => {
            this.handlePageUnload();
            // Use sendBeacon for reliable delivery before page unloads
            this.flushQueueSync();
        });

        // Also flush on pagehide (more reliable than beforeunload on mobile)
        window.addEventListener('pagehide', () => {
            this.flushQueueSync();
        });
    }

    handleNavigation() {
        const newPageKey = `${this.sessionId}_${window.location.pathname}`;

        // Only track if it's a different page
        if (newPageKey !== this.currentPageKey) {
            this.currentPageKey = newPageKey;

            const hasTrackedNewPage = sessionStorage.getItem(`tracked_${newPageKey}`);
            const recentTrackKey = `recent_track_${this.sessionId}_${window.location.pathname}`;
            const recentlyTracked = this.getRecentTracking(recentTrackKey);

            if (!hasTrackedNewPage && !recentlyTracked) {
                sessionStorage.setItem(`tracked_${newPageKey}`, 'true');
                this.setRecentTracking(recentTrackKey);
                this.pageLoadTime = Date.now(); // Reset page load time for new page
                // Use debounced version for navigation
                this.debouncedTrackPageView();
            }
        }
    }

    collectData() {
        const now = Date.now();

        return {
            // Basic identifiers
            visitorId: this.visitorId,
            sessionId: this.sessionId,

            // Page information
            url: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            title: document.title,

            // Referrer information
            referrer: document.referrer,

            // User agent
            userAgent: navigator.userAgent,

            // Language and timezone
            language: navigator.language || navigator.userLanguage,
            languages: navigator.languages,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),

            // Device info
            device: utils.getDeviceInfo(),

            // Performance data
            performance: utils.getPerformanceData(),

            // URL parameters
            params: utils.getUrlParams(),

            // Timing data
            timestamp: now,
            pageLoadTime: this.pageLoadTime,
            timeOnPage: now - this.pageLoadTime,

            // Browser capabilities
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack === '1',

            // Custom data
            customData: window.VisitorTrackingData || {}
        };
    }

    async sendData(data, eventType = 'pageview') {
        try {
            // Serialize the data to ensure it's compatible with server actions
            const serializedData = JSON.parse(
                JSON.stringify({
                    ...data,
                    type: eventType,
                    timestamp: new Date().toISOString()
                })
            );

            // Add to queue instead of sending immediately
            this.addToQueue(serializedData);

            // Call success callback if available
            if (typeof window.onVisitorTrackingQueued === 'function') {
                window.onVisitorTrackingQueued({ queued: true, queueSize: this.getQueue().length });
            }
        } catch (error) {
            console.error('Failed to queue visitor data:', error);

            // Call error callback if available
            if (typeof window.onVisitorTrackingError === 'function') {
                window.onVisitorTrackingError(error, data);
            }
        }
    }

    trackPageView() {
        const now = Date.now();

        // Prevent tracking the same page too frequently
        if (this.lastPageView && now - this.lastPageView < 2000) {
            return;
        }

        this.lastPageView = now;
        const data = this.collectData();
        this.sendData(data, 'pageview');
    }

    trackEvent(eventName, eventData = {}) {
        const data = {
            ...this.collectData(),
            eventName,
            eventData
        };
        this.sendData(data, 'event');
    }

    trackCustomEvent(customData = {}) {
        const data = {
            ...this.collectData(),
            customData: {
                ...this.collectData().customData,
                ...customData
            }
        };
        this.sendData(data, 'custom');
    }

    handlePageUnload() {
        // Track page unload with minimal data
        const data = {
            visitorId: this.visitorId,
            sessionId: this.sessionId,
            url: window.location.href,
            pathname: window.location.pathname,
            timeOnPage: Date.now() - this.pageLoadTime,
            type: 'unload'
        };

        // Add to queue (will be flushed by beforeunload listener)
        this.addToQueue(data);
    }

    // Public methods
    track(eventName, eventData) {
        this.trackEvent(eventName, eventData);
    }

    setCustomData(data) {
        window.VisitorTrackingData = {
            ...window.VisitorTrackingData,
            ...data
        };
    }

    getVisitorId() {
        return this.visitorId;
    }

    getSessionId() {
        return this.sessionId;
    }

    /**
     * Manually flush the tracking queue
     * @returns {Promise<void>}
     */
    async flush() {
        await this.flushQueue();
    }

    /**
     * Get current queue status
     * @returns {Object} Queue status
     */
    getQueueStatus() {
        const queue = this.getQueue();
        return {
            size: queue.length,
            oldestEntry: queue.length > 0 ? queue[0].queuedAt : null,
            newestEntry: queue.length > 0 ? queue[queue.length - 1].queuedAt : null
        };
    }
}

// Initialize visitor tracking
export const initializeVisitorTracking = () => {
    // Ensure we're in the browser environment
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Not in browser environment'));
    }

    if (isInitialized) {
        return Promise.resolve(visitorTracker);
    }

    try {
        visitorTracker = new VisitorTracker();
        isInitialized = true;

        // Make tracker globally available
        window.VisitorTracker = visitorTracker;
        window.VisitorTrackingInitialized = true;

        return Promise.resolve(visitorTracker);
    } catch (error) {
        return Promise.reject(error);
    }
};

export const isVisitorTrackingInitialized = () => {
    return isInitialized;
};

export const getVisitorTracker = () => {
    return visitorTracker;
};
