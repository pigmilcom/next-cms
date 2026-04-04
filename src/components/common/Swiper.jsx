// @/app/(frontend)/components/Swiper.jsx
'use client';

import { useEffect, useRef } from 'react';
import { isDesktop } from 'react-device-detect';

/**
 * Reusable Swiper component with smooth touch scrolling
 * Features:
 * - Smooth pixel-by-pixel scrolling on touch devices
 * - Respects boundaries (prevents over-scrolling)
 * - Prevents vertical page scroll during horizontal swipe
 * - Optional auto-scroll functionality
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render inside swiper
 * @param {Function} props.onScrollUpdate - Callback fired when scroll position changes
 * @param {string} props.className - Additional CSS classes for container
 * @param {React.RefObject} props.scrollRef - Optional external ref to access scroll container
 * @param {boolean} props.autoScroll - Enable auto-scroll (default: false)
 * @param {number} props.scrollTime - Auto-scroll interval in seconds (default: 5)
 * @param {Function} props.onMouseEnter - Optional mouse enter callback
 * @param {Function} props.onMouseLeave - Optional mouse leave callback
 */
const Swiper = ({
    children,
    onScrollUpdate,
    className = '',
    scrollRef,
    autoScroll = false,
    scrollTime = 5,
    onMouseEnter,
    onMouseLeave
}) => {
    const internalScrollRef = useRef(null);
    const scrollContainerRef = scrollRef || internalScrollRef;
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchStartScrollLeft = useRef(0);
    const autoScrollIntervalRef = useRef(null);
    const cooldownTimerRef = useRef(null);
    const isUserInteractingRef = useRef(false);
    const lastScrollTime = useRef(0);
    const isAutoScrolling = useRef(false);
    const needsScrolling = useRef(false);

    // Centralized auto-scroll function
    const startAutoScroll = () => {
        if (!autoScroll) return;
        
        const container = scrollContainerRef.current;
        if (!container) return;

        // Check if container actually needs scrolling
        if (container.scrollWidth <= container.clientWidth + 5) return;

        // Clear any existing interval
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
        }

        // Get first child element for scroll amount calculation
        const firstItem = container.firstElementChild?.firstElementChild || container.firstElementChild;
        if (!firstItem) return;

        const itemWidth = firstItem.getBoundingClientRect().width;
        const flexContainer = container.firstElementChild;
        const computedStyle = window.getComputedStyle(flexContainer);
        const gap = parseInt(computedStyle.gap || computedStyle.columnGap || '16', 10);
        const scrollAmount = itemWidth + gap;

        // Smooth animation function
        const animateScroll = (targetScroll, duration = 1000) => {
            const startScroll = container.scrollLeft;
            const distance = targetScroll - startScroll;
            const startTime = performance.now();

            const easeInOutQuad = (t) => {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            };

            const animate = (currentTime) => {
                if (isUserInteractingRef.current) return;

                isAutoScrolling.current = true;
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = easeInOutQuad(progress);

                container.scrollLeft = startScroll + distance * easeProgress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    isAutoScrolling.current = false;
                }
            };

            requestAnimationFrame(animate);
        };

        // Set up interval for auto-scrolling
        autoScrollIntervalRef.current = setInterval(() => {
            if (!container || isUserInteractingRef.current) return;

            const currentScroll = container.scrollLeft;
            const maxScrollLeft = container.scrollWidth - container.clientWidth;

            // Check if we're at or near the end
            const isAtEnd = currentScroll >= maxScrollLeft - 10;

            if (isAtEnd) {
                // Reset to start with smooth animation
                animateScroll(0, 1200);
            } else {
                // Scroll to next item with smooth animation
                const newScrollLeft = Math.min(currentScroll + scrollAmount, maxScrollLeft);
                animateScroll(newScrollLeft, 1200);
            }
        }, scrollTime * 1000);
    };

    // Check if content needs scrolling and monitor scroll events
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const checkScrollNeeded = () => {
            needsScrolling.current = container.scrollWidth > container.clientWidth + 5; // 5px tolerance
            return needsScrolling.current;
        };

        const handleScroll = () => {
            if (onScrollUpdate) {
                const scrollNeeded = checkScrollNeeded();
                onScrollUpdate({
                    scrollLeft: container.scrollLeft,
                    scrollWidth: container.scrollWidth,
                    clientWidth: container.clientWidth,
                    canScrollLeft: container.scrollLeft > 0,
                    canScrollRight: container.scrollLeft < container.scrollWidth - container.clientWidth - 10,
                    needsScrolling: scrollNeeded
                });
            }
        };

        // Check initially and on resize
        checkScrollNeeded();
        const resizeObserver = new ResizeObserver(checkScrollNeeded);
        resizeObserver.observe(container);

        container.addEventListener('scroll', handleScroll);
        // Initial call to set button states
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
            resizeObserver.disconnect();
        };
    }, [onScrollUpdate]);

    // Handle smooth touch scrolling with boundary detection (only if content needs scrolling)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Check if scrolling is needed before attaching handlers
        if (container.scrollWidth <= container.clientWidth + 5) {
            return; // No scrolling needed, skip handlers
        }

        const handleTouchStart = (e) => {
            // Stop auto-scroll when user starts touching
            if (autoScroll && autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current);
                autoScrollIntervalRef.current = null;
            }
            if (cooldownTimerRef.current) {
                clearTimeout(cooldownTimerRef.current);
                cooldownTimerRef.current = null;
            }
            isUserInteractingRef.current = true;

            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
            touchStartScrollLeft.current = container.scrollLeft;
        };

        const handleTouchMove = (e) => {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaX = touchX - touchStartX.current;
            const deltaY = Math.abs(touchY - touchStartY.current);

            // If horizontal movement is greater than vertical, handle smooth scrolling
            if (Math.abs(deltaX) > deltaY) {
                e.preventDefault();

                // Calculate new scroll position
                const newScrollLeft = touchStartScrollLeft.current - deltaX;

                // Check boundaries
                const maxScrollLeft = container.scrollWidth - container.clientWidth;

                // Block swipe at boundaries
                if (newScrollLeft < 0) {
                    // At start, prevent going further left
                    container.scrollLeft = 0;
                } else if (newScrollLeft > maxScrollLeft) {
                    // At end, prevent going further right
                    container.scrollLeft = maxScrollLeft;
                } else {
                    // Smooth pixel-by-pixel scrolling within boundaries
                    container.scrollLeft = newScrollLeft;
                }
            }
        };

        const handleTouchEnd = () => {
            const currentScrollLeft = container.scrollLeft;
            const swipeDistance = currentScrollLeft - touchStartScrollLeft.current;

            // Find first child element for width calculation
            const firstItem = container.firstElementChild?.firstElementChild || container.firstElementChild;

            if (firstItem) {
                // Get computed width including margins/padding
                const itemWidth = firstItem.getBoundingClientRect().width;
                // Calculate gap from computed style of container's first child (flex container)
                const flexContainer = container.firstElementChild;
                const computedStyle = window.getComputedStyle(flexContainer);
                const gap = parseInt(computedStyle.gap || computedStyle.columnGap || '16', 10);
                const itemWithGap = itemWidth + gap;
                const maxScrollLeft = container.scrollWidth - container.clientWidth;

                // Determine snap direction based on swipe
                let targetScroll;

                if (Math.abs(swipeDistance) > 50) {
                    // Threshold for intentional swipe
                    if (swipeDistance > 0) {
                        // Swiped left (scrolling forward)
                        targetScroll = Math.ceil(currentScrollLeft / itemWithGap) * itemWithGap;
                    } else {
                        // Swiped right (scrolling backward)
                        targetScroll = Math.floor(currentScrollLeft / itemWithGap) * itemWithGap;
                    }
                } else {
                    // Small swipe - snap to nearest
                    targetScroll = Math.round(currentScrollLeft / itemWithGap) * itemWithGap;
                }

                // Always respect boundaries - block at edges
                targetScroll = Math.max(0, Math.min(targetScroll, maxScrollLeft));

                // Smooth snap animation
                const animateSnap = () => {
                    const startScroll = container.scrollLeft;
                    const distance = targetScroll - startScroll;
                    const startTime = performance.now();
                    const duration = 300; // Snap animation duration

                    const easeOutQuad = (t) => t * (2 - t);

                    const animate = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easeProgress = easeOutQuad(progress);

                        container.scrollLeft = startScroll + distance * easeProgress;

                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    };

                    requestAnimationFrame(animate);
                };

                animateSnap();
            }

            isUserInteractingRef.current = false;

            // Resume auto-scroll after 5 second cooldown
            if (autoScroll) {
                cooldownTimerRef.current = setTimeout(() => {
                    if (!isUserInteractingRef.current && !autoScrollIntervalRef.current) {
                        startAutoScroll();
                    }
                }, 5000); // 5 second cooldown
            }
        };

        // Detect manual scroll (wheel, navigation buttons, etc.)
        const handleManualScroll = () => {
            // Only react to manual scrolls, not auto-scroll animations
            if (isAutoScrolling.current) return;

            const now = Date.now();
            const timeSinceLastScroll = now - lastScrollTime.current;

            // Debounce to avoid excessive triggers
            if (timeSinceLastScroll < 100) return;

            lastScrollTime.current = now;

            // Stop auto-scroll
            if (autoScroll && autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current);
                autoScrollIntervalRef.current = null;
            }

            // Clear existing cooldown
            if (cooldownTimerRef.current) {
                clearTimeout(cooldownTimerRef.current);
            }

            // Start 5-second cooldown to resume auto-scroll
            if (autoScroll) {
                cooldownTimerRef.current = setTimeout(() => {
                    if (!isUserInteractingRef.current && !autoScrollIntervalRef.current) {
                        startAutoScroll();
                    }
                }, 5000);
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
        container.addEventListener('scroll', handleManualScroll, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('scroll', handleManualScroll);
        };
    }, [autoScroll, scrollTime]);

    // Initialize auto-scroll on mount
    useEffect(() => {
        if (!autoScroll) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        // Small delay to ensure content is rendered and measured
        const initTimer = setTimeout(() => {
            startAutoScroll();
        }, 100);

        // Cleanup
        return () => {
            clearTimeout(initTimer);
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current);
                autoScrollIntervalRef.current = null;
            }
            if (cooldownTimerRef.current) {
                clearTimeout(cooldownTimerRef.current);
                cooldownTimerRef.current = null;
            }
        };
    }, [autoScroll, scrollTime]);

    // Handle mouse enter (pause auto-scroll)
    const handleMouseEnter = (e) => {
        if (autoScroll && autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
        }
        if (onMouseEnter) onMouseEnter(e);
    };

    // Handle mouse leave (resume auto-scroll)
    const handleMouseLeave = (e) => {
        if (autoScroll) {
            startAutoScroll();
        }
        if (onMouseLeave) onMouseLeave(e);
    };

    return (
        <div className="relative w-full max-w-full overflow-x-hidden">
        <div
            ref={scrollContainerRef}
            className={`overflow-x-auto ${isDesktop ? 'swiper-scrollbar' : 'scrollbar-none'} ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            {children}
        </div>
        </div>
    );
};

export default Swiper;
