// @/app/(backend)/admin/store/reviews/page.jsx

'use client';

import { Check, Download, Eye, Plus, RefreshCw, SlidersHorizontal, Star, Trash2, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { approveReview, createReview, deleteReview, rejectReview } from '@/lib/server/admin';
import { getCatalog, getReviews } from '@/lib/server/store';

const initialFormData = {
    productId: '',
    customerName: '',
    customerEmail: '',
    rating: 5,
    comment: '',
    status: 'approved',
    isAnonymous: false,
    isVerified: false
};

export default function ReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editReview, setEditReview] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingReview, setViewingReview] = useState(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Filter states following orders page pattern
    const [statusFilter, setStatusFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return statusFilter !== 'all' || ratingFilter !== 'all' || productFilter !== 'all';
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            setLoading(true);

            const [reviewsRes, productsRes] = await Promise.all([
                getReviews({ duration: '0' }), // Force fresh data by bypassing cache
                getCatalog({ limit: 0, duration: '0' }) // Force fresh data by bypassing cache
            ]);

            if (reviewsRes?.success) {
                setReviews(reviewsRes.data || []);
            } else {
                setReviews([]);
                toast.error('Failed to fetch reviews');
            }

            if (productsRes?.success) {
                setProducts(productsRes.data || []);
            }

            toast.success('Reviews data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing reviews data:', error);
            toast.error('Failed to refresh reviews data');
        } finally {
            setIsRefreshingData(false);
            setLoading(false);
        }
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'reviewId', label: 'Review ID', defaultChecked: true },
        {
            key: 'customerInfo',
            label: 'Customer Information',
            headers: ['Customer Name', 'Customer Email'],
            fields: ['customerName', 'customerEmail'],
            defaultChecked: true
        },
        {
            key: 'productInfo',
            label: 'Product Information',
            headers: ['Product Name', 'Product ID'],
            fields: ['productName', 'productId'],
            defaultChecked: true
        },
        {
            key: 'reviewData',
            label: 'Review Data',
            headers: ['Rating', 'Comment'],
            fields: ['rating', 'comment'],
            defaultChecked: true
        },
        {
            key: 'status',
            label: 'Status Information',
            headers: ['Status', 'Is Anonymous', 'Is Verified'],
            fields: ['status', 'isAnonymous', 'isVerified'],
            defaultChecked: true
        },
        {
            key: 'timestamps',
            label: 'Timestamps',
            headers: ['Created At', 'Updated At'],
            fields: ['createdAt', 'updatedAt'],
            defaultChecked: true
        }
    ];

    const formatReviewsRowData = (review, selectedOptions, fieldMapping) => {
        const rowData = {
            reviewId: review.id || '',
            customerName: review.customerName || 'Anonymous',
            customerEmail: review.customerEmail || '',
            productName: review.productName || 'Unknown Product',
            productId: review.productId || '',
            rating: `${review.rating}/5 stars`,
            comment: review.comment || '',
            status: review.status ? review.status.charAt(0).toUpperCase() + review.status.slice(1) : '',
            isAnonymous: review.isAnonymous ? 'Yes' : 'No',
            isVerified: review.isVerified ? 'Yes' : 'No',
            createdAt: review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '',
            updatedAt: review.updatedAt ? new Date(review.updatedAt).toLocaleDateString() : ''
        };

        return fieldMapping.map((field) => {
            const value = rowData[field];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
        });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [reviewsRes, productsRes] = await Promise.all([
                getReviews({ approvedOnly: false, limit: 1000 }),
                getCatalog({ limit: 0 })
            ]);

            if (reviewsRes?.success) {
                setReviews(reviewsRes.data || []);
            }
            if (productsRes?.success) {
                setProducts(productsRes.data || []);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Prepare payload with proper anonymous handling
            const payload = {
                ...formData,
                rating: Number(formData.rating),
                customerName: formData.isAnonymous ? 'Anonymous' : formData.customerName || 'Anonymous',
                customerEmail: formData.isAnonymous ? '' : formData.customerEmail,
                isAnonymous: formData.isAnonymous
            };

            let result;
            if (editReview) {
                // For edit, we would need an update function
                toast.error('Edit functionality not implemented');
                return;
            } else {
                result = await createReview(payload);
            }

            if (result?.success) {
                await fetchData();
                setIsOpen(false);
                setEditReview(null);
                setFormData(initialFormData);
                toast.success('Review created successfully!');
            } else {
                toast.error(result?.error || 'Failed to save review');
            }
        } catch (error) {
            console.error('Error saving review:', error);
            toast.error('Failed to save review');
        }
    };

    const handleApproveReview = async (reviewId) => {
        try {
            const result = await approveReview(reviewId);
            if (result?.success) {
                await fetchData();
                toast.success('Review approved successfully!');
            } else {
                toast.error(result?.error || 'Failed to approve review');
            }
        } catch (error) {
            console.error('Error approving review:', error);
            toast.error('Failed to approve review');
        }
    };

    const handleRejectReview = async (reviewId) => {
        try {
            const result = await rejectReview(reviewId);
            if (result?.success) {
                await fetchData();
                toast.success('Review rejected successfully!');
            } else {
                toast.error(result?.error || 'Failed to reject review');
            }
        } catch (error) {
            console.error('Error rejecting review:', error);
            toast.error('Failed to reject review');
        }
    };

    const handleViewReview = (review) => {
        setViewingReview(review);
        setIsViewDialogOpen(true);
    };

    const handleDeleteClick = (review) => {
        setReviewToDelete(review);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!reviewToDelete) return;

        try {
            setIsDeleting(true);
            const result = await deleteReview(reviewToDelete.key || reviewToDelete.id);

            if (result?.success) {
                await fetchData();
                toast.success('Review deleted successfully!');
            } else {
                toast.error(result?.error || 'Failed to delete review');
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            toast.error('Failed to delete review');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setReviewToDelete(null);
        }
    };

    const handleDialogChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditReview(null);
            setFormData(initialFormData);
        }
    };

    const handleAddNew = () => {
        setEditReview(null);
        setFormData(initialFormData);
        setIsOpen(true);
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    className={`h-4 w-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
            );
        }
        return <div className="flex">{stars}</div>;
    };

    // Filter function for AdminTable
    const filterReviews = (reviews, search, sortConfig) => {
        let filtered = [...reviews];

        // Apply search filter
        if (search) {
            filtered = filtered.filter(
                (review) =>
                    (review.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
                    (review.customerEmail || '').toLowerCase().includes(search.toLowerCase()) ||
                    (review.productName || '').toLowerCase().includes(search.toLowerCase()) ||
                    (review.comment || '').toLowerCase().includes(search.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((review) => review.status === statusFilter);
        }

        // Apply rating filter
        if (ratingFilter !== 'all') {
            filtered = filtered.filter((review) => {
                if (ratingFilter === '5') return review.rating === 5;
                if (ratingFilter === '4-5') return review.rating >= 4;
                if (ratingFilter === '3-5') return review.rating >= 3;
                if (ratingFilter === '1-2') return review.rating <= 2;
                return true;
            });
        }

        // Apply product filter
        if (productFilter !== 'all') {
            filtered = filtered.filter((review) => review.productId === productFilter);
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    };

    // Define table columns
    const columns = [
        {
            key: 'customer',
            label: 'Customer',
            sortable: true,
            render: (review) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                        <div className="font-medium">{review.customerName || 'Anonymous'}</div>
                        <div className="text-muted-foreground text-sm">{review.customerEmail || 'No email'}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'productName',
            label: 'Product',
            sortable: true,
            render: (review) => <div className="text-sm">{review.productName || 'Unknown Product'}</div>
        },
        {
            key: 'rating',
            label: 'Rating',
            sortable: true,
            render: (review) => (
                <div className="flex items-center gap-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-muted-foreground">{review.rating}/5</span>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (review) => (
                <Badge
                    variant={
                        review.status === 'approved'
                            ? 'default'
                            : review.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                    }>
                    {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                </Badge>
            )
        },
        {
            key: 'createdAt',
            label: 'Date',
            sortable: true,
            render: (review) => <div className="text-sm">{new Date(review.createdAt).toLocaleDateString()}</div>
        }
    ];

    // Define row actions
    const getRowActions = (review) => {
        const actions = [
            {
                label: 'View Review',
                icon: <Eye className="mr-2 h-4 w-4" />,
                onClick: () => handleViewReview(review)
            }
        ];

        if (review.status === 'pending') {
            actions.push(
                {
                    label: 'Approve',
                    icon: <Check className="mr-2 h-4 w-4" />,
                    onClick: () => handleApproveReview(review.key || review.id),
                    className: 'text-green-600'
                },
                {
                    label: 'Reject',
                    icon: <X className="mr-2 h-4 w-4" />,
                    onClick: () => handleRejectReview(review.key || review.id),
                    className: 'text-red-600'
                }
            );
        }

        actions.push({
            label: 'Delete Review',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(review),
            className: 'text-destructive'
        });

        return actions;
    };

    return (
        <div className="space-y-4">
            <AdminHeader title="Reviews" description="Manage customer product reviews and ratings" />

            <AdminTable
                data={reviews}
                columns={columns}
                filterData={filterReviews}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage="No reviews found"
                searchPlaceholder="Search reviews..."
                customFilters={
                    <div className="space-y-3"> 

                        {/* Collapsible Filters */}
                        {isFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Rating Filter */}
                                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Ratings</SelectItem>
                                        <SelectItem value="5">5 Stars</SelectItem>
                                        <SelectItem value="4-5">4+ Stars</SelectItem>
                                        <SelectItem value="3-5">3+ Stars</SelectItem>
                                        <SelectItem value="1-2">1-2 Stars</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Product Filter */}
                                <Select value={productFilter} onValueChange={setProductFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Products</SelectItem>
                                        {products.map((product) => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
 
                                {/* Action Buttons Row */}
                                <div className="flex gap-2">
                                    {/* Reset Filters Button - Only show when filters applied */}
                                    {hasFiltersApplied() && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setStatusFilter('all');
                                                setRatingFilter('all');
                                                setProductFilter('all');
                                            }}
                                            title="Reset all filters">
                                            <X className="h-4 w-4" color="red" />
                                            <span className="text-red-500">Reset</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                }
                headerActions={
                    <>
                        <Button
                            variant={isFiltersExpanded ? 'default' : 'outline'}
                            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                            className="gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden xl:block">
                                {isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}
                            </span>
                            {hasFiltersApplied() && (
                                <Badge
                                    variant={isFiltersExpanded ? 'default' : 'outline'}
                                    className="ml-1 px-1.5 py-0.5 text-xs">
                                    {
                                        [
                                            statusFilter !== 'all' && 'Status',
                                            ratingFilter !== 'all' && 'Rating',
                                            productFilter !== 'all' && 'Product'
                                        ].filter(Boolean).length
                                    }
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh reviews data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4" />
                            <span>Add Review</span>
                        </Button>
                    </>
                }
            />

            {/* View Review Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Details</DialogTitle>
                        <DialogDescription>Full review information and content</DialogDescription>
                    </DialogHeader>
                    {viewingReview && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="font-medium">Customer</Label>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm">{viewingReview.customerName || 'Anonymous'}</p>
                                        {viewingReview.isAnonymous && (
                                            <Badge variant="secondary" className="text-xs">
                                                Anonymous
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label className="font-medium">Email</Label>
                                    <p className="text-sm">{viewingReview.customerEmail || 'N/A'}</p>
                                </div>
                                <div>
                                    <Label className="font-medium">Product</Label>
                                    <p className="text-sm">{viewingReview.productName || 'Unknown Product'}</p>
                                </div>
                                <div>
                                    <Label className="font-medium">Rating</Label>
                                    <div className="flex items-center gap-2">
                                        {renderStars(viewingReview.rating)}
                                        <span className="text-sm">{viewingReview.rating}/5</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label className="font-medium">Review Comment</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm whitespace-pre-wrap">
                                        {viewingReview.comment || 'No comment provided'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div>
                                    <Label className="font-medium">Status</Label>
                                    <p className="text-sm">
                                        <Badge
                                            variant={
                                                viewingReview.status === 'approved'
                                                    ? 'default'
                                                    : viewingReview.status === 'rejected'
                                                      ? 'destructive'
                                                      : 'secondary'
                                            }>
                                            {viewingReview.status.charAt(0).toUpperCase() +
                                                viewingReview.status.slice(1)}
                                        </Badge>
                                    </p>
                                </div>
                                <div>
                                    <Label className="font-medium">Date</Label>
                                    <p className="text-sm">{new Date(viewingReview.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Review Form Dialog */}
            <Dialog open={isOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Review</DialogTitle>
                        <DialogDescription>Add a new customer review for a product.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="productId">Product</Label>
                                <Select
                                    value={formData.productId}
                                    onValueChange={(value) => setFormData({ ...formData, productId: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((product) => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rating">Rating</Label>
                                <Select
                                    value={formData.rating.toString()}
                                    onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5 Stars</SelectItem>
                                        <SelectItem value="4">4 Stars</SelectItem>
                                        <SelectItem value="3">3 Stars</SelectItem>
                                        <SelectItem value="2">2 Stars</SelectItem>
                                        <SelectItem value="1">1 Star</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <div className="flex items-center space-x-2 mb-3">
                                    <input
                                        id="isAnonymous"
                                        type="checkbox"
                                        checked={formData.isAnonymous}
                                        onChange={(e) => {
                                            const isAnon = e.target.checked;
                                            setFormData({
                                                ...formData,
                                                isAnonymous: isAnon,
                                                customerName: isAnon ? '' : formData.customerName,
                                                customerEmail: isAnon ? '' : formData.customerEmail
                                            });
                                        }}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="isAnonymous">Anonymous Review</Label>
                                </div>
                            </div>

                            {!formData.isAnonymous && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="customerName">Customer Name</Label>
                                        <Input
                                            id="customerName"
                                            type="text"
                                            placeholder="John Doe"
                                            value={formData.customerName}
                                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                            required={!formData.isAnonymous}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="customerEmail">Customer Email</Label>
                                        <Input
                                            id="customerEmail"
                                            type="email"
                                            placeholder="john@example.com"
                                            value={formData.customerEmail}
                                            onChange={(e) =>
                                                setFormData({ ...formData, customerEmail: e.target.value })
                                            }
                                        />
                                    </div>
                                </>
                            )}

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="comment">Review Comment</Label>
                                <Textarea
                                    id="comment"
                                    placeholder="Write the review comment..."
                                    value={formData.comment}
                                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                    className="min-h-20"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                id="isVerified"
                                type="checkbox"
                                checked={formData.isVerified !== false}
                                onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="isVerified">Verified Purchase</Label>
                        </div>

                        <Button type="submit" className="w-full">
                            Create Review
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Review"
                description={`Are you sure you want to delete this review from "${reviewToDelete?.customerName || 'Anonymous'}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
                confirmText="Delete Review"
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Reviews to CSV"
                description="Select the review data fields you want to include in your CSV export"
                data={reviews}
                exportFields={csvExportFields}
                filename="reviews"
                formatRowData={formatReviewsRowData}
            />
        </div>
    );
}
