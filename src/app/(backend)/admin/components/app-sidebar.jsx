// @/app/(backend)/admin/components/app-sidebar.jsx

'use client';

import { Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
    SidebarTrigger
} from '@/components/ui/sidebar';
import { useAdminNavigation } from '../config/navigation';
import { useLayout, useAdminSettings } from '../context/LayoutProvider';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user'; 

export function AppSidebar(props) {
    const { user } = useLayout();
    const { siteSettings } = useAdminSettings();
    const navigation = useAdminNavigation();

    const data = {
        user: {
            name: user?.displayName || 'NA',
            email: user?.email || '-',
            avatar: '/images/avatar.webp'
        },
        ...navigation
    };

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="flex-row flex-nowrap items-center justify-start">
                <img
                    src="/nextcms_icon.webp"
                    alt="Logo" 
                    className="filter invert-100 dark:invert-0 bg-transparent dark:bg-background rounded-md p-1 border border-border shadow-xs"
                    style={{ height: '28px', maxHeight: '28px', maxWidth: '80px', width: 'auto' }}
                />
                <span className="ms-1 font-bold text-sm inline truncate">
                    {siteSettings?.siteName || 'Admin Panel'}
                </span>
                <div className="ms-auto peer-[[data-collapsible=icon]_&]:hidden group-data-[collapsible=icon]:hidden flex items-center flex-nowrap">
                    <Link prefetch={false} href="/" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                            <Globe />
                        </Button>
                    </Link>
                    <span className="ms-2 md:hidden">
                        <SidebarTrigger />
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMain nav={data} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
