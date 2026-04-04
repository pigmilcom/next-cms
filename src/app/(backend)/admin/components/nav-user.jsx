// @/app/(backend)/admin/components/nav-user.jsx

'use client';

import { ArrowUpDown, BadgeCheck, Bell, ChevronsUpDown, Coins, Copy, Globe, LogOut, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useWeb3, useWeb3Settings } from '@/hooks/useWeb3';

export function NavUser({ user }) {
    const { isMobile } = useSidebar();
    const { isWeb3Enabled } = useWeb3Settings();
    const {
        userWallet,
        formattedBalance,
        formattedAddress,
        copyAddress,
        isLoading: web3Loading,
        web3Config
    } = useWeb3();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="border data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user?.avatar || '/images/avatar.webp'} alt={user?.displayName} />
                                <AvatarFallback className="rounded-lg">{user?.displayName.charAt(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user?.displayName}</span>
                                <span className="truncate text-xs">{user?.email}</span>
                                {isWeb3Enabled && !web3Loading && userWallet && (
                                    <div className="mt-1 flex items-center gap-2">
                                        <Wallet className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-muted-foreground text-xs">
                                            {formattedBalance || '0.0000'} {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                                        </span>
                                    </div>
                                )}
                                {isWeb3Enabled && web3Loading && (
                                    <div className="mt-1 flex items-center gap-2">
                                        <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                                        <span className="text-muted-foreground text-xs">Loading wallet...</span>
                                    </div>
                                )}
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={4}>
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex cursor-default items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user?.avatar || '/images/avatar.webp'} alt={user?.displayName} />
                                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user?.displayName}</span>
                                    <span className="truncate text-xs">{user?.email}</span>
                                    {isWeb3Enabled && !web3Loading && userWallet && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <Wallet className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-muted-foreground text-xs">
                                                {formattedBalance || '0.0000'}{' '}
                                                {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                                            </span>
                                        </div>
                                    )}
                                    {isWeb3Enabled && web3Loading && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                                            <span className="text-muted-foreground text-xs">Loading...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <Link
                                    prefetch={false}
                                    href="/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full flex-nowrap items-center gap-2">
                                    <Globe />
                                    Visit website
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        {isWeb3Enabled && !web3Loading && userWallet && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                        <div className="w-full">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Wallet className="h-4 w-4" />
                                                    <span className="font-medium">Wallet</span>
                                                </div>
                                                <button
                                                    onClick={copyAddress}
                                                    className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs transition-colors hover:bg-muted/80">
                                                    <Copy className="h-3 w-3" />
                                                    Copy
                                                </button>
                                            </div>
                                            <div className="mb-1 text-muted-foreground text-xs">
                                                Address: {formattedAddress}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">
                                                    {formattedBalance || '0.0000'}{' '}
                                                    {web3Config?.WEB3_CONTRACT_SYMBOL || 'ETH'}
                                                </span>
                                                <Coins className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </DropdownMenuItem>

                                    <Link prefetch={false} href="/admin/transactions">
                                        <DropdownMenuItem>
                                            <ArrowUpDown />
                                            Transactions
                                        </DropdownMenuItem>
                                    </Link>
                                </DropdownMenuGroup>
                            </>
                        )}
                        <DropdownMenuGroup>
                            <Link prefetch={false} href="/admin/account">
                                <DropdownMenuItem>
                                    <BadgeCheck />
                                    Account
                                </DropdownMenuItem>
                            </Link>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <Link prefetch={false} href={'/auth/logout'}>
                            <DropdownMenuItem>
                                <LogOut />
                                Log out
                            </DropdownMenuItem>
                        </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
