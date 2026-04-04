// @/app/(frontend)/components/ProductCard.jsx
'use client';

import { Eye, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useCart } from 'react-use-cart';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ProductCard = ({ product, theme = null, TopBadge = null, addToCart = true, hideToast = false, onNavigate }) => {
    const t = useTranslations('Shop');
    const locale = useLocale();
    const { addItem, inCart } = useCart();
    const router = useRouter();
    const [isNavigating, setIsNavigating] = useState(false);
    const [selectedQuantityTier, setSelectedQuantityTier] = useState(null);

    // Initialize product data
    useEffect(() => {
        if (!product) return;
    }, [product]);

    // Determine if we need to invert colors
    const invertColors = theme === 'background';

    // Classes object - stores all dynamic class names
    const classes = {
        cardBg: invertColors ? 'bg-white dark:border-black/30' : 'bg-white',
        text: invertColors ? 'text-dark dark:text-background' : 'text-dark dark:text-background',
        border: invertColors ? 'border-black/30 disabled:border-black/10' : 'border-black/30 disabled:border-black/10',
        badgeBg: invertColors
            ? 'bg-background/90 border-black/50 dark:border-black/70'
            : 'border-black/30 dark:border-black/90',
        badgeText: invertColors ? 'text-black dark:text-white' : 'text-black',
        buttonBg: invertColors
            ? 'bg-foreground dark:bg-background border-black/70 disabled:border-black/10 disabled:bg-foreground/30 dark:disabled:bg-black/70'
            : 'disabled:bg-primary/60 dark:disabled:bg-background/80 bg-primary dark:bg-background',
        buttonText: invertColors ? 'text-background dark:text-foreground' : 'text-background dark:text-foreground',
        buttonDisabledText: invertColors
            ? 'text-foreground/70 !dark:text-background/90 disabled:opacity-90'
            : 'text-foreground/70 disabled:opacity-90',
        buttonHover: invertColors
            ? 'hover:bg-foreground/95 dark:hover:bg-background/95'
            : ' hover:bg-primary/90 dark:hover:bg-background/95',
        disabledBg: invertColors ? 'disabled:!bg-muted/90 disabled:opacity-30' : 'disabled:!bg-muted/50',
        strikeThroughButton: invertColors ? 'text-gray-500' : 'text-gray-500',
        finalPriceText: invertColors ? 'text-brand' : 'text-brand',
        attributeBadgeBg: 'bg-white/90 border-lime-500/80',
        attributeBadgeText: 'text-neutral-900',
        topBadgeSpan:
            'border border-border font-bold text-[0.5rem] sm:text-[0.625rem] md:text-[0.685rem] lg:text-[0.655rem] uppercase tracking-wider text-nowrap px-3 py-1.5 rounded-full shadow-lg',
        topBadgeCustom: 'bg-gradient-to-r from-purple-700 via-purple-600 to-purple-800 text-white',
        topBadgeCollection: 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white',
        topBadgeFeatured: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-black',
        topBadgeNew: 'bg-gradient-to-r from-green-600 via-lime-600 to-green-500 text-white',
        promoBadge: 'bg-gradient-to-r from-red-600 to-red-500 text-white',
        promoBadgeSpan:
            'font-bold text-[0.5rem] sm:text-[0.625rem] md:text-[0.685rem] lg:text-[0.655rem] uppercase tracking-wider text-nowrap px-3 py-1.5 rounded-full shadow-lg'
    };

    // Initialize selected quantity tier
    useEffect(() => {
        if (product.hasQuantityPricing && product.quantityPricing && product.quantityPricing.length > 0) {
            // Set first option (default product price and quantity) as default
            setSelectedQuantityTier(product.quantityPricing[0]);
        } else {
            // Set product base data as tier for products without quantity pricing
            setSelectedQuantityTier({
                quantity: product.quantity || 1,
                unit: product.quantityUnit || product.unit || 'un',
                price: product.price,
                compareAtPrice: product.compareAtPrice,
                discount: product.discount
            });
        }
    }, [product]);

    // Reset isNavigating when component unmounts (navigation completes)
    useEffect(() => {
        return () => {
            setIsNavigating(false);
        };
    }, []);

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!product) return;

        // Check stock: 0 = out of stock, -1 = unlimited, > 0 = in stock
        if (product.stock === 0) {
            toast.error(t('outOfStock'));
            return;
        }

        // Use selected quantity tier - prices are already final from store.js
        const selectedTier = selectedQuantityTier ||
            product.quantityPricing?.[0] || {
                price: product.price,
                compareAtPrice: product.compareAtPrice,
                discount: product.discount,
                discountAmount: product.discountAmount,
                discountType: product.discountType,
                name: product.name,
                quantity: product.quantity,
                unit: product.quantityUnit
            };

        const finalPrice = parseFloat(selectedTier.price);
        const originalPrice = parseFloat(selectedTier.compareAtPrice || selectedTier.price);

        // Build item name with selected option or base quantity/unit
        let itemName;
        if (selectedTier) {
            itemName = `${product.name} - ${selectedTier.quantity}${selectedTier.unit || ''}`;
        } else if (product.quantity && product.quantityUnit) {
            itemName = `${product.name} - ${product.quantity}${product.quantityUnit}`;
        } else {
            itemName = product.name;
        }
        
        // Create unique cart ID for different quantity options
        // Format: productId-quantityValue (e.g., "123-5g" or "123-10g")
        const quantityIdentifier =
            selectedTier.quantity && selectedTier.unit
                ? `${selectedTier.quantity}${selectedTier.unit}`.toLowerCase().replace(/\s+/g, '')
                : 'default';
        const cartItemId = `${product.id}-${quantityIdentifier}`;

        // Check if item already exists in cart
        if (inCart(cartItemId)) {
            if (!hideToast) {
                toast.error(
                    <span>
                        {t('productAlreadyInCart') || 'Product already in cart'}
                        <button
                            style={{
                                marginLeft: 8,
                                color: '#16a34a',
                                textDecoration: 'underline',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                if (typeof toast.dismiss === 'function') {
                                    toast.dismiss();
                                }
                                router.push('/cart');
                            }}>
                            {t('viewCart')}
                        </button>
                    </span>
                );
            }
            return;
        }

        addItem({
            id: cartItemId,
            productId: product.id, // Keep original product ID for reference
            name: itemName,
            discount: product.discount || 0,
            discountAmount: product.discountAmount || 0,
            discountType: product.discountType || 'percentage',
            priceBefore: originalPrice,
            price: finalPrice,
            image: product.image,
            quantity: 1,
            selectedQuantity: selectedTier.quantity,
            selectedUnit: selectedTier.unit,
            quantityOption: `${selectedTier.quantity || ''}${selectedTier.unit || ''}`, // For display/reference
            // Additional fields for cart consistency
            stock: product.stock,
            categoryId: product.categoryId,
            slug: product.slug
        });

        if (!hideToast) {
            toast.success(
                <span>
                    {t('addedToCart', { productName: product.name })}
                    <button
                        style={{
                            marginLeft: 8,
                            color: '#16a34a',
                            textDecoration: 'underline',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            if (typeof toast.dismiss === 'function') {
                                toast.dismiss();
                            }
                            router.push('/cart');
                        }}>
                        {t('viewCart')}
                    </button>
                </span>
            );
        }
    };

    const hasDiscount = product.discount > 0;

    // Discount percentage is already calculated in store.js getCatalog
    const discountPercentage = Math.round(product.discount || 0);

    // Get lowest price per unit from quantity pricing tiers
    const getLowestQuantityPrice = (product) => {
        if (!product.hasQuantityPricing || !product.quantityPricing || product.quantityPricing.length === 0) {
            return parseFloat(product.price) || 0;
        }

        // Calculate price per unit for all tiers (price / quantity)
        const pricesPerUnit = product.quantityPricing
            .map((tier) => {
                const price = parseFloat(tier.price);
                const quantity = parseFloat(tier.quantity);
                if (isNaN(price) || isNaN(quantity) || quantity === 0) return Infinity;
                return price / quantity;
            })
            .filter(p => p !== Infinity);

        // Return the lowest price per unit
        if (pricesPerUnit.length === 0) return (parseFloat(product.price) || 0).toFixed(2);
        const lowestPrice = Math.min(...pricesPerUnit);
        return (isNaN(lowestPrice) ? 0 : lowestPrice).toFixed(2);
    };

    const handleProductClick = (e) => {
        setIsNavigating(true);
        // Call onNavigate callback if provided (e.g., to close OffCanvasMenu)
        if (onNavigate) {
            onNavigate();
        }
    };

    // Get CBD value from attributes
    const getMIXValue = () => {
        if (!product.attributes || !Array.isArray(product.attributes)) return null;
        const cbdAttribute = product.attributes.find((attr) => attr.name === 'CBD' || attr.name === 'MIX');
        return cbdAttribute ? parseFloat(cbdAttribute.value) || 0 : null;
    };

    // Get MIX/CBD name
    const getMIXName = () => {
        if (!product.attributes || !Array.isArray(product.attributes)) return 'CBD';
        const mixAttribute = product.attributes.find((attr) => attr.name === 'MIX');
        return mixAttribute ? 'MIX' : 'CBD';
    };

    // Get Type or Specie value from attributes
    const getTypeOrSpecie = () => {
        if (!product.attributes || !Array.isArray(product.attributes)) return null;
        const typeAttribute = product.attributes.find((attr) => attr?.name.toLowerCase() === 'type');
        if (typeAttribute && typeAttribute.value) return typeAttribute.value;
        const specieAttribute = product.attributes.find((attr) => attr?.name.toLowerCase() === 'specie');
        return specieAttribute && specieAttribute.value ? specieAttribute.value : null;
    };

    const cbdValue = getMIXValue();
    const cbdName = getMIXName();

    const typeOrSpecie = getTypeOrSpecie();
    return (
        <div className="group relative">
            {/* Top Badges */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 cursor-pointer">
                <div className={`flex items-center justify-center space-x-1 md:space-x-2`}>
                    {/* First Badge - Priority: TopBadge > Collection > Featured > New */}
                    {TopBadge ? (
                        // Custom Badge from props
                        <span className={`${classes.topBadgeCustom} ${classes.topBadgeSpan}`}>{TopBadge}</span>
                    ) : product.collections && product.collections.length > 0 ? (
                        // Collection Badge with custom color support
                        <span
                            className={`${classes.topBadgeSpan} text-white`}
                            style={{
                                background: product.collections[0].color
                                    ? `linear-gradient(to right, ${product.collections[0].color}, ${product.collections[0].color})`
                                    : 'linear-gradient(to right, #2563eb, #3b82f6, #2563eb)' // Default blue gradient
                            }}>
                            {product.collections[0].nameML?.[locale] || product.collections[0].name}
                        </span>
                    ) : product.isFeatured ? (
                        // Featured Badge
                        <span className={`${classes.topBadgeFeatured} ${classes.topBadgeSpan}`}>{t('isFeatured')}</span>
                    ) : product.isNew ? (
                        // New Product Badge
                        <span className={`${classes.topBadgeNew} ${classes.topBadgeSpan}`}>{t('isNew')}</span>
                    ) : null}

                    {/* Second Badge - Discount (only if discount exists) */}
                    {hasDiscount && discountPercentage > 0 && (
                        // Promotion Badge
                        <span className={`${classes.promoBadge} ${classes.promoBadgeSpan}`}>
                            -{discountPercentage}%
                        </span>
                    )}
                </div>
            </div>

            <Card
                className={`rounded-sm ${classes.cardBg} py-0 shadow-sm ring ring-black/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col gap-2 md:gap-3`}>
                <Link
                    prefetch={false}
                    href={
                        product.categories?.[0]?.slug
                            ? `/shop/${product.categories[0].slug}/${product.slug}`
                            : `/shop/${product.slug}`
                    }
                    onClick={handleProductClick}>
                    <CardContent className="flex-1 mb-0 pb-0 mt-5 md:mt-6 px-2 md:px-3 lg:px-4 pt-[0.5] sm:pt-1 md:pt-2 lg:pt-4 flex flex-col">
                        <h3
                            className={`mx-auto ${classes.text} font-semibold text-md md:text-lg lg:text-xl line-clamp-2 min-h-[2.7rem] max-h-[2.7rem] md:min-h-12 md:max-h-12 lg:min-h-[3.4rem] lg:max-h-[3.4rem]`}>
                            {product.name}
                        </h3>

                        {/* Starting from badge - Fixed Height */}

                        <div className="flex flex-nowrap gap-1 mx-auto mt-auto min-h-10">
                            {/* A partir de Badge */}
                            {product.hasQuantityPricing && (
                                <span
                                    className={`truncate border ${classes.badgeBg} ${classes.badgeText} text-[0.625rem] sm:text-[0.75rem] md:text-sm lg:text-md font-normal tracking-wider rounded px-2 py-0.5 self-start`}>
                                    <span className="uppercase mr-1">A partir de</span>
                                    <span className="font-extrabold">
                                        {product.hasQuantityPricing
                                            ? getLowestQuantityPrice(product)
                                            : (parseFloat(product.price) || 0).toFixed(2)}
                                        € /
                                        {product.hasQuantityPricing && product.quantityUnit
                                            ? product.quantityUnit === 'g'
                                                ? 'gr'
                                                : product.quantityUnit
                                            : product.unit || 'un'}
                                    </span>
                                </span>
                            )}
                        </div>

                        {/* Review Stars - Below description */}
                        <div className="mx-auto my-0.5 flex items-center gap-1 min-h-4 md:min-h-5 lg:min-h-6">
                            {product.rating > 0 && (product.reviewCount > 0 || product.reviewCount === undefined) && (
                                <>
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-3 w-3 lg:h-4 lg:w-4 ${
                                                    i < Math.round(product.rating)
                                                        ? 'text-yellow-500 fill-yellow-500'
                                                        : 'text-gray-300'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    {product.reviewCount > 0 && (
                                        <span
                                            className={`text-[0.625rem] sm:text-[0.75rem] md:text-sm ${theme === 'background' ? 'text-muted-foreground' : 'text-muted'}`}>
                                            ({product.reviewCount})
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="relative aspect-square overflow-hidden rounded-sm">
                            {/* Loading Overlay - Only on Image */}
                            {isNavigating && (
                                <div className="absolute inset-0 bg-background/30 backdrop-blur-sm z-25 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm font-medium">{t('loading') || 'A carregar...'}</p>
                                    </div>
                                </div>
                            )}

                            {product.image && (
                                <Image
                                    src={product.image || '/images/placeholder-image.jpg'}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    loading="lazy"
                                    priority={false}
                                    className={`${product.stock === 0 && 'filter grayscale'} object-cover group-hover:scale-105 transition-transform duration-300`}
                                />
                            )}

                            {/* Out of Stock Overlay */}
                            {product.stock === 0 && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center">
                                    <Image
                                        src="/images/outofstock.webp"
                                        alt="Out of Stock"
                                        fill
                                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        loading="lazy"
                                        priority={false}
                                        className="object-contain pointer-events-none p-4 opacity-85"
                                    />
                                </div>
                            )}

                            
                            {/* MIX Badge Seal */}
                            {cbdName && cbdName === 'MIX' && ( 
                                    <div className="absolute -top-3 -right-5 flex w-full h-full pointer-events-none z-20">
                                    <Image
                                        src="/images/selo.webp"
                                        alt="HHC MIX"
                                        width={140}
                                        height={140} 
                                        loading="lazy"
                                        priority={false}
                                        className="ms-auto object-contain w-auto max-h-22 p-4 opacity-85 transition-all filter contrast-85 brightness-110 rotate-0 duration-500"
                                    />
                                    </div> 
                            )}

                            {/* Type/Specie Badges */}

                            {typeOrSpecie !== null && (
                                <div
                                    className={`absolute bottom-2 left-2 z-15 ${product.stock === 0 ? 'filter grayscale' : ''}`}>
                                    <div className="flex flex-col gap-1 w-13 sm:w-15 md:w-16.25">
                                        {/* Type/Specie Badge */}
                                        <div
                                            className={`relative h-6 max-h-6 lg:h-7 lg:max-h-7 rounded-sm overflow-hidden backdrop-blur-sm border ring ${
                                                cbdName.toLowerCase() === 'cbd'
                                                    ? 'ring-lime-500/90 border-white/80 bg-linear-to-r from-green-500 via-lime-500 to-green-400'
                                                    : 'ring-sky-600/90 border-white/80 bg-linear-to-r from-sky-400 via-sky-500 to-sky-600'
                                            }`}>
                                            {/* Type/Specie value text */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span
                                                    className={`text-[0.620rem] sm:text-[0.685rem] md:text-xs font-bold ${classes.attributeBadgeText}`}>
                                                    {typeOrSpecie}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CBD Badges */}
                            {cbdValue !== null && cbdValue > 0 && (
                                <div
                                    className={`absolute bottom-2 right-2 z-15 ${product.stock === 0 ? 'filter grayscale' : ''}`}>
                                    <div className="flex flex-col gap-1 w-13 sm:w-15 md:w-16.25">
                                        {/* CBD Badge Progress Bar */}
                                        <div
                                            className={`relative h-6 max-h-6 lg:h-7 lg:max-h-7 rounded-sm overflow-hidden backdrop-blur-sm border ring ${
                                                cbdName.toLowerCase() === 'cbd'
                                                    ? 'ring-lime-500/90 border-white/80'
                                                    : 'ring-sky-600/90 border-white/80'
                                            } ${classes.attributeBadgeBg}`}>
                                            {/* Progress fill */}
                                            <div
                                                className={`absolute inset-0 bg-linear-to-r ${cbdName.toLowerCase() === 'cbd' ? 'from-green-500 via-lime-500 to-green-400' : 'from-sky-400 via-sky-500 to-sky-600'} transition-all duration-300`}
                                                style={{ width: `${Math.min(cbdValue, 100)}%` }}
                                            />
                                            {/* CBD value text */}
                                            <div className={`absolute inset-0 ${cbdName === 'MIX' ? '-top-2' : ''} flex items-center justify-center`}>
                                                <span
                                                    className={`w-full flex flex-col relative gap-0 items-center justify-evenly text-[0.620rem] sm:text-[0.685rem] md:text-xs font-bold ${classes.attributeBadgeText}`}>
                                                    <span className="flex flex-nowrap gap-0.5 items-center justify-center"> 
                                                        <span className="font-bold">{cbdValue}%</span>
                                                        <span className="font-bold">{cbdName}</span>
                                                    </span>  
                                                    {cbdName === 'MIX' && (
                                                    <span className="absolute -bottom-2.5 font-semibold text-[0.62rem]">~ HHC</span>
                                                    )}  
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Link>

                <CardFooter className="mt-auto pb-3 md:pb-4 pt-0 px-2 md:px-3 lg:px-4 flex flex-col gap-3">
                    {/* Quantity Tier Selector - Always show if addToCart is true */}
                    {addToCart ? (
                        <div className="w-full" onClick={(e) => e.stopPropagation()}>
                            <Select
                                value={
                                    selectedQuantityTier
                                        ? JSON.stringify(selectedQuantityTier)
                                        : JSON.stringify({ quantity: product.quantity || 1, price: product.price })
                                }
                                onValueChange={(value) => setSelectedQuantityTier(JSON.parse(value))}
                                disabled={
                                    product.stock === 0 ||
                                    !(
                                        product.hasQuantityPricing &&
                                        product.quantityPricing &&
                                        product.quantityPricing.length > 0
                                    )
                                }>
                                <SelectTrigger
                                    className={`text-xs md:text-sm lg:text-md w-full ${classes.text} border ${classes.border} ${classes.disabledBg}`}>
                                    <SelectValue placeholder="Selecionar quantidade" />
                                </SelectTrigger>
                                <SelectContent>
                                    {product.hasQuantityPricing &&
                                    product.quantityPricing &&
                                    product.quantityPricing.length > 0 ? (
                                        /* Map through quantityPricing array (already includes base product as first item from store.js) */
                                        product.quantityPricing.map((tier, index) => {
                                            const tierPrice = parseFloat(tier.price) || 0;
                                            const tierComparePrice = parseFloat(tier.compareAtPrice || tier.price) || 0;
                                            const tierHasDiscount = tier.discount > 0 && tierComparePrice > tierPrice;

                                            return (
                                                <SelectItem key={index} value={JSON.stringify(tier)}>
                                                    <span className="flex items-center gap-0.3 sm:gap-0.5 md:gap-0.8 text-[0.635rem] sm:text-[0.765rem] md:text-sm">
                                                        <span className="uppercase font-semibold mr-0.5">
                                                            {tier.quantity}
                                                            {tier.unit || product.quantityUnit || ''}
                                                        </span>
                                                        <span className="flex items-center gap-0.3 sm:gap-0.5 md:gap-1">
                                                            <span>(</span>
                                                            {tierHasDiscount && (
                                                                <span
                                                                    className={`strike-through mr-0.5 ${product.stock === 0 ? classes.buttonDisabledText : classes.strikeThroughButton}`}>
                                                                    {(isNaN(tierComparePrice) ? 0 : tierComparePrice).toFixed(2)}€
                                                                </span>
                                                            )}
                                                            <span className="font-semibold">
                                                                {(isNaN(tierPrice) ? 0 : tierPrice).toFixed(2)}€
                                                            </span>
                                                            <span>)</span>
                                                        </span>
                                                    </span>
                                                </SelectItem>
                                            );
                                        })
                                    ) : (
                                        /* Single option for products without tier pricing */
                                        <SelectItem
                                            value={JSON.stringify({
                                                quantity: product.quantity || 1,
                                                unit: product.quantityUnit || product.unit || 'un',
                                                price: product.price,
                                                compareAtPrice: product.compareAtPrice,
                                                discount: product.discount
                                            })}>
                                            <span className="flex items-center gap-0.3 sm:gap-0.5 md:gap-0.8 text-[0.635rem] sm:text-[0.765rem] md:text-sm">
                                                <span className="uppercase font-semibold mr-0.5">
                                                    {product.quantity || 1}
                                                    {product.quantityUnit || product.unit || 'un'}
                                                </span>
                                                <span className="flex items-center gap-0.3 sm:gap-0.5 md:gap-1">
                                                    <span>(</span>
                                                    {product.discount > 0 && product.compareAtPrice > product.price && (
                                                        <span
                                                            className={`strike-through mr-0.5 ${classes.buttonDisabledText}`}>
                                                            {(parseFloat(product.compareAtPrice) || 0).toFixed(2)}€
                                                        </span>
                                                    )}
                                                    <span className="font-semibold">
                                                        {(parseFloat(product.price) || 0).toFixed(2)}€
                                                    </span>
                                                    <span>)</span>
                                                </span>
                                            </span>
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}

                    {product.stock === 0 ? (
                        <Button
                            variant="outline"
                            disabled
                            className={`border-black/30 ${classes.buttonDisabledText} ${classes.buttonBg} text-[0.75rem] sm:text-[0.8125rem] md:text-[0.875rem] lg:text-[0.9375rem] font-bold w-full cursor-not-allowed`}
                            size="lg">
                            {t('outOfStock')}
                        </Button>
                    ) : addToCart ? (
                        <div className="w-full flex flex-nowrap items-center justify-between gap-1 md:gap-2">
                            <Button
                                onClick={handleAddToCart}
                                className={`border-black/30 font-bold overflow-hidden ${classes.buttonBg} ${classes.buttonText} ${classes.buttonHover} hover:scale-103 gap-0.5 md:gap-1 text-[0.6875rem] sm:text-[0.75rem] md:text-[0.8125rem] lg:text-[0.875rem] items-center justify-center flex-1 ${isNavigating ? 'opacity-50' : ''}`}
                                size="lg"
                                disabled={isNavigating}>
                                <span className="whitespace-nowrap shrink-0">{t('addToCart')}</span>
                                <span className="shrink-0 mx-1.5 sm:mx-1">|</span>
                                {(() => {
                                    // Use selected tier or first tier price
                                    const selectedTier = selectedQuantityTier ||
                                        product.quantityPricing?.[0] || {
                                            price: product.price,
                                            compareAtPrice: product.compareAtPrice,
                                            discount: product.discount
                                        };

                                    const finalPrice = parseFloat(selectedTier.price) || 0;
                                    const comparePrice = parseFloat(selectedTier.compareAtPrice) || 0;
                                    const hasDiscount = selectedTier.discount > 0 && comparePrice > finalPrice;

                                    return (
                                        <span className="flex flex-col sm:flex-row gap-0 sm:gap-1 items-center justify-center whitespace-nowrap shrink">
                                            {hasDiscount && (
                                                <span
                                                    className={`strike-through ${classes.strikeThroughButton} font-light text-[0.625rem] sm:text-[0.6875rem] md:text-[0.75rem] lg:text-[0.8125rem] shrink-0`}>
                                                    {(isNaN(comparePrice) ? 0 : comparePrice).toFixed(2)}€
                                                </span>
                                            )}
                                            <span className={`${classes.finalPriceText} font-bold shrink-0 `}>
                                                {(isNaN(finalPrice) ? 0 : finalPrice).toFixed(2)}€
                                            </span>
                                        </span>
                                    );
                                })()}
                            </Button>
                        </div>
                    ) : (
                        <Link
                            prefetch={false}
                            className="w-full"
                            href={
                                product.categories?.[0]?.slug
                                    ? `/shop/${product.categories[0].slug}/${product.slug}`
                                    : `/shop/${product.slug}`
                            }
                            onClick={handleProductClick}>
                            <Button
                                className={`text-[0.75rem] sm:text-[0.8125rem] md:text-[0.875rem] lg:text-[0.9375rem] w-full ${isNavigating ? 'opacity-50' : ''}`}
                                size="lg"
                                variant="outline"
                                disabled={isNavigating}>
                                {t('viewProduct')}
                            </Button>
                        </Link>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default ProductCard;
