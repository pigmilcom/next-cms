// @/app/(backend)/admin/media/page.jsx

'use client';

import {
    Archive,
    CheckCircle,
    ChevronDown,
    Copy,
    Download,
    Eye,
    FileText,
    Filter,
    Image as ImageIcon,
    Loader2,
    Music,
    Search,
    Star,
    Trash2,
    Upload,
    Video,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadFiles } from '@/lib/server/admin.js';
import { createGalleryMedia, deleteGalleryMedia, getAllGalleryMedia, updateGalleryMedia } from '@/lib/server/media.js';

// Utility function to format file sizes
const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 10) / 10} ${sizes[i]}`;
};

// File preview component with support for different file types
const FilePreview = ({ file, className, onLoad }) => {
    const [previewLoaded, setPreviewLoaded] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);

    const handleLoad = () => {
        setPreviewLoaded(true);
        if (onLoad) onLoad();
    };

    const handleError = () => {
        setPreviewFailed(true);
        setPreviewLoaded(true);
    };

    // Get file icon based on category or extension
    const getFileIcon = (category, extension) => {
        if (category === 'images') return ImageIcon;
        if (category === 'documents') return FileText;
        if (category === 'audio') return Music;
        if (category === 'video') return Video;
        if (category === 'archives') return Archive;

        // Fallback based on extension
        if (['.pdf', '.doc', '.docx', '.txt'].includes(extension)) return FileText;
        if (['.mp3', '.wav', '.ogg'].includes(extension)) return Music;
        if (['.mp4', '.avi', '.mov'].includes(extension)) return Video;
        if (['.zip', '.rar', '.7z'].includes(extension)) return Archive;

        return FileText; // Default icon
    };

    const fileCategory = file.category || 'other';
    const fileExtension = file.extension || '';
    const isImage = fileCategory === 'images';
    const IconComponent = getFileIcon(fileCategory, fileExtension);

    return (
        <div className="relative w-full h-full overflow-hidden">
            {!previewLoaded && !previewFailed && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <div className="text-xs text-muted-foreground">Loading...</div>
                    </div>
                </div>
            )}

            {isImage ? (
                previewFailed ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                            <div className="text-xs">Failed to load</div>
                        </div>
                    </div>
                ) : (
                    <img
                        src={file.url}
                        alt={file.alt || file.originalName}
                        className={`${className} ${previewLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                        onLoad={handleLoad}
                        onError={handleError}
                        loading="lazy"
                    />
                )
            ) : (
                <div
                    className={`absolute inset-0 flex items-center justify-center bg-muted ${className}`}
                    onLoad={handleLoad}>
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                        <IconComponent className="h-12 w-12" />
                        <div className="text-xs font-medium text-center">
                            {fileExtension.toUpperCase().slice(1) || 'FILE'}
                        </div>
                        <div className="text-xs text-center truncate max-w-full">{file.originalName}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Lazy loading image component with animation (for backward compatibility)
const LazyImage = ({ src, alt, className, onLoad }) => {
    const fileObj = { url: src, alt, category: 'images', originalName: alt };
    return <FilePreview file={fileObj} className={className} onLoad={onLoad} />;
};

export default function GalleryPage() {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    // Filter states
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState('date-desc');
    const [featuredFilter, setFeaturedFilter] = useState('all');
    const [sizeFilter, setSizeFilter] = useState('all');
    const [_selectedFile, _setSelectedFile] = useState(null);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [updatingFeatured, setUpdatingFeatured] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const inputRef = useRef(null);
    const itemsPerPage = 10;

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return filterCategory !== 'all' || sortBy !== 'date-desc' || featuredFilter !== 'all' || sizeFilter !== 'all';
    };

    const fetchMedia = async (page = 1) => {
        try {
            setLoading(true);
            const response = await getAllGalleryMedia({
                page,
                limit: itemsPerPage,
                search: search || ''
            });

            console.log(response);

            // Handle response from admin function
            if (response?.success && response?.data) {
                let filteredData = response.data;

                // Apply client-side filters
                if (filterCategory !== 'all') {
                    filteredData = filteredData.filter((item) => item.category === filterCategory);
                }

                if (featuredFilter !== 'all') {
                    const isFeatured = featuredFilter === 'featured';
                    filteredData = filteredData.filter((item) => !!item.featured === isFeatured);
                }

                if (sizeFilter !== 'all') {
                    filteredData = filteredData.filter((item) => {
                        const sizeInMB = (item.size || 0) / (1024 * 1024);
                        switch (sizeFilter) {
                            case 'small':
                                return sizeInMB < 1;
                            case 'medium':
                                return sizeInMB >= 1 && sizeInMB < 10;
                            case 'large':
                                return sizeInMB >= 10;
                            default:
                                return true;
                        }
                    });
                }

                // Apply sorting
                filteredData.sort((a, b) => {
                    switch (sortBy) {
                        case 'date-asc':
                            return (
                                new Date(a.createdAt || a.uploadedAt || 0) - new Date(b.createdAt || b.uploadedAt || 0)
                            );
                        case 'date-desc':
                            return (
                                new Date(b.createdAt || b.uploadedAt || 0) - new Date(a.createdAt || a.uploadedAt || 0)
                            );
                        case 'name-asc':
                            return (a.originalName || a.filename || '').localeCompare(
                                b.originalName || b.filename || ''
                            );
                        case 'name-desc':
                            return (b.originalName || b.filename || '').localeCompare(
                                a.originalName || a.filename || ''
                            );
                        case 'size-asc':
                            return (a.size || 0) - (b.size || 0);
                        case 'size-desc':
                            return (b.size || 0) - (a.size || 0);
                        default:
                            return 0;
                    }
                });

                // Recalculate pagination for filtered data
                const totalFilteredItems = filteredData.length;
                const newTotalPages = Math.ceil(totalFilteredItems / itemsPerPage);
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedData = filteredData.slice(startIndex, endIndex);

                setMedia(paginatedData);
                setTotalPages(newTotalPages);
            } else {
                // Set defaults if response is not successful
                setMedia([]);
                setTotalPages(1);
                if (response?.error) {
                    console.error('Fetch error:', response.error);
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to fetch media');
            setMedia([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            setCurrentPage(1);
            fetchMedia(1);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [search, filterCategory, sortBy, featuredFilter, sizeFilter]);

    useEffect(() => {
        fetchMedia(currentPage);
    }, [currentPage]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (uploading) return; // Don't handle drag when uploading

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files?.[0]) {
            await handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = async (e) => {
        e.preventDefault();
        if (e.target.files?.[0]) {
            await handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        // Prevent multiple uploads
        if (uploading) {
            toast.error('Please wait for the current upload to finish');
            return;
        }

        // Validate file size (50MB limit for most files, 100MB for video/audio)
        const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
        const isVideoOrAudio = [
            '.mp4',
            '.avi',
            '.mov',
            '.wmv',
            '.flv',
            '.webm',
            '.mkv',
            '.m4v',
            '.3gp',
            '.mp3',
            '.wav',
            '.ogg',
            '.m4a',
            '.aac',
            '.flac',
            '.wma',
            '.aiff'
        ].includes(fileExtension);
        const maxSize = isVideoOrAudio ? 100 * 1024 * 1024 : 50 * 1024 * 1024; // 100MB for video/audio, 50MB for others

        if (file.size > maxSize) {
            const maxSizeMB = Math.round(maxSize / (1024 * 1024));
            toast.error(`File size must be less than ${maxSizeMB}MB`);
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            // Upload files directly using server function from admin.js
            const result = await uploadFiles([file], 'uploads');
            clearInterval(progressInterval);

            if (result.success && result.files?.length > 0) {
                setUploadProgress(100);

                const uploadedFile = result.files[0];

                // Create gallery media entry with additional metadata
                const mediaData = {
                    url: uploadedFile.url,
                    originalName: uploadedFile.originalName,
                    filename: uploadedFile.filename,
                    size: uploadedFile.size,
                    type: uploadedFile.type,
                    extension: uploadedFile.extension,
                    category: uploadedFile.category,
                    alt: uploadedFile.originalName.split('.')[0] || 'Uploaded File',
                    featured: false,
                    createdAt: new Date().toISOString()
                };

                const createResponse = await createGalleryMedia(mediaData);

                if (createResponse.success) {
                    // Add the new file to the current media state with the actual ID from server
                    const newFile = {
                        id: createResponse.data?.id || createResponse.data?.key || Date.now(),
                        key: createResponse.data?.key || createResponse.data?.id,
                        ...mediaData
                    };

                    setMedia((prevMedia) => [newFile, ...prevMedia]);

                    toast.success(
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            File uploaded successfully!
                        </div>
                    );

                    // Small delay to show success state before closing
                    setTimeout(() => {
                        setIsUploadDialogOpen(false);
                        setUploadProgress(0);

                        // Reset file input
                        if (inputRef.current) {
                            inputRef.current.value = '';
                        }
                    }, 800);
                } else {
                    throw new Error(createResponse.error || 'Failed to save file metadata');
                }
            } else {
                const errorMsg = result.error || 'Failed to upload file';
                toast.error(errorMsg);
                console.error('Upload failed:', errorMsg);
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(
                <div className="flex items-center gap-2">
                    <span className="text-destructive">✕</span>
                    {error.message || 'Failed to upload file'}
                </div>
            );

            // Reset file input on error
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            const result = await deleteGalleryMedia(itemToDelete.key || itemToDelete.id);

            if (result.success) {
                // Remove the item from the current media state
                setMedia((prevMedia) => prevMedia.filter((item) => item.id !== itemToDelete.id));

                toast.success('File deleted successfully');
                setDeleteDialogOpen(false);
                setItemToDelete(null);
            } else {
                throw new Error(result.error || 'Failed to delete file');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.message || 'Failed to delete file');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
        setIsDeleting(false);
    };

    const toggleFeatured = async (id, featured, key) => {
        setUpdatingFeatured(id);

        // Optimistically update the UI
        setMedia((prevMedia) => prevMedia.map((item) => (item.id === id ? { ...item, featured: !featured } : item)));

        try {
            const result = await updateGalleryMedia(key || id, { featured: !featured });

            if (result.success) {
                toast.success(featured ? 'File unfeatured' : 'File featured');
            } else {
                throw new Error(result.error || 'Failed to update file');
            }
        } catch (error) {
            console.error('Update error:', error);
            // Revert the optimistic update on error
            setMedia((prevMedia) => prevMedia.map((item) => (item.id === id ? { ...item, featured: featured } : item)));
            toast.error(error.message || 'Failed to update file');
        } finally {
            setUpdatingFeatured(null);
        }
    };

    const copyToClipboard = (url) => {
        navigator.clipboard.writeText(url);
        toast.success('URL copied to clipboard');
    };

    return (
        <div className="space-y-6">
            <AdminHeader title="Media Gallery" description="Manage your files and media" />

            {/* Search, Filters and Header Actions */}
            <div className="flex flex-col gap-3 lg:gap-4">
                {/* Top Row: Search and Header Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Search Input */}
                    <div className="relative w-full sm:max-w-sm lg:max-w-md">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            disabled={loading}
                            placeholder="Search files..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8"
                        />
                    </div>

                    {/* Header Actions - Right Side */}
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button disabled={loading || uploading} onClick={() => setIsUploadDialogOpen(true)}>
                            {uploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            {uploading ? 'Uploading...' : 'Upload Files'}
                        </Button>
                    </div>
                </div>

                {/* Filter Controls - Desktop */}
                <div className="hidden md:block">
                    <div className="flex flex-wrap gap-4">
                        <div className="min-w-[140px]">
                            <Label className="text-sm font-medium">Category</Label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="images">Images</SelectItem>
                                    <SelectItem value="documents">Documents</SelectItem>
                                    <SelectItem value="audio">Audio</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="archives">Archives</SelectItem>
                                    <SelectItem value="fonts">Fonts</SelectItem>
                                    <SelectItem value="data">Data</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-[140px]">
                            <Label className="text-sm font-medium">Sort By</Label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                    <SelectItem value="size-desc">Size (Largest)</SelectItem>
                                    <SelectItem value="size-asc">Size (Smallest)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-[140px]">
                            <Label className="text-sm font-medium">Featured</Label>
                            <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Files</SelectItem>
                                    <SelectItem value="featured">Featured Only</SelectItem>
                                    <SelectItem value="not-featured">Not Featured</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-[140px]">
                            <Label className="text-sm font-medium">Size</Label>
                            <Select value={sizeFilter} onValueChange={setSizeFilter}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sizes</SelectItem>
                                    <SelectItem value="small">Small (&lt; 1MB)</SelectItem>
                                    <SelectItem value="medium">Medium (1-10MB)</SelectItem>
                                    <SelectItem value="large">Large (&gt; 10MB)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {hasFiltersApplied() && (
                            <div className="min-w-[120px] flex items-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setFilterCategory('all');
                                        setSortBy('date-desc');
                                        setFeaturedFilter('all');
                                        setSizeFilter('all');
                                        setSearch('');
                                    }}
                                    className="h-9">
                                    <X className="mr-1 h-4 w-4" />
                                    Clear Filters
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter Controls - Mobile */}
                <div className="md:hidden">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                            className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                            {hasFiltersApplied() && (
                                <Badge
                                    variant="destructive"
                                    className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                                    {
                                        [filterCategory, sortBy, featuredFilter, sizeFilter].filter(
                                            (f) => f !== 'all' && f !== 'date-desc'
                                        ).length
                                    }
                                </Badge>
                            )}
                            <ChevronDown
                                className={`h-4 w-4 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`}
                            />
                        </Button>
                        {hasFiltersApplied() && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setFilterCategory('all');
                                    setSortBy('date-desc');
                                    setFeaturedFilter('all');
                                    setSizeFilter('all');
                                    setSearch('');
                                }}>
                                <X className="mr-1 h-4 w-4" />
                                Clear
                            </Button>
                        )}
                    </div>

                    {isFiltersExpanded && (
                        <div className="mt-4 space-y-3 p-4 border rounded-lg bg-muted/30">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-sm font-medium">Category</Label>
                                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="images">Images</SelectItem>
                                            <SelectItem value="documents">Documents</SelectItem>
                                            <SelectItem value="audio">Audio</SelectItem>
                                            <SelectItem value="video">Video</SelectItem>
                                            <SelectItem value="archives">Archives</SelectItem>
                                            <SelectItem value="fonts">Fonts</SelectItem>
                                            <SelectItem value="data">Data</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium">Featured</Label>
                                    <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Files</SelectItem>
                                            <SelectItem value="featured">Featured Only</SelectItem>
                                            <SelectItem value="not-featured">Not Featured</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <Label className="text-sm font-medium">Sort By</Label>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="date-desc">Date (Newest)</SelectItem>
                                            <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                            <SelectItem value="size-desc">Size (Largest)</SelectItem>
                                            <SelectItem value="size-asc">Size (Smallest)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium">Size</Label>
                                    <Select value={sizeFilter} onValueChange={setSizeFilter}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Sizes</SelectItem>
                                            <SelectItem value="small">Small (&lt; 1MB)</SelectItem>
                                            <SelectItem value="medium">Medium (1-10MB)</SelectItem>
                                            <SelectItem value="large">Large (&gt; 10MB)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                open={isUploadDialogOpen}
                onOpenChange={(open) => {
                    // Prevent closing dialog while uploading
                    if (uploading && !open) {
                        return;
                    }
                    setIsUploadDialogOpen(open);
                }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Files</DialogTitle>
                        <DialogDescription>
                            Drag and drop your files or click to browse. Supports images, documents, audio, video, and
                            more.
                        </DialogDescription>
                    </DialogHeader>
                    <div
                        className={`mt-4 grid place-items-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                            uploading
                                ? 'pointer-events-none border-primary bg-primary/10'
                                : dragActive
                                  ? 'border-primary bg-primary/5'
                                  : 'cursor-pointer border-muted hover:border-primary/50 hover:bg-primary/5'
                        }`}
                        onDragEnter={!uploading ? handleDrag : undefined}
                        onDragLeave={!uploading ? handleDrag : undefined}
                        onDragOver={!uploading ? handleDrag : undefined}
                        onDrop={!uploading ? handleDrop : undefined}
                        onClick={!uploading ? () => inputRef.current?.click() : undefined}>
                        <div className="flex flex-col items-center gap-2">
                            {uploading ? (
                                <>
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="font-medium text-primary text-sm">Uploading file...</p>
                                    <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-muted-foreground text-xs">{Math.round(uploadProgress)}%</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-muted-foreground text-sm">
                                        Drop your files here or click to browse
                                    </p>
                                    <p className="text-muted-foreground/70 text-xs">
                                        Images, documents, audio, video, and more - up to 50MB (100MB for video/audio)
                                    </p>
                                </>
                            )}
                        </div>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="*/*"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="hidden"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-4 w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[200px] w-full" />
                            </CardContent>
                            <CardFooter>
                                <Skeleton className="h-8 w-full" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : media.length === 0 ? (
                <div className="py-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 font-semibold text-sm">No files</h3>
                    <p className="mt-1 text-muted-foreground text-sm">Upload files to get started</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {media.map((item) => (
                            <Card key={item.id} className="group">
                                <CardHeader className="relative">
                                    <Button
                                        role="button"
                                        variant="ghost"
                                        size="icon"
                                        className={`absolute -top-2 right-2 z-10 ${
                                            item.featured ? 'text-yellow-500' : 'text-muted-foreground'
                                        }`}
                                        onClick={() => toggleFeatured(item.id, item.featured, item.key)}
                                        disabled={updatingFeatured === item.id}>
                                        {updatingFeatured === item.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Star className="h-4 w-4" />
                                        )}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                                        <FilePreview
                                            file={item}
                                            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                    <div className="text-xs text-muted-foreground text-center truncate w-full">
                                        {item.originalName || item.filename || 'Unknown file'}
                                    </div>
                                    <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                                        {item.category && (
                                            <span className="font-medium uppercase tracking-wider">
                                                {item.category}
                                            </span>
                                        )}
                                        {item.size && <span className="ml-auto">{formatFileSize(item.size)}</span>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 w-full">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyToClipboard(item.url)}
                                            className="flex-1">
                                            <Copy className="h-4 w-4" />
                                            <span className="truncate hidden xl:block xl:ms-2">Copy URL</span>
                                        </Button>
                                        {item.category === 'images' || item.url ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(item.url, '_blank')}
                                                className="flex-1">
                                                <Eye className="h-4 w-4" />
                                                <span className="truncate hidden xl:block xl:ms-2">View</span>
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(item.url, '_blank')}
                                                className="flex-1">
                                                <Download className="mr-2 h-4 w-4" />
                                                <span className="truncate">Download</span>
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(item)}
                                        disabled={isDeleting && itemToDelete?.id === item.id}
                                        className="w-full">
                                        {isDeleting && itemToDelete?.id === item.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="mr-2 h-4 w-4" />
                                        )}
                                        <span className="truncate">Delete</span>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-6 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            className={
                                                currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                                            }
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                onClick={() => setCurrentPage(page)}
                                                isActive={page === currentPage}
                                                className="cursor-pointer">
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            className={
                                                currentPage === totalPages
                                                    ? 'pointer-events-none opacity-50'
                                                    : 'cursor-pointer'
                                            }
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete File</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this file? This action cannot be undone and will permanently
                            remove the file from your gallery.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleDeleteCancel} disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete File'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
