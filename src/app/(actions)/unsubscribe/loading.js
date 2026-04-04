// @/app/(frontend)/unsubscribe/loading.js

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-3xl">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-px w-full" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-1/4" />
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-start space-x-3">
                                <Skeleton className="h-5 w-5 rounded" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Skeleton className="h-px w-full" />
                    <Skeleton className="h-32 w-full" />
                    <div className="flex gap-3">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
