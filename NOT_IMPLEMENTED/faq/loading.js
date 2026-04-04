// @/app/(frontend)/faq/loading.js

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
            <div className="flex flex-wrap justify-center gap-3 mb-12">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-9 w-28" />
                ))}
            </div>

            {/* FAQ Items */}
            <div className="max-w-4xl mx-auto mb-12">
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="space-y-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-6">
                            <Skeleton className="h-6 w-full mb-2" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact Section */}
            <div className="border rounded-lg p-8 mb-12">
                <Skeleton className="h-8 w-64 mx-auto mb-2" />
                <Skeleton className="h-6 w-96 mx-auto mb-8" />
                <div className="grid md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-6 text-center">
                            <Skeleton className="h-10 w-10 mx-auto mb-3" />
                            <Skeleton className="h-6 w-24 mx-auto mb-2" />
                            <Skeleton className="h-4 w-32 mx-auto mb-4" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Help Resources */}
            <div className="grid md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-6">
                        <Skeleton className="h-10 w-10 mb-3" />
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ))}
            </div>
        </div>
    );
}
