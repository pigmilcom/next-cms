'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return <TabsPrimitive.Root data-slot="tabs" className={cn('w-full flex flex-col gap-2', className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [showLeftButton, setShowLeftButton] = React.useState(false);
    const [showRightButton, setShowRightButton] = React.useState(false);

    const checkScrollButtons = React.useCallback(() => {
        if (!scrollRef.current) return;
        
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftButton(scrollLeft > 0);
        setShowRightButton(scrollLeft < scrollWidth - clientWidth - 1);
    }, []);

    React.useEffect(() => {
        checkScrollButtons();
        
        const handleResize = () => checkScrollButtons();
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, [checkScrollButtons]);

    const scrollToDirection = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        
        const scrollAmount = 200; // Adjust scroll distance as needed
        const newScrollLeft = direction === 'left' 
            ? scrollRef.current.scrollLeft - scrollAmount
            : scrollRef.current.scrollLeft + scrollAmount;
            
        scrollRef.current.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
        });
    };

    const handleScroll = () => {
        checkScrollButtons();
    };

    return (
        <div className="relative flex items-center w-full"> 
            <button
                type="button"
                onClick={() => scrollToDirection('left')}
                className="absolute left-1 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background transition-colors"
                aria-label="Scroll tabs left"
                disabled={!showLeftButton}
            >
                <ChevronLeft className="w-4 h-4" />
            </button> 
            
            <TabsPrimitive.List
                ref={scrollRef}
                data-slot="tabs-list"
                onScroll={handleScroll}
                // Make the tab list responsive: limit to container width and allow horizontal scroll
                className={cn(
                    'scrollbar-thin flex flex-nowrap h-auto w-full max-w-full items-center justify-start gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-lg bg-card p-[3px] text-muted-foreground border border-border',
                    className
                )}
                // Enable smooth touch scrolling on iOS
                style={{ WebkitOverflowScrolling: 'touch' }}
                {...props}
            />
             
            <button
                type="button"
                onClick={() => scrollToDirection('right')}
                className="absolute right-1 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background transition-colors"
                aria-label="Scroll tabs right"
                disabled={!showRightButton}
            >
                <ChevronRight className="w-4 h-4" />
            </button> 
        </div>
    );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                "inline-flex flex-col h-full min-w-[100px] flex-none items-center justify-center gap-1 whitespace-nowrap rounded-md border-none px-3 py-2 font-medium text-foreground text-sm transition-shadow focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-foreground dark:data-[state=active]:text-background [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                className
            )}
            {...props}
        />
    );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
