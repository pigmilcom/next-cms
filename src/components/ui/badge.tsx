import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center justify-center rounded-md ring ring-background/30 border border-border font-semibold w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden',
    {
        variants: {
            variant: {
                default: 'border-background/30 bg-foreground text-background [a&]:hover:bg-foreground/90',
                secondary: 'opacity-90 bg-secondary text-muted-foreground/90 [a&]:hover:bg-secondary/90',
                destructive:
                    'bg-destructive text-neutral-100 [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
                success: 'bg-green-600 text-neutral-100 [a&]:hover:bg-green-600/90',
                outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground'
            },
            size: {
                xs: 'px-1 py-0.5 text-[0.65rem] [&>svg]:size-2',
                sm: 'px-1.5 py-0.5 text-xs [&>svg]:size-2.5',
                default: 'px-2 py-0.5 text-xs [&>svg]:size-3',
                lg: 'px-2.5 py-1 text-sm [&>svg]:size-3.5',
                xl: 'px-3 py-1.5 text-sm [&>svg]:size-4'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
);

function Badge({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'span';

    return <Comp data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
