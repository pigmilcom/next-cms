// @/app/(backend)/admin/account/page.client.jsx (Client Component)
'use client';

import { Bell, Code, Eye, EyeOff, Key, Save, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { changeUserPassword, updateDeveloperMode, updateUserPreferences, updateUserProfile } from '@/lib/server/users';
import { useLayout } from '../context/LayoutProvider';

// Profile Tab Component
const ProfileTab = ({ user, userProfile, setUserProfile, loading, onSave, updating }) => {
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                        id="displayName"
                        value={userProfile.displayName || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, displayName: e.target.value })}
                        placeholder="Enter your display name"
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={user?.email || ''} disabled className="bg-muted w-full" />
                    <p className="text-muted-foreground text-xs">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                        id="firstName"
                        value={userProfile.firstName || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, firstName: e.target.value })}
                        placeholder="Enter your first name"
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                        id="lastName"
                        value={userProfile.lastName || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, lastName: e.target.value })}
                        placeholder="Enter your last name"
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="birthdate">Birth Date</Label>
                    <Input
                        id="birthdate"
                        type="date"
                        value={userProfile.birthdate || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, birthdate: e.target.value })}
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneInput
                        value={userProfile.phone || ''}
                        onChange={(value) => setUserProfile({ ...userProfile, phone: value })}
                        placeholder="Enter your phone number"
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <CountryDropdown
                        defaultValue={userProfile.country || ''}
                        onChange={(country) => setUserProfile({ ...userProfile, country: country.name })}
                        placeholder="Select your country"
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                        value={userProfile.timezone || ''}
                        onValueChange={(value) => setUserProfile({ ...userProfile, timezone: value })}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="UTC-12:00">(UTC-12:00) International Date Line West</SelectItem>
                            <SelectItem value="UTC-11:00">(UTC-11:00) Coordinated Universal Time-11</SelectItem>
                            <SelectItem value="UTC-10:00">(UTC-10:00) Hawaii</SelectItem>
                            <SelectItem value="UTC-09:00">(UTC-09:00) Alaska</SelectItem>
                            <SelectItem value="UTC-08:00">(UTC-08:00) Pacific Time (US & Canada)</SelectItem>
                            <SelectItem value="UTC-07:00">(UTC-07:00) Mountain Time (US & Canada)</SelectItem>
                            <SelectItem value="UTC-06:00">(UTC-06:00) Central Time (US & Canada)</SelectItem>
                            <SelectItem value="UTC-05:00">(UTC-05:00) Eastern Time (US & Canada)</SelectItem>
                            <SelectItem value="UTC-04:00">(UTC-04:00) Atlantic Time (Canada)</SelectItem>
                            <SelectItem value="UTC-03:00">(UTC-03:00) Brasilia</SelectItem>
                            <SelectItem value="UTC-02:00">(UTC-02:00) Coordinated Universal Time-02</SelectItem>
                            <SelectItem value="UTC-01:00">(UTC-01:00) Azores</SelectItem>
                            <SelectItem value="UTC+00:00">(UTC+00:00) Dublin, Edinburgh, Lisbon, London</SelectItem>
                            <SelectItem value="UTC+01:00">(UTC+01:00) Amsterdam, Berlin, Bern, Rome</SelectItem>
                            <SelectItem value="UTC+02:00">(UTC+02:00) Athens, Bucharest, Istanbul</SelectItem>
                            <SelectItem value="UTC+03:00">(UTC+03:00) Kuwait, Riyadh</SelectItem>
                            <SelectItem value="UTC+04:00">(UTC+04:00) Abu Dhabi, Muscat</SelectItem>
                            <SelectItem value="UTC+05:00">(UTC+05:00) Islamabad, Karachi</SelectItem>
                            <SelectItem value="UTC+06:00">(UTC+06:00) Astana, Dhaka</SelectItem>
                            <SelectItem value="UTC+07:00">(UTC+07:00) Bangkok, Hanoi, Jakarta</SelectItem>
                            <SelectItem value="UTC+08:00">(UTC+08:00) Beijing, Chongqing, Hong Kong</SelectItem>
                            <SelectItem value="UTC+09:00">(UTC+09:00) Osaka, Sapporo, Tokyo</SelectItem>
                            <SelectItem value="UTC+10:00">(UTC+10:00) Canberra, Melbourne, Sydney</SelectItem>
                            <SelectItem value="UTC+11:00">(UTC+11:00) Magadan, Solomon Is., New Caledonia</SelectItem>
                            <SelectItem value="UTC+12:00">(UTC+12:00) Auckland, Wellington</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                    id="bio"
                    value={userProfile.bio || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="w-full"
                />
            </div>

            <div className="flex justify-end col-span-1 md:col-span-2">
                <Button onClick={onSave} className="flex items-center gap-2" disabled={updating}>
                    <Save className="h-4 w-4" />
                    {updating ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
};

// Security Tab Component
const SecurityTab = ({ user, loading, userKey }) => {
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [changingPassword, setChangingPassword] = useState(false);

    const handlePasswordChange = async () => {
        const { currentPassword, newPassword, confirmPassword } = passwordForm;

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        try {
            setChangingPassword(true);
            const result = await changeUserPassword(userKey, currentPassword, newPassword);

            if (result.success) {
                toast.success('Password changed successfully');
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                toast.error(result.error || 'Failed to change password');
            }
        } catch (error) {
            toast.error('Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Change Password
                </CardTitle>
                <CardDescription>Update your account password for better security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                        <Input
                            id="currentPassword"
                            type={showPasswords.current ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={(e) =>
                                setPasswordForm({
                                    ...passwordForm,
                                    currentPassword: e.target.value
                                })
                            }
                            placeholder="Enter your current password"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                                setShowPasswords({
                                    ...showPasswords,
                                    current: !showPasswords.current
                                })
                            }>
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                        <Input
                            id="newPassword"
                            type={showPasswords.new ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) =>
                                setPasswordForm({
                                    ...passwordForm,
                                    newPassword: e.target.value
                                })
                            }
                            placeholder="Enter your new password"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                                setShowPasswords({
                                    ...showPasswords,
                                    new: !showPasswords.new
                                })
                            }>
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                                setPasswordForm({
                                    ...passwordForm,
                                    confirmPassword: e.target.value
                                })
                            }
                            placeholder="Confirm your new password"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                                setShowPasswords({
                                    ...showPasswords,
                                    confirm: !showPasswords.confirm
                                })
                            }>
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <Button onClick={handlePasswordChange} disabled={changingPassword} className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    {changingPassword ? 'Changing Password...' : 'Change Password'}
                </Button>
            </CardContent>
        </Card>
    );
};

