// @/app/(actions)/cart/checkout/ShippingMethodSelector.jsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const ShippingMethodSelector = ({
    storeSettings,
    selectedCountry,
    onShippingMethodSelect,
    onShippingMethodsLoaded,
    selectedMethod,
    isEligibleForFreeShipping = false,
    isLoading: parentLoading = false
}) => {
    const t = useTranslations('Checkout');
    const [shippingMethods, setShippingMethods] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Helper function to extract initials from carrier name
    const getCarrierInitials = (carrierName) => {
        if (!carrierName) return '??';

        const words = carrierName.trim().split(/\s+/);

        if (words.length === 1) {
            // Single word: take first letter
            return words[0].charAt(0).toUpperCase();
        } else {
            // Multiple words: take first letter of first two words
            return words
                .slice(0, 2)
                .map((word) => word.charAt(0).toUpperCase())
                .join('');
        }
    };

    // Fetch shipping methods based on selected country
    useEffect(() => {
        const fetchShippingMethods = async () => {
            if (!selectedCountry) {
                setShippingMethods([]);
                if (onShippingMethodsLoaded) {
                    onShippingMethodsLoaded([]);
                }
                return;
            }

            setIsLoading(true);
            setError('');

            try {
                let availableMethods = [];

                if (storeSettings?.carriers && storeSettings.carriers.length > 0) {
                    // Filter carriers that support the selected country and are enabled (matches admin settings structure)
                    const enabledCarriers = storeSettings.carriers.filter(
                        (carrier) =>
                            carrier.enabled &&
                            (carrier.supportedCountries.includes(selectedCountry) ||
                                carrier.supportedCountries.includes('ALL') ||
                                carrier.supportedCountries.length === 0)
                    );

                    // Convert carriers to shipping method format (matches admin carriers structure)
                    availableMethods = enabledCarriers.map((carrier) => ({
                        id: carrier.id,
                        name: carrier.name,
                        carrier_name: carrier.carrierName || carrier.name, // Match admin structure
                        description: carrier.description,
                        delivery_time: `${carrier.deliveryTime}`,
                        delivery_estimated: `${Number(carrier.deliveryTime) + 2}`,
                        fixed_rate: carrier.basePrice, // Match admin basePrice field
                        base_price: carrier.basePrice, // Add alias for compatibility
                        logo: carrier.logo,
                        enabled: carrier.enabled, // Match admin structure
                        supportedCountries: carrier.supportedCountries, // Match admin structure
                        weight_limits: carrier.weightLimits || null, // Match admin structure
                        dimension_limits: carrier.dimensionLimits || null, // Match admin structure
                        deliveryTimeUnit: carrier.deliveryTimeUnit || 'Days' // Match admin structure
                    }));
                }

                // Add free shipping option if eligible and country is allowed (matches admin settings structure)
                if (isEligibleForFreeShipping && storeSettings?.freeShippingEnabled) {
                    const isCountryAllowed =
                        !storeSettings.allowedCountries?.length ||
                        storeSettings.allowedCountries.includes(selectedCountry);
                    const isCountryBanned = storeSettings.bannedCountries?.includes(selectedCountry);

                    if (isCountryAllowed && !isCountryBanned) {
                        const freeShippingCarrierName = storeSettings.freeShippingCarrier || 'Standard';
                        const freeShippingThreshold = storeSettings.freeShippingThreshold || 50;

                        // Find the actual carrier data if freeShippingCarrier references a real carrier
                        const actualCarrier = storeSettings.carriers?.find(
                            (carrier) =>
                                carrier.name === freeShippingCarrierName ||
                                carrier.carrierName === freeShippingCarrierName ||
                                carrier.id === freeShippingCarrierName
                        );

                        // Use actual carrier data if found, otherwise use defaults
                        const freeShippingMethod = {
                            id: 'free_shipping',
                            name: t('freeShipping') || 'Free Shipping',
                            carrier_name: actualCarrier?.carrierName || actualCarrier?.name || freeShippingCarrierName,
                            description:
                                actualCarrier?.description ||
                                t('freeShippingDescription', { threshold: freeShippingThreshold }) ||
                                `Free shipping on orders over €${freeShippingThreshold}`,
                            delivery_time: actualCarrier?.deliveryTime ? `${actualCarrier.deliveryTime}` : '3',
                            delivery_estimated: actualCarrier?.deliveryTime
                                ? `${Number(actualCarrier.deliveryTime) + 2}`
                                : '7',
                            fixed_rate: 0,
                            base_price: 0,
                            logo: actualCarrier?.logo || null,
                            enabled: true,
                            supportedCountries:
                                actualCarrier?.supportedCountries || storeSettings.allowedCountries || [],
                            weight_limits: actualCarrier?.weightLimits || null,
                            dimension_limits: actualCarrier?.dimensionLimits || null,
                            deliveryTimeUnit: actualCarrier?.deliveryTimeUnit || 'Days',
                            isFreeShipping: true // Flag for identification
                        };

                        availableMethods.unshift(freeShippingMethod);
                    }
                }

                setShippingMethods(availableMethods);

                // Notify parent component about loaded methods for auto-selection
                if (onShippingMethodsLoaded) {
                    onShippingMethodsLoaded(availableMethods);
                }
            } catch (err) {
                console.error('Error fetching shipping methods:', err);
                setError(t('shippingMethodsError') || 'Failed to load shipping methods');
                setShippingMethods([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchShippingMethods();
    }, [
        selectedCountry,
        isEligibleForFreeShipping,
        storeSettings?.carriers,
        storeSettings?.freeShippingEnabled,
        storeSettings?.freeShippingCarrier,
        storeSettings?.allowedCountries,
        storeSettings?.bannedCountries,
        t
    ]);

    const handleMethodSelect = (method) => {
        onShippingMethodSelect(method);
    };

    if (isLoading || parentLoading) {
        return (
            <div className="space-y-3">
                <h3 className="font-semibold text-lg">{t('shippingMethod')}</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="rounded-lg border border-border p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-4 w-4 rounded-full bg-muted"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 rounded bg-muted"></div>
                                            <div className="h-3 w-24 rounded bg-muted"></div>
                                        </div>
                                    </div>
                                    <div className="h-4 w-16 rounded bg-muted"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-3">
                <h3 className="font-semibold text-lg">{t('shippingMethod')}</h3>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center space-x-2 text-red-700">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="font-medium">{t('shippingError')}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedCountry) {
        return (
            <div className="space-y-3">
                <h3 className="font-semibold text-lg">{t('shippingMethod')}</h3>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center space-x-2 text-blue-700">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="font-medium">{t('selectCountryShipping')}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (shippingMethods.length === 0) {
        return (
            <div className="space-y-3">
                <h3 className="font-semibold text-lg">{t('shippingMethod')}</h3>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="text-sm">{t('noShippingMethods')}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-foreground">{t('shippingMethod')}</h3>
            </div>
            <div className="space-y-3">
                {shippingMethods.map((method, index) => (
                    <motion.div
                        key={method.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}>
                        <label
                            className={`group relative block cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                                selectedMethod?.id === method.id
                                    ? 'border-brand bg-accent shadow-sm'
                                    : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                            }`}>
                            <input
                                type="radio"
                                name="shipping-method"
                                value={method.id}
                                checked={selectedMethod?.id === method.id}
                                onChange={() => handleMethodSelect(method)}
                                className="sr-only"
                            />

                            {/* Selected Indicator */}
                            <div
                                className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                    selectedMethod?.id === method.id
                                        ? 'border-primary bg-brand'
                                        : 'border-muted-foreground/30 bg-background'
                                }`}>
                                {selectedMethod?.id === method.id && (
                                    <svg
                                        className="h-3 w-3 text-primary-foreground"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* Header Section */}
                                <div className="flex items-start gap-3 pr-8">
                                    {/* Logo/Initials */}
                                    <div
                                        className={`flex h-12 w-12 border-2 border-border bg-linear-to-br from-white to-gray-300 p-2 shrink-0 items-center justify-center rounded-lg transition-all duration-200`}>
                                        {method.logo ? (
                                            <Image
                                                width={40}
                                                height={40}
                                                unoptimized={true}
                                                src={method.logo}
                                                alt={method.carrier_name}
                                                loading="lazy"
                                                priority={false}
                                                className="h-full w-full object-contain"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-neutral-900 font-bold text-sm">
                                                {getCarrierInitials(method.carrier_name || method.name)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Method Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <h4 className="font-semibold text-foreground text-base leading-tight">
                                                {method.name}
                                            </h4>
                                        </div>

                                        {method.carrier_name && (
                                            <p className="text-muted-foreground text-sm mb-1.5">
                                                via <span className="font-medium">{method.carrier_name}</span>
                                            </p>
                                        )}

                                        {method.description && (
                                            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                                                {method.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Section */}
                                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                    {/* Delivery Time */}
                                    {method.delivery_time && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <svg
                                                className="h-4 w-4 shrink-0"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span className="text-sm font-medium">
                                                {method.delivery_time}-{method.delivery_estimated}{' '}
                                                {Number(method.delivery_estimated) === 1 ? t('day') : t('days')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Price */}
                                    <div className="flex items-baseline gap-1">
                                        {method.fixed_rate === 0 ? (
                                            <span className="text-lg font-bold text-green-600 dark:text-green-500">
                                                {t('free')}
                                            </span>
                                        ) : (
                                            <>
                                                <span className="text-base font-bold text-foreground">
                                                    €{method.fixed_rate.toFixed(2)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </label>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ShippingMethodSelector;
