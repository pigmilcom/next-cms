// @/app/(backend)/admin/tickets/page.client.jsx
'use client';

import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    Eye,
    Filter,
    MessageSquare,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    TicketX,
    Trash2,
    TrendingUp,
    Users,
    X,
    XCircle
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {ConfirmationDialog} from '@/components/ui/confirmation-dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { addReplyToTicket, createTicketAction, deleteTicketById, updateTicketStatus } from './actions.js';

const TicketsPageClient = ({ initialTickets, initialStats, filters }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { siteSettings } = useAdminSettings();

    // Check if email and SMS are enabled from settings
    const isEmailEnabled = siteSettings?.emailProvider && siteSettings.emailProvider !== 'none';
    const isSMSEnabled = siteSettings?.smsEnabled === true;

    const [tickets, setTickets] = useState(initialTickets || []);
    const [stats, setStats] = useState(initialStats || {});
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showTicketDialog, setShowTicketDialog] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [updatingTicket, setUpdatingTicket] = useState(false);
    const [deletingTicket, setDeletingTicket] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Delete confirmation states
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [priorityFilter, setPriorityFilter] = useState(filters.priority || 'all');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
    const [isCreatingTicket, setIsCreatingTicket] = useState(false);

    // Create ticket form state
    const [createTicketForm, setCreateTicketForm] = useState({
        userEmail: '',
        userName: '',
        subject: '',
        description: '',
        type: 'support',
        priority: 'medium'
    });

    // Notification preferences for create ticket
    const [createTicketNotifications, setCreateTicketNotifications] = useState({
        sendEmail: false, // Will be set in useEffect
        sendSMS: false
    });

    // Notification preferences for replies
    const [replyNotifications, setReplyNotifications] = useState({
        sendEmail: false, // Will be set in useEffect
        sendSMS: false
    });

    // Update notification defaults when settings change
    useEffect(() => {
        setCreateTicketNotifications(prev => ({
            ...prev,
            sendEmail: isEmailEnabled && prev.sendEmail === false ? isEmailEnabled : prev.sendEmail
        }));
        setReplyNotifications(prev => ({
            ...prev,
            sendEmail: isEmailEnabled && prev.sendEmail === false ? isEmailEnabled : prev.sendEmail
        }));
    }, [isEmailEnabled, isSMSEnabled]);

    // Handle filter changes
    const updateFilters = (newFilters) => {
        const params = new URLSearchParams(searchParams.toString());

        // Update or remove filter params
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });

        // Reset page when filters change
        if (newFilters.status !== undefined || newFilters.priority !== undefined || newFilters.type !== undefined) {
            params.delete('page');
        }

        router.push(`/admin/tickets?${params.toString()}`);
    };

    // Filter tickets based on search term
    const filteredTickets = (tickets || []).filter((ticket) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            ticket.ticketNumber?.toLowerCase().includes(search) ||
            ticket.subject?.toLowerCase().includes(search) ||
            ticket.userName?.toLowerCase().includes(search) ||
            ticket.userEmail?.toLowerCase().includes(search) ||
            ticket.description?.toLowerCase().includes(search)
        );
    });

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all';
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        try {
            setIsRefreshingData(true);
            const params = new URLSearchParams(searchParams.toString());
            params.set('refresh', Date.now().toString()); // Force refresh
            router.push(`/admin/tickets?${params.toString()}`);
            toast.success('Tickets data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing tickets data:', error);
            toast.error('Failed to refresh tickets data');
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
        { key: 'ticketId', label: 'Ticket ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Ticket Number', 'Subject', 'Description'],
            fields: ['ticketNumber', 'subject', 'description'],
            defaultChecked: true
        },
        {
            key: 'userInfo',
            label: 'User Information',
            headers: ['User Name', 'User Email'],
            fields: ['userName', 'userEmail'],
            defaultChecked: true
        },
        {
            key: 'ticketDetails',
            label: 'Ticket Details',
            headers: ['Type', 'Priority', 'Status'],
            fields: ['type', 'priority', 'status'],
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

    const formatTicketsRowData = (ticket, selectedOptions, fieldMapping) => {
        const rowData = {
            ticketId: ticket.id || '',
            ticketNumber: ticket.ticketNumber || '',
            subject: ticket.subject || '',
            description: ticket.description || '',
            userName: ticket.userName || '',
            userEmail: ticket.userEmail || '',
            type: ticket.type ? formatIssueType(ticket.type) : '',
            priority: ticket.priority ? ticket.priority.toUpperCase() : '',
            status: ticket.status ? ticket.status.replace('-', ' ').toUpperCase() : '',
            createdAt: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '',
            updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : ''
        };

        return fieldMapping.map((field) => {
            const value = rowData[field];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
        });
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'open':
                return <Clock className="h-4 w-4" />;
            case 'in-progress':
                return <AlertCircle className="h-4 w-4" />;
            case 'resolved':
                return <CheckCircle className="h-4 w-4" />;
            case 'closed':
                return <XCircle className="h-4 w-4" />;
            default:
                return <TicketX className="h-4 w-4" />;
        }
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'open':
                return 'destructive';
            case 'in-progress':
                return 'outline';
            case 'resolved':
                return 'outline';
            case 'closed':
                return 'default';
            default:
                return 'outline';
        }
    };

    const getPriorityBadgeVariant = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'destructive';
            case 'high':
                return 'outline';
            case 'medium':
                return 'outline';
            case 'low':
                return 'outline';
            default:
                return 'outline';
        }
    };

    const formatIssueType = (type) => {
        const typeMap = {
            payments: 'Pagamentos',
            orders: 'Encomendas',
            support: 'Suporte & Assistência',
            bug: 'Bug Técnico',
            other: 'Outros assuntos'
        };
        return typeMap[type] || type;
    };

    const handleUpdateStatus = async (ticketId, newStatus) => {
        try {
            setUpdatingTicket(true);

            const result = await updateTicketStatus(ticketId, {
                status: newStatus,
                ...(newStatus === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}),
                ...(newStatus === 'closed' ? { closedAt: new Date().toISOString() } : {})
            });

            if (result.success) {
                // Update local state
                setTickets((prev) =>
                    prev.map((ticket) =>
                        ticket.id === ticketId
                            ? { ...ticket, status: newStatus, updatedAt: new Date().toISOString() }
                            : ticket
                    )
                );

                if (selectedTicket?.id === ticketId) {
                    setSelectedTicket((prev) => ({
                        ...prev,
                        status: newStatus,
                        updatedAt: new Date().toISOString()
                    }));
                }

                toast.success('Ticket status updated successfully');
            } else {
                toast.error(result.error || 'Failed to update ticket status');
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
            toast.error('Failed to update ticket status');
        } finally {
            setUpdatingTicket(false);
        }
    };

    const handleAddReply = async () => {
        if (!replyMessage.trim() || !selectedTicket) return;

        try {
            setUpdatingTicket(true);

            const result = await addReplyToTicket(selectedTicket.id, {
                message: replyMessage.trim(),
                isAdmin: true,
                notifications: replyNotifications
            });

            if (result.success) {
                // Update local state
                const updatedTicket = result.data;
                setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? updatedTicket : ticket)));
                setSelectedTicket(updatedTicket);
                setReplyMessage('');
                
                // Reset reply notifications to defaults
                setReplyNotifications({
                    sendEmail: isEmailEnabled,
                    sendSMS: false
                });

                toast.success('Reply sent successfully');
            } else {
                toast.error(result.error || 'Failed to send reply');
            }
        } catch (error) {
            console.error('Error adding reply:', error);
            toast.error('Failed to send reply');
        } finally {
            setUpdatingTicket(false);
        }
    };

    const handleDeleteClick = (ticket) => {
        setTicketToDelete(ticket);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!ticketToDelete) return;

        try {
            setIsDeleting(true);
            setDeletingTicket(ticketToDelete.id);

            const result = await deleteTicketById(ticketToDelete.id);

            if (result.success) {
                // Remove from local state
                setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketToDelete.id));
                setShowTicketDialog(false);
                setSelectedTicket(null);
                setDeleteConfirmOpen(false);
                setTicketToDelete(null);

                toast.success('Ticket deleted successfully');
            } else {
                toast.error(result.error || 'Failed to delete ticket');
            }
        } catch (error) {
            console.error('Error deleting ticket:', error);
            toast.error('Failed to delete ticket');
        } finally {
            setIsDeleting(false);
            setDeletingTicket(null);
        }
    };

    const openTicketDialog = (ticket) => {
        setSelectedTicket(ticket);
        setShowTicketDialog(true);
        setReplyMessage('');
        // Reset reply notifications to defaults
        setReplyNotifications({
            sendEmail: isEmailEnabled,
            sendSMS: false
        });
    };

    const handleCreateTicket = async () => {
        if (!createTicketForm.userEmail || !createTicketForm.subject || !createTicketForm.description) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setIsCreatingTicket(true);

            const result = await createTicketAction({
                ...createTicketForm,
                notifications: createTicketNotifications
            });

            if (result.success) {
                // Add the new ticket to the local state
                setTickets((prev) => [result.data, ...prev]);
                
                // Reset the form
                setCreateTicketForm({
                    userEmail: '',
                    userName: '',
                    subject: '',
                    description: '',
                    type: 'support',
                    priority: 'medium'
                });
                
                // Reset notifications to defaults
                setCreateTicketNotifications({
                    sendEmail: isEmailEnabled,
                    sendSMS: false
                });

                // Close the dialog
                setIsCreateTicketOpen(false);

                toast.success('Ticket created successfully');
            } else {
                toast.error(result.error || 'Failed to create ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            toast.error('Failed to create ticket');
        } finally {
            setIsCreatingTicket(false);
        }
    };

    const resetCreateTicketForm = () => {
        setCreateTicketForm({
            userEmail: '',
            userName: '',
            subject: '',
            description: '',
            type: 'support',
            priority: 'medium'
        });
        setCreateTicketNotifications({
            sendEmail: isEmailEnabled,
            sendSMS: false
        });
    };

    const tableColumns = [
        {
            key: 'ticketNumber',
            label: 'Ticket #',
            sortable: true,
            render: (ticket) => <div className="font-mono text-sm">{ticket.ticketNumber}</div>
        },
        {
            key: 'subject',
            label: 'Subject',
            sortable: true,
            render: (ticket) => (
                <div className="max-w-xs">
                    <div className="font-medium truncate">{ticket.subject}</div>
                    <div className="text-sm text-muted-foreground truncate">
                        {ticket.description?.substring(0, 60)}...
                    </div>
                </div>
            )
        },
        {
            key: 'userName',
            label: 'User',
            sortable: true,
            render: (ticket) => (
                <div>
                    <div className="font-medium">{ticket.userName}</div>
                    <div className="text-sm text-muted-foreground">{ticket.userEmail}</div>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Type',
            sortable: true,
            render: (ticket) => <Badge variant="outline">{formatIssueType(ticket.type)}</Badge>
        },
        {
            key: 'priority',
            label: 'Priority',
            sortable: true,
            render: (ticket) => (
                <Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority?.toUpperCase()}</Badge>
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (ticket) => (
                <Badge variant={getStatusBadgeVariant(ticket.status)} className="gap-1">
                    {getStatusIcon(ticket.status)}
                    {ticket.status?.replace('-', ' ').toUpperCase()}
                </Badge>
            )
        },
        {
            key: 'createdAt',
            label: 'Created',
            sortable: true,
            render: (ticket) => (
                <div className="text-sm">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                    <div className="text-xs text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleTimeString()}
                    </div>
                </div>
            )
        }
    ];

    // Define row actions
    const getRowActions = (ticket) => [
        {
            label: 'View Details',
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: () => openTicketDialog(ticket)
        },
        {
            label: 'Delete Ticket',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => handleDeleteClick(ticket),
            disabled: deletingTicket === ticket.id,
            className: 'text-destructive'
        }
    ];

    // Custom filters for the table
    const customFilters = (
        <div className="space-y-3">
            {isFiltersExpanded && (
                <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200"> 
                    <div>
                        <Label htmlFor="status-filter">Status</Label>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => {
                                setStatusFilter(value);
                                updateFilters({ status: value });
                            }}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="priority-filter">Priority</Label>
                        <Select
                            value={priorityFilter}
                            onValueChange={(value) => {
                                setPriorityFilter(value);
                                updateFilters({ priority: value });
                            }}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="type-filter">Type</Label>
                        <Select
                            value={typeFilter}
                            onValueChange={(value) => {
                                setTypeFilter(value);
                                updateFilters({ type: value });
                            }}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="payments">Pagamentos</SelectItem>
                                <SelectItem value="orders">Encomendas</SelectItem>
                                <SelectItem value="support">Suporte & Assistência</SelectItem>
                                <SelectItem value="bug">Bug Técnico</SelectItem>
                                <SelectItem value="other">Outros assuntos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2">
                        {hasFiltersApplied() && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setStatusFilter('all');
                                    setPriorityFilter('all');
                                    setTypeFilter('all');
                                    updateFilters({ status: 'all', priority: 'all', type: 'all' });
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
        <div className="space-y-8">
            <AdminHeader title="Support Tickets" description="Manage customer support tickets and inquiries" />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                        <TicketX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All time tickets</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.open}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inProgress}</div>
                        <p className="text-xs text-muted-foreground">Being handled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.recentActivity}</div>
                        <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tickets Table */}
            <AdminTable
                data={filteredTickets}
                columns={tableColumns}
                searchable={false} // We have custom search
                customFilters={customFilters}
                emptyMessage="No tickets found"
                pagination={true}
                getRowActions={getRowActions}
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
                                            statusFilter !== 'all' && 'Status',
                                            priorityFilter !== 'all' && 'Priority',
                                            typeFilter !== 'all' && 'Type'
                                        ].filter(Boolean).length
                                    }
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            title="Refresh tickets data">
                            <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </Button>
                        <Button variant="outline" onClick={openExportDialog}>
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:block">Export CSV</span>
                        </Button>
                        <Button onClick={() => setIsCreateTicketOpen(true)}>
                            <Plus className="h-4 w-4" />
                            <span>Create Ticket</span>
                        </Button>
                    </>
                }
            />

            {/* Ticket Detail Dialog */}
            <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    {selectedTicket && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center justify-between">
                                    <span>Ticket #{selectedTicket.ticketNumber}</span>
                                </DialogTitle>
                                <DialogDescription className="space-y-2">
                                    <span className="flex items-center gap-4 text-sm">
                                        <span>
                                            <strong>User:</strong> {selectedTicket.userName} ({selectedTicket.userEmail}
                                            )
                                        </span>
                                        <span>
                                            <strong>Type:</strong> {formatIssueType(selectedTicket.type)}
                                        </span>
                                        <Badge variant={getPriorityBadgeVariant(selectedTicket.priority)}>
                                            {selectedTicket.priority?.toUpperCase()}
                                        </Badge>
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        Created: {new Date(selectedTicket.createdAt).toLocaleString()}
                                    </span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                            
                                {/* Status */}
                                <div className="flex gap-2">
                                    <Select
                                        value={selectedTicket.status}
                                        onValueChange={(value) => handleUpdateStatus(selectedTicket.id, value)}
                                        disabled={updatingTicket}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">Open</SelectItem>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                            <SelectItem value="closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Subject */}
                                <div>
                                    <h4 className="font-semibold mb-2">Subject</h4>
                                    <p>{selectedTicket.subject}</p>
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="font-semibold mb-2">Description</h4>
                                    <div className="whitespace-pre-wrap">{selectedTicket.description}</div>
                                </div>

                                {/* Order Data */}
                                {selectedTicket.orderData && (
                                    <div>
                                        <h4 className="font-semibold mb-2">Related Order</h4>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <strong>Order #:</strong>{' '}
                                                        {selectedTicket.orderData.orderNumber ||
                                                            selectedTicket.orderData.id}
                                                    </div>
                                                    <div>
                                                        <strong>Status:</strong> {selectedTicket.orderData.status}
                                                    </div>
                                                    <div>
                                                        <strong>Total:</strong> €{selectedTicket.orderData.total}
                                                    </div>
                                                    <div>
                                                        <strong>Payment:</strong>{' '}
                                                        {selectedTicket.orderData.paymentStatus}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Conversation */}
                                <div>
                                    <h4 className="font-semibold mb-4">Conversation</h4>
                                    <div className="space-y-4 max-h-60 overflow-y-auto">
                                        {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                                            selectedTicket.replies.map((reply, index) => (
                                                <div
                                                    key={reply.id || index}
                                                    className={`p-3 rounded-lg ${
                                                        reply.isAdmin
                                                            ? 'bg-blue-50 dark:bg-blue-950 ml-4'
                                                            : 'bg-gray-50 dark:bg-gray-900 mr-4'
                                                    }`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-medium text-sm">
                                                            {reply.authorName} {reply.isAdmin ? '(Admin)' : '(User)'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(reply.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm whitespace-pre-wrap">{reply.message}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-muted-foreground text-sm italic">No replies yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Reply Form */}
                                <div>
                                    <h4 className="font-semibold mb-2">Add Reply</h4>
                                    <div className="space-y-4">
                                        <Textarea
                                            value={replyMessage}
                                            onChange={(e) => setReplyMessage(e.target.value)}
                                            placeholder="Type your reply..."
                                            rows={4}
                                        />
                                        
                                        {/* Reply Notification Preferences */}
                                        <div className="border-t pt-3">
                                            <Label className="text-sm font-semibold mb-2 block">Reply Notification Preferences</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id="replyEmail"
                                                            checked={replyNotifications.sendEmail}
                                                            onCheckedChange={(checked) =>
                                                                setReplyNotifications({
                                                                    ...replyNotifications,
                                                                    sendEmail: checked
                                                                })
                                                            }
                                                            disabled={!isEmailEnabled}
                                                        />
                                                        <Label htmlFor="replyEmail" className="text-sm">
                                                            Email
                                                        </Label>
                                                    </div>
                                                    {!isEmailEnabled && (
                                                        <span className="text-xs text-muted-foreground">Disabled</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id="replySMS"
                                                            checked={replyNotifications.sendSMS}
                                                            onCheckedChange={(checked) =>
                                                                setReplyNotifications({
                                                                    ...replyNotifications,
                                                                    sendSMS: checked
                                                                })
                                                            }
                                                            disabled={!isSMSEnabled}
                                                        />
                                                        <Label htmlFor="replySMS" className="text-sm">
                                                            SMS
                                                        </Label>
                                                    </div>
                                                    {!isSMSEnabled && (
                                                        <span className="text-xs text-muted-foreground">Disabled</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handleAddReply}
                                                disabled={!replyMessage.trim() || updatingTicket}>
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                {updatingTicket ? 'Sending...' : 'Send Reply'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create New Ticket Dialog */}
            <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Create New Ticket</DialogTitle>
                        <DialogDescription>
                            Create a new support ticket on behalf of a customer
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="userEmail">Customer Email</Label>
                                <Input
                                    id="userEmail"
                                    value={createTicketForm.userEmail}
                                    onChange={(e) =>
                                        setCreateTicketForm({ ...createTicketForm, userEmail: e.target.value })
                                    }
                                    placeholder="customer@example.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="userName">Customer Name</Label>
                                <Input
                                    id="userName"
                                    value={createTicketForm.userName}
                                    onChange={(e) =>
                                        setCreateTicketForm({ ...createTicketForm, userName: e.target.value })
                                    }
                                    placeholder="Customer Name"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                value={createTicketForm.subject}
                                onChange={(e) =>
                                    setCreateTicketForm({ ...createTicketForm, subject: e.target.value })
                                }
                                placeholder="Brief description of the issue"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={createTicketForm.description}
                                onChange={(e) =>
                                    setCreateTicketForm({ ...createTicketForm, description: e.target.value })
                                }
                                placeholder="Detailed description of the issue"
                                rows={4}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={createTicketForm.type}
                                    onValueChange={(value) =>
                                        setCreateTicketForm({ ...createTicketForm, type: value })
                                    }>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General Inquiry</SelectItem>
                                        <SelectItem value="technical">Technical Support</SelectItem>
                                        <SelectItem value="billing">Billing</SelectItem>
                                        <SelectItem value="order">Order Issue</SelectItem>
                                        <SelectItem value="product">Product Question</SelectItem>
                                        <SelectItem value="complaint">Complaint</SelectItem>
                                        <SelectItem value="refund">Refund Request</SelectItem>
                                        <SelectItem value="feature">Feature Request</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={createTicketForm.priority}
                                    onValueChange={(value) =>
                                        setCreateTicketForm({ ...createTicketForm, priority: value })
                                    }>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    
                    {/* Notification Preferences */}
                    <div className="border-t pt-4">
                        <Label className="text-sm font-semibold mb-3 block">Notification Preferences</Label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="createEmail"
                                        checked={createTicketNotifications.sendEmail}
                                        onCheckedChange={(checked) =>
                                            setCreateTicketNotifications({
                                                ...createTicketNotifications,
                                                sendEmail: checked
                                            })
                                        }
                                        disabled={!isEmailEnabled}
                                    />
                                    <Label htmlFor="createEmail" className="text-sm">
                                        Send Email Notification
                                    </Label>
                                </div>
                                {!isEmailEnabled && (
                                    <span className="text-xs text-muted-foreground">Email disabled</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="createSMS"
                                        checked={createTicketNotifications.sendSMS}
                                        onCheckedChange={(checked) =>
                                            setCreateTicketNotifications({
                                                ...createTicketNotifications,
                                                sendSMS: checked
                                            })
                                        }
                                        disabled={!isSMSEnabled}
                                    />
                                    <Label htmlFor="createSMS" className="text-sm">
                                        Send SMS Notification
                                    </Label>
                                </div>
                                {!isSMSEnabled && (
                                    <span className="text-xs text-muted-foreground">SMS disabled</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateTicket} disabled={isCreatingTicket}>
                            {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Ticket"
                description={`Are you sure you want to delete ticket "${ticketToDelete?.ticketNumber || ticketToDelete?.subject || ''}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
                confirmText="Delete Ticket"
            />

            {/* CSV Export Dialog */}
            <GenerateCSV
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                title="Export Tickets to CSV"
                description="Select the ticket data fields you want to include in your CSV export"
                data={tickets}
                exportFields={csvExportFields}
                filename="tickets"
                formatRowData={formatTicketsRowData}
            />
        </div>
    );
};

export default TicketsPageClient;
