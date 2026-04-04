// @/app/(frontend)/research/loading.js

import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <Skeleton className="h-12 w-96 mx-auto mb-4" />
                <Skeleton className="h-6 w-[700px] mx-auto" />
            </div>

            {/* Statistics */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-6">
                        <Skeleton className="h-8 w-8 mb-4" />
                        <Skeleton className="h-8 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <Skeleton className="h-10 w-full max-w-md mx-auto" />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
                {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24" />
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-6">
                        <Skeleton className="h-6 w-20 mb-4" />
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-4 w-40 mb-4" />
                        <Skeleton className="h-20 w-full mb-4" />
                        <div className="flex gap-2 mb-4">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                        <Skeleton className="h-10 w-40" />
                    </div>
                ))}
            </div>

            {/* Disclaimer */}
            <div className="border rounded-lg p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    );
}
