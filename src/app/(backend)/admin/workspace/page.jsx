// @/app/(backend)/admin/workspace/page.jsx - Workspace Overview with Synchronized Data

'use client';

import { ArrowRight, Briefcase, Calendar, Clock, Euro, ListTodo, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllAgenda, getAllAppointments, getAllScheduleItems, getAllTasks } from '@/lib/server/admin.js';

export default function WorkspaceOverview() {
    const [data, setData] = useState({
        appointments: [],
        agendaItems: [],
        scheduleItems: [],
        tasks: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        todayAppointments: 0,
        pendingTasks: 0,
        upcomingEvents: 0,
        totalRevenue: 0
    });

    // Fetch all workspace data
    const fetchWorkspaceData = async () => {
        try {
            setIsLoading(true);
            const [appointmentsRes, agendaRes, scheduleRes, tasksRes] = await Promise.all([
                getAllAppointments(),
                getAllAgenda(),
                getAllScheduleItems(),
                getAllTasks()
            ]);

            const newData = {
                appointments: appointmentsRes?.success ? appointmentsRes.data : [],
                agendaItems: agendaRes?.success ? agendaRes.data : [],
                scheduleItems: scheduleRes?.success ? scheduleRes.data : [],
                tasks: tasksRes?.success ? tasksRes.data : []
            };

            setData(newData);
            calculateStats(newData);
        } catch (error) {
            console.error('Error fetching workspace data:', error);
            toast.error('Failed to load workspace data');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate dashboard statistics
    const calculateStats = (workspaceData) => {
        const today = new Date().toISOString().split('T')[0];

        const todayAppointments = workspaceData.appointments.filter(
            (apt) => apt.date === today && apt.status === 'confirmed'
        ).length;

        const pendingTasks = workspaceData.tasks.filter(
            (task) => task.status === 'todo' || task.status === 'in-progress'
        ).length;

        const upcomingEvents = [...workspaceData.agendaItems, ...workspaceData.scheduleItems].filter((event) => {
            const eventDate = event.date || event.startDate;
            return eventDate && eventDate >= today;
        }).length;

        const totalRevenue = workspaceData.appointments
            .filter((apt) => apt.status === 'confirmed')
            .reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0);

        setStats({
            todayAppointments,
            pendingTasks,
            upcomingEvents,
            totalRevenue
        });
    };

    useEffect(() => {
        fetchWorkspaceData();
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchWorkspaceData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Get today's appointments
    const getTodayAppointments = () => {
        const today = new Date().toISOString().split('T')[0];
        return data.appointments
            .filter((apt) => apt.date === today)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .slice(0, 3);
    };

    // Get urgent tasks
    const getUrgentTasks = () => {
        return data.tasks
            .filter((task) => task.status !== 'completed' && (task.priority === 'high' || task.priority === 'urgent'))
            .slice(0, 3);
    };

    // Get upcoming events
    const getUpcomingEvents = () => {
        const today = new Date().toISOString().split('T')[0];
        return [...data.agendaItems, ...data.scheduleItems]
            .filter((event) => {
                const eventDate = event.date || event.startDate;
                return eventDate && eventDate >= today;
            })
            .sort((a, b) => {
                const dateA = a.date || a.startDate;
                const dateB = b.date || b.startDate;
                return dateA.localeCompare(dateB);
            })
            .slice(0, 3);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="mb-2 h-8 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-80" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="font-bold text-3xl">Workspace Overview</h1>
                <p className="text-muted-foreground">
                    Your synchronized workspace dashboard with appointments, tasks, and schedule
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">Today's Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">{stats.todayAppointments}</div>
                        <p className="text-muted-foreground text-xs">Confirmed appointments for today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">Pending Tasks</CardTitle>
                        <ListTodo className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">{stats.pendingTasks}</div>
                        <p className="text-muted-foreground text-xs">Tasks awaiting completion</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">Upcoming Events</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">{stats.upcomingEvents}</div>
                        <p className="text-muted-foreground text-xs">Scheduled events and meetings</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="font-medium text-sm">Revenue</CardTitle>
                        <Euro className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-2xl">€{stats.totalRevenue.toFixed(2)}</div>
                        <p className="text-muted-foreground text-xs">From confirmed appointments</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Access Sections */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Today's Appointments */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Today's Appointments</CardTitle>
                            <CardDescription>Your scheduled appointments for today</CardDescription>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/workspace/agenda">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {getTodayAppointments().length === 0 ? (
                            <div className="py-4 text-center text-muted-foreground">
                                No appointments scheduled for today
                            </div>
                        ) : (
                            getTodayAppointments().map((appointment) => (
                                <div
                                    key={appointment.id}
                                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{appointment.serviceName}</h4>
                                            <Badge variant={appointment.status === 'confirmed' ? 'default' : 'outline'}>
                                                {appointment.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-muted-foreground text-sm">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {appointment.customerName}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {appointment.startTime} - {appointment.endTime}
                                            </div>
                                            <div className="flex items-center gap-1 text-green-600">
                                                <Euro className="h-3 w-3" />
                                                {appointment.price}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Urgent Tasks */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Urgent Tasks</CardTitle>
                            <CardDescription>High priority tasks requiring attention</CardDescription>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/workspace/tasks">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {getUrgentTasks().length === 0 ? (
                            <div className="py-4 text-center text-muted-foreground">No urgent tasks at the moment</div>
                        ) : (
                            getUrgentTasks().map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{task.title}</h4>
                                            {task.type === 'appointment_prep' && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Calendar className="mr-1 h-3 w-3" />
                                                    Appointment
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-muted-foreground text-sm">
                                            <Badge variant="secondary" className="text-xs">
                                                {task.priority}
                                            </Badge>
                                            {task.dueDate && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Due {new Date(task.dueDate).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Upcoming Events */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Upcoming Events</CardTitle>
                        <CardDescription>Your scheduled events and meetings</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin/workspace/schedule">
                            View Schedule <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {getUpcomingEvents().length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">No upcoming events scheduled</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {getUpcomingEvents().map((event) => (
                                <div key={event.id} className="space-y-2 rounded-lg bg-muted/50 p-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">{event.title}</h4>
                                        <Badge variant="outline" className="text-xs">
                                            {event.type || 'event'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(event.date || event.startDate).toLocaleDateString()}
                                    </div>
                                    {event.location && (
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                            <MapPin className="h-3 w-3" />
                                            {event.location}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common workspace management actions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Button asChild variant="outline" className="h-20 flex-col">
                            <Link href="/admin/workspace/agenda">
                                <Calendar className="mb-2 h-6 w-6" />
                                Manage Agenda
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-20 flex-col">
                            <Link href="/admin/workspace/schedule">
                                <Clock className="mb-2 h-6 w-6" />
                                View Schedule
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-20 flex-col">
                            <Link href="/admin/workspace/tasks">
                                <ListTodo className="mb-2 h-6 w-6" />
                                Task Board
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-20 flex-col">
                            <Link href="/admin/store/orders">
                                <Briefcase className="mb-2 h-6 w-6" />
                                Orders
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
