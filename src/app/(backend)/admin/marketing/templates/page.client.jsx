// @/app/(backend)/admin/marketing/templates/page.client.jsx

'use client';

import { Download, Eye, Mail, MessageSquare, Pencil, Plus, RefreshCw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createTemplate, deleteTemplate, updateTemplate } from '@/lib/server/newsletter';

export default function TemplatesPageClient({ initialData }) {
    const { siteSettings } = useAdminSettings();
    const [templates, setTemplates] = useState(initialData.templates || []);

    // Use languages from server-side fetch (already merged and deduplicated)
    const availableLanguages = useMemo(() => {
        return initialData.availableLanguages && initialData.availableLanguages.length > 0 
            ? initialData.availableLanguages 
            : ['en'];
    }, [initialData.availableLanguages]);

    // Template states
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        description: '',
        content: '',
        message: '',
        type: 'email',
        category: 'email',
        thumbnail: '📧'
    });

    // Edit template states
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [editTemplateData, setEditTemplateData] = useState({
        name: '',
        description: '',
        content: '',
        message: '',
        type: 'email',
        category: 'email',
        thumbnail: '📧'
    });

    // Delete confirmation states
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);

    // Preview dialog states
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState(null);

    // Filter states
    const [templateFilter, setTemplateFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return (
            templateFilter !== 'all' ||
            typeFilter !== 'all' ||
            categoryFilter !== 'all'
        );
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            toast.success('Template data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing template data:', error);
            toast.error('Failed to refresh template data');
        } finally {
            setIsRefreshingData(false);
        }
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'templateId', label: 'Template ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Name', 'Description', 'Type', 'Category'],
            fields: ['name', 'description', 'type', 'category'],
            defaultChecked: true
        },
        {
            key: 'content',
            label: 'Content Information',
            headers: ['Content', 'Message'],
            fields: ['content', 'message'],
            defaultChecked: false
        },
        {
            key: 'metadata',
            label: 'Metadata',
            headers: ['Thumbnail', 'Created At'],
            fields: ['thumbnail', 'createdAt'],
            defaultChecked: true
        }
    ];

    const formatTemplatesRowData = (template, selectedOptions, fieldMapping) => {
        const rowData = {
            templateId: template.id,
            name: template.name || '',
            description: template.description || '',
            type: template.type || '',
            category: template.category || '',
            content: template.content || '',
            message: template.message || '',
            thumbnail: template.thumbnail || '',
            createdAt: template.createdAt ? new Date(template.createdAt).toLocaleDateString() : ''
        };
        return fieldMapping.map((field) => rowData[field]);
    };

    // Enhanced filter function for AdminTable
    const filterTemplates = (templates, search, sortConfig) => {
        let filtered = [...templates];

        // Apply type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter((template) => template.type === typeFilter);
        }

        // Apply category filter  
        if (categoryFilter !== 'all') {
            filtered = filtered.filter((template) => template.category === categoryFilter);
        }

        // Apply main template filter
        if (templateFilter !== 'all') {
            filtered = filtered.filter((template) => template.type === templateFilter);
        }

        return filtered;
    };

    // Create template
    const handleCreateTemplate = async () => {
        if (!newTemplate.name.trim()) {
            toast.error('Template name is required');
            return;
        }

        if (newTemplate.type === 'email' && !newTemplate.content.trim()) {
            toast.error('Content is required for email templates');
            return;
        }

        if (newTemplate.type === 'sms' && !newTemplate.message.trim()) {
            toast.error('Message is required for SMS templates');
            return;
        }

        try {
            setIsCreatingTemplate(true);

            const result = await createTemplate(newTemplate);

            if (result.success) {
                toast.success(`${newTemplate.type === 'sms' ? 'SMS' : 'Email'} template created successfully`);
                setNewTemplate({
                    name: '',
                    description: '',
                    content: '',
                    message: '',
                    type: 'email',
                    category: 'email',
                    thumbnail: '📧'
                });
                setTemplates((prev) => [result.data, ...prev]);
                setIsDialogOpen(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to create template');
        } finally {
            setIsCreatingTemplate(false);
        }
    };

    // Delete template - open confirmation
    const handleDeleteClick = (template) => {
        setTemplateToDelete(template);
        setDeleteConfirmOpen(true);
    };

    // Delete template - confirmed
    const handleDeleteTemplate = async () => {
        if (!templateToDelete) return;

        try {
            const templateId = templateToDelete.key || templateToDelete.id;
            const result = await deleteTemplate(templateId);
            if (result.success) {
                toast.success('Template deleted successfully');
                setTemplates((prev) => prev.filter((t) => (t.key || t.id) !== templateId));
            } else {
                throw new Error(result.error);
            }
            setDeleteConfirmOpen(false);
            setTemplateToDelete(null);
        } catch (error) {
            toast.error(error.message || 'Failed to delete template');
        }
    };

    // Edit template
    const handleUpdateTemplate = async () => {
        if (!editTemplateData.name.trim()) {
            toast.error('Template name is required');
            return;
        }

        if (editTemplateData.type === 'email' && !editTemplateData.content.trim()) {
            toast.error('Content is required for email templates');
            return;
        }

        if (editTemplateData.type === 'sms' && !editTemplateData.message.trim()) {
            toast.error('Message is required for SMS templates');
            return;
        }

        try {
            const templateId = editingTemplate.key || editingTemplate.id;
            const result = await updateTemplate(templateId, editTemplateData);

            if (result.success) {
                toast.success(`${editTemplateData.type === 'sms' ? 'SMS' : 'Email'} template updated successfully`);
                setTemplates((prev) => prev.map((t) => ((t.key || t.id) === templateId ? result.data : t)));
                setEditingTemplate(null);
                setEditTemplateData({
                    name: '',
                    description: '',
                    content: '',
                    message: '',
                    type: 'email',
                    category: 'email',
                    thumbnail: '📧'
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update template');
        }
    };

    return (
        <div className="space-y-6">
            <AdminHeader
                title="Email & SMS Templates"
                description="Manage reusable templates for your email and SMS campaigns"
            />

            {/* Templates Section */}
            <div className="space-y-6">
                {/* AdminTable for Templates */}
                <AdminTable
                    data={templates}
                    columns={[
                        {
                            key: 'name',
                            label: 'Template',
                            sortable: true,
                            render: (template) => (
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl shrink-0">{template.thumbnail || '📧'}</div>
                                    <div>
                                        <div className="font-medium">{template.name}</div>
                                        <div className="text-muted-foreground text-sm truncate max-w-xs">
                                            {template.description}
                                        </div>
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'type',
                            label: 'Type',
                            sortable: true,
                            render: (template) => (
                                <Badge variant="outline" className="capitalize">
                                    {template.type === 'sms' ? (
                                        <><MessageSquare className="mr-1 h-3 w-3" /> SMS</>
                                    ) : (
                                        <><Mail className="mr-1 h-3 w-3" /> Email</>
                                    )}
                                </Badge>
                            )
                        }, 
                        {
                            key: 'content',
                            label: 'Description',
                            sortable: false,
                            render: (template) => {
                                const content = template.description || '';
                                const preview = content ? content.replace(/<[^>]*>/g, '').substring(0, 100) : '-';
                                return (
                                    <div className="text-sm text-muted-foreground max-w-xs truncate">
                                        {preview}{content && content.length > 100 ? '...' : ''}
                                    </div>
                                );
                            }
                        },
                        {
                            key: 'createdAt',
                            label: 'Created',
                            sortable: true,
                            render: (template) => (
                                <span className="text-sm text-muted-foreground">
                                    {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Unknown'}
                                </span>
                            )
                        }
                    ]}
                    filterData={filterTemplates}
                    getRowActions={(template) => [
                        {
                            label: 'Preview Template',
                            icon: <Eye className="mr-2 h-4 w-4" />,
                            onClick: () => {
                                setPreviewTemplate(template);
                                setPreviewDialogOpen(true);
                            }
                        },
                        {
                            label: 'Edit Template',
                            icon: <Pencil className="mr-2 h-4 w-4" />,
                            onClick: () => {
                                setEditingTemplate(template);
                                setEditTemplateData({
                                    name: template.name || '',
                                    description: template.description || '',
                                    content: template.content || '',
                                    message: template.message || '',
                                    type: template.type || 'email',
                                    category: template.category || 'email',
                                    thumbnail: template.thumbnail || '📧'
                                });
                            }
                        },
                        {
                            label: 'Delete Template',
                            icon: <Trash2 className="mr-2 h-4 w-4" />,
                            onClick: () => handleDeleteClick(template),
                            className: 'text-destructive'
                        }
                    ]}
                    emptyMessage="No templates found"
                    searchPlaceholder="Search by name, description, or content..."
                    customFilters={
                        <div className="space-y-3">
                            {isFiltersExpanded && (
                                <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="sms">SMS</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="sms">SMS</SelectItem>
                                            <SelectItem value="newsletter">Newsletter</SelectItem>
                                            <SelectItem value="notification">Notification</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className="flex gap-2">
                                        {hasFiltersApplied() && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setTemplateFilter('all');
                                                    setTypeFilter('all');
                                                    setCategoryFilter('all');
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
                                                templateFilter !== 'all' && 'Template',
                                                typeFilter !== 'all' && 'Type',
                                                categoryFilter !== 'all' && 'Category'
                                            ].filter(Boolean).length
                                        }
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleRefreshData}
                                disabled={isRefreshingData}
                                title="Refresh template data">
                                <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                                <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                            </Button>
                            <Button variant="outline" onClick={openExportDialog}>
                                <Download className="h-4 w-4" />
                                <span className="hidden lg:block">Export CSV</span>
                            </Button>
                            <Button onClick={() => setIsDialogOpen(true)}>
                                <Plus className="h-4 w-4" />
                                <span>Create Template</span>
                            </Button>
                        </>
                    }
                />

                {/* Preview Template Dialog */}
                <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            {previewTemplate?.type === 'sms' ? (
                                <div className="p-4 border rounded">
                                    <div className="whitespace-pre-wrap">
                                        {previewTemplate?.message || previewTemplate?.content || ''}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-2">
                                        Characters:{' '}
                                        {
                                            (previewTemplate?.message || previewTemplate?.content || '')
                                                .length
                                        }
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="border rounded max-h-96 overflow-y-auto p-4"
                                    dangerouslySetInnerHTML={{
                                        __html: previewTemplate?.content || ''
                                    }}
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* CSV Export Dialog */}
                <GenerateCSV
                    open={isExportDialogOpen}
                    onOpenChange={setIsExportDialogOpen}
                    data={templates}
                    filename="templates"
                    title="Export Templates"
                    description="Select the template data fields you want to include in the export."
                    exportFields={csvExportFields}
                    formatRowData={formatTemplatesRowData}
                />

                {/* Delete Confirmation Dialog */}
                <ConfirmationDialog
                    open={deleteConfirmOpen}
                    onOpenChange={setDeleteConfirmOpen}
                    onConfirm={handleDeleteTemplate}
                    title="Delete Template"
                    description={`Are you sure you want to delete the template "${templateToDelete?.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                />

                {/* Create Template Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Template</DialogTitle>
                            <DialogDescription>Create a reusable email or SMS template</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="template-type">Template Type</Label>
                                <Select
                                    value={newTemplate.type}
                                    onValueChange={(value) => {
                                        setNewTemplate((prev) => ({
                                            ...prev,
                                            type: value,
                                            category: value,
                                            thumbnail: value === 'sms' ? '💬' : '📧'
                                        }));
                                    }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Email Template
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="sms">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4" />
                                                SMS Template
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="template-name">Template Name</Label>
                                <Input
                                    id="template-name"
                                    value={newTemplate.name}
                                    onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter template name"
                                />
                            </div>

                            <div>
                                <Label htmlFor="template-description">Description</Label>
                                <Input
                                    id="template-description"
                                    value={newTemplate.description}
                                    onChange={(e) =>
                                        setNewTemplate((prev) => ({
                                            ...prev,
                                            description: e.target.value
                                        }))
                                    }
                                    placeholder="Brief description of the template"
                                />
                            </div>

                            {newTemplate.type === 'email' && (
                                <div>
                                    <Label htmlFor="template-content">Email Content</Label>
                                    <RichTextEditor
                                        value={newTemplate.content}
                                        onChange={(value) =>
                                            setNewTemplate((prev) => ({ ...prev, content: value }))
                                        }
                                        placeholder="Enter template content..."
                                        type="email_template"
                                        availableLanguages={availableLanguages}
                                    />
                                </div>
                            )}

                            {newTemplate.type === 'sms' && (
                                <div>
                                    <Label htmlFor="template-message">SMS Message</Label>
                                    <Textarea
                                        id="template-message"
                                        value={newTemplate.message}
                                        onChange={(e) =>
                                            setNewTemplate((prev) => ({ ...prev, message: e.target.value }))
                                        }
                                        placeholder="SMS template content (160 characters recommended)"
                                        rows={4}
                                        maxLength={300}
                                    />
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {newTemplate.message?.length || 0}/300 characters
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="relative z-50">
                            <Button onClick={handleCreateTemplate} disabled={isCreatingTemplate}>
                                {isCreatingTemplate ? 'Creating...' : 'Create Template'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Template Dialog */}
                <Dialog
                    open={editingTemplate !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingTemplate(null);
                            setEditTemplateData({
                                name: '',
                                description: '',
                                content: '',
                                message: '',
                                type: 'email',
                                category: 'email',
                                thumbnail: '📧'
                            });
                        }
                    }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Template</DialogTitle>
                            <DialogDescription>Update your email or SMS template</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="edit-template-type">Template Type</Label>
                                <Select
                                    value={editTemplateData.type}
                                    onValueChange={(value) => {
                                        setEditTemplateData((prev) => ({
                                            ...prev,
                                            type: value,
                                            category: value,
                                            thumbnail: value === 'sms' ? '💬' : '📧'
                                        }));
                                    }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Email Template
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="sms">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4" />
                                                SMS Template
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="edit-template-name">Template Name</Label>
                                <Input
                                    id="edit-template-name"
                                    value={editTemplateData.name}
                                    onChange={(e) => setEditTemplateData((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter template name"
                                />
                            </div>

                            <div>
                                <Label htmlFor="edit-template-description">Description</Label>
                                <Input
                                    id="edit-template-description"
                                    value={editTemplateData.description}
                                    onChange={(e) =>
                                        setEditTemplateData((prev) => ({
                                            ...prev,
                                            description: e.target.value
                                        }))
                                    }
                                    placeholder="Brief description of the template"
                                />
                            </div>

                            {editTemplateData.type === 'email' && (
                                <div>
                                    <Label htmlFor="edit-template-content">Email Content</Label>
                                    <RichTextEditor
                                        value={editTemplateData.content}
                                        onChange={(value) =>
                                            setEditTemplateData((prev) => ({ ...prev, content: value }))
                                        }
                                        placeholder="Enter template content..."
                                        type="email_template"
                                        availableLanguages={availableLanguages}
                                    />
                                </div>
                            )}

                            {editTemplateData.type === 'sms' && (
                                <div>
                                    <Label htmlFor="edit-template-message">SMS Message</Label>
                                    <Textarea
                                        id="edit-template-message"
                                        value={editTemplateData.message}
                                        onChange={(e) =>
                                            setEditTemplateData((prev) => ({ ...prev, message: e.target.value }))
                                        }
                                        placeholder="SMS template content (160 characters recommended)"
                                        rows={4}
                                        maxLength={300}
                                    />
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {editTemplateData.message?.length || 0}/300 characters
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditingTemplate(null);
                                    setEditTemplateData({
                                        name: '',
                                        description: '',
                                        content: '',
                                        message: '',
                                        type: 'email',
                                        category: 'email',
                                        thumbnail: '📧'
                                    });
                                }}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateTemplate}>Update Template</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
