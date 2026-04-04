// @/app/(frontend)/booking/loading.js

import { Skeleton } from '@/components/ui/skeleton';

const IntroSkeleton = () => (
    <div className="hero-card mb-0 space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-full sm:w-44" />
        </div>
        <Skeleton className="h-4 w-72" />
    </div>
);

const BookingCardSkeleton = () => (
    <div className="card w-full relative p-0! bg-background rounded-t-xl overflow-hidden! border border-primary/20 shadow-md outline outline-primary/10">
        <div className="booking-header">
            <div className="booking-header-content">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-52" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </div>
        </div>
        <div className="space-y-3 p-4">
            {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
            ))}
            <Skeleton className="h-12 w-full" />
        </div>
    </div>
);

export default function BookingLoading() {
    return (
        <div className="relative container mx-auto px-4! py-8!">
            <div className="grid gap-8 lg:grid-cols-[1fr_430px] items-start">
                <IntroSkeleton />
                <BookingCardSkeleton />
            </div>
        </div>
    );
}
