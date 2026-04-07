// @/app/(backend)/admin/developer/database/page.jsx

'use client';

import {
    Activity,
    AlertTriangle,
    Database,
    Download,
    Edit,
    Eye,
    HardDrive,
    Plus,
    RefreshCw,
    Search,
    Settings,
    Table,
    Trash2,
    Upload,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import {
    createCollection as createCollectionAction,
    dbCreate,
    dbDelete,
    dbReadAll,
    deleteCollection as deleteCollectionAction,
    getDatabaseActivities,
    getDatabaseInfo,
    getCollectionData,
    logDatabaseActivity
} from '@/lib/server/database.js';
import { createDatabaseBackup, getBackupHistory, deleteBackup, importBackup, restoreBackupFromUrl } from '@/lib/server/maintenance.js';

export default function DatabasePage() {
    const [selectedTab, setSelectedTab] = useState('collections');
    const [searchTerm, setSearchTerm] = useState('');
    const [collections, setCollections] = useState([]);
    const [activities, setActivities] = useState([]);
    const [backups, setBackups] = useState([]);
    const [dbStats, setDbStats] = useState({
        totalCollections: 0,
        totalEntries: 0,
        totalSize: '0 MB',
        connections: 0,
        uptime: '0 days',
        provider: 'Unknown'
    });

    // Modal states
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [collectionData, setCollectionData] = useState([]);
    const [_editingItem, setEditingItem] = useState(null);

    // New collection form state
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionFields, setNewCollectionFields] = useState([{ name: '', type: 'text', required: false }]);

    // Confirmation dialog states
    const [deleteCollectionDialog, setDeleteCollectionDialog] = useState({ open: false, collectionName: '' });
    const [restoreBackupDialog, setRestoreBackupDialog] = useState({ open: false, backup: null });
    const [deleteBackupDialog, setDeleteBackupDialog] = useState({ open: false, backupId: '', backupName: '' });
    const [deleteDocumentDialog, setDeleteDocumentDialog] = useState({ open: false, item: null });

    // File upload dialog states
    const [fileUploadOpen, setFileUploadOpen] = useState(false);
    const [uploadedBackupData, setUploadedBackupData] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState('');

    // Consolidated loading states
    const [loading, setLoading] = useState({
        database: true,
        activities: true,
        backups: true,
        view: false,
        edit: false,
        create: false,
        delete: false,
        createBackup: false,
        restoreBackup: false,
        deleteBackup: false
    });
    const [backupProgress, setBackupProgress] = useState({ current: 0, total: 0, operation: '' });

    // Fetch database information using server function
    const fetchDatabaseInfo = async () => {
        try {
            setLoading((prev) => ({ ...prev, database: true }));

            const response = await getDatabaseInfo({ duration: '5M' });
            
            if (response?.success && response.data) {
                setCollections(response.data.collections || []);
                setDbStats(response.data.stats || {
                    totalCollections: 0,
                    totalEntries: 0,
                    totalSize: '0 MB',
                    connections: 0,
                    uptime: '0 days',
                    provider: 'Unknown'
                });
            } else {
                toast.error('Failed to load database information');
            }
        } catch (error) {
            console.error('Error fetching database info:', error);
            toast.error('Failed to load database information');
        } finally {
            setLoading((prev) => ({ ...prev, database: false }));
        }
    };

    // Fetch activities
    const fetchActivities = async () => {
        try {
            setLoading((prev) => ({ ...prev, activities: true }));
            const response = await getDatabaseActivities({ limit: 20, duration: '3M' });
            
            if (response?.success && response.data) {
                setActivities(response.data);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading((prev) => ({ ...prev, activities: false }));
        }
    };

    // Fetch backups
    const fetchBackups = async () => {
        try {
            setLoading((prev) => ({ ...prev, backups: true }));
            const response = await getBackupHistory({ duration: '5M' });
            
            if (response?.success && response.data) {
                setBackups(response.data);
            }
        } catch (error) {
            console.error('Error fetching backups:', error);
        } finally {
            setLoading((prev) => ({ ...prev, backups: false }));
        }
    };

    useEffect(() => {
        fetchDatabaseInfo();
        fetchActivities();
        fetchBackups();
    }, []);

    const filteredCollections = collections.filter((collection) =>
        collection.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRefresh = async () => {
        await Promise.all([
            fetchDatabaseInfo(),
            fetchActivities(),
            fetchBackups()
        ]);
        toast.success('Database information refreshed');
    };

    const handleViewCollection = async (collectionName) => {
        try {
            setLoading((prev) => ({ ...prev, view: true }));
            const response = await getCollectionData(collectionName, { duration: '3M' });
            
            if (response?.success && response.data) {
                const entries = Array.isArray(response.data) ? response.data : Object.values(response.data);
                setSelectedCollection(collectionName);
                setCollectionData(entries);
                setViewModalOpen(true);
            } else {
                toast.error(`Failed to load collection: ${collectionName}`);
            }
        } catch (error) {
            console.error('Error viewing collection:', error);
            toast.error('Failed to load collection data');
        } finally {
            setLoading((prev) => ({ ...prev, view: false }));
        }
    };

    const handleEditCollection = async (collectionName) => {
        try {
            setLoading((prev) => ({ ...prev, edit: true }));
            const response = await getCollectionData(collectionName, { duration: '3M' });
            
            if (response?.success && response.data) {
                const entries = Array.isArray(response.data) ? response.data : Object.values(response.data);
                setSelectedCollection(collectionName);
                setCollectionData(entries);
                setEditModalOpen(true);
            } else {
                toast.error(`Failed to load collection: ${collectionName}`);
            }
        } catch (error) {
            console.error('Error loading collection for edit:', error);
            toast.error('Failed to load collection data');
        } finally {
            setLoading((prev) => ({ ...prev, edit: false }));
        }
    };

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) {
            toast.error('Collection name is required');
            return;
        }

        try {
            setLoading((prev) => ({ ...prev, create: true }));
            
            // Create a sample document with the defined fields
            const sampleData = {};
            newCollectionFields.forEach((field) => {
                if (field.name.trim()) {
                    sampleData[field.name] =
                        field.type === 'number'
                            ? 0
                            : field.type === 'boolean'
                              ? false
                              : field.type === 'date'
                                ? new Date().toISOString()
                                : '';
                }
            });

            // Add metadata
            const document = {
                ...sampleData,
                _isTemplate: true,
                _createdAt: new Date().toISOString(),
                _fields: newCollectionFields.filter((f) => f.name.trim())
            };

            const response = await createCollectionAction(newCollectionName, [document]);
            
            if (response?.success) {
                // Log activity
                await logDatabaseActivity({
                    action: 'Collection Created',
                    collection: newCollectionName,
                    timestamp: new Date().toISOString(),
                    user: 'Admin',
                    details: `Collection ${newCollectionName} created with ${newCollectionFields.length} fields`
                });

                toast.success(`Collection ${newCollectionName} created successfully`);
                setCreateModalOpen(false);
                setNewCollectionName('');
                setNewCollectionFields([{ name: '', type: 'text', required: false }]);
                fetchDatabaseInfo();
            } else {
                toast.error(response?.error || 'Failed to create collection');
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            toast.error('Failed to create collection');
        } finally {
            setLoading((prev) => ({ ...prev, create: false }));
        }
    };

    const addField = () => {
        setNewCollectionFields([...newCollectionFields, { name: '', type: 'text', required: false }]);
    };

    const removeField = (index) => {
        if (newCollectionFields.length > 1) {
            setNewCollectionFields(newCollectionFields.filter((_, i) => i !== index));
        }
    };

    const updateField = (index, field, value) => {
        const updated = [...newCollectionFields];
        updated[index][field] = value;
        setNewCollectionFields(updated);
    };

    const handleDeleteCollection = async (collectionName) => {
        setDeleteCollectionDialog({ open: true, collectionName });
    };

    const confirmDeleteCollection = async () => {
        const { collectionName } = deleteCollectionDialog;
        setDeleteCollectionDialog({ open: false, collectionName: '' });

        try {
            setLoading((prev) => ({ ...prev, delete: true }));
            
            const response = await deleteCollectionAction(collectionName);
            
            if (response?.success) {
                // Log activity
                await logDatabaseActivity({
                    action: 'Collection Deleted',
                    collection: collectionName,
                    timestamp: new Date().toISOString(),
                    user: 'Admin',
                    details: `Collection ${collectionName} deleted successfully`
                });

                toast.success(`Collection ${collectionName} deleted successfully`);
                fetchDatabaseInfo();
                fetchActivities();
            } else {
                toast.error(response?.error || 'Failed to delete collection');
            }
        } catch (error) {
            setLoading((prev) => ({ ...prev, delete: false }));
            console.error('Error deleting collection:', error);
            toast.error('Failed to delete collection');
        }
    };

    const handleBackupCollection = async (collectionName) => {
        try {
            setLoading((prev) => ({ ...prev, view: true }));
            const response = await getCollectionData(collectionName, { duration: '1M' });
            
            if (response?.success && response.data) {
                const dataStr = JSON.stringify(response.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${collectionName}-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Log activity
                await logDatabaseActivity({
                    action: 'Collection Exported',
                    collection: collectionName,
                    timestamp: new Date().toISOString(),
                    user: 'Admin',
                    details: `Collection ${collectionName} exported as backup`
                });

                toast.success(`Collection ${collectionName} exported successfully`);
                fetchActivities();
            } else {
                toast.error('Failed to export collection');
            }
        } catch (error) {
            console.error('Error backing up collection:', error);
            toast.error('Failed to backup collection');
        } finally {
            setLoading((prev) => ({ ...prev, view: false }));
        }
    };

    const handleCreateFullBackup = async () => {
        try {
            setLoading((prev) => ({ ...prev, createBackup: true }));
            setBackupProgress({ current: 0, total: 1, operation: 'Creating database backup...' });
            
            const response = await createDatabaseBackup({ userId: 'Admin' });
            
            if (response?.success) {
                setBackupProgress({ current: 1, total: 1, operation: 'Backup completed successfully!' });
                
                setTimeout(() => {
                    toast.success('Database backup created successfully');
                    fetchBackups();
                    fetchActivities();
                }, 500);
            } else {
                toast.error(response?.error || 'Failed to create backup');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            toast.error('Failed to create backup');
        } finally {
            setTimeout(() => {
                setLoading((prev) => ({ ...prev, createBackup: false }));
                setBackupProgress({ current: 0, total: 0, operation: '' });
            }, 1000);
        }
    };

    const handleRestoreBackup = async (backup) => {
        setRestoreBackupDialog({ open: true, backup });
    };

    const confirmRestoreBackup = async (clearExisting = true) => {
        const backup = restoreBackupDialog.backup;
        setRestoreBackupDialog({ open: false, backup: null });

        try {
            setLoading((prev) => ({ ...prev, restoreBackup: true }));
            setBackupProgress({ current: 0, total: 1, operation: 'Preparing restore...' });

            if (!backup?.fileUrl) {
                toast.error('Backup file URL not found');
                return;
            }

            // Fetch and restore server-side to avoid CORS issues with S3/CDN
            const importResponse = await restoreBackupFromUrl(backup.fileUrl, {
                clearExisting,
                userId: 'Admin'
            });

            if (importResponse?.success) {
                setBackupProgress({ current: 1, total: 1, operation: 'Restore completed successfully!' });

                setTimeout(() => {
                    toast.success('Database restored successfully from backup');
                    fetchDatabaseInfo();
                    fetchActivities();
                }, 500);
            } else {
                toast.error(importResponse?.error || 'Failed to restore backup');
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            toast.error('Failed to restore backup');
        } finally {
            setTimeout(() => {
                setLoading((prev) => ({ ...prev, restoreBackup: false }));
                setBackupProgress({ current: 0, total: 0, operation: '' });
            }, 1000);
        }
    };

    const handleDownloadBackup = async (backup) => {
        try {
            if (!backup.fileUrl) {
                toast.error('Backup file URL not found');
                return;
            }

            toast.info('Downloading backup...');

            const link = document.createElement('a');
            link.href = backup.fileUrl;
            link.download = backup.filename || 'backup.json';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                toast.success('Backup download started');
            }, 100);
        } catch (error) {
            console.error('Error downloading backup:', error);
            toast.error('Failed to download backup');
        }
    };

    const handleDeleteBackup = async (backupId, backupName) => {
        setDeleteBackupDialog({ open: true, backupId, backupName });
    };

    const confirmDeleteBackup = async () => {
        const { backupId } = deleteBackupDialog;
        setDeleteBackupDialog({ open: false, backupId: '', backupName: '' });

        try {
            setLoading((prev) => ({ ...prev, deleteBackup: true }));
            const result = await deleteBackup(backupId);
            if (result?.success) {
                toast.success(result.message || 'Backup deleted successfully');
                // Remove the backup from state
                setBackups((prevBackups) => prevBackups.filter((backup) => backup.id !== backupId));
            } else {
                toast.error(result?.error || 'Failed to delete backup');
            }
        } catch (error) {
            console.error('Error deleting backup:', error);
            toast.error('Failed to delete backup');
        } finally {
            setLoading((prev) => ({ ...prev, deleteBackup: false }));
        }
    };

    const confirmDeleteDocument = async () => {
        const { item } = deleteDocumentDialog;
        setDeleteDocumentDialog({ open: false, item: null });

        try {
            await dbDelete(item.id, selectedCollection);
            toast.success('Document deleted');
            handleEditCollection(selectedCollection);
        } catch (_error) {
            toast.error('Failed to delete document');
        }
    };

    const handleFileSelect = async (file) => {
        if (!file) return;

        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        if (fileExtension !== 'json') {
            toast.error('Please select a valid JSON backup file');
            return;
        }

        try {
            const fileContent = await readFileContent(file);
            let backupData = null;

            try {
                const parsed = JSON.parse(fileContent);
                if (typeof parsed === 'object' && parsed !== null) {
                    if (!parsed.version && !parsed.data) {
                        backupData = {
                            version: '1.0',
                            timestamp: new Date().toISOString(),
                            provider: 'unknown',
                            recordCount: 0,
                            data: Object.entries(parsed).map(([key, data]) => ({ key, data }))
                        };
                    } else {
                        backupData = parsed;
                    }
                } else {
                    throw new Error('Invalid JSON backup format');
                }
            } catch (_error) {
                toast.error('Invalid JSON backup file format');
                return;
            }

            setUploadedBackupData(backupData);
            setUploadedFileName(fileName);
            toast.success('Backup file loaded successfully');
        } catch (error) {
            console.error('Error reading file:', error);
            toast.error('Failed to read backup file');
        }
    };

    const readFileContent = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const confirmFileRestore = async (clearExisting = true) => {
        try {
            setLoading((prev) => ({ ...prev, restoreBackup: true }));
            setFileUploadOpen(false);
            const operation = clearExisting
                ? 'Clearing existing data and restoring from uploaded file...'
                : 'Merging backup data from uploaded file...';
            setBackupProgress({ current: 0, total: 1, operation });

            // Import backup using server function (content string, not browser-incompatible Buffer)
            const importResponse = await importBackup(
                { name: uploadedFileName, content: JSON.stringify(uploadedBackupData) },
                { clearExisting, userId: 'Admin' }
            );

            if (importResponse?.success) {
                setBackupProgress({ current: 1, total: 1, operation: 'Restore completed successfully!' });

                setTimeout(() => {
                    toast.success(importResponse.message || 'Database restored successfully from uploaded file');
                    fetchDatabaseInfo();
                    fetchActivities();
                    fetchBackups();
                }, 500);
            } else {
                toast.error(importResponse?.error || 'Failed to restore backup');
            }
        } catch (error) {
            console.error('Error restoring backup from file:', error);
            toast.error('Failed to restore backup from file');
        } finally {
            setTimeout(() => {
                setLoading((prev) => ({ ...prev, restoreBackup: false }));
                setBackupProgress({ current: 0, total: 0, operation: '' });
                setUploadedBackupData(null);
                setUploadedFileName('');
            }, 1000);
        }
    };

    // Utility function to format bytes
    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    // Show loading skeleton while initial data is loading
    if (loading.database && collections.length === 0) {
        return (
            <ScrollArea className="h-[calc(100vh-80px)]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="font-bold text-3xl">Database</h1>
                            <p className="text-muted-foreground">
                                Manage and monitor your database collections and data
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" disabled>
                                <RefreshCw className={`h-4 w-4 ${loading.database ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-32" />
                        ))}
                    </div>
                    <Skeleton className="h-64" />
                </div>
            </ScrollArea>
        );
    }

    return (
        <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-3xl">Database</h1>
                        <p className="text-muted-foreground">Manage and monitor your database collections and data</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefresh} disabled={loading.database}>
                            <RefreshCw className={`h-4 w-4 ${loading.database ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Database Stats */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">Collections</p>
                                    <p className="font-bold text-2xl">{dbStats.totalCollections}</p>
                                </div>
                                <Table className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">Entries</p>
                                    <p className="font-bold text-2xl">{dbStats.totalEntries.toLocaleString()}</p>
                                </div>
                                <Database className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">Total Size</p>
                                    <p className="font-bold text-2xl">{dbStats.totalSize}</p>
                                </div>
                                <HardDrive className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">Provider</p>
                                    <p className="font-bold text-2xl">{dbStats.provider}</p>
                                </div>
                                <Zap className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="collections" className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            Collections
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Activity
                        </TabsTrigger>
                        <TabsTrigger value="maintenance" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Maintenance
                        </TabsTrigger>
                    </TabsList>

                    {/* Collections Tab */}
                    <TabsContent value="collections" className="space-y-6">
                        {/* Search */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
                                    <Input
                                        placeholder="Search collections..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Button className="flex items-center gap-2" onClick={() => setCreateModalOpen(true)}>
                                <Plus className="h-4 w-4" />
                                New Collection
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Database Collections</CardTitle>
                                <CardDescription>
                                    {filteredCollections.length} collection{filteredCollections.length !== 1 ? 's' : ''}{' '}
                                    found
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {filteredCollections.map((collection) => (
                                        <div
                                            key={collection.id}
                                            className="flex flex-wrap items-center gap-4 rounded-lg border p-4 transition-shadow hover:shadow-sm">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                                <Table className="h-5 w-5 text-blue-600" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <h3 className="font-medium">{collection.name}</h3>
                                                    <Badge variant="outline">{collection.type || 'collection'}</Badge>
                                                </div>

                                                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                                                    <span>
                                                        {(collection.documentCount || 0).toLocaleString()} entries
                                                    </span>
                                                    <span>{collection.size || '0 KB'}</span>
                                                    <span>{collection.indexes || 1} indexes</span>
                                                    <span>
                                                        Modified:{' '}
                                                        {collection.lastModified
                                                            ? new Date(collection.lastModified).toLocaleDateString()
                                                            : 'Never'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    title="View collection data"
                                                    onClick={() => handleViewCollection(collection.name)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    title="Edit collection"
                                                    onClick={() => handleEditCollection(collection.name)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    title="Backup collection"
                                                    onClick={() => handleBackupCollection(collection.name)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    title="Clear all data in collection"
                                                    onClick={() => handleDeleteCollection(collection.name)}
                                                    className="text-red-600 hover:text-red-700">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredCollections.length === 0 && (
                                        <div className="py-12 text-center">
                                            <Database className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                                            <h3 className="mb-2 font-medium text-lg">No collections found</h3>
                                            <p className="mb-4 text-muted-foreground">
                                                {searchTerm
                                                    ? `No collections match "${searchTerm}"`
                                                    : 'Get started by creating your first collection'}
                                            </p>
                                            <Button>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Collection
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Activity Tab */}
                    <TabsContent value="activity" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Latest database operations and changes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-100">
                                    <div className="space-y-4">
                                        {activities.length === 0 ? (
                                            <div className="py-8 text-center">
                                                <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                                <p className="text-muted-foreground">No recent activities</p>
                                            </div>
                                        ) : (
                                            activities.map((activity, index) => (
                                                <div
                                                    key={activity.id || `activity-${index}`}
                                                    className="flex items-center gap-4 border-b p-3 last:border-b-0">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                                                        <Activity className="h-4 w-4 text-green-600" />
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">
                                                                {activity.action || 'Unknown Action'}
                                                            </span>
                                                            <Badge variant="outline">
                                                                {activity.collection || 'unknown'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-muted-foreground text-sm">
                                                            by {activity.user || 'Unknown'} •{' '}
                                                            {activity.timestamp
                                                                ? new Date(activity.timestamp).toLocaleString()
                                                                : 'Unknown time'}
                                                            {activity.details && (
                                                                <>
                                                                    <br />
                                                                    <span className="text-xs">{activity.details}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Maintenance Tab */}
                    <TabsContent value="maintenance" className="space-y-6">
                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Backup & Restore</CardTitle>
                                    <CardDescription>Manage database backups and restore operations</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button
                                        variant="default"
                                        className="flex w-full items-center gap-2"
                                        onClick={handleCreateFullBackup}
                                        disabled={loading.createBackup || loading.restoreBackup}>
                                        {loading.createBackup ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                Creating Backup...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4" />
                                                Create Backup
                                            </>
                                        )}
                                    </Button>

                                    {/* Progress indicator */}
                                    {(loading.createBackup || loading.restoreBackup) && (
                                        <div className="w-full rounded-lg border bg-secondary p-4">
                                            <div className="mb-2 flex items-center gap-3">
                                                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                                                <span className="font-medium text-sm">{backupProgress.operation}</span>
                                            </div>
                                            {backupProgress.total > 0 && (
                                                <>
                                                    <div className="mb-2 h-2 w-full rounded-full bg-foreground">
                                                        <div
                                                            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                                                            style={{
                                                                width: `${(backupProgress.current / backupProgress.total) * 100}%`
                                                            }}></div>
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">
                                                        {backupProgress.current} of {backupProgress.total} collections
                                                        processed
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        variant="outline"
                                        className="flex w-full items-center gap-2"
                                        disabled={loading.createBackup || loading.restoreBackup}
                                        onClick={() => setFileUploadOpen(true)}>
                                        {loading.restoreBackup ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                Restoring...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-4 w-4" />
                                                Restore Backup
                                            </>
                                        )}
                                    </Button>

                                    {/* Backups Table */}
                                    {backups.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="mb-4 font-medium">Available Backups</h4>
                                            <div className="max-h-60 space-y-2 overflow-y-auto">
                                                {backups.map((backup) => (
                                                    <div
                                                        key={backup.id}
                                                        className="flex items-center justify-between rounded-lg border p-3">
                                                        <div className="flex-1">
                                                            <div className="mb-1 flex items-center gap-2">
                                                                <span className="font-medium text-sm">
                                                                    {backup.filename || backup.name}
                                                                </span>
                                                                {backup.status && (
                                                                    <Badge
                                                                        variant={
                                                                            backup.status === 'completed'
                                                                                ? 'default'
                                                                                : 'secondary'
                                                                        }
                                                                        className="text-xs">
                                                                        {backup.status}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-muted-foreground text-xs">
                                                                {new Date(backup.createdAt).toLocaleString()} •
                                                                {backup.recordCount || backup.entries || 0} records •
                                                                {formatBytes(backup.fileSize || backup.size || 0)}
                                                            </div>
                                                        </div>
                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDownloadBackup(backup)}
                                                                disabled={loading.createBackup || loading.restoreBackup}
                                                                title="Download JSON">
                                                                <Download className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleRestoreBackup(backup)}
                                                                disabled={loading.createBackup || loading.restoreBackup}
                                                                title="Restore this backup">
                                                                <Upload className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleDeleteBackup(
                                                                        backup.id,
                                                                        backup.filename || backup.name
                                                                    )
                                                                }
                                                                disabled={loading.createBackup || loading.restoreBackup}
                                                                className="text-red-600 hover:text-red-700">
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Database Information</CardTitle>
                                <CardDescription>Current database configuration and status</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground text-sm">Provider:</span>
                                            <span className="font-medium text-sm">{dbStats.provider}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground text-sm">Active Connections:</span>
                                            <span className="font-medium text-sm">{dbStats.connections}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground text-sm">Uptime:</span>
                                            <span className="font-medium text-sm">{dbStats.uptime}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground text-sm">Total Collections:</span>
                                            <span className="font-medium text-sm">{dbStats.totalCollections}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground text-sm">Total Entries:</span>
                                            <span className="font-medium text-sm">
                                                {dbStats.totalEntries.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground text-sm">Database Size:</span>
                                            <span className="font-medium text-sm">{dbStats.totalSize}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Collection Viewer Modal */}
            <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
                <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>View Collection: {selectedCollection}</DialogTitle>
                        <DialogDescription>Browse entries in the {selectedCollection} collection</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-96 flex-1">
                        {collectionData.length === 0 ? (
                            <div className="py-8 text-center">
                                <Database className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                <p className="text-muted-foreground">No entries found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {collectionData.map((item, index) => (
                                    <Card key={item.id || index} className="p-4">
                                        <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                                            {JSON.stringify(item, null, 2)}
                                        </pre>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Collection Editor Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Edit Collection: {selectedCollection}</DialogTitle>
                        <DialogDescription>Manage entries in the {selectedCollection} collection</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-96 flex-1">
                        {collectionData.length === 0 ? (
                            <div className="py-8 text-center">
                                <Database className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                <p className="text-muted-foreground">No entries found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {collectionData.map((item, index) => (
                                    <Card key={item.id || index} className="p-4">
                                        <div className="mb-2 flex items-start justify-between">
                                            <span className="font-medium">Document {index + 1}</span>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingItem(item)}>
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeleteDocumentDialog({ open: true, item })}
                                                    className="text-red-600">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                                            {JSON.stringify(item, null, 2)}
                                        </pre>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={() => setEditModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Collection Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New Collection</DialogTitle>
                        <DialogDescription>Define a new collection with custom fields</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 block font-medium text-sm">Collection Name</label>
                            <Input
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder="Enter collection name"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium text-sm">Fields (Optional)</label>
                            <div className="space-y-3">
                                {newCollectionFields.map((field, index) => (
                                    <div key={index} className="grid grid-cols-12 items-center gap-2">
                                        <Input
                                            className="col-span-5"
                                            value={field.name}
                                            onChange={(e) => updateField(index, 'name', e.target.value)}
                                            placeholder="Field name"
                                        />
                                        <select
                                            className="col-span-3 rounded-md border border-input px-3 py-2 text-sm"
                                            value={field.type}
                                            onChange={(e) => updateField(index, 'type', e.target.value)}>
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Boolean</option>
                                            <option value="date">Date</option>
                                            <option value="email">Email</option>
                                            <option value="url">URL</option>
                                        </select>
                                        <div className="col-span-2 flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateField(index, 'required', e.target.checked)}
                                                className="mr-1"
                                            />
                                            <span className="text-xs">Required</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeField(index)}
                                            disabled={newCollectionFields.length === 1}
                                            className="col-span-2">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" onClick={addField} className="mt-3 w-full">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Field
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCollection}>Create Collection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* File Upload Dialog */}
            <Dialog open={fileUploadOpen} onOpenChange={(open) => { if (!open) { setUploadedBackupData(null); setUploadedFileName(''); } setFileUploadOpen(open); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Restore from File</DialogTitle>
                        <DialogDescription>
                            Select a JSON backup file to restore your database
                        </DialogDescription>
                    </DialogHeader>

                    {!uploadedBackupData ? (
                        <div className="space-y-4">
                            <div className="rounded-lg border-2 border-dashed p-8 text-center">
                                <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                <p className="mb-2 text-sm">Select a backup file to restore</p>
                                <p className="mb-4 text-muted-foreground text-xs">
                                    Supports JSON format only
                                </p>
                                <input
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="backup-file-input"
                                />
                                <label
                                    htmlFor="backup-file-input"
                                    className="inline-flex cursor-pointer items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700">
                                    Choose File
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50">
                                <div className="space-y-1">
                                    <p className="font-medium text-sm text-blue-900 dark:text-blue-100">Selected File</p>
                                    <p className="text-blue-700 text-sm dark:text-blue-300">
                                        File: <strong>{uploadedFileName}</strong>
                                    </p>
                                    {uploadedBackupData?.recordCount && (
                                        <p className="text-blue-700 text-sm dark:text-blue-300">
                                            Records: <strong>{uploadedBackupData.recordCount}</strong>
                                        </p>
                                    )}
                                    {uploadedBackupData?.provider && (
                                        <p className="text-blue-700 text-sm dark:text-blue-300">
                                            Provider: <strong>{uploadedBackupData.provider}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/50">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
                                    <div>
                                        <p className="font-medium text-sm text-orange-900 dark:text-orange-100">Choose how to restore</p>
                                        <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                                            <strong>Import &amp; Merge:</strong> adds backup records to existing data.<br />
                                            <strong>Clear &amp; Restore:</strong> deletes all data first, then imports.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Two restore options */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Button
                                    onClick={() => confirmFileRestore(false)}
                                    disabled={loading.restoreBackup}
                                    variant="default"
                                    className="h-auto flex-col items-center gap-1 py-3">
                                    {loading.restoreBackup ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4" />
                                            <span className="font-semibold text-sm">Import &amp; Merge</span>
                                            <span className="text-center text-xs font-normal opacity-90">
                                                Add to existing data
                                            </span>
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => confirmFileRestore(true)}
                                    disabled={loading.restoreBackup}
                                    variant="destructive"
                                    className="h-auto flex-col items-center gap-1 py-3">
                                    {loading.restoreBackup ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="font-semibold text-sm">Clear &amp; Restore</span>
                                            <span className="text-center text-xs font-normal opacity-90">
                                                Delete all data first
                                            </span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFileUploadOpen(false);
                                setUploadedBackupData(null);
                                setUploadedFileName('');
                            }}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialogs */}
            <AlertDialog
                open={deleteCollectionDialog.open}
                onOpenChange={(open) => setDeleteCollectionDialog({ open, collectionName: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete ALL data in the "{deleteCollectionDialog.collectionName}"
                            collection? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteCollection} className="bg-red-600 hover:bg-red-700">
                            Delete Collection
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Restore Backup Confirmation Dialog */}
            <Dialog
                open={restoreBackupDialog.open}
                onOpenChange={(open) => { if (!open) setRestoreBackupDialog({ open: false, backup: null }); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Restore Backup</DialogTitle>
                        <DialogDescription>
                            Choose how to restore this backup to your database.
                        </DialogDescription>
                    </DialogHeader>

                    {restoreBackupDialog.backup && (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50">
                                <p className="font-medium text-sm text-blue-900 dark:text-blue-100">Backup Details</p>
                                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                                    <strong>{restoreBackupDialog.backup.filename || restoreBackupDialog.backup.name}</strong>
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {new Date(restoreBackupDialog.backup.createdAt).toLocaleString()} •{' '}
                                    {restoreBackupDialog.backup.recordCount || 0} records
                                </p>
                            </div>

                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/50">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
                                    <div>
                                        <p className="font-medium text-sm text-orange-900 dark:text-orange-100">Choose how to restore</p>
                                        <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                                            <strong>Import &amp; Merge:</strong> adds backup records to existing data.<br />
                                            <strong>Clear &amp; Restore:</strong> deletes all data first, then imports.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Button
                                    onClick={() => confirmRestoreBackup(false)}
                                    disabled={loading.restoreBackup}
                                    variant="default"
                                    className="h-auto flex-col items-center gap-1 py-3">
                                    {loading.restoreBackup ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4" />
                                            <span className="font-semibold text-sm">Import &amp; Merge</span>
                                            <span className="text-center text-xs font-normal opacity-90">
                                                Add to existing data
                                            </span>
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => confirmRestoreBackup(true)}
                                    disabled={loading.restoreBackup}
                                    variant="destructive"
                                    className="h-auto flex-col items-center gap-1 py-3">
                                    {loading.restoreBackup ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="font-semibold text-sm">Clear &amp; Restore</span>
                                            <span className="text-center text-xs font-normal opacity-90">
                                                Delete all data first
                                            </span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRestoreBackupDialog({ open: false, backup: null })}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Backup Confirmation */}
            <AlertDialog
                open={deleteBackupDialog.open}
                onOpenChange={(open) => setDeleteBackupDialog({ open, backupId: '', backupName: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Backup</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the backup "{deleteBackupDialog.backupName}"? This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteBackup}
                            className="bg-red-600 text-white hover:bg-red-700">
                            Delete Backup
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Document Confirmation */}
            <AlertDialog
                open={deleteDocumentDialog.open}
                onOpenChange={(open) => setDeleteDocumentDialog({ open, item: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this document? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteDocument} className="bg-red-600 hover:bg-red-700">
                            Delete Document
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ScrollArea>
    );
}
