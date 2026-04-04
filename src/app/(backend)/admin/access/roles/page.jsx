// @/app/(backend)/admin/access/roles/page.jsx

'use client';

import { AlertCircle, Download, Edit, Eye, Plus, RefreshCw, Route, Shield, SlidersHorizontal, Trash, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

const commonRoutes = [
    { path: '*', label: 'All Permissions' },
    { path: '/admin', label: 'Admin Dashboard' },
    { path: '/admin/analytics', label: 'Dashboard Analytics' },
    { path: '/admin/store', label: 'Store Management' },
    { path: '/admin/store/catalog', label: 'Catalog Management' },
    { path: '/admin/store/orders', label: 'Orders Management' },
    { path: '/admin/store/customers', label: 'Customers Management' },
    { path: '/admin/access', label: 'Access Control' },
    { path: '/admin/access/users', label: 'Users Management' },
    { path: '/admin/access/roles', label: 'Roles Management' },
    { path: '/admin/system/settings', label: 'System Administration' },
    { path: '/admin/system/maintenance', label: 'System Maintenance' }
];

export default function RolesPage() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const { user: currentUser } = useAuth();
    const [editRole, setEditRole] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [allRoles, setAllRoles] = useState([]);
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

    // Use refs to prevent multiple API calls
    const hasFetchedRoles = useRef(false);
    const isCreatingDefaultRoles = useRef(false);

    // Helper function to generate URL-friendly slug from display name
    const generateSlug = (displayName) => {
        if (!displayName) return '';
        return (
            displayName
                .toLowerCase()
                .trim()
                // Replace spaces and underscores with hyphens
                .replace(/[\s_]+/g, '-')
                // Remove all non-alphanumeric characters except hyphens
                .replace(/[^a-z0-9-]/g, '')
                // Remove multiple consecutive hyphens
                .replace(/-+/g, '-')
                // Remove leading/trailing hyphens
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

    const fetchRoles = async () => {
        // Prevent multiple simultaneous fetch requests
        if (hasFetchedRoles.current) {
            return;
        }

        try {
            hasFetchedRoles.current = true;
            setLoading(true);
            const response = await getAllRoles({ limit: 0 }); // Get all roles

            // Ensure data is an array
            const rolesArray = Array.isArray(response.data) ? response.data : [];

            // If no roles exist, create default roles
            if (rolesArray.length === 0) {
                await createDefaultRoles();
            } else {
                setRoles(rolesArray);
                setAllRoles(rolesArray);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            toast.error('Failed to fetch roles');
            // Reset the ref on error so user can retry
            hasFetchedRoles.current = false;
        } finally {
            setLoading(false);
        }
    };

    const createDefaultRoles = async () => {
        // Prevent multiple simultaneous role creation
        if (isCreatingDefaultRoles.current) {
            return;
        }

        try {
            isCreatingDefaultRoles.current = true;
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

            // Clear middleware cache after creating default roles
            await clearMiddlewareCache();
        } catch (error) {
            console.error('Error creating default roles:', error);
            toast.error('Failed to create default roles');
            // Reset the ref on error so user can retry
            isCreatingDefaultRoles.current = false;
        } finally {
            isCreatingDefaultRoles.current = false;
        }
    };

    // Function to refresh roles data from database
    const refreshRoles = async () => {
        try {
            const response = await getAllRoles({ limit: 0 }); // Get all roles
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
            toast.success('Role data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing role data:', error);
            toast.error('Failed to refresh role data');
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
        { key: 'roleId', label: 'Role ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Role Name', 'Slug', 'Description'],
            fields: ['displayName', 'name', 'description'],
            defaultChecked: true
        },
        {
            key: 'permissions',
            label: 'Permissions',
            headers: ['Permissions Count', 'All Permissions'],
            fields: ['permissionsCount', 'permissions'],
            defaultChecked: true
        },
        {
            key: 'status',
            label: 'Status Information',
            headers: ['Protected', 'Default Role'],
            fields: ['isProtected', 'isDefault'],
            defaultChecked: false
        },
        {
            key: 'timestamps',
            label: 'Timestamps',
            headers: ['Created At', 'Updated At'],
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

    useEffect(() => {
        if (!hasFetchedRoles.current) {
            fetchRoles();
        }
    }, []);

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
                    return permissions.includes('*') || permissions.some(p => p.includes('/admin'));
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
                        toDate.setHours(23, 59, 59, 999); // End of day
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
                    // Convert to lowercase for string comparison
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
            toast.error('Role display name is required');
            return;
        }

        if (!formData.name?.trim()) {
            toast.error('Role slug is required');
            return;
        }

        const trimmedDisplayName = formData.displayName.trim();
        const trimmedSlug = formData.name.trim().toLowerCase();

        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
            toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
            return;
        }

        // Check for protected slugs (only for new roles or when changing slug)
        if (!editRole || editRole.name !== trimmedSlug) {
            if (isProtectedSlug(trimmedSlug)) {
                toast.error(`The slug "${trimmedSlug}" is protected and cannot be used`);
                return;
            }

            // Check for duplicate slug
            if (slugExists(trimmedSlug, editRole?.id)) {
                toast.error(`A role with the slug "${trimmedSlug}" already exists`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            let result;

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
                    toast.success('Role updated successfully');
                    // Refresh data from database to ensure consistency
                    await refreshRoles();
                } else {
                    throw new Error(response.error || 'Failed to update role');
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
                    toast.success('Role created successfully');
                    // Refresh data from database to ensure consistency
                    await refreshRoles();
                } else {
                    throw new Error(response.error || 'Failed to create role');
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
            toast.error(editRole ? 'Failed to update role' : 'Failed to create role');
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
            toast.error(`Cannot delete default role "${role.displayName || role.name}". This is a system role.`);
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
                toast.success('Role deleted successfully');
                setDeleteConfirmOpen(false);
                setRoleToDelete(null);

                // Clear middleware cache to ensure deleted roles are no longer applied
                await clearMiddlewareCache();

                // Refresh data from database to ensure consistency
                await refreshRoles();
            } else {
                throw new Error(response.error || 'Failed to delete role');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete role');
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

        // If "*" (All Permissions) is selected, replace all permissions with just "*"
        if (permission === '*') {
            setFormData({
                ...formData,
                permissions: ['*']
            });
            return;
        }

        // If adding a specific permission, remove "*" if it exists and add the new permission
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
            // Add a cache-busting parameter to force refresh on next request
            const cacheBuster = Date.now();
            sessionStorage.setItem('rolesCacheBuster', cacheBuster.toString());
        } catch (error) {
            console.error('Failed to clear middleware cache:', error);
            // Non-critical error, don't show to user
        }
    };

    // Define table columns
    const columns = [
        {
            key: 'displayName',
            label: 'Role Title',
            sortable: true,
            render: (role) => (
                <div className="flex items-center justify-end sm:justify-start gap-2">
                    <Shield className={`h-4 w-4 ${isProtectedRole(role) ? 'text-amber-500' : 'text-primary'}`} />
                    <span className="font-medium">{role.displayName}</span>
                    {isProtectedRole(role) && (
                        <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs">
                            System
                        </Badge>
                    )}
                </div>
            )
        },
        {
            key: 'description',
            label: 'Description',
            sortable: false,
            render: (role) => (
                <div
                    title={role.description}
                    className="truncate sm:max-w-md flex items-center justify-end sm:justify-start">
                    {role.description || 'No description'}
                </div>
            )
        },
        {
            key: 'permissions',
            label: 'Permissions',
            sortable: true,
            render: (role) => (
                <div className="flex flex-wrap items-center justify-end gap-1">
                    {role.permissions?.slice(0, 2).map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                            {permission === '*' ? 'All Permissions' : permission}
                        </Badge>
                    ))}
                    {role.permissions?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 2}
                        </Badge>
                    )}
                    {(!role.permissions || role.permissions.length === 0) && (
                        <span className="text-muted-foreground text-xs">None</span>
                    )}
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Created At',
            sortable: true,
            render: (role) => new Date(role.createdAt || role.created_at).toLocaleDateString()
        }
    ];

    // Define row actions
    const getRowActions = (role) => [
        {
            label: 'View Details',
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: () => handleView(role)
        },
        {
            label: 'Edit Role',
            icon: <Edit className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(role)
        },
        {
            label: isProtectedRole(role) ? 'Protected Role' : 'Delete Role',
            icon: <Trash className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(role),
            disabled: isProtectedRole(role),
            className: isProtectedRole(role) ? 'cursor-not-allowed text-muted-foreground' : 'text-destructive'
        }
    ];

    return (
        <div className="space-y-4">
            <AdminHeader title="Roles" description="Manage user roles and permissions." />

            {/* Admin Table Component */}
            <AdminTable
                data={allRoles}
                columns={columns}
                loading={loading}
                searchPlaceholder="Search roles..."
                enableSearch={true}
                enableSort={true}
                enablePagination={true}
                itemsPerPage={10}
                getRowActions={getRowActions}
                filterData={filterRolesData}
                emptyMessage="No roles found"
                headerActions={
                    <div className="flex items-center gap-2">
                        {/* Filters Toggle Button */}
                        <Button
                            variant={isFiltersExpanded ? 'default' : 'outline'}
                            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                            className="gap-2"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden xl:block">
                                {isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}
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
                            title="Refresh roles data"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>

                        {/* Export CSV Button */}
                        <Button variant="outline" onClick={openExportDialog} className="shrink-0">
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>

                        {/* Create Button */}
                        <Button onClick={openCreateDialog} className="shrink-0">
                            <Plus className="h-4 w-4" />
                            <span>Create Role</span>
                        </Button>
                    </div>
                }
                customFilters={
                    <div className="space-y-3">
                        {isFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                {/* Role Type Filter */}
                                <Select value={filters.roleType} onValueChange={(value) => setFilters({ ...filters, roleType: value })}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Role Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="system">System Roles</SelectItem>
                                        <SelectItem value="custom">Custom Roles</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Permission Level Filter */}
                                <Select value={filters.permissionType} onValueChange={(value) => setFilters({ ...filters, permissionType: value })}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Permission Level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Permissions</SelectItem>
                                        <SelectItem value="admin">Admin Access</SelectItem>
                                        <SelectItem value="limited">Limited Access</SelectItem>
                                        <SelectItem value="none">No Permissions</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Date Range Filter */}
                                <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Date Range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Time</SelectItem>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="week">This Week</SelectItem>
                                        <SelectItem value="month">This Month</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Custom Date Range Inputs */}
                                {filters.dateRange === 'custom' && (
                                    <>
                                        <Input
                                            type="date"
                                            value={filters.customDateFrom}
                                            onChange={(e) => setFilters({ ...filters, customDateFrom: e.target.value })}
                                            className="w-[140px]"
                                            placeholder="From Date"
                                        />
                                        <Input
                                            type="date"
                                            value={filters.customDateTo}
                                            onChange={(e) => setFilters({ ...filters, customDateTo: e.target.value })}
                                            className="w-[140px]"
                                            placeholder="To Date"
                                        />
                                    </>
                                )}

                                {/* Reset Button */}
                                <div className="flex gap-2">
                                    {hasFiltersApplied() && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={resetFilters}
                                            title="Reset all filters"
                                        >
                                            <X className="h-4 w-4" color="red" />
                                            <span className="text-red-500">Reset</span>
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
                title="Export Roles"
                description="Select the role data fields you want to include in the export."
                exportFields={csvExportFields}
                formatRowData={formatRolesRowData}
            />

            {/* Create/Edit Role Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
                        <DialogDescription>
                            {editRole
                                ? 'Update the role information and permissions'
                                : 'Create a new role with specific route permissions'}
                        </DialogDescription>
                    </DialogHeader>

                    <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Role Name *</Label>
                                <Input
                                    id="displayName"
                                    value={formData.displayName || ''}
                                    onChange={(e) => {
                                        const newDisplayName = e.target.value;
                                        const newSlug = generateSlug(newDisplayName);
                                        setFormData({
                                            ...formData,
                                            displayName: newDisplayName,
                                            // Auto-generate slug only if not editing a protected role
                                            name: editRole && isProtectedRole(editRole) ? formData.name : newSlug
                                        });
                                    }}
                                    placeholder="Enter role display name (e.g., Administrator, Editor)"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Slug (URL-friendly identifier) *</Label>
                                <Input
                                    id="name"
                                    value={formData.name || ''}
                                    onChange={(e) => {
                                        const value = e.target.value.toLowerCase();
                                        setFormData({ ...formData, name: value });
                                    }}
                                    placeholder="e.g., content-editor, moderator"
                                    required
                                    disabled={editRole && isProtectedRole(editRole)}
                                    className={
                                        editRole && isProtectedRole(editRole) ? 'bg-muted cursor-not-allowed' : ''
                                    }
                                />
                                {editRole && isProtectedRole(editRole) && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                        <Shield className="h-3 w-3" />
                                        System role slug cannot be modified
                                    </p>
                                )}
                                {!editRole && isProtectedSlug(formData.name) && formData.name && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        This slug is protected and cannot be used
                                    </p>
                                )}
                                {!editRole &&
                                    slugExists(formData.name) &&
                                    formData.name &&
                                    !isProtectedSlug(formData.name) && (
                                        <p className="text-xs text-destructive flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            This slug already exists
                                        </p>
                                    )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe what this role can do..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Permissions *</Label>
                                    {editRole && isProtectedRole(editRole) ? (
                                        <Badge variant="outline" className="border-amber-300 text-amber-600">
                                            <Shield className="mr-1 h-3 w-3" />
                                            System Role - Permissions Locked
                                        </Badge>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowRouteSelector(!showRouteSelector)}>
                                            <Route className="mr-2 h-4 w-4" />
                                            {showRouteSelector ? 'Hide' : 'Show'} Permission Selector
                                        </Button>
                                    )}
                                </div>

                                {showRouteSelector && (!editRole || !isProtectedRole(editRole)) && (
                                    <Card className="p-4">
                                        <h4 className="mb-3 font-medium">Common Permissions</h4>
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
                                                placeholder="Custom permission (e.g., read:users, write:products)"
                                                value={newRoute || ''}
                                                onChange={(e) => setNewRoute(e.target.value)}
                                                onKeyDown={(e) =>
                                                    e.key === 'Enter' && (e.preventDefault(), addCustomRoute())
                                                }
                                            />
                                            <Button type="button" onClick={addCustomRoute}>
                                                Add
                                            </Button>
                                        </div>
                                    </Card>
                                )}

                                <div className="space-y-2">
                                    <Label>Selected Permissions ({formData.permissions.length})</Label>
                                    {formData.permissions.length === 0 ? (
                                        <p className="rounded-md border bg-muted/20 p-3 text-muted-foreground text-sm">
                                            No permissions selected. Use the permission selector above or add custom
                                            permissions.
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
                            Cancel
                        </Button>
                        <Button type="submit" form="role-form" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editRole ? 'Update Role' : 'Create Role'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Role Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Role Details</DialogTitle>
                        <DialogDescription>Complete information about the role.</DialogDescription>
                    </DialogHeader>

                    {viewRole && (
                        <div className="space-y-6">
                            <div className="grid gap-4">
                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">
                                        Role Display Name
                                    </Label>
                                    <p className="font-semibold text-lg">{viewRole.displayName}</p>
                                </div>

                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">Role Name (ID)</Label>
                                    <p className="font-mono text-sm">{viewRole.name || viewRole.id}</p>
                                </div>

                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">Description</Label>
                                    <p className="text-sm">{viewRole.description || 'No description provided'}</p>
                                </div>

                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">
                                        Permissions ({viewRole.permissions?.length || 0})
                                    </Label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {viewRole.permissions?.map((permission, index) => (
                                            <Badge key={index} variant="secondary">
                                                {permission}
                                            </Badge>
                                        )) || <p className="text-muted-foreground text-sm">No permissions assigned</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">Created</Label>
                                        <p>
                                            {viewRole.createdAt || viewRole.created_at
                                                ? new Date(viewRole.createdAt || viewRole.created_at).toLocaleString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">Updated</Label>
                                        <p>
                                            {viewRole.updatedAt || viewRole.updated_at
                                                ? new Date(viewRole.updatedAt || viewRole.updated_at).toLocaleString()
                                                : 'Never'}
                                        </p>
                                    </div>
                                </div>

                                {isProtectedRole(viewRole) && (
                                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                                        <p className="text-amber-800 text-sm">
                                            <strong>System Role:</strong> This is a protected role and cannot be
                                            deleted.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                            Close
                        </Button>
                        <Button
                            onClick={() => {
                                setIsViewOpen(false);
                                handleEdit(viewRole);
                            }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                onConfirm={handleDelete}
                title="Delete Role"
                description={`Are you sure you want to delete the role "${roleToDelete?.displayName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                requireConfirmText="delete"
            />
        </div>
    );
}
