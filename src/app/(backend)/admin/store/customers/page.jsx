// @/app/(backend)/admin/store/customers/page.jsx

'use client';

import {
    CheckCircle2,
    Coins,
    Copy,
    Download,
    Eye,
    EyeOff,
    KeyRound,
    Mail,
    MessageSquare,
    Pencil,
    Plus,
    RefreshCw,
    SlidersHorizontal,
    Trash2,
    User,
    User2,
    Users,
    X,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react'; 
import { toast } from 'sonner';
import { v6 as uuidv6 } from 'uuid';
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
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { sendCustomerMessage } from '@/lib/server/email.js';
import { getAllOrders } from '@/lib/server/orders';
import { sendSMS } from '@/lib/server/sms.js';
import { getCoupons } from '@/lib/server/store';
import { createUser, deleteUser, getAllUsers, getUser, getUserReferrals, updateUser } from '@/lib/server/users';

const initialFormData = {
    displayName: '',
    email: '',
    phone: '',
    country: '',
    isProfessional: false,
    customerTvaNumber: '',
    role: 'user',
    password: '',
    points: 0,
    clubPoints: 0,
    clubPointsAdjustment: 0,
    sendEmail: true,
    changePassword: false,
    changeRole: false,
    setPassword: false,
    // Default user preferences
    emailNotifications: true,
    orderUpdates: true,
    marketingEmails: true,
    newsletter: true,
    smsNotifications: false
};

export default function CustomersPage() {
    const { siteSettings } = useAdminSettings(); 
    const searchParams = new URLSearchParams(window.location.search);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Email/SMS dialog states
    const [messageDialogOpen, setMessageDialogOpen] = useState(false);
    const [messageType, setMessageType] = useState('email'); // 'email' or 'sms'
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [messageForm, setMessageForm] = useState({ subject: '', message: '' });
    const [isSending, setIsSending] = useState(false);

    // Club data states
    const [userClubData, setUserClubData] = useState(null);
    const [userCoupons, setUserCoupons] = useState([]);
    const [loadingClubData, setLoadingClubData] = useState(false);
    const [userReferrals, setUserReferrals] = useState([]);
    const [loadingReferrals, setLoadingReferrals] = useState(false);

    // View dialog states
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewCustomer, setViewCustomer] = useState(null);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    // Filter states following catalog page pattern
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [countryFilter, setCountryFilter] = useState('all');
    const [orderCountFilter, setOrderCountFilter] = useState('all');
    const [totalSpentFilter, setTotalSpentFilter] = useState('all');
    const [emailVerifiedFilter, setEmailVerifiedFilter] = useState('all');
    const [communicationFilter, setCommunicationFilter] = useState('all');
    const [registrationDateFilter, setRegistrationDateFilter] = useState('all');
    const [sortByFilter, setSortByFilter] = useState('newest');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Check if email/SMS is enabled from settings
    const isEmailEnabled = siteSettings?.emailProvider && siteSettings.emailProvider !== 'none';
    const isSMSEnabled = siteSettings?.smsEnabled === true;

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return (
            roleFilter !== 'all' ||
            statusFilter !== 'all' ||
            countryFilter !== 'all' ||
            orderCountFilter !== 'all' ||
            totalSpentFilter !== 'all' ||
            emailVerifiedFilter !== 'all' ||
            communicationFilter !== 'all' ||
            registrationDateFilter !== 'all' ||
            sortByFilter !== 'newest'
        );
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            setLoading(true);

            // Get all users with role 'user' from users database with cache bypass
            const usersResult = await getAllUsers({
                role: 'user',
                limit: 0,
                options: { duration: '0' } // Force fresh data by bypassing cache
            });

            if (usersResult?.success) {
                const users = usersResult.data || [];

                // Get all orders to calculate customer stats with cache bypass
                const ordersResult = await getAllOrders({
                    limit: 0,
                    options: { duration: '0' } // Force fresh data by bypassing cache
                });

                if (ordersResult?.success) {
                    const orders = ordersResult.data || [];

                    // Calculate order stats for each customer
                    const customersWithStats = users.map((user) => {
                        const customerOrders = orders.filter((order) => order.userId === user.id);
                        const totalSpent = customerOrders.reduce((sum, order) => {
                            return sum + (parseFloat(order.total) || 0);
                        }, 0);

                        return {
                            ...user,
                            orderCount: customerOrders.length,
                            totalSpent: totalSpent
                        };
                    });

                    setCustomers(customersWithStats);
                } else {
                    setCustomers(users);
                }
            } else {
                setCustomers([]);
                toast.error('Failed to fetch customers');
            }

            toast.success('Customer data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing customer data:', error);
            toast.error('Failed to refresh customer data');
        } finally {
            setIsRefreshingData(false);
            setLoading(false);
        }
    };

    // Open CSV export dialog
    const openExportDialog = () => {
        setIsExportDialogOpen(true);
    };

    // CSV Export Configuration
    const csvExportFields = [
        { key: 'customerId', label: 'Customer ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Name', 'Email', 'Phone', 'VAT / Tax Number'],
            fields: ['displayName', 'email', 'phone', 'customerTvaNumber'],
            defaultChecked: true
        },
        {
            key: 'address',
            label: 'Address Information',
            headers: ['Street Address', 'City', 'State', 'Country', 'Postal Code'],
            fields: ['streetAddress', 'city', 'state', 'country', 'zipCode'],
            defaultChecked: true
        },
        {
            key: 'orderStats',
            label: 'Order Statistics',
            headers: ['Order Count', 'Total Spent'],
            fields: ['orderCount', 'totalSpent'],
            defaultChecked: true
        },
        {
            key: 'loyaltyInfo',
            label: 'Loyalty & Points',
            headers: ['Points', 'Club Points'],
            fields: ['points', 'clubPoints'],
            defaultChecked: true
        },
        {
            key: 'preferences',
            label: 'Communication Preferences',
            headers: ['Email Notifications', 'Order Updates', 'Marketing Emails', 'Newsletter', 'SMS Notifications'],
            fields: ['emailNotifications', 'orderUpdates', 'marketingEmails', 'newsletter', 'smsNotifications'],
            defaultChecked: false
        },
        {
            key: 'accountInfo',
            label: 'Account Information',
            headers: ['Role', 'Status', 'Email Verified'],
            fields: ['role', 'status', 'emailVerified'],
            defaultChecked: true
        },
        {
            key: 'timestamps',
            label: 'Timestamps',
            headers: ['Created At', 'Updated At'],
            fields: ['createdAt', 'updatedAt'],
            defaultChecked: true
        }
    ];

    const formatCustomersRowData = (customer, selectedOptions, fieldMapping) => {
        const rowData = {
            customerId: customer.id || '',
            displayName:
                `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                customer.displayName ||
                customer.email ||
                'No Name',
            email: customer.email || '',
            phone: customer.phone || '',
            customerTvaNumber: customer.customerTvaNumber || '',
            streetAddress: customer.streetAddress || '',
            city: customer.city || '',
            state: customer.state || '',
            country: customer.country || '',
            zipCode: customer.zipCode || '',
            orderCount: customer.orderCount || 0,
            totalSpent: (customer.totalSpent || 0).toFixed(2),
            points: customer.points || 0,
            clubPoints: customer.clubPoints || 0,
            emailNotifications: customer.emailNotifications ? 'Yes' : 'No',
            orderUpdates: customer.orderUpdates ? 'Yes' : 'No',
            marketingEmails: customer.marketingEmails ? 'Yes' : 'No',
            newsletter: customer.newsletter ? 'Yes' : 'No',
            smsNotifications: customer.smsNotifications ? 'Yes' : 'No',
            role: customer.role || 'user',
            status: customer.isActive ? 'Active' : 'Inactive',
            emailVerified: customer.emailVerified ? 'Yes' : 'No',
            createdAt: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '',
            updatedAt: customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString() : ''
        };

        return fieldMapping.map((field) => {
            const value = rowData[field];
            if (value === null || value === undefined) return '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            // Get all users with role 'user' from users database
            const usersResult = await getAllUsers({ role: 'user', limit: 0 });

            if (!usersResult?.success || !usersResult.data || usersResult.data.length === 0) {
                setCustomers([]);
                return;
            }

            // For each user, get their orders and calculate statistics
            const customersWithOrders = await Promise.all(
                usersResult.data.map(async (user) => {
                    try {
                        // Get all orders for this user by email
                        const ordersResult = await getAllOrders({ userId: user.email, limit: 0 });
                        const userOrders = ordersResult?.success ? ordersResult.data : [];

                        // Calculate order statistics
                        const orderCount = userOrders.length;
                        const pendingOrders = userOrders.filter((order) => order.status === 'pending').length;
                        const completedOrders = userOrders.filter((order) => order.status === 'complete').length;
                        const totalSpent = userOrders
                            .filter((order) => order.paymentStatus === 'paid' && order.status === 'complete')
                            .reduce((sum, order) => sum + (order.total || 0), 0);
                        const pendingSpent = userOrders
                            .filter((order) => order.paymentStatus === 'paid' && order.status !== 'complete')
                            .reduce((sum, order) => sum + (order.total || 0), 0);

                        // Get last order date
                        const lastOrderDate =
                            userOrders.length > 0
                                ? userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
                                : null;

                        // Structure customer data with all user data, club data, and preferences
                        return {
                            key: user.key || user.id,
                            id: user.id,
                            email: user.email,
                            displayName: user.displayName || user.email,
                            firstName: user.displayName?.split(' ')[0] || '',
                            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                            phone: user.phone || '',
                            country: user.country || '',
                            isProfessional: user.isProfessional || false,
                            customerTvaNumber: user.customerTvaNumber || '',
                            role: user.role || 'user',
                            // User preferences
                            preferences: {
                                emailNotifications: user.emailNotifications ?? true,
                                orderUpdates: user.orderUpdates ?? true,
                                marketingEmails: user.marketingEmails ?? true,
                                newsletter: user.newsletter ?? true,
                                smsNotifications: user.smsNotifications ?? false
                            },
                            // Club data
                            club: {
                                clubMember: user.clubMember || false,
                                clubPoints: user.clubPoints || 0,
                                clubLevel: user.clubLevel || null,
                                totalSpent: user.club?.totalSpent || totalSpent,
                                pendingSpent: user.club?.pendingSpent || pendingSpent,
                                claimedRewards: user.claimedRewards || [],
                                pointsHistory: user.pointsHistory || []
                            },
                            // Order statistics
                            orderCount,
                            pendingOrders,
                            completedOrders,
                            totalSpent,
                            pendingSpent,
                            lastOrderDate,
                            // Additional user data
                            createdAt: user.createdAt,
                            updatedAt: user.updatedAt,
                            isDeveloper: user.isDeveloper || false,
                            referralCode: user.referralCode || null,
                            referredBy: user.referredBy || null
                        };
                    } catch (error) {
                        console.error(`Error fetching orders for user ${user.email}:`, error);
                        // Return user data without order statistics if orders fetch fails
                        return {
                            key: user.key || user.id,
                            id: user.id,
                            email: user.email,
                            displayName: user.displayName || user.email,
                            firstName: user.displayName?.split(' ')[0] || '',
                            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                            phone: user.phone || '',
                            country: user.country || '',
                            isProfessional: user.isProfessional || false,
                            customerTvaNumber: user.customerTvaNumber || '',
                            role: user.role || 'user',
                            preferences: {
                                emailNotifications: user.emailNotifications ?? true,
                                orderUpdates: user.orderUpdates ?? true,
                                marketingEmails: user.marketingEmails ?? true,
                                newsletter: user.newsletter ?? true,
                                smsNotifications: user.smsNotifications ?? false
                            },
                            club: {
                                clubMember: user.clubMember || false,
                                clubPoints: user.clubPoints || 0,
                                clubLevel: user.clubLevel || null,
                                totalSpent: 0,
                                pendingSpent: 0,
                                claimedRewards: user.claimedRewards || [],
                                pointsHistory: user.pointsHistory || []
                            },
                            orderCount: 0,
                            pendingOrders: 0,
                            completedOrders: 0,
                            totalSpent: 0,
                            pendingSpent: 0,
                            lastOrderDate: null,
                            createdAt: user.createdAt,
                            updatedAt: user.updatedAt,
                            isDeveloper: user.isDeveloper || false,
                            referralCode: user.referralCode || null,
                            referredBy: user.referredBy || null
                        };
                    }
                })
            );

            setCustomers(customersWithOrders);
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

        // Check for duplicate email
        const trimmedEmail = formData.email.trim().toLowerCase();
        const duplicateCustomer = customers.find(
            (customer) => customer.email?.toLowerCase() === trimmedEmail && customer.email !== editCustomer?.email
        );

        if (duplicateCustomer) {
            toast.error(`Customer with email "${formData.email}" already exists. Please use a different email.`);
            return;
        }

        setIsSubmitting(true);

        // Validate password strength if setting password
        const shouldValidatePassword = editCustomer
            ? formData.changePassword && formData.password
            : formData.setPassword && formData.password;

        if (shouldValidatePassword) {
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
            let userData = {
                displayName: formData.displayName,
                email: formData.email,
                phone: formData.phone || '',
                country: formData.country || '',
                isProfessional: formData.isProfessional || false,
                customerTvaNumber: formData.customerTvaNumber || '',
                // Include user preferences
                emailNotifications: formData.emailNotifications,
                orderUpdates: formData.orderUpdates,
                marketingEmails: formData.marketingEmails,
                newsletter: formData.newsletter,
                smsNotifications: formData.smsNotifications
            };

            // Include role for new customers or if changeRole is enabled
            if (!editCustomer || formData.changeRole) {
                userData.role = formData.role || 'user';
            }

            if (editCustomer) {
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

                const result = await updateUser(editCustomer.key || editCustomer.id, userData);

                if (!result.success) {
                    throw new Error(result.error || 'Failed to update customer');
                }

                toast.success('Customer updated successfully');
                await fetchData();
            } else {
                // New customer creation - send plain password for server-side encryption (if setPassword enabled)
                userData = {
                    ...userData,
                    uid: uuidv6(),
                    sendEmail: formData.sendEmail
                };

                // Only include password if setPassword checkbox is enabled and password is provided
                if (formData.setPassword && formData.password) {
                    userData.plainPassword = formData.password; // Server will encrypt this
                }

                const result = await createUser(userData);

                if (!result.success) {
                    throw new Error(result.error || 'Failed to create customer');
                }

                toast.success('Customer created successfully');
                await fetchData();
            }

            setIsOpen(false);
            setEditCustomer(null);
            setFormData(initialFormData);
            setUserClubData(null);
            setUserCoupons([]);
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (customer) => {
        setEditCustomer(customer);
        setFormData({
            displayName: customer.displayName || '',
            email: customer.email || '',
            phone: customer.phone || '',
            country: customer.country || '',
            isProfessional: customer.isProfessional || false,
            customerTvaNumber: customer.customerTvaNumber || '',
            role: customer.role || 'user',
            password: '',
            points: customer.points || 0,
            clubPoints: customer.club?.clubPoints || 0,
            clubPointsAdjustment: 0,
            sendEmail: false,
            changePassword: false,
            // Include user preferences
            emailNotifications: customer.preferences?.emailNotifications ?? true,
            orderUpdates: customer.preferences?.orderUpdates ?? true,
            marketingEmails: customer.preferences?.marketingEmails ?? true,
            newsletter: customer.preferences?.newsletter ?? true,
            smsNotifications: customer.preferences?.smsNotifications ?? false
        });
        setIsOpen(true);

        // Fetch user club data and coupons
        setLoadingClubData(true);
        try {
            // Get user club data
            const userData = await getUser({ userId: customer.key || customer.id });
            if (userData?.success && userData.data) {
                setUserClubData(userData.data.club);
                setFormData((prev) => ({
                    ...prev,
                    clubPoints: userData.data.club?.clubPoints || userData.data.clubPoints || 0
                }));
            }

            // Get user coupons
            const couponsData = await getCoupons({
                userId: customer.email,
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

    const handleDeleteClick = (customer) => {
        setCustomerToDelete(customer);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!customerToDelete) return;

        try {
            setIsDeleting(true);
            const result = await deleteUser(customerToDelete.key || customerToDelete.id);

            if (result?.success) {
                await fetchData();
                toast.success('Customer deleted successfully!');
            } else {
                toast.error(result?.error || 'Failed to delete customer');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            toast.error('Failed to delete customer');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setCustomerToDelete(null);
        }
    };

    const handleDialogChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditCustomer(null);
            setFormData(initialFormData);
            setUserClubData(null);
            setUserCoupons([]);
            setShowPassword(false);
        }
    };

    const handleAddNew = () => {
        setEditCustomer(null);
        setFormData(initialFormData);
        setShowPassword(false);
        setUserClubData(null);
        setUserCoupons([]);
        setIsOpen(true);
    };

    const handleSendEmail = (customer) => {
        setSelectedCustomer(customer);
        setMessageType('email');
        setMessageForm({ subject: '', message: '' });
        setMessageDialogOpen(true);
    };

    const handleSendSMS = (customer) => {
        setSelectedCustomer(customer);
        setMessageType('sms');
        setMessageForm({ subject: '', message: '' });
        setMessageDialogOpen(true);
    };

    const handleSendMessage = async () => {
        if (!selectedCustomer) return;

        if (messageType === 'email') {
            if (!messageForm.subject.trim() || !messageForm.message.trim()) {
                toast.error('Subject and message are required');
                return;
            }
        } else {
            if (!messageForm.message.trim()) {
                toast.error('Message is required');
                return;
            }
        }

        try {
            setIsSending(true);

            if (messageType === 'email') {
                // Send email using the new CustomerMessageTemplate
                const result = await sendCustomerMessage(
                    selectedCustomer.email,
                    messageForm.subject,
                    messageForm.message,
                    selectedCustomer.firstName || 'Customer',
                    'pt'
                );

                if (result?.success) {
                    toast.success('Email sent successfully');
                    setMessageDialogOpen(false);
                    setMessageForm({ subject: '', message: '' });
                } else {
                    toast.error(result?.error || 'Failed to send email');
                }
            } else {
                // Send SMS
                if (!selectedCustomer.phone) {
                    toast.error('Customer has no phone number');
                    return;
                }

                const result = await sendSMS(
                    {
                        content: messageForm.message,
                        message: messageForm.message
                    },
                    selectedCustomer.phone,
                    selectedCustomer.firstName
                );

                if (result?.success) {
                    toast.success('SMS sent successfully');
                    setMessageDialogOpen(false);
                    setMessageForm({ subject: '', message: '' });
                } else {
                    toast.error(result?.error || 'Failed to send SMS');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error(`Failed to send ${messageType}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleView = async (customer) => {
        setViewCustomer(customer);
        setIsViewOpen(true);

        // Load user referrals
        if (customer?.referralCode) {
            setLoadingReferrals(true);
            try {
                const referralsData = await getUserReferrals(customer.referralCode);
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

        // Load club data and coupons for view
        setLoadingClubData(true);
        try {
            // Get user club data
            const userData = await getUser({ userId: customer.key || customer.id });
            if (userData?.success && userData.data) {
                setUserClubData(userData.data.club || customer.club);
            }

            // Get user coupons
            const couponsData = await getCoupons({
                userId: customer.email,
                activeOnly: false,
                validOnly: false,
                limit: 100
            });
            if (couponsData?.success) {
                setUserCoupons(couponsData.data || []);
            }
        } catch (error) {
            console.error('Error fetching club data:', error);
        } finally {
            setLoadingClubData(false);
        }
    };

    // Enhanced filter function for AdminTable with comprehensive filtering
    const filterCustomers = (customers, search, sortConfig) => {
        let filtered = [...customers];

        // Dynamically get search from URL params if exists
        let urlSearch = '';
        if (typeof window !== 'undefined'){
            urlSearch = searchParams.get('search') || ''; 
        };

        const activeSearch = search || urlSearch;

        // Apply search filter
        if (activeSearch) {
            filtered = filtered.filter((customer) => {
                const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                return (
                    fullName.toLowerCase().includes(activeSearch.toLowerCase()) ||
                    customer.email.toLowerCase().includes(activeSearch.toLowerCase()) ||
                    (customer.phone || '').includes(activeSearch) ||
                    (customer.streetAddress || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
                    (customer.city || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
                    (customer.state || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
                    (customer.country || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
                    (customer.zipCode || '').includes(activeSearch)
                );
            });
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'name') {
                    aVal = `${a.firstName || ''} ${a.lastName || ''}`.trim();
                    bVal = `${b.firstName || ''} ${b.lastName || ''}`.trim();
                }

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
            key: 'name',
            label: 'Customer',
            sortable: true,
            render: (customer) => (
                <div className="flex items-center justify-end sm:justify-center gap-3">
                    <div>
                        <div className="font-medium">{customer.displayName || customer.email || 'No Name'}</div>
                        <div className="text-muted-foreground text-sm">{customer.email}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'phone',
            label: 'Phone',
            sortable: true,
            render: (customer) => <div className="text-sm">{customer.phone || '-'}</div>
        },
        {
            key: 'orders',
            label: 'Orders',
            sortable: true,
            render: (customer) => (
                <div className="text-sm">
                    <div className="font-medium">{customer.orderCount || 0} orders</div>
                    <div className="text-muted-foreground text-xs">€{(customer.totalSpent || 0).toFixed(2)} total</div>
                </div>
            )
        },
        {
            key: 'communication',
            label: 'Communication',
            sortable: false,
            render: (customer) => {
                const emailEnabled =
                    customer.preferences?.emailNotifications ||
                    customer.preferences?.orderUpdates ||
                    customer.preferences?.marketingEmails ||
                    customer.preferences?.newsletter;
                const smsEnabled = customer.preferences?.smsNotifications === true;

                return (
                    <div className="flex items-center justify-end sm:justify-start gap-2">
                        <Badge
                            variant={emailEnabled && customer.email ? 'default' : 'secondary'}
                            className={
                                emailEnabled && customer.email
                                    ? 'bg-green-500 hover:bg-green-600 text-dark'
                                    : 'bg-muted'
                            }>
                            {emailEnabled && customer.email ? (
                                <CheckCircle2 className="h-3 w-3 mr-1 text-dark" />
                            ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                            )}
                            Email
                        </Badge>
                        <Badge
                            variant={smsEnabled && customer.phone ? 'default' : 'secondary'}
                            className={
                                smsEnabled && customer.phone ? 'bg-green-500 hover:bg-green-600 text-dark' : 'bg-muted'
                            }>
                            {smsEnabled && customer.phone ? (
                                <CheckCircle2 className="h-3 w-3 mr-1 text-dark" />
                            ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                            )}
                            SMS
                        </Badge>
                    </div>
                );
            }
        },
        {
            key: 'createdAt',
            label: 'Created',
            sortable: true,
            render: (customer) => <div className="text-sm">{new Date(customer.createdAt).toLocaleDateString()}</div>
        }
    ];

    // Define row actions
    const getRowActions = (customer) => [
        {
            label: 'View Details',
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: () => handleView(customer)
        },
        {
            label: 'Edit Customer',
            icon: <Pencil className="mr-2 h-4 w-4" />,
            onClick: () => handleEdit(customer)
        },
        {
            label: 'Send Email',
            icon: <Mail className="mr-2 h-4 w-4" />,
            onClick: () => handleSendEmail(customer),
            disabled: !isEmailEnabled,
            className: !isEmailEnabled ? 'opacity-50 cursor-not-allowed' : ''
        },
        {
            label: 'Send SMS',
            icon: <MessageSquare className="mr-2 h-4 w-4" />,
            onClick: () => handleSendSMS(customer),
            disabled: !isSMSEnabled || !customer.phone,
            className: !isSMSEnabled || !customer.phone ? 'opacity-50 cursor-not-allowed' : ''
        },
        {
            label: 'Delete Customer',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(customer),
            className: 'text-destructive'
        }
    ];

    return (
        <div className="space-y-4">
            <AdminHeader title="Customers" description="Manage customer accounts and information" />

            <AdminTable
                data={customers}
                columns={columns}
                filterData={filterCustomers}
                getRowActions={getRowActions}
                loading={loading}
                emptyMessage="No customers found"
                onSearch={(value) => {
                    setTimeout(() => {  
                    const params = new URLSearchParams(searchParams);
                    if (value) {
                        params.set('search', value);
                    } else {
                        params.delete('search');
                    }
                    const newUrl = `${window.location.pathname}?${params.toString()}`;
                    window.history.replaceState({}, '', newUrl);
                    }, 1000);
                }}
                searchValue={searchParams.get('search') || ''}
                searchPlaceholder="Search customers..."
                customFilters={
                    <div className="space-y-3">
                        {isFiltersExpanded && (
                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="moderator">Moderator</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={orderCountFilter} onValueChange={setOrderCountFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Orders" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Orders</SelectItem>
                                        <SelectItem value="none">No Orders</SelectItem>
                                        <SelectItem value="1-5">1-5 Orders</SelectItem>
                                        <SelectItem value="6-10">6-10 Orders</SelectItem>
                                        <SelectItem value="over-10">10+ Orders</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={totalSpentFilter} onValueChange={setTotalSpentFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Total Spent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Amounts</SelectItem>
                                        <SelectItem value="none">€0</SelectItem>
                                        <SelectItem value="under-50">Under €50</SelectItem>
                                        <SelectItem value="50-200">€50 - €200</SelectItem>
                                        <SelectItem value="over-200">Over €200</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={emailVerifiedFilter} onValueChange={setEmailVerifiedFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Email Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Emails</SelectItem>
                                        <SelectItem value="verified">Verified</SelectItem>
                                        <SelectItem value="unverified">Unverified</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={communicationFilter} onValueChange={setCommunicationFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Communication" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Preferences</SelectItem>
                                        <SelectItem value="email-enabled">Email Enabled</SelectItem>
                                        <SelectItem value="sms-enabled">SMS Enabled</SelectItem>
                                        <SelectItem value="newsletter-subscribed">Newsletter Subscribed</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={registrationDateFilter} onValueChange={setRegistrationDateFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Registration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Dates</SelectItem>
                                        <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                                        <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                                        <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                                        <SelectItem value="over-90-days">Over 90 Days</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={sortByFilter} onValueChange={setSortByFilter}>
                                    <SelectTrigger className="w-35">
                                        <SelectValue placeholder="Sort By" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest First</SelectItem>
                                        <SelectItem value="oldest">Oldest First</SelectItem>
                                        <SelectItem value="name">Name A-Z</SelectItem>
                                        <SelectItem value="email">Email A-Z</SelectItem>
                                        <SelectItem value="orders-high">Most Orders</SelectItem>
                                        <SelectItem value="orders-low">Least Orders</SelectItem>
                                        <SelectItem value="spent-high">Highest Spent</SelectItem>
                                        <SelectItem value="spent-low">Lowest Spent</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="flex gap-2">
                                    {hasFiltersApplied() && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setRoleFilter('all');
                                                setStatusFilter('all');
                                                setCountryFilter('all');
                                                setOrderCountFilter('all');
                                                setTotalSpentFilter('all');
                                                setEmailVerifiedFilter('all');
                                                setCommunicationFilter('all');
                                                setRegistrationDateFilter('all');
                                                setSortByFilter('newest');
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
                                            roleFilter !== 'all' && 'Role',
                                            statusFilter !== 'all' && 'Status',
                                            countryFilter !== 'all' && 'Country',
                                            orderCountFilter !== 'all' && 'Orders',
                                            totalSpentFilter !== 'all' && 'Spent',
                                            emailVerifiedFilter !== 'all' && 'Email',
                                            communicationFilter !== 'all' && 'Communication',
                                            registrationDateFilter !== 'all' && 'Registration',
                                            sortByFilter !== 'newest' && 'Sort'
                                        ].filter(Boolean).length
                                    }
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh customer data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4" />
                            <span>Add Customer</span>
                        </Button>
                    </>
                }
            />

            {/* Customer Form Dialog */}
            <Dialog open={isOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editCustomer ? 'Edit Customer' : 'Create Customer'}</DialogTitle>
                        <DialogDescription>
                            {editCustomer
                                ? 'Update the customer profile and optionally change their password.'
                                : 'Create a new customer account. A welcome email can be sent to the customer.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form id="customer-form" onSubmit={handleSubmit} className="grid gap-4 py-2">
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
                                defaultCountry="PT"
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

                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={!!formData.isProfessional}
                                onCheckedChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        isProfessional: !!v,
                                        customerTvaNumber: !v ? '' : formData.customerTvaNumber
                                    })
                                }
                            />
                            <div className="flex-1">
                                <div className="font-medium text-sm">Professional / Brand</div>
                                <div className="text-muted-foreground text-sm">Enable to add a VAT/tax number</div>
                            </div>
                        </div>

                        {formData.isProfessional && (
                            <div>
                                <label className="text-muted-foreground text-sm">
                                    VAT / Tax Number <span className="text-muted-foreground/60">(optional)</span>
                                </label>
                                <Input
                                    value={formData.customerTvaNumber}
                                    onChange={(e) => setFormData({ ...formData, customerTvaNumber: e.target.value })}
                                    placeholder="e.g. PT123456789"
                                />
                            </div>
                        )}

                        {/* Role selector - hidden for create (defaults to 'user'), checkbox-controlled for edit */}
                        {editCustomer && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={!!formData.changeRole}
                                    onCheckedChange={(v) => {
                                        setFormData({ ...formData, changeRole: !!v });
                                    }}
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm">Change Role</div>
                                    <div className="text-muted-foreground text-sm">Enable to modify the user role</div>
                                </div>
                            </div>
                        )}

                        {editCustomer && formData.changeRole && (
                            <div>
                                <label className="text-muted-foreground text-sm">New role</label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val) => setFormData({ ...formData, role: val })}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Password controls - checkbox-controlled for create */}
                        {!editCustomer && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={!!formData.setPassword}
                                    onCheckedChange={(v) => {
                                        setFormData({ ...formData, setPassword: !!v, password: '' });
                                        setShowPassword(false);
                                    }}
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm">Set Password</div>
                                    <div className="text-muted-foreground text-sm">
                                        Enable to set a password for this account
                                    </div>
                                </div>
                            </div>
                        )}

                        {!editCustomer && formData.setPassword && (
                            <div>
                                <label className="text-muted-foreground text-sm">Password</label>
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

                        {editCustomer && (
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

                        {editCustomer && formData.changePassword && (
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
                                {editCustomer ? 'User Preferences' : 'Default Preferences'}
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
                        {editCustomer && (
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
                                                    {userClubData?.clubMember || editCustomer?.club?.clubMember
                                                        ? 'Club Member'
                                                        : 'Not a member'}
                                                    {(userClubData?.clubLevel || editCustomer?.club?.clubLevel) &&
                                                        ` • ${userClubData?.clubLevel || editCustomer?.club?.clubLevel}`}
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
                                    Toggle to send or not send a notification email
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
                                setEditCustomer(null);
                                setFormData(initialFormData);
                                setUserClubData(null);
                                setUserCoupons([]);
                            }}>
                            Cancel
                        </Button>
                        <Button type="submit" form="customer-form" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editCustomer ? 'Save changes' : 'Create customer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Send Email/SMS Dialog */}
            <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {messageType === 'email' ? 'Send Email' : 'Send SMS'} to {selectedCustomer?.firstName || ''}{' '}
                            {selectedCustomer?.lastName || ''}
                        </DialogTitle>
                        <DialogDescription>
                            {messageType === 'email'
                                ? `Compose an email to ${selectedCustomer?.email}`
                                : `Compose an SMS to ${selectedCustomer?.phone}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {messageType === 'email' && (
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input
                                    id="subject"
                                    type="text"
                                    placeholder="Enter email subject"
                                    value={messageForm.subject}
                                    onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                                    disabled={isSending}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="message">
                                Message{' '}
                                {messageType === 'sms' && (
                                    <span className="text-muted-foreground text-xs">(Keep it short for SMS)</span>
                                )}
                            </Label>
                            {messageType === 'email' ? (
                                <RichTextEditor
                                    value={messageForm.message}
                                    onChange={(value) => setMessageForm({ ...messageForm, message: value })}
                                    placeholder="Enter your message..."
                                    className="min-h-50"
                                    style={{ opacity: isSending ? 0.5 : 1, pointerEvents: isSending ? 'none' : 'auto' }}
                                />
                            ) : (
                                <Textarea
                                    id="message"
                                    placeholder="Enter SMS message (keep it short)"
                                    value={messageForm.message}
                                    onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                                    className="min-h-32"
                                    disabled={isSending}
                                />
                            )}
                            {messageType === 'sms' && (
                                <p className="text-xs text-muted-foreground">
                                    Character count: {messageForm.message.length} / 160
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="relative z-50">
                        <Button variant="outline" onClick={() => setMessageDialogOpen(false)} disabled={isSending}>
                            Cancel
                        </Button>
                        <Button onClick={handleSendMessage} disabled={isSending}>
                            {isSending ? 'Sending...' : `Send ${messageType === 'email' ? 'Email' : 'SMS'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Customer"
                description={`Are you sure you want to delete customer "${customerToDelete?.displayName || customerToDelete?.email || ''}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
                confirmText="Delete Customer"
            />

            {/* View Customer Details Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Customer Profile</DialogTitle>
                        <DialogDescription>Complete information about the customer account.</DialogDescription>
                    </DialogHeader>

                    {viewCustomer && (
                        <div className="grid gap-6 py-4">
                            {/* Customer Identity */}
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-full bg-accent p-2">
                                            <User2 className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold capitalize">{viewCustomer.displayName}</h3>
                                            <p className="text-muted-foreground text-sm">{viewCustomer.email}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Role</p>
                                            <p className="font-medium capitalize">{viewCustomer.role || 'user'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Points</p>
                                            <p className="font-medium">{viewCustomer.points || 0}</p>
                                        </div>
                                        {viewCustomer.phone && (
                                            <div>
                                                <p className="text-muted-foreground">Phone</p>
                                                <p className="font-medium">{viewCustomer.phone}</p>
                                            </div>
                                        )}
                                        {viewCustomer.country && (
                                            <div>
                                                <p className="text-muted-foreground">Country</p>
                                                <p className="font-medium uppercase">{viewCustomer.country}</p>
                                            </div>
                                        )}
                                        {viewCustomer.customerTvaNumber && (
                                            <div>
                                                <p className="text-muted-foreground">VAT / Tax Number</p>
                                                <p className="font-medium">{viewCustomer.customerTvaNumber}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-muted-foreground">Orders</p>
                                            <p className="font-medium">{viewCustomer.orderCount || 0} orders</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Total Spent</p>
                                            <p className="font-medium">€{(viewCustomer.totalSpent || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Created</p>
                                            <p className="font-medium">
                                                {new Date(viewCustomer.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Last Updated</p>
                                            <p className="font-medium">
                                                {viewCustomer.updatedAt
                                                    ? new Date(viewCustomer.updatedAt).toLocaleString()
                                                    : 'Never'}
                                            </p>
                                        </div>
                                        {viewCustomer.lastOrderDate && (
                                            <div className="col-span-2">
                                                <p className="text-muted-foreground">Last Order</p>
                                                <p className="font-medium">
                                                    {new Date(viewCustomer.lastOrderDate).toLocaleDateString()}
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
                                                    {viewCustomer.club?.clubMember ? 'Club Member' : 'Not a member'}
                                                    {viewCustomer.club?.clubLevel &&
                                                        ` • ${viewCustomer.club.clubLevel}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold">{viewCustomer.club?.clubPoints || 0}</div>
                                    </div>

                                    {/* User Coupons */}
                                    {loadingClubData ? (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            Loading coupons...
                                        </div>
                                    ) : userCoupons && userCoupons.length > 0 ? (
                                        <div>
                                            <div className="text-sm font-medium mb-2">
                                                Customer Coupons ({userCoupons.length})
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
                                    {viewCustomer.referralCode && (
                                        <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                            <div>
                                                <div className="text-sm font-medium">Referral Code</div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {viewCustomer.referralCode}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(viewCustomer.referralCode);
                                                    toast.success('Referral code copied!');
                                                }}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Referred By */}
                                    {viewCustomer.referredBy && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Referred by code:</span>
                                            <span className="ml-2 font-mono font-medium">
                                                {viewCustomer.referredBy}
                                            </span>
                                        </div>
                                    )}

                                    {/* Customer's Referrals */}
                                    <div>
                                        <div className="text-sm font-medium mb-2">
                                            Customer's Referrals ({userReferrals.length})
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
                                                                {referral.name || referral.displayName || 'Customer'}
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
                                            {(viewCustomer.preferences?.emailNotifications ?? true)
                                                ? '✓ Enabled'
                                                : '✗ Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Order Updates</span>
                                        <span className="font-medium">
                                            {(viewCustomer.preferences?.orderUpdates ?? true)
                                                ? '✓ Enabled'
                                                : '✗ Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Marketing Emails</span>
                                        <span className="font-medium">
                                            {(viewCustomer.preferences?.marketingEmails ?? true)
                                                ? '✓ Enabled'
                                                : '✗ Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Newsletter</span>
                                        <span className="font-medium">
                                            {(viewCustomer.preferences?.newsletter ?? true)
                                                ? '✓ Enabled'
                                                : '✗ Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">SMS Notifications</span>
                                        <span className="font-medium">
                                            {(viewCustomer.preferences?.smsNotifications ?? false)
                                                ? '✓ Enabled'
                                                : '✗ Disabled'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsViewOpen(false);
                                        handleEdit(viewCustomer);
                                    }}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Customer
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Customers to CSV"
                description="Select the customer data fields you want to include in your CSV export"
                data={customers}
                exportFields={csvExportFields}
                filename="customers"
                formatRowData={formatCustomersRowData}
            />
        </div>
    );
}
