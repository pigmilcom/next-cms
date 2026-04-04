// @/app/(frontend)/not-found.jsx
'use client';

import { Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LayoutProvider } from '@/app/(frontend)/context/LayoutProvider';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/providers';

export default function ClientNotFound() {
    const t = useTranslations('Common.Errors.404');
    const tLinks = useTranslations('Common.Errors.404.links');
    
    // Prevent any data fetching on 404 pages
    useEffect(() => {
        // Disable any background tracking or data fetching
        if (typeof window !== 'undefined') {
            window.__SKIP_DATA_FETCH__ = true;
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.__SKIP_DATA_FETCH__ = false;
            }
        };
    }, []);

    const { session } = useAuth();

    const isAuthenticated = !!session?.user;

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
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-secondary/5" />

                {/* Content */}
                <div className="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
                    {/* 404 Text */}
                    <div className="mb-8">
                        <h1 className="text-[150px] md:text-[200px] lg:text-[250px] font-bold leading-none tracking-tighter">
                            <span className="bg-linear-to-br from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
                                404
                            </span>
                        </h1>
                    </div>

                    {/* Error Message */}
                    <div className="max-w-2xl mx-auto mb-12 space-y-4">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">{t('title')}</h2>
                        <p className="text-lg md:text-xl text-muted-foreground">
                            {t('message')}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <Link prefetch={false} href="/">
                            <Button size="lg" className="gap-2 min-w-50">
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
                                href={isAuthenticated ? "/account" : "/auth/login"}
                                className="text-sm text-primary hover:underline flex items-center gap-1"> 
                                {tLinks('myAccount')}
                            </Link>
                            {isAuthenticated ? (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <Link
                                        prefetch={false}
                                        href="/auth/logout"
                                        className="text-sm text-primary hover:underline flex items-center gap-1"> 
                                        {tLinks('logout')}
                                    </Link>
                                </>
                            ) : 
                            (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <Link
                                        prefetch={false}
                                        href="/auth/login"
                                        className="text-sm text-primary hover:underline flex items-center gap-1"> 
                                        {tLinks('login')}
                                    </Link>
                                    <span className="text-muted-foreground">•</span>
                                    <Link
                                        prefetch={false}
                                        href="/auth/register"
                                        className="text-sm text-primary hover:underline flex items-center gap-1"> 
                                        {tLinks('register')}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute top-1/4 left-10 w-20 h-20 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
                </div>
            </div>
        </LayoutProvider>
    );
}
