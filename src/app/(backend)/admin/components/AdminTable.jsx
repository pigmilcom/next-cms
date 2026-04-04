// @/app/(backend)/admin/components/AdminTable.jsx

'use client';

import { ArrowUpDown, Database, Loader2, MoreVertical, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * Reusable Admin Table Component
 *
 * @param {Object} props
 * @param {Array} props.data - Array of data items to display
 * @param {Array} props.columns - Column configuration array
 * @param {Function} props.onSort - Optional external sort handler
 * @param {Function} props.onSearch - Optional external search handler
 * @param {Function} props.onPageChange - Optional external page change handler
 * @param {Object} props.pagination - Pagination config { currentPage, totalPages, itemsPerPage }
 * @param {Boolean} props.loading - Loading state
 * @param {String} props.searchPlaceholder - Search input placeholder
 * @param {Boolean} props.enableSearch - Enable/disable search
 * @param {Boolean} props.enableSort - Enable/disable sorting
 * @param {Boolean} props.enablePagination - Enable/disable pagination
 * @param {Function} props.getRowActions - Function to get actions for each row
 * @param {Function} props.filterData - Custom filter function for client-side filtering
 * @param {Object} props.customFilters - Additional filter components to render
 * @param {String} props.emptyMessage - Message to show when no data
 * @param {Object} props.actionButtonProps - Props for action button (loading, disabled states)
 * @param {ReactNode} props.headerActions - Action buttons to display in the header (e.g., "New Item", "Export")
 *
 * Column Configuration:
 * {
 *   key: string,              // Unique key for the column
 *   label: string,            // Column header label
 *   sortable: boolean,        // Enable sorting for this column
 *   render: function,         // Custom render function (item, index) => ReactNode
 *   className: string,        // Custom className for cells
 *   headerClassName: string   // Custom className for header
 * }
 *
 * Row Actions Configuration (returned by getRowActions):
 * [
 *   {
 *     label: string,
 *     icon: ReactNode,
 *     onClick: function,
 *     disabled: boolean,
 *     className: string,
 *     show: boolean          // Optional: conditionally show action
 *   }
 * ]
 */
export default function AdminTable({
    data = [],
    columns = [],
    onSort,
    onSearch,
    onPageChange,
    pagination = null,
    loading = false,
    searchValue = '',
    searchPlaceholder = 'Search...',
    enableSearch = true,
    enableSort = true,
    enablePagination = true,
    getRowActions = null,
    filterData = null,
    customFilters = null,
    emptyMessage = 'No data found',
    actionButtonProps = {},
    headerActions = null
}) {
    const ITEMS_PER_PAGE = 10;
    const SKELETON_ROWS = 5; // Number of skeleton rows to display

    // Handle both data formats: direct array or response object with data property
    const isResponseObject = data && typeof data === 'object' && !Array.isArray(data) && 'data' in data;
    const actualData = isResponseObject ? data.data || [] : Array.isArray(data) ? data : [];
    const externalPagination = isResponseObject ? data.pagination : pagination;

    const [search, setSearch] = useState(searchValue);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filteredData, setFilteredData] = useState(actualData);
    const [currentPage, setCurrentPage] = useState(externalPagination?.currentPage || 1);

    // Filter and sort data
    const getFilteredAndSortedData = useCallback(() => {
        let result = [...actualData];

        // Apply custom filter function if provided
        if (filterData) {
            result = filterData(result, search, sortConfig);
            return result;
        }

        // Default search implementation
        if (search && enableSearch) {
            const searchLower = search.toLowerCase();
            result = result.filter((item) => {
                return columns.some((column) => {
                    const value = item[column.key];
                    return value && String(value).toLowerCase().includes(searchLower);
                });
            });
        }

        // Default sorting implementation
        if (sortConfig.key && enableSort) {
            result.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle dates
                if (aValue instanceof Date || !isNaN(Date.parse(aValue))) {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                } else {
                    // Convert to lowercase for string comparison
                    aValue = String(aValue).toLowerCase();
                    bValue = String(bValue).toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [actualData, search, sortConfig, columns, enableSearch, enableSort, filterData]);

    // Update filtered data when dependencies change
    useEffect(() => {
        setFilteredData(getFilteredAndSortedData());
    }, [getFilteredAndSortedData]);

    // Handle sort
    const handleSort = (key) => {
        if (!enableSort) return;

        const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        const newSortConfig = { key, direction: newDirection };
        setSortConfig(newSortConfig);

        // Call external sort handler if provided
        if (onSort) {
            onSort(newSortConfig);
        }
    };

    // Handle search
    const handleSearch = (value) => {
        setSearch(value);

        // Reset to page 1 on search
        setCurrentPage(1);

        // Call external search handler if provided
        if (onSearch) {
            onSearch(value);
        }
    };

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);

        // Call external page change handler if provided
        if (onPageChange) {
            onPageChange(page);
        }
    };

    // Calculate pagination for client-side data
    const totalItems = externalPagination?.totalItems || filteredData.length;
    const totalPages = externalPagination?.totalPages || Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Paginate client-side data
    const getPaginatedData = () => {
        if (externalPagination) {
            // External pagination - use provided data
            return actualData;
        }

        // Client-side pagination - slice filtered data
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredData.slice(startIndex, endIndex);
    };

    const displayData = getPaginatedData();
    const showPagination = enablePagination && totalItems > 10;

    // Smart pagination for mobile - show fewer page numbers
    const getPaginationRange = () => {
        const maxVisible = 5;
        const range = [];

        if (totalPages <= maxVisible) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        // Always show first page
        range.push(1);

        // Calculate range around current page
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        // Add ellipsis or pages
        if (start > 2) {
            range.push('...');
        }

        for (let i = start; i <= end; i++) {
            range.push(i);
        }

        if (end < totalPages - 1) {
            range.push('...');
        }

        // Always show last page
        if (totalPages > 1) {
            range.push(totalPages);
        }

        return range;
    };

    return (
        <div className="w-full space-y-4">
            {/* Search, Filters and Header Actions */}
            {(enableSearch || customFilters || headerActions) && (
                <div className="flex flex-col gap-3 lg:gap-4">
                    {/* Top Row: Search and Header Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Search Input */}
                        {enableSearch && (
                            <div className="relative w-full sm:max-w-sm lg:max-w-md">
                                <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={search}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full pl-8"
                                />
                            </div>
                        )}

                        {/* Header Actions - Right Side */}
                        {headerActions && <div className="flex shrink-0 flex-wrap gap-2">{headerActions}</div>}
                    </div>

                    {/* Custom Filters - Full Width Row */}
                    {customFilters && <div className="flex flex-wrap items-center gap-2">{customFilters}</div>}
                </div>
            )}

            {/* Table Container with Fixed Actions Column */}
            <div className="relative w-full">
                <div className="flex rounded-md border-0 sm:border border-border bg-background">
                    {/* Scrollable Table Content */}
                    <div className="flex-1 overflow-x-auto">
                        {loading ? (
                            <TableSkeleton />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {columns.map((column) => (
                                            <TableHead
                                                key={column.key}
                                                className={`sm:h-[55px] ${column.sortable && enableSort ? 'cursor-pointer select-none hover:bg-accent/50 transition-colors' : ''} ${column.headerClassName || ''} ${column.className || ''} whitespace-nowrap`}
                                                onClick={() => column.sortable && handleSort(column.key)}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{column.label}</span>
                                                    {column.sortable && enableSort && (
                                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                    )}
                                                </div>
                                            </TableHead>
                                        ))}
                                        {getRowActions && displayData.length > 0 && (
                                            <TableHead className="text-right whitespace-nowrap sm:hidden">
                                                <span className="font-semibold">Actions</span>
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayData.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length + (getRowActions ? 1 : 0)}
                                                className="h-auto text-center">
                                                <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-8">
                                                    <div className="rounded-full bg-muted/50 p-3">
                                                        <Database className="h-8 w-8 text-muted-foreground/50" />
                                                    </div>
                                                    <div className="space-y-1 text-center mx-auto">
                                                        <p className="text-sm font-medium">{emptyMessage}</p>
                                                        {search && (
                                                            <p className="text-xs text-muted-foreground/75">
                                                                Try adjusting your search or filters
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        displayData.map((item, index) => (
                                            <TableRow
                                                key={item.id || item.email || index}
                                                className="hover:bg-accent/50 transition-colors sm:h-[55px] sm:max-h-[55px]">
                                                {columns.map((column) => (
                                                    <TableCell
                                                        key={column.key}
                                                        data-label={column.label}
                                                        className={`max-h-15 sm:h-15 ${column.className || ''}`}>
                                                        {column.render ? column.render(item, index) : item[column.key]}
                                                    </TableCell>
                                                ))}
                                                {getRowActions && displayData.length > 0 && (
                                                    <TableCell className="text-right sm:hidden">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    disabled={
                                                                        actionButtonProps.disabled?.(item) ||
                                                                        actionButtonProps.isLoading
                                                                    }>
                                                                    {actionButtonProps.isLoading &&
                                                                    actionButtonProps.loadingItem?.id === item.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    )}
                                                                    <span className="sr-only">Open menu</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                {getRowActions(item).map((action, actionIndex) => {
                                                                    // Check if action should be shown
                                                                    if (action.show === false) return null;

                                                                    return (
                                                                        <DropdownMenuItem
                                                                            key={actionIndex}
                                                                            onClick={() => action.onClick(item)}
                                                                            disabled={action.disabled}
                                                                            className={action.className || ''}>
                                                                            {action.icon}
                                                                            {action.label}
                                                                        </DropdownMenuItem>
                                                                    );
                                                                })}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Fixed Actions Column - Desktop Only */}
                    {getRowActions && displayData.length > 0 && (
                        <div className="hidden sm:flex shrink-0 w-20 border-l border-border bg-background flex-col">
                            {/* Actions Header */}
                            <div className="flex items-center justify-center border-b border-border bg-background sm:h-auto sm:min-h-[55px]">
                                <span className="font-semibold text-sm">Actions</span>
                            </div>

                            {/* Actions Rows */}
                            <div className="">
                                {loading ? (
                                    // Loading state for actions - matches skeleton table rows count
                                    Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-center border-b border-border sm:h-auto py-3.5 sm:min-h-[55px]">
                                            <div className="h-4 w-4 animate-pulse bg-muted rounded"></div>
                                        </div>
                                    ))
                                ) : displayData.length === 0 ? (
                                    // Empty state for actions - matches empty table row
                                    <div className="flex items-center justify-center py-30">
                                        <div className="h-4 w-4 text-muted-foreground/30">
                                            <MoreVertical className="h-4 w-4" />
                                        </div>
                                    </div>
                                ) : (
                                    // Action buttons for each row - height matches table row automatically
                                    displayData.map((item, index) => (
                                        <div
                                            key={item.id || item.email || index}
                                            className="flex items-center justify-center border-b border-border bg-muted/10 hover:bg-accent/50 transition-colors sm:h-auto py-3.5 sm:min-h-[55px]">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        disabled={
                                                            actionButtonProps.disabled?.(item) ||
                                                            actionButtonProps.isLoading
                                                        }>
                                                        {actionButtonProps.isLoading &&
                                                        actionButtonProps.loadingItem?.id === item.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <MoreVertical className="h-4 w-4" />
                                                        )}
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    {getRowActions(item).map((action, actionIndex) => {
                                                        // Check if action should be shown
                                                        if (action.show === false) return null;

                                                        return (
                                                            <DropdownMenuItem
                                                                key={actionIndex}
                                                                onClick={() => action.onClick(item)}
                                                                disabled={action.disabled}
                                                                className={action.className || ''}>
                                                                {action.icon}
                                                                {action.label}
                                                            </DropdownMenuItem>
                                                        );
                                                    })}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center justify-between gap-2 px-2 py-4"> 
                {/* Results Info */}
                {!loading && ( 
                        <div className="text-muted-foreground text-sm sm:order-2">
                            Showing{' '}
                            <span className="font-medium">
                                {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)}
                            </span>{' '}
                            to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span>{' '}
                            of <span className="font-medium">{totalItems}</span> results
                        </div>
                )}

                {/* Pagination - Responsive */}
                {showPagination && !loading && (   
                    <Pagination>
                        {/* Pagination Controls */}
                        <PaginationContent className="flex-wrap sm:order-1">
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (currentPage > 1) {
                                            handlePageChange(currentPage - 1);
                                        }
                                    }}
                                    className={
                                        currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                                    }
                                />
                            </PaginationItem>

                            {getPaginationRange().map((page, idx) => (
                                <PaginationItem key={idx} className="hidden sm:inline-flex">
                                    {page === '...' ? (
                                        <span className="flex h-9 w-9 items-center justify-center">...</span>
                                    ) : (
                                        <PaginationLink
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handlePageChange(page);
                                            }}
                                            isActive={currentPage === page}
                                            className="cursor-pointer">
                                            {page}
                                        </PaginationLink>
                                    )}
                                </PaginationItem>
                            ))}

                            {/* Mobile: Show current page */}
                            <PaginationItem className="sm:hidden">
                                <span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium">
                                    {currentPage} / {totalPages}
                                </span>
                            </PaginationItem>

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (currentPage < totalPages) {
                                            handlePageChange(currentPage + 1);
                                        }
                                    }}
                                    className={
                                        currentPage === totalPages
                                            ? 'pointer-events-none opacity-50'
                                            : 'cursor-pointer'
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination> 
                )} 
                </div>
            </div>
        </div>
    );
}
