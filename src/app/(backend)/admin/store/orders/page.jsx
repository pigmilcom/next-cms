// @/app/(backend)/admin/store/orders/page.jsx

'use client';

import {
    AlertTriangle,
    Calendar,
    Copy,
    CreditCard,
    Download,
    Eye,
    FileText,
    Info,
    Loader2,
    Package,
    Pencil,
    Plus,
    Printer,
    RefreshCw,
    Send,
    SlidersHorizontal,
    Trash2,
    Truck,
    User,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createCustomer, updateCustomer } from '@/lib/server/admin';
import { calculateOrderPoints } from '@/lib/server/club';
import { sendOrderAdminConfirmationEmail, sendOrderUpdateEmail } from '@/lib/server/email';
import { checkEuPagoPendingPayments } from '@/lib/server/gateways';
import { autoCompleteDeliveredOrders, createOrder, deleteOrder, getAllOrders, updateOrder } from '@/lib/server/orders';
import { getCatalog, getCustomers } from '@/lib/server/store';
import { createAppointment } from '@/lib/server/workspace';
import { generateUID } from '@/lib/shared/helpers';
import { generatePDF } from '@/utils/generatePDF';

const ORDER_STATUS_VALUES = ['pending', 'processing', 'delivered', 'complete', 'cancelled'];

const initialFormData = {
    customer: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        streetAddress: '',
        apartmentUnit: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Portugal',
        countryIso: 'PT'
    },
    items: [],
    subtotal: 0,
    shippingCost: 0,
    discountType: 'fixed', // "fixed" or "percentage"
    discountValue: 0,
    discountAmount: 0,
    vatEnabled: false,
    vatPercentage: 0, // VAT rate as percentage (e.g., 20 for 20%)
    vatAmount: 0,
    vatIncluded: false, // Whether VAT is included in the item prices or added on top
    finalTotal: 0,
    clubPoints: 0, // Club points calculated for this order
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: '',
    deliveryNotes: '',
    shippingNotes: '', // Admin-only shipping notes
    sendEmail: true,
    appointmentId: null,
    isServiceAppointment: false
};

const PAYMENT_METHOD_VALUES = [
    'none',
    'card',
    'bank_transfer',
    'pay_on_delivery',
    'cash',
    'crypto',
    'eupago_mb',
    'eupago_mbway'
];

const PAYMENT_STATUS_VALUES = ['pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'];

