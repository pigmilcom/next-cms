// @/app/(backend)/admin/account/loading.js
import { Skeleton } from '@/components/ui/skeleton';

// Header skeleton
const HeaderSkeleton = () => (
    <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
    </div>
);

// Tabs list skeleton
const TabsListSkeleton = () => (
    <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground space-x-1 mb-2">
        {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-32" />
        ))}
    </div>
);

// Profile form skeleton
const ProfileFormSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-6 pt-0">
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-24 w-full" />
                </div>
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </div>
    </div>
);

// Security form skeleton
const SecurityFormSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-4 w-80" />
        </div>
        <div className="p-6 pt-0">
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
                <Skeleton className="h-10 w-48" />
            </div>
        </div>
    </div>
);

// Notifications form skeleton
const NotificationsFormSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-64" />
            </div>
            <Skeleton className="h-4 w-72" />
        </div>
        <div className="p-6 pt-0">
            <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-5 w-10 rounded-full" />
                    </div>
                ))}
                <div className="border-t pt-6">
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-56" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Main loading component
export default function Loading() {
    return (
        <div className="w-full mx-auto py-8 px-4">
            <HeaderSkeleton />

            <div className="space-y-6">
                <TabsListSkeleton />

                {/* Default to Profile tab skeleton */}
                <ProfileFormSkeleton />
            </div>
        </div>
    );
}
