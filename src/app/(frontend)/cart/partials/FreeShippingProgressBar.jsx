//@/app/(frontend)/components/FreeShippingProgressBar.jsx
'use client';

import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const FreeShippingProgressBar = ({ cartTotal, storeSettings = null }) => {
    const t = useTranslations('Cart');
    const [threshold, setThreshold] = useState(0);
    const [currency, setCurrency] = useState('EUR');
    const [isEnabled, setIsEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (storeSettings) {
            setThreshold(storeSettings?.freeShippingThreshold || 0);
            setCurrency(storeSettings?.currency || 'EUR');
            setIsEnabled(storeSettings?.freeShippingEnabled !== false);
            setLoading(false);
        }
    }, [storeSettings]);

    // Don't render if free shipping is disabled
    if (!isEnabled) {
        return null;
    }

    // Show skeleton while loading
    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-4 lg:mb-6">
                <Card className="border shadow-sm bg-background">
                    <CardContent className="p-4 lg:p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Skeleton */}
                        <div className="mb-3">
                            <Skeleton className="h-3 w-full rounded-full" />
                        </div>

                        {/* Progress indicators skeleton */}
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-8" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    const progress = Math.min((cartTotal / threshold) * 100, 100);
    const remaining = Math.max(threshold - cartTotal, 0);
    const isEligible = cartTotal >= threshold;
    const currencySymbol = currency === 'USD' ? '$' : '€';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 lg:mb-6">
            <Card className="bg-background border-none">
                <CardContent className="py-2 lg:py-4 px-2 border-b border-border">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div>
                                <h3
                                    className={`font-semibold ${isEligible ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {isEligible ? t('freeShippingEligible') : t('almostFreeShipping')}
                                </h3>
                                <p
                                    className={`text-sm ${isEligible ? 'text-green-800 dark:text-green-400' : 'text-muted-foreground'}`}>
                                    {isEligible
                                        ? t('freeShipping')
                                        : t('getFreeShipping', { amount: `${currencySymbol}${remaining.toFixed(2)}` })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3 relative">
                        {/* Progress Bar */}
                        <Progress
                            value={progress}
                            className={`h-3 bg-neutral-300 dark:bg-neutral-800 relative z-10 ${isEligible ? '[&>div]:bg-linear-to-r [&>div]:from-green-500 [&>div]:to-lime-400' : '[&>div]:bg-linear-to-r [&>div]:from-green-500 [&>div]:to-lime-600 dark:[&>div]:from-lime-600 dark:[&>div]:to-lime-400'}`}
                        />

                        {/* Dashed line centered in the bar - only within progress width */}
                        <div
                            className={`${isEligible ? 'hidden' : 'absolute top-0 left-0 h-full flex items-center pointer-events-none z-20 overflow-hidden'}`}
                            style={{ width: `${progress}%` }}>
                            <div className="w-full border-t-2 border-dashed border-neutral-700" />
                        </div>

                        {/* Truck icon at progress position */}
                        <motion.div
                            initial={{ x: 0 }}
                            animate={{ x: 0 }}
                            className={` ${isEligible ? 'hidden' : 'absolute top-1/2 -translate-y-1/2 z-30 bg-background p-1 rounded-full border border-brand'}`}
                            style={{ left: `calc(${progress}% - 12px)` }}>
                            <Truck
                                className={`h-6 w-6 ${isEligible ? 'text-green-600 dark:text-green-400' : 'text-lime-600 dark:text-lime-400'}`}
                            />
                        </motion.div>
                    </div>

                    {/* Progress indicators */}
                    <div className="flex justify-between text-muted-foreground text-xs">
                        <span>{currencySymbol}0</span>
                        <span className="font-medium">
                            {currencySymbol}
                            {threshold} - {t('freeShipping')}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default FreeShippingProgressBar;
