'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Reusable Pagination Component
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-indexed)
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.itemsPerPage - Items shown per page (default: 10)
 * @param {function} props.onPageChange - Callback when page changes
 * @param {boolean} props.loading - Loading state to disable buttons
 * @param {string} props.itemLabel - Label for items (e.g., "users", "roles", "products")
 */
export function AdminPagination({
    currentPage = 1,
    totalItems = 0,
    itemsPerPage = 10,
    onPageChange,
    loading = false,
    itemLabel = 'items'
}) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Don't render if no items
    if (totalItems === 0) {
        return null;
    }

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="w-full flex flex-col items-start px-2">
            <div className="w-full flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">
                    {totalItems} {itemLabel} total
                </span>
                <div className="flex w-[100px] items-center justify-center text-muted-foreground text-sm font-semibold">
                    Page {currentPage} of {totalPages}
                </div>
            </div>

            <div className="flex flex-wrap ms-auto items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevious}
                        disabled={currentPage === 1 || loading}>
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        disabled={currentPage >= totalPages || loading}>
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default AdminPagination;
