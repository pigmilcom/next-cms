// @/app/(backend)/admin/store/coupons/page.jsx

'use client';

import { Copy, Download, Euro, Gift, Languages, Percent, Plus, RefreshCw, SlidersHorizontal, Tag, Trash2, Truck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatAvailableLanguages } from '@/lib/i18n';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createCoupon, deleteCoupon, updateCoupon } from '@/lib/server/admin';
import { getCoupons } from '@/lib/server/store';

const initialFormData = {
    code: '',
    name: '',
    nameML: {}, // Multi-language names
    description: '',
    descriptionML: {}, // Multi-language descriptions
    type: 'percentage', // percentage, fixed, or no_discount
    value: '',
    minAmount: '',
    maxAmount: '',
    usageType: 'unlimited', // unlimited, limited, or single
    usageLimit: '',
    usedCount: 0,
    isActive: true,
    hasExpiration: false,
    expiresAt: '',
    targetType: 'public', // public or specific
    targetEmail: '',
    freeShipping: false,
    firstPurchaseOnly: false,
    isClubVoucher: false,
    categories: [],
    products: []
};

const couponTypes = [
    { value: 'percentage', label: 'Percentage (%)', icon: Percent },
    { value: 'fixed', label: 'Fixed Amount (€)', icon: Euro },
    { value: 'no_discount', label: 'No Discount (Perks Only)', icon: Tag }
];

const usageTypes = [
    { value: 'unlimited', label: 'Unlimited' },
    { value: 'limited', label: 'Limited Uses' },
    { value: 'single', label: 'Single Use Only' }
];

