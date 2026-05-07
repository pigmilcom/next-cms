// @/app/(actions)/account/page.client.jsx (Client Component)
'use client';

import {
    AlertCircle,
    Award,
    Bell,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    CircleChevronLeft,
    ChevronRight,
    ChevronUp,
    CircleX,
    Clock,
    Copy,
    CreditCard,
    Download,
    Edit,
    ExternalLink,
    Filter,
    Grid3X3,
    Heart,
    List,
    Lock, 
    LogOut,
    MessageSquare,
    Package,
    Search,
    Shield,
    KeyRound,
    Share2,
    ShoppingBag,
    Star,
    Trash2,
    User,
    Users,
    RefreshCw
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner'; 
import TicketDialog from '@/components/common/TicketDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; 
import { useAuth, useSettings } from '@/context/providers';
import { loadTranslations } from '@/lib/client/translations';
import { getCountryName as getCountryNameFromI18n } from '@/lib/i18n';
import { checkPending } from '@/lib/server/gateways';
import { getAllOrders } from '@/lib/server/orders';
import {
    changeUserPassword,
    deleteUserAccount,
    getUserReferrals,
    updateUserPreferences,
    updateUserProfile
} from '@/lib/server/users';

const AccountPageClient = ({
    userData, 
    favorites: initialFavorites,
    orders: initialOrders,
    reviews: initialReviews
}) => {
    const router = useRouter();
    const locale = useLocale();
    const { isAuthenticated, user } = useAuth();
    const { storeSettings } = useSettings();
    const t = loadTranslations('Account');

    // State initialization with server-provided data
    const [activeTab, setActiveTab] = useState('overview');
    const [favorites, setFavorites] = useState(initialFavorites || []);
    const [userOrders, setUserOrders] = useState(initialOrders || []);
    const allOrders = userOrders; // Use state instead of props for dynamic updates
    const clubProfile = userData?.club || {}; 
    const [isRefreshingPayment, setIsRefreshingPayment] = useState({});
    const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

    // Dialog states
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [deleteForm, setDeleteForm] = useState({
        currentPassword: ''
    });
    const [profileForm, setProfileForm] = useState({
        displayName: userData?.displayName || ''
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [currentUser, setCurrentUser] = useState(userData);
    const [preferences, setPreferences] = useState({
        emailNotifications: userData?.emailNotifications ?? true,
        orderUpdates: userData?.orderUpdates ?? true,
        marketingEmails: userData?.marketingEmails ?? true,
        newsletter: userData?.newsletter ?? true,
        smsNotifications: userData?.smsNotifications ?? false
    });
    const [savingPreferences, setSavingPreferences] = useState(false);
    const [currentOrderPage, setCurrentOrderPage] = useState(1);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [showPaymentInstructions, setShowPaymentInstructions] = useState({});
    const [downloadingReceipt, setDownloadingReceipt] = useState(null);
    const [orderNotFound, setOrderNotFound] = useState(false);

    // Referral states
    const [referrals, setReferrals] = useState([]); 
    const [showReferralsDialog, setShowReferralsDialog] = useState(false);
    const [paymentRefreshCooldown, setPaymentRefreshCooldown] = useState({});
    const [ordersRefreshCooldown, setOrdersRefreshCooldown] = useState(0);
    // Search and filtering state
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
    const [orderViewType, setOrderViewType] = useState('card'); // 'card' or 'table'
    // Ticket dialog state
    const [showTicketDialog, setShowTicketDialog] = useState(false);
    const [selectedOrderForTicket, setSelectedOrderForTicket] = useState(null);
    const ordersPerPage = 10;

    // Review delete states
    const [deleteReviewConfirmOpen, setDeleteReviewConfirmOpen] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState(null);
    const [isDeletingReview, setIsDeletingReview] = useState(false);
    const [userReviews, setUserReviews] = useState(initialReviews);

    // Redirect if not authenticated
    useEffect(() => {
        if (!user) {
            router.push('/auth/login?callbackUrl=/account');
        }
    }, [user, router]);

    // Handle user key mismatch (session user vs page data)
    useEffect(() => {
        if (userData?.key && user?.key && userData.key !== user.key) {
            router.push('/auth/logout');
        }
    }, [userData?.key, user?.key, router]);

    // Handle URL params for tab navigation and order ID
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const searchParams = new URLSearchParams(window.location.search);
        const tabParam = searchParams.get('v');
        const orderIdParam = searchParams.get('order');

        // Set tab from URL params
        if (tabParam && ['overview', 'favorites', 'orders', 'reviews', 'settings'].includes(tabParam)) {
            setActiveTab(tabParam);
        }

        // Handle order ID from URL params
        if (orderIdParam && tabParam === 'orders') {
            const orderExists = allOrders.find((order) => order.id === orderIdParam);

            if (orderExists) {
                // Expand the order
                setExpandedOrders((prev) => ({ ...prev, [orderIdParam]: true }));
                setOrderNotFound(false);

                // Calculate which page the order is on
                const orderIndex = allOrders.findIndex((order) => order.id === orderIdParam);
                if (orderIndex !== -1) {
                    const pageNumber = Math.ceil((orderIndex + 1) / ordersPerPage);
                    setCurrentOrderPage(pageNumber);
                }

                // Scroll to order after a short delay to ensure DOM is ready
                setTimeout(() => {
                    const orderElement = document.getElementById(`order-${orderIdParam}`);
                    if (orderElement) {
                        orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            } else {
                setOrderNotFound(true);
                toast.error(t('toast.orderNotFound'));
            }
        }
    }, [allOrders, ordersPerPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentOrderPage(1);
    }, [orderSearchTerm, orderStatusFilter, paymentStatusFilter]);

    // Auto-load referrals as soon as the referral code is available
    useEffect(() => {
        if (!userData?.referralCode) return; 
        getUserReferrals(userData.referralCode)
            .then((result) => {
                if (result?.success) setReferrals(result.data || []);
            })
            .catch(console.error);
    }, [userData?.referralCode]);

    // Show loading state while checking authentication (after all hooks)
    if (!isAuthenticated || !user) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <p className="text-muted-foreground">{t('redirecting')}</p>
            </div>
        );
    }

    const handleFavoriteChange = () => {
        // Refresh page to reload favorites with updated data from server
        router.refresh();
    };

    // Handle orders refresh (e.g. after payment) with rate limiting
    const handleOrdersRefresh = async () => {
        // Rate limiting: Check if user has called this function recently (30 seconds cooldown)
        const now = Date.now();
        const cooldownTime = 30 * 1000; // 30 seconds in milliseconds
        const timeSinceLastCall = now - ordersRefreshCooldown;

        if (ordersRefreshCooldown && timeSinceLastCall < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - timeSinceLastCall) / 1000);
            toast.error(t('toast.waitBeforeRefreshing', { seconds: remainingTime }));
            return;
        }

        // Set cooldown timestamp
        setOrdersRefreshCooldown(now);
        setIsRefreshingOrders(true);
        try {
            const updatedOrdersResponse = await getAllOrders({
                userId: user.email || user.id,
                limit: 0,
                options: { duration: '0' }
            });
            if (updatedOrdersResponse?.success && updatedOrdersResponse?.data) {
                setUserOrders(updatedOrdersResponse.data);
                toast.success(t('toast.ordersUpdated'));
            } else {
                toast.error(t('toast.failedToUpdateOrders'));
            }
        } catch (error) {
            console.error('Error refreshing orders:', error);
            toast.error(t('toast.failedToUpdateOrders'));
        } finally {
            setIsRefreshingOrders(false);
        }   
    };

    // Update URL when tab changes
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setOrderNotFound(false);

        // Update URL without page reload
        const url = new URL(window.location.href);
        url.searchParams.set('v', newTab);

        // Remove orderId param when switching tabs
        if (newTab !== 'orders') {
            url.searchParams.delete('ref');
        }

        window.history.pushState({}, '', url.toString());
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error(t('toast.passwordsDoNotMatch'));
            return;
        }

        // Validate password complexity (same as auth handler)
        const passwordValid = (pwd) => {
            return (
                pwd.length >= 8 &&
                pwd.length <= 32 &&
                /[a-z]/.test(pwd) &&
                /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
            );
        };

        if (!passwordValid(passwordForm.newPassword)) {
            toast.error(t('toast.passwordRequirements'));
            return;
        }

        const userKey = user?.key;
        if (!userKey) {
            toast.error(t('toast.userSessionNotFound'));
            return;
        }

        setChangingPassword(true);
        try {
            const result = await changeUserPassword(userKey, passwordForm.currentPassword, passwordForm.newPassword);

            if (result.success) {
                toast.success(t('toast.passwordChangedSuccess'));
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordDialogOpen(false);
            } else {
                toast.error(result.error || t('toast.failedToChangePassword'));
            }
        } catch (error) {
            toast.error(t('toast.failedToChangePassword'));
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();

        const userKey = user?.key;
        if (!userKey) {
            toast.error(t('toast.userSessionNotFound'));
            return;
        }

        setDeletingAccount(true);
        try {
            const result = await deleteUserAccount(userKey, deleteForm.currentPassword);

            if (result.success) {
                toast.success(
                    t('toast.accountSuspended')
                );
                setDeleteForm({ currentPassword: '' });
                setDeleteDialogOpen(false);
                // Redirect to logout after 3 seconds
                setTimeout(() => {
                    router.push('/auth/logout');
                }, 3000);
            } else {
                toast.error(result.error || t('toast.failedToDeleteAccount'));
            }
        } catch (error) {
            toast.error(t('toast.failedToDeleteAccount'));
        } finally {
            setDeletingAccount(false);
        }
    };

    const handleSavePreferences = async () => {
        const userKey = user?.key;
        if (!userKey) {
            toast.error(t('toast.userSessionNotFound'));
            return;
        }

        setSavingPreferences(true);
        try {
            const result = await updateUserPreferences(userKey, preferences);

            if (result.success) {
                toast.success(t('toast.preferencesSavedSuccess'));
                // Update local state with new data if returned
                if (result.data) {
                    setPreferences(result.data);
                }
            } else {
                toast.error(result.error || t('toast.failedToSavePreferences'));
            }
        } catch (error) {
            toast.error(t('toast.failedToSavePreferences'));
        } finally {
            setSavingPreferences(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        const userKey = user?.key;

        if (!userKey) {
            toast.error(t('toast.userSessionNotFound'));
            return;
        }

        setUpdatingProfile(true);
        try {
            const result = await updateUserProfile(userKey, {
                displayName: profileForm.displayName
            });

            if (result.success) {
                toast.success(t('toast.profileUpdatedSuccess'));
                // Update current user state
                setCurrentUser((prev) => ({
                    ...prev,
                    displayName: profileForm.displayName
                }));
                setEditProfileDialogOpen(false);
            } else {
                toast.error(result.error || t('toast.failedToUpdateProfile'));
            }
        } catch (error) {
            toast.error(t('toast.failedToUpdateProfile'));
        } finally {
            setUpdatingProfile(false);
        }
    };

    const getPaymentStatus = (status) => {
        const variantDisplay = {
            pending: t('orders.paymentStatus.pending'),
            processing: t('orders.paymentStatus.processing'),
            paid: t('orders.paymentStatus.paid'),
            failed: t('orders.paymentStatus.failed'),
            cancelled: t('orders.paymentStatus.cancelled')
        };
        return variantDisplay[status] || status;
    };

    const getStatusBadge = (status) => {
        const variants = {
            pending: 'outline',
            processing: 'default',
            complete: 'success',
            delivered: 'default',
            cancelled: 'destructive'
        };
        const variantDisplay = {
            pending: t('orders.paymentStatus.pending'),
            processing: t('orders.paymentStatus.processing'),
            complete: t('orders.statusComplete'),
            delivered: t('orders.statusShipped'),
            cancelled: t('orders.paymentStatus.cancelled')
        };
        const variant = variants[status] || 'secondary';
        return <Badge variant={variants[status] || 'secondary'}>{variantDisplay[status] || status}</Badge>;
    };

    const getReviewStatusBadge = (status) => {
        const variants = {
            pending: 'secondary',
            approved: 'default',
            rejected: 'destructive'
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
    };

    const toggleOrderExpansion = (orderId) => {
        setExpandedOrders((prev) => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const togglePaymentInstructions = (orderId) => {
        setShowPaymentInstructions((prev) => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const handleDownloadReceipt = async (order) => {
        try {
            if (order.paymentStatus === 'pending') {
                toast.error(t('toast.cannotDownloadReceiptPending'));
                return;
            }
            setDownloadingReceipt(order.id);

            // Import the PDF generator
            const { generatePDF } = await import('@/utils/generatePDF');

            // Pass the order object directly to generatePDF
            // The utility handles all parsing and fallbacks internally
            await generatePDF(order, storeSettings, locale);

            toast.success(t('toast.receiptDownloadedSuccess'));
        } catch (error) {
            console.error('Error downloading receipt:', error);
            toast.error(t('toast.failedToDownloadReceipt'));
        } finally {
            setDownloadingReceipt(null);
        }
    };

    // Handle "Already paid" button click for payment refresh with rate limiting
    const handlePaymentRefresh = async (orderId) => {
        // Rate limiting: Check if user has called this function recently (30 seconds cooldown)
        const now = Date.now();
        const cooldownTime = 30 * 1000; // 30 seconds in milliseconds
        const lastCall = paymentRefreshCooldown[orderId];

        if (lastCall && now - lastCall < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - lastCall)) / 1000);
            toast.error(t('toast.waitBeforeCheckingAgain', { seconds: remainingTime }));
            return;
        }

        // Set cooldown for this order
        setPaymentRefreshCooldown((prev) => ({ ...prev, [orderId]: now }));
        setIsRefreshingPayment((prev) => ({ ...prev, [orderId]: true }));

        try {
            // Store previous orders for comparison
            const previousOrders = [...userOrders];

            // Check pending payments
            const checkResult = await checkPending();
            if (checkResult.success && (checkResult.updated > 0 || checkResult.cancelled > 0)) {
                const messages = [];
                if (checkResult.updated > 0) {
                    messages.push(t('toast.paymentsConfirmed', { count: checkResult.updated }));
                }
                if (checkResult.cancelled > 0) {
                    messages.push(t('toast.ordersExpiredCancelled', { count: checkResult.cancelled }));
                }

                if (messages.length > 0) {
                    toast.success(messages.join(', '));
                }
            }

            // Refresh orders list with no cache
            const updatedOrdersResponse = await getAllOrders({
                userId: user.email || user.id,
                limit: 0,
                options: { duration: '0' }
            });

            if (updatedOrdersResponse?.success && updatedOrdersResponse?.data) {
                setUserOrders(updatedOrdersResponse.data);

                // Check if the specific order was updated
                const previousOrder = previousOrders.find((order) => order.id === orderId);
                const updatedOrder = updatedOrdersResponse.data.find((order) => order.id === orderId);

                if (previousOrder && updatedOrder) {
                    const statusChanged =
                        previousOrder.paymentStatus !== updatedOrder.paymentStatus ||
                        previousOrder.status !== updatedOrder.status;

                    if (statusChanged) {
                        if (updatedOrder.paymentStatus === 'paid') {
                            toast.success(t('toast.paymentConfirmed'));
                            // Hide payment instructions since payment is now confirmed
                            setShowPaymentInstructions((prev) => ({ ...prev, [orderId]: false }));
                        } else {
                            toast.info(t('toast.orderStatusUpdated'));
                        }
                    } else {
                        toast.info(
                            t('toast.paymentStillPending')
                        );
                    }
                } else {
                    toast.info(t('toast.paymentStatusVerified'));
                }
            } else {
                toast.info(t('toast.paymentStatusVerified'));
            }
        } catch (error) {
            console.error('Error refreshing payment:', error);
            toast.error(t('toast.failedToVerifyPaymentStatus'));
        } finally {
            setIsRefreshingPayment((prev) => ({ ...prev, [orderId]: false }));
        }
    };

    const formatPaymentMethod = (method) => {
        const methods = {
            stripe: t('orders.paymentMethods.stripe'),
            card: t('orders.paymentMethods.card'),
            bank_transfer: t('orders.paymentMethods.bank_transfer'),
            pay_on_delivery: t('orders.paymentMethods.pay_on_delivery'),
            cash: t('orders.paymentMethods.cash'),
            crypto: t('orders.paymentMethods.crypto'),
            eupago: t('orders.paymentMethods.eupago'),
            eupago_mbway: t('orders.paymentMethods.eupago_mbway'),
            eupago_mb: t('orders.paymentMethods.eupago_mb'),
            none: t('orders.paymentMethods.none')
        };
        return methods[method] || method;
    };

    // Handle opening ticket dialog for order
    const handleOpenTicketDialog = (order) => {
        setSelectedOrderForTicket(order);
        setShowTicketDialog(true);
    };

    // Helper function to convert country ISO code to full country name using i18n
    const getCountryName = (countryCode) => {
        return getCountryNameFromI18n(countryCode, locale);
    };

    // Filter orders based on search and filter criteria
    const filteredOrders = allOrders.filter((order) => {
        // Search filter (order ID)
        if (orderSearchTerm) {
            const searchLower = orderSearchTerm.toLowerCase();
            const orderIdMatch = order.id.toLowerCase().includes(searchLower);
            const orderNumberMatch = order.orderNumber?.toLowerCase().includes(searchLower);
            if (!orderIdMatch && !orderNumberMatch) {
                return false;
            }
        }

        // Order status filter
        if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
            return false;
        }

        // Payment status filter
        if (paymentStatusFilter !== 'all' && order.paymentStatus !== paymentStatusFilter) {
            return false;
        }

        return true;
    });

    // Pagination logic for orders
    const getPaginatedOrders = () => {
        const startIndex = (currentOrderPage - 1) * ordersPerPage;
        const endIndex = startIndex + ordersPerPage;
        return filteredOrders.slice(startIndex, endIndex);
    };

    // Check if EuPago order has expired based on payment method time limits
    const isEuPagoOrderExpired = (order) => {
        if (order.paymentStatus !== 'pending' || !order.paymentMethod?.startsWith('eupago_')) {
            return false;
        }

        const now = Date.now();

        // Check against expiryTime if set
        if (order.expiryTime) {
            return now > new Date(order.expiryTime).getTime();
        }

        // If no expiryTime, check against order creation time + payment method limits
        const orderCreatedAt = new Date(order.createdAt).getTime();
        const timeSinceCreation = now - orderCreatedAt;

        if (order.paymentMethod === 'eupago_mb') {
            // Multibanco: 48 hours limit
            const fortyEightHours = 48 * 60 * 60 * 1000;
            return timeSinceCreation > fortyEightHours;
        } else if (order.paymentMethod === 'eupago_mbway') {
            // MB WAY: 5 minutes limit
            const fiveMinutes = 5 * 60 * 1000;
            return timeSinceCreation > fiveMinutes;
        }

        return false;
    };

    const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const paginatedOrders = getPaginatedOrders();

    // Handle copy referral link
    const handleCopyReferralLink = async () => {
        if (!userData?.referralCode) return;

        const referralLink = `${window.location.origin}/?ref=${userData.referralCode}`;
        try {
            await navigator.clipboard.writeText(referralLink);
            toast.success(t('toast.referralLinkCopied'));
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error(t('toast.failedToCopyLink'));
        }
    };

    // Handle share referral link
    const handleShareReferralLink = async () => {
        if (!userData?.referralCode) return;

        const referralLink = `${window.location.origin}/?ref=${userData.referralCode}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join our Club',
                    text: 'Join our loyalty club and earn rewards!',
                    url: referralLink
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback to copy
            handleCopyReferralLink();
        }
    };

    // Load user referrals
    const loadReferrals = async () => { 
         console.log('Loading referrals for code:', userData);
        if (!userData?.referralCode) return; 
        try {
            const result = await getUserReferrals(userData.referralCode);
            if (result.success) {
                setReferrals(result.data || []);
            } else {
                console.error('Error loading referrals:', result.error);
            }
        } catch (error) {
            console.error('Error loading referrals:', error);
        }  
    };

    // Handle view referrals
    const handleViewReferrals = () => {
        loadReferrals();
        setShowReferralsDialog(true);
    };

    // Handle delete review
    const handleDeleteReview = (review) => {
        setReviewToDelete(review);
        setDeleteReviewConfirmOpen(true);
    };

    const confirmDeleteReview = async () => {
        if (!reviewToDelete || !user) return;

        setIsDeletingReview(true);
        try {
            // Import and call the server function directly
            const { deleteUserReview } = await import('@/lib/server/store.js');
            const result = await deleteUserReview(reviewToDelete.key || reviewToDelete.id, user.email);

            if (result.success) {
                // Remove the deleted review from local state
                setUserReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
                toast.success(t('toast.reviewDeletedSuccess'));
            } else {
                toast.error(result.error || t('toast.failedToDeleteReview'));
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            toast.error(t('toast.failedToDeleteReview'));
        } finally {
            setIsDeletingReview(false);
            setDeleteReviewConfirmOpen(false);
            setReviewToDelete(null);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h1 className="text-3xl font-bold flex flex-nowrap items-center gap-4">
                    <Link href="/" className="hover:text-primary transition-colors duration-200">
                    <CircleChevronLeft className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-200" />
                    </Link>
                    {t('pageTitle')}
                </h1>
                <div className="flex items-center flex-nowrap gap-2">
                    {user?.role === 'admin' && (
                        <Link prefetch={false} href="/admin" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                                <Shield className="h-4 w-4" />
                                <span>{t('administration')}</span>
                            </Button>
                        </Link>
                    )}
                    <Button
                        className="px-3 py-2"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            router.push('/auth/logout');
                        }}>
                        <LogOut className="h-4 w-4" color="red" />
                        <span>{t('signOut')}</span>
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">
                        <User className="h-4 w-4" />
                        {t('tabs.overview')}
                    </TabsTrigger>
                    <TabsTrigger value="favorites">
                        <Heart className="h-4 w-4" />
                        {t('tabs.favorites')} ({favorites.length})
                    </TabsTrigger>
                    <TabsTrigger value="orders">
                        <ShoppingBag className="h-4 w-4" />
                        {t('tabs.orders')} ({allOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="reviews">
                        <Star className="h-4 w-4" />
                        {t('tabs.reviews')} ({userReviews.length})
                    </TabsTrigger>
                    <TabsTrigger value="preferences">
                        <Bell className="h-4 w-4" />
                        {t('tabs.notifications')} 
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <KeyRound className="h-4 w-4" />
                        {t('tabs.security')} 
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-3 lg:gap-6 grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('overview.ordersCard')}</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{allOrders.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('overview.favoritesCard')}</CardTitle>
                                <Heart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{favorites.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('overview.reviewsCard')}</CardTitle>
                                <Star className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userReviews.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('overview.pointsCard')}</CardTitle>
                                <Award className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{clubProfile?.clubPoints || 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className={`grid ${userData?.referralCode ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{t('overview.profileTitle')}</CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setProfileForm({
                                            displayName: currentUser?.displayName || userData?.displayName || ''
                                        });
                                        setEditProfileDialogOpen(true);
                                    }}
                                    className="h-8">
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('overview.edit')}
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-muted-foreground">{t('overview.yourName')}</Label>
                                    <p className="text-lg font-medium">
                                        {currentUser?.displayName || userData?.displayName || currentUser?.name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">{t('overview.yourEmail')}</Label>
                                    <p className="text-lg font-medium">{currentUser?.email || userData?.email}</p>
                                </div>
                            </CardContent>
                        </Card> 
                        
                        {/* Referral Section */}
                        {userData?.referralCode && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    {t('overview.referralTitle')}
                                </CardTitle>
                                <CardDescription>
                                    {t('overview.referralDescription')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <Label className="text-sm font-medium mb-2">{t('overview.yourReferralLink')}</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${userData.referralCode}`}
                                            readOnly
                                            className="flex-1"
                                        />
                                        <Button variant="outline" size="sm" onClick={handleCopyReferralLink}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleShareReferralLink}>
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {t('overview.referralCode')}{' '}
                                        <span className="font-mono font-bold">{userData.referralCode}</span>
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div>
                                        <p className="text-sm font-medium">{t('overview.friendsReferred')}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t('overview.friendsReferredDescription')}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={handleViewReferrals}>
                                        <ExternalLink className="h-4 w-4" />
                                        {t('overview.viewInvites')} ({referrals.length})
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        )}
                    </div> 

                    {allOrders.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('overview.recentOrders')}</CardTitle>
                                <CardDescription>{t('overview.last5Purchases')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {allOrders.slice(0, 5).map((order) => (
                                        <div
                                            key={order.id}
                                            className="flex items-center justify-between border-b pb-4 last:border-0 border-border">
                                            <div>
                                                <p className="font-medium">{t('orders.order')} #{order.id.slice(0, 8)}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">{Number(order.total || 0).toFixed(2)}€</p>
                                                {getStatusBadge(order.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full mt-4"
                                    onClick={() => handleTabChange('orders')}>
                                    {t('overview.viewAll')} 
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Favorites Tab */}
                <TabsContent value="favorites">
                    <Card className="p-0 bg-transparent border-none shadow-none">
                        <CardHeader className="p-0">
                            <CardTitle>{t('favorites.title')}</CardTitle>
                            <CardDescription>{t('favorites.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {favorites.length === 0 ? (
                                <div className="text-center py-12">
                                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground mb-4">{t('favorites.noFavorites')}</p>
                                    <Button asChild>
                                        <Link prefetch={false} href="/shop">
                                            {t('favorites.browseProducts')}
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                                    {favorites.map((product) => (
                                        <Card
                                            key={`${product.id}`} 
                                        > 
                                                <CardHeader>
                                                    <CardTitle className="text-sm">{product.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm font-medium">
                                                        {Number(product.price || 0).toFixed(2)}€
                                                    </p>
                                                    <button
                                                        onClick={() => handleFavoriteChange(product.id)}
                                                        className="absolute top-2 right-2 text-red-500 hover:text-red-600">
                                                        <HeartFilled className="h-5 w-5" />
                                                    </button>
                                                </CardContent> 
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders">
                    <Card className="p-0 bg-transparent border-none shadow-none">
                        <CardHeader className="w-full p-0 flex flex-row items-center justify-between">
                            <div className="w-full">
                                <CardTitle className="w-full flex items-center justify-between flex-nowrap gap-2">
                                    {t('orders.title')}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        title="Switch view"
                                        onClick={() => setOrderViewType(orderViewType === 'card' ? 'table' : 'card')}
                                        className="ml-auto">
                                        {orderViewType === 'card' ? (
                                            <List className="h-4 w-4" />
                                        ) : (
                                            <Grid3X3 className="h-4 w-4" />
                                        )}
                                    </Button> 
                                    <Button
                                        variant="outline" 
                                        size="sm"
                                        title="Refresh orders"
                                        disabled={isRefreshingOrders}
                                        onClick={() => handleOrdersRefresh()}
                                    > 
                                        {isRefreshingOrders ? (
                                            <span className="flex items-center gap-1"> 
                                                <RefreshCw className="h-4 w-4 animate-spin" /> 
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <RefreshCw className="h-4 w-4" /> 
                                            </span>
                                        )}
                                    </Button>
                                </CardTitle>
                                <CardDescription>
                                    {t('orders.trackOrders')} ({filteredOrders.length}{' '}
                                    {orderSearchTerm || orderStatusFilter !== 'all' || paymentStatusFilter !== 'all'
                                        ? `${t('orders.of')} ${allOrders.length}`
                                        : t('orders.total')}
                                    )
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Search and Filter Controls */}
                            <div className="mb-6 space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {/* Search Input */}
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                            <Input
                                                placeholder={t('orders.searchPlaceholder')}
                                                value={orderSearchTerm}
                                                onChange={(e) => setOrderSearchTerm(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>

                                    {/* Filters */}
                                    <div className="flex gap-2">
                                        <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                                            <SelectTrigger className="w-full sm:w-min-content">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('orders.statusAll')}</SelectItem>
                                                <SelectItem value="pending">{t('orders.statusPending')}</SelectItem>
                                                <SelectItem value="processing">{t('orders.statusProcessing')}</SelectItem>
                                                <SelectItem value="delivered">{t('orders.statusShipped')}</SelectItem>
                                                <SelectItem value="complete">{t('orders.statusComplete')}</SelectItem>
                                                <SelectItem value="cancelled">{t('orders.statusCancelled')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div> 
                                </div>

                                {/* Active Filters Display */}
                                {(orderSearchTerm || orderStatusFilter !== 'all' || paymentStatusFilter !== 'all') && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">{t('orders.activeFilters')}</span>
                                        {orderSearchTerm && (
                                            <Badge variant="secondary" className="gap-1">
                                                {t('orders.filterSearch')} {orderSearchTerm}
                                                <button
                                                    onClick={() => setOrderSearchTerm('')}
                                                    className="ml-1 hover:text-foreground">
                                                    ×
                                                </button>
                                            </Badge>
                                        )}
                                        {orderStatusFilter !== 'all' && (
                                            <Badge variant="secondary" className="gap-1">
                                                {t('orders.filterStatus')} {orderStatusFilter}
                                                <button
                                                    onClick={() => setOrderStatusFilter('all')}
                                                    className="ml-1 hover:text-foreground">
                                                    ×
                                                </button>
                                            </Badge>
                                        )}
                                        {paymentStatusFilter !== 'all' && (
                                            <Badge variant="secondary" className="gap-1">
                                                {t('orders.filterPayment')} {paymentStatusFilter}
                                                <button
                                                    onClick={() => setPaymentStatusFilter('all')}
                                                    className="ml-1 hover:text-foreground">
                                                    ×
                                                </button>
                                            </Badge>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setOrderSearchTerm('');
                                                setOrderStatusFilter('all');
                                                setPaymentStatusFilter('all');
                                            }}
                                            className="h-6 px-2 text-xs">
                                            {t('orders.clearAll')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {orderNotFound && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                                    <p className="text-destructive font-medium">
                                        {t('orders.orderNotFoundTitle')}
                                    </p>
                                </div>
                            )}
                            {allOrders.length === 0 ? (
                                <div className="text-center py-12">
                                    <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground mb-4">{t('orders.noOrders')}</p>
                                    <Button asChild>
                                        <Link prefetch={false} href="/shop">
                                            {t('orders.startShopping')}
                                        </Link>
                                    </Button>
                                </div>
                            ) : filteredOrders.length === 0 ? (
                                <div className="text-center py-12">
                                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground mb-4">{t('orders.noResults')}</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setOrderSearchTerm('');
                                            setOrderStatusFilter('all');
                                            setPaymentStatusFilter('all');
                                        }}>
                                        {t('orders.clearFilters')}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {orderViewType === 'card' ? (
                                        <div className="space-y-4">
                                            {paginatedOrders.map((order) => {
                                                let items = [];
                                                try {
                                                    items =
                                                        typeof order.items === 'string'
                                                            ? JSON.parse(order.items)
                                                            : order.items || [];
                                                } catch (e) {
                                                    items = [];
                                                }

                                                const isExpanded = expandedOrders[order.id];

                                                return (
                                                    <Card
                                                        key={order.id}
                                                        id={`order-${order.id}`}
                                                        className="overflow-hidden scroll-mt-20">
                                                        <CardHeader>
                                                            <div className="flex justify-between items-start gap-4">
                                                                <div className="flex-1">
                                                                    <CardTitle className="text-lg">
                                                                        {t('orders.order')} #{order.id.slice(0, 8).toUpperCase()}
                                                                    </CardTitle>
                                                                    <CardDescription>
                                                                        {t('orders.placedOn')}{' '}
                                                                        {new Date(order.createdAt).toLocaleDateString()}{' '}
                                                                        {t('orders.at')}{' '}
                                                                        {new Date(order.createdAt).toLocaleTimeString()}
                                                                    </CardDescription>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    {order.status === 'cancelled' ? (
                                                                        getStatusBadge('cancelled')
                                                                    ) : order.paymentStatus === 'paid' ? (
                                                                        <>
                                                                            {getStatusBadge(order.status)}
                                                                            <Badge variant="default">
                                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                                {t('orders.paid')}
                                                                            </Badge>
                                                                        </>
                                                                    ) : (
                                                                        order.paymentStatus !== 'canceled' && (
                                                                            <Badge variant="warning">
                                                                                <Clock className="h-3 w-3 mr-1" />{t('orders.awaitingPayment')}
                                                                            </Badge>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="space-y-4">
                                                            {/* Order Items Summary */}
                                                            <div className="space-y-2">
                                                                {items
                                                                    .slice(0, isExpanded ? items.length : 2)
                                                                    .map((item, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="flex items-center justify-between py-2 ">
                                                                            <div className="flex items-center gap-3">
                                                                                {item.image && (
                                                                                    <div className="relative w-12 h-12 shrink-0">
                                                                                        <Image
                                                                                            src={item.image}
                                                                                            alt={item.name}
                                                                                            fill
                                                                                            loading="lazy"
                                                                                            priority={false}
                                                                                            className="object-cover rounded"
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="font-medium truncate">
                                                                                        {item.name}
                                                                                    </p>
                                                                                    <p className="text-sm text-muted-foreground">
                                                                                        {item.quantity} × €
                                                                                        {Number(
                                                                                            item.price || 0
                                                                                        ).toFixed(2)}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <p className="font-medium whitespace-nowrap ml-4">
                                                                                {(
                                                                                    Number(item.price || 0) *
                                                                                    Number(item.quantity || 0)
                                                                                ).toFixed(2)}
                                                                                €
                                                                            </p>
                                                                        </div>
                                                                    ))}

                                                                {items.length > 2 && !isExpanded && (
                                                                    <p className="text-sm text-muted-foreground text-center py-2">
                                                                        +{items.length - 2} {t('orders.moreItems')}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Expanded Order Details */}
                                                            {isExpanded && (
                                                                <div className="flex flex-col space-y-4 pt-4 border-t border-border">
                                                                    {/* Order Summary */}
                                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                                        <div>
                                                                            <p className="text-muted-foreground mb-1">
                                                                                {t('orders.subtotal')}
                                                                            </p>
                                                                            <p className="font-medium">
                                                                                {Number(order.subtotal || 0).toFixed(2)}
                                                                                €
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-muted-foreground mb-1">
                                                                                {t('orders.shipping')}
                                                                            </p>
                                                                            <p className="font-medium">
                                                                                {Number(
                                                                                    order.shippingCost || 0
                                                                                ).toFixed(2)}
                                                                                €
                                                                            </p>
                                                                        </div>
                                                                        {order.discountAmount > 0 && (
                                                                            <div>
                                                                                <p className="text-muted-foreground mb-1">
                                                                                    {t('orders.discount')}
                                                                                </p>
                                                                                <p className="font-medium text-green-600">
                                                                                    -
                                                                                    {Number(
                                                                                        order.discountAmount || 0
                                                                                    ).toFixed(2)}
                                                                                    €
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                        {order.taxAmount > 0 && (
                                                                            <div>
                                                                                <p className="text-muted-foreground mb-1">
                                                                                    VAT ({order.taxRate}%)
                                                                                </p>
                                                                                <p className="font-medium">
                                                                                    {Number(
                                                                                        order.taxAmount || 0
                                                                                    ).toFixed(2)}
                                                                                    €{' '}
                                                                                    {order.taxIncluded
                                                                                        ? '(Included)'
                                                                                        : ''}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Payment & Shipping Info */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <p className="font-semibold text-sm">
                                                                                {t('orders.paymentInfo')}
                                                                            </p>
                                                                            <div className="text-sm space-y-1">
                                                                                <p className="text-muted-foreground">
                                                                                    {t('orders.method')}{' '}
                                                                                    <span className="text-foreground">
                                                                                        {formatPaymentMethod(
                                                                                            order.paymentMethod
                                                                                        )}
                                                                                    </span>
                                                                                </p>
                                                                                <p className="text-muted-foreground">
                                                                                    {t('orders.status')}{' '}
                                                                                    <span className="text-foreground capitalize">
                                                                                        {getPaymentStatus(
                                                                                            order.paymentStatus
                                                                                        ) || 'Pending'}
                                                                                    </span>
                                                                                </p>
                                                                            </div> 

                                                                            {/* Payment Instructions - Only show if not paid and user clicked Pay Now */}
                                                                            {order.paymentStatus !== 'paid' &&
                                                                                order.paymentMethod && (
                                                                                    <div className="flex-1 space-y-2"> 

                                                                                        {/* Payment-specific instructions */}
                                                                                        {order.paymentMethod ===
                                                                                            'bank_transfer' && (
                                                                                            <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                                                                                                <p className="font-medium">
                                                                                                    Bank Transfer Instructions:
                                                                                                </p>
                                                                                                <p>
                                                                                                    Please make the bank transfer to:
                                                                                                </p>
                                                                                                <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-amber-300 dark:border-amber-800 font-mono text-xs">
                                                                                                    <p>
                                                                                                        IBAN: PT50 0000 0000
                                                                                                        0000 0000 0000 0
                                                                                                    </p>
                                                                                                    <p>
                                                                                                        Reference: #
                                                                                                        {order.id
                                                                                                            .slice(0, 8)
                                                                                                            .toUpperCase()}
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {(order.paymentMethod === 'eupago' ||
                                                                                            order.paymentMethod ===
                                                                                                'eupago_mb') &&
                                                                                            order.eupagoReference && (
                                                                                            <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1"> 
                                                                                                <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-amber-300 dark:border-amber-800">
                                                                                                    {order.eupagoEntity && (
                                                                                                        <p className="font-mono">
                                                                                                            Entity:{' '}
                                                                                                            {
                                                                                                                order.eupagoEntity
                                                                                                            }
                                                                                                        </p>
                                                                                                    )}
                                                                                                    {order.eupagoReference && (
                                                                                                        <p className="font-mono">
                                                                                                            Reference:{' '}
                                                                                                            {
                                                                                                                order.eupagoReference
                                                                                                            }
                                                                                                        </p>
                                                                                                    )}
                                                                                                    <p className="font-mono">
                                                                                                        Amount:{' '}
                                                                                                        {Number(
                                                                                                            order.total || 0
                                                                                                        ).toFixed(2)}
                                                                                                        €
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {order.paymentMethod ===
                                                                                            'eupago_mbway' &&
                                                                                            order.eupagoReference && (
                                                                                                <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1"> 
                                                                                                    <p>
                                                                                                        A payment request has been sent to your phone number.
                                                                                                    </p>
                                                                                                    <p>
                                                                                                        Please confirm the payment in the MB WAY app.
                                                                                                    </p>
                                                                                                </div>
                                                                                        )}

                                                                                        {order.paymentMethod ===
                                                                                            'pay_on_delivery' && (
                                                                                            <div className="text-sm text-amber-800 dark:text-amber-200">
                                                                                                <p>
                                                                                                    Payment will be collected upon delivery. Please have the exact amount ready.
                                                                                                </p>
                                                                                            </div>
                                                                                        )}

                                                                                        {(order.paymentMethod === 'stripe' ||
                                                                                            order.paymentMethod === 'card') && (
                                                                                            <div className="text-sm text-amber-800 dark:text-amber-200">
                                                                                                <p>
                                                                                                    Click "Pay Now" to complete the card payment.
                                                                                                </p>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Already Paid Button - Show for applicable payment methods */}
                                                                                        {(order.paymentMethod ===
                                                                                            'bank_transfer' ||
                                                                                            order.paymentMethod === 'eupago' ||
                                                                                            order.paymentMethod ===
                                                                                                'eupago_mb' ||
                                                                                            order.paymentMethod ===
                                                                                                'eupago_mbway') && (
                                                                                            <div className="mt-2 pt-2 border-t border-border">
                                                                                                <Button
                                                                                                    variant="outline"
                                                                                                    size="sm"
                                                                                                    onClick={() =>
                                                                                                        handlePaymentRefresh(
                                                                                                            order.id
                                                                                                        )
                                                                                                    }
                                                                                                    disabled={
                                                                                                        isRefreshingPayment[
                                                                                                            order.id
                                                                                                        ]
                                                                                                    }
                                                                                                    className="bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/20">
                                                                                                    {isRefreshingPayment[
                                                                                                        order.id
                                                                                                    ] ? (
                                                                                                        <>
                                                                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                                                                                            Verifying...
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                                                                            I Already Paid
                                                                                                        </>
                                                                                                    )}
                                                                                                </Button>
                                                                                                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                                                                                    Click if you've already paid to check the status
                                                                                                </p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div> 
                                                                                )}
                                                                        </div>

                                                                        {order.customer && (
                                                                            <div className="space-y-2">
                                                                                <p className="font-semibold text-sm">
                                                                                    Shipping Address
                                                                                </p>
                                                                                <div className="text-sm text-muted-foreground space-y-1">
                                                                                    <p>
                                                                                        {order.customer.firstName}{' '}
                                                                                        {order.customer.lastName}
                                                                                    </p>
                                                                                    <p>
                                                                                        {order.customer.streetAddress}
                                                                                    </p>
                                                                                    {order.customer.apartmentUnit && (
                                                                                        <p>
                                                                                            {
                                                                                                order.customer
                                                                                                    .apartmentUnit
                                                                                            }
                                                                                        </p>
                                                                                    )}
                                                                                    <p>
                                                                                        {order.customer.city},{' '}
                                                                                        {order.customer.state}{' '}
                                                                                        {order.customer.zipCode}
                                                                                    </p>
                                                                                    <p>
                                                                                        {getCountryName(
                                                                                            order.customer.country
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Tracking Number */}
                                                                    {order.tracking && (
                                                                        <div className="pt-2">
                                                                            <p className="text-sm text-muted-foreground">
                                                                                Tracking Number:{' '}
                                                                                <span className="font-mono text-foreground">
                                                                                    {order.tracking}
                                                                                </span>
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* Delivery Notes */}
                                                                    {order.deliveryNotes && (
                                                                        <div className="pt-2">
                                                                            <p className="font-semibold text-sm mb-1">
                                                                                Delivery Notes
                                                                            </p>
                                                                            <p className="text-sm text-muted-foreground">
                                                                                {order.deliveryNotes}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* Report Issue Button */}
                                                                    <div className="flex w-full">
                                                                        <Button
                                                                            variant="transparent"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                handleOpenTicketDialog(order)
                                                                            }
                                                                            className="flex-1 sm:flex-none text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700">
                                                                            <MessageSquare className="h-4 w-4 mr-1" />
                                                                            Report Issue
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Order Total & Actions */}
                                                            <div className="flex flex-col justify-start items-start gap-4 pt-4">
                                                                <div className="flex items-baseline gap-2">
                                                                    <span className="font-semibold">Total:</span>
                                                                    <span className="text-2xl font-bold">
                                                                        {Number(order.total || 0).toFixed(2)}€
                                                                    </span>
                                                                </div>
                                                                <div className="flex w-full flex-col md:flex-row gap-4 md:gap-2">
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                toggleOrderExpansion(order.id)
                                                                            }
                                                                            className="flex-1 sm:flex-none">
                                                                            {isExpanded ? (
                                                                                <>
                                                                                    <ChevronUp className="h-4 w-4 mr-1" />
                                                                                    Less Details
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <ChevronDown className="h-4 w-4 mr-1" />
                                                                                    More Details
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleDownloadReceipt(order)}
                                                                            disabled={
                                                                                order.paymentStatus === 'pending' ||
                                                                                downloadingReceipt === order.id
                                                                            }
                                                                            className="flex-1 sm:flex-none">
                                                                            {downloadingReceipt === order.id ? (
                                                                                <>{t('orders.downloading')}</>
                                                                            ) : (
                                                                                <>
                                                                                    <Download className="h-4 w-4 mr-1" />
                                                                                    {t('orders.receipt')}
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                    <div className="flex w-full">
                                                                        {order.status !== 'cancelled' &&
                                                                            order.paymentStatus !== 'paid' &&
                                                                            !isExpanded && (
                                                                                <Button
                                                                                    variant="default"
                                                                                    size="sm"
                                                                                    onClick={() =>
                                                                                        handlePaymentRefresh(
                                                                                            order.id
                                                                                        )
                                                                                    }
                                                                                    className="flex-1 sm:flex-none"> 
                                                                                    {isRefreshingPayment[
                                                                                        order.id
                                                                                    ] ? (
                                                                                        <>
                                                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                                                                            Verifying...
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                                                            Check Payment
                                                                                        </>
                                                                                    )}
                                                                                </Button>
                                                                                
                                                                            )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Table View */
                                        <div className="space-y-4">
                                            <div className="rounded-md border overflow-x-auto">
                                                {/* Desktop Table Header - Hidden on mobile */}
                                                <div className="hidden md:grid md:grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 font-medium text-sm border-b bg-muted/50">
                                                    <div className="col-span-2">{t('orders.tableHeaders.id')}</div>
                                                    <div className="col-span-2">{t('orders.tableHeaders.date')}</div>
                                                    <div className="col-span-2">{t('orders.tableHeaders.total')}</div>
                                                    <div className="col-span-2">{t('orders.tableHeaders.status')}</div>
                                                    <div className="col-span-2">{t('orders.tableHeaders.payment')}</div>
                                                    <div className="col-span-2">{t('orders.tableHeaders.actions')}</div>
                                                </div>

                                                {/* Mobile/Tablet Header */}
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:hidden gap-2 p-3 font-medium text-xs border-b bg-muted/50">
                                                    <div className="col-span-1">{t('orders.tableHeaders.id')}</div>
                                                    <div className="col-span-1 sm:col-span-2">{t('orders.tableHeaders.totalStatus')}</div>
                                                    <div className="col-span-1 sm:col-span-2">{t('orders.tableHeaders.payment')}</div>
                                                    <div className="col-span-1">{t('orders.tableHeaders.actions')}</div>
                                                </div>

                                                {paginatedOrders.map((order) => (
                                                    <div
                                                        key={order.id}
                                                        className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                        {/* Desktop Row */}
                                                        <div
                                                            className="hidden md:grid md:grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 cursor-pointer"
                                                            onClick={() => toggleOrderExpansion(order.id)}>
                                                            <div className="col-span-2">
                                                                <p className="font-medium font-mono text-sm truncate">
                                                                    #{order.id.slice(0, 8).toUpperCase()}
                                                                </p>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <p className="text-sm">
                                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {new Date(order.createdAt).toLocaleTimeString()}
                                                                </p>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <p className="font-medium">
                                                                    {Number(order.total || 0).toFixed(2)}€
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {(order.items || []).length}{' '}
                                                                    {(order.items || []).length === 1
                                                                        ? 'item'
                                                                        : 'items'}
                                                                </p>
                                                            </div>
                                                            <div className="col-span-2">
                                                                {getStatusBadge(order.status)}
                                                            </div>
                                                            <div className="col-span-2">
                                                                {order.paymentStatus === 'paid' ? (
                                                                    <Badge variant="success">
                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                        Paid
                                                                    </Badge>
                                                                ) : order.paymentStatus === 'pending' ||
                                                                  order.paymentStatus === 'processing' ? (
                                                                    <Badge variant="outline">
                                                                        <Clock className="h-3 w-3 mr-1" />
                                                                        Pending
                                                                    </Badge>
                                                                ) : order.paymentStatus === 'cancelled' ||
                                                                  order.paymentStatus === 'failed' ? (
                                                                    <Badge variant="destructive">
                                                                        <CircleX className="h-3 w-3 mr-1" />
                                                                        Expired
                                                                    </Badge>
                                                                ) : order.paymentStatus === 'refunded' ? (
                                                                    <Badge variant="warning">
                                                                        <CircleX className="h-3 w-3 mr-1" />
                                                                        Refunded
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline">
                                                                        <Clock className="h-3 w-3 mr-1" />
                                                                        Pending
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="col-span-2">
                                                                <div
                                                                    className="flex gap-1"
                                                                    onClick={(e) => e.stopPropagation()}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => toggleOrderExpansion(order.id)}
                                                                        className="h-8 w-8 p-0">
                                                                        {expandedOrders[order.id] ? (
                                                                            <ChevronUp className="h-4 w-4" />
                                                                        ) : (
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                    {/* Pay button for desktop */}
                                                                    {order.status !== 'cancelled' &&
                                                                        order.paymentStatus !== 'paid' &&
                                                                        !isEuPagoOrderExpired(order) && (
                                                                            <Button
                                                                                variant="default"
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    togglePaymentInstructions(order.id)
                                                                                }
                                                                                className="h-8 w-8 p-0">
                                                                                <CreditCard className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleDownloadReceipt(order)}
                                                                        disabled={
                                                                            order.paymentStatus === 'pending' ||
                                                                            downloadingReceipt === order.id
                                                                        }
                                                                        className="h-8 w-8 p-0">
                                                                        <Download className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleOpenTicketDialog(order)}
                                                                        className="h-8 w-8 p-0 text-red-600 dark:text-red-400">
                                                                        <MessageSquare className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Mobile/Tablet Row */}
                                                        <div
                                                            className="grid grid-cols-4 sm:grid-cols-6 md:hidden gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                                            onClick={() => toggleOrderExpansion(order.id)}>
                                                            <div className="col-span-1">
                                                                <p className="font-medium font-mono text-xs truncate">
                                                                    #{order.id.slice(0, 8).toUpperCase()}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {new Date(order.createdAt).toLocaleDateString(
                                                                        'pt-PT',
                                                                        {
                                                                            day: '2-digit',
                                                                            month: '2-digit'
                                                                        }
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="col-span-1 sm:col-span-2">
                                                                <p className="font-medium text-sm">
                                                                    {Number(order.total || 0).toFixed(2)}€
                                                                </p>
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                                                    {getStatusBadge(order.status)}
                                                                    <span className="text-xs text-muted-foreground sm:hidden">
                                                                        {(order.items || []).length} items
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="col-span-1 sm:col-span-2">
                                                                {order.paymentStatus === 'paid' ? (
                                                                    <div className="text-xs">
                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                        <span className="hidden sm:inline">Paid</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs">
                                                                        <Clock className="h-3 w-3 mr-1" />
                                                                        <span className="hidden sm:inline">
                                                                            Pending
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <p className="text-xs text-muted-foreground hidden sm:block mt-1">
                                                                    {(order.items || []).length} items
                                                                </p>
                                                            </div>
                                                            <div className="col-span-1">
                                                                <div className="flex flex-col gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleOrderExpansion(order.id);
                                                                        }}
                                                                        className="h-7 w-7 p-0">
                                                                        {expandedOrders[order.id] ? (
                                                                            <ChevronUp className="h-3 w-3" />
                                                                        ) : (
                                                                            <ChevronDown className="h-3 w-3" />
                                                                        )}
                                                                    </Button>
                                                                    {/* Pay button moved here for small screens */}
                                                                    {order.status !== 'cancelled' &&
                                                                        order.paymentStatus !== 'paid' &&
                                                                        !isEuPagoOrderExpired(order) && (
                                                                            <Button
                                                                                variant="default"
                                                                                size="sm"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    togglePaymentInstructions(order.id);
                                                                                }}
                                                                                className="h-6 w-6 p-0">
                                                                                <CreditCard className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Expanded Order Details - Responsive */}
                                                        {expandedOrders[order.id] && (
                                                            <div className="p-3 md:p-4 bg-muted/30 mx-3 md:mx-4 mb-3 md:mb-4 rounded-lg">
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                                                                    {/* Order Items */}
                                                                    <div>
                                                                        <h4 className="font-semibold mb-3 text-sm md:text-base">
                                                                            Order Items
                                                                        </h4>
                                                                        <div className="space-y-2">
                                                                            {(order.items || []).map((item, idx) => (
                                                                                <div
                                                                                    key={idx}
                                                                                    className="flex items-center gap-2 md:gap-3 p-2 bg-background rounded">
                                                                                    {item.image && (
                                                                                        <div className="relative w-8 h-8 md:w-10 md:h-10 shrink-0">
                                                                                            <Image
                                                                                                src={item.image}
                                                                                                alt={item.name}
                                                                                                fill
                                                                                                loading="lazy"
                                                                                                className="object-cover rounded"
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="font-medium text-xs md:text-sm truncate">
                                                                                            {item.name}
                                                                                        </p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            {item.quantity} × €
                                                                                            {Number(
                                                                                                item.price || 0
                                                                                            ).toFixed(2)}
                                                                                        </p>
                                                                                    </div>
                                                                                    <p className="font-medium text-xs md:text-sm shrink-0">
                                                                                        €
                                                                                        {(
                                                                                            Number(item.price || 0) *
                                                                                            Number(item.quantity || 0)
                                                                                        ).toFixed(2)}
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {/* Order Summary */}
                                                                    <div>
                                                                        <h4 className="font-semibold mb-3 text-sm md:text-base">
                                                                            Summary
                                                                        </h4>
                                                                        <div className="space-y-2 text-xs md:text-sm">
                                                                            <div className="flex justify-between">
                                                                                <span>Subtotal:</span>
                                                                                <span>
                                                                                    €
                                                                                    {Number(
                                                                                        order.subtotal || 0
                                                                                    ).toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span>Shipping:</span>
                                                                                <span>
                                                                                    €
                                                                                    {Number(
                                                                                        order.shippingCost || 0
                                                                                    ).toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            {order.discountAmount > 0 && (
                                                                                <div className="flex justify-between text-green-600">
                                                                                    <span>Discount:</span>
                                                                                    <span>
                                                                                        -€
                                                                                        {Number(
                                                                                            order.discountAmount || 0
                                                                                        ).toFixed(2)}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {order.taxAmount > 0 && (
                                                                                <div className="flex justify-between">
                                                                                    <span>VAT ({order.taxRate}%):</span>
                                                                                    <span>
                                                                                        €
                                                                                        {Number(
                                                                                            order.taxAmount || 0
                                                                                        ).toFixed(2)}{' '}
                                                                                        {order.taxIncluded
                                                                                            ? '(Included)'
                                                                                            : ''}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex justify-between font-semibold text-sm md:text-lg border-t pt-2">
                                                                                <span>Total:</span>
                                                                                <span>
                                                                                    €
                                                                                    {Number(order.total || 0).toFixed(
                                                                                        2
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {order.customer && (
                                                                            <div className="mt-4">
                                                                                <h5 className="font-medium text-xs md:text-sm mb-2">
                                                                                    Shipping Address
                                                                                </h5>
                                                                                <div className="text-xs md:text-sm text-muted-foreground space-y-1">
                                                                                    <p>
                                                                                        {order.customer.firstName}{' '}
                                                                                        {order.customer.lastName}
                                                                                    </p>
                                                                                    <p>
                                                                                        {order.customer.streetAddress}
                                                                                    </p>
                                                                                    {order.customer.apartmentUnit && (
                                                                                        <p>
                                                                                            {
                                                                                                order.customer
                                                                                                    .apartmentUnit
                                                                                            }
                                                                                        </p>
                                                                                    )}
                                                                                    <p>
                                                                                        {order.customer.city},{' '}
                                                                                        {order.customer.state}{' '}
                                                                                        {order.customer.zipCode}
                                                                                    </p>
                                                                                    <p>
                                                                                        {getCountryName(
                                                                                            order.customer.country
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Action buttons for mobile/small screens */}
                                                                <div className="mt-4 pt-4 border-t border-border md:hidden">
                                                                    <div className="flex gap-2 flex-wrap">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleDownloadReceipt(order)}
                                                                            disabled={
                                                                                order.paymentStatus === 'pending' ||
                                                                                downloadingReceipt === order.id
                                                                            }
                                                                            className="flex-1">
                                                                            {downloadingReceipt === order.id ? (
                                                                                <>{t('orders.downloading')}</>
                                                                            ) : (
                                                                                <>
                                                                                    <Download className="h-4 w-4 mr-1" />
                                                                                    {t('orders.receipt')}
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                handleOpenTicketDialog(order)
                                                                            }
                                                                            className="flex-1 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                                                                            <MessageSquare className="h-4 w-4 mr-1" />
                                                                            Report Issue
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Payment Instructions - Show for all screen sizes when applicable */}
                                                                {order.paymentStatus !== 'paid' &&
                                                                    order.paymentMethod &&
                                                                    showPaymentInstructions[order.id] && (
                                                                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-950 rounded-lg">
                                                                            <div className="flex items-start gap-3">
                                                                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                                                                <div className="flex-1 space-y-2">
                                                                                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                                                                                        Pending Payment
                                                                                    </p>
                                                                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                                                                        <strong>
                                                                                            Selected Method:
                                                                                        </strong>{' '}
                                                                                        {formatPaymentMethod(
                                                                                            order.paymentMethod
                                                                                        )}
                                                                                    </p>

                                                                                    {/* Payment-specific instructions */}
                                                                                    {order.paymentMethod ===
                                                                                        'bank_transfer' && (
                                                                                        <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                                                                                            <p className="font-medium">
                                                                                                Bank Transfer Instructions:
                                                                                            </p>
                                                                                            <p>
                                                                                                Please make the bank transfer to:
                                                                                            </p>
                                                                                            <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-amber-300 dark:border-amber-800 font-mono text-xs">
                                                                                                <p>
                                                                                                    IBAN: PT50 0000 0000
                                                                                                    0000 0000 0000 0
                                                                                                </p>
                                                                                                <p>
                                                                                                    Reference: #
                                                                                                    {order.id
                                                                                                        .slice(0, 8)
                                                                                                        .toUpperCase()}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {(order.paymentMethod ===
                                                                                        'eupago' ||
                                                                                        order.paymentMethod ===
                                                                                            'eupago_mb') &&
                                                                                        order.eupagoReference && (
                                                                                            <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                                                                                                <p className="font-medium">
                                                                                                    Multibanco Reference:
                                                                                                </p>
                                                                                                <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-amber-300 dark:border-amber-800">
                                                                                                    {order.eupagoEntity && (
                                                                                                        <p className="font-mono">
                                                                                                            Entity:{' '}
                                                                                                            {
                                                                                                                order.eupagoEntity
                                                                                                            }
                                                                                                        </p>
                                                                                                    )}
                                                                                                    {order.eupagoReference && (
                                                                                                        <p className="font-mono">
                                                                                                            Reference:{' '}
                                                                                                            {
                                                                                                                order.eupagoReference
                                                                                                            }
                                                                                                        </p>
                                                                                                    )}
                                                                                                    <p className="font-mono">
                                                                                                        Amount:{' '}
                                                                                                        {Number(
                                                                                                            order.total ||
                                                                                                                0
                                                                                                        ).toFixed(2)}
                                                                                                        €
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                    {order.paymentMethod ===
                                                                                        'eupago_mbway' &&
                                                                                        order.eupagoReference && (
                                                                                            <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                                                                                                <p className="font-medium">
                                                                                                    MB WAY Payment:
                                                                                                </p>
                                                                                                <p>
                                                                                                    A payment request has been sent to your phone number.
                                                                                                </p>
                                                                                                <p>
                                                                                                    Please confirm the payment in the MB WAY app.
                                                                                                </p>
                                                                                            </div>
                                                                                        )}

                                                                                    {/* Already Paid Button - Show for applicable payment methods */}
                                                                                    {(order.paymentMethod ===
                                                                                        'bank_transfer' ||
                                                                                        order.paymentMethod ===
                                                                                            'eupago' ||
                                                                                        order.paymentMethod ===
                                                                                            'eupago_mb' ||
                                                                                        order.paymentMethod ===
                                                                                            'eupago_mbway') && (
                                                                                        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                onClick={() =>
                                                                                                    handlePaymentRefresh(
                                                                                                        order.id
                                                                                                    )
                                                                                                }
                                                                                                disabled={
                                                                                                    isRefreshingPayment[
                                                                                                        order.id
                                                                                                    ]
                                                                                                }
                                                                                                className="bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/20">
                                                                                                {isRefreshingPayment[
                                                                                                    order.id
                                                                                                ] ? (
                                                                                                    <>
                                                                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                                                                                        Verifying...
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                                                                        I Already Paid
                                                                                                    </>
                                                                                                )}
                                                                                            </Button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pagination Controls */}
                                    {totalOrderPages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mx-2 sm:mx-0 mt-4 border-t border-border">
                                            <p className="text-sm text-muted-foreground">
                                                {t('orders.showing')} {(currentOrderPage - 1) * ordersPerPage + 1} {t('orders.to')}{' '}
                                                {Math.min(currentOrderPage * ordersPerPage, filteredOrders.length)} {t('orders.of')}{' '}
                                                {filteredOrders.length} {t('orders.ordersLabel')}
                                                {orderSearchTerm ||
                                                orderStatusFilter !== 'all' ||
                                                paymentStatusFilter !== 'all'
                                                    ? ` (${allOrders.length} ${t('orders.totalCount')})`
                                                    : ''}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentOrderPage((prev) => Math.max(1, prev - 1))}
                                                    disabled={currentOrderPage === 1}>
                                                    <ChevronLeft className="h-4 w-4" />
                                                    <span className="hidden sm:inline ml-1">{t('orders.previous')}</span>
                                                </Button>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map(
                                                        (page) => (
                                                            <Button
                                                                key={page}
                                                                variant={
                                                                    currentOrderPage === page ? 'default' : 'outline'
                                                                }
                                                                size="sm"
                                                                onClick={() => setCurrentOrderPage(page)}
                                                                className="w-9">
                                                                {page}
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setCurrentOrderPage((prev) =>
                                                            Math.min(totalOrderPages, prev + 1)
                                                        )
                                                    }
                                                    disabled={currentOrderPage === totalOrderPages}>
                                                    <span className="hidden sm:inline mr-1">{t('orders.next')}</span>
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews">
                    <Card className="p-0 bg-transparent border-none">
                        <CardHeader className="p-0">
                            <CardTitle>{t('reviews.title')}</CardTitle>
                            <CardDescription>{t('reviews.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {userReviews.length === 0 ? (
                                <div className="text-center py-12">
                                    <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground mb-4">{t('reviews.noReviews')}</p>
                                    <Button asChild>
                                        <Link prefetch={false} href="/shop">
                                            {t('favorites.browseProducts')}
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {userReviews.map((review) => (
                                        <Card key={review.id}>
                                            <CardHeader>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg">
                                                            {review.productName || t('reviews.product')}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="flex">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`h-4 w-4 ${
                                                                            i < review.rating
                                                                                ? 'text-yellow-500 fill-yellow-500'
                                                                                : 'text-gray-300'
                                                                        }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            {getReviewStatusBadge(review.status)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm text-muted-foreground">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </p>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteReview(review)}
                                                            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-muted-foreground mb-3">
                                                    {review.comment || t('reviews.noComment')}
                                                </p>
                                                {review.status === 'pending' && (
                                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                            <AlertCircle className="h-4 w-4 inline mr-2" />{t('reviews.awaitingApproval')}
                                                        </p>
                                                    </div>
                                                )}
                                                {review.status === 'rejected' && (
                                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                                        <p className="text-sm text-red-800 dark:text-red-200">
                                                            <CircleX className="h-4 w-4 inline mr-2" />{t('reviews.rejected')}
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Preferences/Notifications Tab */}
                <TabsContent value="preferences" className="space-y-6">
                    {/* Communication Preferences Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                {t('preferences.title')}
                            </CardTitle>
                            <CardDescription>{t('preferences.description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{t('preferences.orderUpdates')}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('preferences.orderUpdatesDesc')}
                                        </p>
                                    </div>
                                    <Checkbox
                                        checked={preferences.orderUpdates}
                                        onCheckedChange={(checked) =>
                                            setPreferences({
                                                ...preferences,
                                                orderUpdates: checked
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{t('preferences.emailNotifications')}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('preferences.emailNotificationsDesc')}
                                        </p>
                                    </div>
                                    <Checkbox
                                        checked={preferences.emailNotifications}
                                        onCheckedChange={(checked) =>
                                            setPreferences({
                                                ...preferences,
                                                emailNotifications: checked
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{t('preferences.promotionalEmails')}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('preferences.promotionalEmailsDesc')}
                                        </p>
                                    </div>
                                    <Checkbox
                                        checked={preferences.marketingEmails}
                                        onCheckedChange={(checked) =>
                                            setPreferences({
                                                ...preferences,
                                                marketingEmails: checked
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{t('preferences.newsletter')}</p>
                                        <p className="text-sm text-muted-foreground">{t('preferences.newsletterDesc')}</p>
                                    </div>
                                    <Checkbox
                                        checked={preferences.newsletter}
                                        onCheckedChange={(checked) =>
                                            setPreferences({
                                                ...preferences,
                                                newsletter: checked
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{t('preferences.sms')}</p>
                                        <p className="text-sm text-muted-foreground">{t('preferences.smsDesc')}</p>
                                    </div>
                                    <Checkbox
                                        checked={preferences.smsNotifications}
                                        onCheckedChange={(checked) =>
                                            setPreferences({
                                                ...preferences,
                                                smsNotifications: checked
                                            })
                                        }
                                    />
                                </div>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleSavePreferences}
                                    disabled={savingPreferences}>
                                    {savingPreferences ? t('preferences.saving') : t('preferences.savePreferences')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {/* Security Tab */}
                <TabsContent value="security" className="space-y-6">

                    {/* Account Security Card */}
                    <Card className="p-0 bg-transparent border-none shadow-none">
                        <CardHeader className="p-0">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                {t('security.title')}
                            </CardTitle>
                            <CardDescription>{t('security.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                                <div className="flex-1">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Lock className="h-4 w-4" />
                                        {t('security.password')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t('security.passwordDesc')}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setPasswordDialogOpen(true)}
                                    className="w-full sm:w-auto">
                                    {t('security.changePassword')}
                                </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                                <div className="flex-1">
                                    <h4 className="font-medium flex items-center gap-2 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                        {t('security.deleteAccount')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t('security.deleteAccountDesc')}
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={() => setDeleteDialogOpen(true)}
                                    className="w-full sm:w-auto">
                                    {t('security.deleteAccount')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Password Change Dialog */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>{t('dialogs.changePassword.title')}</DialogTitle>
                        <DialogDescription>
                            {t('dialogs.changePassword.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordChange}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="dialog-currentPassword">{t('dialogs.changePassword.currentPassword')}</Label>
                                <Input
                                    id="dialog-currentPassword"
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            currentPassword: e.target.value
                                        })
                                    }
                                    required
                                    placeholder={t('dialogs.changePassword.currentPasswordPlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dialog-newPassword">{t('dialogs.changePassword.newPassword')}</Label>
                                <Input
                                    id="dialog-newPassword"
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            newPassword: e.target.value
                                        })
                                    }
                                    required
                                    minLength={8}
                                    placeholder={t('dialogs.changePassword.newPasswordPlaceholder')}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('dialogs.changePassword.passwordRequirements')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dialog-confirmPassword">{t('dialogs.changePassword.confirmPassword')}</Label>
                                <Input
                                    id="dialog-confirmPassword"
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            confirmPassword: e.target.value
                                        })
                                    }
                                    required
                                    minLength={8}
                                    placeholder={t('dialogs.changePassword.confirmPasswordPlaceholder')}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setPasswordDialogOpen(false);
                                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                }}
                                disabled={changingPassword}>
                                {t('dialogs.changePassword.cancel')}
                            </Button>
                            <Button type="submit" disabled={changingPassword}>
                                {changingPassword ? t('dialogs.changePassword.submitting') : t('dialogs.changePassword.submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Account Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">{t('dialogs.deleteAccount.title')}</DialogTitle>
                        <DialogDescription className="space-y-2">
                            <span className="font-medium">{t('dialogs.deleteAccount.description')}</span>
                            <span>
                                {t('dialogs.deleteAccount.dataRetention')} <strong>{t('dialogs.deleteAccount.days')}</strong>, {t('dialogs.deleteAccount.dataRetentionContinued')} <strong>{t('dialogs.deleteAccount.permanentlyDeleted')}</strong>.
                            </span>
                            <span className="text-sm">{t('dialogs.deleteAccount.confirmMessage')}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDeleteAccount}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="delete-password">{t('dialogs.deleteAccount.currentPassword')}</Label>
                                <Input
                                    id="delete-password"
                                    type="password"
                                    value={deleteForm.currentPassword}
                                    onChange={(e) =>
                                        setDeleteForm({
                                            ...deleteForm,
                                            currentPassword: e.target.value
                                        })
                                    }
                                    required
                                    placeholder={t('dialogs.deleteAccount.currentPasswordPlaceholder')}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setDeleteDialogOpen(false);
                                    setDeleteForm({ currentPassword: '' });
                                }}
                                disabled={deletingAccount}>
                                {t('dialogs.deleteAccount.cancel')}
                            </Button>
                            <Button type="submit" variant="destructive" disabled={deletingAccount || currentUser?.role === 'admin'}>
                                {deletingAccount ? t('dialogs.deleteAccount.submitting') : currentUser?.role === 'admin' ? t('dialogs.deleteAccount.notAllowed') : t('dialogs.deleteAccount.submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Ticket Dialog */}
            <TicketDialog
                open={showTicketDialog}
                onOpenChange={setShowTicketDialog}
                user={user}
                relatedOrder={selectedOrderForTicket}
                defaultSubject={
                    selectedOrderForTicket
                        ? `Problem with order ${selectedOrderForTicket.orderNumber || selectedOrderForTicket.id}`
                        : ''
                }
                defaultType="orders"
                onSuccess={() => {
                    setSelectedOrderForTicket(null);
                }}
            />

            {/* Edit Profile Dialog */}
            <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>{t('dialogs.editProfile.title')}</DialogTitle>
                        <DialogDescription>{t('dialogs.editProfile.description')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleProfileUpdate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-displayName">{t('dialogs.editProfile.yourName')}</Label>
                                <Input
                                    id="edit-displayName"
                                    type="text"
                                    value={profileForm.displayName}
                                    onChange={(e) =>
                                        setProfileForm({
                                            ...profileForm,
                                            displayName: e.target.value
                                        })
                                    }
                                    required
                                    minLength={2}
                                    maxLength={50}
                                    placeholder={t('dialogs.editProfile.yourNamePlaceholder')}
                                />
                                <p className="text-xs text-muted-foreground">{t('dialogs.editProfile.nameRequirements')}</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditProfileDialogOpen(false);
                                    setProfileForm({
                                        displayName: currentUser?.displayName || userData?.displayName || ''
                                    });
                                }}
                                disabled={updatingProfile}>
                                {t('dialogs.editProfile.cancel')}
                            </Button>
                            <Button type="submit" disabled={updatingProfile || profileForm.displayName.trim() === currentUser?.displayName}>
                                {updatingProfile ? t('dialogs.editProfile.submitting') : t('dialogs.editProfile.submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Referrals Dialog */}
            <Dialog open={showReferralsDialog} onOpenChange={setShowReferralsDialog}>
                <DialogContent className="sm:max-w-150">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {t('dialogs.referrals.title')} ({referrals.length})
                        </DialogTitle>
                        <DialogDescription>
                            {t('dialogs.referrals.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-100 overflow-y-auto">
                        {referrals.length > 0 ? (
                            <div className="space-y-2">
                                {referrals.map((referral) => (
                                    <div
                                        key={referral.uid || referral.id}
                                        className="flex items-center gap-3 p-3 border rounded-lg">
                                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{referral.name || t('dialogs.referrals.user')}</p>
                                            <p className="text-sm text-muted-foreground">{referral.email}</p>
                                            {referral.createdAt && (
                                                <p className="text-xs text-muted-foreground">
                                                    {t('dialogs.referrals.joinedOn')}{' '}
                                                    {new Date(referral.createdAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="text-xs font-medium">{t('dialogs.referrals.active')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">{t('dialogs.referrals.noInvites')}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('dialogs.referrals.noInvitesDesc')}
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Review Confirmation Dialog */}
            <Dialog open={deleteReviewConfirmOpen} onOpenChange={setDeleteReviewConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dialogs.deleteReview.title')}</DialogTitle>
                        <DialogDescription>
                            {t('dialogs.deleteReview.description')}
                        </DialogDescription>
                    </DialogHeader>
                    {reviewToDelete && (
                        <div className="py-4">
                            <div className="bg-muted p-4 rounded-lg">
                                <h4 className="font-medium mb-2">{reviewToDelete.productName}</h4>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-4 w-4 ${
                                                    i < reviewToDelete.rating
                                                        ? 'text-yellow-500 fill-yellow-500'
                                                        : 'text-gray-300'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-sm text-muted-foreground">{reviewToDelete.rating}/5</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    "{reviewToDelete.comment || t('reviews.noComment')}"
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setDeleteReviewConfirmOpen(false);
                                setReviewToDelete(null);
                            }}
                            disabled={isDeletingReview}>
                            {t('dialogs.deleteReview.cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDeleteReview}
                            disabled={isDeletingReview}>
                            {isDeletingReview ? t('dialogs.deleteReview.submitting') : t('dialogs.deleteReview.submit')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AccountPageClient;
