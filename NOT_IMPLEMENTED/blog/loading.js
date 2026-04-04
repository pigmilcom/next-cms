// @/app/(frontend)/blog/loading.js

import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-12">
            {/* Hero Section */}
            <div className="text-center mb-12">
                <Skeleton className="h-6 w-32 mx-auto mb-4" />
                <Skeleton className="h-12 w-96 mx-auto mb-4" />
                <Skeleton className="h-6 w-[600px] mx-auto" />
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-12">
                <Skeleton className="h-12 w-full" />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
                {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24" />
                ))}
            </div>

            {/* Featured Posts */}
            <div className="mb-16">
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="grid md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden">
                            <Skeleton className="h-48 w-full" />
                            <div className="p-6">
                                <div className="flex gap-2 mb-2">
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                                <Skeleton className="h-6 w-full mb-2" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-3/4 mb-4" />
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-8 w-24" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-8">
                <Skeleton className="h-10 w-full max-w-md mx-auto" />
            </div>

            {/* Blog Posts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="border rounded-lg overflow-hidden">
                        <Skeleton className="h-48 w-full" />
                        <div className="p-6">
                            <div className="flex gap-2 mb-2">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <Skeleton className="h-6 w-full mb-2" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-3/4 mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-24" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Newsletter CTA */}
            <div className="border rounded-lg p-8">
                <Skeleton className="h-8 w-64 mx-auto mb-2" />
                <Skeleton className="h-6 w-96 mx-auto mb-6" />
                <div className="flex gap-2 max-w-md mx-auto">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </div>
    );
}
