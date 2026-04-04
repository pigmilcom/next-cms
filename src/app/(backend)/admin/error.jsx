// @/app/(backend)/admin/error.jsx
'use client';

import { AlertTriangle, Home, RefreshCw, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminError({ error, reset }) {
    const t = useTranslations('Common.Errors.admin.500');
    const tLinks = useTranslations('Common.Errors.admin.links');

    useEffect(() => {
        // Log error to console for debugging
        console.error('Admin Error:', error);
    }, [error]);

    return (
        <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center pb-8">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="text-4xl md:text-5xl font-bold mb-2">
                        <span className="bg-linear-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
                            {t('title')}
                        </span>
                    </CardTitle>
                    <CardDescription className="text-lg">{t('subtitle')}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="text-center space-y-2">
                        <p className="text-muted-foreground">{t('message')}</p>
                        <p className="text-sm text-muted-foreground">
                            {t('tryReload')}
                        </p>
                    </div>

                    {/* Error Details - Only in development */}
                    {process.env.NODE_ENV === 'development' && error && (
                        <div className="rounded-lg bg-muted p-4 text-left">
                            <p className="text-xs font-mono text-muted-foreground mb-2">
                                {t('errorDetails')}
                            </p>
                            <pre className="text-xs text-destructive overflow-x-auto">
                                {error.message || 'Unknown error'}
                            </pre>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button size="lg" onClick={() => reset()} className="flex-1 gap-2">
                            <RefreshCw className="h-5 w-5" />
                            {t('tryAgain')}
                        </Button>
                        <Link href="/admin" className="flex-1">
                            <Button size="lg" variant="outline" className="w-full gap-2">
                                <Home className="h-5 w-5" />
                                {t('adminDashboard')}
                            </Button>
                        </Link>
                    </div>

                    {/* Quick Links */}
                    <div className="pt-6 border-t">
                        <p className="text-sm text-muted-foreground mb-3 text-center">{t('quickLinks')}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/admin/access/users"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <Settings className="h-3 w-3" />
                                {tLinks('users')}
                            </Link>
                            <Link
                                href="/admin/store/orders"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <Settings className="h-3 w-3" />
                                {tLinks('orders')}
                            </Link>
                            <Link
                                href="/admin/store/catalog"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <Settings className="h-3 w-3" />
                                {tLinks('catalog')}
                            </Link>
                            <Link
                                href="/admin/analytics/dashboard"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <Settings className="h-3 w-3" />
                                {tLinks('analytics')}
                            </Link>
                            <Link
                                href="/admin/marketing/newsletter"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <Settings className="h-3 w-3" />
                                {tLinks('marketing')}
                            </Link>
                            <Link
                                href="/admin/system/settings"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <Settings className="h-3 w-3" />
                                {tLinks('settings')}
                            </Link>
                        </div>
                    </div>

                    {/* Return to Frontend */}
                    <div className="pt-4 text-center">
                        <Link
                            href="/"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            {t('returnToSite')}
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
