// @/app/(backend)/admin/store/attributes/page.jsx

'use client';

import { Download, Languages, Pencil, Plus, RefreshCcw, SlidersHorizontal, Trash2, X } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createAttribute, deleteAttribute, updateAttribute } from '@/lib/server/admin'; 
import { getAttributes } from '@/lib/server/store';

const initialFormData = {
    id: '',
    name: '',
    nameML: {}, // Multi-language names: { en: 'Name', fr: 'Nom' }
    slug: '',
    type: 'text', // text, number, select, color, boolean
    description: '',
    descriptionML: {}, // Multi-language descriptions
    options: [], // For select type
    isRequired: false,
    isActive: true
};

const ATTRIBUTE_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Select Options' },
    { value: 'color', label: 'Color' },
    { value: 'boolean', label: 'Yes/No' }
];

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export default function AttributesPage() {
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editAttribute, setEditAttribute] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [attributeToDelete, setAttributeToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [newOption, setNewOption] = useState('');

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
    const [typeFilter, setTypeFilter] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return statusFilter !== 'all' || typeFilter !== 'all';
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'attributeId', label: 'Attribute ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Name', 'Slug', 'Type'],
            fields: ['name', 'slug', 'type'],
            defaultChecked: true
        },
        { key: 'content', label: 'Content', headers: ['Description'], fields: ['description'], defaultChecked: true },
        { key: 'options', label: 'Options', headers: ['Options'], fields: ['options'], defaultChecked: false },
        {
            key: 'requirements',
            label: 'Requirements',
            headers: ['Required'],
            fields: ['required'],
            defaultChecked: true
        },
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

    const formatAttributesRowData = (attribute, selectedOptions, fieldMapping) => {
        const formatValue = (value) => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
        };

        // Build the row data object
        const rowData = {
            attributeId: attribute.key || attribute.id || '',
            name: attribute.nameML?.[defaultLanguage] || attribute.name || '',
            slug: attribute.slug || '',
            type: ATTRIBUTE_TYPES.find((t) => t.value === attribute.type)?.label || attribute.type || '',
            description: attribute.descriptionML?.[defaultLanguage] || attribute.description || '',
            options: attribute.options ? attribute.options.join(', ') : '',
            required: attribute.isRequired ? 'Required' : 'Optional',
            status: attribute.isActive ? 'Active' : 'Inactive',
            active: attribute.isActive ? 'Yes' : 'No',
            createdAt: attribute.createdAt ? new Date(attribute.createdAt).toLocaleDateString() : '',
            updatedAt: attribute.updatedAt ? new Date(attribute.updatedAt).toLocaleDateString() : ''
        };

        // Return the formatted row based on selected field mapping
        return fieldMapping.map((field) => formatValue(rowData[field] || ''));
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            toast.info('Refreshing data...');

            // Fetch fresh data with cache bypass
            const attributesRes = await getAttributes({ options: { duration: '0' } });

            if (attributesRes?.success) {
                setAttributes(attributesRes.data);
                toast.success('Data refreshed successfully!');
            } else {
                toast.error('Failed to refresh data');
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            toast.error('Failed to refresh data');
        } finally {
            setIsRefreshingData(false);
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

    const fetchData = async () => {
        try {
            setLoading(true);
            const attributesRes = await getAttributes();

            if (attributesRes?.success) {
                setAttributes(attributesRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load attributes');
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
            // Ensure main fields are populated from default language
            const submitData = {
                ...formData,
                name: formData.nameML?.[defaultLanguage] || formData.name || '',
                description: formData.descriptionML?.[defaultLanguage] || formData.description || ''
            };

            let result;
            if (editAttribute) {
                result = await updateAttribute(editAttribute.key || editAttribute.id, submitData);
            } else {
                result = await createAttribute(submitData);
            }

            if (result?.success) {
                await fetchData();
                setIsOpen(false);
                setEditAttribute(null);
                setFormData(initialFormData);
                toast.success(editAttribute ? 'Attribute updated successfully!' : 'Attribute created successfully!');
            } else {
                toast.error(result?.error || 'Failed to save attribute');
            }
        } catch (error) {
            console.error('Error saving attribute:', error);
            toast.error('Failed to save attribute');
        }
    };

    const handleEdit = (attribute) => {
        setEditAttribute(attribute);
        setFormData({
            ...attribute,
            nameML: attribute.nameML || {},
            descriptionML: attribute.descriptionML || {},
            // Ensure main fields are populated from default language if not already set
            name: attribute.name || attribute.nameML?.[defaultLanguage] || '',
            description: attribute.description || attribute.descriptionML?.[defaultLanguage] || ''
        });
        setIsOpen(true);
    };

    const handleDeleteClick = (attribute) => {
        setAttributeToDelete(attribute);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!attributeToDelete) return;

        try {
            setIsDeleting(true);
            const result = await deleteAttribute(attributeToDelete.key || attributeToDelete.id);

            if (result?.success) {
                await fetchData();
                toast.success('Attribute deleted successfully!');
            } else {
                toast.error(result?.error || 'Failed to delete attribute');
            }
        } catch (error) {
            console.error('Error deleting attribute:', error);
            toast.error('Failed to delete attribute');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setAttributeToDelete(null);
        }
    };

    const addOption = () => {
        if (newOption.trim()) {
            setFormData({
                ...formData,
                options: [...formData.options, newOption.trim()]
            });
            setNewOption('');
        }
    };

    const removeOption = (optionToRemove) => {
        setFormData({
            ...formData,
            options: formData.options.filter((option) => option !== optionToRemove)
        });
    };

    const handleDialogChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditAttribute(null);
            setFormData(initialFormData);
        }
    };

    const handleAddNew = () => {
        setEditAttribute(null);
        setFormData(initialFormData);
        setIsOpen(true);
    };

    // Filter function for AdminTable
    const filterAttributes = (attributes, search, sortConfig) => {
        let filtered = [...attributes];

        // Apply search filter
        if (search) {
            filtered = filtered.filter(
                (attr) =>
                    (attr.nameML?.[defaultLanguage] || attr.name || '').toLowerCase().includes(search.toLowerCase()) ||
                    attr.slug.toLowerCase().includes(search.toLowerCase()) ||
                    (attr.descriptionML?.[defaultLanguage] || attr.description || '')
                        .toLowerCase()
                        .includes(search.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((attr) => (statusFilter === 'active' ? attr.isActive : !attr.isActive));
        }

        // Apply type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter((attr) => attr.type === typeFilter);
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
            render: (attribute) => (
                <div>
                    <div className="font-medium">{attribute.nameML?.[defaultLanguage] || attribute.name}</div>
                    <div className="text-muted-foreground text-sm">{attribute.slug}</div>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Type',
            sortable: true,
            render: (attribute) => (
                <Badge variant="secondary">
                    {ATTRIBUTE_TYPES.find((t) => t.value === attribute.type)?.label || attribute.type}
                </Badge>
            )
        },
        {
            key: 'required',
            label: 'Required',
            sortable: false,
            render: (attribute) =>
                attribute.isRequired ? (
                    <Badge variant="default">Required</Badge>
                ) : (
                    <Badge variant="outline">Optional</Badge>
                )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (attribute) => (
                <Badge variant={attribute.isActive ? 'default' : 'secondary'}>
                    {attribute.isActive ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            key: 'createdAt',
            label: 'Created At',
            sortable: true,
            render: (attribute) => new Date(attribute.createdAt).toLocaleDateString()
        }
    ];

    // Define row actions
    const getRowActions = (attribute) => [
        {
            label: 'Edit Attribute',
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(attribute)
        },
        {
            label: 'Delete Attribute',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(attribute),
            className: 'text-destructive'
        }
    ];

    return (
        <div className="space-y-4">
            <AdminHeader title="Attributes" description="Manage product attributes and custom fields" />

            <AdminTable
                data={attributes}
                columns={columns}
                filterData={filterAttributes}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage="No attributes found"
                searchPlaceholder="Search attributes..."
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

                                {/* Type Filter */}
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {ATTRIBUTE_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
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
                                                setTypeFilter('all');
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
                                        [statusFilter !== 'all' && 'Status', typeFilter !== 'all' && 'Type'].filter(
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
                            className="gap-2">
                            <RefreshCcw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4" />
                            Add Attribute
                        </Button>
                    </>
                }
            />

            {/* Attribute Form Dialog */}
            <Dialog open={isOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="sm:max-w-1/2">
                                <DialogTitle>{editAttribute ? 'Edit Attribute' : 'Create New Attribute'}</DialogTitle>
                                <DialogDescription>
                                    {editAttribute ? 'Update the attribute details.' : 'Add a new product attribute.'}
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
                                    placeholder="Attribute name"
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
                                    placeholder="attribute-slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ATTRIBUTE_TYPES.map((type, index) => (
                                            <SelectItem key={index} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    Description{' '}
                                    {availableLanguages.length > 1 &&
                                        `(${languageLabels[selectedLanguage] || selectedLanguage.toUpperCase()})`}
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe this attribute..."
                                    value={getMultiLanguageValue('description', selectedLanguage)}
                                    onChange={(e) => {
                                        const description = e.target.value;
                                        updateMultiLanguageField('description', selectedLanguage, description);
                                    }}
                                    className="min-h-20"
                                />
                            </div>
                        </div>

                        {formData.type === 'select' && (
                            <div className="space-y-4">
                                <Label>Options</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add option..."
                                        value={newOption}
                                        onChange={(e) => setNewOption(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addOption();
                                            }
                                        }}
                                    />
                                    <Button type="button" onClick={addOption} variant="outline">
                                        Add
                                    </Button>
                                </div>

                                {formData.options.length > 0 && (
                                    <div className="space-y-2">
                                        {formData.options.map((option, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between rounded border p-2">
                                                <span>{option}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeOption(option)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    id="isRequired"
                                    type="checkbox"
                                    checked={formData.isRequired}
                                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="isRequired">Required field</Label>
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
                        </div>

                        <Button type="submit" className="w-full">
                            {editAttribute ? 'Update Attribute' : 'Create Attribute'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Attribute"
                description={`Are you sure you want to delete "${attributeToDelete?.nameML?.[defaultLanguage] || attributeToDelete?.name}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
                confirmText="Delete Attribute"
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Attributes to CSV"
                description="Select the data fields you want to include in your CSV export"
                data={attributes}
                exportFields={csvExportFields}
                filename="attributes-export"
                formatRowData={formatAttributesRowData}
            />
        </div>
    );
}
