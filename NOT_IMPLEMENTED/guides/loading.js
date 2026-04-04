// @/app/(frontend)/resources/loading.js

import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <Skeleton className="h-12 w-96 mx-auto mb-4" />
                <Skeleton className="h-6 w-[600px] mx-auto" />
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <Skeleton className="h-10 w-full max-w-2xl mx-auto" />
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-6" />
                        </div>
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <div className="flex items-center justify-between text-sm mb-4">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>

            {/* Newsletter CTA */}
            <div className="border rounded-lg p-6">
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96 mb-4" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </div>
    );
}
