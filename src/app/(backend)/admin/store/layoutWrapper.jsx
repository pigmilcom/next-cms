// @/app/(backend)/admin/store/layoutWrapper.jsx

'use client';

import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sections = [
    {
        label: 'Products & Services',
        href: '/admin/store/catalog',
        icon: 'BoxIcon'
    },
    {
        label: 'Categories',
        href: '/admin/store/categories',
        icon: 'FolderIcon'
    },
    {
        label: 'Collections',
        href: '/admin/store/collections',
        icon: 'LayoutGridIcon'
    }
];

export default function StoreLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [loadingTab, setLoadingTab] = useState(null);

    const handleTabClick = (href, e) => {
        e.preventDefault();

        // Don't navigate if already on the current page
        if (pathname === href) return;

        // Set loading state for the clicked tab
        setLoadingTab(href);

        // Use transition to handle navigation
        startTransition(() => {
            router.push(href);
        });

        // Clear loading state after a short delay to ensure smooth animation
        setTimeout(() => {
            setLoadingTab(null);
        }, 1500);
    };

    return (
        <div className="space-y-4">
            <AdminHeader title="Catalog Management" description="Manage your products, categories, and collections" />

            <div className="overflow-x-auto border-b pb-4">
                <div className="flex min-w-max items-center space-x-4">
                    {sections.map((section) => {
                        const isActive = pathname === section.href;
                        const isLoading = loadingTab === section.href;
                        const isAnyTabLoading = loadingTab !== null;

                        return (
                            <Button
                                key={section.href}
                                variant="ghost"
                                onClick={(e) => handleTabClick(section.href, e)}
                                disabled={isAnyTabLoading}
                                className={cn(
                                    'whitespace-nowrap text-muted-foreground hover:text-primary transition-all duration-200 relative',
                                    isActive && 'bg-muted text-primary',
                                    isLoading && 'pointer-events-none',
                                    isAnyTabLoading && !isLoading && 'opacity-50'
                                )}>
                                <span className={cn('transition-opacity duration-200')}>{section.label}</span>
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Content area with loading overlay */}
            <div className="relative flex-1">
                {loadingTab && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Loading...</span>
                        </div>
                    </div>
                )}
                <div>{children}</div>
            </div>
        </div>
    );
}
