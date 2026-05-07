// @/app/(backend)/admin/developer/endpoints/new-key/page.jsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle, Clock, Copy, Database, Info, Key, Shield, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createAPIKey, getDatabaseCollections } from '@/lib/server/endpoints.js';

// Form validation schema
const apiKeySchema = z.object({
    name: z.string().min(1, 'API key name is required').max(50, 'Name must be less than 50 characters'),
    description: z.string().optional(),
    permissions: z.array(z.string()).min(1, 'At least one permission must be selected'),
    allowedCollections: z.array(z.string()).default([]),
    rateLimit: z.number().min(1, 'Rate limit must be at least 1').max(10000, 'Rate limit cannot exceed 10,000'),
    expiresAt: z.string().optional()
});

// All known system collections (mirrors knownCollections in database.js)
const SYSTEM_COLLECTIONS = [
    { name: 'users', label: 'Users' },
    { name: 'roles', label: 'Roles' },
    { name: 'site_settings', label: 'Site Settings' },
    { name: 'store_settings', label: 'Store Settings' },
    { name: 'catalog', label: 'Catalog / Products' },
    { name: 'categories', label: 'Categories' },
    { name: 'collections', label: 'Collections' },
    { name: 'attributes', label: 'Attributes' },
    { name: 'orders', label: 'Orders' },
    { name: 'customers', label: 'Customers' },
    { name: 'coupons', label: 'Coupons' },
    { name: 'reviews', label: 'Reviews' },
    { name: 'testimonials', label: 'Testimonials' },
    { name: 'blocks', label: 'Blocks' },
    { name: 'appointments', label: 'Appointments' },
    { name: 'newsletter_campaigns', label: 'Newsletter Campaigns' },
    { name: 'newsletter_subscribers', label: 'Newsletter Subscribers' },
    { name: 'newsletter_templates', label: 'Newsletter Templates' },
    { name: 'tasks', label: 'Tasks' },
    { name: 'agenda_items', label: 'Agenda Items' },
    { name: 'schedule_items', label: 'Schedule Items' },
    { name: 'notifications', label: 'Notifications' },
    { name: 'favorites', label: 'Favorites' }
];

