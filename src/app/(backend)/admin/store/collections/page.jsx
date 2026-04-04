// @/app/(backend)/admin/store/collections/page.jsx

'use client';

import { Download, Image as ImageIcon, Languages, Pencil, Plus, RefreshCw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatAvailableLanguages } from '@/lib/i18n';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createCollection, deleteCollection, updateCollection, uploadFiles } from '@/lib/server/admin'; 
import { getCollections } from '@/lib/server/store';

const initialFormData = {
    name: '',
    nameML: {}, // Multi-language names: { en: 'Name', fr: 'Nom' }
    slug: '',
    description: '',
    descriptionML: {}, // Multi-language descriptions
    imageUrl: '',
    color: '', // Custom badge color (optional)
    isActive: true
};

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export default function CollectionsPage() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editCollection, setEditCollection] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Get settings from LayoutProvider context
    const { siteSettings } = useAdminSettings();

    // Language configuration
    const availableLanguages = siteSettings?.languages || ['en'];
    const defaultLanguage = siteSettings?.language || 'en';
    const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);

    // Language labels mapping using i18n formatting
    const formattedLanguages = formatAvailableLanguages(availableLanguages, selectedLanguage);
    const languageLabels = formattedLanguages.reduce((acc, lang) => {
        acc[lang.code] = lang.name;
        return acc;
    }, {});

    // Filter states following orders page pattern
    const [statusFilter, setStatusFilter] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return statusFilter !== 'all';
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            setLoading(true);

            const result = await getCollections({ duration: '0' }); // Force fresh data by bypassing cache
            
            if (result?.success) {
                setCollections(result.data || []);
                toast.success('Collections data refreshed successfully');
            } else {
                setCollections([]);
                toast.error('Failed to fetch collections');
            }
        } catch (error) {
            console.error('Error refreshing collections data:', error);
            toast.error('Failed to refresh collections data');
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
        { key: 'collectionId', label: 'Collection ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Name', 'Slug', 'Description'],
            fields: ['name', 'slug', 'description'],
            defaultChecked: true
        },
        {
            key: 'multilanguage',
            label: 'Multi-language Data',
            headers: ['Name (ML)', 'Description (ML)'],
            fields: ['nameML', 'descriptionML'],
            defaultChecked: false
        },
        {
            key: 'media',
            label: 'Media Information',
            headers: ['Image URL', 'Color'],
            fields: ['imageUrl', 'color'],
            defaultChecked: true
        },
        {
            key: 'status',
            label: 'Status Information',
            headers: ['Active Status'],
            fields: ['isActive'],
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

    const formatCollectionsRowData = (collection, selectedOptions, fieldMapping) => {
        const rowData = {
            collectionId: collection.id || '',
            name: collection.nameML?.[defaultLanguage] || collection.name || '',
            slug: collection.slug || '',
            description: collection.descriptionML?.[defaultLanguage] || collection.description || '',
            nameML: JSON.stringify(collection.nameML || {}),
            descriptionML: JSON.stringify(collection.descriptionML || {}),
            imageUrl: collection.imageUrl || '',
            color: collection.color || '',
            isActive: collection.isActive ? 'Active' : 'Inactive',
            createdAt: collection.createdAt ? new Date(collection.createdAt).toLocaleDateString() : '',
            updatedAt: collection.updatedAt ? new Date(collection.updatedAt).toLocaleDateString() : ''
        };

        return fieldMapping.map((field) => {
            const value = rowData[field];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
        });
    };

    // Handle language change
    const handleLanguageChange = (newLang) => {
        setSelectedLanguage(newLang);
    };

    // Multi-language helper functions
    const updateMultiLanguageField = (fieldName, langCode, value) => {
        setFormData((prev) => {
            const updatedData = {
                ...prev,
                [`${fieldName}ML`]: {
                    ...prev[`${fieldName}ML`],
                    [langCode]: value
                }
            };

            // If updating default language, also update the main field
            if (langCode === defaultLanguage) {
                updatedData[fieldName] = value;

                // Auto-generate slug from name if this is the name field
                if (fieldName === 'name') {
                    updatedData.slug = generateSlug(value);
                }
            }

            return updatedData;
        });
    };

    const getMultiLanguageValue = (fieldName, langCode) => {
        return formData[`${fieldName}ML`]?.[langCode] || '';
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const collectionsRes = await getCollections();

            if (collectionsRes?.success) {
                setCollections(collectionsRes.data || []);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
            toast.error('Failed to load collections');
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
                slug: generateSlug(formData.nameML?.[defaultLanguage] || formData.name)
            };

            let result;
            if (editCollection) {
                result = await updateCollection(editCollection.key || editCollection.id, payload);
            } else {
                result = await createCollection(payload);
            }

            if (result?.success) {
                await fetchData();
                setIsOpen(false);
                setEditCollection(null);
                setFormData(initialFormData);
                toast.success(editCollection ? 'Collection updated successfully!' : 'Collection created successfully!');
            } else {
                toast.error(result?.error || 'Failed to save collection');
            }
        } catch (error) {
            console.error('Error saving collection:', error);
            toast.error('Failed to save collection');
        }
    };

    const handleEdit = (collection) => {
        setEditCollection(collection);
        setFormData({
            ...collection,
            nameML: collection.nameML || {},
            descriptionML: collection.descriptionML || {}
        });
        setIsOpen(true);
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

            if (result?.success && result.files?.length > 0) {
                setFormData((prev) => ({
                    ...prev,
                    imageUrl: result.files[0].url
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
        setFormData({ ...formData, imageUrl: '' });
    };

    const handleDeleteClick = (collection) => {
        setCollectionToDelete(collection);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!collectionToDelete) return;

        try {
            setIsDeleting(true);
            const result = await deleteCollection(collectionToDelete.key || collectionToDelete.id);

            if (result?.success) {
                await fetchData();
                toast.success('Collection deleted successfully!');
            } else {
                toast.error(result?.error || 'Failed to delete collection');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            toast.error('Failed to delete collection');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setCollectionToDelete(null);
        }
    };

    const handleDialogChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditCollection(null);
            setFormData(initialFormData);
        }
    };

    const handleAddNew = () => {
        setEditCollection(null);
        setFormData(initialFormData);
        setIsOpen(true);
    };

    // Filter function for AdminTable
    const filterCollections = (collections, search, sortConfig) => {
        let filtered = [...collections];

        // Apply search filter
        if (search) {
            filtered = filtered.filter(
                (collection) =>
                    (collection.nameML?.[defaultLanguage] || collection.name || '')
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                    collection.slug.toLowerCase().includes(search.toLowerCase()) ||
                    (collection.descriptionML?.[defaultLanguage] || collection.description || '')
                        .toLowerCase()
                        .includes(search.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((collection) =>
                statusFilter === 'active' ? collection.isActive : !collection.isActive
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'name') {
                    aVal = a.nameML?.[defaultLanguage] || a.name || '';
                    bVal = b.nameML?.[defaultLanguage] || b.name || '';
                }

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
            label: 'Name',
            sortable: true,
            render: (collection) => (
                <div className="flex items-center justify-end sm:justify-start gap-3">
                    {collection.imageUrl ? (
                        <img
                            src={collection.imageUrl}
                            alt={collection.name}
                            className="h-10 w-10 rounded object-cover"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                    )}
                    <div>
                        <div className="font-medium">{collection.nameML?.[defaultLanguage] || collection.name}</div>
                        <div className="text-muted-foreground text-sm">{collection.slug}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (collection) => (
                <Badge variant={collection.isActive ? 'default' : 'secondary'}>
                    {collection.isActive ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            key: 'createdAt',
            label: 'Created At',
            sortable: true,
            render: (collection) => new Date(collection.createdAt).toLocaleDateString()
        }
    ];

    // Define row actions
    const getRowActions = (collection) => [
        {
            label: 'Edit Collection',
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(collection)
        },
        {
            label: 'Delete Collection',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(collection),
            className: 'text-destructive'
        }
    ];

    return (
        <div className="space-y-4">
            <AdminHeader title="Collections" description="Create and manage product collections" />

            <AdminTable
                data={collections}
                columns={columns}
                filterData={filterCollections}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage="No collections found"
                searchPlaceholder="Search collections..."
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
 
                                {/* Action Buttons Row */}
                                <div className="flex gap-2">
                                    {/* Reset Filters Button - Only show when filters applied */}
                                    {hasFiltersApplied() && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setStatusFilter('all');
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
                                    {[statusFilter !== 'all' && 'Status'].filter(Boolean).length}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh collections data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4" />
                            <span>Add Collection</span>
                        </Button>
                    </>
                }
            />

            {/* Collection Form Dialog */}
            <Dialog open={isOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="sm:max-w-1/2">
                                <DialogTitle>
                                    {editCollection ? 'Edit Collection' : 'Create New Collection'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editCollection
                                        ? 'Update the collection details.'
                                        : 'Add a new product collection.'}
                                </DialogDescription>
                            </div>
                            {availableLanguages.length > 1 && (
                                <div className="flex items-center gap-2 sm:absolute sm:top-5 sm:right-16">
                                    <Languages className="h-4 w-4 text-muted-foreground" />
                                    <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableLanguages.map((lang) => (
                                                <SelectItem key={lang} value={lang}>
                                                    {languageLabels[lang] || lang.toUpperCase()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Name{' '}
                                    {availableLanguages.length > 1 &&
                                        `(${languageLabels[selectedLanguage] || selectedLanguage.toUpperCase()})`}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Collection name"
                                    value={getMultiLanguageValue('name', selectedLanguage)}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        updateMultiLanguageField('name', selectedLanguage, name);
                                    }}
                                    required={selectedLanguage === defaultLanguage}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    type="text"
                                    placeholder="collection-slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="color">Badge Color (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="color"
                                        type="color"
                                        value={formData.color || '#2563eb'}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-16 h-10 p-1 border rounded cursor-pointer"
                                    />
                                    <Input
                                        type="text"
                                        placeholder="#2563eb"
                                        value={formData.color || ''}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="flex-1"
                                    />
                                    {formData.color && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setFormData({ ...formData, color: '' })}
                                            className="px-3">
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Custom color for collection badge. Leave empty for default blue.
                                </p>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="description">
                                    Description{' '}
                                    {availableLanguages.length > 1 &&
                                        `(${languageLabels[selectedLanguage] || selectedLanguage.toUpperCase()})`}
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe this collection..."
                                    value={getMultiLanguageValue('description', selectedLanguage)}
                                    onChange={(e) => {
                                        const description = e.target.value;
                                        updateMultiLanguageField('description', selectedLanguage, description);
                                    }}
                                    className="min-h-20"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="image">Collection Image</Label>
                                <div className="space-y-4">
                                    {formData.imageUrl && (
                                        <div className="relative">
                                            <img
                                                src={formData.imageUrl}
                                                alt="Collection"
                                                className="h-32 w-32 rounded object-cover"
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
                            {editCollection ? 'Update Collection' : 'Create Collection'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Collection"
                description={`Are you sure you want to delete "${collectionToDelete?.nameML?.[defaultLanguage] || collectionToDelete?.name}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
                confirmText="Delete Collection"
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Collections to CSV"
                description="Select the collection data fields you want to include in your CSV export"
                data={collections}
                exportFields={csvExportFields}
                filename="collections"
                formatRowData={formatCollectionsRowData}
            />
        </div>
    );
}
