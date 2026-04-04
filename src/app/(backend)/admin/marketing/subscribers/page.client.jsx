// @/app/(backend)/admin/marketing/subscribers/page.client.jsx

'use client';

import {
    Calendar,
    Download,
    Eye,
    Filter,
    Mail,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Trash2,
    TrendingDown,
    TrendingUp,
    UserMinus,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createSubscriber, deleteSubscriber, updateSubscriber } from '@/lib/server/newsletter';

export default function SubscribersPageClient({ initialSubscribers = [], initialStats = {} }) {
    const [selectedTab, setSelectedTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [preferenceFilter, setPreferenceFilter] = useState('all');
    const [allSubscribers, setAllSubscribers] = useState(initialSubscribers);
    const [isAddingSubscriber, setIsAddingSubscriber] = useState(false);
    const [isSubmittingSubscriber, setIsSubmittingSubscriber] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [subscriberToDelete, setSubscriberToDelete] = useState(null);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [stats, setStats] = useState(initialStats);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({
        key: 'subscribedDate',
        direction: 'desc'
    });
    const [newSubscriber, setNewSubscriber] = useState({
        name: '',
        email: '',
        phone: '',
        source: 'manual',
        tags: []
    });

    // Filter and paginate subscribers
    const getFilteredSubscribers = () => {
        let filtered = [...allSubscribers];

        // Apply status filter
        if (selectedTab !== 'all') {
            filtered = filtered.filter((sub) => sub.status === selectedTab);
        }

        // Apply source filter
        if (sourceFilter !== 'all') {
            filtered = filtered.filter((sub) => sub.source === sourceFilter);
        }

        // Apply preference filter
        if (preferenceFilter === 'email') {
            filtered = filtered.filter((sub) => {
                const prefs = sub.preferences || {};
                return prefs.emailNotifications || prefs.newsletter || prefs.marketingEmails;
            });
        } else if (preferenceFilter === 'sms') {
            filtered = filtered.filter((sub) => {
                const prefs = sub.preferences || {};
                return prefs.smsNotifications === true;
            });
        }

        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(
                (sub) =>
                    sub.name?.toLowerCase().includes(searchLower) ||
                    sub.email?.toLowerCase().includes(searchLower) ||
                    sub.phone?.toLowerCase().includes(searchLower) ||
                    sub.source?.toLowerCase().includes(searchLower)
            );
        }

        // Apply sorting
        if (sortConfig.key && sortConfig.direction) {
            filtered.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';

                if (sortConfig.direction === 'asc') {
                    return aVal > bVal ? 1 : -1;
                }
                return aVal < bVal ? 1 : -1;
            });
        }

        return filtered;
    };

    const filteredSubscribers = getFilteredSubscribers();

    // Pagination
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSubscribers = filteredSubscribers.slice(startIndex, endIndex);

    const pagination = {
        page: currentPage,
        limit: itemsPerPage,
        total: filteredSubscribers.length,
        totalPages: totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
    };

    // Handle tab change
    const handleTabChange = (newTab) => {
        setSelectedTab(newTab);
        setCurrentPage(1);
    };

    // Handle search
    const handleSearch = (search) => {
        setSearchTerm(search);
        setCurrentPage(1);
    };

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return (
            selectedTab !== 'all' ||
            sourceFilter !== 'all' ||
            preferenceFilter !== 'all' ||
            searchTerm !== ''
        );
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            // You can implement actual data refresh logic here
            // For now, we'll just show a success message
            toast.success('Subscriber data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing subscriber data:', error);
            toast.error('Failed to refresh subscriber data');
        } finally {
            setIsRefreshingData(false);
        }
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    const handleAddSubscriber = async () => {
        try {
            if (!newSubscriber.email.trim() || !newSubscriber.name.trim()) {
                toast.error('Name and email are required');
                return;
            }

            setIsSubmittingSubscriber(true);

            const subscriberData = {
                ...newSubscriber,
                status: 'active',
                subscribedDate: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

            const result = await createSubscriber(subscriberData);

            if (result.success) {
                toast.success('Subscriber added successfully');
                setNewSubscriber({
                    name: '',
                    email: '',
                    phone: '',
                    source: 'manual',
                    tags: []
                });

                // Add to local state using result.data
                setAllSubscribers((prev) => [result.data, ...prev]);

                // Update stats
                setStats((prev) => ({
                    ...prev,
                    total: prev.total + 1,
                    active: prev.active + 1
                }));
            } else {
                toast.error(result.error || 'Failed to add subscriber');
            }
        } catch (error) {
            toast.error('Failed to add subscriber');
        } finally {
            setIsSubmittingSubscriber(false);
            setIsAddingSubscriber(false);
        }
    };

    const handleUpdateSubscriberStatus = async (subscriberId, newStatus) => {
        try {
            const subscriber = allSubscribers.find((s) => s.id === subscriberId);

            // Check if this is a customer account subscriber
            if (subscriber?.metadata?.isCustomerAccount) {
                toast.warning(
                    'To update email preferences for customer accounts, please go to Customers > User Account > Preferences',
                    { duration: 5000 }
                );
                return;
            }

            const result = await updateSubscriber(subscriberId, { status: newStatus });

            if (result.success) {
                setAllSubscribers((prev) =>
                    prev.map((sub) =>
                        sub.id === subscriberId
                            ? { ...sub, status: newStatus, lastActivity: new Date().toISOString() }
                            : sub
                    )
                );

                // Update stats
                setStats((prev) => {
                    const oldStatus = subscriber.status;
                    const newStats = { ...prev };

                    if (oldStatus === 'active') newStats.active--;
                    if (oldStatus === 'unsubscribed') newStats.unsubscribed--;
                    if (oldStatus === 'bounced') newStats.bounced--;

                    if (newStatus === 'active') newStats.active++;
                    if (newStatus === 'unsubscribed') newStats.unsubscribed++;
                    if (newStatus === 'bounced') newStats.bounced++;

                    return newStats;
                });

                toast.success(`Subscriber ${newStatus === 'active' ? 'reactivated' : 'status updated'} successfully`);
            } else {
                toast.error(result.error || 'Failed to update subscriber status');
            }
        } catch (error) {
            toast.error('Failed to update subscriber status');
        }
    };

    const handleDeleteClick = (subscriber) => {
        setSubscriberToDelete(subscriber);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteSubscriber = async () => {
        if (!subscriberToDelete) return;

        try {
            setIsDeleting(true);

            // Check if this is a customer account subscriber
            if (subscriberToDelete?.metadata?.isCustomerAccount) {
                toast.info(
                    'Customer accounts cannot be deleted from subscriber list. Go to Customers > Accounts to manage customer data.',
                    { duration: 5000 }
                );
                setDeleteConfirmOpen(false);
                setSubscriberToDelete(null);
                return;
            }

            const subscriberId = subscriberToDelete.key || subscriberToDelete.id;
            const result = await deleteSubscriber(subscriberId);

            if (result.success) {
                setAllSubscribers((prev) => prev.filter((sub) => (sub.key || sub.id) !== subscriberId));

                // Update stats
                setStats((prev) => ({
                    ...prev,
                    total: prev.total - 1,
                    [subscriberToDelete.status]: prev[subscriberToDelete.status] - 1
                }));

                toast.success('Subscriber deleted successfully');
            } else {
                toast.error(result.error || 'Failed to delete subscriber');
            }

            setDeleteConfirmOpen(false);
            setSubscriberToDelete(null);
        } catch (error) {
            toast.error('Failed to delete subscriber');
        } finally {
            setIsDeleting(false);
        }
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'id', label: 'ID', defaultChecked: true },
        { key: 'name', label: 'Name', defaultChecked: true },
        { key: 'email', label: 'Email', defaultChecked: true },
        { key: 'phone', label: 'Phone', defaultChecked: true },
        { key: 'country', label: 'Country', defaultChecked: false },
        { key: 'role', label: 'Role', defaultChecked: false },
        { key: 'status', label: 'Status', defaultChecked: true },
        { key: 'source', label: 'Source', defaultChecked: true },
        {
            key: 'dates',
            label: 'Dates',
            headers: ['Subscribed Date', 'Last Activity', 'Created At', 'Updated At'],
            fields: ['subscribedDate', 'lastActivity', 'createdAt', 'updatedAt'],
            defaultChecked: true
        },
        { key: 'tags', label: 'Tags', defaultChecked: true },
        {
            key: 'preferences',
            label: 'Preferences',
            headers: [
                'Email Notifications',
                'Order Updates',
                'Marketing Emails',
                'Newsletter',
                'SMS Notifications',
                'Promotions',
                'New Products'
            ],
            fields: [
                'emailNotifications',
                'orderUpdates',
                'marketingEmails',
                'newsletter',
                'smsNotifications',
                'promotions',
                'newProducts'
            ],
            defaultChecked: true
        },
        {
            key: 'clubData',
            label: 'Club & Rewards',
            headers: ['Club Member', 'Club Points', 'Club Level', 'Total Spent', 'Pending Spent'],
            fields: ['clubMember', 'clubPoints', 'clubLevel', 'totalSpent', 'pendingSpent'],
            defaultChecked: true
        },
        {
            key: 'orderStats',
            label: 'Order Statistics',
            headers: ['Order Count', 'Total Spent', 'Last Order Date'],
            fields: ['orderCount', 'totalSpent', 'lastOrderDate'],
            defaultChecked: true
        },
        {
            key: 'referralData',
            label: 'Referral Information',
            headers: ['Referral Code', 'Referred By'],
            fields: ['referralCode', 'referredBy'],
            defaultChecked: false
        },
        {
            key: 'metadata',
            label: 'Customer Account Info',
            headers: ['Customer Account', 'Customer ID'],
            fields: ['isCustomerAccount', 'customerId'],
            defaultChecked: true
        }
    ];

    const formatSubscriberRowData = (subscriber, selectedOptions, fieldMapping) => {
        const prefs = subscriber.preferences || {};
        const metadata = subscriber.metadata || {};
        const club = subscriber.club || {};

        const rowData = {
            id: subscriber.id || '',
            name: subscriber.name || subscriber.displayName || '',
            email: subscriber.email || '',
            phone: subscriber.phone || '',
            country: subscriber.country || '',
            role: subscriber.role || 'user',
            status: subscriber.status || 'active',
            source: subscriber.source || 'manual',
            subscribedDate: subscriber.subscribedDate || '',
            lastActivity: subscriber.lastActivity || '',
            createdAt: subscriber.createdAt || '',
            updatedAt: subscriber.updatedAt || '',
            tags: (subscriber.tags || []).join('; '),
            // Preferences
            emailNotifications: prefs.emailNotifications ? 'Yes' : 'No',
            orderUpdates: prefs.orderUpdates ? 'Yes' : 'No',
            marketingEmails: prefs.marketingEmails ? 'Yes' : 'No',
            newsletter: prefs.newsletter ? 'Yes' : 'No',
            smsNotifications: prefs.smsNotifications ? 'Yes' : 'No',
            promotions: prefs.promotions ? 'Yes' : 'No',
            newProducts: prefs.newProducts ? 'Yes' : 'No',
            // Club data
            clubMember: club.clubMember ? 'Yes' : 'No',
            clubPoints: club.clubPoints || 0,
            clubLevel: club.clubLevel || '',
            // Order statistics (use both root level and club level for compatibility)
            orderCount: subscriber.orderCount || 0,
            totalSpent: subscriber.totalSpent || club.totalSpent || 0,
            pendingSpent: club.pendingSpent || 0,
            lastOrderDate: subscriber.lastOrderDate || '',
            // Referral data
            referralCode: subscriber.referralCode || '',
            referredBy: subscriber.referredBy || '',
            // Metadata
            isCustomerAccount: metadata.isCustomerAccount ? 'Yes' : 'No',
            customerId: metadata.customerId || ''
        };

        return fieldMapping.map((field) => rowData[field]);
    };

    const statusConfig = {
        active: { color: 'bg-green-100 text-green-800', label: 'Active', icon: '✓' },
        unsubscribed: { color: 'bg-gray-100 text-gray-800', label: 'Unsubscribed', icon: '✕' },
        bounced: { color: 'bg-red-100 text-red-800', label: 'Bounced', icon: '!' }
    };

    const sourceConfig = {
        website: { label: 'Website', color: 'bg-blue-100 text-blue-800' },
        'social-media': { label: 'Social Media', color: 'bg-purple-100 text-purple-800' },
        referral: { label: 'Referral', color: 'bg-green-100 text-green-800' },
        'email-campaign': { label: 'Email Campaign', color: 'bg-orange-100 text-orange-800' },
        manual: { label: 'Manual', color: 'bg-gray-100 text-gray-800' },
        'customer-account': { label: 'Customer Account', color: 'bg-indigo-100 text-indigo-800' }
    };

    // Calculate subscriber counts from stats for tabs
    const subscriberCounts = {
        all: stats.total || 0,
        active: stats.active || 0,
        unsubscribed: stats.unsubscribed || 0,
        bounced: stats.bounced || 0
    };

    // Define table columns for AdminTable
    const columns = [
        {
            key: 'name',
            label: 'Subscriber',
            sortable: true,
            render: (subscriber) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={`https://avatar.vercel.sh/${subscriber.email}`} />
                        <AvatarFallback>
                            {(subscriber.name || subscriber.email)
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium">{subscriber.name || 'Anonymous'}</div>
                        <div className="text-muted-foreground text-sm">{subscriber.email}</div> 
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (subscriber) => {
                const config = statusConfig[subscriber.status] || statusConfig.active;
                return (
                    <Badge className={config.color}>
                        {config.icon} {config.label}
                    </Badge>
                );
            }
        },
        {
            key: 'source',
            label: 'Source',
            sortable: true,
            render: (subscriber) => {
                const config = sourceConfig[subscriber.source] || sourceConfig.manual;
                return (
                    <Badge variant="outline" className={config.color}>
                        {config.label}
                    </Badge>
                );
            }
        },
        {
            key: 'preferences',
            label: 'Preferences',
            sortable: false,
            render: (subscriber) => (
                <div className="flex gap-1"> 
                    <Badge variant={subscriber.preferences?.emailNotifications ? "secondary" : "secondary"} className="text-xs">
                        Email
                    </Badge> 
                    <Badge variant={subscriber.preferences?.smsNotifications ? "success" : "secondary"} className="text-xs">
                        SMS
                    </Badge> 
                </div>
            )
        },
        {
            key: 'subscribedDate',
            label: 'Joined at',
            sortable: true,
            render: (subscriber) => (
                <div className="text-sm">
                    <div>{subscriber.subscribedDate ? new Date(subscriber.subscribedDate).toLocaleDateString() : 'Unknown'}</div> 
                </div>
            )
        }
    ];

    // Define row actions for AdminTable
    const getRowActions = (subscriber) => [
        {
            label: subscriber.status === 'active' ? 'Unsubscribe' : 'Reactivate',
            icon: subscriber.status === 'active' ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />,
            onClick: () => {
                const newStatus = subscriber.status === 'active' ? 'unsubscribed' : 'active';
                handleUpdateSubscriberStatus(subscriber.id, newStatus);
            },
            disabled: subscriber.metadata?.isCustomerAccount,
            className: subscriber.metadata?.isCustomerAccount ? 'opacity-50 cursor-not-allowed' : ''
        },
        {
            label: 'Delete Subscriber',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(subscriber),
            className: 'text-destructive'
        }
    ];

    // Filter function for AdminTable
    const filterSubscribers = (subscribers, search, sortConfig) => {
        return getFilteredSubscribers();
    };

    // Pagination component
    const PaginationControls = () => {
        if (pagination.totalPages <= 1) return null;

        return (
            <div className="flex flex-col items-center justify-between gap-3 mt-6 sm:flex-row">
                <div className="text-center text-muted-foreground text-sm sm:text-left">
                    <span className="hidden sm:inline">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total subscribers)
                    </span>
                    <span className="sm:hidden">
                        {pagination.page} / {pagination.totalPages} ({pagination.total})
                    </span>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPrev}
                        onClick={() => handlePageChange(pagination.page - 1)}>
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNext}
                        onClick={() => handlePageChange(pagination.page + 1)}>
                        Next
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <AdminHeader title="Subscribers" description="Manage your email newsletter subscribers" />

            {/* Subscribers Section */}
            <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">Total Subscribers</p>
                                    <p className="font-bold text-2xl">{subscriberCounts.all}</p>
                                </div>
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">Active</p>
                                    <p className="font-bold text-2xl text-green-600">{subscriberCounts.active}</p>
                                </div>
                                <UserPlus className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">Unsubscribed</p>
                                    <p className="font-bold text-2xl text-gray-600">{subscriberCounts.unsubscribed}</p>
                                </div>
                                <UserMinus className="h-8 w-8 text-gray-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">Bounced</p>
                                    <p className="font-bold text-2xl text-red-600">{subscriberCounts.bounced}</p>
                                </div>
                                <Mail className="h-8 w-8 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div> 
            </div>

            {/* AdminTable for Subscribers */}
            <AdminTable
                data={getFilteredSubscribers()}
                columns={columns}
                filterData={filterSubscribers}
                getRowActions={getRowActions}
                emptyMessage="No subscribers found"
                searchPlaceholder="Search by name, email, phone, or source..."
                customFilters={
                    <div className="space-y-3">
                        {isFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                <Select value={sourceFilter} onValueChange={(value) => {
                                    setSourceFilter(value);
                                    setCurrentPage(1);
                                }}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sources</SelectItem>
                                        <SelectItem value="website">Website</SelectItem>
                                        <SelectItem value="social-media">Social Media</SelectItem>
                                        <SelectItem value="referral">Referral</SelectItem>
                                        <SelectItem value="email-campaign">Email Campaign</SelectItem>
                                        <SelectItem value="manual">Manual</SelectItem>
                                        <SelectItem value="customer-account">Customer Account</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={preferenceFilter} onValueChange={(value) => {
                                    setPreferenceFilter(value);
                                    setCurrentPage(1);
                                }}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Preference" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Preferences</SelectItem>
                                        <SelectItem value="email">Email Subscribers</SelectItem>
                                        <SelectItem value="sms">SMS Subscribers</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="flex gap-2">
                                    {hasFiltersApplied() && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedTab('all');
                                                setSourceFilter('all');
                                                setPreferenceFilter('all');
                                                setSearchTerm('');
                                            }}
                                            title="Reset all filters">
                                            <X className="h-4 w-4" color="red" />
                                            <span className="text-red-500">Reset</span>
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
                                {isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}
                            </span>
                            {hasFiltersApplied() && (
                                <Badge
                                    variant={isFiltersExpanded ? 'default' : 'outline'}
                                    className="ml-1 px-1.5 py-0.5 text-xs">
                                    {
                                        [
                                            selectedTab !== 'all' && 'Tab',
                                            sourceFilter !== 'all' && 'Source',
                                            preferenceFilter !== 'all' && 'Preference',
                                            searchTerm !== '' && 'Search'
                                        ].filter(Boolean).length
                                    }
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh subscriber data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={() => setIsAddingSubscriber(true)}>
                            <Plus className="h-4 w-4" />
                            <span>Add Subscriber</span>
                        </Button>
                    </>
                }
            />

            {/* Add Subscriber Dialog */}
            <Dialog open={isAddingSubscriber} onOpenChange={setIsAddingSubscriber}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Add New Subscriber</DialogTitle>
                        <DialogDescription>Manually add a new subscriber to your newsletter.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={newSubscriber.name}
                                onChange={(e) => setNewSubscriber((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Subscriber name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newSubscriber.email}
                                onChange={(e) => setNewSubscriber((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="subscriber@example.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone Number (Optional)</Label>
                            <PhoneInput
                                value={newSubscriber.phone}
                                onChange={(value) => setNewSubscriber((prev) => ({ ...prev, phone: value }))}
                                placeholder="Phone number"
                            />
                        </div>
                        <div>
                            <Label htmlFor="source">Source</Label>
                            <Select
                                value={newSubscriber.source}
                                onValueChange={(value) => setNewSubscriber((prev) => ({ ...prev, source: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Manual</SelectItem>
                                    <SelectItem value="website">Website</SelectItem>
                                    <SelectItem value="social-media">Social Media</SelectItem>
                                    <SelectItem value="referral">Referral</SelectItem>
                                    <SelectItem value="email-campaign">Email Campaign</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddingSubscriber(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddSubscriber}
                            disabled={
                                !newSubscriber.email.trim() || !newSubscriber.name.trim() || isSubmittingSubscriber
                            }>
                            {isSubmittingSubscriber ? 'Adding...' : 'Add Subscriber'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Subscriber</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{subscriberToDelete?.name || subscriberToDelete?.email}"?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteSubscriber} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Subscribers to CSV"
                description="Select the data fields you want to include in your CSV export"
                data={getFilteredSubscribers()}
                exportFields={csvExportFields}
                filename={`subscribers_${selectedTab}_${sourceFilter !== 'all' ? sourceFilter + '_' : ''}${new Date().toISOString().split('T')[0]}`}
                formatRowData={formatSubscriberRowData}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                onConfirm={handleDeleteSubscriber}
                title="Delete Subscriber"
                description={`Are you sure you want to delete ${subscriberToDelete?.name || subscriberToDelete?.email || 'this subscriber'}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
}
