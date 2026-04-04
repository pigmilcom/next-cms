// @/app/(actions)/cart/loading.js
import { Skeleton } from '@/components/ui/skeleton';

// Free shipping progress bar skeleton
const FreeShippingProgressBarSkeleton = () => (
    <div className="mb-4 lg:mb-6">
        <div className="border rounded-lg shadow-sm bg-background">
            <div className="p-4 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="text-right space-y-2">
                        <Skeleton className="h-7 w-20 ml-auto" />
                        <Skeleton className="h-3 w-16 ml-auto" />
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="mb-3">
                    <Skeleton className="h-3 w-full rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

// Cart item skeleton
const CartItemSkeleton = () => (
    <div className="flex gap-4 p-4 border border-border rounded-lg bg-card">
        {/* Product Image */}
        <Skeleton className="w-20 h-20 flex-shrink-0 rounded" />

        {/* Product Details */}
        <div className="flex-1 min-w-0 space-y-2">
            {/* Name and discount badge */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-12 rounded" />
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-14" />
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2 mt-2">
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-7 w-7 ml-auto" />
            </div>
        </div>
    </div>
);

// Cart footer skeleton
const CartFooterSkeleton = () => (
    <div className="border-t border-border pt-4 mt-4 space-y-4 flex-shrink-0">
        <div className="flex justify-between items-center">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-7 w-24" />
        </div>

        <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    </div>
);

// Hot products section skeleton
const HotProductsSkeleton = () => (
    <div className="py-4 border-t border-border">
        <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="min-w-[200px] space-y-2">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            ))}
        </div>
    </div>
);

// Main loading component
export default function CartLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-8 w-48 mb-6" />

            <div className="flex flex-col h-full overflow-hidden">
                {/* Free Shipping Progress Bar */}
                <FreeShippingProgressBarSkeleton />

                {/* Cart Items */}
                <div className="space-y-4 mb-8">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <CartItemSkeleton key={index} />
                    ))}
                </div>

                {/* Cart Footer */}
                <CartFooterSkeleton />

                {/* Hot Products Section */}
                <div className="mt-8">
                    <HotProductsSkeleton />
                </div>
            </div>
        </div>
    );
}
