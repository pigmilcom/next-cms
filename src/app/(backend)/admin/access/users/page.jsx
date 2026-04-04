// @/app/(backend)/admin/access/users/page.jsx

'use client';

import { Coins, Copy, Download, Eye, EyeOff, Filter, KeyRound, Pencil, Plus, RefreshCw, SlidersHorizontal, Trash2, User2, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { v6 as uuidv6 } from 'uuid';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CountryDropdown } from '@/components/ui/country-dropdown';
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
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/providers';
import { createUser, deleteUser, updateUser } from '@/lib/server/admin';
import { getCoupons } from '@/lib/server/store';
import { getAllRoles, getAllUsers, getUser, getUserReferrals } from '@/lib/server/users';

const initialFormData = {
    displayName: '',
    email: '',
    phone: '',
    country: '',
    role: 'user',
    password: '',
    points: 0,
    clubPoints: 0,
    clubPointsAdjustment: 0,
    sendEmail: true,
    changePassword: false,
    // Default user preferences
    emailNotifications: true,
    orderUpdates: true,
    marketingEmails: true,
    newsletter: true,
    smsNotifications: false
};

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [_rolesLoading, setRolesLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const { user: currentUser } = useAuth();
    const [editUser, setEditUser] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [allUsers, setAllUsers] = useState([]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewUser, setViewUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmationDialog, setConfirmationDialog] = useState({
        open: false,
        existingUser: null,
        pendingData: null
    });
    const [roleFilter, setRoleFilter] = useState('all');
    const [userClubData, setUserClubData] = useState(null);
    const [userCoupons, setUserCoupons] = useState([]);
    const [loadingClubData, setLoadingClubData] = useState(false);
    const [userReferrals, setUserReferrals] = useState([]);
    const [loadingReferrals, setLoadingReferrals] = useState(false);

    // Filter and export states
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    // Use refs to prevent multiple API calls
    const hasFetchedRoles = useRef(false);
    const hasFetchedUsers = useRef(false);

    // Helper function to get role display name
    const getRoleDisplayName = (roleName) => {
        const role = roles.find((r) => r.value === roleName);
        return roleName && role ? (role.displayName || roleName).toUpperCase() : 'N/A';
    };

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return roleFilter !== 'all';
    };

    // Refresh function to fetch fresh data
    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await refreshUsers();
            toast.success('User data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing user data:', error);
            toast.error('Failed to refresh user data');
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
        { key: 'userId', label: 'User ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Display Name', 'Email', 'Phone', 'Country'],
            fields: ['displayName', 'email', 'phone', 'country'],
            defaultChecked: true
        },
        {
            key: 'roleInfo',
            label: 'Role & Status',
            headers: ['Role', 'Status'],
            fields: ['role', 'status'],
            defaultChecked: true
        },
        {
            key: 'pointsInfo',
            label: 'Points & Rewards',
            headers: ['Points', 'Club Points'],
            fields: ['points', 'clubPoints'],
            defaultChecked: false
        },
        {
            key: 'preferences',
            label: 'Preferences',
            headers: ['Email Notifications', 'Marketing Emails', 'Newsletter', 'SMS Notifications'],
            fields: ['emailNotifications', 'marketingEmails', 'newsletter', 'smsNotifications'],
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

    const formatUsersRowData = (user, selectedOptions, fieldMapping) => {
        const rowData = {
            userId: user.id,
            displayName: user.displayName || '',
            email: user.email || '',
            phone: user.phone || '',
            country: user.country || '',
            role: user.role || '',
            status: user.status || 'active',
            points: user.points || 0,
            clubPoints: user.clubPoints || 0,
            emailNotifications: user.emailNotifications ? 'Yes' : 'No',
            marketingEmails: user.marketingEmails ? 'Yes' : 'No',
            newsletter: user.newsletter ? 'Yes' : 'No',
            smsNotifications: user.smsNotifications ? 'Yes' : 'No',
            createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
            updatedAt: user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : ''
        };
        return fieldMapping.map((field) => rowData[field]);
    };

    const fetchRoles = async () => {
        // Prevent multiple simultaneous fetch requests
        if (hasFetchedRoles.current) {
            return;
        }

        try {
            hasFetchedRoles.current = true;
            setRolesLoading(true);
            const response = await getAllRoles();

            // Ensure data is an array
            const rolesArray = Array.isArray(response?.data) ? response.data : [];
            // Map roles to show displayName for UI and use id as value (since id matches name in server response)
            const rolesList = rolesArray
                .map((role) => ({
                    key: role.key,
                    id: role.id,
                    value: role.name,
                    label: role.displayName || role.name || role.id
                }))
                .filter((role) => role.value);

            // Set roles with fallback to default roles if none exist
            if (rolesList.length === 0) {
                setRoles([{ value: 'admin', label: 'Administrator' }]);
            } else {
                setRoles(rolesList);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            // Fallback to default roles on error
            setRoles([{ value: 'admin', label: 'Administrator' }]);
            // Reset the ref on error so user can retry
            hasFetchedRoles.current = false;
        } finally {
            setRolesLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // Fetch all users for client-side filtering (role filter, search, etc.)
            const response = await getAllUsers({ limit: 0 }); // limit: 0 means get all

            if (response.success) {
                // Filter out users with role 'user'
                const filteredUsers = response.data.filter((user) => user.role !== 'user');
                setUsers(filteredUsers);
                setAllUsers(filteredUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    // Function to refresh users data from database
    const refreshUsers = async () => {
        try {
            const response = await getAllUsers({ limit: 0, options: { duration: 0 } }); // limit: 0 means get all
            if (response.success) {
                // Filter out users with role 'user'
                const filteredUsers = response.data.filter((user) => user.role !== 'user');
                setAllUsers(filteredUsers);
                setUsers(filteredUsers);
            }
        } catch (error) {
            console.error('Error refreshing users:', error);
        }
    };

    useEffect(() => {
        if (!hasFetchedRoles.current) {
            fetchRoles();
        }
    }, []);

    useEffect(() => {
        if (!hasFetchedUsers.current) {
            hasFetchedUsers.current = true;
            fetchUsers();
        }
    }, []);

    // Custom filter function for AdminTable
    const filterUsersData = (users, search, sortConfig) => {
        let filteredUsers = [...users];

        // Apply role filter
        if (roleFilter !== 'all') {
            filteredUsers = filteredUsers.filter((user) => user.role === roleFilter);
        }

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(
                (user) =>
                    user.displayName?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower)
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            filteredUsers.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

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

        return filteredUsers;
    };

    // Generate random 8-char password with numbers, upper/lower case, may have special char
    const generatePassword = () => {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const special = '!@#$%^&*';

        // Ensure at least: 2 lowercase, 2 uppercase, 2 numbers, and may have 0-2 special chars
        let password = '';

        // Add guaranteed characters (6 chars)
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];

        // Add 2 more random chars from all sets (may include special)
        const allChars = lowercase + uppercase + numbers + special;
        password += allChars[Math.floor(Math.random() * allChars.length)];
        password += allChars[Math.floor(Math.random() * allChars.length)];

        // Shuffle the password
        password = password
            .split('')
            .sort(() => Math.random() - 0.5)
            .join('');

        setFormData({ ...formData, password });
        toast.success('Password generated');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate password strength if setting password (optional for new users)
        if (formData.password && formData.password.trim() && (!editUser || formData.changePassword)) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
            if (!passwordRegex.test(formData.password)) {
                toast.error(
                    'Password must be at least 8 characters with lowercase and one uppercase or special character'
                );
                setIsSubmitting(false);
                return;
            }
        }

        try {
            const timeNow = new Date().toISOString();
            let userData = {
                displayName: formData.displayName,
                email: formData.email,
                phone: formData.phone || '',
                country: formData.country || '',
                role: formData.role,
                // Include user preferences
                emailNotifications: formData.emailNotifications,
                orderUpdates: formData.orderUpdates,
                marketingEmails: formData.marketingEmails,
                newsletter: formData.newsletter,
                smsNotifications: formData.smsNotifications
            };

            if (editUser) {
                // Calculate new club points if adjustment is provided
                const adjustmentValue = Number.parseInt(formData.clubPointsAdjustment) || 0;
                const currentClubPoints = formData.clubPoints || 0;
                const newClubPoints = Math.max(0, currentClubPoints + adjustmentValue);

                if (formData.changePassword) {
                    userData = {
                        ...userData,
                        clubPoints: newClubPoints,
                        plainPassword: formData.password,
                        sendEmail: formData.sendEmail,
                        passwordChanged: true
                    };
                } else {
                    userData = {
                        ...userData,
                        clubPoints: newClubPoints,
                        sendEmail: false,
                        passwordChanged: false
                    };
                }

                // Use user key directly
                const userKey = editUser.key || editUser.id;
                const result = await updateUser(userKey, userData);

                if (!result.success) {
                    throw new Error(result.error || 'Failed to update user');
                }

                // Update local state using email as identifier
                const updatedUserData = { ...editUser, ...userData };
                setAllUsers((prev) => prev.map((user) => (user.email === editUser.email ? updatedUserData : user)));
                setUsers((prev) => prev.map((user) => (user.email === editUser.email ? updatedUserData : user)));

                toast.success('User updated successfully');
                // Also refresh data from database to ensure consistency
                await refreshUsers();
            } else {
                // New user creation - password is optional
                userData = {
                    ...userData,
                    uid: uuidv6(),
                    sendEmail: formData.sendEmail
                };

                // Only include plainPassword if it's provided and not empty
                if (formData.password && formData.password.trim()) {
                    userData.plainPassword = formData.password; // Server will encrypt this
                }

                const result = await createUser(userData);

                // Handle user existence confirmation requirement
                if (!result.success && result.requiresConfirmation) {
                    setConfirmationDialog({
                        open: true,
                        existingUser: result.existingUser,
                        pendingData: userData
                    });
                    setIsSubmitting(false);
                    return;
                }

                if (!result.success) {
                    throw new Error(result.error || 'Failed to create user');
                }

                const newUser = result.data;

                // Update local state
                setAllUsers((prev) => [...prev, newUser]);
                setUsers((prev) => [...prev, newUser]);
                toast.success(result.message || 'User created successfully');
                // Also refresh data from database to ensure consistency
                await refreshUsers();
            }

            setIsOpen(false);
            setEditUser(null);
            setFormData(initialFormData);
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (user) => {
        setEditUser(user);
        setFormData({
            displayName: user.displayName || '',
            email: user.email || '',
            phone: user.phone || '',
            country: user.country || '',
            role: user.role || 'user',
            password: '',
            points: user.points || 0,
            clubPoints: user.clubPoints || 0,
            clubPointsAdjustment: 0,
            sendEmail: false,
            changePassword: false,
            // Include user preferences
            emailNotifications: user.emailNotifications ?? true,
            orderUpdates: user.orderUpdates ?? true,
            marketingEmails: user.marketingEmails ?? true,
            newsletter: user.newsletter ?? true,
            smsNotifications: user.smsNotifications ?? false
        });
        setIsOpen(true);

        // Fetch user club data and coupons
        setLoadingClubData(true);
        try {
            // Get user club data
            const userData = await getUser({ userId: user.key || user.id });
            if (userData?.success && userData.data) {
                setUserClubData(userData.data.club);
                setFormData((prev) => ({
                    ...prev,
                    clubPoints: userData.data.club?.clubPoints || 0
                }));
            }

            // Get user coupons
            const couponsData = await getCoupons({
                userId: user.email,
                activeOnly: false,
                validOnly: false,
                limit: 100
            });
            if (couponsData?.success) {
                setUserCoupons(couponsData.data || []);
            }
        } catch (error) {
            console.error('Error fetching user club data:', error);
            toast.error('Failed to load club data');
        } finally {
            setLoadingClubData(false);
        }
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            // Use user key directly
            const userKey = userToDelete.key || userToDelete.id;
            const result = await deleteUser(userKey);

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete user');
            }

            toast.success('User deleted successfully');
            // Update state using email as identifier
            setAllUsers((prev) => prev.filter((user) => user.email !== userToDelete.email));
            setUsers((prev) => prev.filter((user) => user.email !== userToDelete.email));
            setDeleteConfirmOpen(false);
            setUserToDelete(null);
            // Also refresh data from database to ensure consistency
            await refreshUsers();
        } catch (error) {
            toast.error(error.message || 'Failed to delete user');
        } finally {
            setIsDeleting(false);
        }
    };

    const openCreateDialog = () => {
        setEditUser(null);
        setFormData(initialFormData);
        setShowPassword(false);
        setIsOpen(true);
    };

    const handleView = async (user) => {
        setViewUser(user);
        setIsViewOpen(true);

        // Load user referrals
        if (user?.key) {
            setLoadingReferrals(true);
            try {
                const referralsData = await getUserReferrals(user.key);
                if (referralsData?.success) {
                    setUserReferrals(referralsData.data || []);
                } else {
                    setUserReferrals([]);
                }
            } catch (error) {
                console.error('Error loading referrals:', error);
                setUserReferrals([]);
            } finally {
                setLoadingReferrals(false);
            }
        }
    };

    // Handle confirmation dialog for existing user override
    const handleConfirmOverride = async () => {
        if (!confirmationDialog.pendingData) return;

        setIsSubmitting(true);

        try {
            // Add confirmation flag to the data
            const dataWithConfirmation = {
                ...confirmationDialog.pendingData,
                confirmOverride: true
            };

            const result = await createUser(dataWithConfirmation);

            if (result.success) {
                toast.success(result.message || 'User updated successfully');

                // Update local state
                setAllUsers((prev) => [...prev, result.data]);
                setUsers((prev) => [...prev, result.data]);

                // Reset form and close dialogs
                setFormData(initialFormData);
                setIsOpen(false);
                setConfirmationDialog({ open: false, existingUser: null, pendingData: null });

                // Refresh the users list
                await refreshUsers();
            } else {
                toast.error(result.error || 'Failed to update user');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('An error occurred while updating the user');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle cancellation of confirmation dialog
    const handleCancelOverride = () => {
        setConfirmationDialog({ open: false, existingUser: null, pendingData: null });
    };

    // Define table columns
    const columns = [
        {
            key: 'displayName',
            label: 'Name',
            sortable: true,
            render: (user) => (
                <span className="capitalize">
                    {user.displayName} {user.email === currentUser?.email && '(You)'}
                </span>
            ),
            className: ''
        },
        {
            key: 'email',
            label: 'Email',
            sortable: false,
            render: (user) => user.email
        },
        {
            key: 'role',
            label: 'Role',
            sortable: true,
            render: (user) => (
                <span
                    className={`rounded-full px-1 py-0.5 sm:px-2 sm:py-1 border border-border ${user.role === 'admin' ? 'bg-slate-100 text-black' : 'bg-slate-100 text-black'} text-[clamp(0.45rem,2.3vw,0.65rem)] font-semibold uppercase`}>
                    {user.role}
                </span>
            )
        },
        {
            key: 'createdAt',
            label: 'Created At',
            sortable: true,
            render: (user) => new Date(user.createdAt).toLocaleDateString()
        }
    ];

    // Define row actions
    const getRowActions = (user) => [
        {
            label: 'View Details',
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: () => handleView(user)
        },
        {
            label: 'Edit User',
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(user),
            disabled: user.email === currentUser?.email
        },
        {
            label: user.email === currentUser?.email ? 'Cannot Delete' : 'Delete User',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(user),
            disabled: user.email === currentUser?.email,
            className:
                user.email === currentUser?.email ? 'cursor-not-allowed text-muted-foreground' : 'text-destructive'
        }
    ];

    // Custom filters component
    const customFilters = (
        <div className="space-y-3">
            {isFiltersExpanded && (
                <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-35">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {roles.map((role, index) => (
                                <SelectItem key={index} value={role.value}>
                                    {role.displayName || role.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                        {hasFiltersApplied() && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setRoleFilter('all');
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
    );

    return (
        <div className="space-y-4">
            <AdminHeader title="Users" description="Manage user accounts and permissions." />

            {/* Admin Table Component */}
            <AdminTable
                data={allUsers}
                columns={columns}
                loading={loading}
                searchPlaceholder="Search users..."
                enableSearch={true}
                enableSort={true}
                enablePagination={true}
                itemsPerPage={10}
                getRowActions={getRowActions}
                filterData={filterUsersData}
                customFilters={customFilters}
                emptyMessage="No users found"
                actionButtonProps={{
                    isLoading: isDeleting,
                    loadingItem: userToDelete
                }}
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
                                    className="ml-1 px-1.5 py-0.5">
                                    {[
                                        roleFilter !== 'all' && 'Role'
                                    ].filter(Boolean).length}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh user data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={openCreateDialog}>
                            <Plus className="h-4 w-4" />
                            <span>Create User</span>
                        </Button>
                    </>
                }
            />

            {/* Create / Edit User Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-150">
                    <DialogHeader>
                        <DialogTitle>{editUser ? 'Edit User' : 'Create User'}</DialogTitle>
                        <DialogDescription>
                            {editUser
                                ? 'Update the user profile and optionally change their password.'
                                : 'Create a new user account. A welcome email can be sent to the user.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form id="user-form" onSubmit={handleSubmit} className="grid gap-4 py-2">
                        <div>
                            <label className="text-muted-foreground text-sm">Display name</label>
                            <Input
                                required
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">Email</label>
                            <Input
                                required
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">
                                Phone <span className="text-muted-foreground/60">(optional)</span>
                            </label>
                            <PhoneInput
                                value={formData.phone}
                                onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                                defaultCountry="US"
                                international
                            />
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">
                                Country <span className="text-muted-foreground/60">(optional)</span>
                            </label>
                            <CountryDropdown
                                defaultValue={formData.country}
                                onChange={(country) => setFormData({ ...formData, country: country.alpha2 })}
                                placeholder="Select country"
                            />
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">Role</label>
                            <Select
                                value={formData.role}
                                onValueChange={(val) => setFormData({ ...formData, role: val })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((r, index) => (
                                        <SelectItem key={index} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Password controls */}
                        {!editUser && (
                            <div>
                                <label className="text-muted-foreground text-sm">Password (optional)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="pr-10"
                                            placeholder="Leave empty for user to set up later"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute top-0 right-0 h-full"
                                            title={showPassword ? 'Hide password' : 'Show password'}>
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={generatePassword}
                                        title="Generate password">
                                        <KeyRound className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {editUser && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={!!formData.changePassword}
                                    onCheckedChange={(v) => {
                                        setFormData({ ...formData, changePassword: !!v });
                                        setShowPassword(false);
                                    }}
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm">Change Password</div>
                                    <div className="text-muted-foreground text-sm">Enable to set a new password</div>
                                </div>
                            </div>
                        )}

                        {editUser && formData.changePassword && (
                            <div>
                                <label className="text-muted-foreground text-sm">New password</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute top-0 right-0 h-full"
                                            title={showPassword ? 'Hide password' : 'Show password'}>
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={generatePassword}
                                        title="Generate password">
                                        <KeyRound className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* User Preferences - Show for both new and edit */}
                        <div className="border-t border-border pt-4 mt-4">
                            <label className="text-muted-foreground text-sm font-semibold mb-3 block">
                                {editUser ? 'User Preferences' : 'Default Preferences'}
                            </label>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">Email Notifications</div>
                                    <Checkbox
                                        checked={!!formData.emailNotifications}
                                        onCheckedChange={(v) => setFormData({ ...formData, emailNotifications: !!v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">Order Updates</div>
                                    <Checkbox
                                        checked={!!formData.orderUpdates}
                                        onCheckedChange={(v) => setFormData({ ...formData, orderUpdates: !!v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">Marketing Emails</div>
                                    <Checkbox
                                        checked={!!formData.marketingEmails}
                                        onCheckedChange={(v) => setFormData({ ...formData, marketingEmails: !!v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">Newsletter</div>
                                    <Checkbox
                                        checked={!!formData.newsletter}
                                        onCheckedChange={(v) => setFormData({ ...formData, newsletter: !!v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">SMS Notifications</div>
                                    <Checkbox
                                        checked={!!formData.smsNotifications}
                                        onCheckedChange={(v) => setFormData({ ...formData, smsNotifications: !!v })}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Club Points & Coupons - Edit Only */}
                        {editUser && (
                            <div className="border-t border-border pt-4 mt-4">
                                <label className="text-muted-foreground text-sm font-semibold mb-3 block">
                                    Club Points & Rewards
                                </label>
                                <div className="space-y-4">
                                    {/* Current Club Points */}
                                    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-5 w-5 text-yellow-600" />
                                            <div>
                                                <div className="text-sm font-medium">Current Club Points</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {userClubData?.clubMember ? 'Club Member' : 'Not a member'}
                                                    {userClubData?.clubLevel && ` • ${userClubData.clubLevel}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold">{formData.clubPoints || 0}</div>
                                    </div>

                                    {/* Points Adjustment */}
                                    <div>
                                        <Label className="text-sm mb-2 block">
                                            Adjust Points <span className="text-muted-foreground">(+/- value)</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={formData.clubPointsAdjustment}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setFormData({ ...formData, clubPointsAdjustment: value });
                                                }}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const adjustment =
                                                        Number.parseInt(formData.clubPointsAdjustment) || 0;
                                                    const newTotal = Math.max(
                                                        0,
                                                        (formData.clubPoints || 0) + adjustment
                                                    );
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        clubPoints: newTotal,
                                                        clubPointsAdjustment: 0
                                                    }));
                                                    toast.success(
                                                        `Points adjusted: ${adjustment > 0 ? '+' : ''}${adjustment}`
                                                    );
                                                }}
                                                disabled={!formData.clubPointsAdjustment}>
                                                Apply
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Enter positive number to add, negative to deduct. New total:{' '}
                                            {Math.max(
                                                0,
                                                (formData.clubPoints || 0) +
                                                    (Number.parseInt(formData.clubPointsAdjustment) || 0)
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Send Email */}
                        <div className="w-full flex items-center justify-between rounded-lg border border-border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="sendEmail" className="text-base">
                                    Send Email
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Toggle to send or not send an notification email
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="sendEmail"
                                    checked={formData.sendEmail !== false}
                                    onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                            </div>
                        </div>
                    </form>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setIsOpen(false);
                                setEditUser(null);
                                setFormData(initialFormData);
                                setUserClubData(null);
                                setUserCoupons([]);
                            }}>
                            Cancel
                        </Button>
                        <Button type="submit" form="user-form" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editUser ? 'Save changes' : 'Create user'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                data={allUsers}
                filename="users"
                title="Export Users"
                description="Select the user data fields you want to include in the export."
                exportFields={csvExportFields}
                formatRowData={formatUsersRowData}
            />

            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                onConfirm={handleDelete}
                title="Delete User"
                description={`Are you sure you want to delete ${userToDelete?.displayName || 'this user'}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                requireConfirmText="delete"
            />

            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>User Profile</DialogTitle>
                        <DialogDescription>Complete information about the user account.</DialogDescription>
                    </DialogHeader>

                    {viewUser && (
                        <div className="grid gap-6 py-4">
                            {/* User Identity */}
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-full bg-accent p-2">
                                            <User2 className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold capitalize">{viewUser.displayName}</h3>
                                            <p className="text-muted-foreground text-sm">{viewUser.email}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Role</p>
                                            <p className="font-medium capitalize">
                                                {getRoleDisplayName(viewUser.role)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Points</p>
                                            <p className="font-medium">{viewUser.points || 0}</p>
                                        </div>
                                        {viewUser.phone && (
                                            <div>
                                                <p className="text-muted-foreground">Phone</p>
                                                <p className="font-medium">{viewUser.phone}</p>
                                            </div>
                                        )}
                                        {viewUser.country && (
                                            <div>
                                                <p className="text-muted-foreground">Country</p>
                                                <p className="font-medium uppercase">{viewUser.country}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-muted-foreground">Created</p>
                                            <p className="font-medium">
                                                {new Date(viewUser.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Last Updated</p>
                                            <p className="font-medium">
                                                {viewUser.updatedAt
                                                    ? new Date(viewUser.updatedAt).toLocaleString()
                                                    : 'Never'}
                                            </p>
                                        </div>
                                        {viewUser.uid && (
                                            <div className="col-span-2">
                                                <p className="text-muted-foreground">User ID</p>
                                                <p className="break-all font-medium text-xs">{viewUser.uid}</p>
                                            </div>
                                        )}
                                        {viewUser.web3 && (
                                            <div className="col-span-2">
                                                <p className="text-muted-foreground">Web3 Address</p>
                                                <p className="break-all font-medium text-xs">
                                                    {viewUser.web3.public_key}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Club Points & Rewards */}
                            <Card>
                                <CardHeader>
                                    <h4 className="font-semibold text-sm">Club Points & Rewards</h4>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Club Points Display */}
                                    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-5 w-5 text-yellow-600" />
                                            <div>
                                                <div className="text-sm font-medium">Club Points</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {viewUser.clubMember ? 'Club Member' : 'Not a member'}
                                                    {viewUser.clubLevel && ` • ${viewUser.clubLevel}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold">{viewUser.clubPoints || 0}</div>
                                    </div>

                                    {/* User Coupons */}
                                    {loadingClubData ? (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            Loading coupons...
                                        </div>
                                    ) : userCoupons && userCoupons.length > 0 ? (
                                        <div>
                                            <div className="text-sm font-medium mb-2">
                                                User Coupons ({userCoupons.length})
                                            </div>
                                            <div className="max-h-50 overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                                                {userCoupons.map((coupon) => (
                                                    <div
                                                        key={coupon.id}
                                                        className="flex items-center justify-between p-2 bg-background rounded border border-border hover:bg-accent/50 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <code className="text-xs font-mono font-semibold">
                                                                    {coupon.code}
                                                                </code>
                                                                {coupon.isClubVoucher && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        Club
                                                                    </Badge>
                                                                )}
                                                                {!coupon.isActive && (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                        Inactive
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                {coupon.type === 'percentage'
                                                                    ? `${coupon.value}% off`
                                                                    : `€${coupon.value} off`}
                                                                {coupon.hasExpiration && coupon.expiresAt && (
                                                                    <>
                                                                        {' '}
                                                                        • Expires:{' '}
                                                                        {new Date(
                                                                            coupon.expiresAt
                                                                        ).toLocaleDateString()}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(coupon.code);
                                                                toast.success('Coupon code copied!');
                                                            }}
                                                            className="h-8 w-8 p-0">
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Manage coupons in Store → Coupons page
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                                            No coupons found
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Referral Information */}
                            <Card>
                                <CardHeader>
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Referral Information
                                    </h4>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Referral Code */}
                                    {viewUser.referralCode && (
                                        <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                            <div>
                                                <div className="text-sm font-medium">Referral Code</div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {viewUser.referralCode}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(viewUser.referralCode);
                                                    toast.success('Referral code copied!');
                                                }}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Referred By */}
                                    {viewUser.referredBy && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Referred by code:</span>
                                            <span className="ml-2 font-mono font-medium">{viewUser.referredBy}</span>
                                        </div>
                                    )}

                                    {/* User's Referrals */}
                                    <div>
                                        <div className="text-sm font-medium mb-2">
                                            User's Referrals ({userReferrals.length})
                                        </div>
                                        {loadingReferrals ? (
                                            <div className="text-sm text-muted-foreground text-center py-4">
                                                Loading referrals...
                                            </div>
                                        ) : userReferrals.length > 0 ? (
                                            <div className="max-h-50 overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                                                {userReferrals.map((referral) => (
                                                    <div
                                                        key={referral.uid || referral.id}
                                                        className="flex items-center justify-between p-2 bg-background rounded border border-border hover:bg-accent/50 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium">
                                                                {referral.name || referral.displayName || 'User'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {referral.email}
                                                                {referral.createdAt && (
                                                                    <>
                                                                        {' '}
                                                                        • Joined:{' '}
                                                                        {new Date(
                                                                            referral.createdAt
                                                                        ).toLocaleDateString()}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-green-600 font-medium">Active</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                                                No referrals found
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* User Preferences */}
                            <Card>
                                <CardHeader>
                                    <h4 className="font-semibold text-sm">Notification Preferences</h4>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Email Notifications</span>
                                        <span className="font-medium">
                                            {(viewUser.emailNotifications ?? true) ? '✓ Enabled' : '✗ Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Order Updates</span>
                                        <span className="font-medium">
                                            {(viewUser.orderUpdates ?? true) ? '✓ Enabled' : '✗ Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Marketing Emails</span>
                                        <span className="font-medium">
                                            {(viewUser.marketingEmails ?? true) ? '✓ Enabled' : '✗ Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Newsletter</span>
                                        <span className="font-medium">
                                            {(viewUser.newsletter ?? true) ? '✓ Enabled' : '✗ Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">SMS Notifications</span>
                                        <span className="font-medium">
                                            {(viewUser.smsNotifications ?? false) ? '✓ Enabled' : '✗ Disabled'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                                    Close
                                </Button>
                                {viewUser.email !== currentUser?.email && (
                                    <Button
                                        onClick={() => {
                                            setIsViewOpen(false);
                                            handleEdit(viewUser);
                                        }}
                                        disabled={viewUser.email === currentUser?.email}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit User
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog for Existing User */}
            <Dialog open={confirmationDialog.open} onOpenChange={() => handleCancelOverride()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>User Already Exists</DialogTitle>
                        <DialogDescription>
                            A user with email "{confirmationDialog.existingUser?.email}" already exists as a client. Do
                            you want to continue anyway? This will update the existing user with the new role and data.
                        </DialogDescription>
                    </DialogHeader>
                    {confirmationDialog.existingUser && (
                        <div className="space-y-2 rounded-lg bg-muted p-3">
                            <div className="text-sm">
                                <strong>Existing User Details:</strong>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <div>Name: {confirmationDialog.existingUser.displayName}</div>
                                <div>Email: {confirmationDialog.existingUser.email}</div>
                                <div>Current Role: {confirmationDialog.existingUser.role}</div>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={handleCancelOverride} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmOverride} disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Continue Anyway'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
