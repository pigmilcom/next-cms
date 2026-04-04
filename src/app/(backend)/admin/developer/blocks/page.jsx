'use client';

import {
    Code,
    Copy,
    Download,
    Edit,
    Eye,
    FileText,
    Image,
    Layout,
    MoreVertical,
    Plus,
    Search,
    Trash2,
    Type,
    Video,
    Youtube
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { createBlock, deleteBlock, getAllBlocks, updateBlock } from '@/lib/server/admin';

const blockTypes = [
    {
        value: 'text',
        label: 'Text Block',
        icon: Type,
        description: 'Simple text content with basic formatting'
    },
    {
        value: 'html',
        label: 'HTML Block',
        icon: Code,
        description: 'Custom HTML code with CSS and JavaScript'
    },
    {
        value: 'image',
        label: 'Image Block',
        icon: Image,
        description: 'Display images from URL or uploaded files'
    },
    {
        value: 'video',
        label: 'Video Block',
        icon: Video,
        description: 'Embed video files or streaming URLs'
    },
    {
        value: 'youtube',
        label: 'YouTube Block',
        icon: Youtube,
        description: 'Embed YouTube videos with iframe'
    },
    {
        value: 'form',
        label: 'Form Block',
        icon: FileText,
        description: 'Contact forms and data collection'
    },
    {
        value: 'layout',
        label: 'Layout Block',
        icon: Layout,
        description: 'Grid and container layouts'
    }
];

const initialFormData = {
    name: '',
    description: '',
    type: 'text',
    content: '',
    data: {},
    settings: {},
    isActive: true
};

export default function BlocksPage() {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch blocks with pagination
    const fetchBlocks = async (page = currentPage) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                search: search.trim(),
                type: filterType,
                status: filterStatus,
                sortBy: 'updatedAt',
                sortOrder: 'desc'
            };

            const result = await getAllBlocks(params);

            if (result.success) {
                setBlocks(result.data || []);
                setPagination(result.pagination);
            } else {
                toast.error(result.error || 'Failed to load blocks');
                setBlocks([]);
            }
        } catch (error) {
            console.error('Error fetching blocks:', error);
            toast.error('Failed to load blocks');
            setBlocks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocks(1);
        setCurrentPage(1);
    }, [search, filterType, filterStatus]);

    useEffect(() => {
        if (currentPage !== pagination.page) {
            fetchBlocks(currentPage);
        }
    }, [currentPage]);

    // Handle form input changes
    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            // Handle nested objects like data.videoUrl
            const [parent, child] = field.split('.');
            setFormData((prev) => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [field]: value
            }));
        }
    };

    // Generate block ID from name
    const generateBlockId = (name) => {
        const baseId = name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .trim();
        return `${baseId}_${Date.now()}`;
    };

    // Handle create block
    const handleCreate = async () => {
        try {
            if (!formData.name.trim()) {
                toast.error('Block name is required');
                return;
            }

            setIsSubmitting(true);

            const blockData = {
                ...formData,
                id: generateBlockId(formData.name)
            };

            const result = await createBlock(blockData);

            if (result.success) {
                toast.success('Block created successfully');
                setIsCreateOpen(false);
                setFormData(initialFormData);
                fetchBlocks();
            } else {
                toast.error(result.error || 'Failed to create block');
            }
        } catch (error) {
            console.error('Error creating block:', error);
            toast.error('Failed to create block');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle edit block
    const handleEdit = (block) => {
        setFormData({
            name: block.name || '',
            description: block.description || '',
            type: block.type || 'text',
            content: block.content || '',
            data: block.data || {},
            settings: block.settings || {},
            isActive: block.isActive !== false
        });
        setSelectedBlock(block);
        setIsEditOpen(true);
    };

    // Handle update block
    const handleUpdate = async () => {
        try {
            if (!formData.name.trim()) {
                toast.error('Block name is required');
                return;
            }

            setIsSubmitting(true);

            const result = await updateBlock(selectedBlock.id, formData);

            if (result.success) {
                toast.success('Block updated successfully');
                setIsEditOpen(false);
                setSelectedBlock(null);
                setFormData(initialFormData);
                fetchBlocks();
            } else {
                toast.error(result.error || 'Failed to update block');
            }
        } catch (error) {
            console.error('Error updating block:', error);
            toast.error('Failed to update block');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle view block
    const handleView = (block) => {
        setSelectedBlock(block);
        setIsViewOpen(true);
    };

    // Handle delete block
    const handleDelete = (block) => {
        setSelectedBlock(block);
        setIsDeleteOpen(true);
    };

    // Confirm delete
    const handleDeleteConfirm = async () => {
        try {
            setIsSubmitting(true);

            const result = await deleteBlock(selectedBlock.id);

            if (result.success) {
                toast.success('Block deleted successfully');
                setIsDeleteOpen(false);
                setSelectedBlock(null);
                fetchBlocks();
            } else {
                toast.error(result.error || 'Failed to delete block');
            }
        } catch (error) {
            console.error('Error deleting block:', error);
            toast.error('Failed to delete block');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle copy block ID
    const handleCopyId = (blockId) => {
        navigator.clipboard.writeText(blockId);
        toast.success('Block ID copied to clipboard');
    };

    // Get block type info
    const getBlockTypeInfo = (type) => {
        return blockTypes.find((bt) => bt.value === type) || blockTypes[0];
    };

    // Render block type specific form fields
    const renderTypeSpecificFields = () => {
        switch (formData.type) {
            case 'text':
                return (
                    <div>
                        <Label htmlFor="content">Text Content</Label>
                        <Textarea
                            id="content"
                            value={formData.content}
                            onChange={(e) => handleInputChange('content', e.target.value)}
                            placeholder="Enter your text content..."
                            rows={4}
                        />
                    </div>
                );

            case 'html':
                return (
                    <>
                        <div>
                            <Label htmlFor="content">HTML Code</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => handleInputChange('content', e.target.value)}
                                placeholder="<div>Your HTML content...</div>"
                                rows={6}
                                className="font-mono"
                            />
                        </div>
                        <div>
                            <Label htmlFor="cssCode">CSS Code (Optional)</Label>
                            <Textarea
                                id="cssCode"
                                value={formData.data.css || ''}
                                onChange={(e) => handleInputChange('data.css', e.target.value)}
                                placeholder=".your-class { color: #000; }"
                                rows={3}
                                className="font-mono"
                            />
                        </div>
                        <div>
                            <Label htmlFor="jsCode">JavaScript Code (Optional)</Label>
                            <Textarea
                                id="jsCode"
                                value={formData.data.js || ''}
                                onChange={(e) => handleInputChange('data.js', e.target.value)}
                                placeholder="console.log('Hello World');"
                                rows={3}
                                className="font-mono"
                            />
                        </div>
                    </>
                );

            case 'image':
                return (
                    <>
                        <div>
                            <Label htmlFor="imageUrl">Image URL</Label>
                            <Input
                                id="imageUrl"
                                value={formData.data.imageUrl || ''}
                                onChange={(e) => handleInputChange('data.imageUrl', e.target.value)}
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>
                        <div>
                            <Label htmlFor="altText">Alt Text</Label>
                            <Input
                                id="altText"
                                value={formData.data.altText || ''}
                                onChange={(e) => handleInputChange('data.altText', e.target.value)}
                                placeholder="Describe the image..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="caption">Caption (Optional)</Label>
                            <Input
                                id="caption"
                                value={formData.data.caption || ''}
                                onChange={(e) => handleInputChange('data.caption', e.target.value)}
                                placeholder="Image caption..."
                            />
                        </div>
                    </>
                );

            case 'video':
                return (
                    <>
                        <div>
                            <Label htmlFor="videoUrl">Video URL</Label>
                            <Input
                                id="videoUrl"
                                value={formData.data.videoUrl || ''}
                                onChange={(e) => handleInputChange('data.videoUrl', e.target.value)}
                                placeholder="https://example.com/video.mp4"
                            />
                        </div>
                        <div>
                            <Label htmlFor="posterUrl">Poster Image URL (Optional)</Label>
                            <Input
                                id="posterUrl"
                                value={formData.data.posterUrl || ''}
                                onChange={(e) => handleInputChange('data.posterUrl', e.target.value)}
                                placeholder="https://example.com/poster.jpg"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="autoplay"
                                checked={formData.data.autoplay || false}
                                onCheckedChange={(checked) => handleInputChange('data.autoplay', checked)}
                            />
                            <Label htmlFor="autoplay">Autoplay</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="controls"
                                checked={formData.data.controls !== false}
                                onCheckedChange={(checked) => handleInputChange('data.controls', checked)}
                            />
                            <Label htmlFor="controls">Show Controls</Label>
                        </div>
                    </>
                );

            case 'youtube':
                return (
                    <>
                        <div>
                            <Label htmlFor="youtubeUrl">YouTube Video URL</Label>
                            <Input
                                id="youtubeUrl"
                                value={formData.data.youtubeUrl || ''}
                                onChange={(e) => handleInputChange('data.youtubeUrl', e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                            />
                        </div>
                        <div>
                            <Label htmlFor="width">Width (Optional)</Label>
                            <Input
                                id="width"
                                value={formData.data.width || ''}
                                onChange={(e) => handleInputChange('data.width', e.target.value)}
                                placeholder="560"
                            />
                        </div>
                        <div>
                            <Label htmlFor="height">Height (Optional)</Label>
                            <Input
                                id="height"
                                value={formData.data.height || ''}
                                onChange={(e) => handleInputChange('data.height', e.target.value)}
                                placeholder="315"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="autoplay"
                                checked={formData.data.autoplay || false}
                                onCheckedChange={(checked) => handleInputChange('data.autoplay', checked)}
                            />
                            <Label htmlFor="autoplay">Autoplay</Label>
                        </div>
                    </>
                );

            case 'form':
                return (
                    <>
                        <div>
                            <Label htmlFor="formTitle">Form Title</Label>
                            <Input
                                id="formTitle"
                                value={formData.data.formTitle || ''}
                                onChange={(e) => handleInputChange('data.formTitle', e.target.value)}
                                placeholder="Contact Form"
                            />
                        </div>
                        <div>
                            <Label htmlFor="submitUrl">Submit URL</Label>
                            <Input
                                id="submitUrl"
                                value={formData.data.submitUrl || ''}
                                onChange={(e) => handleInputChange('data.submitUrl', e.target.value)}
                                placeholder="/api/contact"
                            />
                        </div>
                        <div>
                            <Label htmlFor="fields">Form Fields (JSON)</Label>
                            <Textarea
                                id="fields"
                                value={formData.data.fields || ''}
                                onChange={(e) => handleInputChange('data.fields', e.target.value)}
                                placeholder='[{"name": "email", "type": "email", "label": "Email", "required": true}]'
                                rows={4}
                                className="font-mono"
                            />
                        </div>
                    </>
                );

            case 'layout':
                return (
                    <>
                        <div>
                            <Label htmlFor="layoutType">Layout Type</Label>
                            <Select
                                value={formData.data.layoutType || 'container'}
                                onValueChange={(value) => handleInputChange('data.layoutType', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select layout type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="container">Container</SelectItem>
                                    <SelectItem value="grid">Grid</SelectItem>
                                    <SelectItem value="flexbox">Flexbox</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="columns">Columns (for grid)</Label>
                            <Input
                                id="columns"
                                type="number"
                                value={formData.data.columns || ''}
                                onChange={(e) => handleInputChange('data.columns', e.target.value)}
                                placeholder="3"
                            />
                        </div>
                        <div>
                            <Label htmlFor="gap">Gap Size</Label>
                            <Input
                                id="gap"
                                value={formData.data.gap || ''}
                                onChange={(e) => handleInputChange('data.gap', e.target.value)}
                                placeholder="1rem"
                            />
                        </div>
                    </>
                );

            default:
                return null;
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <AdminHeader title="Content Blocks" description="Create and manage reusable content blocks">
                    <Button disabled>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Block
                    </Button>
                </AdminHeader>
                <TableSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <AdminHeader title="Content Blocks" description="Create and manage reusable content blocks">
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Block
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Block</DialogTitle>
                            <DialogDescription>
                                Create a reusable content block that can be used throughout your site.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Basic Info */}
                            <div>
                                <Label htmlFor="name">Block Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="Enter block name..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Brief description of this block..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="type">Block Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => handleInputChange('type', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select block type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {blockTypes.map((type) => {
                                            const Icon = type.icon;
                                            return (
                                                <SelectItem key={type.value} value={type.value}>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4" />
                                                        <div>
                                                            <div className="font-medium">{type.label}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {type.description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Type-specific fields */}
                            {renderTypeSpecificFields()}

                            {/* Status */}
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                                />
                                <Label htmlFor="isActive">Active (visible to frontend)</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create Block'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminHeader>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
                                <Input
                                    placeholder="Search blocks..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {blockTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Blocks Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Blocks ({pagination.total})</CardTitle>
                    <CardDescription>
                        Manage your content blocks. Use the Block ID in your frontend components.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {blocks.length === 0 ? (
                        <div className="py-12 text-center">
                            <Layout className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                            <h3 className="mb-2 font-medium text-lg">No blocks found</h3>
                            <p className="mb-4 text-muted-foreground">
                                Create your first content block to get started.
                            </p>
                            <Button onClick={() => setIsCreateOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Block
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Updated</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blocks.map((block) => {
                                        const typeInfo = getBlockTypeInfo(block.type);
                                        const Icon = typeInfo.icon;

                                        return (
                                            <TableRow key={block.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{block.name}</div>
                                                        {block.description && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {block.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                                                            {block.id}
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCopyId(block.id)}>
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4" />
                                                        <span>{typeInfo.label}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={block.isActive ? 'success' : 'secondary'}>
                                                        {block.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {formatDate(block.updatedAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleView(block)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(block)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(block)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total blocks)
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!pagination.hasPrev}
                                    onClick={() => setCurrentPage(currentPage - 1)}>
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!pagination.hasNext}
                                    onClick={() => setCurrentPage(currentPage + 1)}>
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Block</DialogTitle>
                        <DialogDescription>Update the block configuration and content.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Basic Info */}
                        <div>
                            <Label htmlFor="edit-name">Block Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Enter block name..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Brief description of this block..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-type">Block Type</Label>
                            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select block type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {blockTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4" />
                                                    <div>
                                                        <div className="font-medium">{type.label}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {type.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Type-specific fields */}
                        {renderTypeSpecificFields()}

                        {/* Status */}
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                            />
                            <Label htmlFor="edit-isActive">Active (visible to frontend)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update Block'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>View Block</DialogTitle>
                        <DialogDescription>Block details and usage information.</DialogDescription>
                    </DialogHeader>
                    {selectedBlock && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium">Block ID</h3>
                                <div className="flex items-center gap-2">
                                    <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                                        {selectedBlock.id}
                                    </code>
                                    <Button variant="ghost" size="sm" onClick={() => handleCopyId(selectedBlock.id)}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-medium">Usage Example</h3>
                                <code className="block rounded bg-muted p-3 text-sm">
                                    {`<BlockEl id="${selectedBlock.id}" />`}
                                </code>
                            </div>
                            <div>
                                <h3 className="font-medium">Type</h3>
                                <p>{getBlockTypeInfo(selectedBlock.type).label}</p>
                            </div>
                            {selectedBlock.description && (
                                <div>
                                    <h3 className="font-medium">Description</h3>
                                    <p>{selectedBlock.description}</p>
                                </div>
                            )}
                            <div>
                                <h3 className="font-medium">Status</h3>
                                <Badge variant={selectedBlock.isActive ? 'success' : 'secondary'}>
                                    {selectedBlock.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Block</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedBlock?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isSubmitting}>
                            {isSubmitting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
