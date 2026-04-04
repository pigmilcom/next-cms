// @/app/(backend)/admin/not-found.jsx
'use client';

import { AlertTriangle, ArrowLeft, Home, Settings } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminNotFound() {
    const t = useTranslations('Common.Errors.admin.404');
    const tLinks = useTranslations('Common.Errors.admin.links');

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
                        <p className="text-muted-foreground">
                            {t('message')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t('checkUrl')}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Link href="/admin" className="flex-1">
                            <Button size="lg" className="w-full gap-2">
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
                                <ArrowLeft className="h-3 w-3" />
                                {tLinks('users')}
                            </Link>
                            <Link
                                href="/admin/store/orders"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <ArrowLeft className="h-3 w-3" />
                                {tLinks('orders')}
                            </Link>
                            <Link
                                href="/admin/store/catalog"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <ArrowLeft className="h-3 w-3" />
                                {tLinks('catalog')}
                            </Link>
                            <Link
                                href="/admin/analytics/dashboard"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <ArrowLeft className="h-3 w-3" />
                                {tLinks('analytics')}
                            </Link>
                            <Link
                                href="/admin/marketing/newsletter"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <ArrowLeft className="h-3 w-3" />
                                {tLinks('marketing')}
                            </Link>
                            <Link
                                href="/admin/developer/database"
                                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center">
                                <ArrowLeft className="h-3 w-3" />
                                {tLinks('database')}
                            </Link>
                        </div>
                    </div>

                    {/* Return to Frontend */}
                    <div className="pt-4 text-center">
                        <Link
                            href="/"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                            <ArrowLeft className="h-3 w-3" />
                            {t('returnToSite')}
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
