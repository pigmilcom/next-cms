// @/app/(frontend)/press/loading.js

import { Skeleton } from '@/components/ui/skeleton';

const HeaderSkeleton = () => (
    <div className="text-center mb-12">
        <Skeleton className="h-12 w-96 mx-auto mb-4" />
        <Skeleton className="h-6 w-[600px] mx-auto" />
    </div>
);

const CardSkeleton = () => (
    <div className="border rounded-lg p-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
    </div>
);

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-12">
            <HeaderSkeleton />
            
            {/* Contact Card */}
            <div className="border rounded-lg p-6 mb-8">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="grid md:grid-cols-3 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </div>

            {/* Press Releases */}
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid md:grid-cols-2 gap-6 mb-12">
                <CardSkeleton />
                <CardSkeleton />
            </div>

            {/* Media Assets */}
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>

            {/* About */}
            <div className="border rounded-lg p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    );
}
