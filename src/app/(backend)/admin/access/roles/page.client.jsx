// @/app/(backend)/admin/access/roles/page.client.jsx

'use client';

import { AlertCircle, Download, Edit, Eye, Plus, RefreshCw, Route, Shield, SlidersHorizontal, Trash, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/providers';
import { createRole, deleteRole, updateRole } from '@/lib/server/admin';
import { generateUID } from '@/lib/shared/helpers';
import { getAllRoles } from '@/lib/server/users';

// Default system roles - id will be set by generateUID('ROLE') in createRole function
const defaultRoles = [
    {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access to all features and settings',
        permissions: ['*'],
        isDefault: true,
        isProtected: true
    }
];

const initialFormData = {
    name: '',
    displayName: '',
    description: '',
    permissions: []
};

// Helper function to check if a role is protected (default roles cannot be deleted)
const isProtectedRole = (role) => {
    return role?.isProtected === true || role?.isDefault === true;
};

export default function RolesPageClient({ initialRoles = [] }) {
    const t = useTranslations('Admin.Roles');

    const [roles, setRoles] = useState(initialRoles);
    const [loading, setLoading] = useState(initialRoles.length === 0);
    const [isOpen, setIsOpen] = useState(false);
    const { user: currentUser } = useAuth();
    const [editRole, setEditRole] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [allRoles, setAllRoles] = useState(initialRoles);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewRole, setViewRole] = useState(null);
    const [newRoute, setNewRoute] = useState('');
    const [showRouteSelector, setShowRouteSelector] = useState(false);

    // Filter and export states
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        roleType: 'all', // all, system, custom
        permissionType: 'all', // all, admin, limited, none
        dateRange: 'all', // all, today, week, month, custom
        customDateFrom: '',
        customDateTo: ''
    });

    // Ref to prevent duplicate default role creation
    const isCreatingDefaultRoles = useRef(false);

    // Common routes for permission selector (translated)
    const commonRoutes = [
        { path: '*', label: t('permissions.all') },
        { path: '/admin', label: t('permissions.adminDashboard') },
        { path: '/admin/analytics', label: t('permissions.dashboardAnalytics') },
        { path: '/admin/store', label: t('permissions.storeManagement') },
        { path: '/admin/store/catalog', label: t('permissions.catalogManagement') },
        { path: '/admin/store/orders', label: t('permissions.ordersManagement') },
        { path: '/admin/store/customers', label: t('permissions.customersManagement') },
        { path: '/admin/access', label: t('permissions.accessControl') },
        { path: '/admin/access/users', label: t('permissions.usersManagement') },
        { path: '/admin/access/roles', label: t('permissions.rolesManagement') },
        { path: '/admin/system/settings', label: t('permissions.systemAdministration') },
        { path: '/admin/system/maintenance', label: t('permissions.systemMaintenance') }
    ];

    // Helper function to generate URL-friendly slug from display name
    const generateSlug = (displayName) => {
        if (!displayName) return '';
        return (
            displayName
                .toLowerCase()
                .trim()
                .replace(/[\s_]+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '')
        );
    };

    // Helper function to check if slug is protected
    const isProtectedSlug = (slug) => {
        const protectedSlugs = ['user', 'admin'];
        return protectedSlugs.includes(slug?.toLowerCase());
    };

    // Helper function to check if slug already exists
    const slugExists = (slug, excludeRoleId = null) => {
        return allRoles.some((role) => role.name?.toLowerCase() === slug?.toLowerCase() && role.id !== excludeRoleId);
    };

    const createDefaultRoles = async () => {
        if (isCreatingDefaultRoles.current) return;

        try {
            isCreatingDefaultRoles.current = true;
            setLoading(true);
            const createdRoles = [];
            for (const roleData of defaultRoles) {
                const response = await createRole({
                    ...roleData,
                    created_at: new Date().toISOString(),
                    created_by: currentUser?.id || 'system'
                });
                if (response.success) {
                    createdRoles.push(response.data);
                }
            }

            setRoles(createdRoles);
            setAllRoles(createdRoles);

            await clearMiddlewareCache();
        } catch (error) {
            console.error('Error creating default roles:', error);
            toast.error(t('toasts.createDefaultFailed'));
        } finally {
            setLoading(false);
            isCreatingDefaultRoles.current = false;
        }
    };

    // Trigger default role creation if none were passed from server
    useEffect(() => {
        if (initialRoles.length === 0 && !isCreatingDefaultRoles.current) {
            createDefaultRoles();
        }
    }, []);

    // Function to refresh roles data from database
    const refreshRoles = async () => {
        try {
            const response = await getAllRoles({ limit: 0 });
            if (response.success) {
                const rolesArray = Array.isArray(response.data) ? response.data : [];
                setAllRoles(rolesArray);
                setRoles(rolesArray);
            }
        } catch (error) {
            console.error('Error refreshing roles:', error);
        }
    };

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return (
            filters.roleType !== 'all' ||
            filters.permissionType !== 'all' ||
            filters.dateRange !== 'all' ||
            (filters.dateRange === 'custom' && (filters.customDateFrom || filters.customDateTo))
        );
    };

    // Function to count active filters
    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.roleType !== 'all') count++;
        if (filters.permissionType !== 'all') count++;
        if (filters.dateRange !== 'all') count++;
        return count;
    };

    // Function to reset all filters
    const resetFilters = () => {
        setFilters({
            roleType: 'all',
            permissionType: 'all',
            dateRange: 'all',
            customDateFrom: '',
            customDateTo: ''
        });
    };

    // Refresh function to fetch fresh data
    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await refreshRoles();
            toast.success(t('toasts.refreshSuccess'));
        } catch (error) {
            console.error('Error refreshing role data:', error);
            toast.error(t('toasts.refreshError'));
        } finally {
            setIsRefreshingData(false);
        }
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'roleId', label: t('csv.fieldRoleId'), defaultChecked: true },
        {
            key: 'basicInfo',
            label: t('csv.fieldBasicInfo'),
            headers: [t('csv.headerRoleName'), t('csv.headerSlug'), t('csv.headerDescription')],
            fields: ['displayName', 'name', 'description'],
            defaultChecked: true
        },
        {
            key: 'permissions',
            label: t('csv.fieldPermissions'),
            headers: [t('csv.headerPermissionsCount'), t('csv.headerAllPermissions')],
            fields: ['permissionsCount', 'permissions'],
            defaultChecked: true
        },
        {
            key: 'status',
            label: t('csv.fieldStatus'),
            headers: [t('csv.headerProtected'), t('csv.headerDefaultRole')],
            fields: ['isProtected', 'isDefault'],
            defaultChecked: false
        },
        {
            key: 'timestamps',
            label: t('csv.fieldTimestamps'),
            headers: [t('csv.headerCreatedAt'), t('csv.headerUpdatedAt')],
            fields: ['createdAt', 'updatedAt'],
            defaultChecked: true
        }
    ];

    const formatRolesRowData = (role, selectedOptions, fieldMapping) => {
        const rowData = {
            roleId: role.id,
            displayName: role.displayName || '',
            name: role.name || '',
            description: role.description || '',
            permissionsCount: role.permissions?.length || 0,
            permissions: role.permissions?.join(', ') || '',
            isProtected: role.isProtected ? 'Yes' : 'No',
            isDefault: role.isDefault ? 'Yes' : 'No',
            createdAt: role.createdAt ? new Date(role.createdAt).toLocaleDateString() : '',
            updatedAt: role.updatedAt ? new Date(role.updatedAt).toLocaleDateString() : ''
        };
        return fieldMapping.map((field) => rowData[field]);
    };

    // Custom filter function for AdminTable
    const filterRolesData = (roles, search, sortConfig) => {
        let filteredRoles = [...roles];

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredRoles = filteredRoles.filter(
                (role) =>
                    role.name?.toLowerCase().includes(searchLower) ||
                    role.displayName?.toLowerCase().includes(searchLower) ||
                    role.description?.toLowerCase().includes(searchLower) ||
                    role.permissions?.some((perm) => perm.toLowerCase().includes(searchLower))
            );
        }

        // Apply role type filter
        if (filters.roleType !== 'all') {
            filteredRoles = filteredRoles.filter((role) => {
                if (filters.roleType === 'system') {
                    return isProtectedRole(role);
                } else if (filters.roleType === 'custom') {
                    return !isProtectedRole(role);
                }
                return true;
            });
        }

        // Apply permission type filter
        if (filters.permissionType !== 'all') {
            filteredRoles = filteredRoles.filter((role) => {
                const permissions = role.permissions || [];
                if (filters.permissionType === 'admin') {
                    return permissions.includes('*') || permissions.some((p) => p.includes('/admin'));
                } else if (filters.permissionType === 'limited') {
                    return permissions.length > 0 && !permissions.includes('*');
                } else if (filters.permissionType === 'none') {
                    return permissions.length === 0;
                }
                return true;
            });
        }

        // Apply date range filter
        if (filters.dateRange !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            filteredRoles = filteredRoles.filter((role) => {
                const roleDate = new Date(role.createdAt || role.created_at);

                if (filters.dateRange === 'today') {
                    return roleDate >= today;
                } else if (filters.dateRange === 'week') {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return roleDate >= weekAgo;
                } else if (filters.dateRange === 'month') {
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return roleDate >= monthAgo;
                } else if (filters.dateRange === 'custom') {
                    let isInRange = true;
                    if (filters.customDateFrom) {
                        const fromDate = new Date(filters.customDateFrom);
                        isInRange = isInRange && roleDate >= fromDate;
                    }
                    if (filters.customDateTo) {
                        const toDate = new Date(filters.customDateTo);
                        toDate.setHours(23, 59, 59, 999);
                        isInRange = isInRange && roleDate <= toDate;
                    }
                    return isInRange;
                }
                return true;
            });
        }

        // Apply sorting
        if (sortConfig.key) {
            filteredRoles.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle permissions count
                if (sortConfig.key === 'permissions') {
                    aValue = aValue?.length || 0;
                    bValue = bValue?.length || 0;
                }

                // Handle dates
                if (sortConfig.key === 'createdAt') {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                } else {
                    aValue = String(aValue).toLowerCase();
                    bValue = String(bValue).toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filteredRoles;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.displayName?.trim()) {
            toast.error(t('toasts.nameRequired'));
            return;
        }

        if (!formData.name?.trim()) {
            toast.error(t('toasts.slugRequired'));
            return;
        }

        const trimmedDisplayName = formData.displayName.trim();
        const trimmedSlug = formData.name.trim().toLowerCase();

        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
            toast.error(t('toasts.slugInvalid'));
            return;
        }

        // Check for protected slugs (only for new roles or when changing slug)
        if (!editRole || editRole.name !== trimmedSlug) {
            if (isProtectedSlug(trimmedSlug)) {
                toast.error(t('toasts.slugProtected', { slug: trimmedSlug }));
                return;
            }

            // Check for duplicate slug
            if (slugExists(trimmedSlug, editRole?.id)) {
                toast.error(t('toasts.slugExists', { slug: trimmedSlug }));
                return;
            }
        }

        setIsSubmitting(true);

        try {
            if (editRole) {
                // Update existing role
                const response = await updateRole(editRole.id, {
                    name: trimmedSlug,
                    displayName: trimmedDisplayName,
                    description: formData.description?.trim() || '',
                    permissions: formData.permissions || [],
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.id
                });

                if (response.success) {
                    toast.success(t('toasts.updateSuccess'));
                    await refreshRoles();
                } else {
                    throw new Error(response.error || t('toasts.updateFailed'));
                }
            } else {
                // Create new role
                const response = await createRole({
                    id: generateUID('ROLE'),
                    name: trimmedSlug,
                    displayName: trimmedDisplayName,
                    description: formData.description?.trim() || '',
                    permissions: formData.permissions || [],
                    isDefault: false,
                    isProtected: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: currentUser?.id
                });

                if (response.success) {
                    toast.success(t('toasts.createSuccess'));
                    await refreshRoles();
                } else {
                    throw new Error(response.error || t('toasts.createFailed'));
                }
            }

            // Clear middleware cache to ensure updated routes are applied
            await clearMiddlewareCache();

            // Reset form and close dialog
            setFormData(initialFormData);
            setEditRole(null);
            setIsOpen(false);
        } catch (error) {
            console.error('Error saving role:', error);
            toast.error(editRole ? t('toasts.updateFailed') : t('toasts.createFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (role) => {
        setFormData({
            name: role.name || '',
            displayName: role.displayName || '',
            description: role.description || '',
            permissions: role.permissions || []
        });
        setEditRole(role);
        setIsOpen(true);
    };

    const handleDeleteClick = (role) => {
        if (isProtectedRole(role)) {
            toast.error(t('toasts.cannotDeleteProtected', { name: role.displayName || role.name }));
            return;
        }
        setRoleToDelete(role);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!roleToDelete) return;

        try {
            const response = await deleteRole(roleToDelete.id);

            if (response.success) {
                toast.success(t('toasts.deleteSuccess'));
                setDeleteConfirmOpen(false);
                setRoleToDelete(null);

                await clearMiddlewareCache();
                await refreshRoles();
            } else {
                throw new Error(response.error || t('toasts.deleteFailed'));
            }
        } catch (error) {
            toast.error(error.message || t('toasts.deleteFailed'));
        }
    };

    const openCreateDialog = () => {
        setFormData(initialFormData);
        setEditRole(null);
        setIsOpen(true);
    };

    const handleView = (role) => {
        setViewRole(role);
        setIsViewOpen(true);
    };

    const addRoute = (permission) => {
        if (!permission) return;

        if (permission === '*') {
            setFormData({
                ...formData,
                permissions: ['*']
            });
            return;
        }

        if (!formData.permissions.includes(permission)) {
            const filteredPermissions = formData.permissions.filter((p) => p !== '*');
            setFormData({
                ...formData,
                permissions: [...filteredPermissions, permission]
            });
        }
    };

    const removeRoute = (index) => {
        const newPermissions = formData.permissions.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            permissions: newPermissions
        });
    };

    const addCustomRoute = () => {
        if (newRoute.trim() && !formData.permissions.includes(newRoute.trim())) {
            setFormData({
                ...formData,
                permissions: [...formData.permissions, newRoute.trim()]
            });
            setNewRoute('');
        }
    };

    // Clear middleware cache when roles are modified
    const clearMiddlewareCache = async () => {
        try {
            const cacheBuster = Date.now();
            sessionStorage.setItem('rolesCacheBuster', cacheBuster.toString());
        } catch (error) {
            console.error('Failed to clear middleware cache:', error);
        }
    };

    // Define table columns
    const columns = [
        {
            key: 'displayName',
            label: t('table.colRoleTitle'),
            sortable: true,
            render: (role) => (
                <div className="flex items-center justify-end sm:justify-start gap-2">
                    <Shield className={`h-4 w-4 ${isProtectedRole(role) ? 'text-amber-500' : 'text-primary'}`} />
                    <span className="font-medium">{role.displayName}</span>
                    {isProtectedRole(role) && (
                        <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs">
                            {t('table.systemBadge')}
                        </Badge>
                    )}
                </div>
            )
        },
        {
            key: 'description',
            label: t('table.colDescription'),
            sortable: false,
            render: (role) => (
                <div
                    title={role.description}
                    className="truncate sm:max-w-md flex items-center justify-end sm:justify-start">
                    {role.description || t('table.noDescription')}
                </div>
            )
        },
        {
            key: 'permissions',
            label: t('table.colPermissions'),
            sortable: true,
            render: (role) => (
                <div className="flex flex-wrap items-center justify-end gap-1">
                    {role.permissions?.slice(0, 2).map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                            {permission === '*' ? t('table.allPermissions') : permission}
                        </Badge>
                    ))}
                    {role.permissions?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 2}
                        </Badge>
                    )}
                    {(!role.permissions || role.permissions.length === 0) && (
                        <span className="text-muted-foreground text-xs">{t('table.nonePermissions')}</span>
                    )}
                </div>
            )
        },
        {
            key: 'createdAt',
            label: t('table.colCreatedAt'),
            sortable: true,
            render: (role) => new Date(role.createdAt || role.created_at).toLocaleDateString()
        }
    ];

    // Define row actions
    const getRowActions = (role) => [
        {
            label: t('rowActions.viewDetails'),
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: () => handleView(role)
        },
        {
            label: t('rowActions.editRole'),
            icon: <Edit className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(role)
        },
        {
            label: isProtectedRole(role) ? t('rowActions.protectedRole') : t('rowActions.deleteRole'),
            icon: <Trash className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(role),
            disabled: isProtectedRole(role),
            className: isProtectedRole(role) ? 'cursor-not-allowed text-muted-foreground' : 'text-destructive'
        }
    ];

    return (
        <div className="space-y-4">
            <AdminHeader title={t('header.title')} description={t('header.description')} />

            {/* Admin Table Component */}
            <AdminTable
                data={allRoles}
                columns={columns}
                loading={loading}
                searchPlaceholder={t('table.searchPlaceholder')}
                enableSearch={true}
                enableSort={true}
                enablePagination={true}
                itemsPerPage={10}
                getRowActions={getRowActions}
                filterData={filterRolesData}
                emptyMessage={t('table.emptyMessage')}
                headerActions={
                    <div className="flex items-center gap-2">
                        {/* Filters Toggle Button */}
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
                                    className="ml-1 px-1.5 py-0.5">
                                    {getActiveFiltersCount()}
                                </Badge>
                            )}
                        </Button>

                        {/* Refresh Button */}
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            className="shrink-0"
                            title={t('actions.refresh')}>
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">
                                {isRefreshingData ? t('actions.refreshing') : t('actions.refresh')}
                            </span>
                        </Button>

                        {/* Export CSV Button */}
                        <Button variant="outline" onClick={openExportDialog} className="shrink-0">
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">{t('actions.exportCsv')}</span>
                        </Button>

                        {/* Create Button */}
                        <Button onClick={openCreateDialog} className="shrink-0">
                            <Plus className="h-4 w-4" />
                            <span>{t('actions.createRole')}</span>
                        </Button>
                    </div>
                }
                customFilters={
                    <div className="space-y-3">
                        {isFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                {/* Role Type Filter */}
                                <Select
                                    value={filters.roleType}
                                    onValueChange={(value) => setFilters({ ...filters, roleType: value })}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.allRoles')}</SelectItem>
                                        <SelectItem value="system">{t('filters.systemRoles')}</SelectItem>
                                        <SelectItem value="custom">{t('filters.customRoles')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Permission Level Filter */}
                                <Select
                                    value={filters.permissionType}
                                    onValueChange={(value) => setFilters({ ...filters, permissionType: value })}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.allPermissions')}</SelectItem>
                                        <SelectItem value="admin">{t('filters.adminAccess')}</SelectItem>
                                        <SelectItem value="limited">{t('filters.limitedAccess')}</SelectItem>
                                        <SelectItem value="none">{t('filters.noPermissions')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Date Range Filter */}
                                <Select
                                    value={filters.dateRange}
                                    onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filters.allTime')}</SelectItem>
                                        <SelectItem value="today">{t('filters.today')}</SelectItem>
                                        <SelectItem value="week">{t('filters.thisWeek')}</SelectItem>
                                        <SelectItem value="month">{t('filters.thisMonth')}</SelectItem>
                                        <SelectItem value="custom">{t('filters.customRange')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Custom Date Range Inputs */}
                                {filters.dateRange === 'custom' && (
                                    <>
                                        <Input
                                            type="date"
                                            value={filters.customDateFrom}
                                            onChange={(e) =>
                                                setFilters({ ...filters, customDateFrom: e.target.value })
                                            }
                                            className="w-35"
                                        />
                                        <Input
                                            type="date"
                                            value={filters.customDateTo}
                                            onChange={(e) => setFilters({ ...filters, customDateTo: e.target.value })}
                                            className="w-35"
                                        />
                                    </>
                                )}

                                {/* Reset Button */}
                                <div className="flex gap-2">
                                    {hasFiltersApplied() && (
                                        <Button variant="ghost" size="sm" onClick={resetFilters}>
                                            <X className="h-4 w-4" color="red" />
                                            <span className="text-red-500">{t('filters.reset')}</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                }
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                data={allRoles}
                filename="roles"
                title={t('csv.title')}
                description={t('csv.description')}
                exportFields={csvExportFields}
                formatRowData={formatRolesRowData}
            />

            {/* Create/Edit Role Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editRole ? t('dialog.editTitle') : t('dialog.createTitle')}</DialogTitle>
                        <DialogDescription>
                            {editRole ? t('dialog.editDescription') : t('dialog.createDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="displayName">{t('dialog.labelRoleName')}</Label>
                                <Input
                                    id="displayName"
                                    value={formData.displayName || ''}
                                    onChange={(e) => {
                                        const newDisplayName = e.target.value;
                                        const newSlug = generateSlug(newDisplayName);
                                        setFormData({
                                            ...formData,
                                            displayName: newDisplayName,
                                            name: editRole && isProtectedRole(editRole) ? formData.name : newSlug
                                        });
                                    }}
                                    placeholder={t('dialog.roleNamePlaceholder')}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">{t('dialog.labelSlug')}</Label>
                                <Input
                                    id="name"
                                    value={formData.name || ''}
                                    onChange={(e) => {
                                        const value = e.target.value.toLowerCase();
                                        setFormData({ ...formData, name: value });
                                    }}
                                    placeholder={t('dialog.slugPlaceholder')}
                                    required
                                    disabled={editRole && isProtectedRole(editRole)}
                                    className={
                                        editRole && isProtectedRole(editRole) ? 'bg-muted cursor-not-allowed' : ''
                                    }
                                />
                                {editRole && isProtectedRole(editRole) && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                        <Shield className="h-3 w-3" />
                                        {t('dialog.slugProtectedHint')}
                                    </p>
                                )}
                                {!editRole && isProtectedSlug(formData.name) && formData.name && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {t('dialog.slugProtectedError')}
                                    </p>
                                )}
                                {!editRole &&
                                    slugExists(formData.name) &&
                                    formData.name &&
                                    !isProtectedSlug(formData.name) && (
                                        <p className="text-xs text-destructive flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {t('dialog.slugExistsError')}
                                        </p>
                                    )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">{t('dialog.labelDescription')}</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('dialog.descriptionPlaceholder')}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>{t('dialog.labelPermissions')}</Label>
                                    {editRole && isProtectedRole(editRole) ? (
                                        <Badge variant="outline" className="border-amber-300 text-amber-600">
                                            <Shield className="mr-1 h-3 w-3" />
                                            {t('dialog.permissionsLocked')}
                                        </Badge>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowRouteSelector(!showRouteSelector)}>
                                            <Route className="mr-2 h-4 w-4" />
                                            {showRouteSelector
                                                ? t('dialog.hidePermissionSelector')
                                                : t('dialog.showPermissionSelector')}
                                        </Button>
                                    )}
                                </div>

                                {showRouteSelector && (!editRole || !isProtectedRole(editRole)) && (
                                    <Card className="p-4">
                                        <h4 className="mb-3 font-medium">{t('dialog.commonPermissionsTitle')}</h4>
                                        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                                            {commonRoutes.map((route) => {
                                                const hasAllPermissions = formData.permissions.includes('*');
                                                const isAllPermissionsButton = route.path === '*';
                                                const isDisabled =
                                                    formData.permissions.includes(route.path) ||
                                                    (hasAllPermissions && !isAllPermissionsButton);

                                                return (
                                                    <Button
                                                        key={route.path}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addRoute(route.path)}
                                                        disabled={isDisabled}>
                                                        <Plus className="mr-1 h-3 w-3" />
                                                        {route.label}
                                                    </Button>
                                                );
                                            })}
                                        </div>

                                        <Separator className="my-4" />

                                        <div className="flex gap-2">
                                            <Input
                                                placeholder={t('dialog.customPermPlaceholder')}
                                                value={newRoute || ''}
                                                onChange={(e) => setNewRoute(e.target.value)}
                                                onKeyDown={(e) =>
                                                    e.key === 'Enter' && (e.preventDefault(), addCustomRoute())
                                                }
                                            />
                                            <Button type="button" onClick={addCustomRoute}>
                                                {t('dialog.addBtn')}
                                            </Button>
                                        </div>
                                    </Card>
                                )}

                                <div className="space-y-2">
                                    <Label>{t('dialog.selectedPermissions', { count: formData.permissions.length })}</Label>
                                    {formData.permissions.length === 0 ? (
                                        <p className="rounded-md border bg-muted/20 p-3 text-muted-foreground text-sm">
                                            {t('dialog.noPermissionsHint')}
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 rounded-md border bg-muted/20 p-3">
                                            {formData.permissions.map((permission, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="secondary"
                                                    className="flex items-center gap-1">
                                                    {permission}
                                                    {(!editRole || !isProtectedRole(editRole)) && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="ml-1 h-auto p-0"
                                                            onClick={() => removeRoute(index)}>
                                                            ×
                                                        </Button>
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                            {t('dialog.cancel')}
                        </Button>
                        <Button type="submit" form="role-form" disabled={isSubmitting}>
                            {isSubmitting
                                ? t('dialog.saving')
                                : editRole
                                  ? t('dialog.updateRole')
                                  : t('dialog.createRoleBtn')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Role Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('viewDialog.title')}</DialogTitle>
                        <DialogDescription>{t('viewDialog.description')}</DialogDescription>
                    </DialogHeader>

                    {viewRole && (
                        <div className="space-y-6">
                            <div className="grid gap-4">
                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">
                                        {t('viewDialog.labelDisplayName')}
                                    </Label>
                                    <p className="font-semibold text-lg">{viewRole.displayName}</p>
                                </div>

                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">
                                        {t('viewDialog.labelName')}
                                    </Label>
                                    <p className="font-mono text-sm">{viewRole.name || viewRole.id}</p>
                                </div>

                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">
                                        {t('viewDialog.labelDescription')}
                                    </Label>
                                    <p className="text-sm">
                                        {viewRole.description || t('viewDialog.noDescription')}
                                    </p>
                                </div>

                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">
                                        {t('viewDialog.labelPermissions', { count: viewRole.permissions?.length || 0 })}
                                    </Label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {viewRole.permissions?.map((permission, index) => (
                                            <Badge key={index} variant="secondary">
                                                {permission}
                                            </Badge>
                                        )) || (
                                            <p className="text-muted-foreground text-sm">
                                                {t('viewDialog.noPermissionsAssigned')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">
                                            {t('viewDialog.labelCreated')}
                                        </Label>
                                        <p>
                                            {viewRole.createdAt || viewRole.created_at
                                                ? new Date(
                                                      viewRole.createdAt || viewRole.created_at
                                                  ).toLocaleString()
                                                : t('viewDialog.na')}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">
                                            {t('viewDialog.labelUpdated')}
                                        </Label>
                                        <p>
                                            {viewRole.updatedAt || viewRole.updated_at
                                                ? new Date(
                                                      viewRole.updatedAt || viewRole.updated_at
                                                  ).toLocaleString()
                                                : t('viewDialog.never')}
                                        </p>
                                    </div>
                                </div>

                                {isProtectedRole(viewRole) && (
                                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                                        <p className="text-amber-800 text-sm">
                                            <strong>{t('viewDialog.systemRoleLabel')}</strong>{' '}
                                            {t('viewDialog.systemRoleWarning')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                            {t('viewDialog.close')}
                        </Button>
                        <Button
                            onClick={() => {
                                setIsViewOpen(false);
                                handleEdit(viewRole);
                            }}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t('viewDialog.editRole')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                onConfirm={handleDelete}
                title={t('deleteDialog.title')}
                description={t('deleteDialog.description', { name: roleToDelete?.displayName || '' })}
                confirmText={t('deleteDialog.confirmText')}
                cancelText={t('deleteDialog.cancel')}
                requireConfirmText="delete"
            />
        </div>
    );
}
