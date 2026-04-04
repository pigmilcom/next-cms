// @/app/(backend)/admin/store/categories/page.jsx

'use client';

import {
    Download,
    Image as ImageIcon,
    Languages,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    SlidersHorizontal,
    Trash2,
    Upload,
    X
} from 'lucide-react';
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
import { createCategory, deleteCategory, updateCategory, uploadFiles } from '@/lib/server/admin'; 
import { getCategories } from '@/lib/server/store';

const initialFormData = {
    name: '', // Default language name
    nameML: {}, // Multi-language names: { en: 'Name', fr: 'Nom' }
    slug: '',
    title: '', // Default language title
    titleML: {}, // Multi-language titles: { en: 'Title', fr: 'Titre' }
    description: '', // Default language description
    descriptionML: {}, // Multi-language descriptions: { en: 'Description', fr: 'Description' }
    parentId: null,
    imageUrl: '',
    order: 0,
    isActive: true
};

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

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
    const [parentFilter, setParentFilter] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return statusFilter !== 'all' || parentFilter !== 'all';
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'categoryId', label: 'Category ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Name', 'Slug', 'Title'],
            fields: ['name', 'slug', 'title'],
            defaultChecked: true
        },
        {
            key: 'hierarchy',
            label: 'Hierarchy',
            headers: ['Parent Category', 'Order'],
            fields: ['parentCategory', 'order'],
            defaultChecked: true
        },
        { key: 'content', label: 'Content', headers: ['Description'], fields: ['description'], defaultChecked: true },
        { key: 'media', label: 'Media', headers: ['Image URL'], fields: ['imageUrl'], defaultChecked: false },
        {
            key: 'status',
            label: 'Status',
            headers: ['Status', 'Active'],
            fields: ['status', 'active'],
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

    const formatCategoriesRowData = (category, selectedOptions, fieldMapping) => {
        const parentCategory = categories.find((cat) => cat.id === category.parentId);

        const rowData = {
            categoryId: category.id || '',
            name:
                category.name ||
                category.nameML?.[defaultLanguage] ||
                Object.values(category.nameML || {})[0] ||
                'Untitled',
            slug: category.slug || '',
            title:
                category.title || category.titleML?.[defaultLanguage] || Object.values(category.titleML || {})[0] || '',
            parentCategory: parentCategory
                ? parentCategory.name ||
                  parentCategory.nameML?.[defaultLanguage] ||
                  Object.values(parentCategory.nameML || {})[0] ||
                  'Untitled'
                : '-',
            order: category.order || 0,
            description:
                category.description ||
                category.descriptionML?.[defaultLanguage] ||
                Object.values(category.descriptionML || {})[0] ||
                '',
            imageUrl: category.imageUrl || '',
            status: category.isActive ? 'Active' : 'Inactive',
            active: category.isActive ? 'Yes' : 'No',
            createdAt: category.createdAt ? new Date(category.createdAt).toLocaleDateString() : '',
            updatedAt: category.updatedAt ? new Date(category.updatedAt).toLocaleDateString() : ''
        };

        return fieldMapping.map((field) => {
            const value = rowData[field];
            if (value === null || value === undefined) return '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            setLoading(true);

            const result = await getCategories({
                limit: 0,
                options: { duration: '0' } // Force fresh data by bypassing cache
            });

            if (result?.success) {
                setCategories(result.data || []);
                toast.success('Data refreshed successfully');
            } else {
                setCategories([]);
                toast.error('Failed to refresh data');
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            toast.error('Failed to refresh data');
        } finally {
            setIsRefreshingData(false);
            setLoading(false);
        }
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

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const categoriesRes = await getCategories();

            if (categoriesRes?.success) {
                setCategories(categoriesRes.data || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Use the current formData slug as-is, don't regenerate it
            const payload = {
                ...formData,
                // Only generate slug if it's empty (shouldn't happen with validation, but safety check)
                slug: formData.slug || generateSlug(formData.name || '')
            };

            let result;
            if (editCategory) {
                result = await updateCategory(editCategory.key || editCategory.id, payload);
            } else {
                result = await createCategory(payload);
            }

            if (result?.success) {
                await fetchCategories();
                setIsOpen(false);
                setEditCategory(null);
                setFormData(initialFormData);
                toast.success(editCategory ? 'Category updated successfully!' : 'Category created successfully!');
            } else {
                toast.error(result?.error || 'Failed to save category');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error('Failed to save category');
        }
    };

    const handleEdit = (category) => {
        setEditCategory(category);
        setFormData({
            ...category,
            // Handle backward compatibility and new structure
            name: category.name || category.nameML?.[defaultLanguage] || Object.values(category.nameML || {})[0] || '',
            nameML:
                category.nameML ||
                (typeof category.name === 'object' ? category.name : { [defaultLanguage]: category.name || '' }),
            title:
                category.title || category.titleML?.[defaultLanguage] || Object.values(category.titleML || {})[0] || '',
            titleML:
                category.titleML ||
                (typeof category.title === 'object' ? category.title : { [defaultLanguage]: category.title || '' }),
            description:
                category.description ||
                category.descriptionML?.[defaultLanguage] ||
                Object.values(category.descriptionML || {})[0] ||
                '',
            descriptionML:
                category.descriptionML ||
                (typeof category.description === 'object'
                    ? category.description
                    : { [defaultLanguage]: category.description || '' })
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

    const handleDeleteClick = (category) => {
        setCategoryToDelete(category);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;

        try {
            setIsDeleting(true);
            const result = await deleteCategory(categoryToDelete.key || categoryToDelete.id);

            if (result?.success) {
                await fetchCategories();
                toast.success('Category deleted successfully!');
            } else {
                toast.error(result?.error || 'Failed to delete category');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Failed to delete category');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setCategoryToDelete(null);
        }
    };

    const handleDialogChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditCategory(null);
            setFormData(initialFormData);
        }
    };

    const handleAddNew = () => {
        setEditCategory(null);
        setFormData(initialFormData);
        setIsOpen(true);
    };

    // Filter function for AdminTable
    const filterCategories = (categories, search, sortConfig) => {
        let filtered = [...categories];

        // Apply search filter
        if (search) {
            filtered = filtered.filter(
                (category) =>
                    (
                        category.name ||
                        category.nameML?.[defaultLanguage] ||
                        Object.values(category.nameML || {})[0] ||
                        ''
                    )
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                    (
                        category.title ||
                        category.titleML?.[defaultLanguage] ||
                        Object.values(category.titleML || {})[0] ||
                        ''
                    )
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                    category.slug.toLowerCase().includes(search.toLowerCase()) ||
                    (
                        category.description ||
                        category.descriptionML?.[defaultLanguage] ||
                        Object.values(category.descriptionML || {})[0] ||
                        ''
                    )
                        .toLowerCase()
                        .includes(search.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((category) =>
                statusFilter === 'active' ? category.isActive : !category.isActive
            );
        }

        // Apply parent filter
        if (parentFilter !== 'all') {
            if (parentFilter === 'root') {
                filtered = filtered.filter((category) => !category.parentId);
            } else {
                filtered = filtered.filter((category) => category.parentId === parentFilter);
            }
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'name') {
                    aVal =
                        a.title ||
                        a.titleML?.[defaultLanguage] ||
                        Object.values(a.titleML || {})[0] ||
                        a.name ||
                        a.nameML?.[defaultLanguage] ||
                        Object.values(a.nameML || {})[0] ||
                        '';
                    bVal =
                        b.title ||
                        b.titleML?.[defaultLanguage] ||
                        Object.values(b.titleML || {})[0] ||
                        b.name ||
                        b.nameML?.[defaultLanguage] ||
                        Object.values(b.nameML || {})[0] ||
                        '';
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
            render: (category) => (
                <div className="h-10 w-10 bg-white rounded flex items-center justify-end sm:justify-start gap-3">
                    {category.imageUrl ? (
                        <img src={category.imageUrl} alt={category.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-end sm:justify-start rounded bg-gray-100">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                    )}
                    <div>
                        <div className="font-medium">
                            {category.name ||
                                category.nameML?.[defaultLanguage] ||
                                Object.values(category.nameML || {})[0] ||
                                'Untitled'}
                        </div>
                        <div className="text-muted-foreground text-sm">{category.slug}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'parentId',
            label: 'Parent Category',
            sortable: false,
            render: (category) => {
                const parent = categories.find((c) => c.id === category.parentId);
                return parent
                    ? parent.title ||
                          parent.titleML?.[defaultLanguage] ||
                          Object.values(parent.titleML || {})[0] ||
                          parent.name ||
                          parent.nameML?.[defaultLanguage] ||
                          Object.values(parent.nameML || {})[0] ||
                          'Untitled'
                    : 'None';
            }
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (category) => (
                <Badge variant={category.isActive ? 'default' : 'secondary'}>
                    {category.isActive ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            key: 'createdAt',
            label: 'Created At',
            sortable: true,
            render: (category) => new Date(category.createdAt).toLocaleDateString()
        }
    ];

    // Define row actions
    const getRowActions = (category) => [
        {
            label: 'Edit Category',
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(category)
        },
        {
            label: 'Delete Category',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(category),
            className: 'text-destructive'
        }
    ];

    return (
        <div className="space-y-4">
            <AdminHeader title="Categories" description="Organize your products into categories" />

            <AdminTable
                data={categories}
                columns={columns}
                filterData={filterCategories}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage="No categories found"
                searchPlaceholder="Search categories..."
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

                                {/* Parent Filter */}
                                <Select value={parentFilter} onValueChange={setParentFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Parent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="root">Root Categories</SelectItem>
                                        {categories
                                            .filter((cat) => !cat.parentId)
                                            .map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.title ||
                                                        category.titleML?.[defaultLanguage] ||
                                                        Object.values(category.titleML || {})[0] ||
                                                        category.name ||
                                                        category.nameML?.[defaultLanguage] ||
                                                        Object.values(category.nameML || {})[0] ||
                                                        'Untitled'}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select> 
                                
                                <div className="flex items-center justify-between">
                                    {/* Action Buttons Row */}
                                    <div className="flex gap-2">
                                        {/* Reset Filters Button - Only show when filters applied */}
                                        {hasFiltersApplied() && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setStatusFilter('all');
                                                    setParentFilter('all');
                                                }}
                                                title="Reset all filters">
                                                <X className="h-4 w-4" color="red" />
                                                <span className="text-red-500">Reset</span>
                                            </Button>
                                        )}
                                    </div>
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
                                        [statusFilter !== 'all' && 'Status', parentFilter !== 'all' && 'Parent'].filter(
                                            Boolean
                                        ).length
                                    }
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh categories data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4" />
                            <span>Add Category</span>
                        </Button>
                    </>
                }
            />

            {/* Category Form Dialog */}
            <Dialog open={isOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="sm:max-w-1/2">
                                <DialogTitle>{editCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                                <DialogDescription>
                                    {editCategory ? 'Update the category details.' : 'Add a new product category.'}
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
                                    placeholder="Category name"
                                    value={getMultiLanguageValue('name', selectedLanguage)}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        updateMultiLanguageField('name', selectedLanguage, name);

                                        // Auto-generate slug only for new categories and default language
                                        if (selectedLanguage === defaultLanguage && !editCategory) {
                                            setFormData((prev) => ({ ...prev, slug: generateSlug(name) }));
                                        }
                                    }}
                                    required={selectedLanguage === defaultLanguage}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    type="text"
                                    placeholder="category-slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="title">
                                    Title{' '}
                                    {availableLanguages.length > 1 &&
                                        `(${languageLabels[selectedLanguage] || selectedLanguage.toUpperCase()})`}
                                </Label>
                                <Input
                                    id="title"
                                    type="text"
                                    placeholder="Category title"
                                    value={getMultiLanguageValue('title', selectedLanguage)}
                                    onChange={(e) => {
                                        const title = e.target.value;
                                        updateMultiLanguageField('title', selectedLanguage, title);
                                    }}
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="description">
                                    Description{' '}
                                    {availableLanguages.length > 1 &&
                                        `(${languageLabels[selectedLanguage] || selectedLanguage.toUpperCase()})`}
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe this category..."
                                    value={getMultiLanguageValue('description', selectedLanguage)}
                                    onChange={(e) => {
                                        const description = e.target.value;
                                        updateMultiLanguageField('description', selectedLanguage, description);
                                    }}
                                    className="min-h-20"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="parent">Parent Category</Label>
                                <Select
                                    value={formData.parentId || 'none'}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, parentId: value === 'none' ? null : value })
                                    }>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select parent category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Root category)</SelectItem>
                                        {categories
                                            .filter((cat) => cat.id !== editCategory?.id)
                                            .map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.title ||
                                                        category.titleML?.[defaultLanguage] ||
                                                        Object.values(category.titleML || {})[0] ||
                                                        category.name ||
                                                        category.nameML?.[defaultLanguage] ||
                                                        Object.values(category.nameML || {})[0] ||
                                                        'Untitled'}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">Category Image</Label>
                                <div className="space-y-4">
                                    {formData.imageUrl && (
                                        <div className="relative">
                                            <img
                                                src={formData.imageUrl}
                                                alt="Category"
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
                            {editCategory ? 'Update Category' : 'Create Category'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Category"
                description={`Are you sure you want to delete "${categoryToDelete?.name || categoryToDelete?.nameML?.[defaultLanguage] || Object.values(categoryToDelete?.nameML || {})[0] || 'this category'}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
                confirmText="Delete Category"
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Categories to CSV"
                description="Select the category data fields you want to include in your CSV export"
                data={categories}
                exportFields={csvExportFields}
                filename="categories"
                formatRowData={formatCategoriesRowData}
            />
        </div>
    );
}
