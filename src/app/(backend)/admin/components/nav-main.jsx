'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar
} from '@/components/ui/sidebar';
import { useAdminSettings, useLayout } from '../context/LayoutProvider';
import { NavBadge } from './nav-badge';

export function NavMain({ nav }) {
    const { isMobile, setOpenMobile, state } = useSidebar();
    const pathname = usePathname();
    const [openPopover, setOpenPopover] = useState(null);
    const { siteSettings } = useAdminSettings();
    const { user } = useLayout();

    // Get enabled menu items from settings
    const enabledMenuItems = siteSettings?.enabledMenuItems || {
        store: true,
        media: true,
        workspace: true,
        marketing: true,
        club: true,
        tickets: true
    };

    const handleLinkClick = (_e) => {
        if (isMobile) {
            setOpenMobile(false);
        }
        // Close any open popover when clicking a link
        setOpenPopover(null);
    };

    // Helper function to get badge section for menu items
    const getBadgeSection = (item) => {
        const itemKey = item?.key || item?.title?.toLowerCase();

        switch (itemKey) {
            case 'store':
                return 'store';
            case 'orders':
                return 'orders';
            case 'catalog':
                return 'storeCatalog';
            case 'reviews':
                return 'storeReviews';
            case 'supportTickets':
                return 'supportTickets';
            case 'settings':
            case 'storeSettings':
            case 'maintenance':
                return 'system';
            case 'marketing':
                return 'marketing';
            default:
                return null;
        }
    };

    // Helper function to check if menu item should be displayed
    const isMenuItemEnabled = (item) => {
        const itemKey = item?.key || item?.title?.toLowerCase();

        // Map menu keys to settings keys
        const menuKeyMap = {
            store: 'store',
            media: 'media',
            workspace: 'workspace',
            marketing: 'marketing',
            club: 'club',
            supportTickets: 'tickets'
        };

        const settingKey = menuKeyMap[itemKey];

        // If no mapping exists, show the item (for Access, etc.)
        if (!settingKey) return true;

        // Check if item is enabled in settings
        return enabledMenuItems[settingKey] !== false;
    };

    return (
        <>
            <SidebarGroup>
                <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
                <SidebarMenu>
                    {nav.Home.map((item, key) => (
                        <SidebarMenuItem key={key}>
                            <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url} asChild>
                                <Link prefetch={false} href={item.url} onClick={handleLinkClick}>
                                    <item.icon className="mr-2 size-4" />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarMenu>
                    {nav.Main.filter((item) => isMenuItemEnabled(item)).map((item, key) => {
                        const badgeSection = getBadgeSection(item);

                        // For items without subitems, render a simple button
                        if (!item.items) {
                            return (
                                <SidebarMenuItem key={key}>
                                    <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url} asChild>
                                        <Link prefetch={false} href={item.url} onClick={handleLinkClick}>
                                            {item.icon && <item.icon className="mr-2 size-4" />}
                                            <span>{item.title}</span>
                                            {badgeSection && <NavBadge section={badgeSection} />}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        }

                        // For items with subitems (like Store), render a collapsible or popover based on sidebar state
                        const isCollapsed = state === 'collapsed';

                        if (isCollapsed) {
                            // In collapsed state, use popover for sub-items
                            return (
                                <SidebarMenuItem key={key}>
                                    <Popover
                                        open={openPopover === key}
                                        onOpenChange={(open) => setOpenPopover(open ? key : null)}>
                                        <PopoverTrigger asChild>
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                isActive={item.items?.some((subItem) => pathname === subItem.url)}>
                                                {item.icon && <item.icon className="mr-2 size-4" />}
                                                <span>{item.title}</span>
                                                {badgeSection && <NavBadge variant="alt" section={badgeSection} />}
                                            </SidebarMenuButton>
                                        </PopoverTrigger>
                                        <PopoverContent side="right" align="start" sideOffset={8} className="w-56 p-2">
                                            <div className="space-y-1">
                                                {item.items?.map((subItem) => {
                                                    const subBadgeSection = getBadgeSection(subItem);
                                                    return (
                                                        <Link
                                                            key={subItem.title}
                                                            prefetch={false}
                                                            href={subItem.url}
                                                            onClick={handleLinkClick}
                                                            className={`flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                                                                pathname === subItem.url
                                                                    ? 'bg-accent font-medium text-accent-foreground'
                                                                    : 'text-muted-foreground'
                                                            }`}>
                                                            <span>{subItem.title}</span>
                                                            {subBadgeSection && <NavBadge section={subBadgeSection} />}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </SidebarMenuItem>
                            );
                        }

                        // For expanded state, render normal collapsible
                        return (
                            <Collapsible key={key} asChild defaultOpen={item.isActive} className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={item.items?.some((subItem) => pathname === subItem.url)}>
                                            {item.icon && <item.icon className="mr-2 size-4" />}
                                            <span>{item.title}</span>
                                            {badgeSection && <NavBadge variant="alt" section={badgeSection} />}
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.items?.map((subItem) => {
                                                const subBadgeSection = getBadgeSection(subItem);

                                                return (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={pathname === subItem.url}>
                                                            <Link
                                                                prefetch={false}
                                                                href={subItem.url}
                                                                onClick={handleLinkClick}>
                                                                <span>{subItem.title}</span>
                                                                {subBadgeSection && (
                                                                    <NavBadge section={subBadgeSection} />
                                                                )}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                );
                                            })}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroup>

            {user?.isDeveloper && (
                <SidebarGroup>
                    <SidebarGroupLabel>Developer</SidebarGroupLabel>
                    <SidebarMenu>
                        {nav.Developer.map((item, key) => {
                            // For items without subitems, render a simple button
                            if (!item.items) {
                                return (
                                    <SidebarMenuItem key={key}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={pathname === item.url}
                                            asChild>
                                            <Link prefetch={false} href={item.url} onClick={handleLinkClick}>
                                                {item.icon && <item.icon className="mr-2 size-4" />}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            }

                            // For items with subitems, render a collapsible or popover based on sidebar state
                            const isCollapsed = state === 'collapsed';

                            if (isCollapsed) {
                                // In collapsed state, use popover for sub-items
                                return (
                                    <SidebarMenuItem key={key}>
                                        <Popover
                                            open={openPopover === `developer-${key}`}
                                            onOpenChange={(open) => setOpenPopover(open ? `developer-${key}` : null)}>
                                            <PopoverTrigger asChild>
                                                <SidebarMenuButton
                                                    tooltip={item.title}
                                                    isActive={item.items?.some((subItem) => pathname === subItem.url)}>
                                                    {item.icon && <item.icon className="mr-2 size-4" />}
                                                    <span>{item.title}</span>
                                                </SidebarMenuButton>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                side="right"
                                                align="start"
                                                sideOffset={8}
                                                className="w-56 p-2">
                                                <div className="space-y-1">
                                                    {item.items?.map((subItem) => (
                                                        <Link
                                                            key={subItem.title}
                                                            prefetch={false}
                                                            href={subItem.url}
                                                            onClick={handleLinkClick}
                                                            className={`flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                                                                pathname === subItem.url
                                                                    ? 'bg-accent font-medium text-accent-foreground'
                                                                    : 'text-muted-foreground'
                                                            }`}>
                                                            <span>{subItem.title}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </SidebarMenuItem>
                                );
                            }

                            // For expanded state, render normal collapsible
                            return (
                                <Collapsible
                                    key={key}
                                    asChild
                                    defaultOpen={item.isActive}
                                    className="group/collapsible">
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                isActive={item.items?.some((subItem) => pathname === subItem.url)}>
                                                {item.icon && <item.icon className="mr-2 size-4" />}
                                                <span>{item.title}</span>
                                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {item.items?.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={pathname === subItem.url}>
                                                            <Link
                                                                prefetch={false}
                                                                href={subItem.url}
                                                                onClick={handleLinkClick}>
                                                                <span>{subItem.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </Collapsible>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            )}

            <SidebarGroup>
                <SidebarGroupLabel>System</SidebarGroupLabel>
                <SidebarMenu>
                    {nav.System.map((item, key) => {
                        const badgeSection = getBadgeSection(item);

                        return (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url} asChild>
                                    <Link prefetch={false} href={item.url} onClick={handleLinkClick}>
                                        <item.icon className="mr-2 size-4" />
                                        <span>{item.title}</span>
                                        {badgeSection && <NavBadge section={badgeSection} />}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroup>
        </>
    );
}
