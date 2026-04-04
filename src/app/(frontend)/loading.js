// @/app/(frontend)/loading.js (Homepage Loading State)

import { Skeleton } from '@/components/ui/skeleton';

// Hero Section Skeleton
const HeroSectionSkeleton = () => (
    <section className="relative min-h-150 flex items-center justify-center bg-linear-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto text-center space-y-6">
                <Skeleton className="h-16 w-3/4 mx-auto" />
                <Skeleton className="h-8 w-full max-w-2xl mx-auto" />
                <Skeleton className="h-6 w-2/3 mx-auto" />
                <div className="flex gap-4 justify-center pt-8">
                    <Skeleton className="h-12 w-40" />
                    <Skeleton className="h-12 w-40" />
                </div>
            </div>
        </div>
    </section>
);
 

// Main Loading Component
export default function HomeLoading() {
    return (
        <>
            <HeroSectionSkeleton /> 
        </>
    );
}