// Notifications Tab Component
const NotificationsTab = ({ user, userProfile, setUserProfile, loading, onSave, userKey }) => {
    const [savingPreferences, setSavingPreferences] = useState(false);

    const handleSavePreferences = async () => {
        try {
            setSavingPreferences(true);

            const preferences = {
                emailNotifications: userProfile.emailNotifications ?? true,
                orderUpdates: userProfile.orderUpdates ?? true,
                marketingEmails: userProfile.marketingEmails ?? false,
                newsletter: userProfile.newsletter ?? false,
                smsNotifications: userProfile.smsNotifications ?? false
            };

            const result = await updateUserPreferences(userKey, preferences);

            if (result.success) {
                toast.success('Preferences updated successfully');
            } else {
                toast.error(result.error || 'Failed to update preferences');
            }
        } catch (error) {
            toast.error('Failed to update preferences');
        } finally {
            setSavingPreferences(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-muted-foreground text-sm">Receive general email notifications</p>
                    </div>
                    <Switch
                        checked={userProfile.emailNotifications ?? true}
                        onCheckedChange={(checked) =>
                            setUserProfile({
                                ...userProfile,
                                emailNotifications: checked
                            })
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Order Updates</p>
                        <p className="text-muted-foreground text-sm">Notifications about order status changes</p>
                    </div>
                    <Switch
                        checked={userProfile.orderUpdates ?? true}
                        onCheckedChange={(checked) =>
                            setUserProfile({
                                ...userProfile,
                                orderUpdates: checked
                            })
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Marketing Emails</p>
                        <p className="text-muted-foreground text-sm">Promotional emails and special offers</p>
                    </div>
                    <Switch
                        checked={userProfile.marketingEmails ?? false}
                        onCheckedChange={(checked) =>
                            setUserProfile({
                                ...userProfile,
                                marketingEmails: checked
                            })
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Newsletter</p>
                        <p className="text-muted-foreground text-sm">Weekly newsletter with updates</p>
                    </div>
                    <Switch
                        checked={userProfile.newsletter ?? false}
                        onCheckedChange={(checked) =>
                            setUserProfile({
                                ...userProfile,
                                newsletter: checked
                            })
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-muted-foreground text-sm">
                            Text message notifications for important updates
                        </p>
                    </div>
                    <Switch
                        checked={userProfile.smsNotifications ?? false}
                        onCheckedChange={(checked) =>
                            setUserProfile({
                                ...userProfile,
                                smsNotifications: checked
                            })
                        }
                    />
                </div>
            </div>

            <Separator />

            <div className="flex justify-end">
                <Button
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                    className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {savingPreferences ? 'Saving...' : 'Save Notification Preferences'}
                </Button>
            </div>
        </div>
    );
};

// Main Account Page Client Component
const AccountPageClient = ({ userData }) => {
    const { user, refreshSession } = useLayout();
    const router = useRouter();
    const [loading, setLoading] = useState(!userData);
    const [userProfile, setUserProfile] = useState(
        userData || {
            displayName: user?.displayName || user?.name || '',
            firstName: '',
            lastName: '',
            birthdate: '',
            phone: '',
            country: '',
            timezone: '',
            bio: '',
            emailNotifications: true,
            orderUpdates: true,
            marketingEmails: false,
            newsletter: false,
            smsNotifications: false
        }
    );
    const [updatingProfile, setUpdatingProfile] = useState(false);

    const userKey = user?.key || user?.id;

    useEffect(() => {
        if (userData) {
            setUserProfile({
                ...userData,
                displayName: userData.displayName || user?.displayName || user?.name || ''
            });
            setLoading(false);
        }
    }, [userData, user]);

    const handleSaveProfile = async () => {
        if (!userKey) return;

        try {
            setUpdatingProfile(true);
            const result = await updateUserProfile(userKey, userProfile);

            if (result.success) {
                toast.success('Profile updated successfully');
            } else {
                toast.error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            toast.error('Failed to update profile');
        } finally {
            setUpdatingProfile(false);
        }
    };

    // Show loading skeleton while user is loading
    if (!user?.id) {
        return (
            <div>
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-12 w-full" />
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div>
            <AdminHeader
                title="Account Settings"
                description="Manage your account information, security, and notification preferences"
            />

            <Tabs defaultValue="profile" className="space-y-2">
                <TabsList>
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                    </TabsTrigger>
                    {user?.role === 'admin' && (
                        <TabsTrigger value="developer" className="flex items-center gap-2">
                            <Code className="h-4 w-4" />
                            Developer
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Information
                            </CardTitle>
                            <CardDescription>Update your personal information and preferences</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProfileTab
                                user={user}
                                userProfile={userProfile}
                                setUserProfile={setUserProfile}
                                loading={loading}
                                onSave={handleSaveProfile}
                                updating={updatingProfile}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <SecurityTab user={user} loading={loading} userKey={userKey} />
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notification Preferences
                            </CardTitle>
                            <CardDescription>Choose how you want to receive notifications</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <NotificationsTab
                                user={user}
                                userProfile={userProfile}
                                setUserProfile={setUserProfile}
                                loading={loading}
                                onSave={() => {}}
                                userKey={userKey}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {user?.role === 'admin' && (
                    <TabsContent value="developer" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Code className="h-5 w-5" />
                                    Developer Mode
                                </CardTitle>
                                <CardDescription>Enable developer features and advanced menu sections</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="developer-mode" className="text-base font-medium">
                                            Developer Mode
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Enable access to developer tools and advanced features
                                        </p>
                                    </div>
                                    <Switch
                                        id="developer-mode"
                                        checked={user?.isDeveloper === true}
                                        onCheckedChange={async (checked) => {
                                            try {
                                                if (!userKey) {
                                                    toast.error('User session not found. Please refresh the page.');
                                                    return;
                                                }

                                                // Update database first
                                                const result = await updateDeveloperMode(userKey, checked);

                                                if (result?.success) {
                                                    // Show immediate feedback
                                                    toast.success(
                                                        checked ? 'Developer mode enabled' : 'Developer mode disabled'
                                                    );

                                                    // Refresh session with updated user data from database
                                                    const sessionResult = await refreshSession({
                                                        isDeveloper: checked
                                                    });

                                                    if (sessionResult?.success) {
                                                        // Wait for session to propagate, then refresh UI
                                                        setTimeout(() => {
                                                            router.refresh();
                                                        }, 200);
                                                    } else {
                                                        toast.info(
                                                            'Please refresh the page to see navigation changes.'
                                                        );
                                                    }
                                                } else {
                                                    const errorMsg =
                                                        result?.error ||
                                                        result?.message ||
                                                        'Failed to update developer mode';
                                                    toast.error(errorMsg);
                                                }
                                            } catch (error) {
                                                toast.error(`An error occurred: ${error.message || 'Unknown error'}`);
                                            }
                                        }}
                                    />
                                </div>

                                <div className="space-y-2 rounded-lg bg-muted p-4">
                                    <h4 className="text-sm font-medium">What does Developer Mode enable?</h4>
                                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                        <li>Access to the Developer section in navigation</li>
                                        <li>Advanced debugging and monitoring tools</li>
                                        <li>API documentation and testing interfaces</li>
                                        <li>System configuration and performance metrics</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

export default AccountPageClient;
