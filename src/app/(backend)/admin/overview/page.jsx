// @/app/(backend)/admin/overview/page.jsx

'use client';

import {
    Activity,
    AlertCircle,
    ArrowRight,
    Clock,
    Database,
    DollarSign,
    Eye,
    FileText,
    Package,
    Plus,
    Settings,
    ShoppingCart,
    TrendingDown,
    TrendingUp,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardStats } from '@/lib/server/admin';

// Enhanced Dashboard Card Component
const StatCard = ({ label, value, icon: Icon, description, trend, loading = false, className = '' }) => {
    if (loading) {
        return (
            <Card className={`p-6 ${className}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="font-medium text-sm">
                        <Skeleton className="h-4 w-20" />
                    </CardTitle>
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`p-6 ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="font-medium text-sm">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="mb-2 font-bold text-2xl">{value}</div>
                <div className="flex w-full flex-col items-start gap-2 text-muted-foreground text-xs">
                    {trend && (
                        <div
                            className={`flex items-center gap-1 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>{trend.value}%</span>
                        </div>
                    )}
                    <span>{description}</span>
                </div>
            </CardContent>
        </Card>
    );
};

// Quick Action Card Component
const QuickActionCard = ({ title, description, icon: Icon, href, color = 'default' }) => {
    const colorClasses = {
        default: 'hover:bg-muted/50',
        primary: 'hover:bg-primary/5 border-primary/20',
        success: 'hover:bg-green-50 border-green-200',
        warning: 'hover:bg-yellow-50 border-yellow-200',
        danger: 'hover:bg-red-50 border-red-200'
    };

    return (
        <Link href={href}>
            <Card className={`cursor-pointer p-4 transition-colors ${colorClasses[color]}`}>
                <CardContent className="flex items-center justify-between p-0">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-muted p-2">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-medium">{title}</div>
                            <div className="text-muted-foreground text-sm">{description}</div>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
            </Card>
        </Link>
    );
};

// Recent Activity Item Component
const ActivityItem = ({ type, title, description, timestamp, loading = false }) => {
    if (loading) {
        return (
            <div className="flex items-center gap-3 border-muted-foreground border-b border-border p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-16" />
            </div>
        );
    }

    const getActivityIcon = (type) => {
        switch (type) {
            case 'user':
                return <Users className="h-4 w-4" />;
            case 'order':
                return <ShoppingCart className="h-4 w-4" />;
            case 'product':
                return <Package className="h-4 w-4" />;
            case 'system':
                return <Settings className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    return (
        <div className="flex items-center gap-3 border-muted-foreground border-b border-border p-3 last:border-0">
            <div className="rounded-full bg-muted p-2">{getActivityIcon(type)}</div>
            <div className="flex-1">
                <div className="font-medium text-sm">{title}</div>
                <div className="text-muted-foreground text-xs">{description}</div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Clock className="h-3 w-3" />
                {timestamp}
            </div>
        </div>
    );
};

export default function Overview() {
    const t = useTranslations('Admin.Overview');
    
    const [stats, setStats] = useState({
        users: 0,
        orders: 0,
        products: 0,
        revenue: 0,
        categories: 0,
        collections: 0
    });

    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Direct server function call - no HTTP request!
                const result = await getDashboardStats({ duration: '15M' });

                if (result.success && result.data) {
                    const { counts, revenue, recentActivity } = result.data;

                    // Set statistics
                    setStats({
                        users: counts.users || 0,
                        orders: counts.orders || 0,
                        products: counts.products || 0,
                        revenue: revenue || 0,
                        categories: counts.categories || 0,
                        collections: counts.collections || 0
                    });

                    // Generate activity feed from recent data
                    const activities = [];

                    // Recent users
                    if (recentActivity.users) {
                        recentActivity.users.forEach((user) => {
                            activities.push({
                                type: 'user',
                                title: 'New User Registration',
                                description: `${user.name} joined`,
                                timestamp: formatTimeAgo(user.createdAt),
                                createdAt: user.createdAt
                            });
                        });
                    }

                    // Recent orders
                    if (recentActivity.orders) {
                        recentActivity.orders.forEach((order) => {
                            activities.push({
                                type: 'order',
                                title: 'New Order',
                                description: `Order #${order.id?.substring(0, 8)} - $${order.total || '0.00'}`,
                                timestamp: formatTimeAgo(order.createdAt),
                                createdAt: order.createdAt
                            });
                        });
                    }

                    // Recent products
                    if (recentActivity.products) {
                        recentActivity.products.forEach((product) => {
                            activities.push({
                                type: 'product',
                                title: 'Product Added',
                                description: `${product.name || 'New Product'} added to catalog`,
                                timestamp: formatTimeAgo(product.createdAt),
                                createdAt: product.createdAt
                            });
                        });
                    }

                    // Sort activities by timestamp (most recent first)
                    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    setRecentActivity(activities.slice(0, 8));
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Helper function to format time ago
    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-4">
            {/* Header Section */}

            <AdminHeader
                title={t('title')}
                description={t('description')}>
                <Link href="/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        {t('viewSite')}
                    </Button>
                </Link>
            </AdminHeader>

            {/* Main Statistics Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label={t('stats.customers.label')}
                    value={stats.users.toLocaleString()}
                    icon={Users}
                    description={t('stats.customers.description')}
                    loading={loading}
                />
                <StatCard
                    label={t('stats.orders.label')}
                    value={stats.orders.toLocaleString()}
                    icon={ShoppingCart}
                    description={t('stats.orders.description')}
                    loading={loading}
                />
                <StatCard
                    label={t('stats.catalog.label')}
                    value={stats.products.toLocaleString()}
                    icon={Package}
                    description={t('stats.catalog.description')}
                    loading={loading}
                />
                <StatCard
                    label={t('stats.revenue.label')}
                    value={`$${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    description={t('stats.revenue.description')}
                    loading={loading}
                />
            </div>

            {/* Secondary Statistics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-2xl">
                                {loading ? <Skeleton className="h-6 w-8" /> : stats.categories}
                            </div>
                            <div className="text-muted-foreground text-sm">{t('stats.categories')}</div>
                        </div>
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-2xl">
                                {loading ? <Skeleton className="h-6 w-8" /> : stats.collections}
                            </div>
                            <div className="text-muted-foreground text-sm">{t('stats.collections')}</div>
                        </div>
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-2xl">
                                {loading ? <Skeleton className="h-6 w-8" /> : '98.5%'}
                            </div>
                            <div className="text-muted-foreground text-sm">{t('stats.uptime')}</div>
                        </div>
                        <Activity className="h-8 w-8 text-green-600" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-2xl">
                                {loading ? <Skeleton className="h-6 w-8" /> : '2.1s'}
                            </div>
                            <div className="text-muted-foreground text-sm">{t('stats.loadTime')}</div>
                        </div>
                        <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                </Card>
            </div>

            {/* Quick Actions and Recent Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            {t('quickActions.title')}
                        </CardTitle>
                        <CardDescription>{t('quickActions.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <QuickActionCard
                                title={t('quickActions.manageCatalog.title')}
                                description={t('quickActions.manageCatalog.description')}
                                icon={Package}
                                href="/admin/store/catalog"
                                color="default"
                            />
                            <QuickActionCard
                                title={t('quickActions.manageUsers.title')}
                                description={t('quickActions.manageUsers.description')}
                                icon={Users}
                                href="/admin/store/customers"
                                color="default"
                            />
                            <QuickActionCard
                                title={t('quickActions.viewOrders.title')}
                                description={t('quickActions.viewOrders.description')}
                                icon={ShoppingCart}
                                href="/admin/store/orders"
                                color="default"
                            />
                            <QuickActionCard
                                title={t('quickActions.siteSettings.title')}
                                description={t('quickActions.siteSettings.description')}
                                icon={Settings}
                                href="/admin/system/settings"
                                color="default"
                            />
                            <QuickActionCard
                                title={t('quickActions.systemMaintenance.title')}
                                description={t('quickActions.systemMaintenance.description')}
                                icon={Database}
                                href="/admin/system/maintenance"
                                color="default"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            {t('recentActivity.title')}
                        </CardTitle>
                        <CardDescription>{t('recentActivity.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <ActivityItem key={i} loading={true} />
                                ))}
                            </div>
                        ) : recentActivity.length > 0 ? (
                            <div>
                                {recentActivity.map((activity, index) => (
                                    <ActivityItem
                                        key={index}
                                        type={activity.type}
                                        title={activity.title}
                                        description={activity.description}
                                        timestamp={activity.timestamp}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-muted-foreground">
                                <AlertCircle className="mx-auto mb-4 h-12 w-12" />
                                <p>{t('recentActivity.noActivity')}</p>
                                <p className="mt-2 text-sm">{t('recentActivity.noActivityHint')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* System Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {t('systemStatus.title')}
                    </CardTitle>
                    <CardDescription>{t('systemStatus.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            <div>
                                <div className="font-medium">{t('systemStatus.database.title')}</div>
                                <div className="text-muted-foreground text-sm">{t('systemStatus.database.operational')}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border p-3">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            <div>
                                <div className="font-medium">{t('systemStatus.api.title')}</div>
                                <div className="text-muted-foreground text-sm">{t('systemStatus.api.responding')}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border p-3">
                            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                            <div>
                                <div className="font-medium">{t('systemStatus.cache.title')}</div>
                                <div className="text-muted-foreground text-sm">
                                    {loading ? <Skeleton className="h-4 w-20" /> : t('systemStatus.cache.optimizationRecommended')}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
