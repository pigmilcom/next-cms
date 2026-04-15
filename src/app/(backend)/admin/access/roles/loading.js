// @/app/(backend)/admin/access/roles/loading.js
import { Skeleton } from '@/components/ui/skeleton';

const AdminHeaderSkeleton = () => (
    <div className="flex items-start justify-between">
        <div className="space-y-1">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-64" />
        </div>
    </div>
);

const AdminTableSkeleton = () => (
    <div className="border rounded-lg shadow-sm">
        {/* Search + Actions toolbar */}
        <div className="flex items-center justify-between p-4 border-b gap-3">
            <Skeleton className="h-9 w-56" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-28" />
            </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3.5 border-b last:border-b-0 items-center">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-1">
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-24" />
            </div>
        ))}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
            </div>
        </div>
    </div>
);

export default function RolesLoading() {
    return (
        <div className="space-y-4">
            <AdminHeaderSkeleton />
            <AdminTableSkeleton />
        </div>
    );
}
