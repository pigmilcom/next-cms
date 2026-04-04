// Navigation notification badge component
// @/app/admin/components/nav-badge.jsx

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getNavigationSectionCounts } from '@/lib/server/navigation.js';
import { cn } from '@/lib/utils';
import { useLayout } from '../context/LayoutProvider';

export function NavBadge({ section, variant, className, ...props }) {
    const { user } = useLayout();
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Load notification count for this section
    const loadCount = async () => {
        try {
            const result = await getNavigationSectionCounts([section], user?.email || null);

            if (result.success) {
                const newCount = result.data[section] || 0;
                setCount(newCount);
            }
        } catch (error) {
            console.error(`Error loading notification count for ${section}:`, error);
        } finally {
            setLoading(false);
        }
    };

    // Load count on mount and periodically refresh
    useEffect(() => {
        loadCount();

        // Refresh every 30 seconds for real-time updates
        const interval = setInterval(loadCount, 30000);

        return () => clearInterval(interval);
    }, [section, user?.email]);

    // Expose refresh function globally for manual updates
    useEffect(() => {
        // Store the refresh function globally so other components can trigger updates
        if (typeof window !== 'undefined') {
            if (!window.refreshNotificationBadges) {
                window.refreshNotificationBadges = {};
            }
            window.refreshNotificationBadges[section] = loadCount;
        }
    }, [section]);

    // Don't render if no notifications or loading
    if (loading || count === 0) {
        return null;
    }

    // Render red dot for 'alt' variant
    if (variant === 'alt') {
        return (
            <span className={cn('mr-auto my-auto ms-1 flex h-2 w-2 rounded-full bg-red-400', className)} {...props} />
        );
    }

    // Default: render badge with count
    return (
        <Badge
            variant="destructive"
            className={cn(
                'ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px] font-medium',
                className
            )}
            {...props}>
            {count > 99 ? '99+' : count}
        </Badge>
    );
}

// Hook for getting notification counts across multiple sections
export function useNavigationCounts(sections = []) {
    const { user } = useLayout();
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);

    const loadCounts = async () => {
        try {
            const result = await getNavigationSectionCounts(sections, user?.email || null);

            if (result.success) {
                setCounts(result.data);
            }
        } catch (error) {
            console.error('Error loading navigation counts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sections.length > 0) {
            loadCounts();

            // Refresh every 30 seconds
            const interval = setInterval(loadCounts, 30000);

            return () => clearInterval(interval);
        }
    }, [sections.join(','), user?.email]);

    return { counts, loading, refresh: loadCounts };
}

// Utility function to refresh all notification badges
export function refreshAllNotificationBadges() {
    if (typeof window !== 'undefined' && window.refreshNotificationBadges) {
        Object.values(window.refreshNotificationBadges).forEach((refreshFn) => {
            if (typeof refreshFn === 'function') {
                refreshFn();
            }
        });
    }
}

// Utility function to refresh specific badge section
export function refreshNotificationBadge(section) {
    if (typeof window !== 'undefined' && window.refreshNotificationBadges?.[section]) {
        window.refreshNotificationBadges[section]();
    }
}
