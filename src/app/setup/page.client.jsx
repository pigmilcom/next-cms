// @/app/setup/page.client.jsx (Setup Client Component)
'use client';
 
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SetupPageClient({  
    needsFirstUser, 
    tablesReady,
    allDataExists, 
    existingCollections = [],
    defaultCredentials = null
}) {
    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: 'Administrator'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user types
        if (error) setError('');
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        // Client-side validation
        if (!formData.email || !formData.password) {
            setError('Email and password are required');
            setIsSubmitting(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            setIsSubmitting(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/setup/create-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error || 'Failed to create admin user');
                setIsSubmitting(false);
                return;
            }

            // Success!
            setSuccess(true);
            setCreatedUser({
                email: formData.email,
                password: formData.password,
                displayName: formData.displayName
            });
        } catch (error) {
            console.error('Error creating admin:', error);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show success message after admin creation
    if (success && createdUser) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                            Setup Complete!
                        </CardTitle>
                        <CardDescription>
                            Your admin account has been created successfully.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="bg-yellow-50/10 border border-yellow-200 rounded-lg p-4">
                                <p className="font-semibold text-yellow-800 mb-2">⚠️ Security Notice</p>
                                <p className="text-sm text-yellow-700 mb-3">
                                    Please delete the <code className="bg-yellow-100 px-2 py-1 rounded text-xs">/src/app/setup</code> directory before logging in, otherwise you will be redirected back to this setup page.
                                </p>
                                <div className="bg-white/10 p-3 rounded border border-yellow-200">
                                    <p className="text-xs font-semibold mb-1">Command to delete setup directory:</p>
                                    <code className="text-xs bg-input px-2 py-1 rounded block">rm -rf src/app/setup</code>
                                </div>
                            </div>

                            <div className="bg-blue-50/10 border border-blue-200 rounded-lg p-4">
                                <p className="font-semibold text-blue-800 mb-2">Admin Credentials</p>
                                <div className="space-y-2">
                                    <div>
                                        <Label className="text-xs">Email</Label>
                                        <div className="bg-white/10 p-2 rounded border border-blue-200">
                                            <code className="text-sm">{createdUser.email}</code>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Password</Label>
                                        <div className="bg-white/10 p-2 rounded border border-blue-200">
                                            <code className="text-sm">{createdUser.password}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="font-semibold text-red-800 mb-2">🔒 Important Security Steps</p>
                                <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                                    <li>Delete the setup directory as shown above</li>
                                    <li>Save your credentials in a secure location</li>
                                    <li>Consider changing your password after first login</li>
                                    <li>Configure your environment variables properly</li>
                                </ol>
                            </div>

                            <Link href="/auth/login">
                                <Button className="w-full">
                                    Continue to Login
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show admin creation form when tables are ready but no user exists
    if (tablesReady && needsFirstUser && !success) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Create Administrator Account</CardTitle>
                        <CardDescription>
                            Database tables are ready. Please create your admin account to complete setup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Display Name</Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    type="text"
                                    placeholder="Administrator"
                                    value={formData.displayName}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">
                                    Password <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="Minimum 8 characters"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    minLength={8}
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Must be at least 8 characters long
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <Button 
                                type="submit" 
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Admin Account...
                                    </>
                                ) : (
                                    'Create Admin Account'
                                )}
                            </Button>

                            <div className="bg-blue-50/10 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-700">
                                    This will create your administrator account with full access to the CMS.
                                    Make sure to save your credentials securely.
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show credentials when tables are ready and default admin was created (legacy support)
    if (tablesReady && defaultCredentials) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Setup Complete!</CardTitle>
                        <CardDescription>
                            Database has been initialized and default admin user created.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="bg-yellow-50/10 border border-yellow-200 rounded-lg p-4">
                                <p className="font-semibold text-yellow-800 mb-2">⚠️ Security Notice</p>
                                <p className="text-sm text-yellow-700 mb-3">
                                    Please delete the <code className="bg-yellow-100 px-2 py-1 rounded text-xs">/src/app/setup</code> directory before logging in, otherwise you will be redirected back to this setup page.
                                </p>
                                <div className="bg-white/10 p-3 rounded border border-yellow-200">
                                    <p className="text-xs font-semibold mb-1">Command to delete setup directory:</p>
                                    <code className="text-xs bg-input px-2 py-1 rounded block">rm -rf src/app/setup</code>
                                </div>
                            </div>

                            <div className="bg-blue-50/10 border border-blue-200 rounded-lg p-4">
                                <p className="font-semibold text-blue-800 mb-2">Admin Credentials</p>
                                <div className="space-y-2">
                                    <div>
                                        <Label className="text-xs">Email</Label>
                                        <div className="bg-white/10 p-2 rounded border border-blue-200">
                                            <code className="text-sm">{defaultCredentials.email}</code>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Password</Label>
                                        <div className="bg-white/10 p-2 rounded border border-blue-200">
                                            <code className="text-sm">{defaultCredentials.password}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="font-semibold text-red-800 mb-2">🔒 Important Security Steps</p>
                                <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                                    <li>Delete the setup directory as shown above</li>
                                    <li>Change the default admin password after first login</li>
                                    <li>Update admin email in your account settings</li>
                                    <li>Configure your environment variables properly</li>
                                </ol>
                            </div>

                            <Link href="/auth/login">
                                <Button className="w-full">
                                    Continue to Login
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show message when all data already exists (tables + users)
    if (allDataExists) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-2xl space-y-6 mx-auto">
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="text-blue-800">ℹ️ Setup Already Completed</CardTitle>
                            <CardDescription className="text-blue-700">
                                Your CMS platform is already set up and configured.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-blue-700">
                            <p className="mb-4">
                                All required data already exists in your database:
                            </p>
                            <ul className="list-disc list-inside mb-4 space-y-1">
                                {existingCollections.map(collection => (
                                    <li key={collection} className="text-sm">
                                        <code className="rounded bg-blue-100 px-2 py-1 font-mono text-sm">{collection}</code>
                                    </li>
                                ))}
                            </ul>
                            <div className="bg-blue-100 p-4 rounded-lg mb-4">
                                <p className="font-semibold mb-2">⚠️ Security Notice:</p>
                                <p className="text-sm mb-3">
                                    Please delete the <code className="rounded bg-blue-200 px-2 py-1 font-mono text-xs">/src/app/setup</code> directory manually for security.
                                </p>
                                <div className="bg-white p-3 rounded border border-blue-200">
                                    <p className="text-xs font-semibold mb-2">Local Development:</p>
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded block">rm -rf src/app/setup</code>
                                    <p className="text-xs font-semibold mt-3 mb-2">Production (Vercel/Netlify/etc):</p>
                                    <p className="text-xs">
                                        1. Delete the folder from your repository<br />
                                        2. Commit and push the changes<br />
                                        3. Redeploy your application
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Link href="/auth/login">
                                    <Button>Sign In</Button>
                                </Link>
                                <Link href="/admin">
                                    <Button variant="outline">Go to Admin</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Show initializing message when tables are being created
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="flex flex-col items-center justify-center gap-6">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            Initializing Database...
                        </CardTitle>
                        <CardDescription>
                            Creating database tables and default data. This will only take a moment.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span>Creating site_settings table</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span>Creating store_settings table</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span>Creating roles table</span>
                            </div>
                            <p className="text-muted-foreground text-xs mt-4">
                                Please wait while we set up your database...
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