export default function OrdersPage() {
    const t = useTranslations('Admin.Orders');

    // Get storeSettings from LayoutProvider context
    const { storeSettings } = useAdminSettings();

    const ORDER_STATUS = ORDER_STATUS_VALUES.map((value) => ({
        value,
        label: t(`status.order.${value}`)
    }));
    const PAYMENT_STATUS = PAYMENT_STATUS_VALUES.map((value) => ({
        value,
        label: t(`status.payment.${value}`)
    }));
    const PAYMENT_METHODS = PAYMENT_METHOD_VALUES.map((value) => ({
        value,
        label: t(`status.method.${value}`)
    }));

    const [allOrders, setAllOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
    const [orderByFilter, setOrderByFilter] = useState('newest');
    const [dateRangeFilter, setDateRangeFilter] = useState('all');
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [statusChangeData, setStatusChangeData] = useState(null);
    const [sendEmailNotification, setSendEmailNotification] = useState(true);
    const [sendSmsNotification, setSendSmsNotification] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [editStatusData, setEditStatusData] = useState({
        status: '',
        tracking: '',
        sendEmail: true,
        sendSms: false,
        smsPhone: '', // Phone number to use for SMS
        smsPhoneSource: 'order' // 'order', 'user', or 'manual'
    });
    const [userPhoneData, setUserPhoneData] = useState(null); // Store user phone from getUser
    const [showPhoneSelector, setShowPhoneSelector] = useState(false); // Show phone selection UI
    const [isLoadingUserPhone, setIsLoadingUserPhone] = useState(false); // Loading state for user phone fetch
    const [isEditingPayment, setIsEditingPayment] = useState(false);
    const [editPaymentData, setEditPaymentData] = useState({
        paymentStatus: '',
        paymentMethod: ''
    });
    const [isEditingShippingNotes, setIsEditingShippingNotes] = useState(false);
    const [tempShippingNotes, setTempShippingNotes] = useState('');
    const [isSavingShippingNotes, setIsSavingShippingNotes] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isConfirmingStatusChange, setIsConfirmingStatusChange] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isRefreshingPayments, setIsRefreshingPayments] = useState(false);
    const [hasCheckedEuPagoOnMount, setHasCheckedEuPagoOnMount] = useState(false);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [statusEditConfirmOpen, setStatusEditConfirmOpen] = useState(false);
    const [orderToEditStatus, setOrderToEditStatus] = useState(null);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    // Appointment editing state for service orders
    const [isEditingAppointment, setIsEditingAppointment] = useState(false);
    const [editAppointmentData, setEditAppointmentData] = useState({
        date: '',
        time: '',
        duration: 60,
        notes: ''
    });
    const [isAddingToAgenda, setIsAddingToAgenda] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return (
            statusFilter !== 'all' ||
            paymentStatusFilter !== 'all' ||
            paymentMethodFilter !== 'all' ||
            dateRangeFilter !== 'all' ||
            orderByFilter !== 'newest'
        );
    };

    const fetchOrders = async (isRetry = false) => {
        try {
            if (isRetry) {
                setIsRetrying(true);
                setFetchError(null);
            }

            let params = { limit: 0 };
            if (isRetry) {
                params = { limit: 0, options: { duration: '0' } };
            }

            // Get all orders without pagination (AdminTable handles pagination client-side)
            const response = await getAllOrders(params);

            if (response.success) {
                setAllOrders(response.data);
                setFetchError(null); // Clear any previous errors
                return response.data; // Return the orders data
            } else {
                throw new Error(response.error || t('toasts.fetchOrdersFailed'));
            }
        } catch (error) {
            console.error('Fetch orders error:', error);
            const errorMessage = error.message || t('toasts.fetchOrdersFailed');

            // Check if it's a connection error
            if (errorMessage.includes('fetch failed') || errorMessage.includes('Error connecting to database')) {
                setFetchError(t('errors.connectionFailed'));
            } else {
                setFetchError(errorMessage);
            }

            if (!isRetry) {
                toast.error(errorMessage);
            }
            return null; // Return null on error
        } finally {
            setLoading(false);
            setIsRetrying(false);
        }
    };

    const fetchCustomers = async (isRetry = false) => {
        try {
            let params = { limit: 0 };
            if (isRetry) {
                params = { limit: 0, options: { duration: '0' } };
            }
            const response = await getCustomers(params);
            if (response.success) {
                setCustomers(response.data);
            } else {
                throw new Error(response.error || t('toasts.fetchCustomersFailed'));
            }
        } catch (error) {
            console.error('Fetch customers error:', error);
        }
    };

    const fetchCatalog = async (isRetry = false) => {
        try {
            let params = { limit: 0, activeOnly: false };
            if (isRetry) {
                params = { limit: 0, activeOnly: false, options: { duration: '0' } };
            }
            const response = await getCatalog(params);
            if (response.success) {
                setCatalog(response.data);
            } else {
                throw new Error(response.error || t('toasts.fetchCatalogFailed'));
            }
        } catch (error) {
            console.error('Fetch catalog error:', error);
        }
    };

    // Helper function to update order in state without full reload
    const updateOrderInState = (orderId, updateData) => {
        // Update allOrders
        setAllOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, ...updateData } : order)));

        // Update selectedOrder if it matches
        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder((prev) => ({ ...prev, ...updateData }));
        }
    };

    // Helper function to add new order to state
    const addOrderToState = (newOrder) => {
        setAllOrders((prev) => [newOrder, ...prev]);
    };

    // Helper function to fetch user phone and compare with order phone
    const fetchUserPhoneForSMS = async (customerEmail, orderPhone) => {
        if (!customerEmail) {
            return null;
        }

        setIsLoadingUserPhone(true);
        try {
            const { getUser } = await import('@/lib/server/users');
            const userResult = await getUser({ email: customerEmail });

            if (userResult?.success && userResult.data) {
                return {
                    phone: userResult.data.phone || null,
                    displayName: userResult.data.displayName || null
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching user phone:', error);
            return null;
        } finally {
            setIsLoadingUserPhone(false);
        }
    };

    // Retry function to refetch all data
    const handleRetryFetch = async () => {
        setFetchError(null);
        await Promise.all([fetchOrders(true), fetchCustomers(true), fetchCatalog(true), handleRefreshPayments(true)]);
        toast.success(t('toasts.dataRefreshed'));
    };

    // Manual refresh function for EuPago payments and new orders / orders updates
    const handleRefreshPayments = async (ignoreError = false) => {
        setIsRefreshingPayments(true);
        try {
            // Store current orders for comparison
            const previousOrders = [...allOrders];

            const result = await checkEuPagoPendingPayments();
            if (result.success) {
                const messages = [];
                if (result.updated > 0) {
                    messages.push(t('toasts.paymentsConfirmed', { count: result.updated }));
                }
                if (result.cancelled > 0) {
                    messages.push(t('toasts.expiredOrdersCancelled', { count: result.cancelled }));
                }

                if (messages.length > 0) {
                    toast.success(messages.join(', '));
                } else {
                    toast.info(t('toasts.noPendingPayments'));
                }

                // Auto-complete delivered orders older than 30 days
                try {
                    const autoCompleteResult = await autoCompleteDeliveredOrders();
                    if (autoCompleteResult.success && autoCompleteResult.data.updatedCount > 0) {
                        toast.success(t('toasts.autoCompletedDeliveredOrders', {
                            count: autoCompleteResult.data.updatedCount
                        }));
                    }
                } catch (error) {
                        toast.error(t('toasts.autoCompleteDeliveredOrdersFailed')); 
                }

                // Always refresh orders to show any updates
                const updatedOrdersData = await fetchOrders(true);

                // Use the returned data instead of state (which might not be updated yet)
                const currentOrders = updatedOrdersData || allOrders;
                const newOrdersCount = currentOrders.length - previousOrders.length;

                // Check for order updates (compare by updatedAt timestamp)
                const updatedOrders = currentOrders.filter((currentOrder) => {
                    const previousOrder = previousOrders.find((prevOrder) => prevOrder.id === currentOrder.id);
                    if (!previousOrder) return false; // This is a new order, not an update

                    // Compare updatedAt timestamps to detect updates
                    const currentUpdatedAt = new Date(currentOrder.updatedAt || currentOrder.createdAt);
                    const previousUpdatedAt = new Date(previousOrder.updatedAt || previousOrder.createdAt);

                    return currentUpdatedAt > previousUpdatedAt;
                });

                // Display notifications for new orders and updates
                const notifications = [];
                if (newOrdersCount > 0) {
                    notifications.push(t('toasts.newOrdersReceived', { count: newOrdersCount }));
                }
                if (updatedOrders.length > 0) {
                    notifications.push(t('toasts.ordersUpdated', { count: updatedOrders.length }));
                }

                if (notifications.length > 0) {
                    toast.success(notifications.join(', '));
                }
            } else { 
                if(!ignoreError) {
                toast.error(result.error || t('toasts.checkPaymentsFailed'));
                }
            }
        } catch (error) {
            if(!ignoreError) {
            console.error('Refresh payments failed:', error);
            toast.error(t('toasts.refreshPaymentStatusFailed'));
            }
        } finally {
            setIsRefreshingPayments(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchCustomers();
        fetchCatalog();
    }, []);

    // Check EuPago pending payments once on mount
    useEffect(() => {
        const checkEuPagoOnMount = async () => {
            if (hasCheckedEuPagoOnMount || allOrders.length === 0) return;

            const hasPendingEuPago = allOrders.some(
                (order) => order.paymentMethod?.startsWith('eupago_') && order.paymentStatus === 'pending'
            );

            if (hasPendingEuPago) {
                try {
                    const result = await checkEuPagoPendingPayments();
                    if (result.success) {
                        const messages = [];
                        if (result.updated > 0) {
                            messages.push(t('toasts.paymentsConfirmed', { count: result.updated }));
                        }
                        if (result.cancelled > 0) {
                            messages.push(t('toasts.expiredOrdersCancelled', { count: result.cancelled }));
                        }
                        if (messages.length > 0) {
                            toast.success(messages.join(', '));
                            await fetchOrders();
                        }
                    }
                } catch (error) {
                    console.error('Initial EuPago check failed:', error);
                }
            }

            // Auto-complete delivered orders older than 30 days
            try {
                const autoCompleteResult = await autoCompleteDeliveredOrders();
                if (autoCompleteResult.success && autoCompleteResult.data.updatedCount > 0) {
                    toast.success(t('toasts.completedOrdersUpdated', { count: autoCompleteResult.data.updatedCount }));
                    await fetchOrders();
                }
            } catch (error) {
                console.error('Failed to auto-complete delivered orders:', error);
            }

            setHasCheckedEuPagoOnMount(true);
        };

        checkEuPagoOnMount();
    }, [allOrders, hasCheckedEuPagoOnMount]);

    // Filter function for AdminTable
    const filterOrders = (orders, search, sortConfig) => {
        let filtered = [...orders];

        // Apply status filter
        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter((order) => order.status === statusFilter);
        }

        // Apply payment status filter
        if (paymentStatusFilter && paymentStatusFilter !== 'all') {
            filtered = filtered.filter((order) => order.paymentStatus === paymentStatusFilter);
        }

        // Apply payment method filter
        if (paymentMethodFilter && paymentMethodFilter !== 'all') {
            filtered = filtered.filter((order) => {
                const orderPaymentMethod = order.payment?.method || order.paymentMethod || 'none';
                return orderPaymentMethod === paymentMethodFilter;
            });
        }

        // Apply date range filter
        if (dateRangeFilter && dateRangeFilter !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            filtered = filtered.filter((order) => {
                const orderDate = new Date(order.createdAt);

                switch (dateRangeFilter) {
                    case 'today':
                        return orderDate >= startOfToday;
                    case 'yesterday': {
                        const yesterday = new Date(startOfToday);
                        yesterday.setDate(yesterday.getDate() - 1);
                        return orderDate >= yesterday && orderDate < startOfToday;
                    }
                    case 'last7days': {
                        const last7Days = new Date(startOfToday);
                        last7Days.setDate(last7Days.getDate() - 7);
                        return orderDate >= last7Days;
                    }
                    case 'last30days': {
                        const last30Days = new Date(startOfToday);
                        last30Days.setDate(last30Days.getDate() - 30);
                        return orderDate >= last30Days;
                    }
                    case 'thismonth': {
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        return orderDate >= startOfMonth;
                    }
                    case 'lastmonth': {
                        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                        return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
                    }
                    default:
                        return true;
                }
            });
        }

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter((order) => {
                const orderId = order.id?.toString().toLowerCase() || '';
                const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`
                    .trim()
                    .toLowerCase();
                const customerEmail = order.customer?.email?.toLowerCase() || '';
                const paymentMethod = formatPaymentMethod(
                    order.payment?.method || order.paymentMethod || 'none'
                ).toLowerCase();
                return (
                    orderId.includes(searchLower) ||
                    customerName.includes(searchLower) ||
                    customerEmail.includes(searchLower) ||
                    paymentMethod.includes(searchLower)
                );
            });
        }

        // Apply order by (sorting)
        const applySorting = (data, orderBy, customSortConfig = null) => {
            const sortConfig = customSortConfig || { key: null, direction: 'asc' };

            return data.sort((a, b) => {
                let aValue, bValue;

                // Handle order by filter first
                if (orderBy && orderBy !== 'custom') {
                    switch (orderBy) {
                        case 'newest':
                            aValue = new Date(a.createdAt).getTime();
                            bValue = new Date(b.createdAt).getTime();
                            return bValue - aValue; // Newest first
                        case 'oldest':
                            aValue = new Date(a.createdAt).getTime();
                            bValue = new Date(b.createdAt).getTime();
                            return aValue - bValue; // Oldest first
                        case 'highest_total':
                            return parseFloat(b.finalTotal || 0) - parseFloat(a.finalTotal || 0);
                        case 'lowest_total':
                            return parseFloat(a.finalTotal || 0) - parseFloat(b.finalTotal || 0);
                        case 'customer_name':
                            aValue = `${a.customer?.firstName || ''} ${a.customer?.lastName || ''}`.trim();
                            bValue = `${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim();
                            return aValue.localeCompare(bValue);
                        default:
                            return 0;
                    }
                }

                // Handle custom sorting from table headers
                if (sortConfig.key) {
                    aValue = a[sortConfig.key];
                    bValue = b[sortConfig.key];

                    // Handle customer name sorting
                    if (sortConfig.key === 'customer') {
                        aValue = `${a.customer?.firstName || ''} ${a.customer?.lastName || ''}`.trim();
                        bValue = `${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim();
                    }

                    // Handle date fields
                    if (sortConfig.key === 'createdAt') {
                        aValue = new Date(aValue).getTime();
                        bValue = new Date(bValue).getTime();
                    }

                    // Handle string comparison
                    if (typeof aValue === 'string') {
                        return sortConfig.direction === 'asc'
                            ? aValue.localeCompare(bValue)
                            : bValue.localeCompare(aValue);
                    }

                    // Handle number comparison
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }

                return 0;
            });
        };

        // Apply sorting (either order by filter or custom sort config)
        filtered = applySorting(filtered, orderByFilter, sortConfig);

        return filtered;
    };

    const handleCreateOrder = async () => {
        try {
            setIsSubmitting(true);

            // Validate form data
            if (!isNewCustomer && !selectedCustomerId) {
                throw new Error(t('toasts.selectCustomerRequired'));
            }

            if (formData.items.length === 0) {
                throw new Error(t('toasts.addItemRequired'));
            }

            // Validate customer data for new customers
            if (isNewCustomer) {
                if (!formData.customer.firstName || !formData.customer.lastName || !formData.customer.email) {
                    throw new Error(t('toasts.customerFieldsRequired'));
                }
            }

            // Calculate totals
            const subtotal = formData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

            // Calculate discount amount
            let discountAmount = 0;
            if (formData.discountValue > 0) {
                if (formData.discountType === 'percentage') {
                    discountAmount = (subtotal * formData.discountValue) / 100;
                } else {
                    discountAmount = formData.discountValue;
                }
            }

            // Calculate tax amount
            let taxAmount = 0;
            let _taxableAmount = subtotal;

            if (formData.taxEnabled && formData.taxRate > 0) {
                if (formData.taxIncluded) {
                    // Tax is included in prices - extract tax amount
                    taxAmount = (subtotal * formData.taxRate) / (100 + formData.taxRate);
                    _taxableAmount = subtotal - taxAmount;
                } else {
                    // Tax is added on top
                    taxAmount = (subtotal * formData.taxRate) / 100;
                }
            }

            const finalTotal = formData.vatIncluded
                ? subtotal + (formData.shippingCost || 0) - discountAmount
                : subtotal + (formData.shippingCost || 0) + vatAmount - discountAmount;

            const orderData = {
                ...formData,
                subtotal,
                discountAmount,
                vatAmount,
                finalTotal: Math.max(0, finalTotal), // Ensure finalTotal is not negative
                clubPoints: 0, // Will be calculated below
                createdAt: new Date().toISOString(),
                id: generateUID('ORD')
            };

            // Calculate club points for the order
            try {
                const clubPointsResult = await calculateOrderPoints(orderData.finalTotal, formData.customer.email);
                orderData.clubPoints = clubPointsResult?.data?.clubPoints || 0;
            } catch (error) {
                console.error('Error calculating order points:', error);
                orderData.clubPoints = 0;
            }

            // Create customer if new or update existing customer
            if (isNewCustomer) {
                // Check if customer with this email already exists
                const existingCustomer = customers.find((c) => c.email === orderData.customer.email);

                if (existingCustomer) {
                    // Update existing customer with new information
                    const updatedCustomerData = {
                        firstName: orderData.customer.firstName,
                        lastName: orderData.customer.lastName,
                        email: orderData.customer.email,
                        phone: orderData.customer.phone,
                        streetAddress: orderData.customer.streetAddress,
                        apartmentUnit: orderData.customer.apartmentUnit,
                        city: orderData.customer.city,
                        state: orderData.customer.state,
                        zipCode: orderData.customer.zipCode,
                        country: orderData.customer.country,
                        countryIso: orderData.customer.countryIso,
                        // Preserve existing customer data
                        isBusinessCustomer: existingCustomer.isBusinessCustomer || false,
                        businessName: existingCustomer.businessName || '',
                        legalBusinessName: existingCustomer.legalBusinessName || '',
                        tvaNumber: existingCustomer.tvaNumber || '',
                        businessType: existingCustomer.businessType || '',
                        businessAddress: existingCustomer.businessAddress || '',
                        businessPhone: existingCustomer.businessPhone || '',
                        businessEmail: existingCustomer.businessEmail || '',
                        notes: existingCustomer.notes || '',
                        orders: existingCustomer.orders || 0,
                        totalSpent: existingCustomer.totalSpent || 0,
                        lastOrder: existingCustomer.lastOrder,
                        createdAt: existingCustomer.createdAt
                    };
                    const customerKey = existingCustomer.key || existingCustomer.id;
                    const _customerResponse = await updateCustomer(customerKey, updatedCustomerData);
                    orderData.email = existingCustomer.email;
                } else {
                    // Create new customer
                    const customerData = {
                        firstName: orderData.customer.firstName,
                        lastName: orderData.customer.lastName,
                        email: orderData.customer.email,
                        phone: orderData.customer.phone,
                        streetAddress: orderData.customer.streetAddress,
                        apartmentUnit: orderData.customer.apartmentUnit,
                        city: orderData.customer.city,
                        state: orderData.customer.state,
                        zipCode: orderData.customer.zipCode,
                        country: orderData.customer.country,
                        countryIso: orderData.customer.countryIso,
                        // Add default values for new customers
                        isBusinessCustomer: false,
                        businessName: '',
                        legalBusinessName: '',
                        tvaNumber: '',
                        businessType: '',
                        businessAddress: '',
                        businessPhone: '',
                        businessEmail: '',
                        notes: '',
                        orders: 0,
                        totalSpent: 0,
                        lastOrder: null,
                        createdAt: new Date().toISOString()
                    };

                    const customerResponse = await createCustomer(customerData);

                    if (!customerResponse.success || !customerResponse.data) {
                        throw new Error(t('toasts.createCustomerFailed'));
                    }

                    orderData.email = orderData.customer.email;
                }
            } else {
                // Validate that the selected customer exists
                const existingCustomer = customers.find((c) => c.id === selectedCustomerId);
                if (!existingCustomer) {
                    throw new Error(t('errors.selectedCustomerInvalid'));
                }
                orderData.email = existingCustomer.email;
            }

            // Create order in database
            const response = await createOrder(orderData, { sendEmail: false, createNotification: false });

            if (!response.success || !response.data) {
                throw new Error(response.error || t('toasts.createOrderFailed'));
            }

            // If email notification is enabled, send confirmation
            if (formData.sendEmail) {
                await sendOrderAdminConfirmationEmail(orderData.customer.email, {
                    customerEmail: orderData.customer.email,
                    customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`.trim(),
                    orderId: response.orderId,
                    orderDate: response.data.createdAt,
                    items: orderData.items,
                    subtotal: orderData.subtotal,
                    shippingCost: orderData.shippingCost,
                    discountAmount: orderData.discountAmount,
                    taxAmount: orderData.taxAmount,
                    total: orderData.total,
                    shippingAddress: {
                        streetAddress: orderData.customer.streetAddress,
                        apartmentUnit: orderData.customer.apartmentUnit,
                        city: orderData.customer.city,
                        state: orderData.customer.state,
                        zipCode: orderData.customer.zipCode,
                        country: orderData.customer.country
                    }
                });
            }
            toast.success(t('toasts.orderCreated'));
            setIsCreateOpen(false);
            setFormData(initialFormData);
            setIsNewCustomer(false);
            setSelectedCustomerId('');

            // Add new order to state instead of full reload
            addOrderToState(response.data);
        } catch (error) {
            toast.error(error.message || t('toasts.createOrderFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmStatusChange = async () => {
        if (!statusChangeData) return;

        // Check if status has actually changed
        if (statusChangeData.order.status === statusChangeData.newStatus) {
            toast.error(t('toasts.noChangesDetected'));
            return;
        }

        try {
            setIsConfirmingStatusChange(true);

            const { orderId, newStatus, order } = statusChangeData;

            // Prepare update data with tracking number if provided
            const updateData = { status: newStatus };
            if (trackingNumber.trim()) {
                // Sanitize tracking number: remove spaces, uppercase, alphanumeric only
                const sanitizedTracking = trackingNumber
                    .replace(/\s+/g, '')
                    .replace(/[^A-Z0-9]/gi, '')
                    .toUpperCase();
                updateData.tracking = sanitizedTracking;
            }

            // Update order status and tracking
            const updateResponse = await updateOrder(
                statusChangeData.order.key || statusChangeData.order.id,
                updateData
            );

            if (!updateResponse.success || !updateResponse.data) {
                throw new Error(t('toasts.updateOrderStatusFailed'));
            }

            let emailSent = false;
            let smsSent = false;

            // Send email notification if requested
            if (sendEmailNotification) {
                try {
                    const emailResult = await sendOrderUpdateEmail(
                        order.customer.email,
                        {
                            customerName: `${order?.customer?.firstName} ${order?.customer?.lastName}`.trim(),
                            orderId: order.id,
                            orderDate: order.createdAt,
                            status: newStatus,
                            shippingAddress: order.shipping_address || {
                                streetAddress: order.customer?.streetAddress || '',
                                apartmentUnit: order.customer?.apartmentUnit || '',
                                city: order.customer?.city || '',
                                state: order.customer?.state || '',
                                zipCode: order.customer?.zipCode || '',
                                country: order.customer?.country || '',
                                countryIso: order.customer?.countryIso || ''
                            },
                            items: order.items || [],
                            subtotal: parseFloat(order.subtotal || 0),
                            shippingCost: parseFloat(order.shippingCost || 0),
                            discountAmount: parseFloat(order.discountAmount || 0),
                            vatEnabled: order.vatEnabled || false,
                            vatPercentage: parseFloat(order.vatPercentage || 0),
                            vatAmount: parseFloat(order.vatAmount || 0),
                            vatIncluded: order.vatIncluded || false,
                            total: parseFloat(order.finalTotal || order.total || 0),
                            currency: order.currency || 'EUR',
                            paymentMethod: order.paymentMethod || null,
                            paymentStatus: order.paymentStatus || 'pending',
                            trackingNumber: trackingNumber.trim() || null,
                            trackingUrl: trackingNumber.trim() ? generateTrackingUrl(trackingNumber.trim()) : null,
                            estimatedDelivery: null,
                            deliveryNotes: order.deliveryNotes || null,
                            customMessage: null
                        },
                        'pt'
                    ); // Add locale parameter for consistency

                    if (emailResult.success) {
                        emailSent = true;
                    }
                } catch (emailError) {
                    console.log('Email notification error:', emailError);
                }
            }

            // Send SMS notification if requested
            if (sendSmsNotification) {
                // Validate phone number
                const customerPhone = order.customer?.phone;
                if (!customerPhone) {
                    console.log('SMS notification skipped: No phone number available');
                } else {
                    try {
                        const { sendOrderStatusSMS } = await import('@/lib/server/sms');
                        const { getSettings } = await import('@/lib/server/settings');

                        const { adminSiteSettings } = await getSettings();
                        const baseUrl =
                            adminSiteSettings?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';

                        const smsOrderData = {
                            id: order.id,
                            status: newStatus,
                            trackingNumber: trackingNumber.trim() || order.trackingNumber || null,
                            customer: {
                                firstName: order.customer?.firstName || 'Customer',
                                phone: customerPhone
                            }
                        };

                        const smsResult = await sendOrderStatusSMS(smsOrderData, baseUrl);

                        if (smsResult?.success) {
                            smsSent = true;
                        }
                    } catch (smsError) {
                        console.log('SMS notification error:', smsError);
                    }
                }
            }

            // Display success message based on notifications sent
            if (emailSent && smsSent) {
                toast.success(t('toasts.statusUpdatedEmailSms'));
            } else if (emailSent) {
                toast.success(t('toasts.statusUpdatedEmail'));
            } else if (smsSent) {
                toast.success(t('toasts.statusUpdatedSms'));
            } else if (sendEmailNotification || sendSmsNotification) {
                toast.warning(t('toasts.orderUpdatedNotificationsFailed'));
            } else {
                toast.success(t('toasts.statusUpdated'));
            }

            // Update orders in state and close dialog instead of full reload
            updateOrderInState(statusChangeData.orderId, updateData);
            setIsStatusDialogOpen(false);
            setStatusChangeData(null);
            setTrackingNumber('');
            setSendEmailNotification(true);
            setSendSmsNotification(false);
        } catch (error) {
            console.log('Error updating order status:', error);
            toast.error(t('toasts.updateOrderStatusFailed'));
        } finally {
            setIsConfirmingStatusChange(false);
        }
    };

    const handleGenerateInvoice = async (order) => {
        setIsGeneratingPDF(true);
        try {
            await generatePDF(order, storeSettings);
            toast.success(t('toasts.invoiceGenerated'));
        } catch (error) {
            console.log('Error generating PDF:', error);
            toast.error(t('toasts.invoiceGenerateFailed'));
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const openInvoiceDialog = (order) => {
        setSelectedOrderForInvoice(order);
        setIsInvoiceDialogOpen(true);
    };

    const generateTrackingUrl = (trackingNumber) => {
        const tracking = trackingNumber.toUpperCase();

        // Default: Generic tracking search
        return `https://appserver.ctt.pt/CustomerArea/PublicArea_Detail?ObjectCodeInput=${encodeURIComponent(tracking)}&SearchInput=${encodeURIComponent(tracking)}&IsFromPublicArea=true`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('common.na');
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return t('common.invalidDate');
            return date.toLocaleString();
        } catch (error) {
            console.error('Error formatting date:', error);
            return t('common.invalidDate');
        }
    };

    const formatPrice = (amount) => {
        const currency = storeSettings?.currency || 'EUR';
        const locale = currency === 'EUR' ? 'fr-FR' : currency === 'USD' ? 'en-US' : 'en-GB';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatPaymentMethod = (paymentMethod) => {
        if (!paymentMethod) return t('status.method.none');
        const paymentMethodKey = paymentMethod.startsWith('eupago_') ? paymentMethod : paymentMethod;
        const methodLabel = t(`status.method.${paymentMethodKey}`);
        return methodLabel.startsWith('status.method.') ? paymentMethod : methodLabel;
    };

    // Helper function to truncate order ID (remove timestamp part)
    const truncateOrderId = (orderId) => {
        if (!orderId) return orderId;
        const parts = orderId.split('_');
        if (parts.length > 2) {
            return parts.slice(0, -1).join('_');
        }
        return orderId;
    };

    // Function to copy full order ID to clipboard
    const copyOrderIdToClipboard = async (orderId) => {
        try {
            await navigator.clipboard.writeText(orderId);
            toast.success(t('toasts.orderIdCopied'));
        } catch (error) {
            console.error('Failed to copy order ID:', error);
            toast.error(t('toasts.copyOrderIdFailed'));
        }
    };

    // Function to add order to workspace agenda
    const handleAddToAgenda = async (order) => {
        try {
            setIsAddingToAgenda(true);

            // Check if order already has an appointment
            const hasAppointment = order.appointmentId || order.appointmentDate || order.appointmentTime;
            if (hasAppointment) {
                toast.info(t('toasts.orderAlreadyHasAppointment'));
                return;
            }

            // Prepare appointment data from order
            const serviceItems = order.items?.filter(item => item.isService) || [];
            const serviceName = serviceItems.length > 0 
                ? serviceItems.map(item => item.name).join(', ')
                : order.items?.[0]?.name || 'Service';

            const appointmentData = {
                // Generate appointment-specific ID (will be overridden by createAppointment with proper BOOK prefix)
                customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Customer',
                customerEmail: order.customer?.email || '',
                customerPhone: order.customer?.phone || '',
                service: serviceName,
                serviceId: serviceItems[0]?.productId || order.items?.[0]?.productId || '', // Use productId, not item id
                date: new Date().toISOString().split('T')[0], // Default to today
                time: '10:00', // Default time
                duration: 60, // Default 1 hour
                price: order.finalTotal || order.total || 0,
                status: 'scheduled',
                paymentStatus: order.paymentStatus || 'pending',
                paymentMethod: order.paymentMethod || 'none',
                notes: order.deliveryNotes || '',
                orderId: order.id,
                orderTotal: order.finalTotal || order.total || 0,
                isServiceAppointment: true
            };

            const result = await createAppointment(appointmentData);

            if (result?.success) {
                toast.success(t('toasts.orderAddedToAgenda'));
                
                // Update the order with appointment ID
                const appointmentId = result.data?.id;
                if (appointmentId) {
                    await updateOrder(order.key || order.id, { appointmentId });
                    // Update local state
                    updateOrderInState(order.id, { appointmentId });
                }
                
                // Refresh orders to show updated data
                await fetchOrders();
            } else {
                toast.error(t('toasts.addToAgendaFailed'));
            }
        } catch (error) {
            console.error('Error adding order to agenda:', error);
            toast.error(t('toasts.addToAgendaFailed'));
        } finally {
            setIsAddingToAgenda(false);
        }
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'orderId', label: t('csv.groups.orderId'), defaultChecked: true },
        {
            key: 'customerInfo',
            label: t('csv.groups.customerInfo'),
            headers: [t('csv.headers.customerName'), t('csv.headers.customerEmail'), t('csv.headers.customerPhone')],
            fields: ['customerName', 'customerEmail', 'customerPhone'],
            defaultChecked: true
        },
        { key: 'orderDate', label: t('csv.groups.orderDate'), defaultChecked: true },
        { key: 'orderStatus', label: t('csv.groups.orderStatus'), defaultChecked: true },
        {
            key: 'paymentInfo',
            label: t('csv.groups.paymentInfo'),
            headers: [t('csv.headers.paymentMethod'), t('csv.headers.paymentStatus')],
            fields: ['paymentMethod', 'paymentStatus'],
            defaultChecked: true
        },
        {
            key: 'financialDetails',
            label: t('csv.groups.financialDetails'),
            headers: [
                t('csv.headers.subtotal'),
                t('csv.headers.discountType'),
                t('csv.headers.discountValue'),
                t('csv.headers.discountAmount'),
                t('csv.headers.couponCode'),
                t('csv.headers.shippingCost'),
                t('csv.headers.vatEnabled'),
                t('csv.headers.vatPercentage'),
                t('csv.headers.vatAmount'),
                t('csv.headers.vatIncluded'),
                t('csv.headers.orderTotal'),
                t('csv.headers.clubPoints'),
                t('csv.headers.currency')
            ],
            fields: [
                'subtotal',
                'discountType',
                'discountValue',
                'discountAmount',
                'couponCode',
                'shippingCost',
                'vatEnabled',
                'vatPercentage',
                'vatAmount',
                'vatIncluded',
                'orderTotal',
                'clubPoints',
                'currency'
            ],
            defaultChecked: true
        },
        {
            key: 'eupagoDetails',
            label: t('csv.groups.eupagoDetails'),
            headers: [
                t('csv.headers.eupagoMethod'),
                t('csv.headers.eupagoReference'),
                t('csv.headers.eupagoEntity'),
                t('csv.headers.eupagoTransactionId'),
                t('csv.headers.eupagoTransactionFee'),
                t('csv.headers.revenue')
            ],
            fields: [
                'eupagoMethod',
                'eupagoReference',
                'eupagoEntity',
                'eupagoTransactionId',
                'eupagoTransactionFee',
                'revenue'
            ],
            defaultChecked: true
        },
        {
            key: 'shippingInfo',
            label: t('csv.groups.shippingInfo'),
            headers: [t('csv.headers.trackingNumber'), t('csv.headers.deliveryNotes'), t('csv.headers.shippingNotes')],
            fields: ['trackingNumber', 'deliveryNotes', 'shippingNotes'],
            defaultChecked: true
        },
        {
            key: 'addressDetails',
            label: t('csv.groups.addressDetails'),
            headers: [
                t('csv.headers.streetAddress'),
                t('csv.headers.apartmentUnit'),
                t('csv.headers.city'),
                t('csv.headers.state'),
                t('csv.headers.zipCode'),
                t('csv.headers.country'),
                t('csv.headers.countryIso')
            ],
            fields: ['streetAddress', 'apartmentUnit', 'city', 'state', 'zipCode', 'country', 'countryIso'],
            defaultChecked: true
        },
        {
            key: 'itemsDetails',
            label: t('csv.groups.itemsDetails'),
            headers: [t('csv.headers.itemsCount'), t('csv.headers.itemsDetails')],
            fields: ['itemsCount', 'itemsDetails'],
            defaultChecked: true
        },
        {
            key: 'timestamps',
            label: t('csv.groups.timestamps'),
            headers: [t('csv.headers.updatedAt')],
            fields: ['updatedAt'],
            defaultChecked: true
        }
    ];

    const formatOrderRowData = (order, selectedOptions, fieldMapping) => {
        const revenue = (
            (parseFloat(order.finalTotal || order.total) || 0) -
            (parseFloat(order.eupagoTransactionFee) || 0) -
            (parseFloat(order.vatAmount) || 0)
        ).toFixed(2);

        const itemsDetails = (order.items || [])
            .map((item) => `${item.name} (Qty: ${item.quantity} @ ${formatPrice(item.price)})`)
            .join('; ');

        const rowData = {
            orderId: order.id || '',
            customerName: `${order?.customer?.firstName || ''} ${order?.customer?.lastName || ''}`.trim(),
            customerEmail: order?.customer?.email || order.cst_email || '',
            customerPhone: order?.customer?.phone || order.phone || '',
            orderDate: order.createdAt || '',
            orderStatus: order.status || '',
            paymentMethod: formatPaymentMethod(order.paymentMethod) || '',
            paymentStatus: order.paymentStatus || '',
            subtotal: order.subtotal || 0,
            discountType: order.discountType || '',
            discountValue: order.discountValue || 0,
            discountAmount: order.discountAmount || 0,
            couponCode: order.couponCode || '',
            shippingCost: order.shippingCost || 0,
            vatEnabled: order.vatEnabled ? t('common.yes') : t('common.no'),
            vatPercentage: order.vatPercentage || 0,
            vatAmount: order.vatAmount || 0,
            vatIncluded: order.vatIncluded ? t('common.yes') : t('common.no'),
            orderTotal: order.finalTotal || order.total || 0,
            eupagoMethod: order.eupagoMethod || '',
            eupagoReference: order.eupagoReference || '',
            eupagoEntity: order.eupagoEntity || '',
            eupagoTransactionId: order.eupagoTransactionId || '',
            eupagoTransactionFee: order.eupagoTransactionFee || 0,
            revenue: revenue,
            clubPoints: order.clubPoints || 0,
            currency: order.currency || 'EUR',
            trackingNumber: order.trackingNumber || '',
            deliveryNotes: order.deliveryNotes || '',
            shippingNotes: order.shippingNotes || '',
            streetAddress: order?.customer?.streetAddress || order?.shipping_address?.streetAddress || '',
            apartmentUnit: order?.customer?.apartmentUnit || order?.shipping_address?.apartmentUnit || '',
            city: order?.customer?.city || order?.shipping_address?.city || '',
            state: order?.customer?.state || order?.shipping_address?.state || '',
            zipCode: order?.customer?.zipCode || order?.shipping_address?.zipCode || '',
            country: order?.customer?.country || order?.shipping_address?.country || '',
            countryIso: order?.customer?.countryIso || order?.shipping_address?.countryIso || '',
            itemsCount: (order.items || []).length,
            itemsDetails: `"${itemsDetails.replace(/"/g, '""')}"`,
            updatedAt: order.updatedAt || ''
        };

        return fieldMapping.map((field) => rowData[field]);
    };

    // Define table columns
    const columns = [
        {
            key: 'id',
            label: t('table.columns.orderId'),
            sortable: true,
            render: (order) => (
                <div className="flex flex-col">
                    <span className="truncate font-semibold">{truncateOrderId(order.id)}</span>
                </div>
            )
        },
        {
            key: 'customer',
            label: t('table.columns.customer'),
            sortable: true,
            render: (order) => (
                <Link href={`/admin/store/customers?search=${order.customer.email}`} className="flex flex-col">
                    <div className="truncate font-medium">
                        {`${order?.customer?.firstName} ${order?.customer?.lastName}`.trim()}
                    </div>
                    <div className="truncate text-muted-foreground text-sm">{order.customer.email}</div>
                </Link>
            )
        },
        {
            key: 'finalTotal',
            label: t('table.columns.total'),
            sortable: true,
            render: (order) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{formatPrice(order.finalTotal || order.total)}</span>
                    <div>
                        <Badge
                            variant={
                                order.paymentStatus === 'paid'
                                    ? 'default'
                                    : order.paymentStatus === 'failed'
                                      ? 'destructive'
                                      : order.paymentStatus === 'refunded'
                                        ? 'outline'
                                        : 'outline'
                            }>
                            {PAYMENT_STATUS.find((s) => s.value === order.paymentStatus)?.label || order.paymentStatus}
                        </Badge>
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: t('table.columns.status'),
            sortable: false,
            render: (order) => (
                <Badge
                    variant={
                        order.status === 'delivered'
                            ? 'default'
                            : order.status === 'cancelled'
                              ? 'destructive'
                              : order.status === 'complete'
                                ? 'default'
                                : 'outline'
                    }>
                    {ORDER_STATUS.find((s) => s.value === order.status)?.label}
                </Badge>
            )
        },
        {
            key: 'createdAt',
            label: t('table.columns.createdAt'),
            sortable: true,
            render: (order) => (
                <span className="text-muted-foreground text-sm">
                    {order.createdAt ? formatDate(order.createdAt) : t('common.na')}
                </span>
            )
        }
    ];

    // Define row actions
    const getRowActions = (order) => [
        {
            label: t('actions.viewDetails'),
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: () => {
                setSelectedOrder(order);
                setIsDetailsOpen(true);
            }
        },
        {
            label: t('actions.editStatus'),
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => {
                // Check if order is complete or cancelled
                if (order.status === 'complete' || order.status === 'cancelled') {
                    setOrderToEditStatus(order);
                    setStatusEditConfirmOpen(true);
                } else {
                    // Directly open edit status dialog
                    setEditStatusData({
                        status: order.status,
                        tracking: order.tracking || '',
                        sendEmail: true,
                        sendSms: false,
                        smsPhone: order.customer?.phone || '',
                        smsPhoneSource: 'order'
                    });
                    setUserPhoneData(null);
                    setShowPhoneSelector(false);
                    setSelectedOrder(order);
                    setIsEditingStatus(true);
                }
            }
        },
        {
            label: t('actions.editPayment'),
            icon: <CreditCard className="mr-2 h-4 w-4" />,
            onClick: () => {
                setEditPaymentData({
                    paymentStatus: order.paymentStatus,
                    paymentMethod: order.paymentMethod || ''
                });
                setSelectedOrder(order);
                setIsEditingPayment(true);
            }
        },
        {
            label: t('actions.generateInvoice'),
            icon: <FileText className="mr-2 h-4 w-4" />,
            onClick: () => openInvoiceDialog(order)
        },
        {
            label: t('actions.deleteOrder'),
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => {
                setOrderToDelete(order);
                setDeleteConfirmOpen(true);
            },
            className: 'text-destructive'
        }
    ];

    // Show error state with retry option
    if (fetchError && !loading) {
        return (
            <div className="space-y-4">
                <AdminHeader title={t('header.title')} description={t('header.description')} />

                <Card className="border-destructive/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-destructive/10 p-3">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>
                        <h3 className="mb-2 font-semibold text-lg">{t('errors.connectionErrorTitle')}</h3>
                        <p className="mb-6 max-w-md text-muted-foreground">{fetchError}</p>
                        <Button onClick={handleRetryFetch} disabled={isRetrying} className="gap-2">
                            {isRetrying ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    {t('actions.retrying')}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4" />
                                    {t('actions.retryConnection')}
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AdminHeader title={t('header.title')} description={t('header.description')} />

            {/* Connection error alert for when data is partially loaded */}
            {fetchError && allOrders.length > 0 && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <p className="text-sm text-yellow-800">
                            {t('errors.connectionIssuesDetected')}
                            <Button
                                variant="link"
                                size="sm"
                                onClick={handleRetryFetch}
                                disabled={isRetrying}
                                className="ml-1 h-auto p-0 text-yellow-800 underline">
                                {isRetrying ? t('actions.retrying') : t('actions.retryNow')}
                            </Button>
                        </p>
                    </div>
                </div>
            )}

            <AdminTable
                data={allOrders}
                columns={columns}
                filterData={filterOrders}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage={t('table.emptyMessage')}
                customFilters={
                    <div className="w-full space-y-3">
                        {/* Collapsible Filters */}
                        {isFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                {/* Order Status Filter */}
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.status.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.status.all')}</SelectItem>
                                        {ORDER_STATUS.map((status) => (
                                            <SelectItem key={status.value} value={status.value}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Payment Status Filter */}
                                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.paymentStatus.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.paymentStatus.all')}</SelectItem>
                                        {PAYMENT_STATUS.map((status) => (
                                            <SelectItem key={status.value} value={status.value}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Payment Method Filter */}
                                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.paymentMethod.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.paymentMethod.all')}</SelectItem>
                                        {PAYMENT_METHODS.map((method) => (
                                            <SelectItem key={method.value} value={method.value}>
                                                {method.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Date Range Filter */}
                                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.dateRange.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.dateRange.all')}</SelectItem>
                                        <SelectItem value="today">{t('filters.dateRange.today')}</SelectItem>
                                        <SelectItem value="yesterday">{t('filters.dateRange.yesterday')}</SelectItem>
                                        <SelectItem value="last7days">{t('filters.dateRange.last7days')}</SelectItem>
                                        <SelectItem value="last30days">{t('filters.dateRange.last30days')}</SelectItem>
                                        <SelectItem value="thismonth">{t('filters.dateRange.thismonth')}</SelectItem>
                                        <SelectItem value="lastmonth">{t('filters.dateRange.lastmonth')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Order By Filter */}
                                <Select value={orderByFilter} onValueChange={setOrderByFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder={t('filters.orderBy.placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">{t('filters.orderBy.newest')}</SelectItem>
                                        <SelectItem value="oldest">{t('filters.orderBy.oldest')}</SelectItem>
                                        <SelectItem value="highest_total">{t('filters.orderBy.highestTotal')}</SelectItem>
                                        <SelectItem value="lowest_total">{t('filters.orderBy.lowestTotal')}</SelectItem>
                                        <SelectItem value="customer_name">{t('filters.orderBy.customerName')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Reset Filters Button - Only show when filters applied */}
                                <div className="flex gap-2">
                                    {hasFiltersApplied() && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setStatusFilter('all');
                                                setPaymentStatusFilter('all');
                                                setPaymentMethodFilter('all');
                                                setDateRangeFilter('all');
                                                setOrderByFilter('newest');
                                            }}
                                            title={t('actions.resetFilters')}>
                                            <X className="h-4 w-4" color="red" />
                                            <span className="text-red-500">{t('actions.reset')}</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                }
                headerActions={
                    <>
                        <Button
                            variant={isFiltersExpanded ? 'default' : 'outline'}
                            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                            className="gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden xl:block">
                                {isFiltersExpanded ? t('actions.hideFilters') : t('actions.showFilters')}
                            </span>
                            {hasFiltersApplied() && (
                                <Badge
                                    variant={isFiltersExpanded ? 'default' : 'outline'}
                                    className="ml-1 px-1.5 py-0.5 text-xs">
                                    {
                                        [
                                            statusFilter !== 'all' && t('filters.tags.status'),
                                            paymentStatusFilter !== 'all' && t('filters.tags.payment'),
                                            paymentMethodFilter !== 'all' && t('filters.tags.method'),
                                            dateRangeFilter !== 'all' && t('filters.tags.date'),
                                            orderByFilter !== 'newest' && t('filters.tags.sort')
                                        ].filter(Boolean).length
                                    }
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRetryFetch}
                            disabled={isRefreshingPayments}
                            title={t('actions.refreshPaymentStatus')}>
                            <RefreshCw className={`h-4 w-4 ${isRefreshingPayments ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">
                                {isRefreshingPayments ? t('actions.refreshing') : t('actions.refresh')}
                            </span>
                        </Button>
                        <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">{t('actions.exportCsv')}</span>
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="h-4 w-4" />
                            <span>{t('actions.newOrder')}</span>
                        </Button>
                    </>
                }
            />

            {/* Order Details Dialog - moved outside table */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="space-y-4">
                    <DialogHeader>
                        <DialogTitle className="flex flex-col justify-center items-center font-bold text-xl">
                            {t('dialogs.orderDetails.title')}
                            <span className="font-weight-light text-sm text-muted-foreground">
                                #{truncateOrderId(selectedOrder?.id)}
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <>
                            {/* Add to Agenda Button */}
                            <div className="flex justify-center pb-2">
                                <Button
                                    variant={selectedOrder.appointmentId || selectedOrder.appointmentDate ? 'outline' : 'default'}
                                    onClick={() => handleAddToAgenda(selectedOrder)}
                                    disabled={isAddingToAgenda || selectedOrder.appointmentId || selectedOrder.appointmentDate}
                                    className="gap-2">
                                    {isAddingToAgenda ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Adding to Agenda...
                                        </>
                                    ) : selectedOrder.appointmentId || selectedOrder.appointmentDate ? (
                                        <>
                                            <Calendar className="h-4 w-4" />
                                            Added to Agenda
                                        </>
                                    ) : (
                                        <>
                                            <Calendar className="h-4 w-4" />
                                            Add to Agenda
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                    {selectedOrder && (
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList>
                                <TabsTrigger value="details" className="flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    {t('dialogs.orderDetails.tabs.details')}
                                </TabsTrigger>
                                <TabsTrigger value="customer" className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {t('dialogs.orderDetails.tabs.customer')}
                                </TabsTrigger>
                                <TabsTrigger value="payment" className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    {t('dialogs.orderDetails.tabs.payment')}
                                </TabsTrigger>
                                <TabsTrigger value="status" className="flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    {t('dialogs.orderDetails.tabs.status')}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="mt-4 space-y-4">
                                <Card className="border-none shadow-none p-0 m-0 bg-background">
                                    <CardHeader className="px-1">
                                        <h3 className="font-semibold">Order Information</h3>
                                    </CardHeader>
                                    <CardContent className="space-y-4 px-1">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="font-medium text-gray-500 text-sm">Order ID</label>
                                                <div className="w-full flex flex-nowrap items-center gap-2">
                                                    <p className="w-full max-w-full py-1 font-mono text-sm flex-1 truncate">
                                                        {selectedOrder.id}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="ms-auto h-8 w-8 shirnk-0"
                                                        onClick={() => copyOrderIdToClipboard(selectedOrder.id)}
                                                        title={t('dialogs.orderDetails.copyOrderId')}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="font-medium text-gray-500 text-sm">
                                                    Order Status
                                                </label>
                                                <Badge
                                                    variant={
                                                        selectedOrder.status === 'complete' ? 'default' : 'outline'
                                                    }>
                                                    {selectedOrder.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="font-medium text-gray-500 text-sm">
                                                    Created Date
                                                </label>
                                                <p className="text-sm">{formatDate(selectedOrder.createdAt)}</p>
                                            </div>
                                            <div>
                                                <label className="font-medium text-gray-500 text-sm">
                                                    Last Updated
                                                </label>
                                                <p className="text-sm">{formatDate(selectedOrder.updatedAt)}</p>
                                            </div>
                                        </div>

                                        {/* Coupon Information */}
                                        {(selectedOrder.coupon || selectedOrder.couponCode) && (
                                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                                                <h4 className="mb-2 font-medium text-green-700">Applied Coupon</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="font-medium text-gray-500 text-sm">
                                                            Code
                                                        </label>
                                                        <p className="rounded border border-border bg-card px-2 py-1 font-mono text-sm">
                                                            {selectedOrder.coupon?.code || selectedOrder.couponCode}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="font-medium text-gray-500 text-sm">
                                                            Discount
                                                        </label>
                                                        <p className="font-semibold text-green-600 text-sm">
                                                            {selectedOrder.coupon ? (
                                                                <>
                                                                    {selectedOrder.coupon.type === 'percentage'
                                                                        ? `${selectedOrder.coupon.value}%`
                                                                        : `€${selectedOrder.coupon.value}`}{' '}
                                                                    (€{selectedOrder.discountAmount?.toFixed(2)} saved)
                                                                </>
                                                            ) : (
                                                                `€${selectedOrder.discountAmount?.toFixed(2) || '0.00'} saved`
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedOrder.coupon?.name && (
                                                    <div className="mt-2">
                                                        <label className="font-medium text-gray-500 text-sm">
                                                            Description
                                                        </label>
                                                        <p className="text-sm">{selectedOrder.coupon.name}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Service Appointment Information */}
                                        {(selectedOrder.isServiceAppointment || selectedOrder.appointmentDate || selectedOrder.appointmentTime || selectedOrder.items.some((item) => item.appointmentDate)) && (
                                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <h4 className="font-medium text-blue-700">Service Appointment</h4>
                                                    {!isEditingAppointment && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditAppointmentData({
                                                                    date: selectedOrder.appointmentDate || '',
                                                                    time: selectedOrder.appointmentTime || '09:00',
                                                                    duration: selectedOrder.appointmentDuration || 60,
                                                                    notes: selectedOrder.deliveryNotes || ''
                                                                });
                                                                setIsEditingAppointment(true);
                                                            }}>
                                                            <Pencil className="mr-1 h-3 w-3" />
                                                            Edit Appointment
                                                        </Button>
                                                    )}
                                                </div>
                                                
                                                {isEditingAppointment ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <Label htmlFor="apt-date">Date</Label>
                                                                <Input
                                                                    id="apt-date"
                                                                    type="date"
                                                                    value={editAppointmentData.date}
                                                                    onChange={(e) =>
                                                                        setEditAppointmentData({
                                                                            ...editAppointmentData,
                                                                            date: e.target.value
                                                                        })
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="apt-time">Time</Label>
                                                                <Input
                                                                    id="apt-time"
                                                                    type="time"
                                                                    value={editAppointmentData.time}
                                                                    onChange={(e) =>
                                                                        setEditAppointmentData({
                                                                            ...editAppointmentData,
                                                                            time: e.target.value
                                                                        })
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="apt-duration">Duration (min)</Label>
                                                                <Input
                                                                    id="apt-duration"
                                                                    type="number"
                                                                    min="15"
                                                                    step="15"
                                                                    value={editAppointmentData.duration}
                                                                    onChange={(e) =>
                                                                        setEditAppointmentData({
                                                                            ...editAppointmentData,
                                                                            duration: parseInt(e.target.value) || 60
                                                                        })
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="apt-notes">Notes</Label>
                                                            <Input
                                                                id="apt-notes"
                                                                value={editAppointmentData.notes}
                                                                onChange={(e) =>
                                                                    setEditAppointmentData({
                                                                        ...editAppointmentData,
                                                                        notes: e.target.value
                                                                    })
                                                                }
                                                                placeholder="Add appointment notes..."
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setIsEditingAppointment(false)}>
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={async () => {
                                                                    try {
                                                                        const updatedData = {
                                                                            ...selectedOrder,
                                                                            appointmentDate: editAppointmentData.date,
                                                                            appointmentTime: editAppointmentData.time,
                                                                            appointmentDuration: editAppointmentData.duration,
                                                                            deliveryNotes: editAppointmentData.notes,
                                                                            updatedAt: new Date().toISOString()
                                                                        };
                                                                        const result = await updateOrder(
                                                                            selectedOrder.id,
                                                                            updatedData
                                                                        );
                                                                        if (result.success) {
                                                                            toast.success('Appointment updated successfully');
                                                                            setSelectedOrder(updatedData);
                                                                            setIsEditingAppointment(false);
                                                                            await fetchOrders();
                                                                        } else {
                                                                            toast.error('Failed to update appointment');
                                                                        }
                                                                    } catch (error) {
                                                                        console.error(error);
                                                                        toast.error('Error updating appointment');
                                                                    }
                                                                }}>
                                                                Save Changes
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {selectedOrder.appointmentId && (
                                                            <div className="mb-2 grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="font-medium text-gray-500 text-sm">
                                                                        Appointment ID
                                                                    </label>
                                                                    <p className="rounded border border-border bg-card px-2 py-1 font-mono text-sm">
                                                                        {selectedOrder.appointmentId}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <label className="font-medium text-gray-500 text-sm">
                                                                        Status
                                                                    </label>
                                                                    <Badge
                                                                        variant={
                                                                            selectedOrder.status === 'complete'
                                                                                ? 'default'
                                                                                : 'outline'
                                                                        }>
                                                                        {selectedOrder.status}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(selectedOrder.appointmentDate || selectedOrder.appointmentTime) && (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="font-medium text-gray-500 text-sm">
                                                                        Date & Time
                                                                    </label>
                                                                    <p className="text-sm">
                                                                        📅 {selectedOrder.appointmentDate} at{' '}
                                                                        {selectedOrder.appointmentTime}
                                                                    </p>
                                                                </div>
                                                                {selectedOrder.appointmentDuration && (
                                                                    <div>
                                                                        <label className="font-medium text-gray-500 text-sm">
                                                                            Duration
                                                                        </label>
                                                                        <p className="text-sm">
                                                                            {selectedOrder.appointmentDuration} minutes
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {selectedOrder.items.some((item) => item.appointmentDate) && (
                                                            <div className="mt-2">
                                                                <label className="font-medium text-gray-500 text-sm">
                                                                    Service Items Appointments
                                                                </label>
                                                                {selectedOrder.items
                                                                    .filter((item) => item.appointmentDate)
                                                                    .map((item, index) => (
                                                                        <div
                                                                            key={index}
                                                                            className="mt-1 rounded border bg-card p-2 text-sm">
                                                                            <p>
                                                                                <strong>{item.name}</strong>
                                                                            </p>
                                                                            <p>
                                                                                📅 {item.appointmentDate} at{' '}
                                                                                {item.appointmentTime}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Order Items */}
                                        <div className="mt-6">
                                            <h4 className="mb-3 font-medium">Order Items</h4>
                                            <div className="space-y-3">
                                                {selectedOrder.items.map((item, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between rounded-lg border bg-card p-4">
                                                        <div className="flex-1">
                                                            <p className="font-medium">{item.name}</p>
                                                            <p className="text-gray-500 text-sm">
                                                                {formatPrice(item.price)} × {item.quantity}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-semibold">
                                                                {formatPrice(item.price * item.quantity)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Order Summary */}
                                            <div className="mt-6 space-y-2 rounded-lg border border-border bg-card p-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Subtotal:</span>
                                                    <span className="font-medium ">
                                                        {formatPrice(selectedOrder.subtotal)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Shipping:</span>
                                                    <span className="font-medium ">
                                                        {formatPrice(selectedOrder.shippingCost || 0)}
                                                    </span>
                                                </div>
                                                {selectedOrder.taxEnabled &&
                                                selectedOrder.taxAmount &&
                                                selectedOrder.taxAmount > 0 ? (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">
                                                            VAT ({selectedOrder.taxRate}%)
                                                            {selectedOrder.taxIncluded ? ' (Included)' : ''}:
                                                        </span>
                                                        <span className="font-medium ">
                                                            {selectedOrder.taxIncluded ? (
                                                                <Badge variant="outline" className="text-green-600">
                                                                    Included
                                                                </Badge>
                                                            ) : (
                                                                formatPrice(selectedOrder.taxAmount)
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {selectedOrder.discountAmount && selectedOrder.discountAmount > 0 ? (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-green-600">
                                                            Discount
                                                            {selectedOrder.coupon
                                                                ? ` (${selectedOrder.coupon.code})`
                                                                : ''}
                                                            :
                                                        </span>
                                                        <span className="font-medium text-green-600">
                                                            -{formatPrice(selectedOrder.discountAmount)}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                <div className="flex justify-between border-t pt-2 text-lg">
                                                    <span className="font-bold ">Total:</span>
                                                    <span className="font-bold ">
                                                        {formatPrice(selectedOrder.finalTotal || selectedOrder.total)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="customer" className="mt-4 space-y-4">
                                <Card className="border-none shadow-none p-0 m-0 bg-background">
                                    <CardHeader className="px-1">
                                        <h3 className="font-semibold">Customer Information</h3>
                                    </CardHeader>
                                    <CardContent className="grid gap-3 px-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="font-medium text-gray-500 text-sm">Name</label>
                                                <p className="text-sm">
                                                    {`${selectedOrder?.customer?.firstName} ${selectedOrder?.customer?.lastName}`.trim()}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="font-medium text-gray-500 text-sm">{t('details.customer.email')}</label>
                                                <p className="text-sm">{selectedOrder.customer.email}</p>
                                            </div>
                                        </div>
                                        {selectedOrder.customer.phone && (
                                            <div>
                                                <label className="font-medium text-gray-500 text-sm">{t('details.customer.phone')}</label>
                                                <p className="text-sm">{selectedOrder.customer.phone}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-none p-0 m-0 bg-background">
                                    <CardHeader className="px-1">
                                        <h3 className="font-semibold">{t('details.customer.shippingAddress')}</h3>
                                    </CardHeader>
                                    <CardContent className="space-y-2 px-1">
                                        <p className="text-sm">{selectedOrder.customer.streetAddress}</p>
                                        {selectedOrder.customer.apartmentUnit && (
                                            <p className="text-sm">{selectedOrder.customer.apartmentUnit}</p>
                                        )}
                                        <p className="text-sm">
                                            {selectedOrder.customer.city}, {selectedOrder.customer.state}{' '}
                                            {selectedOrder.customer.zipCode}
                                        </p>
                                        <p className="font-medium text-sm">{selectedOrder.customer.country}</p>
                                        {selectedOrder.deliveryNotes && (
                                            <div className="mt-3 border-t pt-3">
                                                <label className="font-medium text-gray-500 text-sm">
                                                    {t('details.customer.deliveryNotes')}
                                                </label>
                                                <p className="text-sm">{selectedOrder.deliveryNotes}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="mt-4">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <h3 className="font-semibold">{t('details.customer.internalNotes')}</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (isEditingShippingNotes) {
                                                    setIsEditingShippingNotes(false);
                                                    setTempShippingNotes('');
                                                } else {
                                                    setIsEditingShippingNotes(true);
                                                    setTempShippingNotes(selectedOrder.shippingNotes || '');
                                                }
                                            }}>
                                            {isEditingShippingNotes ? t('actions.cancel') : t('actions.editNotes')}
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        {!isEditingShippingNotes ? (
                                            <div className="text-sm">
                                                {selectedOrder.shippingNotes ? (
                                                    <p>{selectedOrder.shippingNotes}</p>
                                                ) : (
                                                    <p className="text-gray-500 italic">{t('details.customer.noInternalNotes')}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <textarea
                                                    className="w-full resize-none rounded-md border p-3"
                                                    rows={4}
                                                    placeholder={t('dialogs.orderDetails.internalNotesPlaceholder')}
                                                    value={tempShippingNotes}
                                                    onChange={(e) => setTempShippingNotes(e.target.value)}
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        disabled={isSavingShippingNotes}
                                                        onClick={async () => {
                                                            try {
                                                                setIsSavingShippingNotes(true);
                                                                const updateData = {
                                                                    shippingNotes: tempShippingNotes
                                                                };

                                                                const response = await updateOrder(
                                                                    selectedOrder.key || selectedOrder.id,
                                                                    updateData
                                                                );

                                                                if (response.success || response) {
                                                                    toast.success(t('toasts.orderNotesUpdated'));

                                                                    // Update orders in state instead of full reload
                                                                    updateOrderInState(selectedOrder.id, updateData);

                                                                    // Exit edit mode
                                                                    setIsEditingShippingNotes(false);
                                                                    setTempShippingNotes('');
                                                                } else {
                                                                    console.log(response);
                                                                    toast.error(t('toasts.updateOrderNotesFailed'));
                                                                }
                                                            } catch (error) {
                                                                console.error('Error updating order notes:', error);
                                                                toast.error(t('toasts.updateOrderNotesFailed'));
                                                            } finally {
                                                                setIsSavingShippingNotes(false);
                                                            }
                                                        }}>
                                                        {isSavingShippingNotes ? (
                                                            <>
                                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                                                {t('actions.saving')}
                                                            </>
                                                        ) : (
                                                            t('actions.saveNotes')
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setIsEditingShippingNotes(false);
                                                            setTempShippingNotes('');
                                                        }}>
                                                        {t('actions.cancel')}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="payment" className="mt-4 space-y-4">
                                <Card className="border-none shadow-none p-0 m-0 bg-background">
                                    <CardHeader className="flex flex-row items-center justify-between px-0">
                                        <h3 className="font-semibold">{t('details.payment.title')}</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (isEditingPayment) {
                                                    setIsEditingPayment(false);
                                                    setEditPaymentData({
                                                        paymentStatus: '',
                                                        paymentMethod: ''
                                                    });
                                                } else {
                                                    setIsEditingPayment(true);
                                                    setEditPaymentData({
                                                        paymentStatus: selectedOrder.paymentStatus || 'pending',
                                                        paymentMethod: selectedOrder.paymentMethod || 'none'
                                                    });
                                                }
                                            }}>
                                            {isEditingPayment ? t('actions.cancel') : t('actions.editPayment')}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4 px-0">
                                        {!isEditingPayment ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="font-medium text-gray-500 text-sm">
                                                            {t('details.payment.paymentMethod')}
                                                        </label>
                                                        <p className="text-sm">
                                                            {formatPaymentMethod(selectedOrder.paymentMethod || 'none')}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="font-medium text-gray-500 text-sm">
                                                            {t('details.payment.paymentStatus')}
                                                        </label>
                                                        <Badge
                                                            className="uppercase font-semibold"
                                                            variant={
                                                                selectedOrder.paymentStatus === 'paid'
                                                                    ? 'default'
                                                                    : 'outline'
                                                            }>
                                                            {selectedOrder.paymentStatus || 'pending'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {selectedOrder.eupagoReference && (
                                                    <div className="border-t pt-4 mt-4">
                                                        <label className="font-medium text-gray-500 text-sm block mb-2">
                                                            {t('details.payment.eupagoInfo')}
                                                        </label>
                                                        <div className="space-y-2 border p-3 rounded-md">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">{t('details.payment.method')}:</span>
                                                                <span className="text-sm font-medium">
                                                                    {selectedOrder.eupagoMethod === 'mbway'
                                                                        ? t('details.payment.mbway')
                                                                        : t('details.payment.multibanco')}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">
                                                                    {t('details.payment.reference')}:
                                                                </span>
                                                                <span className="text-sm font-mono font-medium">
                                                                    {selectedOrder.eupagoReference}
                                                                </span>
                                                            </div>
                                                            {selectedOrder.eupagoEntity && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-gray-600">
                                                                        {t('details.payment.entity')}:
                                                                    </span>
                                                                    <span className="text-sm font-mono font-medium">
                                                                        {selectedOrder.eupagoEntity}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {selectedOrder.eupagoTransactionId && (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm text-gray-600">
                                                                        {t('details.payment.transactionId')}:
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-mono font-medium">
                                                                            {selectedOrder.eupagoTransactionId.length >
                                                                            12
                                                                                ? `${selectedOrder.eupagoTransactionId.substring(0, 12)}...`
                                                                                : selectedOrder.eupagoTransactionId}
                                                                        </span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0"
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(
                                                                                    selectedOrder.eupagoTransactionId
                                                                                );
                                                                                toast.success(t('toasts.transactionIdCopied'));
                                                                            }}
                                                                            title={t('dialogs.orderDetails.copyTransactionId')}>
                                                                            <Copy className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {selectedOrder.eupagoMobile && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-gray-600">
                                                                        {t('details.payment.mobile')}:
                                                                    </span>
                                                                    <span className="text-sm font-mono font-medium">
                                                                        {selectedOrder.eupagoMobile}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {selectedOrder.paymentStatus === 'paid' &&
                                                                selectedOrder.eupagoTransactionFee && (
                                                                    <div className="flex justify-between border-t pt-2 mt-2">
                                                                        <span className="text-sm text-gray-600">
                                                                            {t('details.payment.transactionFee')}:
                                                                        </span>
                                                                        <span className="text-sm font-medium text-orange-600">
                                                                            -
                                                                            {formatPrice(
                                                                                selectedOrder.eupagoTransactionFee
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            // Edit Mode
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="payment-method">{t('details.payment.paymentMethod')}</Label>
                                                        <Select
                                                            value={editPaymentData.paymentMethod}
                                                            onValueChange={(value) =>
                                                                setEditPaymentData({
                                                                    ...editPaymentData,
                                                                    paymentMethod: value
                                                                })
                                                            }>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {PAYMENT_METHODS.map((method) => (
                                                                    <SelectItem key={method.value} value={method.value}>
                                                                        {method.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="payment-status">{t('details.payment.paymentStatus')}</Label>
                                                        <Select
                                                            value={editPaymentData.paymentStatus}
                                                            onValueChange={(value) =>
                                                                setEditPaymentData({
                                                                    ...editPaymentData,
                                                                    paymentStatus: value
                                                                })
                                                            }>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {PAYMENT_STATUS.map((status) => (
                                                                    <SelectItem key={status.value} value={status.value}>
                                                                        {status.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        onClick={async () => {
                                                            try {
                                                                setIsSubmitting(true);

                                                                const updateData = {
                                                                    paymentStatus: editPaymentData.paymentStatus,
                                                                    paymentMethod: editPaymentData.paymentMethod
                                                                };

                                                                const updateResponse = await updateOrder(
                                                                    selectedOrder.key || selectedOrder.id,
                                                                    updateData
                                                                );

                                                                if (updateResponse.success) {
                                                                    // Send admin email if payment status changed to 'paid'
                                                                    if (
                                                                        editPaymentData.paymentStatus === 'paid' &&
                                                                        selectedOrder.paymentStatus !== 'paid'
                                                                    ) {
                                                                        try {
                                                                            const { sendOrderAdminConfirmationEmail } =
                                                                                await import('@/lib/server/email');
                                                                            const adminEmail = storeSettings?.siteEmail;

                                                                            if (adminEmail) {
                                                                                await sendOrderAdminConfirmationEmail(
                                                                                    adminEmail,
                                                                                    {
                                                                                        customerEmail:
                                                                                            selectedOrder.customer
                                                                                                ?.email ||
                                                                                            selectedOrder.cst_email,
                                                                                        customerName:
                                                                                            `${selectedOrder.customer?.firstName} ${selectedOrder.customer?.lastName}`.trim() ||
                                                                                            selectedOrder.cst_name,
                                                                                        orderId:
                                                                                            selectedOrder.orderId ||
                                                                                            selectedOrder.id,
                                                                                        orderDate: new Date(
                                                                                            selectedOrder.createdAt
                                                                                        ).toLocaleDateString('pt-PT'),
                                                                                        items:
                                                                                            selectedOrder.items || [],
                                                                                        subtotal:
                                                                                            selectedOrder.subtotal || 0,
                                                                                        shippingCost:
                                                                                            selectedOrder.shippingCost ||
                                                                                            0,
                                                                                        discountAmount:
                                                                                            selectedOrder.discountAmount ||
                                                                                            0,
                                                                                        vatAmount:
                                                                                            selectedOrder.vatAmount ||
                                                                                            0,
                                                                                        total:
                                                                                            selectedOrder.finalTotal ||
                                                                                            selectedOrder.total,
                                                                                        shippingAddress:
                                                                                            selectedOrder.shipping_address ||
                                                                                            selectedOrder.shippingAddress ||
                                                                                            {}
                                                                                    }
                                                                                );
                                                                            }
                                                                        } catch (emailError) {
                                                                            console.warn(
                                                                                'Failed to send admin notification:',
                                                                                emailError
                                                                            );
                                                                        }
                                                                    }

                                                                    toast.success(t('toasts.paymentDetailsUpdated'));

                                                                    // Update orders in state instead of full reload
                                                                    updateOrderInState(selectedOrder.id, updateData);

                                                                    // Exit edit mode
                                                                    setIsEditingPayment(false);
                                                                    setEditPaymentData({
                                                                        paymentStatus: '',
                                                                        paymentMethod: ''
                                                                    });
                                                                } else {
                                                                    toast.error(t('toasts.updatePaymentDetailsFailed'));
                                                                }
                                                            } catch (error) {
                                                                console.error('Error updating payment:', error);
                                                                toast.error(t('toasts.updatePaymentDetailsFailed'));
                                                            } finally {
                                                                setIsSubmitting(false);
                                                            }
                                                        }}
                                                        disabled={isSubmitting}>
                                                        {isSubmitting ? (
                                                            <>
                                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                                                {t('actions.updating')}
                                                            </>
                                                        ) : (
                                                            t('actions.updatePayment')
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setIsEditingPayment(false);
                                                            setEditPaymentData({
                                                                paymentStatus: '',
                                                                paymentMethod: ''
                                                            });
                                                        }}>
                                                        {t('actions.cancel')}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Order Summary with Breakdown */}
                                        <div className="border-t pt-4 mt-4">
                                            <h4 className="font-semibold mb-3 text-sm">{t('details.payment.orderSummary')}</h4>
                                            <div className="space-y-2">
                                                {/* Subtotal */}
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">{t('details.payment.subtotal')}:</span>
                                                    <span className="font-medium">
                                                        {formatPrice(selectedOrder.subtotal || 0)}
                                                    </span>
                                                </div>

                                                {/* Shipping Cost */}
                                                {selectedOrder.shippingCost > 0 && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">{t('details.payment.shipping')}:</span>
                                                        <span className="font-medium">
                                                            {formatPrice(selectedOrder.shippingCost)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Discount */}
                                                {selectedOrder.discountAmount > 0 && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">{t('details.payment.discount')}:</span>
                                                        <span className="font-medium text-green-600">
                                                            -{formatPrice(selectedOrder.discountAmount)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* VAT Information */}
                                                {selectedOrder.vatEnabled && selectedOrder.vatAmount > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="font-medium text-gray-600">
                                                                VAT ({selectedOrder.vatPercentage || 0}%):
                                                            </span>
                                                            <span className="font-semibold">
                                                                -{formatPrice(selectedOrder.vatAmount)}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-lime-700">
                                                            {selectedOrder.vatIncluded
                                                                ? t('details.payment.vatIncludedText')
                                                                : t('details.payment.vatAddedText')}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Totals */}
                                                <div className="space-y-1 flex flex-col w-full"></div>
                                                <div className="flex justify-between border-t pt-2 text-lg">
                                                    <span className="font-bold">{t('details.payment.orderTotal')}:</span>
                                                    <span className="font-bold">
                                                        {formatPrice(selectedOrder.finalTotal || selectedOrder.total)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-base text-gray-600">
                                                    <span className="font-bold">
                                                        {t('details.payment.revenue')} <span className="text-xs uppercase">({t('details.payment.incFees')})</span>:
                                                    </span>
                                                    <span className="font-bold">
                                                        {formatPrice(
                                                            (
                                                                (parseFloat(
                                                                    selectedOrder.finalTotal || selectedOrder.total
                                                                ) || 0) -
                                                                (parseFloat(selectedOrder.eupagoTransactionFee) || 0) -
                                                                (parseFloat(selectedOrder.vatAmount) || 0)
                                                            ).toFixed(2)
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="status" className="mt-4 space-y-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <h3 className="font-semibold">{t('details.status.title')}</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (isEditingStatus) {
                                                    setIsEditingStatus(false);
                                                    setEditStatusData({
                                                        status: '',
                                                        tracking: '',
                                                        sendEmail: true,
                                                        sendSms: false,
                                                        smsPhone: '',
                                                        smsPhoneSource: 'order'
                                                    });
                                                    setUserPhoneData(null);
                                                    setShowPhoneSelector(false);
                                                } else {
                                                    setIsEditingStatus(true);
                                                    setEditStatusData({
                                                        status: selectedOrder.status,
                                                        tracking: selectedOrder.tracking || '',
                                                        sendEmail: true,
                                                        sendSms: false,
                                                        smsPhone: selectedOrder.customer?.phone || '',
                                                        smsPhoneSource: 'order'
                                                    });
                                                    setUserPhoneData(null);
                                                    setShowPhoneSelector(false);
                                                }
                                            }}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            {isEditingStatus ? t('actions.cancel') : t('actions.editStatus')}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {!isEditingStatus ? (
                                            // View Mode
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="font-medium text-gray-500 text-sm">
                                                            {t('details.status.currentStatus')}
                                                        </label>
                                                        <div className="mt-1">
                                                            <Badge
                                                                variant={
                                                                    selectedOrder.status === 'delivered'
                                                                        ? 'default'
                                                                        : 'outline'
                                                                }>
                                                                {
                                                                    ORDER_STATUS.find(
                                                                        (s) => s.value === selectedOrder.status
                                                                    )?.label
                                                                }
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="font-medium text-gray-500 text-sm">
                                                            {t('details.status.orderDate')}
                                                        </label>
                                                        <p className="mt-1 text-sm">
                                                            {formatDate(selectedOrder.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedOrder.tracking && (
                                                    <div>
                                                        <label className="font-medium text-gray-500 text-sm">
                                                            {t('details.status.trackingNumber')}
                                                        </label>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <p className="rounded bg-background px-2 py-1 font-mono text-sm">
                                                                {selectedOrder.tracking}
                                                            </p>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const trackingUrl = generateTrackingUrl(
                                                                        selectedOrder.tracking
                                                                    );
                                                                    window.open(trackingUrl, '_blank');
                                                                }}>
                                                                {t('details.status.trackPackage')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            // Edit Mode
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="font-medium text-gray-700 text-sm">
                                                            {t('details.status.orderStatus')}
                                                        </label>
                                                        <Select
                                                            value={editStatusData.status}
                                                            onValueChange={(value) =>
                                                                setEditStatusData({
                                                                    ...editStatusData,
                                                                    status: value
                                                                })
                                                            }>
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue placeholder={t('dialogs.editStatus.selectStatus')} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {ORDER_STATUS.map((status) => (
                                                                    <SelectItem key={status.value} value={status.value}>
                                                                        {status.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <label className="font-medium text-gray-700 text-sm">
                                                            Tracking Number
                                                        </label>
                                                        <Input
                                                            placeholder={t('dialogs.editStatus.trackingOptional')}
                                                            value={editStatusData.tracking}
                                                            onChange={(e) => {
                                                                const sanitized = e.target.value
                                                                    .replace(/\s+/g, '')
                                                                    .replace(/[^A-Z0-9]/gi, '')
                                                                    .toUpperCase();
                                                                setEditStatusData({
                                                                    ...editStatusData,
                                                                    tracking: sanitized
                                                                });
                                                            }}
                                                            className="mt-1"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="sendEmailUpdate"
                                                        checked={editStatusData.sendEmail}
                                                        onCheckedChange={(checked) =>
                                                            setEditStatusData({
                                                                ...editStatusData,
                                                                sendEmail: checked
                                                            })
                                                        }
                                                    />
                                                    <label htmlFor="sendEmailUpdate" className="font-medium text-sm">
                                                        {t('details.status.sendEmailToCustomer')}
                                                        {editStatusData.tracking && editStatusData.sendEmail && (
                                                            <span className="block text-gray-500 text-xs">
                                                                ({t('details.status.includeTrackingInfo')})
                                                            </span>
                                                        )}
                                                    </label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="sendSmsUpdate"
                                                        checked={editStatusData.sendSms}
                                                        onCheckedChange={async (checked) => {
                                                            setEditStatusData({
                                                                ...editStatusData,
                                                                sendSms: checked
                                                            });

                                                            // Fetch user phone when SMS is checked
                                                            if (checked && selectedOrder?.customer?.email) {
                                                                const userData = await fetchUserPhoneForSMS(
                                                                    selectedOrder.customer.email,
                                                                    selectedOrder.customer.phone
                                                                );

                                                                setUserPhoneData(userData);

                                                                // Determine if we need to show phone selector
                                                                const orderPhone = selectedOrder.customer?.phone || '';
                                                                const userPhone = userData?.phone || '';

                                                                if (
                                                                    userPhone &&
                                                                    orderPhone &&
                                                                    userPhone !== orderPhone
                                                                ) {
                                                                    // Different phones - show selector
                                                                    setShowPhoneSelector(true);
                                                                    setEditStatusData((prev) => ({
                                                                        ...prev,
                                                                        smsPhone: orderPhone,
                                                                        smsPhoneSource: 'order'
                                                                    }));
                                                                } else {
                                                                    // Same or no user phone - show input to confirm
                                                                    setShowPhoneSelector(false);
                                                                    setEditStatusData((prev) => ({
                                                                        ...prev,
                                                                        smsPhone: orderPhone,
                                                                        smsPhoneSource: 'order'
                                                                    }));
                                                                }
                                                            } else {
                                                                setUserPhoneData(null);
                                                                setShowPhoneSelector(false);
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor="sendSmsUpdate" className="font-medium text-sm">
                                                        {t('details.status.sendSmsToCustomer')}
                                                    </label>
                                                </div>

                                                {/* Phone verification UI */}
                                                {editStatusData.sendSms && (
                                                    <div className="mt-3 p-3 border border-border rounded-lg bg-muted/50">
                                                        {isLoadingUserPhone ? (
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                {t('dialogs.editStatus.verifyingPhone')}
                                                            </div>
                                                        ) : showPhoneSelector && userPhoneData?.phone ? (
                                                            <div className="space-y-3">
                                                                <p className="text-sm font-medium">{t('dialogs.editStatus.selectSmsPhone')}</p>
                                                                <div className="space-y-2">
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name="smsPhone"
                                                                            checked={
                                                                                editStatusData.smsPhoneSource ===
                                                                                'order'
                                                                            }
                                                                            onChange={() =>
                                                                                setEditStatusData({
                                                                                    ...editStatusData,
                                                                                    smsPhone:
                                                                                        selectedOrder.customer?.phone ||
                                                                                        '',
                                                                                    smsPhoneSource: 'order'
                                                                                })
                                                                            }
                                                                            className="h-4 w-4"
                                                                        />
                                                                        <span className="text-sm">
                                                                            {t('details.status.orderPhone')}: {' '}
                                                                            <strong>
                                                                                {selectedOrder.customer?.phone}
                                                                            </strong>
                                                                        </span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name="smsPhone"
                                                                            checked={
                                                                                editStatusData.smsPhoneSource === 'user'
                                                                            }
                                                                            onChange={() =>
                                                                                setEditStatusData({
                                                                                    ...editStatusData,
                                                                                    smsPhone: userPhoneData.phone,
                                                                                    smsPhoneSource: 'user'
                                                                                })
                                                                            }
                                                                            className="h-4 w-4"
                                                                        />
                                                                        <span className="text-sm">
                                                                            {t('details.status.userAccountPhone')}: {' '}
                                                                            <strong>{userPhoneData.phone}</strong>
                                                                            {userPhoneData.displayName && (
                                                                                <span className="text-muted-foreground">
                                                                                    {' '}
                                                                                    ({userPhoneData.displayName})
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </label>
                                                                    <label className="flex items-start gap-2 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name="smsPhone"
                                                                            checked={
                                                                                editStatusData.smsPhoneSource ===
                                                                                'manual'
                                                                            }
                                                                            onChange={() =>
                                                                                setEditStatusData({
                                                                                    ...editStatusData,
                                                                                    smsPhone: '',
                                                                                    smsPhoneSource: 'manual'
                                                                                })
                                                                            }
                                                                            className="h-4 w-4 mt-1"
                                                                        />
                                                                        <span className="text-sm">{t('details.status.enterManually')}</span>
                                                                    </label>
                                                                    {editStatusData.smsPhoneSource === 'manual' && (
                                                                        <Input
                                                                            type="tel"
                                                                            placeholder={t('dialogs.editStatus.phonePlaceholder')}
                                                                            value={editStatusData.smsPhone}
                                                                            onChange={(e) =>
                                                                                setEditStatusData({
                                                                                    ...editStatusData,
                                                                                    smsPhone: e.target.value
                                                                                })
                                                                            }
                                                                            className="mt-2"
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-medium">
                                                                    {t('details.status.confirmSmsPhone')}
                                                                </label>
                                                                <Input
                                                                    type="tel"
                                                                    placeholder={t('dialogs.editStatus.phonePlaceholder')}
                                                                    value={editStatusData.smsPhone}
                                                                    onChange={(e) =>
                                                                        setEditStatusData({
                                                                            ...editStatusData,
                                                                            smsPhone: e.target.value
                                                                        })
                                                                    }
                                                                />
                                                                {!selectedOrder.customer?.phone && (
                                                                    <p className="text-xs text-amber-600">
                                                                        {t('details.status.noPhoneInOrder')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        onClick={async () => {
                                                            // Check if status has actually changed
                                                            if (selectedOrder.status === editStatusData.status) {
                                                                toast.error(t('toasts.noChangesDetected'));
                                                                return;
                                                            }

                                                            try {
                                                                setIsUpdatingStatus(true);

                                                                // Update order with new status and tracking
                                                                const updateData = {
                                                                    status: editStatusData.status
                                                                };
                                                                if (editStatusData.tracking.trim()) {
                                                                    // Sanitize tracking number: remove spaces, uppercase, alphanumeric only
                                                                    const sanitizedTracking = editStatusData.tracking
                                                                        .replace(/\s+/g, '')
                                                                        .replace(/[^A-Z0-9]/gi, '')
                                                                        .toUpperCase();
                                                                    updateData.tracking = sanitizedTracking;
                                                                }

                                                                const updateResponse = await updateOrder(
                                                                    selectedOrder.key || selectedOrder.id,
                                                                    updateData
                                                                );

                                                                if (updateResponse.success) {
                                                                    // Send email notification if requested
                                                                    if (editStatusData.sendEmail) {
                                                                        try {
                                                                            const emailResult =
                                                                                await sendOrderUpdateEmail(
                                                                                    selectedOrder.customer.email,
                                                                                    {
                                                                                        customerName:
                                                                                            `${selectedOrder?.customer?.firstName} ${selectedOrder?.customer?.lastName}`.trim(),
                                                                                        orderId: selectedOrder.id,
                                                                                        orderDate:
                                                                                            selectedOrder.createdAt,
                                                                                        items:
                                                                                            selectedOrder.items || [],
                                                                                        subtotal: parseFloat(
                                                                                            selectedOrder.subtotal || 0
                                                                                        ),
                                                                                        shippingCost: parseFloat(
                                                                                            selectedOrder.shippingCost ||
                                                                                                0
                                                                                        ),
                                                                                        discountAmount: parseFloat(
                                                                                            selectedOrder.discountAmount ||
                                                                                                0
                                                                                        ),
                                                                                        vatEnabled:
                                                                                            selectedOrder.vatEnabled ||
                                                                                            false,
                                                                                        vatPercentage: parseFloat(
                                                                                            selectedOrder.vatPercentage ||
                                                                                                0
                                                                                        ),
                                                                                        vatAmount: parseFloat(
                                                                                            selectedOrder.vatAmount || 0
                                                                                        ),
                                                                                        vatIncluded:
                                                                                            selectedOrder.vatIncluded ||
                                                                                            false,
                                                                                        total: parseFloat(
                                                                                            selectedOrder.finalTotal ||
                                                                                                selectedOrder.total ||
                                                                                                0
                                                                                        ),
                                                                                        currency:
                                                                                            selectedOrder.currency ||
                                                                                            'EUR',
                                                                                        paymentMethod:
                                                                                            selectedOrder.paymentMethod ||
                                                                                            null,
                                                                                        paymentStatus:
                                                                                            selectedOrder.paymentStatus ||
                                                                                            'pending',
                                                                                        shippingAddress:
                                                                                            selectedOrder.shipping_address || {
                                                                                                streetAddress:
                                                                                                    selectedOrder
                                                                                                        .customer
                                                                                                        ?.streetAddress ||
                                                                                                    '',
                                                                                                apartmentUnit:
                                                                                                    selectedOrder
                                                                                                        .customer
                                                                                                        ?.apartmentUnit ||
                                                                                                    '',
                                                                                                city:
                                                                                                    selectedOrder
                                                                                                        .customer
                                                                                                        ?.city || '',
                                                                                                state:
                                                                                                    selectedOrder
                                                                                                        .customer
                                                                                                        ?.state || '',
                                                                                                zipCode:
                                                                                                    selectedOrder
                                                                                                        .customer
                                                                                                        ?.zipCode || '',
                                                                                                country:
                                                                                                    selectedOrder
                                                                                                        .customer
                                                                                                        ?.country || '',
                                                                                                countryIso:
                                                                                                    selectedOrder
                                                                                                        .customer
                                                                                                        ?.countryIso ||
                                                                                                    ''
                                                                                            },
                                                                                        status: editStatusData.status,
                                                                                        trackingNumber:
                                                                                            editStatusData.tracking.trim() ||
                                                                                            null,
                                                                                        trackingUrl:
                                                                                            editStatusData.tracking.trim()
                                                                                                ? generateTrackingUrl(
                                                                                                      editStatusData.tracking.trim()
                                                                                                  )
                                                                                                : null,
                                                                                        estimatedDelivery: null,
                                                                                        deliveryNotes:
                                                                                            selectedOrder.deliveryNotes ||
                                                                                            null,
                                                                                        customMessage: null
                                                                                    },
                                                                                    'pt' // Add locale parameter for consistency
                                                                                );

                                                                            if (emailResult.success) {
                                                                                toast.success(t('toasts.statusUpdatedCustomerNotified'));
                                                                            } else {
                                                                                toast.warning(t('toasts.statusUpdatedEmailFailed'));
                                                                            }
                                                                        } catch (emailError) {
                                                                            console.error('Email error:', emailError);
                                                                            toast.warning(t('toasts.statusUpdatedEmailFailed'));
                                                                        }
                                                                    } else {
                                                                        toast.success(t('toasts.statusUpdated'));
                                                                    }

                                                                    // Update orders in state instead of full reload
                                                                    updateOrderInState(selectedOrder.id, updateData);

                                                                    // Exit edit mode
                                                                    setIsEditingStatus(false);
                                                                    setEditStatusData({
                                                                        status: '',
                                                                        tracking: '',
                                                                        sendEmail: true,
                                                                        sendSms: false,
                                                                        smsPhone: '',
                                                                        smsPhoneSource: 'order'
                                                                    });
                                                                    setUserPhoneData(null);
                                                                    setShowPhoneSelector(false);
                                                                } else {
                                                                    toast.error(t('toasts.updateOrderStatusFailed'));
                                                                }
                                                            } catch (error) {
                                                                console.error('Error updating status:', error);
                                                                toast.error(t('toasts.updateOrderStatusFailed'));
                                                            } finally {
                                                                setIsUpdatingStatus(false);
                                                            }
                                                        }}
                                                        disabled={!editStatusData.status || isUpdatingStatus}>
                                                        {isUpdatingStatus ? (
                                                            <>
                                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                                                {t('actions.updating')}
                                                            </>
                                                        ) : (
                                                            t('actions.updateStatus')
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setIsEditingStatus(false);
                                                            setEditStatusData({
                                                                status: '',
                                                                tracking: '',
                                                                sendEmail: true,
                                                                sendSms: false,
                                                                smsPhone: '',
                                                                smsPhoneSource: 'order'
                                                            });
                                                            setUserPhoneData(null);
                                                            setShowPhoneSelector(false);
                                                        }}>
                                                        {t('actions.cancel')}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Status Dialog - Standalone */}
            <Dialog
                open={isEditingStatus}
                onOpenChange={(open) => {
                    setIsEditingStatus(open);
                    if (!open) {
                        // Reset form when closing
                        setEditStatusData({
                            status: '',
                            tracking: '',
                            sendEmail: true,
                            sendSms: false,
                            smsPhone: '',
                            smsPhoneSource: 'order'
                        });
                        setUserPhoneData(null);
                        setShowPhoneSelector(false);
                    } else if (selectedOrder) {
                        // Initialize form with current order data when opening
                        setEditStatusData({
                            status: selectedOrder.status,
                            tracking: selectedOrder.tracking || '',
                            sendEmail: true,
                            sendSms: false,
                            smsPhone: selectedOrder.customer?.phone || '',
                            smsPhoneSource: 'order'
                        });
                        setUserPhoneData(null);
                        setShowPhoneSelector(false);
                    }
                }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dialogs.editStatus.title')}</DialogTitle>
                        <DialogDescription>
                            {t('dialogs.editStatus.description', { orderId: selectedOrder?.id || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="status">{t('details.status.orderStatus')}</Label>
                                <Select
                                    value={editStatusData.status}
                                    onValueChange={(value) =>
                                        setEditStatusData({
                                            ...editStatusData,
                                            status: value
                                        })
                                    }>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={t('dialogs.editStatus.selectStatus')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ORDER_STATUS.map((status) => (
                                            <SelectItem key={status.value} value={status.value}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="tracking">{t('dialogs.editStatus.trackingOptionalLabel')}</Label>
                                <Input
                                    id="tracking"
                                    placeholder={t('dialogs.editStatus.tracking')}
                                    value={editStatusData.tracking}
                                    onChange={(e) =>
                                        setEditStatusData({
                                            ...editStatusData,
                                            tracking: e.target.value
                                        })
                                    }
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sendEmail"
                                checked={editStatusData.sendEmail}
                                onCheckedChange={(checked) =>
                                    setEditStatusData({
                                        ...editStatusData,
                                        sendEmail: checked
                                    })
                                }
                            />
                            <label
                                htmlFor="sendEmail"
                                className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {t('details.status.sendEmailToCustomer')}
                                {editStatusData.tracking && editStatusData.sendEmail && (
                                    <span className="block text-muted-foreground text-xs">
                                        ({t('details.status.includeTrackingInfo')})
                                    </span>
                                )}
                            </label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sendSms"
                                checked={editStatusData.sendSms || false}
                                onCheckedChange={(checked) =>
                                    setEditStatusData({
                                        ...editStatusData,
                                        sendSms: checked
                                    })
                                }
                            />
                            <label
                                htmlFor="sendSms"
                                className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {t('details.status.sendSmsToCustomer')}
                                {editStatusData.tracking && editStatusData.sendSms && (
                                    <span className="block text-muted-foreground text-xs">
                                        ({t('details.status.includeTrackingInfo')})
                                    </span>
                                )}
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsEditingStatus(false);
                                    setEditStatusData({
                                        status: '',
                                        tracking: '',
                                        sendEmail: true,
                                        sendSms: false,
                                        smsPhone: '',
                                        smsPhoneSource: 'order'
                                    });
                                    setUserPhoneData(null);
                                    setShowPhoneSelector(false);
                                }}
                                disabled={isUpdatingStatus}>
                                {t('actions.cancel')}
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!selectedOrder) return;

                                    // Check if status has actually changed
                                    if (selectedOrder.status === editStatusData.status) {
                                        toast.error(t('toasts.noChangesDetected'));
                                        return;
                                    }

                                    try {
                                        setIsUpdatingStatus(true);

                                        const updateData = {
                                            status: editStatusData.status
                                        };
                                        if (editStatusData.tracking.trim()) {
                                            updateData.tracking = editStatusData.tracking.trim();
                                        }

                                        // Update order status first
                                        const updateResponse = await updateOrder(
                                            selectedOrder.key || selectedOrder.id,
                                            updateData
                                        );

                                        if (!updateResponse.success) {
                                            toast.error(t('toasts.updateOrderStatusFailed'));
                                            return;
                                        }

                                        let emailSent = false;
                                        let smsSent = false;

                                        // Send email notification if requested
                                        if (editStatusData.sendEmail) {
                                            try {
                                                const emailResult = await sendOrderUpdateEmail(
                                                    selectedOrder.customer.email,
                                                    {
                                                        customerName:
                                                            `${selectedOrder?.customer?.firstName} ${selectedOrder?.customer?.lastName}`.trim(),
                                                        orderId: selectedOrder.id,
                                                        orderDate: selectedOrder.createdAt,
                                                        items: selectedOrder.items || [],
                                                        subtotal: parseFloat(selectedOrder.subtotal || 0),
                                                        shippingCost: parseFloat(selectedOrder.shippingCost || 0),
                                                        discountAmount: parseFloat(selectedOrder.discountAmount || 0),
                                                        vatEnabled: selectedOrder.vatEnabled || false,
                                                        vatPercentage: parseFloat(selectedOrder.vatPercentage || 0),
                                                        vatAmount: parseFloat(selectedOrder.vatAmount || 0),
                                                        vatIncluded: selectedOrder.vatIncluded || false,
                                                        total: parseFloat(
                                                            selectedOrder.finalTotal || selectedOrder.total || 0
                                                        ),
                                                        currency: selectedOrder.currency || 'EUR',
                                                        paymentMethod: selectedOrder.paymentMethod || null,
                                                        paymentStatus: selectedOrder.paymentStatus || 'pending',
                                                        shippingAddress: selectedOrder.shipping_address || {
                                                            streetAddress: selectedOrder.customer?.streetAddress || '',
                                                            apartmentUnit: selectedOrder.customer?.apartmentUnit || '',
                                                            city: selectedOrder.customer?.city || '',
                                                            state: selectedOrder.customer?.state || '',
                                                            zipCode: selectedOrder.customer?.zipCode || '',
                                                            country: selectedOrder.customer?.country || '',
                                                            countryIso: selectedOrder.customer?.countryIso || ''
                                                        },
                                                        status: editStatusData.status,
                                                        trackingNumber: editStatusData.tracking.trim() || null,
                                                        trackingUrl: editStatusData.tracking.trim()
                                                            ? generateTrackingUrl(editStatusData.tracking.trim())
                                                            : null,
                                                        estimatedDelivery: null,
                                                        deliveryNotes: selectedOrder.deliveryNotes || null,
                                                        customMessage: null
                                                    },
                                                    'pt'
                                                );

                                                if (emailResult?.success) {
                                                    emailSent = true;
                                                }
                                            } catch (emailError) {
                                                console.error('Email error:', emailError);
                                            }
                                        }

                                        // Send SMS notification if requested
                                        if (editStatusData.sendSms) {
                                            // Validate phone number
                                            const smsPhone = editStatusData.smsPhone || selectedOrder.customer?.phone;
                                            if (!smsPhone) {
                                                toast.warning(t('toasts.statusUpdatedSmsSkippedNoPhone'));
                                            } else {
                                                try {
                                                    const { sendOrderStatusSMS } = await import('@/lib/server/sms');
                                                    const { getSettings } = await import('@/lib/server/settings');

                                                    const { adminSiteSettings } = await getSettings();
                                                    const baseUrl =
                                                        adminSiteSettings?.baseUrl ||
                                                        process.env.NEXT_PUBLIC_BASE_URL ||
                                                        'https://yourdomain.com';

                                                    const smsOrderData = {
                                                        id: selectedOrder.id,
                                                        status: editStatusData.status,
                                                        trackingNumber:
                                                            editStatusData.tracking.trim() ||
                                                            selectedOrder.trackingNumber ||
                                                            null,
                                                        customer: {
                                                            firstName: selectedOrder.customer?.firstName || 'Customer',
                                                            phone: smsPhone
                                                        }
                                                    };

                                                    const smsResult = await sendOrderStatusSMS(smsOrderData, baseUrl);

                                                    if (smsResult?.success) {
                                                        smsSent = true;
                                                    }
                                                } catch (smsError) {
                                                    console.error('SMS error:', smsError);
                                                }
                                            }
                                        }

                                        // Display appropriate success message
                                        if (emailSent && smsSent) {
                                            toast.success(t('toasts.statusUpdatedEmailSms'));
                                        } else if (emailSent) {
                                            toast.success(t('toasts.statusUpdatedEmail'));
                                        } else if (smsSent) {
                                            toast.success(t('toasts.statusUpdatedSms'));
                                        } else if (editStatusData.sendEmail || editStatusData.sendSms) {
                                            toast.warning(t('toasts.orderUpdatedNotificationsFailed'));
                                        } else {
                                            toast.success(t('toasts.statusUpdated'));
                                        }

                                        updateOrderInState(selectedOrder.id, updateData);
                                        setIsEditingStatus(false);
                                        setEditStatusData({
                                            status: '',
                                            tracking: '',
                                            sendEmail: true,
                                            sendSms: false,
                                            smsPhone: '',
                                            smsPhoneSource: 'order'
                                        });
                                        setUserPhoneData(null);
                                        setShowPhoneSelector(false);
                                    } catch (error) {
                                        console.error('Error updating status:', error);
                                        toast.error(t('toasts.updateOrderStatusFailed'));
                                    } finally {
                                        setIsUpdatingStatus(false);
                                    }
                                }}
                                disabled={!editStatusData.status || isUpdatingStatus}>
                                {isUpdatingStatus ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('actions.updating')}
                                    </>
                                ) : (
                                    t('actions.updateStatus')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Payment Dialog - Standalone */}
            <Dialog open={isEditingPayment} onOpenChange={setIsEditingPayment}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dialogs.editPayment.title')}</DialogTitle>
                        <DialogDescription>
                            {t('dialogs.editPayment.description', { orderId: selectedOrder?.id || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="paymentStatus">{t('details.payment.paymentStatus')}</Label>
                                <Select
                                    value={editPaymentData.paymentStatus}
                                    onValueChange={(value) =>
                                        setEditPaymentData({
                                            ...editPaymentData,
                                            paymentStatus: value
                                        })
                                    }>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={t('dialogs.editPayment.selectPaymentStatus')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_STATUS.map((status) => (
                                            <SelectItem key={status.value} value={status.value}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="paymentMethod">{t('details.payment.paymentMethod')}</Label>
                                <Select
                                    value={editPaymentData.paymentMethod}
                                    onValueChange={(value) =>
                                        setEditPaymentData({
                                            ...editPaymentData,
                                            paymentMethod: value
                                        })
                                    }>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={t('dialogs.editPayment.selectPaymentMethod')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map((method) => (
                                            <SelectItem key={method.value} value={method.value}>
                                                {method.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsEditingPayment(false);
                                    setEditPaymentData({
                                        paymentStatus: '',
                                        paymentMethod: ''
                                    });
                                }}
                                disabled={isUpdatingStatus}>
                                {t('actions.cancel')}
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!selectedOrder) return;

                                    try {
                                        setIsUpdatingStatus(true);

                                        const updateData = {
                                            paymentStatus: editPaymentData.paymentStatus,
                                            paymentMethod: editPaymentData.paymentMethod
                                        };

                                        const updateResponse = await updateOrder(
                                            selectedOrder.key || selectedOrder.id,
                                            updateData
                                        );

                                        if (updateResponse.success) {
                                            toast.success(t('toasts.paymentInformationUpdated'));
                                            updateOrderInState(selectedOrder.id, updateData);
                                            setIsEditingPayment(false);
                                            setEditPaymentData({
                                                paymentStatus: '',
                                                paymentMethod: ''
                                            });
                                        } else {
                                            toast.error(t('toasts.updatePaymentInformationFailed'));
                                        }
                                    } catch (error) {
                                        console.error('Error updating payment:', error);
                                        toast.error(t('toasts.updatePaymentInformationFailed'));
                                    } finally {
                                        setIsUpdatingStatus(false);
                                    }
                                }}
                                disabled={
                                    !editPaymentData.paymentStatus || !editPaymentData.paymentMethod || isUpdatingStatus
                                }>
                                {isUpdatingStatus ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('actions.updating')}
                                    </>
                                ) : (
                                    t('actions.updatePayment')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Order Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dialogs.createOrder.title')}</DialogTitle>
                        <DialogDescription>
                            {t('dialogs.createOrder.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                            <Select
                                value={isNewCustomer ? 'new' : selectedCustomerId}
                                onValueChange={(value) => {
                                    if (value === 'new') {
                                        setIsNewCustomer(true);
                                        setSelectedCustomerId('');
                                        setFormData({ ...initialFormData });
                                    } else {
                                        setIsNewCustomer(false);
                                        setSelectedCustomerId(value);
                                        const customer = customers.find((c) => c.id === value);
                                        if (customer) {
                                            setFormData({
                                                ...formData,
                                                customer: {
                                                    firstName: customer.firstName || '',
                                                    lastName: customer.lastName || '',
                                                    email: customer.email || '',
                                                    phone: customer.phone || '',
                                                    streetAddress: customer.streetAddress || '',
                                                    apartmentUnit: customer.apartmentUnit || '',
                                                    city: customer.city || '',
                                                    state: customer.state || '',
                                                    zipCode: customer.zipCode || '',
                                                    country: customer.country || 'FR',
                                                    countryIso: customer.countryIso || 'FR'
                                                }
                                            });
                                        } else {
                                            console.warn('Customer not found:', value);
                                            toast.error(t('toasts.selectedCustomerNotFound'));
                                        }
                                    }
                                }}>
                                <SelectTrigger className="w-full md:w-87.5">
                                    <SelectValue placeholder={t('dialogs.createOrder.selectCustomer')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">{t('dialogs.createOrder.createNewCustomer')}</SelectItem>
                                    {customers.map((customer) => {
                                        if (customer.role !== 'user') return null;
                                        const name =
                                            `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                                            customer.name ||
                                            t('dialogs.createOrder.unnamedCustomer');
                                        return (
                                            <SelectItem key={customer.id} value={customer.id}>
                                                {name} - {customer.email}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <h3 className="mb-4 font-semibold text-sm">{t('create.customerInfo')}</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label htmlFor="firstName">{t('create.firstName')}</label>
                                            <Input
                                                id="firstName"
                                                value={formData.customer.firstName}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        customer: {
                                                            ...formData.customer,
                                                            firstName: e.target.value
                                                        }
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="lastName">{t('create.lastName')}</label>
                                            <Input
                                                id="lastName"
                                                value={formData.customer.lastName}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        customer: {
                                                            ...formData.customer,
                                                            lastName: e.target.value
                                                        }
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email">{t('create.email')}</label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.customer.email}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    customer: {
                                                        ...formData.customer,
                                                        email: e.target.value
                                                    }
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="phone">{t('create.phone')}</label>
                                        <PhoneInput
                                            id="phone"
                                            value={formData.customer.phone}
                                            onChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    customer: {
                                                        ...formData.customer,
                                                        phone: value || ''
                                                    }
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-4 font-semibold text-sm">{t('create.shippingAddress')}</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="street">{t('create.streetAddress')}</label>
                                        <Input
                                            id="street"
                                            value={formData.customer.streetAddress}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    customer: {
                                                        ...formData.customer,
                                                        streetAddress: e.target.value
                                                    }
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="apartment">{t('create.apartmentUnit')}</label>
                                        <Input
                                            id="apartment"
                                            value={formData.customer.apartmentUnit}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    customer: {
                                                        ...formData.customer,
                                                        apartmentUnit: e.target.value
                                                    }
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label htmlFor="city">{t('create.city')}</label>
                                            <Input
                                                id="city"
                                                value={formData.customer.city}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        customer: {
                                                            ...formData.customer,
                                                            city: e.target.value
                                                        }
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="state">{t('create.state')}</label>
                                            <Input
                                                id="state"
                                                value={formData.customer.state}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        customer: {
                                                            ...formData.customer,
                                                            state: e.target.value
                                                        }
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label htmlFor="zipCode">{t('create.zipCode')}</label>
                                            <Input
                                                id="zipCode"
                                                value={formData.customer.zipCode}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        customer: {
                                                            ...formData.customer,
                                                            zipCode: e.target.value
                                                        }
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="country">{t('create.country')}</label>
                                            <CountryDropdown
                                                id="country"
                                                defaultValue={formData.customer.countryIso || 'FR'}
                                                onChange={(country) =>
                                                    setFormData({
                                                        ...formData,
                                                        customer: {
                                                            ...formData.customer,
                                                            country: country.name,
                                                            countryIso: country.alpha2
                                                        }
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-4 font-semibold text-sm">{t('create.orderDetails')}</h3>
                            <div className="mb-4">
                                <Select
                                    onValueChange={(value) => {
                                        if (value === 'custom') return;
                                        const item = catalog.find((i) => i.id === value);
                                        if (item) {
                                            setFormData({
                                                ...formData,
                                                items: [
                                                    ...formData.items,
                                                    {
                                                        id: item.id,
                                                        name: item.name,
                                                        quantity: 1,
                                                        price: item.price,
                                                        type: 'catalog'
                                                    }
                                                ]
                                            });
                                        }
                                    }}>
                                    <SelectTrigger className="w-full md:w-87.5">
                                        <SelectValue placeholder={t('dialogs.createOrder.addItemFromCatalog')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">{t('dialogs.createOrder.addCustomItem')}</SelectItem>
                                        {catalog.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name} - {formatPrice(item.price)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('create.product')}</TableHead>
                                        <TableHead>{t('create.quantity')}</TableHead>
                                        <TableHead>{t('create.price')}</TableHead>
                                        <TableHead>{t('create.total')}</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formData.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                {item.type === 'catalog' ? (
                                                    <div className="font-medium">{item.name}</div>
                                                ) : (
                                                    <Input
                                                        value={item.name}
                                                        onChange={(e) => {
                                                            const newItems = [...formData.items];
                                                            newItems[index] = {
                                                                ...newItems[index],
                                                                name: e.target.value
                                                            };
                                                            setFormData({ ...formData, items: newItems });
                                                        }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const newItems = [...formData.items];
                                                        newItems[index] = {
                                                            ...newItems[index],
                                                            quantity: parseInt(e.target.value, 10)
                                                        };
                                                        setFormData({ ...formData, items: newItems });
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.price}
                                                    disabled={item.type === 'catalog'}
                                                    onChange={(e) => {
                                                        const newItems = [...formData.items];
                                                        newItems[index] = {
                                                            ...newItems[index],
                                                            price: parseFloat(e.target.value)
                                                        };
                                                        setFormData({ ...formData, items: newItems });
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>{formatPrice(item.price * item.quantity)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const newItems = formData.items.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, items: newItems });
                                                    }}>
                                                    {t('create.remove')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Button
                                variant="outline"
                                className="mt-2"
                                onClick={() => {
                                    setFormData({
                                        ...formData,
                                        items: [...formData.items, { name: '', quantity: 1, price: 0, type: 'custom' }]
                                    });
                                }}>
                                {t('create.addCustomItem')}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="space-y-4">
                                <div>
                                    <label className="font-medium text-sm">{t('create.orderStatus')}</label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ORDER_STATUS.map((status) => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="font-medium text-sm">{t('create.paymentMethod')}</label>
                                    <Select
                                        value={formData.paymentMethod}
                                        onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('dialogs.createOrder.selectPaymentMethod')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHODS.map((method) => (
                                                <SelectItem key={method.value} value={method.value}>
                                                    {method.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="font-medium text-sm">{t('create.shippingCost')}</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.shippingCost}
                                        onChange={(e) =>
                                            setFormData({ ...formData, shippingCost: parseFloat(e.target.value) })
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="font-medium text-sm">{t('create.discount')}</label>
                                    <div className="flex gap-2">
                                        <Select
                                            value={formData.discountType}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, discountType: value })
                                            }>
                                            <SelectTrigger className="w-30">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fixed">Fixed</SelectItem>
                                                <SelectItem value="percentage">%</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            min="0"
                                            step={formData.discountType === 'percentage' ? '1' : '0.01'}
                                            max={formData.discountType === 'percentage' ? '100' : undefined}
                                            value={formData.discountValue}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    discountValue: parseFloat(e.target.value) || 0
                                                })
                                            }
                                            placeholder={
                                                formData.discountType === 'percentage'
                                                    ? t('dialogs.createOrder.discountPercentagePlaceholder')
                                                    : t('dialogs.createOrder.discountFixedPlaceholder')
                                            }
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center space-x-2">
                                        <Checkbox
                                            id="taxEnabled"
                                            checked={formData.taxEnabled}
                                            onCheckedChange={(checked) =>
                                                setFormData({ ...formData, taxEnabled: checked })
                                            }
                                        />
                                        <label htmlFor="taxEnabled" className="font-medium text-sm">
                                            {t('create.applyTax')}
                                        </label>
                                    </div>

                                    {formData.taxEnabled && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-medium text-sm">{t('create.taxRate')}</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    value={formData.taxRate}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            taxRate: parseFloat(e.target.value) || 0
                                                        })
                                                    }
                                                    placeholder={t('dialogs.createOrder.taxRatePlaceholder')}
                                                />
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="taxIncluded"
                                                    checked={formData.taxIncluded}
                                                    onCheckedChange={(checked) =>
                                                        setFormData({ ...formData, taxIncluded: checked })
                                                    }
                                                />
                                                <label htmlFor="taxIncluded" className="text-sm">
                                                    {t('create.taxIncluded')}
                                                </label>
                                            </div>

                                            <div className="text-muted-foreground text-xs">
                                                {formData.taxIncluded
                                                    ? t('create.taxExtracted')
                                                    : t('create.taxAdded')}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6">
                                    {(() => {
                                        const subtotal = formData.items.reduce(
                                            (sum, item) => sum + item.price * item.quantity,
                                            0
                                        );

                                        // Calculate discount
                                        let discountAmount = 0;
                                        if (formData.discountValue > 0) {
                                            if (formData.discountType === 'percentage') {
                                                discountAmount = (subtotal * formData.discountValue) / 100;
                                            } else {
                                                discountAmount = formData.discountValue;
                                            }
                                        }

                                        // Calculate tax
                                        let taxAmount = 0;
                                        let displaySubtotal = subtotal;

                                        if (formData.taxEnabled && formData.taxRate > 0) {
                                            if (formData.taxIncluded) {
                                                // Tax is included - extract tax amount
                                                taxAmount = (subtotal * formData.taxRate) / (100 + formData.taxRate);
                                                displaySubtotal = subtotal - taxAmount;
                                            } else {
                                                // Tax is added on top
                                                taxAmount = (subtotal * formData.taxRate) / 100;
                                            }
                                        }

                                        const total = formData.taxIncluded
                                            ? subtotal + (formData.shippingCost || 0) - discountAmount
                                            : subtotal + (formData.shippingCost || 0) + taxAmount - discountAmount;

                                        return (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span>
                                                        {formData.taxEnabled && formData.taxIncluded
                                                            ? t('create.subtotalExclTax')
                                                            : t('create.subtotal')}
                                                    </span>
                                                    <span>
                                                        {formatPrice(
                                                            formData.taxEnabled && formData.taxIncluded
                                                                ? displaySubtotal
                                                                : subtotal
                                                        )}
                                                    </span>
                                                </div>

                                                {formData.taxEnabled && taxAmount > 0 && (
                                                    <div className="flex justify-between text-sm">
                                                        <span>{t('create.tax')} ({formData.taxRate}%):</span>
                                                        <span>{formatPrice(taxAmount)}</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between text-sm">
                                                    <span>{t('create.shipping')}:</span>
                                                    <span>{formatPrice(formData.shippingCost || 0)}</span>
                                                </div>

                                                {discountAmount > 0 && (
                                                    <div className="flex justify-between text-green-600 text-sm">
                                                        <span>
                                                            {t('create.discount')} (
                                                            {formData.discountType === 'percentage'
                                                                ? `${formData.discountValue}%`
                                                                : t('create.fixed')}
                                                            ):
                                                        </span>
                                                        <span>-{formatPrice(discountAmount)}</span>
                                                    </div>
                                                )}

                                                <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                                                    <span>{t('create.total')}:</span>
                                                    <span>{formatPrice(Math.max(0, total))}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sendEmail"
                                checked={formData.sendEmail}
                                onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked })}
                            />
                            <label
                                htmlFor="sendEmail"
                                className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {t('create.sendConfirmationEmail')}
                            </label>
                        </div>

                        <div className="flex flex-col justify-end gap-3 sm:flex-row">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsCreateOpen(false);
                                    setFormData(initialFormData);
                                    setIsNewCustomer(false);
                                    setSelectedCustomerId('');
                                }}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto">
                                {t('actions.cancel')}
                            </Button>
                            <Button onClick={handleCreateOrder} disabled={isSubmitting} className="w-full sm:w-auto">
                                {isSubmitting ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                        {t('actions.creating')}
                                    </>
                                ) : (
                                    t('actions.createOrder')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Status Change Confirmation Dialog */}
            <Dialog
                open={isStatusDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsStatusDialogOpen(false);
                        setStatusChangeData(null);
                        setTrackingNumber('');
                        setSendEmailNotification(true);
                        setSendSmsNotification(false);
                    }
                }}>
                <DialogContent className="w-md">
                    <DialogHeader>
                        <DialogTitle>{t('dialogs.confirmStatusChange.title')}</DialogTitle>
                        <DialogDescription>
                            {statusChangeData
                                ? t('dialogs.confirmStatusChange.description', {
                                      orderId: statusChangeData.orderId,
                                      status: ORDER_STATUS.find((s) => s.value === statusChangeData.newStatus)?.label
                                  })
                                : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Tracking Number Input */}
                        <div className="space-y-2">
                            <label htmlFor="trackingNumber" className="font-medium text-sm">
                                {t('details.status.trackingNumber')} <span className="text-gray-400">({t('confirmStatus.optional')})</span>
                            </label>
                            <Input
                                id="trackingNumber"
                                placeholder={t('dialogs.confirmStatusChange.trackingPlaceholder')}
                                value={trackingNumber}
                                onChange={(e) => {
                                    const sanitized = e.target.value
                                        .replace(/\s+/g, '')
                                        .replace(/[^A-Z0-9]/gi, '')
                                        .toUpperCase();
                                    setTrackingNumber(sanitized);
                                }}
                                className="w-full"
                            />
                            {(statusChangeData?.newStatus === 'complete' ||
                                statusChangeData?.newStatus === 'delivered') && (
                                <p className="text-gray-500 text-xs">
                                    {t('confirmStatus.recommendedTracking')}
                                </p>
                            )}
                        </div>

                        {/* Email Notification Checkbox */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sendEmailStatus"
                                checked={sendEmailNotification}
                                onCheckedChange={setSendEmailNotification}
                            />
                            <label htmlFor="sendEmailStatus" className="font-medium text-sm">
                                {t('details.status.sendEmailToCustomer')}
                                {trackingNumber.trim() && sendEmailNotification && (
                                    <span className="block text-gray-500 text-xs">({t('confirmStatus.includeTrackingNumber')})</span>
                                )}
                            </label>
                        </div>

                        {/* SMS Notification Checkbox */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sendSmsStatus"
                                checked={sendSmsNotification}
                                onCheckedChange={setSendSmsNotification}
                            />
                            <label htmlFor="sendSmsStatus" className="font-medium text-sm">
                                {t('details.status.sendSmsToCustomer')}
                                {trackingNumber.trim() && sendSmsNotification && (
                                    <span className="block text-gray-500 text-xs">({t('confirmStatus.includeTrackingNumber')})</span>
                                )}
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsStatusDialogOpen(false);
                                    setStatusChangeData(null);
                                    setTrackingNumber('');
                                    setSendEmailNotification(true);
                                    setSendSmsNotification(false);
                                }}
                                disabled={isConfirmingStatusChange}>
                                {t('actions.cancel')}
                            </Button>
                            <Button onClick={confirmStatusChange} disabled={isConfirmingStatusChange}>
                                {isConfirmingStatusChange ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                        {t('actions.updating')}
                                    </>
                                ) : (
                                    t('actions.updateStatus')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Invoice Preview Dialog */}
            <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {t('invoice.previewTitle', { orderId: selectedOrderForInvoice?.id || '' })}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedOrderForInvoice && (
                        <div className="space-y-6">
                            {/* Invoice Preview Area */}
                            <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
                                {/* Invoice Header */}
                                <div className="mb-8 flex items-start justify-between">
                                    <div>
                                        <h1 className="font-bold text-3xl ">{t('invoice.invoice')}</h1>
                                        <p className="mt-1 text-gray-600 text-sm">
                                            {t('invoice.order', { orderId: selectedOrderForInvoice.id })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {storeSettings && (
                                            <div>
                                                <h2 className="font-semibold text-lg">
                                                    {storeSettings.businessName || t('invoice.yourBusiness')}
                                                </h2>
                                                {storeSettings.businessAddress && (
                                                    <p className="text-gray-600 text-sm">
                                                        {storeSettings.businessAddress}
                                                    </p>
                                                )}
                                                {storeSettings.businessEmail && (
                                                    <p className="text-gray-600 text-sm">
                                                        {storeSettings.businessEmail}
                                                    </p>
                                                )}
                                                {storeSettings.businessPhone && (
                                                    <p className="text-gray-600 text-sm">
                                                        {storeSettings.businessPhone}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Invoice Details */}
                                <div className="mb-8 grid grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="mb-2 font-semibold ">{t('invoice.billTo')}:</h3>
                                        <div className="text-gray-600 text-sm">
                                            <p className="font-medium">
                                                {`${selectedOrderForInvoice.customer.firstName} ${selectedOrderForInvoice.customer.lastName}`.trim()}
                                            </p>
                                            <p>{selectedOrderForInvoice.customer.email}</p>
                                            {selectedOrderForInvoice.customer.phone && (
                                                <p>{selectedOrderForInvoice.customer.phone}</p>
                                            )}
                                            <div className="mt-2">
                                                <p>{selectedOrderForInvoice.customer.streetAddress}</p>
                                                {selectedOrderForInvoice.customer.apartmentUnit && (
                                                    <p>{selectedOrderForInvoice.customer.apartmentUnit}</p>
                                                )}
                                                <p>
                                                    {selectedOrderForInvoice.customer.city},{' '}
                                                    {selectedOrderForInvoice.customer.state}{' '}
                                                    {selectedOrderForInvoice.customer.zipCode}
                                                </p>
                                                <p>{selectedOrderForInvoice.customer.country}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="mb-2 font-semibold ">{t('invoice.details')}:</h3>
                                        <div className="space-y-1 text-gray-600 text-sm">
                                            <div className="flex justify-between">
                                                <span>{t('invoice.invoiceDate')}:</span>
                                                <span>
                                                    {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>{t('invoice.paymentMethod')}:</span>
                                                <span>
                                                    {formatPaymentMethod(selectedOrderForInvoice.paymentMethod)}
                                                </span>
                                            </div>
                                            {selectedOrderForInvoice.eupagoReference && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span>{t('invoice.reference')}:</span>
                                                        <span className="font-mono">
                                                            {selectedOrderForInvoice.eupagoReference}
                                                        </span>
                                                    </div>
                                                    {selectedOrderForInvoice.eupagoEntity && (
                                                        <div className="flex justify-between">
                                                            <span>{t('invoice.entity')}:</span>
                                                            <span className="font-mono">
                                                                {selectedOrderForInvoice.eupagoEntity}
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="flex justify-between">
                                                <span>{t('invoice.status')}:</span>
                                                <Badge
                                                    variant={
                                                        selectedOrderForInvoice.status === 'delivered'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    className="ml-2">
                                                    {
                                                        ORDER_STATUS.find(
                                                            (s) => s.value === selectedOrderForInvoice.status
                                                        )?.label
                                                    }
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice Items */}
                                <div className="mb-8">
                                    {/* Header - Hidden on mobile, shown on tablet+ */}
                                    <div className="hidden md:grid grid-cols-4 gap-2 border-gray-200 border-b pb-2 mb-3">
                                        <div className="font-semibold text-left">{t('invoice.description')}</div>
                                        <div className="font-semibold text-center">{t('invoice.qty')}</div>
                                        <div className="font-semibold text-right">{t('invoice.price')}</div>
                                        <div className="font-semibold text-right">{t('invoice.total')}</div>
                                    </div>

                                    {/* Items */}
                                    <div className="space-y-2">
                                        {selectedOrderForInvoice.items.map((item, index) => (
                                            <div
                                                key={index}
                                                className="md:grid md:grid-cols-4 md:gap-2 py-3 border-gray-100 border-b">
                                                {/* Mobile Layout */}
                                                <div className="md:hidden space-y-1">
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="flex justify-between text-sm text-gray-600">
                                                        <span>{t('invoice.qty')}: {item.quantity}</span>
                                                        <span>{t('invoice.price')}: {formatPrice(item.price)}</span>
                                                    </div>
                                                    <div className="text-right font-medium">
                                                        {t('invoice.total')}: {formatPrice(item.price * item.quantity)}
                                                    </div>
                                                </div>

                                                {/* Desktop Layout */}
                                                <div className="hidden md:contents">
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-center text-gray-600">{item.quantity}</div>
                                                    <div className="text-right text-gray-600">
                                                        {formatPrice(item.price)}
                                                    </div>
                                                    <div className="text-right font-medium">
                                                        {formatPrice(item.price * item.quantity)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Summary */}
                                    <div className="pt-4 mt-4 space-y-2">
                                        <div className="flex justify-between md:grid md:grid-cols-4 md:gap-2">
                                            <div className="md:col-span-3 md:text-right font-semibold">{t('invoice.subtotal')}:</div>
                                            <div className="md:text-right font-semibold">
                                                {formatPrice(selectedOrderForInvoice.subtotal)}
                                            </div>
                                        </div>

                                        <div className="flex justify-between md:grid md:grid-cols-4 md:gap-2">
                                            <div className="md:col-span-3 md:text-right font-semibold">{t('invoice.shipping')}:</div>
                                            <div className="md:text-right font-semibold">
                                                {formatPrice(selectedOrderForInvoice.shippingCost || 0)}
                                            </div>
                                        </div>

                                        {selectedOrderForInvoice.taxEnabled &&
                                        selectedOrderForInvoice.taxAmount &&
                                        selectedOrderForInvoice.taxAmount > 0 ? (
                                            <div className="flex justify-between md:grid md:grid-cols-4 md:gap-2">
                                                <div className="md:col-span-3 md:text-right font-semibold">
                                                    {t('invoice.tax')} ({selectedOrderForInvoice.taxRate}%):
                                                </div>
                                                <div className="md:text-right font-semibold">
                                                    {formatPrice(selectedOrderForInvoice.taxAmount)}
                                                </div>
                                            </div>
                                        ) : null}

                                        {selectedOrderForInvoice.discountAmount &&
                                        selectedOrderForInvoice.discountAmount > 0 ? (
                                            <div className="flex justify-between md:grid md:grid-cols-4 md:gap-2">
                                                <div className="md:col-span-3 md:text-right font-semibold text-green-600">
                                                    {t('invoice.discount')}
                                                    {selectedOrderForInvoice.coupon
                                                        ? ` (${selectedOrderForInvoice.coupon.code})`
                                                        : ''}
                                                    :
                                                </div>
                                                <div className="md:text-right font-semibold text-green-600">
                                                    -{formatPrice(selectedOrderForInvoice.discountAmount)}
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="flex justify-between md:grid md:grid-cols-4 md:gap-2 border-gray-900 border-t pt-3">
                                            <div className="md:col-span-3 md:text-right font-bold text-lg">{t('invoice.total')}:</div>
                                            <div className="md:text-right font-bold text-lg">
                                                {formatPrice(
                                                    selectedOrderForInvoice.finalTotal || selectedOrderForInvoice.total
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-8 border-t pt-4 text-center text-gray-500 text-sm">
                                    <p>{t('invoice.thankYou')}</p>
                                    {storeSettings?.businessWebsite && (
                                        <p className="mt-1">{storeSettings.businessWebsite}</p>
                                    )}
                                </div>
                            </div>

                            {/* Invoice Actions */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Button
                                    variant="outline"
                                    onClick={() => handleGenerateInvoice(selectedOrderForInvoice)}
                                    disabled={isGeneratingPDF}
                                    className="w-full">
                                    <Download className="mr-2 h-4 w-4" />
                                    {isGeneratingPDF ? t('invoice.generating') : t('invoice.downloadPdf')}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        handleGenerateInvoice(selectedOrderForInvoice);
                                        // Print logic would go here - opens PDF and triggers print dialog
                                    }}
                                    disabled={isGeneratingPDF}
                                    className="w-full">
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('invoice.printInvoice')}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            const subject = t('invoice.emailSubject', { orderId: selectedOrderForInvoice.id });
                                            const body = t('invoice.emailBody', {
                                                firstName: selectedOrderForInvoice.customer.firstName,
                                                orderId: selectedOrderForInvoice.id
                                            });

                                            // Generate PDF first, then handle email
                                            await handleGenerateInvoice(selectedOrderForInvoice);

                                            // Create mailto link
                                            const mailtoLink = `mailto:${selectedOrderForInvoice.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                            window.open(mailtoLink);

                                            toast.success(t('toasts.emailClientOpened'));
                                        } catch (_error) {
                                            toast.error(t('toasts.prepareEmailFailed'));
                                        }
                                    }}
                                    disabled={isGeneratingPDF}
                                    className="w-full">
                                    <Send className="mr-2 h-4 w-4" />
                                    {t('invoice.emailInvoice')}
                                </Button>
                            </div>

                            {/* Invoice Details Summary */}
                            <div className="border-t pt-4">
                                <h4 className="mb-3 font-medium">{t('invoice.details')}</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">{t('invoice.customer')}:</span>
                                        <p className="font-medium">
                                            {`${selectedOrderForInvoice.customer.firstName} ${selectedOrderForInvoice.customer.lastName}`.trim()}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('invoice.totalAmount')}:</span>
                                        <p className="font-medium">
                                            {formatPrice(
                                                selectedOrderForInvoice.finalTotal || selectedOrderForInvoice.total
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('invoice.orderDate')}:</span>
                                        <p className="font-medium">{formatDate(selectedOrderForInvoice.createdAt)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('invoice.status')}:</span>
                                        <Badge
                                            variant={
                                                selectedOrderForInvoice.status === 'delivered' ? 'default' : 'outline'
                                            }>
                                            {
                                                ORDER_STATUS.find((s) => s.value === selectedOrderForInvoice.status)
                                                    ?.label
                                            }
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Order Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title={t('confirm.deleteOrder.title')}
                description={t('confirm.deleteOrder.description', { orderId: orderToDelete?.id || '' })}
                confirmText={t('confirm.deleteOrder.confirmText')}
                requireConfirmText="delete"
                onConfirm={async () => {
                    if (!orderToDelete) return;

                    setIsDeleting(true);
                    try {
                        const response = await deleteOrder(orderToDelete.key || orderToDelete.id);

                        if (response?.success) {
                            toast.success(t('toasts.orderDeleted'));
                            setAllOrders((prev) => prev.filter((order) => order.id !== orderToDelete.id));
                            setDeleteConfirmOpen(false);
                            setOrderToDelete(null);
                        } else {
                            throw new Error(t('toasts.deleteOrderFailed'));
                        }
                    } catch (error) {
                        console.error('Error deleting order:', error);
                        toast.error(t('toasts.deleteOrderFailed'));
                    } finally {
                        setIsDeleting(false);
                    }
                }}
                loading={isDeleting}
            />

            {/* Status Edit Confirmation Dialog */}
            <ConfirmationDialog
                open={statusEditConfirmOpen}
                onOpenChange={setStatusEditConfirmOpen}
                title={t('confirm.editStatus.title')}
                description={t('confirm.editStatus.description', { status: orderToEditStatus?.status || '' })}
                confirmText={t('confirm.editStatus.confirmText')}
                onConfirm={() => {
                    if (orderToEditStatus) {
                        setEditStatusData({
                            status: orderToEditStatus.status,
                            tracking: orderToEditStatus.tracking || '',
                            sendEmail: true,
                            sendSms: false,
                            smsPhone: orderToEditStatus.customer?.phone || '',
                            smsPhoneSource: 'order'
                        });
                        setUserPhoneData(null);
                        setShowPhoneSelector(false);
                        setSelectedOrder(orderToEditStatus);
                        setIsEditingStatus(true);
                        setStatusEditConfirmOpen(false);
                        setOrderToEditStatus(null);
                    }
                }}
                loading={false}
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title={t('csv.dialog.title')}
                description={t('csv.dialog.description')}
                data={allOrders}
                exportFields={csvExportFields}
                filename="orders"
                formatRowData={formatOrderRowData}
            />
        </div>
    );
}