export default function CouponsPage() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editCoupon, setEditCoupon] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [couponToDelete, setCouponToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    
    // Get settings from LayoutProvider context
    const { siteSettings } = useAdminSettings();
    
    // Language configuration
    const availableLanguages = siteSettings?.languages || ['en'];
    const defaultLanguage = siteSettings?.language || 'en';
    const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
    
    // Language labels mapping using i18n formatting
    const formattedLanguages = formatAvailableLanguages(availableLanguages, selectedLanguage);
    const languageLabels = formattedLanguages.reduce((acc, lang) => {
        acc[lang.code] = lang.name;
        return acc;
    }, {});

    // Filter states following orders page pattern
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [expiryFilter, setExpiryFilter] = useState('all');
    const [usageTypeFilter, setUsageTypeFilter] = useState('all');
    const [perksFilter, setPerksFilter] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return (
            statusFilter !== 'all' ||
            typeFilter !== 'all' ||
            expiryFilter !== 'all' ||
            usageTypeFilter !== 'all' ||
            perksFilter !== 'all'
        );
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'couponId', label: 'Coupon ID', defaultChecked: true },
        { key: 'basicInfo', label: 'Basic Information', headers: ['Code', 'Name', 'Description'], fields: ['code', 'name', 'description'], defaultChecked: true },
        { key: 'discountInfo', label: 'Discount Information', headers: ['Type', 'Value', 'Min Amount', 'Max Amount'], fields: ['type', 'value', 'minAmount', 'maxAmount'], defaultChecked: true },
        { key: 'usage', label: 'Usage Information', headers: ['Usage Type', 'Usage Limit', 'Used Count'], fields: ['usageType', 'usageLimit', 'usedCount'], defaultChecked: true },
        { key: 'targeting', label: 'Targeting', headers: ['Target Type', 'Target Email'], fields: ['targetType', 'targetEmail'], defaultChecked: false },
        { key: 'perks', label: 'Perks', headers: ['Free Shipping', 'First Purchase Only', 'Club Voucher'], fields: ['freeShipping', 'firstPurchaseOnly', 'isClubVoucher'], defaultChecked: true },
        { key: 'status', label: 'Status', headers: ['Status', 'Active', 'Expired'], fields: ['status', 'active', 'expired'], defaultChecked: true },
        { key: 'expiration', label: 'Expiration', headers: ['Has Expiration', 'Expires At'], fields: ['hasExpiration', 'expiresAt'], defaultChecked: true },
        { key: 'timestamps', label: 'Timestamps', headers: ['Created At', 'Updated At'], fields: ['createdAt', 'updatedAt'], defaultChecked: true }
    ];

    const formatCouponsRowData = (coupon, selectedOptions, fieldMapping) => {
        const isExpiredCoupon = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
        const isLimitReached = isUsageLimitReached(coupon);
        const usageLimitValue = getCouponUsageLimitValue(coupon);
        
        const rowData = {
            couponId: coupon.id || '',
            code: coupon.code || '',
            name: coupon.name || coupon.nameML?.[defaultLanguage] || Object.values(coupon.nameML || {})[0] || '',
            description: coupon.description || coupon.descriptionML?.[defaultLanguage] || Object.values(coupon.descriptionML || {})[0] || '',
            type: coupon.type === 'percentage' ? 'Percentage' : coupon.type === 'fixed' ? 'Fixed Amount' : 'No Discount',
            value: coupon.type === 'percentage' ? `${coupon.value}%` : coupon.type === 'fixed' ? `EUR${coupon.value}` : 'N/A',
            minAmount: coupon.minAmount ? `EUR${coupon.minAmount}` : '',
            maxAmount: coupon.maxAmount ? `EUR${coupon.maxAmount}` : '',
            usageType: coupon.usageType === 'unlimited' ? 'Unlimited' : coupon.usageType === 'limited' ? 'Limited Uses' : 'Single Use',
            usageLimit: usageLimitValue == null ? 'Unlimited' : usageLimitValue,
            usedCount: getCouponUsedCountValue(coupon),
            targetType: coupon.targetType === 'public' ? 'Public' : 'Specific',
            targetEmail: coupon.targetEmail || '',
            freeShipping: coupon.freeShipping ? 'Yes' : 'No',
            firstPurchaseOnly: coupon.firstPurchaseOnly ? 'Yes' : 'No',
            isClubVoucher: coupon.isClubVoucher ? 'Yes' : 'No',
            status: !coupon.isActive ? 'Inactive' : isExpiredCoupon ? 'Expired' : isLimitReached ? 'Limit Reached' : 'Active',
            active: coupon.isActive ? 'Yes' : 'No',
            expired: isExpiredCoupon ? 'Yes' : 'No',
            hasExpiration: coupon.hasExpiration ? 'Yes' : 'No',
            expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'No expiry',
            createdAt: coupon.createdAt ? new Date(coupon.createdAt).toLocaleDateString() : '',
            updatedAt: coupon.updatedAt ? new Date(coupon.updatedAt).toLocaleDateString() : ''
        };

        return fieldMapping.map(field => {
            const value = rowData[field];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value);
        });
    };

    // Handle language change
    const handleLanguageChange = (newLang) => {
        setSelectedLanguage(newLang); 
    };

    // Multi-language helper functions
    const updateMultiLanguageField = (fieldName, langCode, value) => {
        setFormData((prev) => {
            const updatedData = {
                ...prev,
                [`${fieldName}ML`]: {
                    ...prev[`${fieldName}ML`],
                    [langCode]: value
                }
            };

            // If updating default language, also update the main field
            if (langCode === defaultLanguage) {
                updatedData[fieldName] = value;
            }

            return updatedData;
        });
    };

    const getMultiLanguageValue = (fieldName, langCode) => {
        return formData[`${fieldName}ML`]?.[langCode] || '';
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true); 
            
            // Fetch fresh data with cache bypass
            const result = await getCoupons({ options: { duration: '0' } });
            
            if (result?.success) {
                setCoupons(result.data || []);
                toast.success('Coupons refreshed successfully!');
            } else {
                toast.error('Failed to refresh coupons');
            }
        } catch (error) {
            console.error('Error refreshing coupons:', error);
            toast.error('Failed to refresh coupons');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = await getCoupons();
            if (result?.success) {
                setCoupons(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
            toast.error('Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const generateCouponCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                value: formData.value ? Number(formData.value) : 0,
                minAmount: formData.minAmount ? Number(formData.minAmount) : 0,
                maxAmount: formData.maxAmount ? Number(formData.maxAmount) : null,
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                expiresAt: formData.expiresAt || null
            };

            let result;
            if (editCoupon) {
                result = await updateCoupon(editCoupon.key || editCoupon.id, payload);
            } else {
                result = await createCoupon(payload);
            }

            if (result?.success) {
                await fetchData();
                setIsOpen(false);
                setEditCoupon(null);
                setFormData(initialFormData);
                toast.success(editCoupon ? 'Coupon updated successfully!' : 'Coupon created successfully!');
            } else {
                toast.error(result?.error || 'Failed to save coupon');
            }
        } catch (error) {
            console.error('Error saving coupon:', error);
            toast.error('Failed to save coupon');
        }
    };

    const handleEdit = (coupon) => {
        setEditCoupon(coupon);
        setFormData({
            code: coupon.code || '',
            name: coupon.name || '',
            description: coupon.description || '',
            type: coupon.type || 'percentage',
            value: coupon.value?.toString() || '',
            minAmount: coupon.minAmount?.toString() || '',
            maxAmount: coupon.maxAmount?.toString() || '',
            usageType: coupon.usageType || 'unlimited',
            usageLimit: coupon.usageLimit?.toString() || '',
            usedCount: coupon.usedCount || 0,
            isActive: coupon.isActive !== false,
            hasExpiration: coupon.hasExpiration || false,
            expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
            targetType: coupon.targetType || 'public',
            targetEmail: coupon.targetEmail || '',
            freeShipping: coupon.freeShipping || false,
            firstPurchaseOnly: coupon.firstPurchaseOnly || false,
            isClubVoucher: coupon.isClubVoucher || false,
            categories: coupon.categories || [],
            products: coupon.products || []
        });
        setIsOpen(true);
    };

    const handleCopyCouponCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success('Coupon code copied to clipboard!');
    };

    const handleDeleteClick = (coupon) => {
        setCouponToDelete(coupon);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!couponToDelete) return;

        try {
            setIsDeleting(true);
            const result = await deleteCoupon(couponToDelete.key || couponToDelete.id);

            if (result?.success) {
                await fetchData();
                toast.success('Coupon deleted successfully!');
            } else {
                toast.error(result?.error || 'Failed to delete coupon');
            }
        } catch (error) {
            console.error('Error deleting coupon:', error);
            toast.error('Failed to delete coupon');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setCouponToDelete(null);
        }
    };

    const handleDialogChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditCoupon(null);
            setFormData(initialFormData);
        }
    };

    const handleAddNew = () => {
        setEditCoupon(null);
        setFormData({
            ...initialFormData,
            code: generateCouponCode()
        });
        setIsOpen(true);
    };

    const isExpired = (expiresAt) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    const getCouponUsageLimitValue = (coupon) => {
        if (coupon.usageType === 'unlimited') return null;
        if (coupon.usageType === 'single') return 1;
        return coupon.usageLimit != null ? Number(coupon.usageLimit) : null;
    };

    const getCouponUsedCountValue = (coupon) => {
        return Number(coupon.usedCount || 0);
    };

    const getCouponUsageDisplay = (coupon) => {
        const usedCount = getCouponUsedCountValue(coupon);
        const usageLimit = getCouponUsageLimitValue(coupon);

        if (usageLimit == null) {
            return `${usedCount} used`;
        }

        return `${usedCount} / ${usageLimit}`;
    };

    const isUsageLimitReached = (coupon) => {
        const usageLimit = getCouponUsageLimitValue(coupon);
        if (usageLimit == null) return false;
        return getCouponUsedCountValue(coupon) >= usageLimit;
    };

    // Filter function for AdminTable
    const filterCoupons = (coupons, search, sortConfig) => {
        let filtered = [...coupons];

        // Apply search filter
        if (search) {
            filtered = filtered.filter(
                (coupon) =>
                    coupon.code.toLowerCase().includes(search.toLowerCase()) ||
                    coupon.name.toLowerCase().includes(search.toLowerCase()) ||
                    (coupon.description || '').toLowerCase().includes(search.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((coupon) => {
                if (statusFilter === 'active')
                    return coupon.isActive && !isExpired(coupon.expiresAt) && !isUsageLimitReached(coupon);
                if (statusFilter === 'inactive') return !coupon.isActive;
                if (statusFilter === 'expired') return isExpired(coupon.expiresAt);
                if (statusFilter === 'limit-reached') return isUsageLimitReached(coupon);
                return true;
            });
        }

        // Apply type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter((coupon) => coupon.type === typeFilter);
        }

        // Apply usage type filter
        if (usageTypeFilter !== 'all') {
            filtered = filtered.filter((coupon) => coupon.usageType === usageTypeFilter);
        }

        // Apply perks filter
        if (perksFilter !== 'all') {
            filtered = filtered.filter((coupon) => {
                if (perksFilter === 'free-shipping') return coupon.freeShipping;
                if (perksFilter === 'first-purchase') return coupon.firstPurchaseOnly;
                if (perksFilter === 'club-voucher') return coupon.isClubVoucher;
                return true;
            });
        }

        // Apply expiry filter
        if (expiryFilter !== 'all') {
            const now = new Date();
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            filtered = filtered.filter((coupon) => {
                if (!coupon.expiresAt && !coupon.hasExpiration) return expiryFilter === 'no-expiry';
                if (!coupon.hasExpiration) return expiryFilter === 'no-expiry';
                const expiryDate = new Date(coupon.expiresAt);

                switch (expiryFilter) {
                    case 'expired':
                        return expiryDate < now;
                    case 'expires-week':
                        return expiryDate >= now && expiryDate <= nextWeek;
                    case 'expires-month':
                        return expiryDate >= now && expiryDate <= nextMonth;
                    case 'no-expiry':
                        return false;
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    };

    // Define table columns
    const columns = [
        {
            key: 'code',
            label: 'Code',
            sortable: true,
            render: (coupon) => (
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                        {coupon.code}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCouponCode(coupon.code)}
                        title="Copy coupon code">
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>
            )
        },
        {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (coupon) => (
                <div>
                    <div className="font-medium">{coupon.name}</div>
                    {coupon.description && (
                        <div className="text-muted-foreground text-sm truncate max-w-40">{coupon.description}</div>
                    )}
                </div>
            )
        },
        {
            key: 'type',
            label: 'Discount',
            sortable: true,
            render: (coupon) => (
                <div>
                    <div className="flex items-center gap-2">
                        {coupon.type === 'percentage' ? (
                            <Percent className="h-4 w-4 text-green-600" />
                        ) : coupon.type === 'fixed' ? (
                            <Euro className="h-4 w-4 text-blue-600" />
                        ) : (
                            <Gift className="h-4 w-4 text-purple-600" />
                        )}
                        <span className="font-medium">
                            {coupon.type === 'percentage'
                                ? `${coupon.value}%`
                                : coupon.type === 'fixed'
                                  ? `€${coupon.value}`
                                  : 'No Discount'}
                        </span>
                    </div>
                    <div className="flex gap-1 mt-1">
                        {coupon.freeShipping && (
                            <Badge variant="secondary" className="text-xs">
                                <Truck className="h-3 w-3 mr-1" />
                                Free Ship
                            </Badge>
                        )}
                        {coupon.firstPurchaseOnly && (
                            <Badge variant="outline" className="text-xs">
                                New
                            </Badge>
                        )}
                        {coupon.isClubVoucher && (
                            <Badge variant="outline" className="text-xs">
                                Club
                            </Badge>
                        )}
                    </div>
                </div>
            )
        },
        {
            key: 'usage',
            label: 'Usage',
            sortable: false,
            render: (coupon) => {
                const usageTypeLabel = usageTypes.find((t) => t.value === coupon.usageType)?.label || 'Unlimited';
                return (
                    <div className="text-sm">
                        <div className="font-medium">{usageTypeLabel}</div>
                        <div className="text-muted-foreground">{getCouponUsageDisplay(coupon)}</div>
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (coupon) => {
                if (!coupon.isActive) {
                    return <Badge variant="secondary">Inactive</Badge>;
                }
                if (isExpired(coupon.expiresAt)) {
                    return <Badge variant="destructive">Expired</Badge>;
                }
                if (isUsageLimitReached(coupon)) {
                    return <Badge variant="outline">Limit Reached</Badge>;
                }
                return <Badge variant="default">Active</Badge>;
            }
        },
        {
            key: 'expiresAt',
            label: 'Expires',
            sortable: true,
            render: (coupon) => (
                <div className="text-sm">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'No expiry'}
                </div>
            )
        }
    ];

    // Define row actions
    const getRowActions = (coupon) => [
        {
            label: 'Edit Coupon',
            icon: <Tag className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(coupon)
        },
        {
            label: 'Delete Coupon',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(coupon),
            className: 'text-destructive'
        }
    ];

    return (
        <div className="space-y-4">
            <AdminHeader title="Coupons" description="Manage discount coupons and promotional codes" />

            <AdminTable
                data={coupons}
                columns={columns}
                filterData={filterCoupons}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage="No coupons found"
                searchPlaceholder="Search coupons..."
                customFilters={
                    <div className="space-y-3"> 

                        {/* Collapsible Filters */}
                        {isFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                        <SelectItem value="limit-reached">Limit Reached</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Type Filter */}
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="percentage">Percentage</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                        <SelectItem value="no_discount">No Discount</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Usage Type Filter */}
                                <Select value={usageTypeFilter} onValueChange={setUsageTypeFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Usage Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Usage</SelectItem>
                                        <SelectItem value="unlimited">Unlimited</SelectItem>
                                        <SelectItem value="limited">Limited Uses</SelectItem>
                                        <SelectItem value="single">Single Use</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Perks Filter */}
                                <Select value={perksFilter} onValueChange={setPerksFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Perks" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Perks</SelectItem>
                                        <SelectItem value="free-shipping">Free Shipping</SelectItem>
                                        <SelectItem value="first-purchase">First Purchase</SelectItem>
                                        <SelectItem value="club-voucher">Club Voucher</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Expiry Filter */}
                                <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Expiry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Expiry</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                        <SelectItem value="expires-week">Expires This Week</SelectItem>
                                        <SelectItem value="expires-month">Expires This Month</SelectItem>
                                        <SelectItem value="no-expiry">No Expiry</SelectItem>
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
                                                setTypeFilter('all');
                                                setExpiryFilter('all');
                                                setUsageTypeFilter('all');
                                                setPerksFilter('all');
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
                            variant={isFiltersExpanded ? "default" : "outline"}
                            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                            className="gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden xl:block">{isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}</span>
                            {hasFiltersApplied() && (
                                <Badge variant={isFiltersExpanded ? "default" : "outline"} className="ml-1 px-1.5 py-0.5 text-xs">
                                    {
                                        [
                                            statusFilter !== 'all' && 'Status',
                                            typeFilter !== 'all' && 'Type',
                                            expiryFilter !== 'all' && 'Expiry'
                                        ].filter(Boolean).length
                                    }
                                </Badge>
                            )}
                        </Button> 
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh coupons data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4" />
                            <span>Add Coupon</span>
                        </Button>
                    </>
                }
            />

            {/* Coupon Form Dialog */}
            <Dialog open={isOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="sm:max-w-1/2">
                                <DialogTitle>{editCoupon ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
                                <DialogDescription>
                                    {editCoupon ? 'Update the coupon details.' : 'Create a new discount coupon.'}
                                </DialogDescription>
                            </div>
                            {availableLanguages.length > 1 && (
                                <div className="flex items-center gap-2 sm:absolute sm:top-5 sm:right-16">
                                    <Languages className="h-4 w-4 text-muted-foreground" />
                                    <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableLanguages.map((lang) => (
                                                <SelectItem key={lang} value={lang}>
                                                    {languageLabels[lang] || lang.toUpperCase()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="code">Coupon Code</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="COUPON2024"
                                        value={formData.code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                        }
                                        required
                                        className="font-mono"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setFormData({ ...formData, code: generateCouponCode() })}>
                                        Generate
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Display Name {availableLanguages.length > 1 && `(${languageLabels[selectedLanguage] || selectedLanguage.toUpperCase()})`}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Summer Sale 2024"
                                    value={getMultiLanguageValue('name', selectedLanguage)}
                                    onChange={(e) => updateMultiLanguageField('name', selectedLanguage, e.target.value)}
                                    required={selectedLanguage === defaultLanguage}
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="description">
                                    Description {availableLanguages.length > 1 && `(${languageLabels[selectedLanguage] || selectedLanguage.toUpperCase()})`}
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe this coupon..."
                                    value={getMultiLanguageValue('description', selectedLanguage)}
                                    onChange={(e) => updateMultiLanguageField('description', selectedLanguage, e.target.value)}
                                    className="min-h-20"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Discount Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {couponTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                    <type.icon className="h-4 w-4" />
                                                    {type.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.type !== 'no_discount' && (
                                <div className="space-y-2">
                                    <Label htmlFor="value">
                                        {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount (€)'}
                                    </Label>
                                    <Input
                                        id="value"
                                        type="number"
                                        min="0"
                                        max={formData.type === 'percentage' ? 100 : undefined}
                                        step={formData.type === 'percentage' ? '1' : '0.01'}
                                        value={formData.value || ''}
                                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="minAmount">Minimum Order Amount (€)</Label>
                                <Input
                                    id="minAmount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.minAmount || ''}
                                    onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxAmount">Maximum Discount (€)</Label>
                                <Input
                                    id="maxAmount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.maxAmount || ''}
                                    onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="usageType">Usage Type</Label>
                                <Select
                                    value={formData.usageType}
                                    onValueChange={(value) => setFormData({ ...formData, usageType: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {usageTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.usageType !== 'unlimited' && (
                                <div className="space-y-2">
                                    <Label htmlFor="usageLimit">Usage Limit</Label>
                                    <Input
                                        id="usageLimit"
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={formData.usageLimit || ''}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                        required={formData.usageType !== 'unlimited'}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="targetType">Target Audience</Label>
                                <Select
                                    value={formData.targetType}
                                    onValueChange={(value) => setFormData({ ...formData, targetType: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="public">Public</SelectItem>
                                        <SelectItem value="specific">Specific Customer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.targetType === 'specific' && (
                                <div className="space-y-2">
                                    <Label htmlFor="targetEmail">Customer Email</Label>
                                    <Input
                                        id="targetEmail"
                                        type="email"
                                        placeholder="customer@email.com"
                                        value={formData.targetEmail || ''}
                                        onChange={(e) => setFormData({ ...formData, targetEmail: e.target.value })}
                                        required={formData.targetType === 'specific'}
                                    />
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <input
                                    id="hasExpiration"
                                    type="checkbox"
                                    checked={formData.hasExpiration}
                                    onChange={(e) => setFormData({ ...formData, hasExpiration: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="hasExpiration">Has Expiration Date</Label>
                            </div>

                            {formData.hasExpiration && (
                                <div className="space-y-2">
                                    <Label htmlFor="expiresAt">Expiry Date</Label>
                                    <Input
                                        id="expiresAt"
                                        type="date"
                                        value={formData.expiresAt}
                                        onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                        required={formData.hasExpiration}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <h4 className="font-medium text-sm">Additional Benefits</h4>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center space-x-2">
                                    <input
                                        id="freeShipping"
                                        type="checkbox"
                                        checked={formData.freeShipping}
                                        onChange={(e) => setFormData({ ...formData, freeShipping: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="freeShipping">Free Shipping</Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        id="firstPurchaseOnly"
                                        type="checkbox"
                                        checked={formData.firstPurchaseOnly}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstPurchaseOnly: e.target.checked })
                                        }
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="firstPurchaseOnly">First Purchase Only</Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        id="isClubVoucher"
                                        type="checkbox"
                                        checked={formData.isClubVoucher}
                                        onChange={(e) => setFormData({ ...formData, isClubVoucher: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="isClubVoucher">Club Voucher</Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        id="isActive"
                                        type="checkbox"
                                        checked={formData.isActive !== false}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="isActive">Active</Label>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full">
                            {editCoupon ? 'Update Coupon' : 'Create Coupon'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Coupons to CSV"
                description="Select the coupon data fields you want to include in your CSV export"
                data={coupons}
                exportFields={csvExportFields}
                filename="coupons-export"
                formatRowData={formatCouponsRowData}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Coupon"
                description={`Are you sure you want to delete coupon "${couponToDelete?.code}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
                confirmText="Delete Coupon"
            />
        </div>
    );
}
