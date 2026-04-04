// @/components/ui/skeleton.tsx

import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="skeleton" className={cn('bg-input', className)} {...props} />;
}

function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }): React.ReactElement {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {[...Array(columns)].map((_, index) => (
                        <TableHead key={index} className="sm:h-[55px]">
                            <div className="flex items-center justify-center ">
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {[...Array(rows)].map((_, rowIndex) => (
                    <TableRow key={rowIndex} className="sm:h-[55px] sm:max-h-[55px]">
                        {[...Array(columns)].map((_, colIndex) => (
                            <TableCell key={colIndex} className={colIndex === columns - 1 ? 'text-right' : ''}>
                                {colIndex === columns - 1 ? (
                                    <div className="flex justify-end gap-2">
                                        <Skeleton className="h-8 w-8" />
                                        <Skeleton className="h-8 w-8" />
                                    </div>
                                ) : (
                                    <Skeleton className="h-4 w-20" />
                                )}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function ProductCardSkeleton(): React.ReactElement {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="h-64 w-full rounded-t-lg" />
            <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </CardContent>
        </Card>
    );
}

function ProductGridSkeleton({ count = 8 }: { count?: number }): React.ReactElement {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(count)].map((_, index) => (
                <ProductCardSkeleton key={index} />
            ))}
        </div>
    );
}

function ProductDetailSkeleton(): React.ReactElement {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-2" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-2" />
                <Skeleton className="h-4 w-32" />
            </div>

            {/* Product Details */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Image Gallery */}
                <div className="space-y-4">
                    <Skeleton className="w-full aspect-square rounded-lg" />
                    <div className="grid grid-cols-4 gap-2">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-md" />
                        ))}
                    </div>
                </div>

                {/* Product Info */}
                <div>
                    <Skeleton className="h-10 w-3/4 mb-4" />
                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-16" />
                    </div>
                    {/* Price and Discount */}
                    <div className="flex items-center gap-3 mb-6">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                    {/* Description */}
                    <Skeleton className="h-16 w-full mb-6" />
                    {/* Quantity-Based Pricing Options */}
                    <div className="mb-6">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-64 mb-3" />
                        <div className="grid grid-cols-2 gap-2">
                            {[...Array(2)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-md" />
                            ))}
                        </div>
                    </div>
                    {/* Quantity */}
                    <div className="mb-6">
                        <Skeleton className="h-5 w-24 mb-2" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-10 w-10 rounded" />
                            <Skeleton className="h-10 w-12 rounded" />
                            <Skeleton className="h-10 w-10 rounded" />
                        </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-3 mb-6">
                        <Skeleton className="h-12 w-32 rounded" />
                        <Skeleton className="h-12 w-12 rounded" />
                        <Skeleton className="h-12 w-12 rounded" />
                    </div>
                    {/* Additional Info Card */}
                    <div className="mb-6">
                        <Skeleton className="h-40 w-full rounded" />
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            <div className="mb-12">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded" />
                    ))}
                </div>
            </div>

            {/* Related Products */}
            <div>
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <ProductCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export { Skeleton, TableSkeleton };
