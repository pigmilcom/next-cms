// @/app/(backend)/admin/overview/loading.js
import { Skeleton } from '@/components/ui/skeleton';

// Admin header skeleton
const AdminHeaderSkeleton = () => (
    <div className="flex items-start justify-between">
        <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-28" />
    </div>
);

// Main stat card skeleton
const MainStatCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
        </div>
        <div className="space-y-2 mt-4">
            <Skeleton className="h-8 w-16" />
            <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-24" />
        </div>
    </div>
);

// Secondary stat card skeleton
const SecondaryStatCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
        </div>
    </div>
);

// Quick action card skeleton
const QuickActionCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm p-4 cursor-pointer">
        <div className="flex items-center justify-between p-0">
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                </div>
            </div>
            <Skeleton className="h-4 w-4" />
        </div>
    </div>
);

// Activity item skeleton
const ActivityItemSkeleton = () => (
    <div className="flex items-center gap-3 border-muted-foreground border-b p-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-3 w-16" />
    </div>
);

// System status item skeleton
const SystemStatusItemSkeleton = () => (
    <div className="flex items-center gap-3 rounded-lg border p-3">
        <Skeleton className="h-3 w-3 rounded-full" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
        </div>
    </div>
);

// Main loading component
export default function OverviewLoading() {
    return (
        <div className="space-y-4">
            {/* Header Section */}
            <AdminHeaderSkeleton />

            {/* Main Statistics Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <MainStatCardSkeleton key={index} />
                ))}
            </div>

            {/* Secondary Statistics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <SecondaryStatCardSkeleton key={index} />
                ))}
            </div>

            {/* Quick Actions and Recent Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Quick Actions Card */}
                <div className="border rounded-lg shadow-sm">
                    <div className="p-6">
                        <Skeleton className="h-6 w-40 mb-2" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                    <div className="p-6 pt-0 space-y-3">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <QuickActionCardSkeleton key={index} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity Card */}
                <div className="border rounded-lg shadow-sm">
                    <div className="p-6">
                        <Skeleton className="h-6 w-40 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <div className="p-0">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <ActivityItemSkeleton key={index} />
                        ))}
                    </div>
                </div>
            </div>

            {/* System Status Card */}
            <div className="border rounded-lg shadow-sm">
                <div className="p-6">
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="p-6 pt-0">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <SystemStatusItemSkeleton key={index} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
