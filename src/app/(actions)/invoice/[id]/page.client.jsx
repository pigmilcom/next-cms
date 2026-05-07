'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AlertCircle, CheckCircle2, CreditCard, Download, Loader2, MapPinned, Package, Printer, ShieldCheck, Landmark, Truck, WalletMinimal } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSelector } from '@/components/ui/language-selector';
import { PhoneInput } from '@/components/ui/phone-input';
import { ThemeSwitchButton } from '@/components/ui/theme-mode';
import { useTheme } from '@/context/providers';
import { useSettings } from '@/context/providers';
import { formatAvailableLanguages, getCountryName } from '@/lib/i18n.js';
import { confirmOrderPayment, createEuPagoReference, createStripePaymentIntent } from '@/lib/server/gateways.js';
import { updateOrder } from '@/lib/server/orders.js';
import { generatePDF } from '@/utils/generatePDF.js';
import { printInvoicePdf } from '@/utils/printInvoicePdf.js';
import ShippingMethodSelector from '../../cart/checkout/ShippingMethodSelector.jsx';

let stripePromise = null;

const createInvoiceTranslator = (translations) => (key) => {
    const keys = String(key || '').split('.');
    let value = translations;

    for (const item of keys) {
        value = value?.[item];
        if (value === undefined) {
            return key;
        }
    }

    return value;
};

const formatCurrency = (value, currency = 'EUR') => {
    const amount = parseFloat(value || 0) || 0;
    const locale = currency === 'EUR' ? 'fr-FR' : currency === 'USD' ? 'en-US' : 'en-GB';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: String(currency || 'EUR').toUpperCase()
    }).format(amount);
};

const formatDate = (value, locale = 'en') => {
    if (!value) {
        return new Date().toLocaleDateString(locale);
    }

    const date =
        typeof value === 'number'
            ? new Date(value > 1000000000000 ? value : value * 1000)
            : new Date(value);

    return date.toLocaleDateString(locale);
};

const formatOrderStatus = (status, t) => {
    const statusMap = {
        pending: t('statusLabels.pending'),
        paid: t('statusLabels.paid'),
        failed: t('statusLabels.failed'),
        cancelled: t('statusLabels.cancelled')
    };

    return statusMap[status] || status || t('statusLabels.pending');
};

const buildOrderAccessToken = (orderId) => ({
    orderId,
    timestamp: Date.now(),
    expiresAt: Date.now() + 4 * 60 * 60 * 1000
});

const getShippingMethodCost = (method) =>
    parseFloat(method?.fixed_rate || method?.base_price || method?.basePrice || method?.cost || 0) || 0;

const isPhysicalOrderItem = (item) => {
    const normalizedType = String(item?.type || '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ');

    return ['physical', 'product', 'physical product'].includes(normalizedType);
};

