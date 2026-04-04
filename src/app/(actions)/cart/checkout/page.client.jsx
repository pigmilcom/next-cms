// @/app/(actions)/cart/checkout/page.client.jsx
'use client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { motion } from 'framer-motion';
import { ArrowLeft, CircleChevronLeft, ChevronDown, ChevronUp, Lock, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useCart } from 'react-use-cart';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, useSettings } from '@/context/providers';
import PaymentForm from './PaymentForm.jsx';

// Stripe promise will be initialized dynamically from store settings
let stripePromise = null;

const CheckoutPageClient = ({ catalogItems = [] }) => {
    const router = useRouter();
    const { storeSettings } = useSettings();
    const { user } = useAuth();
    const t = useTranslations('Checkout');
    const { cartTotal, items, totalItems, emptyCart } = useCart();

    // User data from server component
    const isAuthenticated = !!user;

    const [stripeOptions, setStripeOptions] = useState(null);
    const [_shippingCost, setShippingCost] = useState(0);
    const [selectedShippingMethod, setSelectedShippingMethod] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [_vatBreakdown, _setVatBreakdown] = useState({ subtotal: 0, vatAmount: 0, total: 0 });
    const [stripeReady, setStripeReady] = useState(false);
    const [isValidatingCart, setIsValidatingCart] = useState(true);
    const [cartIsValid, setCartIsValid] = useState(false);
    const [isOrderSummaryExpanded, setIsOrderSummaryExpanded] = useState(false);

    // Validate cart items against catalog on mount
    useEffect(() => {
        const validateCartItems = () => {
            if (!items || items.length === 0) {
                setIsValidatingCart(false);
                setCartIsValid(true);
                return;
            }

            if (!catalogItems || catalogItems.length === 0) {
                setIsValidatingCart(false);
                setCartIsValid(false);
                toast.error(t('unableToValidateCart'));
                setTimeout(() => {
                    emptyCart();
                    router.push('/shop');
                }, 2000);
                return;
            }

            // Validate each cart item
            const invalidItems = [];

            for (const cartItem of items) {
                // Find matching product in catalog
                const catalogProduct = catalogItems.find(
                    (p) => p.id === cartItem.productId || p.slug === cartItem.slug
                );

                if (!catalogProduct) {
                    invalidItems.push(`${cartItem.name} (product not found)`);
                    continue;
                }

                // Verify product is active
                if (!catalogProduct.isActive) {
                    invalidItems.push(`${cartItem.name} (no longer available)`);
                    continue;
                }

                // Verify price matches (allow small floating point differences)
                let catalogPrice;

                // Check if product has quantity-based pricing
                if (catalogProduct.hasQuantityPricing && catalogProduct.quantityPricing?.length > 0) {
                    // Cart item might store the selected quantity tier in different fields:
                    let selectedTier =
                        cartItem.selectedQuantity ||
                        cartItem.quantityOption ||
                        cartItem.quantityTier ||
                        cartItem.selectedOption;

                    // Fallback: Try to parse quantity from item name (e.g., "Purple Jack - 25 g")
                    if (!selectedTier && cartItem.name) {
                        const nameMatch = cartItem.name.match(/- (\d+)\s*g/i);
                        if (nameMatch) {
                            selectedTier = parseInt(nameMatch[1], 10);
                        }
                    }

                    if (selectedTier) {
                        // If selectedTier is an object, get the quantity value
                        const tierQuantity = typeof selectedTier === 'object' ? selectedTier.quantity : selectedTier;

                        // Find the matching quantity tier
                        const matchingTier = catalogProduct.quantityPricing.find(
                            (tier) => parseInt(tier.quantity, 10) === parseInt(tierQuantity, 10)
                        );

                        if (matchingTier) {
                            // Use the quantity tier price
                            catalogPrice = parseFloat(matchingTier.price);
                        } else {
                            // Fall back to base price if tier not found
                            catalogPrice = parseFloat(catalogProduct.finalPrice || catalogProduct.price);
                        }
                    } else {
                        // No tier selection, use base price (quantity = 1)
                        catalogPrice = parseFloat(catalogProduct.finalPrice || catalogProduct.price);
                    }
                } else {
                    // Regular product without quantity pricing
                    catalogPrice = parseFloat(catalogProduct.finalPrice || catalogProduct.price);
                }

                const cartPrice = parseFloat(cartItem.price);
                const priceDifference = Math.abs(catalogPrice - cartPrice);

                if (priceDifference > 0.01) {
                    invalidItems.push(
                        `${cartItem.name} (price mismatch: expected ${catalogPrice.toFixed(2)}, got ${cartPrice.toFixed(2)})`
                    );
                    continue;
                }

                // Verify discount if applicable
                if (cartItem.discount !== catalogProduct.discount) {
                    invalidItems.push(`${cartItem.name} (discount mismatch)`);
                    continue;
                }

                // Verify stock for physical products
                if (catalogProduct.type === 'physical' && catalogProduct.trackStock) {
                    const requestedQty = cartItem.quantity || 1;
                    const availableStock = parseInt(catalogProduct.stock || 0, 10);

                    if (availableStock < requestedQty) {
                        invalidItems.push(`${cartItem.name} (insufficient stock)`);
                    }
                }
            }

            // Handle validation results
            if (invalidItems.length > 0) {
                setCartIsValid(false);
                setIsValidatingCart(false);

                const errorMsg =
                    invalidItems.length === 1
                        ? `Cart validation failed: ${invalidItems[0]}`
                        : `Cart validation failed for ${invalidItems.length} item(s)`;

                toast.error(errorMsg);

                setTimeout(() => {
                    emptyCart();
                    router.push('/shop');
                }, 2500);
            } else {
                setCartIsValid(true);
                setIsValidatingCart(false);
            }
        };

        validateCartItems();
    }, [items, catalogItems, emptyCart, router]);

    // Use store settings for free shipping threshold
    const FREE_SHIPPING_THRESHOLD = storeSettings?.freeShippingThreshold || 50;
    const isEligibleForFreeShipping = storeSettings?.freeShippingEnabled && cartTotal >= FREE_SHIPPING_THRESHOLD;

    // Calculate shipping cost based on free shipping eligibility
    const calculateShippingCost = () => {
        if (selectedShippingMethod) {
            // If free shipping is eligible and this is the free shipping method, return 0
            if (isEligibleForFreeShipping && selectedShippingMethod.id === 'free_shipping') {
                return 0;
            }
            // Return the selected method's cost
            return (
                selectedShippingMethod.fixed_rate ||
                selectedShippingMethod.base_price ||
                selectedShippingMethod.basePrice ||
                0
            );
        }

        // If no method selected, return 0 (user needs to select a method)
        return 0;
    };

    // Calculate VAT breakdown
    const calculateVatBreakdown = () => {
        if (!storeSettings || !storeSettings.vatEnabled) {
            return { subtotal: cartTotal, vatAmount: 0, total: cartTotal };
        }

        const vatRate = storeSettings.vatPercentage / 100;

        if (storeSettings.vatIncludedInPrice) {
            // VAT is already included in item prices
            const subtotalExclVat = cartTotal / (1 + vatRate);
            const vatAmount = cartTotal - subtotalExclVat;
            return {
                subtotal: cartTotal, // Show actual item prices as subtotal
                vatAmount: vatAmount,
                total: cartTotal
            };
        } else {
            // VAT needs to be added at checkout
            const vatAmount = cartTotal * vatRate;
            return {
                subtotal: cartTotal, // Show actual item prices as subtotal
                vatAmount: vatAmount,
                total: cartTotal + vatAmount
            };
        }
    };

    const vatInfo = calculateVatBreakdown();
    const subTotal = cartTotal.toFixed(2); // Simple sum of all item prices
    const finalShippingCost = calculateShippingCost();
    const totalPrice = Math.max(0, vatInfo.total + finalShippingCost - discountAmount).toFixed(2);

    // Handler for shipping cost updates from PaymentForm
    const handleShippingUpdate = (_newShippingCost, shippingMethod, discountAmount = 0) => {
        setSelectedShippingMethod(shippingMethod);

        // Set shipping cost based on method selection
        if (shippingMethod) {
            const methodCost = shippingMethod.fixed_rate || shippingMethod.base_price || shippingMethod.basePrice || 0;
            // If free shipping is eligible and this is the free shipping method, cost is 0
            if (isEligibleForFreeShipping && shippingMethod.id === 'free_shipping') {
                setShippingCost(0);
            } else {
                setShippingCost(methodCost);
            }
        } else {
            setShippingCost(0);
        }

        if (typeof discountAmount === 'number') {
            setDiscountAmount(discountAmount);
        }
    };

    // Update shipping cost when cart total changes and affects free shipping eligibility
    useEffect(() => {
        const newShippingCost = calculateShippingCost();
        setShippingCost(newShippingCost);
    }, [cartTotal, isEligibleForFreeShipping, selectedShippingMethod]);

    // Auto-expand order summary on large devices and handle screen resize
    useEffect(() => {
        const handleResize = () => {
            const isLargeDevice = window.innerWidth >= 1024; // lg breakpoint is 1024px
            if (isLargeDevice) {
                setIsOrderSummaryExpanded(true);
            }
        };

        // Set initial state
        handleResize();

        // Add event listener for window resize
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Initialize Stripe when store settings are available
    useEffect(() => {
        if (!storeSettings) {
            return;
        }

        // Initialize Stripe if card payments are enabled and keys are available
        if (storeSettings.paymentMethods?.stripe?.enabled && storeSettings.paymentMethods?.stripe?.apiPuplicKey) {
            try {
                stripePromise = loadStripe(storeSettings.paymentMethods.stripe.apiPuplicKey);
                setStripeReady(true);
            } catch (error) {
                console.error('Failed to initialize Stripe:', error);
                setStripeReady(false);
            }
        } else {
            setStripeReady(false);
        }

        // Set initial shipping cost based on settings
        const defaultCost = storeSettings.defaultShippingCost || 5.99;
        setShippingCost(defaultCost);
    }, [storeSettings]);

    useEffect(() => {
        // Set up Stripe options when cart total or shipping changes
        if (cartTotal > 0 && storeSettings && stripeReady && storeSettings.paymentMethods?.cardPayments) {
            setStripeOptions({
                mode: 'payment',
                amount: Math.round(totalPrice * 100), // Convert to cents
                currency: (storeSettings?.currency || 'EUR').toLowerCase(),
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#6772e5',
                        colorBackground: '#fff',
                        colorText: '#000',
                        colorDanger: '#df1b41',
                        fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
                        borderRadius: '0.6rem'
                    }
                },
                payment_method_types: ['card']
            });
        } else {
            setStripeOptions(null);
        }
    }, [cartTotal, totalPrice, storeSettings, stripeReady]);

    return (
        <div className="container mx-auto px-4 py-8">
            {isValidatingCart ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    {/* Title Skeleton */}
                    <div className="mb-8">
                        <Skeleton className="h-10 w-48" />
                    </div>

                    {/* Two Column Grid Skeleton */}
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Left: Payment Form Skeleton */}
                        <div className="order-2 lg:order-1">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-6">
                                        {/* Form fields skeleton */}
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div key={i} className="space-y-2">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-10 w-full" />
                                            </div>
                                        ))}
                                        {/* Button skeleton */}
                                        <Skeleton className="h-12 w-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right: Order Summary Skeleton */}
                        <div className="order-1 lg:order-2">
                            <Card className="lg:sticky lg:top-32">
                                <CardHeader>
                                    <Skeleton className="h-6 w-32" />
                                </CardHeader>
                                <CardContent>
                                    {/* Cart items skeleton */}
                                    <div className="mb-6 space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="flex items-center space-x-4 rounded-lg border bg-muted/30 p-3">
                                                <Skeleton className="h-16 w-16 rounded-md" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-3/4" />
                                                    <Skeleton className="h-3 w-1/2" />
                                                </div>
                                                <Skeleton className="h-5 w-16" />
                                            </div>
                                        ))}
                                    </div>

                                    <Separator className="my-4" />

                                    {/* Price breakdown skeleton */}
                                    <div className="space-y-3">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex justify-between">
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-4 w-16" />
                                            </div>
                                        ))}
                                        <Separator />
                                        <div className="flex justify-between">
                                            <Skeleton className="h-6 w-16" />
                                            <Skeleton className="h-6 w-20" />
                                        </div>
                                    </div>

                                    {/* Security notice skeleton */}
                                    <div className="mt-4">
                                        <Skeleton className="h-12 w-full rounded-lg" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Navigation buttons skeleton */}
                    <div className="mt-8 flex flex-col md:flex-row justify-center gap-4">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-10 w-48" />
                    </div>
                </motion.div>
            ) : !cartIsValid ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center min-h-100">
                    <ShoppingCart className="h-24 w-24 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('redirectingToShop')}</p>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}> 
                    <div className="flex flex-col gap-4 mb-6">
                    <h1 className="text-3xl font-bold flex flex-nowrap items-center gap-4">
                        <Link href="/cart" className="hover:text-primary transition-colors duration-200">
                            <CircleChevronLeft className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-200" />
                        </Link>
                        {t('checkoutTitle')}
                    </h1> 
                    </div> 

                    {totalItems === 0 ? (
                        <Card className="mx-auto max-w-md">
                            <CardContent className="py-12 text-center">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}>
                                    <ShoppingCart className="mx-auto mb-6 h-24 w-24 text-muted-foreground" />
                                    <CardTitle className="mb-2 text-2xl">{t('emptyCartTitle')}</CardTitle>
                                    <CardDescription className="mb-6">{t('emptyCartMessage')}</CardDescription>
                                    <Button asChild>
                                        <Link href="/shop">
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            {t('continueShopping')}
                                        </Link>
                                    </Button>
                                </motion.div>
                            </CardContent>
                        </Card>
                    ) : (
                        <motion.div className="grid gap-8 lg:grid-cols-2">
                            {/* Left: Payment Form */}
                            <motion.div className="order-2 lg:order-1 w-full">
                                <Card>
                                    <CardContent>
                                        {stripeOptions && stripePromise && stripeReady ? (
                                            <Elements stripe={stripePromise} options={stripeOptions}>
                                                <PaymentForm
                                                    user={user}
                                                    isAuthenticated={isAuthenticated}
                                                    cartTotal={totalPrice}
                                                    subTotal={subTotal}
                                                    shippingCost={finalShippingCost}
                                                    onShippingUpdate={handleShippingUpdate}
                                                    selectedShippingMethod={selectedShippingMethod}
                                                    isEligibleForFreeShipping={isEligibleForFreeShipping}
                                                    storeSettings={storeSettings}
                                                    hasStripe={true}
                                                />
                                            </Elements>
                                        ) : (
                                            <PaymentForm
                                                user={user}
                                                isAuthenticated={isAuthenticated}
                                                cartTotal={totalPrice}
                                                subTotal={subTotal}
                                                shippingCost={finalShippingCost}
                                                onShippingUpdate={handleShippingUpdate}
                                                selectedShippingMethod={selectedShippingMethod}
                                                isEligibleForFreeShipping={isEligibleForFreeShipping}
                                                storeSettings={storeSettings}
                                                hasStripe={false}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Right: Order Summary */}
                            <motion.div
                                className="order-1 lg:order-2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}>
                                <Card className="lg:sticky lg:top-32">
                                    <CardHeader
                                        className="cursor-pointer lg:cursor-default"
                                        onClick={() => {
                                            // Only allow toggle on small devices
                                            if (window.innerWidth < 1024) {
                                                setIsOrderSummaryExpanded(!isOrderSummaryExpanded);
                                            }
                                        }}>
                                        <div className="flex items-center justify-between">
                                            <h2 className="font-semibold text-lg">{t('orderSummary')}</h2>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="lg:hidden"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsOrderSummaryExpanded(!isOrderSummaryExpanded);
                                                }}>
                                                {isOrderSummaryExpanded ? (
                                                    <ChevronUp className="h-5 w-5" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5" />
                                                )}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className={`${isOrderSummaryExpanded ? 'block' : 'hidden'} lg:block`}>
                                        {/* Items */}
                                        <div className="mb-6 space-y-4">
                                            {items.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    className="flex items-center space-x-4 rounded-lg border bg-muted/30 p-3"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}>
                                                    {item.image && (
                                                        <Image
                                                            width={64}
                                                            height={64}
                                                            src={item.image}
                                                            alt={item.name}
                                                            loading="lazy"
                                                            priority={false}
                                                            className="h-16 w-16 rounded-md border object-cover"
                                                        />
                                                    )}
                                                    <div className="flex-1">
                                                        <h3 className="font-medium">{item.name}</h3>
                                                        {/* Quantity already shown in item.name details
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <Badge variant="outline">
                                                            {t('quantity')}: {item.quantity}
                                                        </Badge>
                                                    </div> 
                                                    */}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold">
                                                            {Number(item.price * item.quantity).toFixed(2)}
                                                            {storeSettings?.currency === 'USD' ? '$' : '€'}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        <Separator className="my-4" />

                                        {/* Price Breakdown */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>{t('subtotal')}</span>
                                                <span>
                                                    {Number(cartTotal).toFixed(2)}
                                                    {storeSettings?.currency === 'USD' ? '$' : '€'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span className="flex items-center">{t('shipping')}</span>
                                                <span>
                                                    {selectedShippingMethod ? (
                                                        finalShippingCost === 0 ? (
                                                            <Badge variant="secondary" className="text-green-600">
                                                                {t('free')}
                                                            </Badge>
                                                        ) : (
                                                            <>
                                                                {Number(finalShippingCost).toFixed(2)}
                                                                {storeSettings?.currency === 'USD' ? '$' : '€'}
                                                            </>
                                                        )
                                                    ) : (
                                                        <>-</>
                                                    )}
                                                </span>
                                            </div>
                                            {selectedShippingMethod && (
                                                <div className="flex justify-between text-muted-foreground text-sm">
                                                    <span>via {selectedShippingMethod.carrier_name}</span>
                                                    <span>
                                                        {selectedShippingMethod.delivery_time}-
                                                        {selectedShippingMethod.delivery_estimated}{' '}
                                                        {selectedShippingMethod.delivery_estimated === 1
                                                            ? t('day')
                                                            : t('days')}
                                                        *
                                                    </span>
                                                </div>
                                            )}

                                            {discountAmount > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>Discount</span>
                                                    <span>
                                                        -{discountAmount.toFixed(2)}
                                                        {storeSettings?.currency === 'USD' ? '$' : '€'}
                                                    </span>
                                                </div>
                                            )}

                                            {storeSettings?.vatEnabled && (
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>TVA ({storeSettings.vatPercentage}%)</span>
                                                    {storeSettings.vatIncludedInPrice ? (
                                                        <Badge variant="outline" className="text-green-600">
                                                            {t('included')}
                                                        </Badge>
                                                    ) : (
                                                        <span>
                                                            {Number(vatInfo.vatAmount).toFixed(2)}
                                                            {storeSettings?.currency === 'USD' ? '$' : '€'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <Separator />

                                            <div className="flex justify-between font-bold text-lg">
                                                <span>{t('total')}</span>
                                                <span>
                                                    {totalPrice}
                                                    {storeSettings?.currency === 'USD' ? '$' : '€'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Security Notice */}
                                        <div className="mt-4 p-2 bg-background/50 rounded-lg border">
                                            <div className="flex items-start space-x-2 text-accent-foreground text-sm">
                                                <Lock className="h-4 w-4" />
                                                <span className="text-xs md:text-sm text-muted-foreground">
                                                    {t('securePayment')}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Navigation Links */}
                    <motion.div
                        className="mt-8 flex flex-col md:flex-row justify-center gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}>
                        <Button variant="ghost" asChild>
                            <Link href="/shop">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('continueShopping')}
                            </Link>
                        </Button>
                        {totalItems > 0 && (
                            <Button variant="outline" asChild>
                                <Link href="/cart">
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    {t('modifyCart')}
                                </Link>
                            </Button>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default CheckoutPageClient;
