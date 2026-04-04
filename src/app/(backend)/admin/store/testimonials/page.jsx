// @/app/(backend)/admin/store/testimonials/page.jsx

'use client';

import { Download, Eye, Pencil, Plus, RefreshCw, SlidersHorizontal, Star, Trash2, User, X } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createTestimonial, deleteTestimonial, updateTestimonial, uploadFiles } from '@/lib/server/admin';
import { getTestimonials } from '@/lib/server/store';

const initialFormData = {
    name: '',
    location: '',
    quote: '',
    rating: 5,
    image: '',
    isActive: true,
    isVerified: true
};

export default function TestimonialsPage() {
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editTestimonial, setEditTestimonial] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [testimonialToDelete, setTestimonialToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingTestimonial, setViewingTestimonial] = useState(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Filter states following orders page pattern
    const [statusFilter, setStatusFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return statusFilter !== 'all' || ratingFilter !== 'all';
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            setLoading(true);

            const result = await getTestimonials({ duration: '0' }); // Force fresh data by bypassing cache
            
            if (result?.success) {
                setTestimonials(result.data || []);
                toast.success('Testimonials data refreshed successfully');
            } else {
                setTestimonials([]);
                toast.error('Failed to fetch testimonials');
            }
        } catch (error) {
            console.error('Error refreshing testimonials data:', error);
            toast.error('Failed to refresh testimonials data');
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
        { key: 'testimonialId', label: 'Testimonial ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Name', 'Location', 'Quote'],
            fields: ['name', 'location', 'quote'],
            defaultChecked: true
        },
        {
            key: 'rating',
            label: 'Rating Information',
            headers: ['Rating'],
            fields: ['rating'],
            defaultChecked: true
        },
        {
            key: 'media',
            label: 'Media Information',
            headers: ['Image URL'],
            fields: ['image'],
            defaultChecked: true
        },
        {
            key: 'status',
            label: 'Status Information',
            headers: ['Active Status', 'Is Verified'],
            fields: ['isActive', 'isVerified'],
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

    const formatTestimonialsRowData = (testimonial, selectedOptions, fieldMapping) => {
        const rowData = {
            testimonialId: testimonial.id || '',
            name: testimonial.name || '',
            location: testimonial.location || '',
            quote: testimonial.quote || '',
            rating: `${testimonial.rating}/5 stars`,
            image: testimonial.image || '',
            isActive: testimonial.isActive ? 'Active' : 'Inactive',
            isVerified: testimonial.isVerified ? 'Yes' : 'No',
            createdAt: testimonial.createdAt ? new Date(testimonial.createdAt).toLocaleDateString() : '',
            updatedAt: testimonial.updatedAt ? new Date(testimonial.updatedAt).toLocaleDateString() : ''
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
            const result = await getTestimonials();
            if (result?.success) {
                setTestimonials(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching testimonials:', error);
            toast.error('Failed to load testimonials');
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
            const payload = {
                ...formData,
                rating: Number(formData.rating)
            };

            let result;
            if (editTestimonial) {
                result = await updateTestimonial(editTestimonial.id, payload);
            } else {
                result = await createTestimonial(payload);
            }

            if (result?.success) {
                await fetchData();
                setIsOpen(false);
                setEditTestimonial(null);
                setFormData(initialFormData);
                toast.success(
                    editTestimonial ? 'Testimonial updated successfully!' : 'Testimonial created successfully!'
                );
            } else {
                toast.error(result?.error || 'Failed to save testimonial');
            }
        } catch (error) {
            console.error('Error saving testimonial:', error);
            toast.error('Failed to save testimonial');
        }
    };

    const handleEdit = (testimonial) => {
        setEditTestimonial(testimonial);
        setFormData({
            name: testimonial.name || '',
            location: testimonial.location || '',
            quote: testimonial.quote || '',
            rating: testimonial.rating || 5,
            image: testimonial.image || '',
            isActive: testimonial.isActive !== false,
            isVerified: testimonial.isVerified !== false
        });
        setIsOpen(true);
    };

    const handleViewTestimonial = (testimonial) => {
        setViewingTestimonial(testimonial);
        setIsViewDialogOpen(true);
    };

    const handleImageUpload = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
            return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('Image must be smaller than 5MB');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Simulate upload progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 100);

            const result = await uploadFiles([file]);

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (result?.success && result.data?.length > 0) {
                setFormData((prev) => ({
                    ...prev,
                    image: result.data[0].url
                }));
                toast.success('Image uploaded successfully!');
            } else {
                throw new Error(result?.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const removeImage = () => {
        setFormData({ ...formData, image: '' });
    };

    const handleDeleteClick = (testimonial) => {
        setTestimonialToDelete(testimonial);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!testimonialToDelete) return;

        try {
            setIsDeleting(true);
            const result = await deleteTestimonial(testimonialToDelete.id);

            if (result?.success) {
                await fetchData();
                toast.success('Testimonial deleted successfully!');
            } else {
                toast.error(result?.error || 'Failed to delete testimonial');
            }
        } catch (error) {
            console.error('Error deleting testimonial:', error);
            toast.error('Failed to delete testimonial');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setTestimonialToDelete(null);
        }
    };

    const handleDialogChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditTestimonial(null);
            setFormData(initialFormData);
        }
    };

    const handleAddNew = () => {
        setEditTestimonial(null);
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
    const filterTestimonials = (testimonials, search, sortConfig) => {
        let filtered = [...testimonials];

        // Apply search filter
        if (search) {
            filtered = filtered.filter(
                (testimonial) =>
                    testimonial.name.toLowerCase().includes(search.toLowerCase()) ||
                    (testimonial.location || '').toLowerCase().includes(search.toLowerCase()) ||
                    (testimonial.quote || '').toLowerCase().includes(search.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((testimonial) =>
                statusFilter === 'active' ? testimonial.isActive : !testimonial.isActive
            );
        }

        // Apply rating filter
        if (ratingFilter !== 'all') {
            filtered = filtered.filter((testimonial) => {
                if (ratingFilter === '5') return testimonial.rating === 5;
                if (ratingFilter === '4-5') return testimonial.rating >= 4;
                if (ratingFilter === '3-5') return testimonial.rating >= 3;
                if (ratingFilter === '1-2') return testimonial.rating <= 2;
                return true;
            });
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
            key: 'name',
            label: 'Customer',
            sortable: true,
            render: (testimonial) => (
                <div className="flex items-center gap-3">
                    {testimonial.image ? (
                        <img
                            src={testimonial.image}
                            alt={testimonial.name}
                            className="h-10 w-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                            <User className="h-6 w-6 text-gray-400" />
                        </div>
                    )}
                    <div>
                        <div className="font-medium">{testimonial.name}</div>
                        <div className="text-muted-foreground text-sm">
                            {testimonial.location || 'Unknown location'}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'quote',
            label: 'Quote',
            sortable: false,
            render: (testimonial) => <div className="text-sm max-w-60 truncate">"{testimonial.quote}"</div>
        },
        {
            key: 'rating',
            label: 'Rating',
            sortable: true,
            render: (testimonial) => (
                <div className="flex items-center gap-2">
                    {renderStars(testimonial.rating)}
                    <span className="text-sm text-muted-foreground">{testimonial.rating}/5</span>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (testimonial) => (
                <Badge variant={testimonial.isActive ? 'default' : 'secondary'}>
                    {testimonial.isActive ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            key: 'createdAt',
            label: 'Created',
            sortable: true,
            render: (testimonial) => (
                <div className="text-sm">{new Date(testimonial.createdAt).toLocaleDateString()}</div>
            )
        }
    ];

    // Define row actions
    const getRowActions = (testimonial) => [
        {
            label: 'View Testimonial',
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: () => handleViewTestimonial(testimonial)
        },
        {
            label: 'Edit Testimonial',
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(testimonial)
        },
        {
            label: 'Delete Testimonial',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(testimonial),
            className: 'text-destructive'
        }
    ];

    return (
        <div className="space-y-4">
            <AdminHeader title="Testimonials" description="Manage customer testimonials and feedback" />

            <AdminTable
                data={testimonials}
                columns={columns}
                filterData={filterTestimonials}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage="No testimonials found"
                searchPlaceholder="Search testimonials..."
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
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
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
                                            ratingFilter !== 'all' && 'Rating'
                                        ].filter(Boolean).length
                                    }
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh testimonials data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4" />
                            <span>Add Testimonial</span>
                        </Button>
                    </>
                }
            />

            {/* View Testimonial Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Testimonial Details</DialogTitle>
                        <DialogDescription>Full testimonial information and content</DialogDescription>
                    </DialogHeader>
                    {viewingTestimonial && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                {viewingTestimonial.image ? (
                                    <img
                                        src={viewingTestimonial.image}
                                        alt={viewingTestimonial.name}
                                        className="h-16 w-16 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                        <User className="h-8 w-8 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-lg">{viewingTestimonial.name}</h3>
                                    <p className="text-muted-foreground">{viewingTestimonial.location}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {renderStars(viewingTestimonial.rating)}
                                        <span className="text-sm">{viewingTestimonial.rating}/5</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label className="font-medium">Testimonial Quote</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm whitespace-pre-wrap italic">"{viewingTestimonial.quote}"</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div>
                                    <Label className="font-medium">Status</Label>
                                    <p className="text-sm">
                                        <Badge variant={viewingTestimonial.isActive ? 'default' : 'secondary'}>
                                            {viewingTestimonial.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </p>
                                </div>
                                <div>
                                    <Label className="font-medium">Created</Label>
                                    <p className="text-sm">
                                        {new Date(viewingTestimonial.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Testimonial Form Dialog */}
            <Dialog open={isOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editTestimonial ? 'Edit Testimonial' : 'Create New Testimonial'}</DialogTitle>
                        <DialogDescription>
                            {editTestimonial
                                ? 'Update the testimonial information.'
                                : 'Add a new customer testimonial.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Customer Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    type="text"
                                    placeholder="Lisbon, Portugal"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
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
                                <Label htmlFor="quote">Testimonial Quote</Label>
                                <Textarea
                                    id="quote"
                                    placeholder="Write the customer testimonial..."
                                    value={formData.quote}
                                    onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                                    className="min-h-20"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="image">Customer Photo</Label>
                                <div className="space-y-4">
                                    {formData.image && (
                                        <div className="relative">
                                            <img
                                                src={formData.image}
                                                alt="Customer"
                                                className="h-20 w-20 rounded-full object-cover"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                                onClick={removeImage}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                    {isUploading && <Progress value={uploadProgress} className="w-full" />}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                id="isActive"
                                type="checkbox"
                                checked={formData.isActive !== false}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="isActive">Active</Label>
                        </div>

                        <Button type="submit" className="w-full">
                            {editTestimonial ? 'Update Testimonial' : 'Create Testimonial'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Testimonial"
                description={`Are you sure you want to delete the testimonial from "${testimonialToDelete?.name}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
                confirmText="Delete Testimonial"
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Testimonials to CSV"
                description="Select the testimonial data fields you want to include in your CSV export"
                data={testimonials}
                exportFields={csvExportFields}
                filename="testimonials"
                formatRowData={formatTestimonialsRowData}
            />
        </div>
    );
}
