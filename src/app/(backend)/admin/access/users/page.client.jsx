// @/app/(backend)/admin/access/users/page.client.jsx

'use client';

import { Coins, Copy, Download, Eye, EyeOff, Filter, KeyRound, Pencil, Plus, RefreshCw, SlidersHorizontal, Trash2, User2, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { getAllUsers, getUser, getUserReferrals } from '@/lib/server/users';

const initialFormData = {
    displayName: '',
    email: '',
    phone: '',
    country: '',
    countryIso: '',
    streetAddress: '',
    apartmentUnit: '',
    city: '',
    state: '',
    zipCode: '',
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

export default function UsersPageClient({ initialUsers = [], initialRoles = [] }) {
    const t = useTranslations('Admin.Users');

    const [users, setUsers] = useState(initialUsers);
    const [roles, setRoles] = useState(initialRoles);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { user: currentUser } = useAuth();
    const [editUser, setEditUser] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [allUsers, setAllUsers] = useState(initialUsers);
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

    // Helper function to get role display name
    const getRoleDisplayName = (roleName) => {
        const role = roles.find((r) => r.value === roleName);
        return roleName && role ? (role.displayName || roleName).toUpperCase() : 'N/A';
    };

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return roleFilter !== 'all';
    };

    // Refresh function to fetch fresh data from database
    const refreshUsers = async () => {
        try {
            const response = await getAllUsers({ limit: 0, options: { duration: 0 } });
            if (response.success) {
                const filteredUsers = (response.data || []).filter((user) => user.role !== 'user');
                setAllUsers(filteredUsers);
                setUsers(filteredUsers);
            }
        } catch (error) {
            console.error('Error refreshing users:', error);
        }
    };

    // Manual refresh handler
    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await refreshUsers();
            toast.success(t('toasts.refreshSuccess'));
        } catch (error) {
            console.error('Error refreshing user data:', error);
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
        { key: 'userId', label: t('csv.fieldUserId'), defaultChecked: true },
        {
            key: 'basicInfo',
            label: t('csv.fieldBasicInfo'),
            headers: [
                t('csv.headerDisplayName'),
                t('csv.headerEmail'),
                t('csv.headerPhone'),
                t('csv.headerCountry'),
                t('csv.headerStreet'),
                t('csv.headerCity'),
                t('csv.headerState'),
                t('csv.headerZip')
            ],
            fields: ['displayName', 'email', 'phone', 'country', 'streetAddress', 'city', 'state', 'zipCode'],
            defaultChecked: true
        },
        {
            key: 'roleInfo',
            label: t('csv.fieldRoleStatus'),
            headers: [t('csv.headerRole'), t('csv.headerStatus')],
            fields: ['role', 'status'],
            defaultChecked: true
        },
        {
            key: 'pointsInfo',
            label: t('csv.fieldPoints'),
            headers: [t('csv.headerPoints'), t('csv.headerClubPoints')],
            fields: ['points', 'clubPoints'],
            defaultChecked: false
        },
        {
            key: 'preferences',
            label: t('csv.fieldPreferences'),
            headers: [
                t('csv.headerEmailNotifications'),
                t('csv.headerMarketingEmails'),
                t('csv.headerNewsletter'),
                t('csv.headerSmsNotifications')
            ],
            fields: ['emailNotifications', 'marketingEmails', 'newsletter', 'smsNotifications'],
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

    const formatUsersRowData = (user, selectedOptions, fieldMapping) => {
        const rowData = {
            userId: user.id,
            displayName: user.displayName || '',
            email: user.email || '',
            phone: user.phone || '',
            country: user.country || '',
            streetAddress: user.streetAddress || '',
            city: user.city || '',
            state: user.state || '',
            zipCode: user.zipCode || '',
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
                    aValue = String(aValue).toLowerCase();
                    bValue = String(bValue).toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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

        let password = '';
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];

        const allChars = lowercase + uppercase + numbers + special;
        password += allChars[Math.floor(Math.random() * allChars.length)];
        password += allChars[Math.floor(Math.random() * allChars.length)];

        password = password
            .split('')
            .sort(() => Math.random() - 0.5)
            .join('');

        setFormData({ ...formData, password });
        toast.success(t('toasts.passwordGenerated'));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate password strength if setting password
        if (formData.password && formData.password.trim() && (!editUser || formData.changePassword)) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
            if (!passwordRegex.test(formData.password)) {
                toast.error(t('toasts.passwordWeak'));
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
                countryIso: formData.countryIso || '',
                streetAddress: formData.streetAddress || '',
                apartmentUnit: formData.apartmentUnit || '',
                city: formData.city || '',
                state: formData.state || '',
                zipCode: formData.zipCode || '',
                role: formData.role,
                emailNotifications: formData.emailNotifications,
                orderUpdates: formData.orderUpdates,
                marketingEmails: formData.marketingEmails,
                newsletter: formData.newsletter,
                smsNotifications: formData.smsNotifications
            };

            if (editUser) {
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

                const userKey = editUser.key || editUser.id;
                const result = await updateUser(userKey, userData);

                if (!result.success) {
                    throw new Error(result.error || t('toasts.updateFailed'));
                }

                const updatedUserData = { ...editUser, ...userData };
                setAllUsers((prev) => prev.map((user) => (user.email === editUser.email ? updatedUserData : user)));
                setUsers((prev) => prev.map((user) => (user.email === editUser.email ? updatedUserData : user)));

                toast.success(t('toasts.updateSuccess'));
                await refreshUsers();
            } else {
                userData = {
                    ...userData,
                    uid: uuidv6(),
                    sendEmail: formData.sendEmail
                };

                if (formData.password && formData.password.trim()) {
                    userData.plainPassword = formData.password;
                }

                const result = await createUser(userData);

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
                    throw new Error(result.error || t('toasts.createFailed'));
                }

                const newUser = result.data;
                setAllUsers((prev) => [...prev, newUser]);
                setUsers((prev) => [...prev, newUser]);
                toast.success(result.message || t('toasts.createSuccess'));
                await refreshUsers();
            }

            setIsOpen(false);
            setEditUser(null);
            setFormData(initialFormData);
        } catch (error) {
            toast.error(error.message || t('toasts.updateFailed'));
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
            countryIso: user.countryIso || '',
            streetAddress: user.streetAddress || '',
            apartmentUnit: user.apartmentUnit || '',
            city: user.city || '',
            state: user.state || '',
            zipCode: user.zipCode || '',
            role: user.role || 'user',
            password: '',
            points: user.points || 0,
            clubPoints: user.clubPoints || 0,
            clubPointsAdjustment: 0,
            sendEmail: false,
            changePassword: false,
            emailNotifications: user.emailNotifications ?? true,
            orderUpdates: user.orderUpdates ?? true,
            marketingEmails: user.marketingEmails ?? true,
            newsletter: user.newsletter ?? true,
            smsNotifications: user.smsNotifications ?? false
        });
        setIsOpen(true);

        setLoadingClubData(true);
        try {
            const userData = await getUser({ userId: user.key || user.id });
            if (userData?.success && userData.data) {
                setUserClubData(userData.data.club);
                setFormData((prev) => ({
                    ...prev,
                    clubPoints: userData.data.club?.clubPoints || 0
                }));
            }

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
            toast.error(t('toasts.clubDataFailed'));
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
            const userKey = userToDelete.key || userToDelete.id;
            const result = await deleteUser(userKey);

            if (!result.success) {
                throw new Error(result.error || t('toasts.deleteFailed'));
            }

            toast.success(t('toasts.deletedSuccess'));
            setAllUsers((prev) => prev.filter((user) => user.email !== userToDelete.email));
            setUsers((prev) => prev.filter((user) => user.email !== userToDelete.email));
            setDeleteConfirmOpen(false);
            setUserToDelete(null);
            await refreshUsers();
        } catch (error) {
            toast.error(error.message || t('toasts.deleteFailed'));
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

        if (user?.referralCode) {
            setLoadingReferrals(true);
            try {
                const referralsData = await getUserReferrals(user.referralCode);
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
            const dataWithConfirmation = {
                ...confirmationDialog.pendingData,
                confirmOverride: true
            };

            const result = await createUser(dataWithConfirmation);

            if (result.success) {
                toast.success(result.message || t('toasts.updateSuccess'));
                setAllUsers((prev) => [...prev, result.data]);
                setUsers((prev) => [...prev, result.data]);
                setFormData(initialFormData);
                setIsOpen(false);
                setConfirmationDialog({ open: false, existingUser: null, pendingData: null });
                await refreshUsers();
            } else {
                toast.error(result.error || t('toasts.overrideFailed'));
            }
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error(t('toasts.overrideError'));
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
            label: t('table.colName'),
            sortable: true,
            render: (user) => (
                <span className="capitalize">
                    {user.displayName} {user.email === currentUser?.email && t('table.colYou')}
                </span>
            ),
            className: ''
        },
        {
            key: 'email',
            label: t('table.colEmail'),
            sortable: false,
            render: (user) => user.email
        },
        {
            key: 'role',
            label: t('table.colRole'),
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
            label: t('table.colCreatedAt'),
            sortable: true,
            render: (user) => new Date(user.createdAt).toLocaleDateString()
        }
    ];

    // Define row actions
    const getRowActions = (user) => [
        {
            label: t('rowActions.viewDetails'),
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: () => handleView(user)
        },
        {
            label: t('rowActions.editUser'),
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(user),
            disabled: user.email === currentUser?.email
        },
        {
            label: user.email === currentUser?.email ? t('rowActions.cannotDelete') : t('rowActions.deleteUser'),
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
                            <SelectValue placeholder={t('filters.rolePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('filters.allRoles')}</SelectItem>
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
                                onClick={() => setRoleFilter('all')}
                                title={t('filters.reset')}>
                                <X className="h-4 w-4" color="red" />
                                <span className="text-red-500">{t('filters.reset')}</span>
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            <AdminHeader title={t('header.title')} description={t('header.description')} />

            {/* Admin Table Component */}
            <AdminTable
                data={allUsers}
                columns={columns}
                loading={loading}
                searchPlaceholder={t('table.searchPlaceholder')}
                enableSearch={true}
                enableSort={true}
                enablePagination={true}
                itemsPerPage={10}
                getRowActions={getRowActions}
                filterData={filterUsersData}
                customFilters={customFilters}
                emptyMessage={t('table.emptyMessage')}
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
                                {isFiltersExpanded ? t('actions.hideFilters') : t('actions.showFilters')}
                            </span>
                            {hasFiltersApplied() && (
                                <Badge
                                    variant={isFiltersExpanded ? 'default' : 'outline'}
                                    className="ml-1 px-1.5 py-0.5">
                                    {[roleFilter !== 'all' && t('filters.rolePlaceholder')].filter(Boolean).length}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title={t('actions.refresh')}>
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">
                                {isRefreshingData ? t('actions.refreshing') : t('actions.refresh')}
                            </span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">{t('actions.exportCsv')}</span>
                        </Button>
                        <Button onClick={openCreateDialog}>
                            <Plus className="h-4 w-4" />
                            <span>{t('actions.createUser')}</span>
                        </Button>
                    </>
                }
            />

            {/* Create / Edit User Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-150">
                    <DialogHeader>
                        <DialogTitle>{editUser ? t('dialog.editTitle') : t('dialog.createTitle')}</DialogTitle>
                        <DialogDescription>
                            {editUser ? t('dialog.editDescription') : t('dialog.createDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <form id="user-form" onSubmit={handleSubmit} className="grid gap-4 py-2">
                        <div>
                            <label className="text-muted-foreground text-sm">{t('dialog.fieldDisplayName')}</label>
                            <Input
                                required
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">{t('dialog.fieldEmail')}</label>
                            <Input
                                required
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">
                                {t('dialog.fieldPhone')}{' '}
                                <span className="text-muted-foreground/60">({t('dialog.fieldOptional')})</span>
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
                                {t('dialog.fieldCountry')}{' '}
                                <span className="text-muted-foreground/60">({t('dialog.fieldOptional')})</span>
                            </label>
                            <CountryDropdown
                                defaultValue={formData.country}
                                onChange={(country) =>
                                    setFormData({
                                        ...formData,
                                        country: country.alpha2,
                                        countryIso: country.alpha2
                                    })
                                }
                                placeholder={t('dialog.selectCountryPlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">
                                {t('dialog.fieldStreetAddress')}{' '}
                                <span className="text-muted-foreground/60">({t('dialog.fieldOptional')})</span>
                            </label>
                            <Input
                                value={formData.streetAddress}
                                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                placeholder={t('dialog.streetPlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">
                                {t('dialog.fieldApartmentUnit')}{' '}
                                <span className="text-muted-foreground/60">({t('dialog.fieldOptional')})</span>
                            </label>
                            <Input
                                value={formData.apartmentUnit}
                                onChange={(e) => setFormData({ ...formData, apartmentUnit: e.target.value })}
                                placeholder={t('dialog.aptPlaceholder')}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label className="text-muted-foreground text-sm">
                                    {t('dialog.fieldCity')}{' '}
                                    <span className="text-muted-foreground/60">({t('dialog.fieldOptional')})</span>
                                </label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder={t('dialog.cityPlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="text-muted-foreground text-sm">
                                    {t('dialog.fieldState')}{' '}
                                    <span className="text-muted-foreground/60">({t('dialog.fieldOptional')})</span>
                                </label>
                                <Input
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder={t('dialog.statePlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="text-muted-foreground text-sm">
                                    {t('dialog.fieldZipCode')}{' '}
                                    <span className="text-muted-foreground/60">({t('dialog.fieldOptional')})</span>
                                </label>
                                <Input
                                    value={formData.zipCode}
                                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                    placeholder={t('dialog.zipPlaceholder')}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-muted-foreground text-sm">{t('dialog.fieldRole')}</label>
                            <Select
                                value={formData.role}
                                onValueChange={(val) => setFormData({ ...formData, role: val })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('dialog.selectRolePlaceholder')} />
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

                        {/* Password controls — create only */}
                        {!editUser && (
                            <div>
                                <label className="text-muted-foreground text-sm">
                                    {t('dialog.fieldPasswordCreate')}{' '}
                                    <span className="text-muted-foreground/60">({t('dialog.fieldOptional')})</span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="pr-10"
                                            placeholder={t('dialog.fieldPasswordPlaceholder')}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute top-0 right-0 h-full"
                                            title={
                                                showPassword
                                                    ? t('dialog.labelHidePassword')
                                                    : t('dialog.labelShowPassword')
                                            }>
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
                                        title={t('dialog.labelGeneratePassword')}>
                                        <KeyRound className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Change password toggle — edit only */}
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
                                    <div className="font-medium text-sm">{t('dialog.labelChangePassword')}</div>
                                    <div className="text-muted-foreground text-sm">
                                        {t('dialog.labelChangePasswordDesc')}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* New password field — edit + changePassword toggled */}
                        {editUser && formData.changePassword && (
                            <div>
                                <label className="text-muted-foreground text-sm">
                                    {t('dialog.fieldPasswordNew')}
                                </label>
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
                                            title={
                                                showPassword
                                                    ? t('dialog.labelHidePassword')
                                                    : t('dialog.labelShowPassword')
                                            }>
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
                                        title={t('dialog.labelGeneratePassword')}>
                                        <KeyRound className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* User Preferences */}
                        <div className="border-t border-border pt-4 mt-4">
                            <label className="text-muted-foreground text-sm font-semibold mb-3 block">
                                {editUser ? t('dialog.preferencesTitle') : t('dialog.preferencesDefaultTitle')}
                            </label>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">{t('dialog.prefEmailNotifications')}</div>
                                    <Checkbox
                                        checked={!!formData.emailNotifications}
                                        onCheckedChange={(v) => setFormData({ ...formData, emailNotifications: !!v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">{t('dialog.prefOrderUpdates')}</div>
                                    <Checkbox
                                        checked={!!formData.orderUpdates}
                                        onCheckedChange={(v) => setFormData({ ...formData, orderUpdates: !!v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">{t('dialog.prefMarketingEmails')}</div>
                                    <Checkbox
                                        checked={!!formData.marketingEmails}
                                        onCheckedChange={(v) => setFormData({ ...formData, marketingEmails: !!v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">{t('dialog.prefNewsletter')}</div>
                                    <Checkbox
                                        checked={!!formData.newsletter}
                                        onCheckedChange={(v) => setFormData({ ...formData, newsletter: !!v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm">{t('dialog.prefSmsNotifications')}</div>
                                    <Checkbox
                                        checked={!!formData.smsNotifications}
                                        onCheckedChange={(v) => setFormData({ ...formData, smsNotifications: !!v })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Club Points & Rewards — edit only */}
                        {editUser && (
                            <div className="border-t border-border pt-4 mt-4">
                                <label className="text-muted-foreground text-sm font-semibold mb-3 block">
                                    {t('dialog.clubTitle')}
                                </label>
                                <div className="space-y-4">
                                    {/* Current Club Points */}
                                    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-5 w-5 text-yellow-600" />
                                            <div>
                                                <div className="text-sm font-medium">
                                                    {t('dialog.clubCurrentPoints')}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {userClubData?.clubMember
                                                        ? t('dialog.clubMember')
                                                        : t('dialog.clubNotMember')}
                                                    {userClubData?.clubLevel && ` • ${userClubData.clubLevel}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold">{formData.clubPoints || 0}</div>
                                    </div>

                                    {/* Points Adjustment */}
                                    <div>
                                        <Label className="text-sm mb-2 block">
                                            {t('dialog.clubAdjustLabel')}{' '}
                                            <span className="text-muted-foreground">
                                                {t('dialog.clubAdjustSuffix')}
                                            </span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={formData.clubPointsAdjustment}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        clubPointsAdjustment: e.target.value
                                                    })
                                                }
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
                                                    const prefix = adjustment > 0 ? '+' : '';
                                                    toast.success(
                                                        t('toasts.pointsAdjusted', {
                                                            adjustment: `${prefix}${adjustment}`
                                                        })
                                                    );
                                                }}
                                                disabled={!formData.clubPointsAdjustment}>
                                                {t('dialog.clubApply')}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t('dialog.clubAdjustHint', {
                                                total: Math.max(
                                                    0,
                                                    (formData.clubPoints || 0) +
                                                        (Number.parseInt(formData.clubPointsAdjustment) || 0)
                                                )
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Send Email toggle */}
                        <div className="w-full flex items-center justify-between rounded-lg border border-border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="sendEmail" className="text-base">
                                    {t('dialog.sendEmailTitle')}
                                </Label>
                                <p className="text-xs text-muted-foreground">{t('dialog.sendEmailDesc')}</p>
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
                            {t('dialog.cancel')}
                        </Button>
                        <Button type="submit" form="user-form" disabled={isSubmitting}>
                            {isSubmitting
                                ? t('dialog.saving')
                                : editUser
                                  ? t('dialog.saveChanges')
                                  : t('dialog.createUserBtn')}
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
                title={t('csv.title')}
                description={t('csv.description')}
                exportFields={csvExportFields}
                formatRowData={formatUsersRowData}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                onConfirm={handleDelete}
                title={t('deleteDialog.title')}
                description={t('deleteDialog.description', {
                    name: userToDelete?.displayName || t('deleteDialog.thisUser')
                })}
                confirmText={t('deleteDialog.confirmText')}
                cancelText={t('deleteDialog.cancel')}
                requireConfirmText="delete"
                loading={isDeleting}
            />

            {/* View User Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('viewDialog.title')}</DialogTitle>
                        <DialogDescription>{t('viewDialog.description')}</DialogDescription>
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
                                            <p className="text-muted-foreground">{t('viewDialog.labelRole')}</p>
                                            <p className="font-medium capitalize">
                                                {getRoleDisplayName(viewUser.role)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">{t('viewDialog.labelPoints')}</p>
                                            <p className="font-medium">{viewUser.points || 0}</p>
                                        </div>
                                        {viewUser.phone && (
                                            <div>
                                                <p className="text-muted-foreground">{t('viewDialog.labelPhone')}</p>
                                                <p className="font-medium">{viewUser.phone}</p>
                                            </div>
                                        )}
                                        {viewUser.country && (
                                            <div>
                                                <p className="text-muted-foreground">
                                                    {t('viewDialog.labelCountry')}
                                                </p>
                                                <p className="font-medium uppercase">{viewUser.country}</p>
                                            </div>
                                        )}
                                        {(viewUser.streetAddress ||
                                            viewUser.apartmentUnit ||
                                            viewUser.city ||
                                            viewUser.state ||
                                            viewUser.zipCode) && (
                                            <div className="col-span-2">
                                                <p className="text-muted-foreground">
                                                    {t('viewDialog.labelAddress')}
                                                </p>
                                                {viewUser.streetAddress && (
                                                    <p className="font-medium">{viewUser.streetAddress}</p>
                                                )}
                                                {viewUser.apartmentUnit && (
                                                    <p className="font-medium">{viewUser.apartmentUnit}</p>
                                                )}
                                                <p className="font-medium">
                                                    {[viewUser.city, viewUser.state].filter(Boolean).join(', ')}
                                                    {viewUser.zipCode ? ` ${viewUser.zipCode}` : ''}
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-muted-foreground">{t('viewDialog.labelCreated')}</p>
                                            <p className="font-medium">
                                                {new Date(viewUser.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                {t('viewDialog.labelLastUpdated')}
                                            </p>
                                            <p className="font-medium">
                                                {viewUser.updatedAt
                                                    ? new Date(viewUser.updatedAt).toLocaleString()
                                                    : t('viewDialog.never')}
                                            </p>
                                        </div>
                                        {viewUser.uid && (
                                            <div className="col-span-2">
                                                <p className="text-muted-foreground">{t('viewDialog.labelUserId')}</p>
                                                <p className="break-all font-medium text-xs">{viewUser.uid}</p>
                                            </div>
                                        )}
                                        {viewUser.web3 && (
                                            <div className="col-span-2">
                                                <p className="text-muted-foreground">{t('viewDialog.labelWeb3')}</p>
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
                                    <h4 className="font-semibold text-sm">{t('viewDialog.clubTitle')}</h4>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-5 w-5 text-yellow-600" />
                                            <div>
                                                <div className="text-sm font-medium">{t('viewDialog.clubPoints')}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {viewUser.clubMember
                                                        ? t('viewDialog.clubMember')
                                                        : t('viewDialog.clubNotMember')}
                                                    {viewUser.clubLevel && ` • ${viewUser.clubLevel}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold">{viewUser.clubPoints || 0}</div>
                                    </div>

                                    {/* User Coupons */}
                                    {loadingClubData ? (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            {t('viewDialog.loadingCoupons')}
                                        </div>
                                    ) : userCoupons && userCoupons.length > 0 ? (
                                        <div>
                                            <div className="text-sm font-medium mb-2">
                                                {t('viewDialog.couponsTitle', { count: userCoupons.length })}
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
                                                                    ? t('viewDialog.couponOff', {
                                                                          value: coupon.value
                                                                      })
                                                                    : t('viewDialog.couponOffFixed', {
                                                                          value: coupon.value
                                                                      })}
                                                                {coupon.hasExpiration && coupon.expiresAt && (
                                                                    <>
                                                                        {' '}
                                                                        • {t('viewDialog.couponExpires')}{' '}
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
                                                                toast.success(t('toasts.couponCopied'));
                                                            }}
                                                            className="h-8 w-8 p-0">
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {t('viewDialog.couponsManageHint')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                                            {t('viewDialog.noCoupons')}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Referral Information */}
                            <Card>
                                <CardHeader>
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        {t('viewDialog.referralTitle')}
                                    </h4>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {viewUser.referralCode && (
                                        <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                            <div>
                                                <div className="text-sm font-medium">
                                                    {t('viewDialog.referralCode')}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {viewUser.referralCode}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(viewUser.referralCode);
                                                    toast.success(t('toasts.referralCopied'));
                                                }}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {viewUser.referredBy && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">
                                                {t('viewDialog.referredBy')}
                                            </span>
                                            <span className="ml-2 font-mono font-medium">{viewUser.referredBy}</span>
                                        </div>
                                    )}

                                    <div>
                                        <div className="text-sm font-medium mb-2">
                                            {t('viewDialog.referralsTitle', { count: userReferrals.length })}
                                        </div>
                                        {loadingReferrals ? (
                                            <div className="text-sm text-muted-foreground text-center py-4">
                                                {t('viewDialog.loadingReferrals')}
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
                                                                        •{' '}
                                                                        {new Date(
                                                                            referral.createdAt
                                                                        ).toLocaleDateString()}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-green-600 font-medium">
                                                            {t('viewDialog.referralActive')}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                                                {t('viewDialog.noReferrals')}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notification Preferences */}
                            <Card>
                                <CardHeader>
                                    <h4 className="font-semibold text-sm">{t('viewDialog.preferencesTitle')}</h4>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {t('dialog.prefEmailNotifications')}
                                        </span>
                                        <span className="font-medium">
                                            {(viewUser.emailNotifications ?? true)
                                                ? t('viewDialog.prefEnabled')
                                                : t('viewDialog.prefDisabled')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {t('dialog.prefOrderUpdates')}
                                        </span>
                                        <span className="font-medium">
                                            {(viewUser.orderUpdates ?? true)
                                                ? t('viewDialog.prefEnabled')
                                                : t('viewDialog.prefDisabled')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {t('dialog.prefMarketingEmails')}
                                        </span>
                                        <span className="font-medium">
                                            {(viewUser.marketingEmails ?? true)
                                                ? t('viewDialog.prefEnabled')
                                                : t('viewDialog.prefDisabled')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{t('dialog.prefNewsletter')}</span>
                                        <span className="font-medium">
                                            {(viewUser.newsletter ?? true)
                                                ? t('viewDialog.prefEnabled')
                                                : t('viewDialog.prefDisabled')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {t('dialog.prefSmsNotifications')}
                                        </span>
                                        <span className="font-medium">
                                            {(viewUser.smsNotifications ?? false)
                                                ? t('viewDialog.prefEnabled')
                                                : t('viewDialog.prefDisabled')}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                                    {t('viewDialog.close')}
                                </Button>
                                {viewUser.email !== currentUser?.email && (
                                    <Button
                                        onClick={() => {
                                            setIsViewOpen(false);
                                            handleEdit(viewUser);
                                        }}
                                        disabled={viewUser.email === currentUser?.email}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t('viewDialog.editUser')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog for Existing User Override */}
            <Dialog open={confirmationDialog.open} onOpenChange={() => handleCancelOverride()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('overrideDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('overrideDialog.description', {
                                email: confirmationDialog.existingUser?.email || ''
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    {confirmationDialog.existingUser && (
                        <div className="space-y-2 rounded-lg bg-muted p-3">
                            <div className="text-sm">
                                <strong>{t('overrideDialog.existingUserLabel')}</strong>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <div>
                                    {t('overrideDialog.labelName')} {confirmationDialog.existingUser.displayName}
                                </div>
                                <div>
                                    {t('overrideDialog.labelEmail')} {confirmationDialog.existingUser.email}
                                </div>
                                <div>
                                    {t('overrideDialog.labelCurrentRole')} {confirmationDialog.existingUser.role}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={handleCancelOverride} disabled={isSubmitting}>
                            {t('overrideDialog.cancel')}
                        </Button>
                        <Button onClick={handleConfirmOverride} disabled={isSubmitting}>
                            {isSubmitting ? t('overrideDialog.updating') : t('overrideDialog.continueAnyway')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
