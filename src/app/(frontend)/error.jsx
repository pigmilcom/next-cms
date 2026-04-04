// @/app/(frontend)/error.jsx
'use client';

import { AlertTriangle, Home, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LayoutProvider } from '@/app/(frontend)/context/LayoutProvider';
import { Button } from '@/components/ui/button';

export default function FrontendError({ error, reset }) {
    const t = useTranslations('Common.Errors.500');
    const tLinks = useTranslations('Common.Errors.404.links');

    useEffect(() => {
        // Log error to console for debugging
        console.error('Frontend Error:', error);

        // Prevent any data fetching on error pages
        if (typeof window !== 'undefined') {
            window.__SKIP_DATA_FETCH__ = true;
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.__SKIP_DATA_FETCH__ = false;
            }
        };
    }, [error]);

    return (
        <LayoutProvider>
            <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
                {/* Animated background pattern */}
                <div
                    className="absolute inset-0 opacity-5 dark:opacity-10"
                    style={{
                        // backgroundImage: "url('/images/bg-pattern.webp')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-br from-destructive/5 via-transparent to-orange-500/5" />

                {/* Content */}
                <div className="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
                    {/* 500 Text */}
                    <div className="mb-8">
                        <h1 className="text-[150px] md:text-[200px] lg:text-[250px] font-bold leading-none tracking-tighter">
                            <span className="bg-linear-to-br from-destructive via-orange-500 to-destructive bg-clip-text text-transparent animate-gradient">
                                500
                            </span>
                        </h1>
                    </div>

                    {/* Error Message */}
                    <div className="max-w-2xl mx-auto mb-12 space-y-4">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">{t('title')}</h2>
                        <p className="text-lg md:text-xl text-muted-foreground"> 
                            {t('message')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t('notification')}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <Button size="lg" onClick={() => reset()} className="gap-2 min-w-50">
                            <RefreshCw className="h-5 w-5" />
                            {t('tryAgain')}
                        </Button>

                        <Link prefetch={false} href="/">
                            <Button size="lg" variant="outline" className="gap-2 min-w-50">
                                <Home className="h-5 w-5" />
                                {t('goBack')}
                            </Button>
                        </Link>
                    </div>

                   {/* Additional Links */} 
                    <div className="mt-12 pt-8 border-t border-border/50">
                        <p className="text-sm text-muted-foreground mb-4">{t('tryThesePages')}</p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link
                                prefetch={false}
                                href="/"
                                className="text-sm text-primary hover:underline flex items-center gap-1">
                                <Search className="h-3 w-3" />
                                {tLinks('homepage')}
                            </Link> 
                            <span className="text-muted-foreground">•</span>
                            <Link
                                prefetch={false}
                                href="/example"
                                className="text-sm text-primary hover:underline flex items-center gap-1">
                                <Search className="h-3 w-3" />
                                {tLinks('examplePage')}
                            </Link> 
                            <span className="text-muted-foreground">•</span>
                            <Link
                                prefetch={false}
                                href="/blank"
                                className="text-sm text-primary hover:underline flex items-center gap-1">
                                <Search className="h-3 w-3" />
                                {tLinks('blankPage')}
                            </Link>
                            <span className="text-muted-foreground">•</span>
                            <Link
                                prefetch={false}
                                href="/account"
                                className="text-sm text-primary hover:underline flex items-center gap-1">
                                <Search className="h-3 w-3" />
                                {tLinks('myAccount')}
                            </Link>
                        </div>
                    </div>  

                    {/* Decorative elements */}
                    <div className="absolute top-1/4 left-10 w-20 h-20 bg-destructive/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                </div>
            </div>
        </LayoutProvider>
    );
}
