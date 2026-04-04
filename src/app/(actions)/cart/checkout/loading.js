// @/app/(actions)/cart/checkout/loading.js (Checkout Page Loading State)

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Header Skeleton
const HeaderSkeleton = () => (
    <div className="mb-8">
        <Skeleton className="h-10 w-64" />
    </div>
);

// Payment Form Skeleton (Left Column)
const PaymentFormSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
            </div>

            {/* Shipping Information */}
            <div className="space-y-4">
                <Skeleton className="h-5 w-44" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
            </div>

            {/* Shipping Methods */}
            <div className="space-y-4">
                <Skeleton className="h-5 w-36" />
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <Skeleton className="h-4 w-40" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Coupon Code */}
            <div className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
                <Skeleton className="h-5 w-36" />
                <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
                <Skeleton className="h-32 w-full rounded-lg" />
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-3">
                <div className="flex items-start gap-2">
                    <Skeleton className="h-4 w-4 mt-0.5 shrink-0" />
                    <Skeleton className="h-4 w-full" />
                </div>
                <div className="flex items-start gap-2">
                    <Skeleton className="h-4 w-4 mt-0.5 shrink-0" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>

            {/* Submit Button */}
            <Skeleton className="h-12 w-full" />
        </CardContent>
    </Card>
);

// Order Summary Skeleton (Right Column)
const OrderSummarySkeleton = () => (
    <Card className="lg:sticky lg:top-24">
        <CardHeader>
            <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
            {/* Items */}
            <div className="mb-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 rounded-lg border bg-muted/30 p-3">
                        <Skeleton className="h-16 w-16 rounded-md shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>

            <Separator className="my-4" />

            {/* Price Breakdown */}
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
                <div className="flex justify-between text-sm">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
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

                <Separator />

                {/* Total */}
                <div className="flex justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 rounded-lg border border-border bg-accent/50 p-3">
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4 shrink-0" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </div>
        </CardContent>
    </Card>
);

// Navigation Links Skeleton
const NavigationSkeleton = () => (
    <div className="mt-8 flex justify-center gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
    </div>
);

// Main Loading Component
export default function CheckoutLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <HeaderSkeleton />

            {/* Two-Column Grid Layout */}
            <div className="grid gap-8 lg:grid-cols-2">
                {/* Left Column: Payment Form */}
                <div className="order-2 lg:order-1">
                    <PaymentFormSkeleton />
                </div>

                {/* Right Column: Order Summary */}
                <div className="order-1 lg:order-2">
                    <OrderSummarySkeleton />
                </div>
            </div>

            <NavigationSkeleton />
        </div>
    );
}
