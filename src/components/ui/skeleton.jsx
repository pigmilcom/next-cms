import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }) {
    return <div className={cn('bg-muted', className)} {...props} />;
}

export { Skeleton };