const InvoicePageContent = ({
    order,
    invoiceTranslations,
    invoiceTranslationsMap,
    invoiceLocale,
    availableInvoiceLanguages,
    initialSiteSettings,
    initialStoreSettings,
    stripeReady,
    stripeOptions,
    stripe,
    elements,
    activePartialPaymentId
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const { resolvedTheme } = useTheme();
    const { siteSettings: contextSiteSettings, storeSettings: contextStoreSettings } = useSettings();

    const siteSettings = contextSiteSettings || initialSiteSettings;
    const storeSettings = contextStoreSettings || initialStoreSettings;

    const [currentOrder, setCurrentOrder] = useState(order);
    const [selectedInvoiceLanguage, setSelectedInvoiceLanguage] = useState(invoiceLocale || 'en');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
        order.paymentMethod && order.paymentMethod !== 'pending' ? order.paymentMethod : ''
    );
    const [selectedShippingMethod, setSelectedShippingMethod] = useState(null);
    const [mbwayMobile, setMbwayMobile] = useState(order.eupagoMobile || order.customer?.phone || '');
    const [mbwayCountryCode, setMbwayCountryCode] = useState(`+${order.shippingAddress?.countryIso || order.customer?.countryIso || '351'}`);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPrintingPdf, setIsPrintingPdf] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const activeInvoiceTranslations =
        invoiceTranslationsMap?.[selectedInvoiceLanguage] || invoiceTranslations || invoiceTranslationsMap?.en || {};
    const t = createInvoiceTranslator(activeInvoiceTranslations);
    const languageOptions = formatAvailableLanguages(availableInvoiceLanguages || [invoiceLocale || 'en'], selectedInvoiceLanguage);
    const searchParamsString = searchParams?.toString() || '';
    const requestedLocale = searchParams?.get('locale') || '';

    const normalizedSettings = {
        businessName:
            storeSettings?.businessName ||
            siteSettings?.siteName ||
            siteSettings?.baseUrl?.replace(/^https?:\/\//, '').replace(/\/$/, '') ||
            'Store',
        tvaNumber: storeSettings?.tvaNumber || '',
        address: storeSettings?.address || siteSettings?.businessAddress || '',
        currency: storeSettings?.currency || siteSettings?.currency || order.currency || 'EUR',
        siteEmail: siteSettings?.siteEmail || '',
        sitePhone: siteSettings?.sitePhone || '',
        siteLogo: siteSettings?.siteLogo || '',
        baseUrl: siteSettings?.baseUrl || ''
    };

    const currentCurrency = currentOrder.currency || normalizedSettings.currency || 'EUR';
    const hasPhysicalItems = currentOrder.items.some(isPhysicalOrderItem);
    const currentShippingCost = hasPhysicalItems
        ? selectedShippingMethod
            ? getShippingMethodCost(selectedShippingMethod)
            : parseFloat(currentOrder.shippingCost || currentOrder.shipping?.cost || currentOrder.shipping || 0) || 0
        : 0;
    const originalShippingCost = hasPhysicalItems
        ? parseFloat(currentOrder.shippingCost || currentOrder.shipping?.cost || currentOrder.shipping || 0) || 0
        : 0;
    const effectiveTotal = Math.max(
        0,
        (parseFloat(currentOrder.finalTotal || currentOrder.total || currentOrder.amount || 0) || 0) - originalShippingCost + currentShippingCost
    );

    // Partial payment logic
    const partialPayments = Array.isArray(currentOrder.partialPayments) ? currentOrder.partialPayments : [];
    const activePartialPayment = activePartialPaymentId
        ? partialPayments.find((p) => p.id === activePartialPaymentId) || null
        : null;
    const totalPaidByPartials = partialPayments
        .filter((p) => p.paymentStatus === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const remainingBalance = Math.max(0, effectiveTotal - totalPaidByPartials);
    // Auto-detect first pending partial even without ?payment=ID in URL
    const firstPendingPartial = partialPayments.find((p) => p.paymentStatus === 'pending') || null;
    // URL-specified partial takes priority; otherwise fall back to first pending
    const effectivePartialPayment = activePartialPayment ?? firstPendingPartial;
    // The amount the customer actually needs to pay in this session
    const paymentAmount = effectivePartialPayment
        ? parseFloat(effectivePartialPayment.amount || 0)
        : totalPaidByPartials > 0 ? remainingBalance : effectiveTotal;
    const isPartialInvoice = Boolean(activePartialPaymentId && activePartialPayment);
    const isPartialAlreadyPaid = isPartialInvoice && activePartialPayment?.paymentStatus === 'paid';

    const selectedCountry =
        currentOrder.shippingAddress?.countryIso ||
        (String(currentOrder.shippingAddress?.country || '').length === 2 ? currentOrder.shippingAddress?.country : '') ||
        currentOrder.customer?.countryIso ||
        (String(currentOrder.customer?.country || '').length === 2 ? currentOrder.customer?.country : '');
    const isEligibleForFreeShipping =
        storeSettings?.freeShippingEnabled &&
        (parseFloat(currentOrder.subtotal || 0) || 0) >= (parseFloat(storeSettings?.freeShippingThreshold || 0) || 0);

    const currentPaymentMethod = currentOrder.paymentMethod || 'pending';
    const paymentStatus = formatOrderStatus(currentOrder.paymentStatus || 'pending', t);
    const bankTransferSettings = storeSettings?.paymentMethods?.bankTransfer || {};
    const hidePaymentSubmitButton = selectedPaymentMethod === 'bank_transfer';
    const customer = currentOrder.customer || {};
    const shippingAddress = currentOrder.shippingAddress || currentOrder.shipping_address || customer;
    const customerBusinessName =
        customer.customerBusinessName || shippingAddress.customerBusinessName || currentOrder.customer?.customerBusinessName;
    const customerPhone = customer.phone || shippingAddress.phone;
    const streetAddress = customer.streetAddress || shippingAddress.streetAddress || customer.street || shippingAddress.street;
    const apartmentUnit =
        customer.apartmentUnit || shippingAddress.apartmentUnit || customer.apartment || shippingAddress.apartment;
    const city = customer.city || shippingAddress.city;
    const state = customer.state || shippingAddress.state;
    const zipCode = customer.zipCode || shippingAddress.zipCode || customer.zip || shippingAddress.zip;
    const country = customer.country || shippingAddress.country || customer.countryIso || shippingAddress.countryIso;
    const customerTvaNumber =
        customer.customerTvaNumber || shippingAddress.customerTvaNumber || currentOrder.customer?.customerTvaNumber;
    const countryName = country ? getCountryName(country, selectedInvoiceLanguage || invoiceLocale || locale) : '';
    const cityWithZipLine = [[city, state].filter(Boolean).join(', '), zipCode].filter(Boolean).join(' ');

    const getAvailablePaymentMethods = () => {
        const methods = [];

        if (stripeReady && storeSettings?.paymentMethods?.stripe?.enabled) {
            methods.push({
                value: 'stripe',
                icon: <CreditCard className="h-4 w-4" />,
                label: t('paymentMethods.stripe'),
                description: t('paymentMethodDescriptions.stripe')
            });
        }

        if (storeSettings?.paymentMethods?.euPago?.enabled) {
            const supportedMethods = storeSettings.paymentMethods.euPago.supportedMethods || ['mb', 'mbway'];

            if (supportedMethods.includes('mb')) {
                methods.push({
                    value: 'eupago_mb',
                    img_dark: '/vendors/multibanco_dark.webp',
                    img_light: '/vendors/multibanco.webp',
                    label: t('paymentMethods.eupago_mb'),
                    description: t('paymentMethodDescriptions.eupago_mb')
                });
            }

            if (supportedMethods.includes('mbway')) {
                methods.push({
                    value: 'eupago_mbway',
                    img_dark: '/vendors/mbway_dark.webp',
                    img_light: '/vendors/mbway.webp',
                    label: t('paymentMethods.eupago_mbway'),
                    description: t('paymentMethodDescriptions.eupago_mbway')
                });
            }
        }

        if (storeSettings?.paymentMethods?.bankTransfer?.enabled) {
            methods.push({
                value: 'bank_transfer',
                icon: <Landmark className="h-4 w-4" />,
                label: t('paymentMethods.bank_transfer'),
                description: t('paymentMethodDescriptions.bank_transfer')
            });
        }

        if (storeSettings?.paymentMethods?.payOnDelivery?.enabled === true) {
            methods.push({
                value: 'pay_on_delivery',
                icon: <Truck className="h-4 w-4" />,
                label: t('paymentMethods.pay_on_delivery'),
                description: t('paymentMethodDescriptions.pay_on_delivery')
            });
        }

        return methods;
    };

    const availablePaymentMethods = getAvailablePaymentMethods();

    const updateInvoiceLocaleInUrl = (language) => {
        if (!pathname) {
            return;
        }

        const nextParams = new URLSearchParams(searchParamsString);
        if (language) {
            nextParams.set('locale', language);
        } else {
            nextParams.delete('locale');
        }

        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    };

    const handleInvoiceLanguageChange = (language) => {
        setSelectedInvoiceLanguage(language);
        updateInvoiceLocaleInUrl(language);

        if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
        }
    };

    useEffect(() => {
        if (!availablePaymentMethods.length) {
            setSelectedPaymentMethod('');
            return;
        }

        const selectedMethodExists = availablePaymentMethods.some((method) => method.value === selectedPaymentMethod);
        if (selectedMethodExists) {
            return;
        }

        const currentMethodExists = availablePaymentMethods.some((method) => method.value === currentPaymentMethod);

        if (currentMethodExists) {
            setSelectedPaymentMethod(currentPaymentMethod);
            return;
        }

        setSelectedPaymentMethod('');
    }, [currentPaymentMethod, selectedPaymentMethod, availablePaymentMethods]);

    useEffect(() => {
        if (!hasPhysicalItems && selectedShippingMethod) {
            setSelectedShippingMethod(null);
        }
    }, [hasPhysicalItems, selectedShippingMethod]);

    useEffect(() => {
        const availableCodes = (availableInvoiceLanguages || []).map((language) => String(language || '').trim()).filter(Boolean);

        if (!requestedLocale) {
            if (typeof document !== 'undefined') {
                document.documentElement.lang = selectedInvoiceLanguage || invoiceLocale || locale;
            }
            return;
        }

        if (!availableCodes.includes(requestedLocale)) {
            return;
        }

        if (requestedLocale !== selectedInvoiceLanguage) {
            setSelectedInvoiceLanguage(requestedLocale);
        }

        if (typeof document !== 'undefined') {
            document.documentElement.lang = requestedLocale;
        }
    }, [availableInvoiceLanguages, invoiceLocale, locale, requestedLocale, selectedInvoiceLanguage]);

    useEffect(() => {
        if (!elements || selectedPaymentMethod !== 'stripe') {
            return;
        }

        elements.update({
            amount: Math.round(paymentAmount * 100),
            currency: currentCurrency.toLowerCase()
        });
    }, [currentCurrency, paymentAmount, elements, selectedPaymentMethod]);

    const handlePrint = async () => {
        try {
            setIsPrintingPdf(true);

            await printInvoicePdf(
                currentOrder,
                { siteSettings, storeSettings },
                selectedInvoiceLanguage,
                t('printPdfError')
            );
        } catch (error) {
            console.error('Invoice PDF print error:', error);
            const message = error?.message || t('printPdfError');
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsPrintingPdf(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setIsGeneratingPdf(true);
            await generatePDF(currentOrder, { siteSettings, storeSettings }, selectedInvoiceLanguage);
        } catch (error) {
            console.error('Invoice PDF generation error:', error);
            const message = t('downloadPdfError');
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const persistOrderAccess = () => {
        if (typeof window === 'undefined' || !currentOrder.id) {
            return;
        }

        localStorage.setItem(`order_access_${currentOrder.id}`, JSON.stringify(buildOrderAccessToken(currentOrder.id)));
    };

    const navigateToStatusPage = ({ paymentMethod, eupagoMethod = '', reference = '', entity = '', amount = '' }) => {
        persistOrderAccess();

        const params = new URLSearchParams({
            order_id: currentOrder.id,
            payment_method: paymentMethod
        });

        if (paymentMethod === 'eupago' && eupagoMethod) {
            params.set('eupago_method', eupagoMethod);
        }

        if (reference) {
            params.set('reference', reference);
        }

        if (entity) {
            params.set('entity', entity);
        }

        if (amount) {
            params.set('amount', String(amount));
        }

        router.push(`/cart/checkout/success?${params.toString()}`);
    };

    const buildShippingPayload = () => {
        if (!hasPhysicalItems) {
            return {
                method: '',
                carrier: '',
                cost: 0,
                deliveryTime: '',
                trackingNumber: null
            };
        }

        return {
            method: selectedShippingMethod?.name || currentOrder.shipping?.method || 'Standard',
            carrier: selectedShippingMethod?.carrier_name || currentOrder.shipping?.carrier || 'Standard',
            cost: currentShippingCost,
            deliveryTime: selectedShippingMethod?.delivery_time || currentOrder.shipping?.deliveryTime || '5-7 days',
            trackingNumber: currentOrder.shipping?.trackingNumber || null
        };
    };

    const getExpiryTime = (method) => {
        const currentTime = new Date();

        if (method === 'mbway') {
            const minutes = storeSettings?.paymentMethods?.euPago?.mbwayExpiryTime || 5;
            return new Date(currentTime.getTime() + minutes * 60 * 1000).toISOString();
        }

        if (method === 'mb') {
            const minutes = storeSettings?.paymentMethods?.euPago?.mbExpiryTime || 2880;
            return new Date(currentTime.getTime() + minutes * 60 * 1000).toISOString();
        }

        return null;
    };

    const buildOrderUpdatePayload = (overrides = {}) => ({
        paymentMethod: selectedPaymentMethod,
        paymentStatus: 'pending',
        shippingCost: currentShippingCost,
        shipping: buildShippingPayload(),
        total: effectiveTotal,
        amount: effectiveTotal,
        finalTotal: effectiveTotal,
        bankTransferDetails:
            selectedPaymentMethod === 'bank_transfer'
                ? storeSettings?.paymentMethods?.bankTransfer || null
                : null,
        eupagoReference: '',
        eupagoEntity: '',
        eupagoTransactionId: '',
        eupagoMethod: '',
        eupagoMobile: '',
        expiryTime: null,
        updatedAt: new Date().toISOString(),
        ...overrides
    });

    const handleShippingMethodSelect = (method) => {
        setSelectedShippingMethod(method);
    };

    const handleShippingMethodsLoaded = (methods) => {
        if (!hasPhysicalItems) {
            setSelectedShippingMethod(null);
            return;
        }

        if (!Array.isArray(methods) || methods.length === 0) {
            setSelectedShippingMethod(null);
            return;
        }

        const currentMethodName = currentOrder.shipping?.method || currentOrder.shipping?.carrier || '';
        const matchedMethod =
            methods.find(
                (method) => method?.name === currentMethodName || method?.carrier_name === currentMethodName
            ) || methods[0];

        setSelectedShippingMethod((prev) => prev || matchedMethod);
    };

    const handlePendingPayment = async () => {
        try {
            setIsProcessing(true);
            setErrorMessage('');

            if (!selectedPaymentMethod) {
                throw new Error(t('paymentErrors.generic'));
            }

            if (
                !isPartialInvoice &&
                hasPhysicalItems &&
                !selectedShippingMethod &&
                !currentOrder.shipping?.method &&
                !currentOrder.shipping?.carrier
            ) {
                throw new Error(t('paymentErrors.generic'));
            }

            if (selectedPaymentMethod === 'stripe') {
                if (!stripe || !elements) {
                    throw new Error(t('paymentErrors.stripeInit'));
                }

                const { error: submitError } = await elements.submit();
                if (submitError) {
                    throw new Error(submitError.message);
                }

                const stripeResult = await createStripePaymentIntent({
                    amount: Math.round(paymentAmount * 100),
                    currency: currentCurrency,
                    email: currentOrder.email || currentOrder.customer?.email || '',
                    metadata: {
                        order_id: currentOrder.id,
                        payment_context: isPartialInvoice ? 'partial_invoice' : 'invoice',
                        ...(isPartialInvoice && { partial_payment_id: activePartialPaymentId })
                    }
                });

                if (!stripeResult?.success || !stripeResult?.client_secret) {
                    throw new Error(stripeResult?.error || t('paymentErrors.stripeInit'));
                }

                const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
                    elements,
                    clientSecret: stripeResult.client_secret,
                    redirect: 'if_required'
                });

                if (confirmError) {
                    throw new Error(confirmError.message);
                }

                const paidStatuses = ['succeeded', 'processing', 'requires_capture'];
                if (!paymentIntent || !paidStatuses.includes(paymentIntent.status)) {
                    throw new Error(t('paymentErrors.stripeConfirm'));
                }

                const updatePayload = buildOrderUpdatePayload({
                    paymentMethod: 'stripe',
                    paymentStatus: 'paid',
                    status: currentOrder.status && currentOrder.status !== 'pending' ? currentOrder.status : 'processing',
                    paidAt: new Date().toISOString(),
                    paymentIntentId: paymentIntent.id,
                    ...(isPartialInvoice && { partialPaymentId: activePartialPaymentId })
                });

                const updateResult = await confirmOrderPayment(currentOrder.id, updatePayload, selectedInvoiceLanguage);
                if (!updateResult?.success) {
                    throw new Error(updateResult?.error || t('paymentErrors.updateOrder'));
                }

                setCurrentOrder((prev) => ({
                    ...prev,
                    ...(updateResult.data || updatePayload)
                }));

                navigateToStatusPage({ paymentMethod: 'stripe' });
                return;
            }

            if (selectedPaymentMethod.startsWith('eupago_')) {
                const eupagoMethod = selectedPaymentMethod.replace('eupago_', '');

                // For partial payments, check existing reference in the partial payment record
                const existingPartialEupagoRef = isPartialInvoice
                    ? activePartialPayment?.eupagoReference
                    : null;

                if (
                    !isPartialInvoice &&
                    selectedPaymentMethod === currentPaymentMethod &&
                    currentOrder.eupagoReference &&
                    currentOrder.paymentStatus === 'pending'
                ) {
                    navigateToStatusPage({
                        paymentMethod: 'eupago',
                        eupagoMethod,
                        reference: currentOrder.eupagoReference,
                        entity: currentOrder.eupagoEntity,
                        amount: paymentAmount
                    });
                    return;
                }

                if (isPartialInvoice && existingPartialEupagoRef && activePartialPayment?.paymentStatus === 'pending') {
                    navigateToStatusPage({
                        paymentMethod: 'eupago',
                        eupagoMethod,
                        reference: existingPartialEupagoRef,
                        entity: activePartialPayment?.eupagoEntity || '',
                        amount: paymentAmount
                    });
                    return;
                }

                if (eupagoMethod === 'mbway' && !mbwayMobile) {
                    throw new Error(t('paymentErrors.mbwayMobileRequired'));
                }

                const eupagoResult = await createEuPagoReference({
                    orderId: currentOrder.id,
                    amount: paymentAmount,
                    method: eupagoMethod,
                    mobile: eupagoMethod === 'mbway' ? mbwayMobile : null,
                    customerEmail: currentOrder.email || currentOrder.customer?.email || '',
                    customerName: currentOrder.customerName || ''
                });

                if (!eupagoResult?.success) {
                    throw new Error(eupagoResult?.error || t('paymentErrors.eupagoReference'));
                }

                if (isPartialInvoice) {
                    // Update partial payment record with eupago reference details
                    const { updatePartialPayment } = await import('@/lib/server/orders.js');
                    await updatePartialPayment(currentOrder.id, activePartialPaymentId, {
                        paymentMethod: selectedPaymentMethod,
                        eupagoReference: eupagoResult.reference || '',
                        eupagoEntity: eupagoResult.entity || '',
                        eupagoTransactionId: eupagoResult.transactionId || '',
                        eupagoMethod,
                        eupagoMobile: eupagoMethod === 'mbway' ? mbwayMobile : ''
                    });
                } else {
                    const updatePayload = buildOrderUpdatePayload({
                        paymentMethod: selectedPaymentMethod,
                        paymentStatus: 'pending',
                        eupagoReference: eupagoResult.reference || '',
                        eupagoEntity: eupagoResult.entity || '',
                        eupagoTransactionId: eupagoResult.transactionId || '',
                        eupagoMethod,
                        eupagoMobile: eupagoMethod === 'mbway' ? mbwayMobile : '',
                        expiryTime: getExpiryTime(eupagoMethod)
                    });

                    const updateResult = await updateOrder(currentOrder.id, updatePayload);
                    if (!updateResult?.success) {
                        throw new Error(updateResult?.error || t('paymentErrors.updateOrder'));
                    }

                    setCurrentOrder((prev) => ({
                        ...prev,
                        ...updatePayload
                    }));
                }

                navigateToStatusPage({
                    paymentMethod: 'eupago',
                    eupagoMethod,
                    reference: eupagoResult.reference,
                    entity: eupagoResult.entity || '',
                    amount: eupagoResult.amount || paymentAmount
                });
                return;
            }

            if (
                !isPartialInvoice &&
                selectedPaymentMethod === currentPaymentMethod &&
                currentOrder.paymentStatus === 'pending' &&
                ['bank_transfer', 'pay_on_delivery'].includes(selectedPaymentMethod)
            ) {
                navigateToStatusPage({ paymentMethod: selectedPaymentMethod });
                return;
            }

            if (!isPartialInvoice) {
                const updatePayload = buildOrderUpdatePayload({
                    paymentMethod: selectedPaymentMethod,
                    paymentStatus: 'pending'
                });

                const updateResult = await updateOrder(currentOrder.id, updatePayload);
                if (!updateResult?.success) {
                    throw new Error(updateResult?.error || t('paymentErrors.updateOrder'));
                }

                setCurrentOrder((prev) => ({
                    ...prev,
                    ...updatePayload
                }));
            }

            navigateToStatusPage({ paymentMethod: selectedPaymentMethod });
        } catch (error) {
            console.error('Invoice payment error:', error);
            const message = error?.message || t('paymentErrors.generic');
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const detailRows = [
        { label: t('invoiceDate'), value: formatDate(currentOrder.createdAt || currentOrder.created_at || currentOrder.orderDate, selectedInvoiceLanguage) },
        {
            label: t('paymentMethod'),
            value:
                t(`paymentMethods.${currentOrder.paymentMethod || 'none'}`) ===
                `paymentMethods.${currentOrder.paymentMethod || 'none'}`
                    ? currentOrder.paymentMethod || t('paymentMethods.none')
                    : t(`paymentMethods.${currentOrder.paymentMethod || 'none'}`)
        },
        currentOrder.eupagoReference ? { label: t('reference'), value: currentOrder.eupagoReference } : null,
        currentOrder.eupagoEntity ? { label: t('entity'), value: currentOrder.eupagoEntity } : null,
        { label: t('status'), value: paymentStatus }
    ].filter(Boolean);

    return (
        <main className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-4 sm:py-8">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <div className="flex gap-4 items-center justify-between print:hidden">
                    <a href={normalizedSettings.baseUrl || '/'} className="flex items-center gap-3">
                        <img src={`${normalizedSettings.siteLogo || '/images/logo.webp'}`} alt={normalizedSettings.businessName} className="h-10 w-10 object-cover" />
                        <span className="hidden sm:inline-flex w-fit rounded-md bg-foreground px-3 py-1.5 font-medium text-background sm:px-4 sm:py-2 sm:text-sm">
                            {t('invoiceTitle')}
                        </span>
                    </a> 
                    <div className="flex flex-wrap items-center gap-2">
                        <LanguageSelector
                            languages={languageOptions}
                            value={selectedInvoiceLanguage}
                            onChange={handleInvoiceLanguageChange}
                        />
                        <ThemeSwitchButton className="border border-border bg-card text-card-foreground hover:bg-accent" />
                        <Button type="button" variant="outline" onClick={handlePrint} disabled={isPrintingPdf}>
                            {isPrintingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="md:mr-1 h-4 w-4" />}
                            <span className='hidden md:block'>{t('printInvoice')}</span>
                        </Button>
                        <Button type="button" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                            {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="md:mr-1 h-4 w-4" />}
                            <span className='hidden md:block'>{t('downloadPdf')}</span>
                        </Button>
                    </div> 
                </div>

                {(currentOrder.paymentStatus === 'pending' || (isPartialInvoice && !isPartialAlreadyPaid) || firstPendingPartial) && availablePaymentMethods.length > 0 ? (
                    <Card className="border-amber-200 bg-amber-50/70 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg text-amber-950 dark:text-amber-100">
                                <ShieldCheck className="h-5 w-5" />
                                {effectivePartialPayment ? t('partialInvoice') || t('completePendingPayment') : t('completePendingPayment')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {effectivePartialPayment ? (
                                <div className="rounded-lg border border-amber-200 bg-card/90 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:text-amber-100">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{t('payNow') || 'Pay Now'}:</span>
                                        <span className="font-bold">{formatCurrency(paymentAmount, currentCurrency)}</span>
                                    </div>
                                    {totalPaidByPartials > 0 ? (
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <span>{t('alreadyPaid') || 'Already Paid'}:</span>
                                            <span className="font-medium text-emerald-700 dark:text-emerald-400">-{formatCurrency(totalPaidByPartials, currentCurrency)}</span>
                                        </div>
                                    ) : null}
                                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-amber-200/60 pt-2 dark:border-amber-900/40">
                                        <span>{t('total') || 'Total'}:</span>
                                        <span className="font-medium">{formatCurrency(effectiveTotal, currentCurrency)}</span>
                                    </div>
                                </div>
                            ) : totalPaidByPartials > 0 ? (
                                <div className="rounded-lg border border-amber-200 bg-card/90 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:text-amber-100">
                                    <div className="flex items-center justify-between gap-2">
                                        <span>{t('alreadyPaid') || 'Already Paid'}:</span>
                                        <span className="font-medium text-emerald-700 dark:text-emerald-400">{formatCurrency(totalPaidByPartials, currentCurrency)}</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <span>{t('balanceDue') || 'Balance Due'}:</span>
                                        <span className="font-semibold">{formatCurrency(paymentAmount, currentCurrency)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-amber-200 bg-card/90 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:text-amber-100">
                                    {selectedPaymentMethod === currentPaymentMethod && currentOrder.paymentStatus === 'pending'
                                        ? t('pendingPaymentCurrentMessage')
                                        : t('pendingPaymentSelectMessage')}
                                </div>
                            )}

                            {hasPhysicalItems ? (
                                <div className="relative">
                                    <div className="mb-4 flex items-center gap-2 text-card-foreground">
                                        <MapPinned className="h-5 w-5" />
                                        <h2 className="font-semibold text-lg">{t('shippingMethod')}</h2>
                                    </div>
                                    <ShippingMethodSelector
                                        storeSettings={storeSettings}
                                        selectedCountry={selectedCountry}
                                        onShippingMethodSelect={handleShippingMethodSelect}
                                        onShippingMethodsLoaded={handleShippingMethodsLoaded}
                                        selectedMethod={selectedShippingMethod}
                                        isEligibleForFreeShipping={isEligibleForFreeShipping}
                                    />
                                </div>
                            ) : null}

                            <div className="relative">
                                <div className="mb-4 flex items-center gap-2 text-card-foreground"> 
                                    <h2 className="font-semibold text-lg">{t('paymentMethod')}</h2>
                                </div>

                                <div className="grid gap-3">
                                    {availablePaymentMethods.map((method) => (
                                        <div
                                            key={method.value}
                                            className={`relative rounded-lg border-2 transition-all duration-200 ${
                                                selectedPaymentMethod === method.value
                                                    ? 'border-primary bg-accent/40 shadow-sm'
                                                    : 'border-border hover:border-primary/70'
                                            }`}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPaymentMethod(method.value)}
                                                className="w-full cursor-pointer p-4 text-left text-card-foreground">
                                                <div className="absolute right-4 top-4">
                                                    <div
                                                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                                                            selectedPaymentMethod === method.value
                                                                ? 'border-brand bg-background text-foreground'
                                                                : 'border-muted-foreground/40 text-card-foreground'
                                                        }`}>
                                                        {selectedPaymentMethod === method.value ? (
                                                            <div className="h-2 w-2 rounded-full bg-white" />
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="pr-8">
                                                    <div className="mb-2 flex items-center gap-3">
                                                        {method.img_dark || method.img_light ? (
                                                            <img
                                                                src={resolvedTheme === 'dark' ? method.img_dark : method.img_light}
                                                                alt={method.label}
                                                                className="h-8 w-auto object-contain"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2 font-medium text-base text-card-foreground">
                                                                {method.icon ? (
                                                                    <span className="text-muted-foreground">{method.icon}</span>
                                                                ) : null}
                                                                <span>{method.label}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground text-sm">{method.description}</div>
                                                </div>
                                            </button>

                                            {selectedPaymentMethod === method.value ? (
                                                <div className="border-t border-border px-4 pb-4 pt-3">
                                                    {method.value === 'eupago_mbway' ? (
                                                        <div className="space-y-3">
                                                            <p className="text-muted-foreground text-sm">
                                                                {t('mbwayPhonePrompt')}
                                                            </p>
                                                            <div>
                                                                <label htmlFor="mbwayMobile" className="mb-2 block font-medium text-sm">
                                                                    {t('mobileNumberLabel')}
                                                                </label>
                                                                <PhoneInput
                                                                    value={mbwayMobile}
                                                                    onChange={(fullNumber, countryData, nationalNumber) => {
                                                                        setMbwayMobile(nationalNumber || fullNumber);
                                                                        setMbwayCountryCode(countryData?.dialCode || '+351');
                                                                    }}
                                                                    defaultCountry={'PT'}
                                                                    placeholder={'910000000'}
                                                                    className="w-full"
                                                                />
                                                                <p className="mt-2 text-muted-foreground text-xs">
                                                                    {mbwayCountryCode === '+351'
                                                                        ? t('mbwayLocalNumberHint')
                                                                        : t('mbwayIntlNumberHint')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {method.value === 'eupago_mb' ? (
                                                        <p className="text-muted-foreground text-sm">
                                                            {t('multibancoReferencePrompt')}
                                                        </p>
                                                    ) : null}

                                                    {method.value === 'stripe' ? (
                                                        stripeReady && stripeOptions ? (
                                                            <div className="space-y-3"> 
                                                                <PaymentElement />
                                                            </div>
                                                        ) : (
                                                            <p className="text-muted-foreground text-sm">
                                                                {t('paymentCardUnavailable')}
                                                            </p>
                                                        )
                                                    ) : null}

                                                    {method.value === 'bank_transfer' ? (
                                                        <div className="space-y-3">
                                                            <p className="text-muted-foreground text-sm">
                                                                {t('paymentMethodInstructions.bank_transfer')}
                                                            </p>
                                                            <div className="space-y-2 rounded-lg border border-border bg-accent/20 p-3 text-sm text-card-foreground">
                                                                <p className="font-medium text-card-foreground">{t('bankTransferDetails')}</p>
                                                                {bankTransferSettings.bankName ? (
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="font-medium text-muted-foreground">{t('bankName')}</span>
                                                                        <span className="text-right">{bankTransferSettings.bankName}</span>
                                                                    </div>
                                                                ) : null}
                                                                {bankTransferSettings.accountHolder ? (
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="font-medium text-muted-foreground">{t('accountHolder')}</span>
                                                                        <span className="text-right">{bankTransferSettings.accountHolder}</span>
                                                                    </div>
                                                                ) : null}
                                                                {bankTransferSettings.iban ? (
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="font-medium text-muted-foreground">IBAN</span>
                                                                        <span className="break-all text-right font-mono text-xs sm:text-sm">{bankTransferSettings.iban}</span>
                                                                    </div>
                                                                ) : null}
                                                                {bankTransferSettings.bic ? (
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="font-medium text-muted-foreground">BIC</span>
                                                                        <span className="break-all text-right font-mono text-xs sm:text-sm">{bankTransferSettings.bic}</span>
                                                                    </div>
                                                                ) : null}
                                                                <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                                                                    <span className="font-medium text-muted-foreground">{t('transferAmount')}</span>
                                                                    <span className="text-right font-semibold">{formatCurrency(paymentAmount, currentCurrency)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <span className="font-medium text-muted-foreground">{t('transferReference')}</span>
                                                                    <span className="break-all text-right font-mono text-xs sm:text-sm">{currentOrder.id}</span>
                                                                </div>
                                                                {bankTransferSettings.instructions ? (
                                                                    <div className="border-t border-border pt-2 text-muted-foreground text-xs sm:text-sm">
                                                                        {bankTransferSettings.instructions}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-muted-foreground text-xs">{t('bankTransferNote')}</p>
                                                        </div>
                                                    ) : null}

                                                    {method.value === 'pay_on_delivery' ? (
                                                        <p className="text-muted-foreground text-sm">
                                                            {t('paymentMethodInstructions.pay_on_delivery')}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>

                                {errorMessage ? (
                                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                ) : null}

                                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        <div>
                                            {t('total') || 'Total'}:{' '}
                                            <span className="font-semibold text-card-foreground">{formatCurrency(effectiveTotal, currentCurrency)}</span>
                                        </div>
                                        {totalPaidByPartials > 0 ? (
                                            <div className="mt-1">
                                                {t('alreadyPaid') || 'Already Paid'}:{' '}
                                                <span className="font-medium text-emerald-600 dark:text-emerald-400">-{formatCurrency(totalPaidByPartials, currentCurrency)}</span>
                                            </div>
                                        ) : null}
                                        {partialPayments.length > 0 ? (
                                            <div className="mt-1">
                                                {t('amountDue') || 'Amount Due'}:{' '}
                                                <span className="font-semibold text-card-foreground">{formatCurrency(remainingBalance, currentCurrency)}</span>
                                            </div>
                                        ) : null}
                                        {effectivePartialPayment ? (
                                            <div className="mt-1 border-t border-border pt-1">
                                                {t('payNow') || 'Pay Now'}:{' '}
                                                <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(paymentAmount, currentCurrency)}</span>
                                            </div>
                                        ) : null}
                                        {!effectivePartialPayment && !totalPaidByPartials && hasPhysicalItems && selectedShippingMethod ? (
                                            <div className="mt-1">{t('shippingMethod')}: {selectedShippingMethod.name}</div>
                                        ) : null}
                                    </div>
                                    {!hidePaymentSubmitButton ? (
                                        <Button
                                            type="button"
                                            onClick={handlePendingPayment}
                                            disabled={
                                                isProcessing ||
                                                !selectedPaymentMethod ||
                                                (selectedPaymentMethod === 'stripe' && (!stripe || !elements))
                                            }>
                                            {isProcessing ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    {t('processing')}
                                                </span>
                                            ) : (
                                                t('continuePayment')
                                            )}
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (currentOrder.paymentStatus === 'pending' || (isPartialInvoice && !isPartialAlreadyPaid)) ? (
                    <Card className="border-dashed border-border bg-card/90 shadow-sm">
                        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <span>{t('noPaymentMethodsAvailable')}</span>
                        </CardContent>
                    </Card>
                ) : isPartialAlreadyPaid ? (
                    <Card className="border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
                        <CardContent className="flex items-center gap-3 p-5 text-sm text-emerald-900 dark:text-emerald-100">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span>{t('invoiceAlreadyPaid')}</span>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
                        <CardContent className="flex items-center gap-3 p-5 text-sm text-emerald-900 dark:text-emerald-100">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span>{t('invoiceAlreadyPaid')}</span>
                        </CardContent>
                    </Card>
                )}

                <section className="rounded-xl border border-border bg-card p-4 shadow-sm text-card-foreground sm:p-6">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                        <div>
                            <p className="text-sm text-muted-foreground">{t('fromLabel')}</p>
                            <p className="mt-1 text-lg font-semibold text-card-foreground">{normalizedSettings.businessName}</p>
                            {normalizedSettings.address ? (
                                <p className="mt-1 wrap-break-word text-sm text-muted-foreground">{normalizedSettings.address}</p>
                            ) : null}
                            {normalizedSettings.siteEmail ? (
                                <p className="break-all text-sm text-muted-foreground">{normalizedSettings.siteEmail}</p>
                            ) : null}
                            {normalizedSettings.sitePhone ? (
                                <p className="text-sm text-muted-foreground">{normalizedSettings.sitePhone}</p>
                            ) : null}
                            {normalizedSettings.baseUrl ? (
                                <p className="break-all text-sm text-muted-foreground">{normalizedSettings.baseUrl}</p>
                            ) : null}
                            {normalizedSettings.tvaNumber ? (
                                <p className="text-sm text-muted-foreground">{normalizedSettings.tvaNumber}</p>
                            ) : null}
                        </div>

                        <div className="rounded-lg border border-border bg-accent/30 p-4 text-left sm:p-5 lg:text-right">
                            <p className="text-sm text-muted-foreground">{t('orderId')}</p>
                            <p className="mt-1 break-all text-base font-semibold text-card-foreground">{currentOrder.id}</p>

                            <div className="mt-4 space-y-3">
                                {detailRows.map((detail) => (
                                    <div
                                        key={`${detail.label}-${detail.value}`}
                                        className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0 lg:flex-col lg:items-end lg:gap-1">
                                        <span className="text-sm text-muted-foreground">{detail.label}</span>
                                        <span className="text-right text-sm font-medium text-card-foreground">{detail.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-6 border-t border-border pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                        <div>
                            <p className="text-sm text-muted-foreground">{t('billTo')}</p>
                            {customerBusinessName ? (
                                <p className="mt-1 text-base font-semibold text-card-foreground">{customerBusinessName}</p>
                            ) : null}
                            <p className="mt-1 text-base font-semibold text-card-foreground">{currentOrder.customerName}</p>
                            {currentOrder.email ? <p className="break-all text-sm text-muted-foreground">{currentOrder.email}</p> : null}
                            {customerPhone ? <p className="text-sm text-muted-foreground">{t('phone')}: {customerPhone}</p> : null}
                            {streetAddress ? <p className="text-sm text-muted-foreground">{streetAddress}</p> : null}
                            {apartmentUnit ? <p className="text-sm text-muted-foreground">{apartmentUnit}</p> : null}
                            {cityWithZipLine ? <p className="text-sm text-muted-foreground">{cityWithZipLine}</p> : null}
                            {countryName ? <p className="text-sm text-muted-foreground">{countryName}</p> : null}
                            {customerTvaNumber ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('vatNumberLabel')}: {customerTvaNumber}
                                </p>
                            ) : null}
                        </div>

                        <div className="rounded-lg border border-border bg-accent/30 p-4 sm:p-5">
                            <p className="text-sm font-medium text-card-foreground">{t('invoiceDetails')}</p>
                            <div className="mt-4 space-y-3">
                                {detailRows.map((detail) => (
                                    <div key={`summary-${detail.label}-${detail.value}`} className="flex items-start justify-between gap-4">
                                        <span className="text-sm text-muted-foreground">{detail.label}</span>
                                        <span className="text-right text-sm font-medium text-card-foreground">{detail.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 hidden md:block">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                    <th className="py-2 font-medium">{t('description')}</th>
                                    <th className="py-2 text-center font-medium">{t('qty')}</th>
                                    <th className="py-2 text-right font-medium">{t('price')}</th>
                                    <th className="py-2 text-right font-medium">{t('total')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentOrder.items.length > 0 ? (
                                    currentOrder.items.map((item, index) => {
                                        const qty = parseInt(item.quantity, 10) || 1;
                                        const price = parseFloat(item.price) || 0;
                                        const rowTotal = qty * price;

                                        return (
                                            <tr key={`${item.id || item.name || 'item'}-${index}`} className="border-b border-border/60">
                                                <td className="py-3 text-card-foreground">
                                                    <div className="flex items-start gap-3">
                                                        <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <div>
                                                            <p>{item.name || t('item')}</p>
                                                            {item.type === 'service' && item.appointment ? (
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {item.appointment.date || ''} {item.appointment.time || ''}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-center text-muted-foreground">{qty}</td>
                                                <td className="py-3 text-right text-muted-foreground">{formatCurrency(price, currentCurrency)}</td>
                                                <td className="py-3 text-right font-medium text-card-foreground">
                                                    {formatCurrency(rowTotal, currentCurrency)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-4 text-center text-muted-foreground">
                                            {t('noItemsFound')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 space-y-3 md:hidden">
                        {currentOrder.items.length > 0 ? (
                            currentOrder.items.map((item, index) => {
                                const qty = parseInt(item.quantity, 10) || 1;
                                const price = parseFloat(item.price) || 0;
                                const rowTotal = qty * price;

                                return (
                                    <div key={`${item.id || item.name || 'item'}-mobile-${index}`} className="rounded-lg border border-border bg-accent/20 p-4">
                                        <p className="font-medium text-card-foreground">{item.name || t('item')}</p>
                                        <div className="mt-3 space-y-2 text-sm">
                                            <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                                <span>{t('qty')}</span>
                                                <span>{qty}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                                <span>{t('price')}</span>
                                                <span>{formatCurrency(price, currentCurrency)}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 border-t border-border pt-2 font-medium text-card-foreground">
                                                <span>{t('total')}</span>
                                                <span>{formatCurrency(rowTotal, currentCurrency)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                {t('noItemsFound')}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 ml-auto w-full space-y-2 rounded-lg border border-border bg-accent/30 p-4 text-sm md:max-w-md sm:p-5">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>{t('subtotal')}</span>
                            <span>{formatCurrency(currentOrder.subtotal, currentCurrency)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>{t('shipping')}</span>
                            <span>{formatCurrency(currentShippingCost, currentCurrency)}</span>
                        </div>
                        {currentOrder.vatAmount > 0 ? (
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>{t('vat')}</span>
                                <span>
                                    {currentOrder.vatIncluded ? t('included') : formatCurrency(currentOrder.vatAmount, currentCurrency)}
                                </span>
                            </div>
                        ) : null}
                        {currentOrder.discountAmount > 0 ? (
                            <div className="flex items-center justify-between text-emerald-700">
                                <span>{t('discount')}</span>
                                <span>-{formatCurrency(currentOrder.discountAmount, currentCurrency)}</span>
                            </div>
                        ) : null}
                        <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-card-foreground">
                            <span>{t('total')}</span>
                            <span>{formatCurrency(effectiveTotal, currentCurrency)}</span>
                        </div>
                        {totalPaidByPartials > 0 ? (
                            <>
                                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                                    <span>{t('alreadyPaid') || 'Already Paid'}</span>
                                    <span>-{formatCurrency(totalPaidByPartials, currentCurrency)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-card-foreground">
                                    <span>{t('amountDue') || 'Amount Due'}</span>
                                    <span>{formatCurrency(remainingBalance, currentCurrency)}</span>
                                </div>
                            </>
                        ) : null}
                        {effectivePartialPayment ? (
                            <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-amber-700 dark:text-amber-400">
                                <span>{t('payNow') || 'Pay Now'}</span>
                                <span>{formatCurrency(paymentAmount, currentCurrency)}</span>
                            </div>
                        ) : null}
                    </div>

                    {partialPayments.length > 0 ? (
                        <div className="mt-6 w-full rounded-lg border border-border bg-accent/10 p-4 sm:p-5">
                            <p className="mb-3 text-sm font-medium text-card-foreground">{t('partialPayments') || 'Payment History'}</p>
                            <div className="space-y-2">
                                {partialPayments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            {payment.paymentStatus === 'paid' ? (
                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                                            )}
                                            <span className="font-medium text-card-foreground">
                                                {formatCurrency(parseFloat(payment.amount || 0), currentCurrency)}
                                            </span>
                                            {payment.note ? (
                                                <span className="text-muted-foreground">— {payment.note}</span>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            {payment.paymentStatus === 'paid' && payment.paidAt ? (
                                                <span>{t('paidOn') || 'Paid on'} {formatDate(payment.paidAt, selectedInvoiceLanguage)}</span>
                                            ) : (
                                                <span>{formatOrderStatus(payment.paymentStatus || 'pending', t)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <p className="mt-8 max-w-3xl text-xs leading-5 text-muted-foreground">{t('invoiceDisclaimer')}</p>
                </section>
            </div>
        </main>
    );
};

const InvoicePageStripeContent = (props) => {
    const stripe = useStripe();
    const elements = useElements();

    return <InvoicePageContent {...props} stripe={stripe} elements={elements} />;
};

const InvoicePageClient = (props) => {
    const { storeSettings: contextStoreSettings } = useSettings();
    const { resolvedTheme } = useTheme();
    const resolvedStoreSettings = contextStoreSettings || props.initialStoreSettings;
    const [stripeReady, setStripeReady] = useState(false);
    const [stripeOptions, setStripeOptions] = useState(null);

    useEffect(() => {
        if (!resolvedStoreSettings?.paymentMethods?.stripe?.enabled || !resolvedStoreSettings?.paymentMethods?.stripe?.apiPuplicKey) {
            setStripeReady(false);
            return;
        }

        try {
            stripePromise = loadStripe(resolvedStoreSettings.paymentMethods.stripe.apiPuplicKey);
            setStripeReady(true);
        } catch (error) {
            console.error('Failed to initialize Stripe:', error);
            setStripeReady(false);
        }
    }, [resolvedStoreSettings]);

    useEffect(() => {
        if (!stripeReady) {
            setStripeOptions(null);
            return;
        }

        const totalAmount = parseFloat(props.order.finalTotal || props.order.total || props.order.amount || 0) || 0;
        if (totalAmount <= 0) {
            setStripeOptions(null);
            return;
        }

        setStripeOptions({
            mode: 'payment',
            amount: Math.round(totalAmount * 100),
            currency: (props.order.currency || resolvedStoreSettings?.currency || 'EUR').toLowerCase(),
            appearance: {
                theme: resolvedTheme === 'dark' ? 'night' : 'stripe',
                variables: {
                    colorPrimary: resolvedTheme === 'dark' ? '#d4ff70' : '#147500',
                    colorBackground: resolvedTheme === 'dark' ? '#111111' : '#ffffff',
                    colorText: resolvedTheme === 'dark' ? '#fafafa' : '#111827',
                    colorDanger: '#df1b41',
                    colorTextSecondary: resolvedTheme === 'dark' ? '#a1a1aa' : '#6b7280',
                    colorIcon: resolvedTheme === 'dark' ? '#fafafa' : '#111827',
                    colorPlaceholder: resolvedTheme === 'dark' ? '#71717a' : '#9ca3af',
                    borderRadius: '0.6rem',
                    spacingUnit: '4px'
                }
            },
            payment_method_types: ['card']
        });
    }, [props.order, resolvedStoreSettings, resolvedTheme, stripeReady]);

    if (stripeOptions && stripePromise && stripeReady) {
        return (
            <Elements stripe={stripePromise} options={stripeOptions}>
                <InvoicePageStripeContent {...props} stripeReady={stripeReady} stripeOptions={stripeOptions} />
            </Elements>
        );
    }

    return <InvoicePageContent {...props} stripeReady={stripeReady} stripeOptions={stripeOptions} stripe={null} elements={null} />;
};

export default InvoicePageClient;