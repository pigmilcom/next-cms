// @/app/(actions)/cart/checkout/success/loading.js (Checkout Success Loading State)

import { Skeleton } from '@/components/ui/skeleton';

// Success Icon Skeleton
const SuccessIconSkeleton = () => (
    <div className="mb-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <Skeleton className="h-20 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 w-96 mx-auto mb-4" />
        <Skeleton className="h-6 w-full max-w-2xl mx-auto mb-4" />
    </div>
);

// Customer Information Skeleton
const CustomerInfoSkeleton = () => (
    <div className="mb-8 rounded-lg bg-muted/50 p-4 space-y-3">
        <Skeleton className="h-6 w-48 mb-3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
    </div>
);

// Order Items Skeleton
const OrderItemsSkeleton = () => (
    <div className="mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-md shrink-0" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-5 w-20" />
                </div>
            ))}
        </div>
    </div>
);

// Order Summary Skeleton
const OrderSummarySkeleton = () => (
    <div className="border-border border-t pt-6">
        <div className="space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
            </div>

            {/* Shipping */}
            <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
            </div>

            {/* Discount */}
            <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
            </div>

            {/* VAT */}
            <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
            </div>

            {/* Total */}
            <div className="flex justify-between border-border border-t pt-3">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
            </div>
        </div>
    </div>
);

// Order Details Card Skeleton
const OrderDetailsCardSkeleton = () => (
    <div className="mb-8 rounded-lg border border-border bg-card/95 p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 text-center space-y-2">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-5 w-80 mx-auto" />
            <Skeleton className="h-5 w-72 mx-auto" />
        </div>

        <CustomerInfoSkeleton />
        <OrderItemsSkeleton />
        <OrderSummarySkeleton />
    </div>
);

// Action Buttons Skeleton
const ActionButtonsSkeleton = () => (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Skeleton className="h-12 w-52" />
        <Skeleton className="h-12 w-52" />
    </div>
);

// Back to Shop Link Skeleton
const BackLinkSkeleton = () => (
    <div className="mt-8 text-center">
        <Skeleton className="h-10 w-40 mx-auto" />
    </div>
);

// Main Loading Component
export default function CheckoutSuccessLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-4xl">
                <SuccessIconSkeleton />
                <OrderDetailsCardSkeleton />
                <ActionButtonsSkeleton />
                <BackLinkSkeleton />
            </div>
        </div>
    );
}
