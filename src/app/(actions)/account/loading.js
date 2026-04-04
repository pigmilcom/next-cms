// @/app/(actions)/account/loading.js
import { Skeleton } from '@/components/ui/skeleton';

// Header skeleton
const HeaderSkeleton = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-9 w-48" />
        </div>
        <div className="flex items-center flex-nowrap gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
        </div>
    </div>
);

// Tabs list skeleton
const TabsListSkeleton = () => (
    <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground space-x-1">
        {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-28" />
        ))}
    </div>
);

// Stat card skeleton
const StatCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
        </div>
        <div className="p-6 pt-2">
            <Skeleton className="h-8 w-12" />
        </div>
    </div>
);

// Account info card skeleton
const AccountInfoCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
        </div>
        <div className="p-6 pt-0 space-y-4">
            <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-40" />
            </div>
            <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-56" />
            </div>
        </div>
    </div>
);

// Club card skeleton
const ClubCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-16" />
                </div>
                <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-20" />
                </div>
            </div>
            <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
            </div>
            <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-2 w-full mb-1" />
                <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-full" />
        </div>
    </div>
);

// Recent orders card skeleton
const RecentOrdersCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-6 pt-0">
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="text-right space-y-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                    </div>
                ))}
            </div>
            <Skeleton className="h-10 w-full mt-4" />
        </div>
    </div>
);

// Overview tab skeleton
const OverviewTabSkeleton = () => (
    <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-3 lg:gap-6 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <StatCardSkeleton key={index} />
            ))}
        </div>

        {/* Account Info and Club Grid */}
        <div className="grid md:grid-cols-2 gap-6">
            <AccountInfoCardSkeleton />
            <ClubCardSkeleton />
        </div>

        {/* Recent Orders */}
        <RecentOrdersCardSkeleton />
    </div>
);

// Product card skeleton (for favorites)
const ProductCardSkeleton = () => (
    <div className="border rounded-lg overflow-hidden">
        <Skeleton className="h-48 w-full" />
        <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-full" />
        </div>
    </div>
);

// Favorites tab skeleton
const FavoritesTabSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-6 pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                    <ProductCardSkeleton key={index} />
                ))}
            </div>
        </div>
    </div>
);

// Order card skeleton
const OrderCardSkeleton = () => (
    <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
            <Skeleton className="h-5 w-24" />
            <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-9" />
            </div>
        </div>
    </div>
);

// Orders tab skeleton
const OrdersTabSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-72" />
            </div>
        </div>
        <div className="p-6 pt-0">
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <OrderCardSkeleton key={index} />
                ))}
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Skeleton className="h-5 w-64" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
        </div>
    </div>
);

// Review card skeleton
const ReviewCardSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <div className="flex justify-between items-start">
                <div className="space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-4 w-4 rounded-full" />
                            ))}
                        </div>
                        <Skeleton className="h-5 w-20" />
                    </div>
                </div>
                <Skeleton className="h-4 w-24" />
            </div>
        </div>
        <div className="p-6 pt-0">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    </div>
);

// Reviews tab skeleton
const ReviewsTabSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-56" />
        </div>
        <div className="p-6 pt-0">
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <ReviewCardSkeleton key={index} />
                ))}
            </div>
        </div>
    </div>
);

// Preferences tab skeleton
const PreferencesTabSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-6 w-56" />
            </div>
            <Skeleton className="h-4 w-72" />
        </div>
        <div className="p-6 pt-0">
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-5 w-10" />
                    </div>
                ))}
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    </div>
);

// Security tab skeleton
const SecurityTabSkeleton = () => (
    <div className="space-y-6">
        <div>
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-4 w-80" />
            </div>
            <div className="space-y-4">
                {/* Password section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-full sm:w-40" />
                </div>
                {/* Delete account section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-5 w-40" />
                        </div>
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-full sm:w-40" />
                </div>
            </div>
        </div>
    </div>
);

// Main loading component
export default function Loading() {
    return (
        <div className="container mx-auto py-8 px-4">
            <HeaderSkeleton />

            <div className="space-y-6">
                <TabsListSkeleton />

                {/* Default to Overview tab skeleton */}
                <OverviewTabSkeleton />
            </div>
        </div>
    );
}
