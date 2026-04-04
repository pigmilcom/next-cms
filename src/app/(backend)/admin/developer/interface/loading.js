// @/app/(backend)/admin/developer/interface/loading.js

import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <>
            <AdminHeader title="Interface Settings" description="Manage admin interface menu visibility and access" />

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-full max-w-md mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 mt-8">
                            {[...Array(6)].map((_, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                    <Skeleton className="h-4 w-4 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-full max-w-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-20" />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
