// @/app/(backend)/admin/workspace/tasks/page.jsx

'use client';

import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Edit,
    Eye,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    User,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { createTask, deleteTask, getAllAppointments, getAllTasks, updateTask } from '@/lib/server/admin.js';

export default function TasksPage() {
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assignedTo: '',
        dueDate: '',
        tags: []
    });

    // Fetch tasks and related workspace data
    const fetchTasks = async () => {
        try {
            setIsLoading(true);

            let allTasks = [];

            // Fetch tasks using admin function
            try {
                const tasksResponse = await getAllTasks();
                if (tasksResponse?.success && Array.isArray(tasksResponse.data)) {
                    allTasks = [...allTasks, ...tasksResponse.data];
                }
            } catch (err) {
                console.warn('Failed to load tasks:', err.message);
            }

            // Fetch appointments to create tasks with better error handling
            try {
                const appointmentsResponse = await getAllAppointments();

                let appointmentsData = [];
                if (appointmentsResponse?.success && Array.isArray(appointmentsResponse.data)) {
                    appointmentsData = appointmentsResponse.data;
                } else if (Array.isArray(appointmentsResponse)) {
                    appointmentsData = appointmentsResponse;
                }

                if (appointmentsData.length > 0) {
                    const appointmentTasks = appointmentsData
                        .filter(
                            (apt) =>
                                apt.status === 'confirmed' || apt.status === 'scheduled' || apt.status === 'pending'
                        )
                        .map((apt) => ({
                            id: `apt_task_${apt.id}`,
                            title: `Prepare for ${apt.serviceName || 'Service'}`,
                            description: `Customer appointment with ${apt.customerName || 'Customer'} on ${apt.date || 'TBD'} at ${apt.startTime || 'TBD'}`,
                            status: 'pending',
                            priority: 'medium',
                            dueDate: apt.date,
                            type: 'appointment_prep',
                            appointmentId: apt.id,
                            assignedTo: 'System Generated',
                            createdAt: new Date().toISOString(),
                            linkedAppointment: apt
                        }));

                    // Filter out duplicates
                    const existingAppointmentTaskIds = allTasks
                        .filter((task) => task.appointmentId)
                        .map((task) => task.appointmentId);

                    const newAppointmentTasks = appointmentTasks.filter(
                        (task) => !existingAppointmentTaskIds.includes(task.appointmentId)
                    );

                    allTasks = [...allTasks, ...newAppointmentTasks];
                }
            } catch (err) {
                console.warn('Failed to load appointments for task generation:', err.message);
            }

            setTasks(allTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            // Don't show error toast for optional workspace data
            setTasks([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreateTask = () => {
        setFormData({
            title: '',
            description: '',
            status: 'pending',
            priority: 'medium',
            assignedTo: '',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            tags: []
        });
        setSelectedTask(null);
        setIsCreateDialogOpen(true);
    };

    const handleEditTask = (task) => {
        setFormData({
            title: task.title || '',
            description: task.description || '',
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            assignedTo: task.assignedTo || task.assignee || '',
            dueDate: task.dueDate || '',
            tags: task.tags || []
        });
        setSelectedTask(task);
        setIsEditDialogOpen(true);
    };

    const handleViewTask = (task) => {
        setSelectedTask(task);
        setIsViewDialogOpen(true);
    };

    const handleDeleteTask = (task) => {
        setSelectedTask(task);
        setIsDeleteDialogOpen(true);
    };

    const handleSubmitTask = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const taskData = {
                ...formData,
                createdAt: selectedTask ? selectedTask.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (selectedTask) {
                const result = await updateTask(selectedTask.id, taskData);
                if (result.success) {
                    toast.success('Task updated successfully');
                    setIsEditDialogOpen(false);
                } else {
                    throw new Error(result.error || 'Failed to update task');
                }
            } else {
                const result = await createTask(taskData);
                if (result.success) {
                    toast.success('Task created successfully');
                    setIsCreateDialogOpen(false);
                } else {
                    throw new Error(result.error || 'Failed to create task');
                }
            }

            fetchTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            toast.error('Failed to save task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedTask) return;

        setIsDeleting(true);
        try {
            const result = await deleteTask(selectedTask.id);
            if (result.success) {
                toast.success('Task deleted successfully');
                setIsDeleteDialogOpen(false);
                setSelectedTask(null);
                fetchTasks();
            } else {
                throw new Error(result.error || 'Failed to delete task');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Failed to delete task');
        } finally {
            setIsDeleting(false);
        }
    };

    const statusConfig = {
        pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
        'in-progress': { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
        completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };

    const priorityConfig = {
        low: 'bg-gray-100 text-gray-800',
        medium: 'bg-orange-100 text-orange-800',
        high: 'bg-red-100 text-red-800'
    };

    const filteredTasks = tasks.filter((task) => {
        // Status filter
        const statusMatch = selectedStatus === 'all' || task.status === selectedStatus;

        // Priority filter
        const priorityMatch = selectedPriority === 'all' || task.priority === selectedPriority;

        // Search filter
        const searchMatch =
            !searchQuery ||
            task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase());

        return statusMatch && priorityMatch && searchMatch;
    });

    const taskCounts = {
        all: tasks.length,
        pending: tasks.filter((t) => t.status === 'pending').length,
        'in-progress': tasks.filter((t) => t.status === 'in-progress').length,
        completed: tasks.filter((t) => t.status === 'completed').length
    };

    const _priorityCounts = {
        all: tasks.length,
        low: tasks.filter((t) => t.priority === 'low').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
        high: tasks.filter((t) => t.priority === 'high').length
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="mb-2 h-8 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-10 w-24" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-64" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-3xl">Task Board</h1>
                    <p className="text-muted-foreground">Manage and track project tasks and assignments</p>
                </div>
                <Button className="flex items-center gap-2" onClick={handleCreateTask}>
                    <Plus className="h-4 w-4" />
                    New Task
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="relative max-w-md flex-1">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
                    <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2">
                {Object.entries(taskCounts).map(([status, count]) => (
                    <Button
                        key={status}
                        variant={selectedStatus === status ? 'default' : 'outline'}
                        onClick={() => setSelectedStatus(status)}
                        className="flex items-center gap-2">
                        {status.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        <Badge variant="secondary">{count}</Badge>
                    </Button>
                ))}
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTasks.map((task) => {
                    const StatusIcon = statusConfig[task.status]?.icon || Clock;

                    return (
                        <Card
                            key={task.id || `task-${task.title}-${task.createdAt}`}
                            className="transition-shadow hover:shadow-md">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{task.title || 'Untitled Task'}</CardTitle>
                                        {task.type === 'appointment_prep' && (
                                            <Badge variant="outline" className="text-xs">
                                                <Calendar className="mr-1 h-3 w-3" />
                                                Appointment
                                            </Badge>
                                        )}
                                    </div>
                                    <Badge className={priorityConfig[task.priority] || priorityConfig.medium}>
                                        {task.priority || 'medium'}
                                    </Badge>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {task.description || 'No description provided'}
                                </CardDescription>

                                {/* Appointment details for appointment tasks */}
                                {task.linkedAppointment && (
                                    <div className="mt-2 rounded bg-blue-50 p-2 text-xs dark:bg-blue-950/20">
                                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                            <Users className="h-3 w-3" />
                                            <span>{task.linkedAppointment.customerName}</span>
                                            <span>•</span>
                                            <span>
                                                {task.linkedAppointment.date} at {task.linkedAppointment.startTime}
                                            </span>
                                            <span>•</span>
                                            <span className="font-medium">€{task.linkedAppointment.price}</span>
                                        </div>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Status and Assignee */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <StatusIcon className="h-4 w-4" />
                                        <Badge
                                            className={statusConfig[task.status]?.color || statusConfig.pending.color}>
                                            {(task.status || 'pending').replace('-', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                        <User className="h-3 w-3" />
                                        {task.assignedTo || task.assignee || 'Unassigned'}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1">
                                    {(task.tags || []).map((tag, index) => (
                                        <Badge
                                            key={`${task.id}-tag-${tag}-${index}`}
                                            variant="outline"
                                            className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>

                                {/* Due Date */}
                                <div className="text-muted-foreground text-sm">
                                    Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    {/* Mobile view - show individual buttons */}
                                    <div className="flex w-full gap-2 sm:hidden">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleViewTask(task)}>
                                            <Eye className="mr-1 h-3 w-3" />
                                            View
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleEditTask(task)}>
                                            <Edit className="mr-1 h-3 w-3" />
                                            Edit
                                        </Button>
                                    </div>

                                    {/* Desktop view - show dropdown menu */}
                                    <div className="hidden w-full sm:block">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="w-full">
                                                    <MoreHorizontal className="mr-2 h-4 w-4" />
                                                    Actions
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px]">
                                                <DropdownMenuItem onClick={() => handleViewTask(task)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit Task
                                                </DropdownMenuItem>
                                                {!task.appointmentId && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteTask(task)}
                                                        className="text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Task
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredTasks.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                        <h3 className="mb-2 font-medium text-lg">No tasks found</h3>
                        <p className="mb-4 text-muted-foreground">
                            {selectedStatus === 'all'
                                ? 'Get started by creating your first task'
                                : `No ${selectedStatus.replace('-', ' ')} tasks at the moment`}
                        </p>
                        <Button onClick={handleCreateTask}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Task
                        </Button>
                    </CardContent>
                </Card>
            )}
            {/* Create Task Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                            Add a new task to your task board and assign it to team members.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitTask} className="space-y-6">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Task Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter task title"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe the task details..."
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({ ...prev, priority: value }))
                                        }>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="assignedTo">Assigned To</Label>
                                    <Input
                                        id="assignedTo"
                                        value={formData.assignedTo}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))
                                        }
                                        placeholder="Enter assignee name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dueDate">Due Date</Label>
                                    <Input
                                        id="dueDate"
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create Task'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                        <DialogDescription>Update the task details and settings.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitTask} className="space-y-6">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-title">Task Title *</Label>
                                <Input
                                    id="edit-title"
                                    value={formData.title}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter task title"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    value={formData.description}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe the task details..."
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-status">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-priority">Priority</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({ ...prev, priority: value }))
                                        }>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-assignedTo">Assigned To</Label>
                                    <Input
                                        id="edit-assignedTo"
                                        value={formData.assignedTo}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))
                                        }
                                        placeholder="Enter assignee name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-dueDate">Due Date</Label>
                                    <Input
                                        id="edit-dueDate"
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Updating...' : 'Update Task'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Task Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Task Details</DialogTitle>
                        <DialogDescription>View complete task information and details.</DialogDescription>
                    </DialogHeader>
                    {selectedTask && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">Title</Label>
                                    <p className="font-semibold text-lg">{selectedTask.title}</p>
                                </div>
                                <div>
                                    <Label className="font-medium text-muted-foreground text-sm">Description</Label>
                                    <p className="text-sm">{selectedTask.description || 'No description provided'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">Status</Label>
                                        <div className="mt-1">
                                            <Badge
                                                className={
                                                    statusConfig[selectedTask.status]?.color ||
                                                    statusConfig.pending.color
                                                }>
                                                {(selectedTask.status || 'pending').replace('-', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">Priority</Label>
                                        <div className="mt-1">
                                            <Badge
                                                className={
                                                    priorityConfig[selectedTask.priority] || priorityConfig.medium
                                                }>
                                                {selectedTask.priority || 'medium'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">Assigned To</Label>
                                        <p className="text-sm">
                                            {selectedTask.assignedTo || selectedTask.assignee || 'Unassigned'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">Due Date</Label>
                                        <p className="text-sm">
                                            {selectedTask.dueDate
                                                ? new Date(selectedTask.dueDate).toLocaleDateString()
                                                : 'No due date'}
                                        </p>
                                    </div>
                                </div>
                                {selectedTask.linkedAppointment && (
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">
                                            Linked Appointment
                                        </Label>
                                        <div className="mt-1 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                                            <p className="font-medium text-sm">
                                                {selectedTask.linkedAppointment.serviceName}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {selectedTask.linkedAppointment.customerName} •{' '}
                                                {selectedTask.linkedAppointment.date} at{' '}
                                                {selectedTask.linkedAppointment.startTime}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 text-muted-foreground text-xs">
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">Created</Label>
                                        <p>
                                            {selectedTask.createdAt
                                                ? new Date(selectedTask.createdAt).toLocaleDateString()
                                                : 'Unknown'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-medium text-muted-foreground text-sm">Updated</Label>
                                        <p>
                                            {selectedTask.updatedAt
                                                ? new Date(selectedTask.updatedAt).toLocaleDateString()
                                                : 'Never'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsViewDialogOpen(false);
                                        handleEditTask(selectedTask);
                                    }}>
                                    Edit Task
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDeleting ? 'Deleting...' : 'Delete Task'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
