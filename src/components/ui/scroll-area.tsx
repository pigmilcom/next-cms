'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { cn } from '@/lib/utils';

function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
    const viewportRef = React.useRef<HTMLDivElement | null>(null);

    // Some global CSS or other libraries can inject `display: table` on the
    // inner wrapper that Radix creates. Radix's Viewport itself accepts the
    // className/style we pass, but it may still create an inner element for
    // children. To guarantee the inner wrapper uses block layout, observe the
    // viewport and force the first child (the dynamic wrapper) to `display: block`.
    React.useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const forceBlock = (node: Element | null) => {
            try {
                if (!node) return;
                // Apply with !important to override other rules
                (node as HTMLElement).style.setProperty('display', 'block', 'important');
            } catch (e) {
                // ignore
            }
        };

        // Force existing first child (Radix may have created a child wrapper)
        forceBlock(el.firstElementChild);

        // Observe for future child additions/changes
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList') {
                    forceBlock(el.firstElementChild);
                }
            }
        });

        observer.observe(el, { childList: true });

        return () => observer.disconnect();
    }, []);

    return (
        <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn('relative', className)} {...props}>
            <ScrollAreaPrimitive.Viewport
                // Attach ref so we can inspect/manipulate inner wrapper
                ref={viewportRef}
                data-slot="scroll-area-viewport"
                className="size-full rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                // Force block display to override any `display: table` coming from global styles
                style={{ display: 'block' }}>
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
}

function ScrollBar({
    className,
    orientation = 'vertical',
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
    return (
        <ScrollAreaPrimitive.ScrollAreaScrollbar
            data-slot="scroll-area-scrollbar"
            orientation={orientation}
            className={cn(
                'flex touch-none select-none p-px transition-colors',
                orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
                orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
                className
            )}
            {...props}>
            <ScrollAreaPrimitive.ScrollAreaThumb
                data-slot="scroll-area-thumb"
                className="relative flex-1 rounded-full bg-border"
            />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
    );
}

export { ScrollArea, ScrollBar };
