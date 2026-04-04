// @/app/(actions)/shop/loading.js (Shop Loading State)

import { Skeleton } from '@/components/ui/skeleton';

// Hero Section Skeleton
const HeroSectionSkeleton = () => (
    <div className="text-center mb-8">
        <Skeleton className="h-12 md:h-14 w-64 md:w-96 mx-auto mb-4" />
        <Skeleton className="h-6 w-full max-w-2xl mx-auto" />
    </div>
);

// Filters Section Skeleton
const FiltersSectionSkeleton = () => (
    <div className="mb-8">
        <div className="space-y-4">
            {/* Search Bar */}
            <Skeleton className="h-12 w-full" />

            {/* Filter Toggle & Product Count */}
            <div className="w-full flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                <Skeleton className="h-4 w-24" />
            </div>

            {/* Clear Filters Button */}
            <div className="w-full flex justify-end">
                <Skeleton className="h-10 w-full" />
            </div>

            {/* Category Carousel */}
            <div className="overflow-x-auto -mx-4 px-4">
                <div className="flex gap-3 min-w-max pb-2">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex-none w-32">
                            <div className="bg-card border border-border rounded-lg p-3 h-full">
                                <Skeleton className="w-full h-16 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-nowrap gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    </div>
);

// Product Card Skeleton
const ProductCardSkeleton = () => (
    <div className="space-y-3 p-3 border rounded-lg bg-card">
        <Skeleton className="aspect-square w-full rounded-md" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
        </div>
    </div>
);

// Products Grid Skeleton
const ProductsGridSkeleton = () => (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6 mb-8">
        {[...Array(25)].map((_, i) => (
            <ProductCardSkeleton key={i} />
        ))}
    </div>
);

// Pagination Skeleton
const PaginationSkeleton = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-9 w-10" />
                ))}
            </div>
            <Skeleton className="h-9 w-24" />
        </div>
    </div>
);

// Features Extra Section Skeleton
const FeaturesExtraSkeleton = () => (
    <section className="mt-16 pt-16 border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center text-center space-y-3 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ))}
        </div>
    </section>
);

// Main Loading Component
export default function ShopLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <HeroSectionSkeleton />
            <FiltersSectionSkeleton />
            <ProductsGridSkeleton />
            <PaginationSkeleton />
            <FeaturesExtraSkeleton />
        </div>
    );
}
