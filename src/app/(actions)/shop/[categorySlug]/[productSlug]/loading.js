// @/app/(actions)/shop/[categorySlug]/[productSlug]/loading.js (Product Page Loading State)

import { Skeleton } from '@/components/ui/skeleton';

// Breadcrumb Skeleton
const BreadcrumbSkeleton = () => (
    <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-16" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-24" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-32" />
    </div>
);

// Product Images Skeleton
const ProductImagesSkeleton = () => (
    <div className="space-y-4">
        {/* Main Image */}
        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <div className="absolute top-4 left-4 flex flex-col gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="w-full h-full" />
        </div>

        {/* Thumbnails */}
        <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
        </div>

        {/* Additional Info Card */}
        <div className="hidden md:block mt-10 p-4 border rounded-lg space-y-2">
            <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
            </div>
        </div>
    </div>
);

// Product Info Skeleton
const ProductInfoSkeleton = () => (
    <div>
        {/* Title */}
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-3/4 mb-4" />

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-5 w-5" />
                ))}
            </div>
            <Skeleton className="h-4 w-24" />
        </div>

        {/* Price */}
        <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
        </div>

        {/* Description */}
        <div className="space-y-2 mb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Club Points Card */}
        <div className="mb-6 p-4 border rounded-lg">
            <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-full" />
            </div>
        </div>

        {/* Attributes/Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
            {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
        </div>

        {/* Quantity Options */}
        <div className="mb-6">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-full mb-3" />
            <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
            </div>
        </div>

        {/* Quantity Selector */}
        <div className="mb-6">
            <Skeleton className="h-5 w-24 mb-2" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-10 w-10" />
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-12 w-12" />
        </div>

        {/* Additional Info Card (Mobile) */}
        <div className="md:hidden mt-10 p-4 border rounded-lg space-y-2">
            <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
            </div>
        </div>
    </div>
);

// Features Section Skeleton
const FeaturesSkeleton = () => (
    <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center text-center space-y-3 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                </div>
            ))}
        </div>
    </section>
);

// Reviews Section Skeleton
const ReviewsSectionSkeleton = () => (
    <div className="mb-12">
        <Skeleton className="h-8 w-48 mb-6" />

        {/* Review Form */}
        <div className="mb-6 p-6 border rounded-lg space-y-4">
            <Skeleton className="h-6 w-40 mb-4" />

            {/* Rating Stars */}
            <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-6 w-6" />
                    ))}
                    <Skeleton className="h-4 w-16 ml-2" />
                </div>
            </div>

            {/* Comment Textarea */}
            <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-32 w-full" />
            </div>

            {/* Anonymous Checkbox */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
            </div>

            {/* Submit Button */}
            <Skeleton className="h-10 w-32" />
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, j) => (
                                    <Skeleton key={j} className="h-4 w-4" />
                                ))}
                            </div>
                        </div>
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Related Products Skeleton
const RelatedProductsSkeleton = () => (
    <section>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3 p-3 border rounded-lg">
                    <Skeleton className="aspect-square w-full rounded-md" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-9 w-9 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    </section>
);

// Main Loading Component
export default function ProductPageLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <BreadcrumbSkeleton />

            {/* Product Details Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
                <ProductImagesSkeleton />
                <ProductInfoSkeleton />
            </div>

            <FeaturesSkeleton />
            <ReviewsSectionSkeleton />
            <RelatedProductsSkeleton />
        </div>
    );
}
