// @/app/(actions)/booking/success/loading.js

import { Skeleton } from '@/components/ui/skeleton';

const BookingHeaderSkeleton = () => (
    <div className="text-center space-y-4">
        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
        <div className="space-y-2">
            <Skeleton className="mx-auto h-10 w-80" />
            <Skeleton className="mx-auto h-8 w-48 rounded-full" />
        </div>
        <Skeleton className="mx-auto h-5 w-96" />
    </div>
);

const BookingCardSkeleton = () => (
    <div className="rounded-lg border border-border bg-card shadow-lg p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
            </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-muted/40 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <div className="space-y-2.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-6 w-40" />
                </div>
                <div className="space-y-2.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
        </div>

        <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
            </div>
        </div>
    </div>
);

export default function BookingSuccessLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <BookingHeaderSkeleton />
                <BookingCardSkeleton />
            </div>
        </div>
    );
}
