// @/app/(frontend)/cart/checkout/success/page.client.jsx

'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Download, Home, Share2, ShoppingBag, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useCart } from 'react-use-cart';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSettings } from '@/context/providers';
import { checkPending } from '@/lib/server/gateways.js';
import { trackOrder, updateOrderStatus } from '@/lib/server/orders.js';
import { generatePDF } from '@/utils/generatePDF.js';

const CheckoutSuccessPageClient = ({
    initialOrderDetails,
    initialError,
    orderId,
    paymentMethod,
    eupagoMethod,
    eupagoReference,
    eupagoEntity,
    eupagoAmount
}) => {
    const t = useTranslations('Checkout');
    const locale = useLocale();
    const router = useRouter();
    const { emptyCart } = useCart();
    const { storeSettings } = useSettings();
    const { theme, resolvedTheme } = useTheme();

    // Order details from server component
    const [orderDetails, setOrderDetails] = useState(initialOrderDetails);
    const [error, setError] = useState(initialError);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [paymentExpired, setPaymentExpired] = useState(false);
    // Initialize paymentVerified based on initial order details
    const [paymentVerified, setPaymentVerified] = useState(initialOrderDetails?.paymentStatus === 'paid' || false);
    const [isPolling, setIsPolling] = useState(false);
    // Initialize orderCancelled based on initial order details
    const [orderCancelled, setOrderCancelled] = useState(initialOrderDetails?.status === 'cancelled' || false);
    const pollingIntervalRef = useRef(null);
    const [mounted, setMounted] = useState(false); // For theme hydration safety
    const [hasAccess, setHasAccess] = useState(false); // Track order access permission

    const euPagoMethodImgs = {
        mbway_dark: '/images/mbway_dark.webp',
        mb_dark: '/images/multibanco_dark.webp',
        mbway: '/images/mbway.webp',
        mb: '/images/multibanco.webp'
    };

    // Handle mounting state for theme (prevents hydration mismatch)
    useEffect(() => setMounted(true), []);

    // Update states when initial order details change (e.g., from server updates)
    useEffect(() => {
        if (initialOrderDetails) {
            setOrderDetails(initialOrderDetails);
            setPaymentVerified(initialOrderDetails.paymentStatus === 'paid');
            setOrderCancelled(initialOrderDetails.status === 'cancelled');
        }
    }, [initialOrderDetails]);

    // Validate order access on mount
    useEffect(() => {
        if (!orderId) {
            setHasAccess(false);
            setError('Order ID missing');
            return;
        }

        // Check localStorage for order access token
        try {
            const storedToken = localStorage.getItem('order_access_' + orderId);

            if (!storedToken) {
                setHasAccess(false);
                setError('Acesso não autorizado. Esta encomenda não te pertence.');
                return;
            }

            const accessToken = JSON.parse(storedToken);
            const now = Date.now();
            const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
            const oneDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
            const tokenAge = now - accessToken.timestamp;

            // Check if token is expired (max 1 day, recommended 4 hours)
            if (tokenAge > oneDay) {
                // Absolute expiration - remove token
                localStorage.removeItem('order_access_' + orderId);
                setHasAccess(false);
                setError('Acesso à encomenda expirou. Contacta o suporte se precisares de ajuda.');
                return;
            }

            // Check if orderId matches
            if (accessToken.orderId !== orderId) {
                setHasAccess(false);
                setError('Acesso não autorizado. ID da encomenda não corresponde.');
                return;
            }

            // Access granted
            setHasAccess(true);

            // Clean up expired tokens from localStorage (optional maintenance)
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith('order_access_')) {
                    try {
                        const token = JSON.parse(localStorage.getItem(key));
                        if (Date.now() - token.timestamp > oneDay) {
                            localStorage.removeItem(key);
                        }
                    } catch (e) {
                        // Remove invalid tokens
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (e) {
            console.error('Access validation error:', e);
            setHasAccess(false);
            setError('Falha ao validar acesso à encomenda.');
        }
    }, [orderId]);

    // Clear cart on mount (only once) - after access validation
    useEffect(() => {
        if (hasAccess && orderDetails && !error) {
            emptyCart();
            localStorage.removeItem('orderData');
        }
    }, [hasAccess, orderDetails, error, emptyCart]);

    // Handle mounting state for theme (prevents hydration mismatch)
    useEffect(() => setMounted(true), []);

    // Initialize MB WAY countdown timer
    useEffect(() => {
        if (paymentMethod === 'eupago' && eupagoMethod === 'mbway' && orderDetails) {
            // Use order.expiryTime or fallback to 5 minutes from creation time
            let expiryTime;

            if (orderDetails.expiryTime) {
                expiryTime = new Date(orderDetails.expiryTime).getTime();
            } else if (orderDetails.mbwayExpiryTime) {
                expiryTime = new Date(orderDetails.mbwayExpiryTime).getTime();
            } else {
                // Fallback: 5 minutes from order creation time
                const createdAt = new Date(orderDetails.createdAt || orderDetails.created_at || Date.now());
                expiryTime = createdAt.getTime() + 5 * 60 * 1000; // 5 minutes
            }

            const now = Date.now();
            const remaining = Math.max(0, expiryTime - now);

            if (remaining > 0) {
                setTimeRemaining(Math.floor(remaining / 1000));
            } else {
                setPaymentExpired(true);
            }
        }
    }, [paymentMethod, eupagoMethod, orderDetails]);

    // Countdown timer for MB WAY payments
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    setPaymentExpired(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    // Poll order status for MB WAY payments
    useEffect(() => {
        // Don't poll if not mbway payment or if already in final state
        if (paymentMethod !== 'eupago' || eupagoMethod !== 'mbway') return;
        if (paymentVerified || orderCancelled || !orderDetails) return;

        // Don't start multiple polling sessions
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        setIsPolling(true);

        // Poll every 5 seconds for MB WAY payments using checkPending function
        const pollPaymentStatus = async () => {
            try {
                // Check if payment has expired based on time remaining first
                if (timeRemaining !== null && timeRemaining <= 0 && !paymentExpired) {
                    // Final check before cancelling - use checkPending to verify payment status
                    await checkPending();

                    // Also check current order status
                    const orderResult = await trackOrder(
                        orderId,
                        orderDetails.customer?.email || orderDetails.cst_email || orderDetails.email
                    );

                    if (orderResult.success && orderResult.data && orderResult.data.paymentStatus === 'paid') {
                        // Payment was confirmed in the final check
                        setPaymentVerified(true);
                        setIsPolling(false);

                        const completeOrderDetails = {
                            ...orderDetails,
                            ...orderResult.data,
                            paymentStatus: 'paid',
                            status: orderResult.data.status || 'processing',
                            paidAt: orderResult.data.paidAt || new Date().toISOString(),
                            updatedAt: orderResult.data.updatedAt || new Date().toISOString()
                        };

                        setOrderDetails(completeOrderDetails);

                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }

                        toast.success(t('paymentConfirmedSuccess') || 'Payment confirmed successfully!');
                        return;
                    }

                    // Payment still not confirmed after timeout, cancel the order

                    try {
                        // Update order status to cancelled
                        await updateOrderStatus(
                            orderId,
                            'cancelled',
                            orderDetails.customer?.email || orderDetails.cst_email || orderDetails.email || 'system',
                            orderDetails.customer?.email || orderDetails.cst_email || orderDetails.email
                        );
                    } catch (updateError) {
                        console.error('Error updating order status to cancelled:', updateError);
                    }

                    setPaymentExpired(true);
                    setOrderCancelled(true);
                    setIsPolling(false);

                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }

                    toast.error(t('paymentExpired') || 'Payment time has expired');
                    return;
                }

                // Use checkPending from gateways to check EuPago payment status
                const pendingResult = await checkPending();

                if (pendingResult.success) {
                    // Also check current order status
                    const orderResult = await trackOrder(
                        orderId,
                        orderDetails.customer?.email || orderDetails.cst_email || orderDetails.email
                    );

                    if (orderResult.success && orderResult.data) {
                        const updatedOrder = orderResult.data;

                        // Check if payment status changed to paid
                        if (updatedOrder.paymentStatus === 'paid') {
                            setPaymentVerified(true);
                            setIsPolling(false);

                            // Update order details with complete fresh data from database
                            const completeOrderDetails = {
                                ...orderDetails,
                                ...updatedOrder,
                                paymentStatus: 'paid',
                                status: updatedOrder.status || 'processing',
                                paidAt: updatedOrder.paidAt || new Date().toISOString(),
                                updatedAt: updatedOrder.updatedAt || new Date().toISOString()
                            };

                            setOrderDetails(completeOrderDetails);

                            if (pollingIntervalRef.current) {
                                clearInterval(pollingIntervalRef.current);
                                pollingIntervalRef.current = null;
                            }

                            toast.success(t('paymentConfirmedSuccess') || 'Payment confirmed successfully!');
                            return;
                        }

                        // Check if order was cancelled or expired
                        if (updatedOrder.status === 'cancelled') {
                            setOrderCancelled(true);
                            setPaymentExpired(true);
                            setIsPolling(false);

                            if (pollingIntervalRef.current) {
                                clearInterval(pollingIntervalRef.current);
                                pollingIntervalRef.current = null;
                            }
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error('Error polling payment status:', error);
                // Don't stop polling on fetch errors, continue trying
            }
        };

        // Start polling every 5 seconds for MB WAY payments
        pollingIntervalRef.current = setInterval(pollPaymentStatus, 5000);

        // Initial poll
        pollPaymentStatus();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            setIsPolling(false);
        };
    }, [paymentMethod, eupagoMethod, paymentVerified, orderCancelled, orderDetails?.id, orderId]); // Simplified dependencies

    // Format countdown time (MM:SS)
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleContinue = () => {
        router.push('/shop');
    };

    const _handleViewOrders = () => {
        router.push('/account');
    };

    const downloadReceipt = () => {
        if (!orderDetails) return;

        // Check if payment is pending
        if (orderDetails.paymentStatus === 'pending') {
            toast.error(
                t('paymentPendingCannotDownload') || 'Payment is pending. Complete payment to download receipt.'
            );
            return;
        }

        // Pass order object directly to generatePDF like admin orders page does
        // The order object already has the correct structure from the database
        generatePDF(orderDetails, storeSettings, locale);
    };

    const handleShare = async (paymentType) => {
        if (!navigator.share) {
            // Fallback: copy to clipboard
            const text = getShareText(paymentType);
            await navigator.clipboard.writeText(text);
            alert('Detalhes copiados para a área de transferência!');
            return;
        }

        try {
            await navigator.share({
                title: 'Detalhes de Pagamento',
                text: getShareText(paymentType)
            });
        } catch (err) {
            // User cancelled or error occurred
            console.log('Share cancelled or failed:', err);
        }
    };

    const getShareText = (paymentType) => {
        if (paymentType === 'bank_transfer') {
            return `Detalhes de Transferência Bancária\n\nEncomenda: ${orderDetails.orderId}\nMontante: ${parseFloat(orderDetails.total || 0).toFixed(2)}€\n\nPara completar o pagamento, faz uma transferência bancária com estes dados. Vê os detalhes completos na página da encomenda.`;
        } else if (paymentType === 'multibanco') {
            return `Detalhes Multibanco\n\nEncomenda: ${orderDetails.orderId}\nEntidade: ${eupagoEntity}\nReferência: ${eupagoReference}\nMontante: ${parseFloat(eupagoAmount).toFixed(2)}€\n\nPaga através de qualquer caixa ATM ou homebanking.`;
        }
        return '';
    };

    const formatPaymentMethod = (method) => {
        const methods = {
            stripe: t('stripe') || 'Credit/Debit Card',
            card: t('stripe') || 'Credit/Debit Card',
            bank_transfer: t('bankTransfer') || 'Bank Transfer',
            pay_on_delivery: t('payOnDelivery') || 'Pay on Delivery',
            cash: t('cash') || 'Cash',
            crypto: t('crypto') || 'Cryptocurrency',
            eupago: t('eupago') || 'EuPago (Multibanco/MB WAY)',
            eupago_mbway: t('mbway') || 'MB WAY',
            eupago_mb: t('multibanco') || 'Multibanco',
            none: t('pending') || 'Pending'
        };
        return methods[method] || method;
    };

    // If access is denied, show error message
    if (!hasAccess && orderId) {
        return (
            <div className="min-h-screen pb-12 pt-24">
                <div className="container mx-auto px-4">
                    <div className="mx-auto max-w-3xl">
                        <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
                            <div className="mb-4 flex justify-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
                                    <svg
                                        className="h-8 w-8 text-destructive"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                </div>
                            </div>
                            <h1 className="mb-2 text-2xl font-bold text-destructive">{t('accessDenied')}</h1>
                            <p className="mb-6 text-muted-foreground">{error || t('noPermissionViewOrder')}</p>
                            <button
                                onClick={() => router.push('/')}
                                className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                                {t('backToHome')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto min-h-screen px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mx-auto max-w-4xl">
                {/* Success Icon */}
                <div className="mb-8 text-center">
                    {error || orderCancelled ? (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-brrom-red-500 to-red-600 shadow-lg shadow-red-500/50 text-white">
                            <XCircle className="h-12 w-12" />
                        </motion.div>
                    ) : paymentMethod === 'eupago' && eupagoMethod === 'mbway' && paymentExpired && !paymentVerified ? (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50 text-white">
                            <XCircle className="h-12 w-12" />
                        </motion.div>
                    ) : paymentMethod === 'eupago' &&
                      (eupagoMethod === 'mbway' || eupagoMethod === 'mb') &&
                      !paymentVerified ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-orange-400 to-orange-800 shadow-lg shadow-orange-400/50">
                            <div className="payment-loader">
                                <div className="pad">
                                    <div className="chip"></div>
                                    <div className="line line1"></div>
                                    <div className="line line2"></div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/50 text-white">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                                <CheckCircle className="h-12 w-12" />
                            </motion.div>
                        </motion.div>
                    )}

                    <h1 className="mb-4 bg-linear-to-r from-foreground to-foreground/70 bg-clip-text font-bold text-4xl text-transparent sm:text-5xl">
                        {error ? (
                            <span>{error}</span>
                        ) : orderCancelled ? (
                            <span>{t('orderCancelled')}</span>
                        ) : paymentMethod === 'eupago' &&
                          eupagoMethod === 'mbway' &&
                          paymentExpired &&
                          !paymentVerified ? (
                            <span>{t('paymentExpired')}</span>
                        ) : paymentMethod === 'eupago' &&
                          (eupagoMethod === 'mbway' || eupagoMethod === 'mb') &&
                          !paymentVerified ? (
                            <span>{t('orderPending')}</span>
                        ) : (
                            <span>{t('paymentSuccessTitle')}</span>
                        )}
                    </h1>

                    {!error && !orderCancelled && (
                        <>
                            <p className="mb-4 text-muted-foreground text-xl">
                                {paymentMethod === 'eupago' &&
                                eupagoMethod === 'mbway' &&
                                paymentExpired &&
                                !paymentVerified
                                    ? t('mbwayExpiredMessage')
                                    : paymentMethod === 'eupago' && eupagoMethod === 'mbway' && !paymentVerified
                                      ? t('mbwayConfirmMessage')
                                      : paymentMethod === 'eupago' && eupagoMethod === 'mb' && !paymentVerified
                                        ? t('multibancoConfirmMessage')
                                        : t('paymentSuccessMessage')}
                            </p>
                            {paymentMethod === 'bank_transfer' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="mb-4 rounded-xl border border-blue-200 bg-linear-to-br from-blue-50 to-blue-100/50 p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-blue-900 text-sm flex-1">
                                            <strong>{t('bankTransfer')}:</strong> {t('bankTransferPayment')}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleShare('bank_transfer')}
                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100 shrink-0"
                                            title={t('sharePaymentDetails')}>
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                            {paymentMethod === 'pay_on_delivery' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="mb-4 rounded-xl border border-green-200 bg-linear-to-br from-green-50 to-green-100/50 p-4 shadow-sm">
                                    <p className="text-green-900 text-sm">
                                        <strong>{t('payOnDelivery')}:</strong> {t('payOnDeliveryPayment')}
                                    </p>
                                </motion.div>
                            )}
                            {paymentMethod === 'eupago' && eupagoMethod && !paymentVerified && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="mb-4 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                                    {/* Payment Method Logo */}
                                    <div className="flex items-center justify-center py-4 bg-muted/30">
                                        <img
                                            src={
                                                eupagoMethod === 'mbway'
                                                    ? resolvedTheme === 'dark'
                                                        ? euPagoMethodImgs.mbway_dark
                                                        : euPagoMethodImgs.mbway
                                                    : resolvedTheme === 'dark'
                                                      ? euPagoMethodImgs.mb_dark
                                                      : euPagoMethodImgs.mb
                                            }
                                            alt={eupagoMethod === 'mbway' ? 'MB WAY' : 'Multibanco'}
                                            className="h-12 w-auto object-contain"
                                        />
                                    </div>
                                    <div className="p-5">
                                        {eupagoMethod === 'mbway' ? (
                                            <div>
                                                {orderCancelled ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="mb-4 rounded-lg border border-red-300 bg-linear-to-br from-red-50 to-red-100 p-4 shadow-sm text-red-900">
                                                        <p className="font-semibold flex items-center gap-2 text-lg mb-2">
                                                            <span className="text-xl">❌</span>{' '}
                                                            {t('orderCancelledTitle')}
                                                        </p>
                                                        <p className="text-sm mt-1">{t('orderCancelledMessage')}</p>
                                                        <p className="text-sm mt-2 font-semibold">
                                                            {t('placeNewOrder')}
                                                        </p>
                                                    </motion.div>
                                                ) : paymentExpired ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="mb-4">
                                                        <p className="font-semibold flex items-center justify-center gap-2 text-lg">
                                                            {t('paymentTimeExpired')}
                                                        </p>
                                                        <p className="text-sm text-foreground mt-1">
                                                            {t('mbwayExpiredMessage')}
                                                        </p>
                                                    </motion.div>
                                                ) : timeRemaining !== null ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="mb-4 overflow-hidden">
                                                        <div className="flex items-center justify-between p-4">
                                                            <span className="font-semibold text-xl">
                                                                {t('timeRemaining')}:
                                                            </span>
                                                            <motion.span className="rounded-lg bg-white px-4 py-2 font-mono font-bold text-3xl text-blue-600 shadow-inner">
                                                                {formatTime(timeRemaining)}
                                                            </motion.span>
                                                        </div>
                                                        <div className="bg-blue-600 px-4 py-2 rounded">
                                                            <p className="text-white text-xs font-medium">
                                                                {t('approvePaymentWarning')}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                ) : null}

                                                {!paymentExpired && (
                                                    <>
                                                        <p className="text-sm mb-4 text-muted-foreground">
                                                            {t('mbwayPaymentSent')}
                                                        </p>
                                                        <div className="space-y-3 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-2">
                                                            <div className="flex-1 rounded-lg bg-muted/50 p-3 h-full">
                                                                <p className="text-xs text-muted-foreground mb-1">
                                                                    {t('reference')}
                                                                </p>
                                                                <span className="font-mono bg-white text-dark px-3 py-2 rounded border text-lg font-bold inline-block">
                                                                    {eupagoReference}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 rounded-lg bg-muted/50 p-3 h-full">
                                                                <p className="text-xs text-muted-foreground mb-1">
                                                                    {t('amount')}
                                                                </p>
                                                                <span className="text-2xl font-bold text-foreground">
                                                                    {parseFloat(eupagoAmount).toFixed(2)}€
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="rounded-lg border bg-muted/30 p-4 text-xs space-y-2">
                                                            <p className="font-semibold text-sm mb-3">
                                                                {t('howToCompletePayment')}
                                                            </p>
                                                            <p className="flex items-start gap-2">
                                                                <span className="font-bold text-primary">1.</span>{' '}
                                                                {t('mbwayStep1')}
                                                            </p>
                                                            <p className="flex items-start gap-2">
                                                                <span className="font-bold text-primary">2.</span>{' '}
                                                                {t('mbwayStep2')}
                                                            </p>
                                                            <p className="flex items-start gap-2">
                                                                <span className="font-bold text-primary">3.</span>{' '}
                                                                {t('mbwayStep3')}
                                                            </p>
                                                            <p className="flex items-start gap-2">
                                                                <span className="font-bold text-primary">4.</span>{' '}
                                                                {t('mbwayStep4')}
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : eupagoMethod === 'mb' ? (
                                            <div>
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <h3 className="font-semibold text-base flex-1">
                                                        {t('paymentDetails')}
                                                    </h3>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleShare('multibanco')}
                                                        className="h-8 w-8 text-primary hover:text-primary/90 hover:bg-muted shrink-0"
                                                        title={t('sharePaymentDetails')}>
                                                        <Share2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-3 mb-4">
                                                    <p>
                                                        <strong>{t('entity')}:</strong>{' '}
                                                        <span className="font-mono bg-white text-dark px-2 py-1 rounded">
                                                            {eupagoEntity}
                                                        </span>
                                                    </p>
                                                    <p>
                                                        <strong>{t('reference')}:</strong>{' '}
                                                        <span className="font-mono bg-white text-dark px-2 py-1 rounded">
                                                            {eupagoReference}
                                                        </span>
                                                    </p>
                                                    <p>
                                                        <strong>{t('amount')}:</strong>{' '}
                                                        {parseFloat(eupagoAmount).toFixed(2)}€
                                                    </p>
                                                </div>
                                                <div className="mt-3 text-xs space-y-1">
                                                    <p>{t('multibancoStep1')}</p>
                                                    <p>{t('multibancoStep2')}</p>
                                                    <p>{t('multibancoStep3')}</p>
                                                    <p>{t('multibancoStep4')}</p>
                                                    <p>{t('multibancoStep5')}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm text-muted-foreground">
                                                    <strong>{t('eupagoPayment')}</strong>{' '}
                                                    {t('eupagoPaymentInstructions')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}
                </div>

                {error || orderCancelled ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}>
                        <Card className="border-destructive/50 bg-linear-to-br from-destructive/5 to-destructive/10 shadow-lg">
                            <CardContent className="pt-6 text-center">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                    <Button
                                        onClick={handleContinue}
                                        size="lg"
                                        className="shadow-md hover:shadow-lg transition-shadow">
                                        <Home className="mr-2 h-5 w-5" />
                                        {orderCancelled ? t('returnToShop') : t('backToHome')}
                                    </Button>
                                </motion.div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    orderDetails &&
                    orderDetails.paymentStatus !== 'pending' &&
                    (paymentMethod !== 'eupago' ||
                        eupagoMethod === 'mb' ||
                        (eupagoMethod === 'mbway' && paymentVerified)) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-8 overflow-hidden">
                            <div className="py-2">
                                <h2 className="mb-2 font-semibold text-2xl text-center">{t('orderDetailsTitle')}</h2>
                                <p className="text-center text-muted-foreground">
                                    {t('orderNumber')}:{' '}
                                    <span className="font-mono font-bold text-foreground">{orderDetails.orderId}</span>
                                </p>
                                <p className="text-center text-muted-foreground text-sm">
                                    {t('orderDate')}: {orderDetails.orderDate}
                                </p>
                            </div>

                            <div className="relative">
                                {/* Customer Information */}
                                <div className="mb-6 rounded-xl bg-linear-to-br from-muted/60 to-muted/30 p-5 shadow-sm border">
                                    <h3 className="mb-4 font-semibold text-lg flex items-center gap-2">
                                        {t('customerInformation')}
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <p className="flex items-center gap-2">
                                            <strong className="min-w-20">{t('name')}:</strong>
                                            <span className="text-muted-foreground">{orderDetails.customerName}</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <strong className="min-w-20">{t('email')}:</strong>
                                            <span className="text-muted-foreground">{orderDetails.email}</span>
                                        </p>
                                        {orderDetails.paymentMethod && (
                                            <p className="flex items-center gap-2">
                                                <strong className="min-w-20">{t('paymentMethod')}:</strong>
                                                <span className="text-muted-foreground">
                                                    {formatPaymentMethod(orderDetails.paymentMethod)}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="mb-6">
                                    <h3 className="mb-4 font-semibold text-lg flex items-center gap-2">
                                        {t('orderedItems')}
                                    </h3>
                                    <div className="space-y-3">
                                        {orderDetails.items.map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 * i }}
                                                className="flex items-center justify-between rounded-xl border bg-linear-to-br from-muted/40 to-muted/20 p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4 flex-1">
                                                    {item.image && (
                                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm">
                                                            <Image
                                                                src={item.image}
                                                                alt={item.name}
                                                                width={64}
                                                                height={64}
                                                                unoptimized={true}
                                                                loading="lazy"
                                                                priority={false}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm truncate">{item.name}</p>
                                                        {/* Service-specific details */}
                                                        {item.type === 'service' && item.appointment && (
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                <div>
                                                                    <strong>Appointment:</strong>{' '}
                                                                    {item.appointment.date ||
                                                                        item.appointment.startDate ||
                                                                        ''}{' '}
                                                                    {item.appointment.time ||
                                                                        item.appointment.startTime ||
                                                                        ''}
                                                                </div>
                                                                {item.deliveryMethod && (
                                                                    <div>
                                                                        <strong>Delivery:</strong> {item.deliveryMethod}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    <p className="font-bold text-lg text-right">
                                                        {(item.price * item.quantity).toFixed(2)}
                                                        {orderDetails.currency === 'USD' ? '$' : '€'}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Order Summary */}
                                <div className="rounded-xl border-2 border-primary/20 bg-linear-to-br from-primary/5 to-transparent p-6 shadow-sm">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>{t('subtotal')}</span>
                                            <span className="font-medium">
                                                {parseFloat(orderDetails.subtotal || 0).toFixed(2)}
                                                {orderDetails.currency === 'USD' ? '$' : '€'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>{t('shipping')}</span>
                                            <span>
                                                {parseFloat(orderDetails.shipping || 0) === 0 ? (
                                                    <span className="font-bold text-green-600">{t('free')}</span>
                                                ) : (
                                                    <span className="font-medium">
                                                        {parseFloat(orderDetails.shipping || 0).toFixed(2)}
                                                        {orderDetails.currency === 'USD' ? '$' : '€'}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        {orderDetails.discountAmount > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span className="font-medium">{t('discount')}</span>
                                                <span className="font-bold">
                                                    - {parseFloat(orderDetails.discountAmount).toFixed(2)}
                                                    {orderDetails.currency === 'USD' ? '$' : '€'}
                                                </span>
                                            </div>
                                        )}
                                        {storeSettings.vatEnabled && (
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>
                                                    {t('vat')} ({storeSettings.vatPercentage || 20}%)
                                                </span>
                                                <span>
                                                    {orderDetails.vatIncluded ? (
                                                        <span className="font-bold text-green-600">
                                                            {t('included')}
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium">
                                                            {parseFloat(orderDetails.vatAmount || 0).toFixed(2)}
                                                            {orderDetails.currency === 'USD' ? '$' : '€'}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-t border-border pt-4 font-bold text-xl">
                                            <span>{t('total')}</span>
                                            <span className="text-primary">
                                                {parseFloat(orderDetails.total || 0).toFixed(2)}
                                                {orderDetails.currency === 'USD' ? '$' : '€'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )
                )}

                {/* Action Buttons */}
                {!error &&
                    !orderCancelled &&
                    orderDetails &&
                    orderDetails.paymentStatus !== 'pending' &&
                    (paymentMethod !== 'eupago' ||
                        eupagoMethod === 'mb' ||
                        (eupagoMethod === 'mbway' && paymentVerified)) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleContinue}
                                className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all">
                                <ShoppingBag className="mr-2 h-5 w-5" />
                                {t('continueShopping')}
                            </Button>
                            <Button
                                size="lg"
                                onClick={downloadReceipt}
                                className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all bg-linear-to-r from-primary to-primary/90">
                                <Download className="mr-2 h-5 w-5" />
                                {t('downloadReceipt')}
                            </Button>
                        </motion.div>
                    )}

                {/* Payment Verification Message */}
                {!error &&
                    !orderCancelled &&
                    orderDetails &&
                    paymentMethod === 'eupago' &&
                    eupagoMethod === 'mbway' &&
                    !paymentVerified &&
                    !paymentExpired && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-8">
                            <Card className="border border-border shadow-lg">
                                <CardContent className="pt-6">
                                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                                        <LoadingSpinner />
                                        <div>
                                            <p className="font-semibold text-lg mb-2">
                                                {t('waitingPaymentConfirmation')}
                                            </p>
                                            <p className="text-muted-foreground text-sm">{t('mbwayApproveMessage')}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                {/* Back to Shop Link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-8 text-center">
                    <Button variant="ghost" asChild className="hover:bg-muted/50 transition-colors">
                        <Link href="/shop">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('backToShop')}
                        </Link>
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default CheckoutSuccessPageClient;
