// @/app/(backend)/admin/system/maintenance/page.jsx

'use client';

import {
    Activity,
    AlertTriangle,
    Clock,
    Cpu,
    Database,
    Download,
    HardDrive,
    MemoryStick,
    Monitor,
    RefreshCw,
    Rocket,
    Server,
    Settings,
    Trash2,
    Upload
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    clearSystemCache,
    createDatabaseBackup,
    deleteBackup,
    getBackupHistory,
    getDatabaseData,
    getDatabaseStats,
    getDatabaseTables,
    getDeployHook,
    getServerInfo,
    getSystemCacheStats,
    importBackup,
    restoreBackupFromUrl,
    triggerDeployment,
    updateDeployHook
} from '@/lib/server/maintenance.js';

import AdminHeader from '../../components/AdminHeader';

export default function MaintenancePage() {
    const [serverInfo, setServerInfo] = useState(null);
    const [databaseStats, setDatabaseStats] = useState(null);
    const [databaseData, setDatabaseData] = useState(null);
    const [databaseTables, setDatabaseTables] = useState(null);
    const [backupHistory, setBackupHistory] = useState(null);
    const [cacheStats, setCacheStats] = useState(null);
    const [deploySettings, setDeploySettings] = useState({
        deployHookUrl: '',
        deployProvider: 'vercel',
        lastDeployment: null,
        deploymentHistory: []
    });
    const [deployHookInput, setDeployHookInput] = useState('');
    const [deployProviderInput, setDeployProviderInput] = useState('vercel');
    const [deleteBackupDialog, setDeleteBackupDialog] = useState({ open: false, backupId: '' });
    const [restoreBackupDialog, setRestoreBackupDialog] = useState({ open: false, backup: null });
    const [loading, setLoading] = useState({
        serverInfo: true,
        database: true,
        databaseData: true,
        databaseTables: true,
        backupHistory: true,
        cache: false,
        cleanup: false,
        cacheStats: true,
        deploy: false,
        deploySettings: true,
        updateHook: false,
        createBackup: false,
        deleteBackup: false,
        importBackup: false
    });

    // Fetch server information
    const fetchServerInfo = async () => {
        setLoading((prev) => ({ ...prev, serverInfo: true }));
        try {
            const result = await getServerInfo({ duration: '5M' });
            if (result?.success) {
                setServerInfo(result.data);
            } else {
                toast.error(result?.error || 'Failed to fetch server information');
            }
        } catch (error) {
            console.error('Error fetching server info:', error);
            toast.error('Failed to fetch server information');
        } finally {
            setLoading((prev) => ({ ...prev, serverInfo: false }));
        }
    };

    // Fetch database statistics
    const fetchDatabaseStats = async () => {
        setLoading((prev) => ({ ...prev, database: true }));
        try {
            const result = await getDatabaseStats({ duration: '3M' });
            if (result?.success) {
                setDatabaseStats(result.data);
            } else {
                toast.error(result?.error || 'Failed to fetch database statistics');
            }
        } catch (error) {
            console.error('Error fetching database stats:', error);
            toast.error('Failed to fetch database statistics');
        } finally {
            setLoading((prev) => ({ ...prev, database: false }));
        }
    };

    // Fetch database data
    const fetchDatabaseData = async () => {
        setLoading((prev) => ({ ...prev, databaseData: true }));
        try {
            const result = await getDatabaseData({ limit: 20, duration: '1M' });
            if (result?.success) {
                setDatabaseData(result);
            } else {
                toast.error(result?.error || 'Failed to fetch database data');
            }
        } catch (error) {
            console.error('Error fetching database data:', error);
            toast.error('Failed to fetch database data');
        } finally {
            setLoading((prev) => ({ ...prev, databaseData: false }));
        }
    };

    // Fetch backup history
    const fetchBackupHistory = async () => {
        setLoading((prev) => ({ ...prev, backupHistory: true }));
        try {
            const result = await getBackupHistory({ duration: '1M' });
            if (result?.success) {
                setBackupHistory(result);
            } else {
                toast.error(result?.error || 'Failed to fetch backup history');
            }
        } catch (error) {
            console.error('Error fetching backup history:', error);
            toast.error('Failed to fetch backup history');
        } finally {
            setLoading((prev) => ({ ...prev, backupHistory: false }));
        }
    };

    // Create database backup
    const handleCreateBackup = async () => {
        setLoading((prev) => ({ ...prev, createBackup: true }));
        try {
            const result = await createDatabaseBackup({ userId: 'admin' });
            if (result?.success) {
                toast.success(result.message || 'Backup created successfully');
                await fetchBackupHistory();
            } else {
                toast.error(result?.error || 'Failed to create backup');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            toast.error('Failed to create backup');
        } finally {
            setLoading((prev) => ({ ...prev, createBackup: false }));
        }
    };

    // Delete backup
    const handleDeleteBackup = async (backupId) => {
        setDeleteBackupDialog({ open: true, backupId });
    };

    const confirmDeleteBackup = async () => {
        const { backupId } = deleteBackupDialog;
        setDeleteBackupDialog({ open: false, backupId: '' });
        setLoading((prev) => ({ ...prev, deleteBackup: true }));
        try {
            const result = await deleteBackup(backupId);
            if (result?.success) {
                toast.success(result.message || 'Backup deleted successfully');
                await fetchBackupHistory();
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

    // Restore backup from saved URL
    const handleRestoreBackup = (backup) => {
        setRestoreBackupDialog({ open: true, backup });
    };

    const confirmRestoreBackup = async (clearExisting) => {
        const { backup } = restoreBackupDialog;
        setRestoreBackupDialog({ open: false, backup: null });
        setLoading((prev) => ({ ...prev, importBackup: true }));
        try {
            const result = await restoreBackupFromUrl(backup.fileUrl, { clearExisting, userId: 'admin' });
            if (result?.success) {
                toast.success(result.message || 'Database restored successfully');
                await Promise.all([fetchDatabaseData(), fetchDatabaseTables(), fetchDatabaseStats()]);
            } else {
                toast.error(result?.error || 'Failed to restore backup');
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            toast.error('Failed to restore backup');
        } finally {
            setLoading((prev) => ({ ...prev, importBackup: false }));
        }
    };

    // Fetch database tables
    const fetchDatabaseTables = async () => {
        setLoading((prev) => ({ ...prev, databaseTables: true }));
        try {
            const result = await getDatabaseTables({ duration: '1M' });
            if (result?.success) {
                setDatabaseTables(result);
            } else {
                toast.error(result?.error || 'Failed to fetch database tables');
            }
        } catch (error) {
            console.error('Error fetching database tables:', error);
            toast.error('Failed to fetch database tables');
        } finally {
            setLoading((prev) => ({ ...prev, databaseTables: false }));
        }
    };

    // Import backup
    const handleImportBackup = async (file) => {
        if (!file) {
            toast.error('Please select a backup file');
            return;
        }

        setLoading((prev) => ({ ...prev, importBackup: true }));
        try {
            const arrayBuffer = await file.arrayBuffer();
            const decoder = new TextDecoder('utf-8');
            const content = decoder.decode(arrayBuffer);

            const backupFile = {
                content: content,
                name: file.name,
                type: file.type,
                size: file.size
            };

            const result = await importBackup(backupFile, {
                clearExisting: false,
                userId: 'admin'
            });

            if (result?.success) {
                toast.success(result.message || 'Backup imported successfully');
                await Promise.all([
                    fetchDatabaseData(),
                    fetchDatabaseTables(),
                    fetchDatabaseStats()
                ]);
            } else {
                toast.error(result?.error || 'Failed to import backup');
            }
        } catch (error) {
            console.error('Error importing backup:', error);
            toast.error('Failed to import backup');
        } finally {
            setLoading((prev) => ({ ...prev, importBackup: false }));
        }
    };

    // Import backup with clear existing data
    const handleClearAndImportBackup = async (file) => {
        if (!file) {
            toast.error('Please select a backup file');
            return;
        }

        setLoading((prev) => ({ ...prev, importBackup: true }));
        try {
            const arrayBuffer = await file.arrayBuffer();
            const decoder = new TextDecoder('utf-8');
            const content = decoder.decode(arrayBuffer);

            const backupFile = {
                content: content,
                name: file.name,
                type: file.type,
                size: file.size
            };

            const result = await importBackup(backupFile, {
                clearExisting: true,
                userId: 'admin'
            });

            if (result?.success) {
                toast.success(result.message || 'Backup imported successfully');
                await Promise.all([
                    fetchDatabaseData(),
                    fetchDatabaseTables(),
                    fetchDatabaseStats()
                ]);
            } else {
                toast.error(result?.error || 'Failed to import backup');
            }
        } catch (error) {
            console.error('Error importing backup:', error);
            toast.error('Failed to import backup');
        } finally {
            setLoading((prev) => ({ ...prev, importBackup: false }));
        }
    };

    // Fetch cache statistics
    const fetchCacheStats = async () => {
        setLoading((prev) => ({ ...prev, cacheStats: true }));
        try {
            const result = await getSystemCacheStats();
            if (result?.success) {
                setCacheStats(result.data);
            } else {
                toast.error(result?.error || 'Failed to fetch cache statistics');
            }
        } catch (error) {
            console.error('Error fetching cache stats:', error);
            toast.error('Failed to fetch cache statistics');
        } finally {
            setLoading((prev) => ({ ...prev, cacheStats: false }));
        }
    };

    // Clear cache by instance or all
    const clearCacheAction = async (instanceName = null) => {
        setLoading((prev) => ({ ...prev, cache: true }));
        try {
            const result = await clearSystemCache(instanceName);
            if (result?.success) {
                toast.success(result.message || 'Cache cleared successfully');
                // Refresh cache stats after clearing
                await fetchCacheStats();
            } else {
                toast.error(result?.error || 'Failed to clear cache');
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
            toast.error('Failed to clear cache');
        } finally {
            setLoading((prev) => ({ ...prev, cache: false }));
        }
    };

    // Fetch deploy hook settings
    const fetchDeploySettings = async () => {
        setLoading((prev) => ({ ...prev, deploySettings: true }));
        try {
            const result = await getDeployHook();
            if (result?.success) {
                setDeploySettings(result.data);
                setDeployHookInput(result.data.deployHookUrl);
                setDeployProviderInput(result.data.deployProvider || 'vercel');
            } else {
                toast.error(result?.error || 'Failed to fetch deploy settings');
            }
        } catch (error) {
            console.error('Error fetching deploy settings:', error);
            toast.error('Failed to fetch deploy settings');
        } finally {
            setLoading((prev) => ({ ...prev, deploySettings: false }));
        }
    };

    // Update deploy hook URL
    const handleUpdateDeployHook = async () => {
        if (!deployHookInput || deployHookInput.trim() === '') {
            toast.error('Deploy hook URL is required');
            return;
        }

        setLoading((prev) => ({ ...prev, updateHook: true }));
        try {
            const result = await updateDeployHook(deployHookInput.trim(), deployProviderInput);
            if (result?.success) {
                toast.success(result.message || 'Deploy hook updated successfully');
                await fetchDeploySettings();
            } else {
                toast.error(result?.error || 'Failed to update deploy hook');
            }
        } catch (error) {
            console.error('Error updating deploy hook:', error);
            toast.error('Failed to update deploy hook');
        } finally {
            setLoading((prev) => ({ ...prev, updateHook: false }));
        }
    };

    // Trigger deployment
    const handleTriggerDeployment = async () => {
        setLoading((prev) => ({ ...prev, deploy: true }));
        try {
            const result = await triggerDeployment();
            if (result?.success) {
                toast.success(result.message || 'Deployment triggered successfully');
                await fetchDeploySettings();
            } else {
                toast.error(result?.error || 'Failed to trigger deployment');
            }
        } catch (error) {
            console.error('Error triggering deployment:', error);
            toast.error('Failed to trigger deployment');
        } finally {
            setLoading((prev) => ({ ...prev, deploy: false }));
        }
    };

    // Format bytes
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
    };

    // Format uptime
    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    // Refresh all data
    const refreshAll = async () => {
        await Promise.all([
            fetchServerInfo(),
            fetchDatabaseStats(),
            fetchDatabaseData(),
            fetchDatabaseTables(),
            fetchBackupHistory(),
            fetchCacheStats(),
            fetchDeploySettings()
        ]);
    };

    useEffect(() => {
        refreshAll();
    }, []);

    return (
        <div className="space-y-6">
            <AdminHeader
                title="System Maintenance"
                description="Monitor system health and manage database operations"
                actions={
                    <Button variant="outline" onClick={refreshAll} disabled={loading.serverInfo || loading.database}>
                        <RefreshCw
                            className={`mr-2 h-4 w-4 ${loading.serverInfo || loading.database ? 'animate-spin' : ''}`}
                        />
                        Refresh All
                    </Button>
                }
            />

            <Tabs defaultValue="system" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="system">System Info</TabsTrigger>
                    <TabsTrigger value="backups">Backups</TabsTrigger>
                    <TabsTrigger value="cache">Cache Management</TabsTrigger>
                    <TabsTrigger value="deploy">Deploy</TabsTrigger>
                </TabsList>

                <TabsContent value="system" className="space-y-6">
                    <SystemInfoTab
                        serverInfo={serverInfo}
                        loading={loading}
                        onRefresh={fetchServerInfo}
                        formatBytes={formatBytes}
                        formatUptime={formatUptime}
                    />
                </TabsContent>

                <TabsContent value="backups" className="space-y-6">
                    <BackupsTab
                        databaseStats={databaseStats}
                        databaseData={databaseData}
                        databaseTables={databaseTables}
                        backupHistory={backupHistory}
                        loading={loading}
                        onRefresh={() => {
                            fetchDatabaseStats();
                            fetchDatabaseData();
                            fetchDatabaseTables();
                            fetchBackupHistory();
                        }}
                        onCreateBackup={handleCreateBackup}
                        onDeleteBackup={handleDeleteBackup}
                        onRestoreBackup={handleRestoreBackup}
                        onImportBackup={handleImportBackup}
                        onClearAndImportBackup={handleClearAndImportBackup}
                        formatBytes={formatBytes}
                    />
                </TabsContent>

                <TabsContent value="cache" className="space-y-6">
                    <CacheManagementTab loading={loading} clearCacheAction={clearCacheAction} cacheStats={cacheStats} />
                </TabsContent>

                <TabsContent value="deploy" className="space-y-6">
                    <DeployTab
                        deploySettings={deploySettings}
                        deployHookInput={deployHookInput}
                        setDeployHookInput={setDeployHookInput}
                        deployProviderInput={deployProviderInput}
                        setDeployProviderInput={setDeployProviderInput}
                        loading={loading}
                        onUpdateHook={handleUpdateDeployHook}
                        onTriggerDeploy={handleTriggerDeployment}
                        onRefresh={fetchDeploySettings}
                    />
                </TabsContent>
            </Tabs>

            {/* Delete Backup Confirmation */}
            <AlertDialog
                open={deleteBackupDialog.open}
                onOpenChange={(open) => setDeleteBackupDialog({ open, backupId: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Backup</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this backup? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteBackup} className="bg-red-600 text-white hover:bg-red-700">
                            Delete Backup
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
                                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
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
                                    disabled={loading.importBackup}
                                    variant="default"
                                    className="h-auto flex-col items-center gap-2 py-4">
                                    {loading.importBackup ? (
                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Download className="h-5 w-5" />
                                            <span className="font-semibold text-center">Import &amp; Merge</span>
                                            <span className="text-center text-xs font-normal opacity-90">
                                                Add to existing data
                                            </span>
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => confirmRestoreBackup(true)}
                                    disabled={loading.importBackup}
                                    variant="destructive"
                                    className="h-auto flex-col items-center gap-2 py-4">
                                    {loading.importBackup ? (
                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-5 w-5" />
                                            <span className="font-semibold text-center">Clear &amp; Restore</span>
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
        </div>
    );
}

// System Information Tab Component
function SystemInfoTab({ serverInfo, loading, onRefresh, formatBytes, formatUptime }) {
    if (loading.serverInfo) {
        return <ServerInfoSkeleton />;
    }

    if (!serverInfo) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8">
                    <div className="text-center">
                        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Failed to load server information</p>
                        <Button onClick={onRefresh} className="mt-4">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-6">
            {/* Version Information */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Monitor className="h-5 w-5" />
                                Version Information
                            </CardTitle>
                            <CardDescription>Current versions of key dependencies</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={onRefresh}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-lg border p-4 text-center">
                            <div className="font-bold text-blue-600">{serverInfo.versions.node}</div>
                            <div className="text-muted-foreground text-sm">Node.js</div>
                        </div>
                        <div className="rounded-lg border p-4 text-center">
                            <div className="font-bold text-blue-600">{serverInfo.versions.next}</div>
                            <div className="text-muted-foreground text-sm">Next.js</div>
                        </div>
                        <div className="rounded-lg border p-4 text-center">
                            <div className="font-bold text-blue-600">{serverInfo.versions.react}</div>
                            <div className="text-muted-foreground text-sm">React</div>
                        </div>
                        <div className="rounded-lg border p-4 text-center">
                            <div className="font-bold text-purple-600">{serverInfo.versions.tailwindcss}</div>
                            <div className="text-muted-foreground text-sm">Tailwind</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* System Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        System Information
                    </CardTitle>
                    <CardDescription>Current system status and resource usage</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center gap-3 rounded-lg border p-4">
                            <Cpu className="h-8 w-8 text-orange-500" />
                            <div>
                                <div className="font-semibold">{serverInfo.system.cpus} CPUs</div>
                                <div className="text-muted-foreground text-sm">
                                    {serverInfo.system.arch} • {serverInfo.system.platform}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border p-4">
                            <MemoryStick className="h-8 w-8 text-blue-500" />
                            <div>
                                <div className="font-semibold">
                                    {serverInfo.system.freeMemory}GB / {serverInfo.system.totalMemory}GB
                                </div>
                                <div className="text-muted-foreground text-sm">Memory</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border p-4">
                            <Clock className="h-8 w-8 text-green-500" />
                            <div>
                                <div className="font-semibold">{formatUptime(serverInfo.system.uptime)}</div>
                                <div className="text-muted-foreground text-sm">System Uptime</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border p-4">
                            <Server className="h-8 w-8 text-purple-500" />
                            <div>
                                <div className="font-semibold">{formatUptime(serverInfo.system.processUptime)}</div>
                                <div className="text-muted-foreground text-sm">Process Uptime</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg border p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <Badge variant={serverInfo.system.nodeEnv === 'production' ? 'default' : 'secondary'}>
                                    {serverInfo.system.nodeEnv}
                                </Badge>
                                <span className="text-muted-foreground text-sm">Environment</span>
                            </div>
                        </div>

                        <div className="rounded-lg border p-4">
                            <div className="mb-1 font-medium text-sm">Working Directory</div>
                            <div className="break-all font-mono text-muted-foreground text-sm">
                                {serverInfo.system.cwd}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Server Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5" />
                        Recent Server Logs
                    </CardTitle>
                    <CardDescription>Latest system messages and events</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64 w-full rounded-lg border p-4">
                        <div className="space-y-2">
                            {serverInfo.logs.map((log, index) => (
                                <div key={index} className="font-mono text-sm">
                                    <span className="text-muted-foreground">{log}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

// Backups Tab Component
function BackupsTab({
    databaseStats,
    databaseData,
    databaseTables,
    backupHistory,
    loading,
    onRefresh,
    onCreateBackup,
    onDeleteBackup,
    onRestoreBackup,
    onImportBackup,
    onClearAndImportBackup,
    formatBytes
}) {
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                toast.error('Please select a valid JSON backup file');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleImportClick = () => {
        if (selectedFile) {
            onImportBackup(selectedFile);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleClearAndImportClick = () => {
        if (selectedFile) {
            onClearAndImportBackup(selectedFile);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Download backup file handler (handles cross-origin downloads)
    const handleDownloadBackup = async (backup) => {
        try {
            toast.info('Downloading backup...');
            
            // Create a temporary link and trigger download
            // This bypasses CORS issues by letting the browser handle the download directly
            const link = document.createElement('a');
            link.href = backup.fileUrl;
            link.download = backup.filename || 'backup.json';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Trigger click
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                toast.success('Backup download started');
            }, 100);
        } catch (error) {
            console.error('Error downloading backup:', error);
            toast.error('Failed to download backup file');
        }
    };

    return (
        <div className="grid gap-6">
            {/* Database Health Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Database Health & Statistics
                            </CardTitle>
                            <CardDescription>Database connectivity, collection status, and data overview</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading.database}>
                            <RefreshCw className={`h-4 w-4 ${loading.database ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading.database || loading.databaseTables ? (
                        <DatabaseSkeleton />
                    ) : databaseStats ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge variant={databaseStats.healthy ? 'default' : 'destructive'}>
                                    {databaseStats.healthy ? 'Healthy' : 'Unhealthy'}
                                </Badge>
                                <span className="text-sm text-muted-foreground capitalize">
                                    Provider: {databaseStats.provider}
                                </span>
                            </div>

                             {/* Database Data Overview */}
                            {databaseStats && (
                                <div className="mt-4 pt-4 border-t">
                                    <h4 className="font-semibold text-sm mb-3">Database Overview</h4>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="rounded-lg border p-4 text-center">
                                            <div className="font-bold text-2xl text-blue-600">
                                                {databaseStats.totalRecords || 0}
                                            </div>
                                            <div className="text-muted-foreground text-sm">Total Records</div>
                                        </div>
                                        <div className="rounded-lg border p-4 text-center">
                                            <div className="font-bold text-2xl text-green-600">
                                                {databaseStats.totalTables || 0}
                                            </div>
                                            <div className="text-muted-foreground text-sm capitalize">
                                                Total Collections
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* All Database Tables */}
                            {databaseTables?.data && Object.keys(databaseTables.data).length > 0 ? (
                                <div>
                                    <h4 className="font-semibold text-sm mb-3">Collections</h4>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                        {Object.entries(databaseTables.data).map(([tableName, tableData]) => (
                                            <div key={tableName} className="rounded-lg border p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm truncate">{tableName}</span>
                                                    <Badge
                                                        variant={tableData.accessible ? 'default' : 'destructive'}
                                                        className="text-xs">
                                                        {tableData.accessible ? 'OK' : 'Error'}
                                                    </Badge>
                                                </div>
                                                <div className="text-xl font-bold text-blue-600">
                                                    {tableData.count}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {tableData.count === 1 ? 'record' : 'records'}
                                                </div>
                                            </div>
                                        ))}
                                    </div> 
                                </div>
                            ) : (
                                /* Fallback to databaseStats.collections if databaseTables not available */
                                databaseStats.collections && (
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3">Database Collections Status</h4>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                            {Object.entries(databaseStats.collections).map(([collection, stats]) => (
                                                <div key={collection} className="rounded-lg border p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-sm capitalize">{collection}</span>
                                                        <Badge
                                                            variant={stats.accessible ? 'default' : 'destructive'}
                                                            className="text-xs">
                                                            {stats.accessible ? 'OK' : 'Error'}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xl font-bold text-blue-600">
                                                        {stats.count || 0}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {stats.count === 1 ? 'record' : 'records'}
                                                    </div>
                                                    {stats.error && <p className="mt-1 text-xs text-red-500">{stats.error}</p>}
                                                </div>
                                            ))}
                                        </div> 
                                    </div>
                                )
                            )} 
                           
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">Failed to load database statistics</div>
                    )}
                </CardContent>
            </Card> 
            
            {/* Backup Management */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Backup Management
                            </CardTitle>
                            <CardDescription>Create and manage database backups</CardDescription>
                        </div>
                        <Button
                            onClick={onCreateBackup}
                            disabled={loading.createBackup}
                            className="gap-2">
                            {loading.createBackup ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Create Backup
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading.backupHistory ? (
                        <div className="space-y-2">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : backupHistory?.data && backupHistory.data.length > 0 ? (
                        <div className="space-y-4">
                            {backupHistory.data.map((backup) => (
                                <div
                                    key={backup.id || backup.key}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border p-4">
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm break-all">{backup.filename}</span>
                                            <Badge
                                                variant={backup.status === 'completed' ? 'default' : 'secondary'}
                                                className="text-xs">
                                                {backup.status}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                            <span className="whitespace-nowrap">
                                                Size: {formatBytes(backup.fileSize || 0)}
                                            </span>
                                            <span className="whitespace-nowrap">
                                                Records: {backup.recordCount || 0}
                                            </span>
                                            <span className="whitespace-nowrap">
                                                {new Date(backup.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {backup.fileUrl && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownloadBackup(backup)}
                                                className="gap-2">
                                                <Download className="h-4 w-4" />
                                                <span className="hidden sm:inline">Download</span>
                                            </Button>
                                        )}
                                        {backup.fileUrl && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onRestoreBackup(backup)}
                                                disabled={loading.importBackup}
                                                className="gap-2">
                                                <Upload className="h-4 w-4" />
                                                <span className="hidden sm:inline">Restore</span>
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onDeleteBackup(backup.id || backup.key)}
                                            disabled={loading.deleteBackup}
                                            className="gap-2">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                            <span className="hidden sm:inline">Delete</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Database className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground text-sm mb-4">No backups found</p>
                            <p className="text-xs text-muted-foreground">
                                Click "Create Backup" to create your first database backup
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Import Backup */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="h-5 w-5" />
                                Import Backup
                            </CardTitle>
                            <CardDescription>Restore database from a backup file</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* File Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="backup-file">Select Backup File</Label>
                        <div className="flex gap-2">
                            <Input
                                id="backup-file"
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                onChange={handleFileSelect}
                                disabled={loading.importBackup}
                                className="flex-1"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Select a valid JSON backup file to restore
                        </p>
                    </div>

                    {/* Selected File Info */}
                    {selectedFile && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50">
                            <div className="flex items-start gap-3">
                                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-blue-900 dark:text-blue-100">Selected File</p>
                                    <p className="mt-1 font-mono text-xs text-blue-700 dark:text-blue-300 break-all">
                                        {selectedFile.name}
                                    </p>
                                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                                        Size: {formatBytes(selectedFile.size)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Import Options */}
                    {selectedFile && (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/50">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-orange-900 dark:text-orange-100">Import Options</p>
                                        <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                                            Choose how to import the backup data
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Import Buttons */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Button
                                    onClick={handleImportClick}
                                    disabled={loading.importBackup}
                                    variant="default"
                                    className="h-auto flex-col items-center gap-2 py-4 px-6">
                                    {loading.importBackup ? (
                                        <>
                                            <RefreshCw className="h-5 w-5 animate-spin" />
                                            <span className="font-semibold">Importing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-5 w-5" />
                                            <span className="font-semibold text-center">Import & Merge</span>
                                            <span className="text-xs text-center opacity-90 font-normal">
                                                Add backup records to existing data
                                            </span>
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleClearAndImportClick}
                                    disabled={loading.importBackup}
                                    variant="destructive"
                                    className="h-auto flex-col items-center gap-2 py-4 px-6">
                                    {loading.importBackup ? (
                                        <>
                                            <RefreshCw className="h-5 w-5 animate-spin" />
                                            <span className="font-semibold">Importing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-5 w-5" />
                                            <span className="font-semibold text-center">Clear & Import</span>
                                            <span className="text-xs text-center opacity-90 font-normal">
                                                Delete all data and import backup
                                            </span>
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Warning Message */}
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-red-900 dark:text-red-100">
                                            Important Warning
                                        </p>
                                        <ul className="mt-2 space-y-1.5 text-xs text-red-800 dark:text-red-300 list-disc list-inside">
                                            <li>
                                                <strong>Import & Merge:</strong> Adds backup records to your current database. May create duplicates if records exist.
                                            </li>
                                            <li>
                                                <strong>Clear & Import:</strong> PERMANENTLY DELETES all current data before importing. This action CANNOT be undone!
                                            </li>
                                        </ul>
                                        <p className="mt-2 text-xs text-red-800 dark:text-red-300">
                                            💡 Tip: Create a backup of your current data before importing to ensure you can recover if needed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* No File Selected State */}
                    {!selectedFile && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Upload className="mx-auto h-12 w-12 mb-3 opacity-50" />
                            <p className="text-sm">No backup file selected</p>
                            <p className="text-xs mt-1">Choose a backup file to begin the import process</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Cache Management Tab Component
function CacheManagementTab({ loading, clearCacheAction, cacheStats }) {
    return (
        <div className="grid gap-6">
            {/* Cache Statistics */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Cache Statistics
                            </CardTitle>
                            <CardDescription>Active cache instances and their metrics</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading.cacheStats ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ) : cacheStats?.instances &&
                      Array.isArray(cacheStats.instances) &&
                      cacheStats.instances.length > 0 ? (
                        <div className="space-y-4">
                            {/* Cache Instances Overview */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                                <div className="rounded-lg border p-4 text-center">
                                    <div className="font-bold text-2xl text-blue-600">
                                        {cacheStats.instances.length}
                                    </div>
                                    <div className="text-muted-foreground text-sm">Active Instances</div>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <div className="font-bold text-2xl text-green-600">
                                        {cacheStats.instances.reduce(
                                            (total, instance) => total + (instance.entries || 0),
                                            0
                                        )}
                                    </div>
                                    <div className="text-muted-foreground text-sm">Total Entries</div>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <div className="font-bold text-2xl text-purple-600">
                                        {cacheStats.instances.reduce(
                                            (total, instance) => total + (instance.metrics?.hits || 0),
                                            0
                                        )}
                                    </div>
                                    <div className="text-muted-foreground text-sm">Total Hits</div>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <div className="font-bold text-2xl text-orange-600">
                                        {cacheStats.instances.reduce(
                                            (total, instance) => total + (instance.metrics?.misses || 0),
                                            0
                                        )}
                                    </div>
                                    <div className="text-muted-foreground text-sm">Total Misses</div>
                                </div>
                            </div>

                            {/* Individual Cache Instances */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm">Cache Instances</h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {cacheStats.instances.map((instance, index) => (
                                        <div key={instance.name || index} className="rounded-lg border p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                                <h5 className="font-medium capitalize truncate">
                                                    {instance.name || `Instance ${index + 1}`}
                                                </h5>
                                                <Badge variant="secondary" className="w-fit">{instance.entries || 0} entries</Badge>
                                            </div>
                                            {instance.metrics && (
                                                <div className="grid grid-cols-3 gap-3 text-center">
                                                    <div>
                                                        <div className="font-semibold text-green-600">
                                                            {instance.metrics.hits || 0}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">Hits</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-red-600">
                                                            {instance.metrics.misses || 0}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">Misses</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-blue-600">
                                                            {instance.metrics.hitRate || '0%'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">Hit Rate</div>
                                                    </div>
                                                </div>
                                            )}
                                            {instance.keys &&
                                                Array.isArray(instance.keys) &&
                                                instance.keys.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t w-full relative overflow-hidden">
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            Active Keys:
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 w-full">
                                                            {instance.keys.slice(0, 3).map((key, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-xs">
                                                                    {String(key)}
                                                                </Badge>
                                                            ))}
                                                            {instance.keys.length > 3 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{instance.keys.length - 3} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">No cache instances active</div>
                    )}
                </CardContent>
            </Card>

            {/* Cache Management Actions */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Trash2 className="h-5 w-5" />
                                Cache Management
                            </CardTitle>
                            <CardDescription>Clear specific cache instances or all cache data</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Instance-based clearing */}
                    {cacheStats?.instances &&
                        Array.isArray(cacheStats.instances) &&
                        cacheStats.instances.length > 0 && (
                            <div>
                                <h4 className="font-medium text-sm mb-3">Clear Specific Instances</h4>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                    {cacheStats.instances.map((instance, index) => (
                                        <Button
                                            key={instance.name || index}
                                            variant="outline"
                                            onClick={() => clearCacheAction(instance.name)}
                                            disabled={loading.cache}
                                            className="h-auto sm:h-16 flex-col items-center gap-1 py-4">
                                            {loading.cache ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Database className="h-4 w-4" />
                                            )}
                                            <span className="text-sm capitalize">
                                                {instance.name || `Instance ${index + 1}`}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {instance.entries || 0} entries
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                    {/* Clear All Cache */}
                    <div className="pt-4 border-t">
                        <Button
                            variant="destructive"
                            onClick={() => clearCacheAction()}
                            disabled={loading.cache}
                            className="w-full h-16">
                            {loading.cache ? (
                                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-5 w-5" />
                            )}
                            Clear All Cache
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Deploy Tab Component
function DeployTab({
    deploySettings,
    deployHookInput,
    setDeployHookInput,
    deployProviderInput,
    setDeployProviderInput,
    loading,
    onUpdateHook,
    onTriggerDeploy,
    onRefresh
}) {
    if (loading.deploySettings) {
        return <DeploySkeleton />;
    }

    const hasDeployHook = deploySettings.deployHookUrl && deploySettings.deployHookUrl !== '';

    return (
        <div className="grid gap-6">
            {/* Deploy Configuration Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Rocket className="h-5 w-5" />
                                Deploy Configuration
                            </CardTitle>
                            <CardDescription>
                                Configure and manage deployment hooks for your application
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading.deploySettings}>
                            <RefreshCw className={`h-4 w-4 ${loading.deploySettings ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="deployProvider">Deploy Provider</Label>
                            <Select
                                value={deployProviderInput}
                                onValueChange={setDeployProviderInput}
                                disabled={loading.updateHook}>
                                <SelectTrigger id="deployProvider" className="w-full">
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vercel">Vercel</SelectItem>
                                    <SelectItem value="netlify">Netlify</SelectItem>
                                    <SelectItem value="cloudflare">Cloudflare Pages</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deployHook">Deploy Hook URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="deployHook"
                                    type="url"
                                    placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                                    value={deployHookInput}
                                    onChange={(e) => setDeployHookInput(e.target.value)}
                                    disabled={loading.updateHook}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={onUpdateHook}
                                    disabled={loading.updateHook || !deployHookInput}
                                    className="whitespace-nowrap">
                                    {loading.updateHook ? (
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Settings className="mr-2 h-4 w-4" />
                                    )}
                                    {hasDeployHook ? 'Update Hook' : 'Save Hook'}
                                </Button>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Enter your deployment hook URL from your hosting provider
                            </p>
                        </div>

                        {hasDeployHook && (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                                <div className="flex items-start gap-3">
                                    <Badge variant="default" className="mt-0.5">
                                        Configured
                                    </Badge>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">Deploy hook is configured</p>
                                        <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
                                            {deploySettings.deployHookUrl}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Provider:{' '}
                                            <span className="font-medium capitalize">
                                                {deploySettings.deployProvider}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Trigger Deployment Card */}
            {hasDeployHook && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Rocket className="h-5 w-5" />
                            Trigger Deployment
                        </CardTitle>
                        <CardDescription>Manually trigger a new deployment of your application</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-medium text-sm">Warning</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Triggering a deployment will rebuild and redeploy your entire application. This
                                        process may take several minutes and will briefly interrupt service.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button onClick={onTriggerDeploy} disabled={loading.deploy} size="lg" className="w-full h-14">
                            {loading.deploy ? (
                                <>
                                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                    Triggering Deployment...
                                </>
                            ) : (
                                <>
                                    <Rocket className="mr-2 h-5 w-5" />
                                    Deploy Now
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Last Deployment Info */}
            {hasDeployHook && deploySettings.lastDeployment && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Last Deployment
                        </CardTitle>
                        <CardDescription>Most recent deployment information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-1">
                                    <p className="font-medium text-sm">Timestamp</p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {new Date(deploySettings.lastDeployment.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <Badge
                                    variant={
                                        deploySettings.lastDeployment.status === 'triggered' ? 'default' : 'secondary'
                                    }>
                                    {deploySettings.lastDeployment.status}
                                </Badge>
                            </div>

                            {deploySettings.deploymentHistory && deploySettings.deploymentHistory.length > 1 && (
                                <div className="mt-4">
                                    <p className="mb-2 font-medium text-sm">Recent Deployments</p>
                                    <ScrollArea className="h-32 w-full rounded-lg border">
                                        <div className="p-3 space-y-2">
                                            {deploySettings.deploymentHistory.slice(1).map((deployment, index) => (
                                                <div key={index} className="flex items-center justify-between text-xs">
                                                    <span className="font-mono text-muted-foreground">
                                                        {new Date(deployment.timestamp).toLocaleString()}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {deployment.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* No Deploy Hook Configured */}
            {!hasDeployHook && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            No Deploy Hook Configured
                        </CardTitle>
                        <CardDescription>Set up a deploy hook to enable automatic deployments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                To enable deployment functionality, you need to configure a deploy hook URL from your
                                hosting provider.
                            </p>

                            <div className="rounded-lg border bg-muted p-4">
                                <p className="mb-2 font-medium text-sm">How to get a deploy hook:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                                    <li>For Vercel: Project Settings → Git → Deploy Hooks</li>
                                    <li>For Netlify: Site Settings → Build & Deploy → Build Hooks</li>
                                    <li>For Cloudflare Pages: Workers & Pages → Pages project → Settings → Builds</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Deploy Skeleton Component
function DeploySkeleton() {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-96" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

// Server Info Skeleton Component
function ServerInfoSkeleton() {
    return (
        <div className="grid gap-6">
            {/* Version Information Skeleton */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-lg border p-4 text-center">
                                <Skeleton className="mx-auto mb-2 h-8 w-16" />
                                <Skeleton className="mx-auto h-4 w-12" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* System Information Skeleton */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
                                <Skeleton className="h-8 w-8 rounded" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Server Logs Skeleton */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="h-64 w-full space-y-2 rounded-lg border p-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-4 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Database Skeleton Component
function DatabaseSkeleton() {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-4 w-32" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="rounded-lg border p-4">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-5 w-12" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
