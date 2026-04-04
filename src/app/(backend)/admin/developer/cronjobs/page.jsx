// @/app/(backend)/admin/developer/cronjobs/page.jsx

'use client';

import { AlertCircle, Play, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogDescription } from '@/components/ui/alert-dialog';
import {
    createCronjobAction,
    deleteCronjobAction,
    executeDueCronjobsAction,
    getAllCronjobsAction,
    updateCronjobAction,
    getAllSystemCronjobs,
    updateSystemCronjobConfig
} from '@/lib/server/cronjobs.js'; 

/**
 * Frequency validation constants (in minutes)
 */
const FREQUENCY_LIMITS = {
    min: 1, // 1 minute
    max: 43200, // 30 days
    recommended: {
        payments: 5,
        backups: 1440,
        custom: 60
    }
};

export default function CronjobsAdminPage() {
    const [systemJobs, setSystemJobs] = useState([]);
    const [customJobs, setCustomJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [systemJobsConfig, setSystemJobsConfig] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [form, setForm] = useState({
        name: '',
        enabled: true,
        intervalMinutes: 60,
        config: { url: '', method: 'GET' }
    });

    const fetchJobs = async () => {
        setLoading(true);
        try {
            // Fetch both system and custom cronjobs
            const [allJobsResult, systemJobsResult] = await Promise.all([
                getAllCronjobsAction(),
                getAllSystemCronjobs()
            ]);

            if (allJobsResult?.success) {
                const data = allJobsResult.data;
                setCustomJobs(data.custom || []);
            } else {
                toast.error(allJobsResult?.error || 'Failed to load custom cronjobs');
            }

            if (systemJobsResult?.success) {
                setSystemJobs(systemJobsResult.data || []);
                
                // Initialize system jobs config
                const config = {};
                systemJobsResult.data.forEach(job => {
                    config[job.id] = {
                        enabled: job.enabled !== false,
                        intervalMinutes: job.intervalMinutes || job.defaultInterval || 60
                    };
                });
                setSystemJobsConfig(config);
            } else {
                toast.error(systemJobsResult?.error || 'Failed to load system cronjobs');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load cronjobs');
        } finally{
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const createJob = async () => {
        if (!form.name || !form.config.url) return toast.error('Name and URL are required');

        // Validate frequency
        const frequency = Number(form.intervalMinutes);
        if (isNaN(frequency) || frequency < FREQUENCY_LIMITS.min || frequency > FREQUENCY_LIMITS.max) {
            return toast.error(
                `Frequency must be between ${FREQUENCY_LIMITS.min} and ${FREQUENCY_LIMITS.max} minutes`
            );
        }

        try {
            const result = await createCronjobAction(form, FREQUENCY_LIMITS);
            if (result?.success) {
                toast.success('Custom cronjob created');
                setForm({
                    name: '',
                    enabled: true,
                    intervalMinutes: 60,
                    config: { url: '', method: 'GET' }
                });
                fetchJobs();
            } else {
                toast.error(result?.error || 'Failed to create cronjob');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to create cronjob');
        }
    };

    const removeJob = async (id) => {
        try {
            const result = await deleteCronjobAction(id);
            if (result?.success) {
                toast.success('Custom cronjob deleted');
                fetchJobs();
            } else {
                toast.error(result?.error || 'Failed to delete cronjob');
            }
        } catch (err) {
            console.error(err);
            toast.error('Delete failed');
        }
    };

    const toggleCustomJobEnabled = async (job) => {
        try {
            const result = await updateCronjobAction(job.id || job.key || job._id, {
                enabled: !job.enabled
            }, FREQUENCY_LIMITS);
            if (result?.success) {
                fetchJobs();
                toast.success(`Custom cronjob ${job.enabled ? 'disabled' : 'enabled'}`);
            } else {
                toast.error(result?.error || 'Failed to update job');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to update job');
        }
    };

    const handleSystemJobChange = (jobId, field, value) => {
        setSystemJobsConfig(prev => ({
            ...prev,
            [jobId]: {
                ...prev[jobId],
                [field]: value
            }
        }));
        setHasChanges(true);
    };

    const saveSystemJobsConfig = async () => {
        try {
            const updatePromises = Object.entries(systemJobsConfig).map(([jobId, config]) => {
                // Validate frequency
                const frequency = Number(config.intervalMinutes);
                if (isNaN(frequency) || frequency < FREQUENCY_LIMITS.min || frequency > FREQUENCY_LIMITS.max) {
                    throw new Error(
                        `Invalid frequency for ${jobId}: must be between ${FREQUENCY_LIMITS.min} and ${FREQUENCY_LIMITS.max} minutes`
                    );
                }
                
                return updateSystemCronjobConfig(jobId, config, FREQUENCY_LIMITS);
            });

            const results = await Promise.all(updatePromises);
            
            const failed = results.filter(r => !r.success);
            if (failed.length > 0) {
                toast.error(`Failed to update ${failed.length} system cronjob(s)`);
            } else {
                toast.success('System cronjobs configuration saved');
                setHasChanges(false);
                fetchJobs();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to save system cronjobs configuration');
        }
    };

    const runNow = async () => {
        try {
            const result = await executeDueCronjobsAction();
            if (result?.success) {
                toast.success(result.message || 'Cronjobs executed');
                fetchJobs();
            } else {
                toast.error(result?.error || 'Run failed');
            }
        } catch (err) {
            console.error(err);
            toast.error('Run failed');
        }
    };

    // Format frequency for display
    const formatFrequency = (minutes) => {
        const num = Number(minutes);
        if (num < 60) return `${num} minute(s)`;
        if (num < 1440) return `${Math.floor(num / 60)} hour(s)`;
        return `${Math.floor(num / 1440)} day(s)`;
    };

    // Get base URL for cron endpoint
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com';
    const cronUrl = `${baseUrl}/api/cron`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-start justify-start gap-4">
                <div>
                    <h1 className="font-semibold text-2xl">Cronjobs Management</h1>
                    <p className="text-muted-foreground">Configure system and custom scheduled jobs</p>
                </div>

                {/* Cron URL Display */}
                <Card className="w-full">
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Main Cron URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={cronUrl}
                                    className="font-mono text-sm"
                                    onClick={(e) => e.target.select()}
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        navigator.clipboard.writeText(cronUrl);
                                        toast.success('Cron URL copied to clipboard');
                                    }}
                                    title="Copy to clipboard">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Configure this URL in your server cron (Coolify, cron-job.org, etc.) to run all enabled jobs automatically.
                                This endpoint checks and executes both system and custom cronjobs based on their frequency settings.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={fetchJobs}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={runNow}>
                        <Play className="mr-2 h-4 w-4" />
                        Run Due Now
                    </Button>
                </div>
            </div>

            {/* System Cronjobs Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>System Cronjobs</span>
                        {hasChanges && (
                            <Button onClick={saveSystemJobsConfig} size="sm">
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Configure built-in system cronjobs with enable/disable toggle and frequency settings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDialogDescription>
                            Frequency must be between {FREQUENCY_LIMITS.min} minute(s) and {FREQUENCY_LIMITS.max} minutes (30 days).
                            Recommended: Payments = {FREQUENCY_LIMITS.recommended.payments}min, Backups = {FREQUENCY_LIMITS.recommended.backups}min
                        </AlertDialogDescription>
                    </AlertDialog>

                    <div className="grid gap-4">
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading system cronjobs...</div>
                        ) : systemJobs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No system cronjobs found</div>
                        ) : (
                            systemJobs.map((job) => (
                                <Card key={job.id}>
                                    <CardContent className="pt-6">
                                        <div className="grid gap-4 md:grid-cols-[1fr,auto,auto,auto]">
                                            <div className="space-y-1">
                                                <div className="font-medium">{job.name}</div>
                                                <div className="text-sm text-muted-foreground">{job.description}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    <span>Endpoint: {job.endpoint}</span>
                                                    {job.lastRun && (
                                                        <>
                                                            {' • '}
                                                            <span>Last run: {new Date(job.lastRun).toLocaleString()}</span>
                                                            {' • '}
                                                            <span>Status: {job.lastStatus || 'pending'}</span>
                                                            {' • '}
                                                            <span>Runs: {job.runCount || 0}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm whitespace-nowrap">Frequency (min):</Label>
                                                <Input
                                                    type="number"
                                                    min={FREQUENCY_LIMITS.min}
                                                    max={FREQUENCY_LIMITS.max}
                                                    value={systemJobsConfig[job.id]?.intervalMinutes || job.intervalMinutes || 60}
                                                    onChange={(e) =>
                                                        handleSystemJobChange(job.id, 'intervalMinutes', e.target.value)
                                                    }
                                                    className="w-24"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                    {formatFrequency(
                                                        systemJobsConfig[job.id]?.intervalMinutes || job.intervalMinutes || 60
                                                    )}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm">Enabled</Label>
                                                <Switch
                                                    checked={systemJobsConfig[job.id]?.enabled !== false}
                                                    onCheckedChange={(checked) =>
                                                        handleSystemJobChange(job.id, 'enabled', checked)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Custom Cronjobs Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Create Custom Cronjob
                            </CardTitle>
                            <CardDescription>
                                Add a custom HTTP endpoint to call on schedule
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                <div>
                                    <Label>Name</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                                        placeholder="My Custom Job"
                                    />
                                </div>

                                <div>
                                    <Label>URL</Label>
                                    <Input
                                        value={form.config.url}
                                        placeholder="https://example.com/webhook"
                                        onChange={(e) =>
                                            setForm((s) => ({ ...s, config: { ...s.config, url: e.target.value } }))
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>Frequency (minutes)</Label>
                                    <Input
                                        type="number"
                                        min={FREQUENCY_LIMITS.min}
                                        max={FREQUENCY_LIMITS.max}
                                        value={form.intervalMinutes}
                                        onChange={(e) =>
                                            setForm((s) => ({ ...s, intervalMinutes: Number(e.target.value) }))
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatFrequency(form.intervalMinutes)}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={form.enabled}
                                            onCheckedChange={(v) => setForm((s) => ({ ...s, enabled: !!v }))}
                                        />
                                        <span className="text-sm">Enabled</span>
                                    </div>
                                    <Button onClick={createJob}>Create</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Custom Cronjobs</CardTitle>
                            <CardDescription>List of user-created scheduled jobs and their status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="max-h-[60vh]">
                                <div className="grid gap-3">
                                    {loading ? (
                                        <div className="text-center py-8 text-muted-foreground">Loading cronjobs...</div>
                                    ) : customJobs.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p className="mb-2">No custom cronjobs configured</p>
                                            <p className="text-xs">Create your first custom cronjob to get started</p>
                                        </div>
                                    ) : (
                                        customJobs.map((job) => (
                                            <Card key={job.id || job.key || job._id}>
                                                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{job.name}</div>
                                                        <div className="text-sm text-muted-foreground break-all">
                                                            {job.config?.url} • every {formatFrequency(job.intervalMinutes)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            <span>Last run: {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'never'}</span>
                                                            {' • '}
                                                            <span>Status: {job.lastStatus || 'pending'}</span>
                                                            {' • '}
                                                            <span>Runs: {job.runCount || 0}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Switch
                                                            checked={!!job.enabled}
                                                            onCheckedChange={() => toggleCustomJobEnabled(job)}
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => runNow()}
                                                            title="Run all due jobs now">
                                                            <Play className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => removeJob(job.id || job.key || job._id)}
                                                            title="Delete cronjob">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
