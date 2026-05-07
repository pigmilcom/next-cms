// @/app/(backend)/admin/developer/endpoints/page.jsx

'use client';

import { Activity, BookOpen, CheckCircle, Clock, Code, Copy, Eye, Key, Plus, Search, Shield, XCircle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    deleteAPIKey,
    deleteCustomEndpoint,
    getAllAPIKeys,
    getAllEndpoints,
    getAPISettings,
    getDatabaseCollections,
    updateAPIKey,
    updateAPISettings,
    updateCustomEndpoint
} from '@/lib/server/endpoints.js';

export default function EndpointsPage() {
    const [selectedTab, setSelectedTab] = useState('endpoints');
    const [searchTerm, setSearchTerm] = useState('');
    const [endpoints, setEndpoints] = useState([]);
    const [apiKeys, setApiKeys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEndpoint, setSelectedEndpoint] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [apiSettings, setApiSettings] = useState({ apiEnabled: true, allowedOrigins: [] });
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
    const router = useRouter();

    // Load default endpoints and API keys from database
    const fetchData = async () => {
        try {
            setIsLoading(true);

            // Fetch endpoints, API keys, and API settings from server functions
            const [endpointsResponse, apiKeysResponse, apiSettingsResponse] = await Promise.all([
                getAllEndpoints(),
                getAllAPIKeys(),
                getAPISettings()
            ]);

            const endpointsData = endpointsResponse?.success ? endpointsResponse.data : [];
            const apiKeysData = apiKeysResponse?.success ? apiKeysResponse.data : [];
            const apiSettingsData = apiSettingsResponse?.success ? apiSettingsResponse.data : null;

            setEndpoints(endpointsData);
            setApiKeys(apiKeysData);

            // Set API settings (use server response or default)
            if (apiSettingsData) {
                setApiSettings(apiSettingsData);
            } else {
                // Use default API settings
                setApiSettings({ 
                    apiEnabled: true, 
                    allowedOrigins: ['*'],
                    rateLimit: {
                        enabled: true,
                        defaultLimit: 100,
                        windowMs: 3600000
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load endpoints and API keys');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRevokeApiKey = async (apiKeyId) => {
        try {
            await updateAPIKey(apiKeyId, { status: 'revoked', revokedAt: new Date().toISOString() });
            toast.success('API key revoked successfully');
            fetchData();
        } catch (error) {
            console.error('Error revoking API key:', error);
            toast.error('Failed to revoke API key');
        }
    };

    const handleDeleteApiKey = async (apiKeyId) => {
        try {
            await deleteAPIKey(apiKeyId);
            toast.success('API key deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Error deleting API key:', error);
            toast.error('Failed to delete API key');
        }
    };

    const handleCopyApiKey = async (apiKey) => {
        try {
            await navigator.clipboard.writeText(apiKey.key || apiKey.keyPreview);
            toast.success('API key copied to clipboard');
        } catch (_error) {
            toast.error('Failed to copy to clipboard');
        }
    };

    const handleCreateNewKey = () => {
        router.push('/admin/developer/endpoints/new-key');
    };

    const handleViewEndpoint = (endpoint) => {
        setSelectedEndpoint(endpoint);
        setIsDialogOpen(true);
    };

    const handleUpdateApiSettings = async (newSettings) => {
        try {
            setIsUpdatingSettings(true);

            const updatedSettings = {
                ...apiSettings,
                ...newSettings
            };

            const result = await updateAPISettings(updatedSettings);

            if (result.success) {
                setApiSettings(updatedSettings);
                toast.success('API settings updated successfully');
            } else {
                toast.error(result.error || 'Failed to update API settings');
            }
        } catch (error) {
            console.error('Error updating API settings:', error);
            toast.error('Failed to update API settings');
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    const methodConfig = {
        GET: { color: 'bg-green-100 text-green-800', textColor: 'text-green-600' },
        POST: { color: 'bg-blue-100 text-blue-800', textColor: 'text-blue-600' },
        PUT: { color: 'bg-orange-100 text-orange-800', textColor: 'text-orange-600' },
        DELETE: { color: 'bg-red-100 text-red-800', textColor: 'text-red-600' }
    };

    const statusConfig = {
        active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
        deprecated: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
        inactive: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };

    const authConfig = {
        none: { color: 'bg-gray-100 text-gray-800', label: 'Public', icon: Eye },
        required: { color: 'bg-blue-100 text-blue-800', label: 'Auth Required', icon: Key },
        admin: { color: 'bg-purple-100 text-purple-800', label: 'Admin Only', icon: Shield }
    };

    const filteredEndpoints = endpoints.filter((endpoint) => {
        if (!searchTerm) return true;
        return (
            endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
            endpoint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            endpoint.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            endpoint.collection?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const filteredApiKeys = apiKeys.filter((apiKey) => apiKey.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Calculate stats
    const endpointStats = {
        total: endpoints.length,
        active: endpoints.filter((e) => e.status === 'active').length,
        deprecated: endpoints.filter((e) => e.status === 'deprecated').length,
        totalUsage: endpoints.reduce((sum, e) => sum + (e.usage || 0), 0)
    };

    const apiKeyStats = {
        total: apiKeys.length,
        active: apiKeys.filter((k) => k.status === 'active').length,
        inactive: apiKeys.filter((k) => k.status !== 'active').length,
        totalUsage: apiKeys.reduce((sum, k) => sum + (k.usage || 0), 0)
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="mb-2 h-8 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-3xl">API Endpoints</h1>
                    <p className="text-muted-foreground">Manage API endpoints and access keys</p>
                </div>
                <Button className="flex items-center gap-2" onClick={handleCreateNewKey}>
                    <Plus className="h-4 w-4" />
                    Create API Key
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-sm">Total Endpoints</p>
                                <p className="font-bold text-2xl">{endpointStats.total}</p>
                            </div>
                            <Code className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-sm">Active APIs</p>
                                <p className="font-bold text-2xl text-green-600">{endpointStats.active}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-sm">API Keys</p>
                                <p className="font-bold text-2xl">{apiKeyStats.active}</p>
                            </div>
                            <Key className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-sm">Total Requests</p>
                                <p className="font-bold text-2xl">{endpointStats.totalUsage.toLocaleString()}</p>
                            </div>
                            <Activity className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="endpoints" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Endpoints
                    </TabsTrigger>
                    <TabsTrigger value="keys" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API Keys
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        API Settings
                    </TabsTrigger>
                    <TabsTrigger value="docs" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Documentation
                    </TabsTrigger>
                </TabsList>

                {/* Search */}
                <div className="flex gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
                            <Input
                                placeholder={selectedTab === 'endpoints' ? 'Search endpoints...' : 'Search API keys...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>

                {/* Endpoints Tab */}
                <TabsContent value="endpoints">
                    <Card>
                        <CardHeader>
                            <CardTitle>API Endpoints</CardTitle>
                            <CardDescription>
                                {filteredEndpoints.length} endpoint{filteredEndpoints.length !== 1 ? 's' : ''} available
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {filteredEndpoints.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Code className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                                    <h3 className="mb-2 font-medium text-lg">No endpoints found</h3>
                                    <p className="text-muted-foreground">
                                        {searchTerm
                                            ? `No endpoints match "${searchTerm}"`
                                            : 'No API endpoints available'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Method</TableHead>
                                                <TableHead>Endpoint</TableHead>
                                                <TableHead className="hidden md:table-cell">Description</TableHead>
                                                <TableHead className="hidden sm:table-cell">Auth</TableHead>
                                                <TableHead className="hidden lg:table-cell">Rate Limit</TableHead>
                                                <TableHead className="hidden lg:table-cell">Usage</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredEndpoints.map((endpoint) => {
                                                const StatusIcon = statusConfig[endpoint.status]?.icon || CheckCircle;
                                                const AuthIcon = authConfig[endpoint.authentication]?.icon || Eye;

                                                return (
                                                    <TableRow key={endpoint.id} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <Badge
                                                                className={
                                                                    methodConfig[endpoint.method]?.color ||
                                                                    methodConfig.GET.color
                                                                }>
                                                                {endpoint.method}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                                                {endpoint.path}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell className="hidden max-w-xs md:table-cell">
                                                            <p className="truncate text-muted-foreground text-sm">
                                                                {endpoint.description}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <div className="flex items-center gap-1">
                                                                <AuthIcon className="h-3 w-3" />
                                                                <span className="text-xs">
                                                                    {authConfig[endpoint.authentication]?.label ||
                                                                        'Public'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden lg:table-cell">
                                                            <div className="flex items-center gap-1">
                                                                <Zap className="h-3 w-3" />
                                                                <span className="text-xs">
                                                                    {endpoint.rateLimit || 'No limit'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden lg:table-cell">
                                                            <span className="text-xs">
                                                                {endpoint.usage || 0} requests
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={
                                                                    statusConfig[endpoint.status]?.color ||
                                                                    statusConfig.active.color
                                                                }>
                                                                <StatusIcon className="mr-1 h-3 w-3" />
                                                                {endpoint.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleViewEndpoint(endpoint)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* API Keys Tab */}
                <TabsContent value="keys">
                    <Card>
                        <CardHeader>
                            <CardTitle>API Keys</CardTitle>
                            <CardDescription>
                                {filteredApiKeys.length} API key{filteredApiKeys.length !== 1 ? 's' : ''} configured
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredApiKeys.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Key className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                                        <h3 className="mb-2 font-medium text-lg">No API keys found</h3>
                                        <p className="mb-4 text-muted-foreground">
                                            {searchTerm
                                                ? `No API keys match "${searchTerm}"`
                                                : 'Get started by creating your first API key'}
                                        </p>
                                        <Button onClick={handleCreateNewKey}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create API Key
                                        </Button>
                                    </div>
                                ) : (
                                    filteredApiKeys.map((apiKey) => {
                                        const StatusIcon = statusConfig[apiKey.status]?.icon || CheckCircle;

                                        return (
                                            <div
                                                key={apiKey.id}
                                                className="flex items-center gap-4 rounded-lg border p-4 transition-shadow hover:shadow-sm">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                                    <Key className="h-5 w-5 text-blue-600" />
                                                </div>

                                                <div className="flex-1">
                                                    <div className="mb-2 flex items-center gap-2">
                                                        <h3 className="font-medium">{apiKey.name}</h3>
                                                        <Badge
                                                            className={
                                                                statusConfig[apiKey.status]?.color ||
                                                                statusConfig.active.color
                                                            }>
                                                            <StatusIcon className="mr-1 h-3 w-3" />
                                                            {apiKey.status}
                                                        </Badge>
                                                    </div>

                                                    <div className="mb-2 flex items-center gap-2">
                                                        <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">
                                                            {apiKey.keyPreview || apiKey.key || 'Hidden'}
                                                        </code>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleCopyApiKey(apiKey)}>
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    <div className="mb-2 flex flex-wrap gap-1">
                                                        {(apiKey.permissions || []).map((permission, index) => (
                                                            <Badge
                                                                key={`${permission}-${index}`}
                                                                variant="outline"
                                                                className="text-xs">
                                                                {permission}
                                                            </Badge>
                                                        ))}
                                                    </div>

                                                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                                                        <span>
                                                            Created:{' '}
                                                            {apiKey.createdAt
                                                                ? new Date(apiKey.createdAt).toLocaleDateString()
                                                                : 'Unknown'}
                                                        </span>
                                                        <span>
                                                            Last used:{' '}
                                                            {apiKey.lastUsed
                                                                ? new Date(apiKey.lastUsed).toLocaleDateString()
                                                                : 'Never'}
                                                        </span>
                                                        <span>{(apiKey.usage || 0).toLocaleString()} requests</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {apiKey.status === 'active' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRevokeApiKey(apiKey.id)}>
                                                            Revoke
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteApiKey(apiKey.id)}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* API Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>API Access Control</CardTitle>
                            <CardDescription>Manage global API access and security settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* API Enable/Disable */}
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-1">
                                    <h3 className="font-medium">API Access</h3>
                                    <p className="text-muted-foreground text-sm">
                                        {apiSettings.apiEnabled
                                            ? 'API endpoints are currently accessible to external requests'
                                            : 'API endpoints are currently disabled for external requests'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge
                                        className={
                                            apiSettings.apiEnabled
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }>
                                        {apiSettings.apiEnabled ? (
                                            <>
                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                Enabled
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="mr-1 h-3 w-3" />
                                                Disabled
                                            </>
                                        )}
                                    </Badge>
                                    {isUpdatingSettings && (
                                        <Clock className="h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={apiSettings.apiEnabled}
                                            disabled={isUpdatingSettings}
                                            onCheckedChange={(checked) =>
                                                handleUpdateApiSettings({ apiEnabled: checked })
                                            }
                                        />
                                        <span className="font-medium text-sm">
                                            {apiSettings.apiEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Rate Limiting Settings */}
                            <div className="space-y-4">
                                <h3 className="font-medium">Rate Limiting</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="font-medium text-sm">Default Rate Limit (per hour)</label>
                                        <Input
                                            type="number"
                                            value={apiSettings.rateLimit?.defaultLimit || 100}
                                            onChange={(e) => {
                                                const newLimit = parseInt(e.target.value, 10) || 100;
                                                handleUpdateApiSettings({
                                                    rateLimit: {
                                                        ...apiSettings.rateLimit,
                                                        defaultLimit: newLimit
                                                    }
                                                });
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2 pt-6">
                                        <Switch
                                            id="rateLimit"
                                            checked={apiSettings.rateLimit?.enabled || false}
                                            onCheckedChange={(checked) => {
                                                handleUpdateApiSettings({
                                                    rateLimit: {
                                                        ...apiSettings.rateLimit,
                                                        enabled: checked
                                                    }
                                                });
                                            }}
                                        />
                                        <label htmlFor="rateLimit" className="font-medium text-sm">
                                            Enable Rate Limiting
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Allowed Origins */}
                            <div className="space-y-4">
                                <h3 className="font-medium">Allowed Origins</h3>
                                <p className="text-muted-foreground text-sm">
                                    Control which domains can access your API. Use "*" to allow all origins.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {(apiSettings.allowedOrigins || ['*']).map((origin, index) => (
                                        <Badge key={index} variant="outline" className="flex items-center gap-1">
                                            {origin}
                                            {origin !== '*' && (
                                                <button
                                                    onClick={() => {
                                                        const newOrigins = apiSettings.allowedOrigins.filter(
                                                            (_, i) => i !== index
                                                        );
                                                        handleUpdateApiSettings({ allowedOrigins: newOrigins });
                                                    }}
                                                    className="ml-1 hover:text-red-600">
                                                    ×
                                                </button>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* API Statistics */}
                            <div className="space-y-4">
                                <h3 className="font-medium">Statistics</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="rounded border p-3">
                                        <p className="text-muted-foreground text-sm">Status</p>
                                        <p className="font-medium">{apiSettings.apiEnabled ? 'Active' : 'Disabled'}</p>
                                    </div>
                                    <div className="rounded border p-3">
                                        <p className="text-muted-foreground text-sm">Last Updated</p>
                                        <p className="font-medium">
                                            {apiSettings.updatedAt
                                                ? new Date(apiSettings.updatedAt).toLocaleDateString()
                                                : 'Never'}
                                        </p>
                                    </div>
                                    <div className="rounded border p-3">
                                        <p className="text-muted-foreground text-sm">Created</p>
                                        <p className="font-medium">
                                            {apiSettings.createdAt
                                                ? new Date(apiSettings.createdAt).toLocaleDateString()
                                                : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* API Documentation Tab */}
                <TabsContent value="docs" className="space-y-6">
                    {/* Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                API Reference
                            </CardTitle>
                            <CardDescription>
                                How to authenticate and interact with the REST API from any external server or client
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
                                <p className="font-medium text-blue-800">Base URL</p>
                                <code className="mt-1 block font-mono text-blue-700">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/query/[collection]</code>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                All endpoints require an <strong>API Key</strong> passed as a Bearer token in the
                                <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-xs">Authorization</code> header.
                                The key must have the corresponding permission for the HTTP method used.
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                                {[
                                    { method: 'GET', permission: 'READ', color: 'bg-green-100 text-green-800' },
                                    { method: 'POST', permission: 'WRITE', color: 'bg-blue-100 text-blue-800' },
                                    { method: 'PUT', permission: 'WRITE', color: 'bg-orange-100 text-orange-800' },
                                    { method: 'DELETE', permission: 'DELETE', color: 'bg-red-100 text-red-800' }
                                ].map(({ method, permission, color }) => (
                                    <div key={method} className="rounded-lg border p-3 text-center">
                                        <Badge className={`mb-1 ${color}`}>{method}</Badge>
                                        <p className="text-muted-foreground text-xs">Requires <strong>{permission}</strong></p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Authentication */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                Authentication
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground text-sm">Pass your API key using the <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Authorization</code> header:</p>
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`Authorization: Bearer pk_live_your_api_key_here`}</code></pre>
                            </div>
                            <p className="text-muted-foreground text-sm">Or pass it as a query parameter (less secure, avoid in production):</p>
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`GET /api/query/catalog?api_key=pk_live_your_api_key_here`}</code></pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* GET - Read */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800">GET</Badge>
                                Read Records
                            </CardTitle>
                            <CardDescription>Retrieve all records or a single record from any collection</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Fetch all */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Fetch all records</h4>
                                <div className="rounded-lg bg-muted p-4">
                                    <pre className="overflow-x-auto text-xs"><code>{`// JavaScript (fetch)
const res = await fetch('https://your-domain.com/api/query/catalog', {
  headers: {
    'Authorization': 'Bearer pk_live_your_api_key_here'
  }
});
const data = await res.json();
// data.success, data.data[], data.pagination`}</code></pre>
                                </div>
                                <div className="rounded-lg bg-muted p-4">
                                    <pre className="overflow-x-auto text-xs"><code>{`# cURL
curl -X GET 'https://your-domain.com/api/query/catalog' \\
  -H 'Authorization: Bearer pk_live_your_api_key_here'`}</code></pre>
                                </div>
                            </div>
                            {/* Fetch by ID */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Fetch single record by ID</h4>
                                <div className="rounded-lg bg-muted p-4">
                                    <pre className="overflow-x-auto text-xs"><code>{`GET /api/query/catalog?id=RECORD_ID

// JavaScript
const res = await fetch('/api/query/catalog?id=abc123', {
  headers: { 'Authorization': 'Bearer pk_live_...' }
});
const { data } = await res.json();`}</code></pre>
                                </div>
                            </div>
                            {/* Pagination & search */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Pagination &amp; Search</h4>
                                <div className="rounded-lg bg-muted p-4">
                                    <pre className="overflow-x-auto text-xs"><code>{`GET /api/query/catalog?page=1&limit=20&search=shoes

// Response
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalItems": 120,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": false
  }
}`}</code></pre>
                                </div>
                            </div>
                            {/* Filter by field */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Filter by field value</h4>
                                <div className="rounded-lg bg-muted p-4">
                                    <pre className="overflow-x-auto text-xs"><code>{`GET /api/query/orders?key=status&value=pending`}</code></pre>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* POST - Create */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-800">POST</Badge>
                                Create Record
                            </CardTitle>
                            <CardDescription>Create a new record in any collection. Requires WRITE permission.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`// JavaScript
const res = await fetch('https://your-domain.com/api/query/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pk_live_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: 'cust_123',
    total: 49.99,
    status: 'pending',
    items: [{ productId: 'prod_1', qty: 2 }]
  })
});
const { success, data } = await res.json();
// data.id — ID of the newly created record`}</code></pre>
                            </div>
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`# cURL
curl -X POST 'https://your-domain.com/api/query/orders' \\
  -H 'Authorization: Bearer pk_live_your_api_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{"customerId":"cust_123","total":49.99,"status":"pending"}'`}</code></pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PUT - Update */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-orange-100 text-orange-800">PUT</Badge>
                                Update Record
                            </CardTitle>
                            <CardDescription>Update an existing record. The request body must include the record <code className="font-mono text-xs">id</code>. Requires WRITE permission.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`// JavaScript
const res = await fetch('https://your-domain.com/api/query/orders', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer pk_live_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 'order_abc123',   // required
    status: 'shipped',
    trackingNumber: 'TRK999'
  })
});
const { success, data } = await res.json();`}</code></pre>
                            </div>
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`# cURL
curl -X PUT 'https://your-domain.com/api/query/orders' \\
  -H 'Authorization: Bearer pk_live_your_api_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{"id":"order_abc123","status":"shipped"}'`}</code></pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* DELETE */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-red-100 text-red-800">DELETE</Badge>
                                Delete Record
                            </CardTitle>
                            <CardDescription>Delete a record by ID from any collection. Requires DELETE permission.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`// JavaScript
const res = await fetch('https://your-domain.com/api/query/orders?id=order_abc123', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer pk_live_your_api_key_here'
  }
});
const { success, message } = await res.json();`}</code></pre>
                            </div>
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`# cURL
curl -X DELETE 'https://your-domain.com/api/query/orders?id=order_abc123' \\
  -H 'Authorization: Bearer pk_live_your_api_key_here'`}</code></pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Response format */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5" />
                                Response Format
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm text-green-700">Success</h4>
                                    <div className="rounded-lg bg-muted p-4">
                                        <pre className="overflow-x-auto text-xs"><code>{`{
  "success": true,
  "data": { ... } | [ ... ],
  "message": "Optional message",
  "pagination": {        // GET list only
    "currentPage": 1,
    "totalItems": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}`}</code></pre>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm text-red-700">Error</h4>
                                    <div className="rounded-lg bg-muted p-4">
                                        <pre className="overflow-x-auto text-xs"><code>{`{
  "error": "Human-readable message",
  "message": "Optional detail"
}

// Common status codes:
// 400 — Bad request / missing params
// 401 — Invalid or missing API key
// 403 — Permission denied
// 404 — Record not found
// 429 — Rate limit exceeded
// 500 — Server error`}</code></pre>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Node.js SDK-style helper */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Node.js Helper Example
                            </CardTitle>
                            <CardDescription>A reusable helper for your Node.js / Next.js server</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="overflow-x-auto text-xs"><code>{`// lib/api-client.js
const BASE = 'https://your-domain.com/api/query';
const KEY  = process.env.API_KEY; // store in .env

const headers = () => ({
  'Authorization': \`Bearer \${KEY}\`,
  'Content-Type': 'application/json'
});

export const api = {
  getAll:  (col, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(\`\${BASE}/\${col}\${qs ? '?' + qs : ''}\`, { headers: headers() }).then(r => r.json());
  },
  getById: (col, id)         => fetch(\`\${BASE}/\${col}?id=\${id}\`, { headers: headers() }).then(r => r.json()),
  create:  (col, body)       => fetch(\`\${BASE}/\${col}\`, { method: 'POST',   headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),
  update:  (col, body)       => fetch(\`\${BASE}/\${col}\`, { method: 'PUT',    headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),
  remove:  (col, id)         => fetch(\`\${BASE}/\${col}?id=\${id}\`, { method: 'DELETE', headers: headers() }).then(r => r.json()),
};

// Usage:
const { data } = await api.getAll('catalog', { page: 1, limit: 20 });
const order    = await api.getById('orders', 'order_123');
const created  = await api.create('orders', { total: 49.99, status: 'pending' });
const updated  = await api.update('orders', { id: 'order_123', status: 'shipped' });
const deleted  = await api.remove('orders', 'order_123');`}</code></pre>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Endpoint Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Badge className={methodConfig[selectedEndpoint?.method]?.color || methodConfig.GET.color}>
                                {selectedEndpoint?.method}
                            </Badge>
                            <code className="font-mono text-sm">{selectedEndpoint?.path}</code>
                        </DialogTitle>
                        <DialogDescription>{selectedEndpoint?.description}</DialogDescription>
                    </DialogHeader>

                    {selectedEndpoint && (
                        <div className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <h4 className="mb-2 font-medium text-sm">Authentication</h4>
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const AuthIcon = authConfig[selectedEndpoint.authentication]?.icon || Eye;
                                            return (
                                                <>
                                                    <AuthIcon className="h-4 w-4" />
                                                    <span className="text-sm">
                                                        {authConfig[selectedEndpoint.authentication]?.label || 'Public'}
                                                    </span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-medium text-sm">Rate Limit</h4>
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4" />
                                        <span className="text-sm">{selectedEndpoint.rateLimit || 'No limit'}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-medium text-sm">Status</h4>
                                    <Badge
                                        className={
                                            statusConfig[selectedEndpoint.status]?.color || statusConfig.active.color
                                        }>
                                        {(() => {
                                            const StatusIcon =
                                                statusConfig[selectedEndpoint.status]?.icon || CheckCircle;
                                            return <StatusIcon className="mr-1 h-3 w-3" />;
                                        })()}
                                        {selectedEndpoint.status}
                                    </Badge>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-medium text-sm">Usage</h4>
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        <span className="text-sm">{selectedEndpoint.usage || 0} requests</span>
                                    </div>
                                </div>
                            </div>

                            {/* Parameters */}
                            {selectedEndpoint.parameters && (
                                <div>
                                    <h4 className="mb-2 font-medium text-sm">Parameters</h4>
                                    <div className="rounded bg-muted p-3 font-mono text-sm">
                                        {selectedEndpoint.parameters}
                                    </div>
                                </div>
                            )}

                            {/* Response Format */}
                            <div>
                                <h4 className="mb-2 font-medium text-sm">Response Format</h4>
                                <Badge variant="outline">{selectedEndpoint.responseFormat || 'JSON'}</Badge>
                            </div>

                            {/* Example Response */}
                            {selectedEndpoint.example && (
                                <div>
                                    <h4 className="mb-2 font-medium text-sm">Example Response</h4>
                                    <div className="rounded bg-muted p-3">
                                        <pre className="overflow-x-auto text-xs">
                                            <code>{selectedEndpoint.example}</code>
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Usage Stats */}
                            <div>
                                <h4 className="mb-2 font-medium text-sm">Statistics</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Created:</span>
                                        <div>
                                            {selectedEndpoint.createdAt
                                                ? new Date(selectedEndpoint.createdAt).toLocaleDateString()
                                                : 'Unknown'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Last Used:</span>
                                        <div>
                                            {selectedEndpoint.lastUsed
                                                ? new Date(selectedEndpoint.lastUsed).toLocaleDateString()
                                                : 'Never'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* cURL Example */}
                            <div>
                                <h4 className="mb-2 font-medium text-sm">cURL Example</h4>
                                <div className="rounded bg-muted p-3">
                                    <pre className="overflow-x-auto text-xs">
                                        <code>
                                            {`curl -X ${selectedEndpoint.method} \\
  '${window.location.origin}${selectedEndpoint.path}' \\
${
    selectedEndpoint.authentication !== 'none'
        ? `  -H 'Authorization: Bearer YOUR_API_KEY' \\
`
        : ''
}  -H 'Content-Type: application/json'`}
                                        </code>
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