export default function NewKeyPage() {
    const [step, setStep] = useState(1);
    const [generatedKey, setGeneratedKey] = useState(null);
    const [isCopied, setIsCopied] = useState(false);
    const [collections, setCollections] = useState(SYSTEM_COLLECTIONS);
    const [allCollectionsSelected, setAllCollectionsSelected] = useState(true);

    // Load database collections on mount
    useEffect(() => {
        getDatabaseCollections().then((res) => {
            if (res?.success && res.data?.length > 0) {
                // Always keep all SYSTEM_COLLECTIONS; append any extra DB collections not already listed
                const systemNames = new Set(SYSTEM_COLLECTIONS.map((c) => c.name));
                const extras = res.data
                    .filter((c) => !systemNames.has(c.name))
                    .map((c) => ({ name: c.name, label: c.name }));
                setCollections([...SYSTEM_COLLECTIONS, ...extras]);
            }
            // If DB call fails or returns nothing, SYSTEM_COLLECTIONS is already the default state
        }).catch(() => {});
    }, []);

    // Available permissions
    const permissions = [
        {
            id: 'READ',
            label: 'Read Access',
            description: 'Retrieve data from allowed collections (GET requests)'
        },
        {
            id: 'WRITE',
            label: 'Write Access',
            description: 'Create and update records in allowed collections (POST / PUT requests)'
        },
        {
            id: 'DELETE',
            label: 'Delete Access',
            description: 'Remove records from allowed collections (DELETE requests)'
        },
        {
            id: 'UPLOAD',
            label: 'Upload Access',
            description: 'Upload and manage files in the media storage system'
        }
    ];

    const form = useForm({
        resolver: zodResolver(apiKeySchema),
        defaultValues: {
            name: '',
            description: '',
            permissions: [],
            allowedCollections: [],
            rateLimit: 100,
            expiresAt: ''
        }
    });

    const handleAllCollectionsToggle = (checked) => {
        setAllCollectionsSelected(checked);
        if (checked) form.setValue('allowedCollections', []);
    };

    const onSubmit = async (data) => {
        try {
            const keyData = {
                ...data,
                // empty allowedCollections = '*' (all) — handled in createAPIKey
                allowedCollections: allCollectionsSelected ? [] : data.allowedCollections,
                status: 'active',
                usage: 0,
                createdAt: new Date().toISOString(),
                lastUsed: null
            };

            const result = await createAPIKey(keyData);

            if (!result?.success) {
                toast.error(result?.error || 'Failed to create API key');
                return;
            }

            setGeneratedKey({
                ...keyData,
                key: result.data?.key || result.data?.data?.key,
                id: result.data?.id || result.data?.data?.id || Math.random().toString(36).substring(2, 9)
            });

            setStep(2);
            toast.success('API key created successfully!');
        } catch (error) {
            console.error('Error creating API key:', error);
            toast.error('Failed to create API key');
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedKey.key);
            setIsCopied(true);
            toast.success('API key copied to clipboard!');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (_error) {
            toast.error('Failed to copy to clipboard');
        }
    };

    const goBack = () => {
        window.history.back();
    };

    if (step === 2 && generatedKey) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={goBack}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to API Keys
                    </Button>
                </div>

                <div className="mx-auto max-w-2xl">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <CardTitle>API Key Created Successfully</CardTitle>
                            <CardDescription>
                                Your new API key has been generated. Make sure to copy it now as you won&apos;t be
                                able to see it again.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Generated API Key */}
                            <div className="space-y-2">
                                <Label className="font-medium text-sm">Your API Key</Label>
                                <div className="flex gap-2">
                                    <Input value={generatedKey.key} readOnly className="font-mono text-sm" />
                                    <Button variant="outline" onClick={copyToClipboard} className="flex items-center gap-2">
                                        {isCopied ? (
                                            <>
                                                <CheckCircle className="h-4 w-4" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                Copy
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Key Details */}
                            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                                <h3 className="font-medium">Key Details</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="text-muted-foreground text-sm">Name</p>
                                        <p className="font-medium">{generatedKey.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Rate Limit</p>
                                        <p className="font-medium">{generatedKey.rateLimit} requests/hour</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Created</p>
                                        <p className="font-medium">
                                            {new Date(generatedKey.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Status</p>
                                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                                    </div>
                                </div>

                                {generatedKey.description && (
                                    <div>
                                        <p className="text-muted-foreground text-sm">Description</p>
                                        <p className="text-sm">{generatedKey.description}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="mb-2 text-muted-foreground text-sm">Permissions</p>
                                    <div className="flex flex-wrap gap-1">
                                        {generatedKey.permissions.map((permission) => (
                                            <Badge key={permission} variant="outline" className="text-xs">
                                                {permission}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-muted-foreground text-sm">Collection Access</p>
                                    {!generatedKey.allowedCollections?.length ? (
                                        <Badge variant="outline" className="text-xs">All Collections</Badge>
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {generatedKey.allowedCollections.map((col) => (
                                                <Badge key={col} variant="outline" className="text-xs">{col}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Security Warning */}
                            <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                <Info className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
                                <div className="text-sm">
                                    <p className="font-medium text-yellow-800">Important Security Information</p>
                                    <ul className="mt-2 space-y-1 text-yellow-700">
                                        <li>• Store this API key securely and never share it publicly</li>
                                        <li>• This key won&apos;t be shown again — copy it now</li>
                                        <li>• Use environment variables to store the key in your applications</li>
                                        <li>• Monitor usage and revoke the key if compromised</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button onClick={goBack} className="flex-1">
                                    Go to API Keys
                                </Button>
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                    Create Another Key
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={goBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <div>
                    <h1 className="font-bold text-3xl">Create API Key</h1>
                    <p className="text-muted-foreground">
                        Generate a new API key with specific permissions and rate limits
                    </p>
                </div>
            </div>

            <div className="mx-auto max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            API Key Configuration
                        </CardTitle>
                        <CardDescription>Configure your new API key settings and permissions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* Basic Information */}
                                <div className="space-y-4">
                                    <h3 className="font-medium text-lg">Basic Information</h3>

                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>API Key Name *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="My Application Key" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    A descriptive name to identify this API key
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Optional description of this key's purpose..."
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Optional description to help you remember this key&apos;s purpose
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Rate Limiting */}
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 font-medium text-lg">
                                        <Zap className="h-5 w-5" />
                                        Rate Limiting
                                    </h3>

                                    <FormField
                                        control={form.control}
                                        name="rateLimit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Requests per Hour</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="100"
                                                        {...field}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value ? parseInt(e.target.value, 10) : 100
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Maximum number of requests this key can make per hour
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Permissions */}
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 font-medium text-lg">
                                        <Shield className="h-5 w-5" />
                                        Permissions
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        Select the CRUD operations this API key should be allowed to perform.
                                        Choose only the minimum required permissions for security.
                                    </p>

                                    <FormField
                                        control={form.control}
                                        name="permissions"
                                        render={() => (
                                            <FormItem>
                                                <div className="grid gap-3">
                                                    {permissions.map((permission) => (
                                                        <FormField
                                                            key={permission.id}
                                                            control={form.control}
                                                            name="permissions"
                                                            render={({ field }) => (
                                                                <FormItem
                                                                    key={permission.id}
                                                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={field.value?.includes(permission.id)}
                                                                            onCheckedChange={(checked) =>
                                                                                checked
                                                                                    ? field.onChange([...field.value, permission.id])
                                                                                    : field.onChange(field.value?.filter((v) => v !== permission.id))
                                                                            }
                                                                        />
                                                                    </FormControl>
                                                                    <div className="flex-1 space-y-1 leading-none">
                                                                        <FormLabel className="cursor-pointer font-medium text-sm">
                                                                            {permission.label}
                                                                        </FormLabel>
                                                                        <FormDescription className="text-xs">
                                                                            {permission.description}
                                                                        </FormDescription>
                                                                    </div>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Collection Access */}
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 font-medium text-lg">
                                        <Database className="h-5 w-5" />
                                        Collection Access
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        Restrict this key to specific data collections. Leave &quot;All
                                        Collections&quot; selected to allow access to every collection.
                                    </p>

                                    {/* All collections toggle */}
                                    <div className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border bg-muted/30 p-4">
                                        <Checkbox
                                            id="all-collections"
                                            checked={allCollectionsSelected}
                                            onCheckedChange={handleAllCollectionsToggle}
                                        />
                                        <div className="flex-1 space-y-1 leading-none">
                                            <Label
                                                htmlFor="all-collections"
                                                className="cursor-pointer font-medium text-sm">
                                                All Collections
                                            </Label>
                                            <p className="text-muted-foreground text-xs">
                                                Grant access to every current and future collection
                                            </p>
                                        </div>
                                    </div>

                                    {/* Individual collections (shown when All is unchecked) */}
                                    {!allCollectionsSelected && (
                                        <FormField
                                            control={form.control}
                                            name="allowedCollections"
                                            render={() => (
                                                <FormItem>
                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                        {collections.map((col) => (
                                                            <FormField
                                                                key={col.name}
                                                                control={form.control}
                                                                name="allowedCollections"
                                                                render={({ field }) => (
                                                                    <FormItem
                                                                        key={col.name}
                                                                        className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(col.name)}
                                                                                onCheckedChange={(checked) =>
                                                                                    checked
                                                                                        ? field.onChange([...field.value, col.name])
                                                                                        : field.onChange(field.value?.filter((v) => v !== col.name))
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="cursor-pointer font-normal text-sm">
                                                                            {col.label || col.name}
                                                                        </FormLabel>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>

                                {/* Expiration */}
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 font-medium text-lg">
                                        <Clock className="h-5 w-5" />
                                        Expiration (Optional)
                                    </h3>

                                    <FormField
                                        control={form.control}
                                        name="expiresAt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Expires On</FormLabel>
                                                <FormControl>
                                                    <Input type="datetime-local" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Leave empty for a key that never expires
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex gap-3 pt-6">
                                    <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1">
                                        <Key className="mr-2 h-4 w-4" />
                                        Generate API Key
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
