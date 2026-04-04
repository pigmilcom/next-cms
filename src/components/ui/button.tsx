// @/components/ui/button.tsx

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none border border-border ring-0! focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    {
        variants: {
            variant: {
                default: 'rounded-md border bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
                destructive:
                    'rounded-md bg-red-500/90 text-white shadow-xs hover:bg-red-500/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
                outline:
                    'rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-black/90 dark:border-input dark:hover:bg-black/70',
                secondary: 'rounded-md bg-background text-foreground shadow-xs hover:bg-background/90',
                ghost: 'rounded-md hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/70',
                transparent:
                    'rounded-md bg-transparent! border-0! shadow-none! text-foreground hover:text-accent-foreground',
                link: 'rounded-md text-primary underline-offset-4 hover:underline'
            },
            size: {
                default: 'h-9 px-3! py-2! has-[>svg]:px-2!',
                sm: 'h-8 gap-1.5 px-3! py-2! has-[>svg]:px-2!',
                lg: 'h-10 px-4! py-2! has-[>svg]:px-3!',
                xl: 'h-12 px-4! py-3! has-[>svg]:px-3!',
                icon: 'size-9'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot : 'button';

    return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
