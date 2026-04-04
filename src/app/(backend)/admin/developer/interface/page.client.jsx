// @/app/(backend)/admin/developer/interface/page.client.jsx
'use client';

import { Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getInterfaceSettings, updateInterfaceSettings } from '@/lib/server/interface';

const menuItems = [
    {
        key: 'store',
        title: 'Store',
        description: 'Orders, Catalog, Categories, Collections, Customers, Coupons, Reviews, Testimonials'
    },
    {
        key: 'media',
        title: 'Media',
        description: 'Media library and file management'
    },
    {
        key: 'workspace',
        title: 'Workspace',
        description: 'Agenda, Task Board, Schedule'
    },
    {
        key: 'marketing',
        title: 'Marketing',
        description: 'Newsletter, Subscribers'
    },
    {
        key: 'club',
        title: 'Club',
        description: 'Club members and rewards management'
    },
    {
        key: 'tickets',
        title: 'Support Tickets',
        description: 'Customer support ticket system'
    }
];

export default function InterfacePageClient({ interfaceSettings }) {
    const [enabledItems, setEnabledItems] = useState(
        interfaceSettings?.data?.enabledMenuItems || {
            store: true,
            media: true,
            workspace: true,
            marketing: true,
            club: true,
            tickets: true
        }
    );
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleToggle = (key) => {
        setEnabledItems((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const result = await updateInterfaceSettings(enabledItems);

            if (result?.success) {
                toast.success('Interface settings updated successfully');
                setHasChanges(false);

                // Reload page to apply changes
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                toast.error(result?.error || 'Failed to update interface settings');
            }
        } catch (error) {
            console.error('Error updating interface settings:', error);
            toast.error('An error occurred while updating settings');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        try {
            setLoading(true);
            const result = await getInterfaceSettings();

            if (result?.success && result.data) {
                setEnabledItems(result.data.enabledMenuItems);
                setHasChanges(false);
                toast.success('Settings reset to saved values');
            } else {
                toast.error('Failed to reload settings');
            }
        } catch (error) {
            console.error('Error reloading settings:', error);
            toast.error('An error occurred while reloading settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AdminHeader title="Interface Settings" description="Manage admin interface menu visibility and access" />

            <div className="space-y-6 mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Menu Items Visibility</CardTitle>
                        <CardDescription>
                            Enable or disable menu items in the admin dashboard. Disabled items will be hidden from the
                            navigation menu and inaccessible to all users.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 ">
                            {menuItems.map((item, index) => (
                                <div key={item.key}>
                                    <div className="flex items-start space-x-3">
                                        <Checkbox
                                            id={item.key}
                                            checked={enabledItems[item.key]}
                                            onCheckedChange={() => handleToggle(item.key)}
                                            disabled={loading}
                                        />
                                        <div className="flex-1 space-y-1">
                                            <Label
                                                htmlFor={item.key}
                                                className="text-sm font-medium leading-none cursor-pointer">
                                                {item.title}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                        </div>
                                    </div>
                                    {index < menuItems.length - 1 && <Separator className="mt-6" />}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Save changes or reset to last saved configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Button onClick={handleSave} disabled={loading || !hasChanges}>
                            <Save className="mr-2 size-4" />
                            Save Changes
                        </Button>
                        <Button variant="outline" onClick={handleReset} disabled={loading || !hasChanges}>
                            Reset
                        </Button>
                    </CardContent>
                </Card>

                {!interfaceSettings?.success && (
                    <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Error Loading Settings</CardTitle>
                            <CardDescription>{interfaceSettings?.error || 'Unknown error'}</CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </>
    );
}
