// @/app/(backend)/admin/analytics/page.jsx

'use client';

import {
    BarChart3,
    Calendar as CalendarIcon,
    DollarSign,
    Eye,
    LineChart as LineChartIcon,
    Mail,
    MessageSquare,
    PieChart as PieChartIcon,
    RefreshCw,
    ShoppingCart,
    Trash2,
    TrendingDown,
    TrendingUp,
    UserPlus,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    RadialBar,
    RadialBarChart,
    XAxis,
    YAxis
} from 'recharts';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getAllSubscribers } from '@/lib/server/newsletter';
import { getAllOrders } from '@/lib/server/orders';
import { getAllUsers } from '@/lib/server/users';
import { clearWebStats, getCampaignStats, getWebStats } from '@/lib/server/web-stats';

const StatCard = ({ title, value, icon: Icon, trend, description }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="font-bold text-2xl">{value}</div>
            {description && <p className="text-muted-foreground text-xs">{description}</p>}
            {trend !== undefined && (
                <p className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trend > 0 ? '+' : ''}
                    {trend}% from last period
                </p>
            )}
        </CardContent>
    </Card>
);

export default function AnalyticsPage() {
    const t = useTranslations('Admin.Analytics');
    const [webStatsLoading, setWebStatsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Chart type toggles
    const [visitorChartType, setVisitorChartType] = useState('area'); // area, line, bar
    const [revenueChartType, setRevenueChartType] = useState('line'); // area, line, bar
    const [countryChartType, setCountryChartType] = useState('pie'); // pie, bar, radial
    const [browserChartType, setBrowserChartType] = useState('bar'); // bar, pie, radial
    const [deviceChartType, setDeviceChartType] = useState('pie'); // pie, bar, radial

    // Time period selection
    const [selectedTimePeriod, setSelectedTimePeriod] = useState('last30days');

    // Time period options
    const timePeriodOptions = [
        { value: 'last7days', label: t('timePeriods.last7days'), days: 7 },
        { value: 'lastweek', label: t('timePeriods.lastweek'), days: 7 },
        { value: 'last30days', label: t('timePeriods.last30days'), days: 30 },
        { value: 'lastmonth', label: t('timePeriods.lastmonth'), days: 30 },
        { value: 'last3months', label: t('timePeriods.last3months'), days: 90 },
        { value: 'last6months', label: t('timePeriods.last6months'), days: 180 },
        { value: 'lastyear', label: t('timePeriods.lastyear'), days: 365 }
    ];

    // Calculate date range based on selected period
    const getDateRangeForPeriod = (periodValue) => {
        const endDate = new Date();
        const startDate = new Date();

        switch (periodValue) {
            case 'last7days':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'lastweek': {
                const dayOfWeek = startDate.getDay();
                startDate.setDate(startDate.getDate() - dayOfWeek - 7);
                endDate.setDate(endDate.getDate() - dayOfWeek);
                break;
            }
            case 'last30days':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case 'lastmonth':
                startDate.setMonth(startDate.getMonth() - 1, 1);
                endDate.setMonth(endDate.getMonth(), 0);
                break;
            case 'last3months':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case 'last6months':
                startDate.setMonth(startDate.getMonth() - 6);
                break;
            case 'lastyear':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }

        return {
            startDate: startDate,
            endDate: endDate
        };
    };

    // Calculate initial date range
    const getLast30Days = () => getDateRangeForPeriod('last30days');

    // Get current period label
    const getCurrentPeriodLabel = () => {
        const option = timePeriodOptions.find((opt) => opt.value === selectedTimePeriod);
        return option ? option.label : t('timePeriods.last30days');
    };

    // Web Stats Data
    const [webStats, setWebStats] = useState({
        uniqueVisitors: 0,
        pageViews: 0
    });
    const [visitorData, setVisitorData] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [countryData, setCountryData] = useState([]);
    const [browserData, setBrowserData] = useState([]);
    const [deviceData, setDeviceData] = useState([]);
    const [topPages, setTopPages] = useState([]);
    const [hourlyStats, setHourlyStats] = useState([]);

    // Campaign Stats Data
    const [campaignStats, setCampaignStats] = useState({
        emailSent: 0,
        smsSent: 0,
        openRate: 0,
        clickRate: 0
    });

    // Orders Stats Data
    const [orderStats, setOrderStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0
    });

    // Users Stats Data
    const [userStats, setUserStats] = useState({
        totalUsers: 0,
        newUsers: 0
    });

    // Newsletter Stats Data
    const [newsletterStats, setNewsletterStats] = useState({
        totalSubscribers: 0,
        activeSubscribers: 0
    });

    // Date Range Filter State
    const [dateRange, setDateRange] = useState(getLast30Days());
    const [isFilterActive, setIsFilterActive] = useState(true);
    const [showDatePopover, setShowDatePopover] = useState(false);

    // Clear Analytics State
    const [showClearSection, setShowClearSection] = useState(false);
    const [clearOption, setClearOption] = useState('all');
    const [clearDateRange, setClearDateRange] = useState({
        startDate: undefined,
        endDate: undefined
    });
    const [isClearing, setIsClearing] = useState(false);

    const fetchWebStats = async (forceRefresh = false, filterParams = {}) => {
        try {
            setWebStatsLoading(true);

            // Build params with force refresh (duration: '0' = no cache)
            const params = forceRefresh ? { duration: '0' } : {};

            // Add date range filter if active
            if (filterParams.startDate || filterParams.endDate) {
                params.startDate =
                    filterParams.startDate instanceof Date
                        ? filterParams.startDate.toISOString().split('T')[0]
                        : filterParams.startDate;
                params.endDate =
                    filterParams.endDate instanceof Date
                        ? filterParams.endDate.toISOString().split('T')[0]
                        : filterParams.endDate;
            } else if (isFilterActive && (dateRange.startDate || dateRange.endDate)) {
                params.startDate =
                    dateRange.startDate instanceof Date
                        ? dateRange.startDate.toISOString().split('T')[0]
                        : dateRange.startDate;
                params.endDate =
                    dateRange.endDate instanceof Date
                        ? dateRange.endDate.toISOString().split('T')[0]
                        : dateRange.endDate;
            }

            // Fetch all analytics data in parallel
            const [webStatsResult, campaignStatsResult, ordersResult, usersResult, subscribersResult] =
                await Promise.all([
                    getWebStats(params),
                    getCampaignStats(null, params),
                    getAllOrders({ limit: 0, ...params }),
                    getAllUsers({ limit: 0, ...params }),
                    getAllSubscribers(1, 0, params)
                ]);

            // Process Web Stats
            if (webStatsResult.success && webStatsResult.data) {
                const data = webStatsResult.data;
                setWebStats({
                    uniqueVisitors: data.overview.uniqueVisitors,
                    pageViews: data.overview.pageViews
                });
                setVisitorData(data.daily || []);
                setCountryData(data.countries || []);
                setBrowserData(data.browsers || []);
                setDeviceData(data.devices || []);
                setTopPages(data.pages || []);
                setHourlyStats(data.hourly || []);
            }

            // Process Campaign Stats
            if (campaignStatsResult.success && campaignStatsResult.data) {
                const data = campaignStatsResult.data;
                setCampaignStats({
                    emailSent: data.overview.sent || 0,
                    smsSent: data.byType?.sms?.sent || 0,
                    openRate: data.overview.openRate || 0,
                    clickRate: data.overview.clickRate || 0
                });
            }

            // Process Orders Stats
            if (ordersResult.success && ordersResult.data) {
                const orders = ordersResult.data;
                const totalOrders = orders.length;
                const pendingOrders = orders.filter((o) => o.status === 'pending').length;
                const completedOrders = orders.filter((o) => o.status === 'complete').length;
                const totalRevenue = orders
                    .filter((o) => o.paymentStatus === 'paid')
                    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

                setOrderStats({
                    totalOrders,
                    pendingOrders,
                    completedOrders,
                    totalRevenue
                });

                // Process daily revenue data for chart
                const revenueByDate = {};
                orders
                    .filter((o) => o.paymentStatus === 'paid')
                    .forEach((order) => {
                        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
                        if (!revenueByDate[orderDate]) {
                            revenueByDate[orderDate] = 0;
                        }
                        revenueByDate[orderDate] += parseFloat(order.total) || 0;
                    });

                // Convert to chart format and fill missing dates with 0
                const dailyRevenue = [];
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);

                for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    dailyRevenue.push({
                        date: dateStr,
                        revenue: revenueByDate[dateStr] || 0
                    });
                }

                setRevenueData(dailyRevenue);
            }

            // Process Users Stats
            if (usersResult.success && usersResult.data) {
                const users = usersResult.data;
                const totalUsers = users.length;

                // For new users, count all users in the result since server-side filtering is applied
                const newUsers = totalUsers;

                setUserStats({
                    totalUsers,
                    newUsers
                });
            }

            // Process Newsletter Stats
            if (subscribersResult.success && subscribersResult.data) {
                const subscribers = subscribersResult.data;
                const totalSubscribers = subscribers.length;
                const activeSubscribers = subscribers.filter((s) => s.status === 'active').length;

                setNewsletterStats({
                    totalSubscribers,
                    activeSubscribers
                });
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast.error(t('toasts.fetchError'));

            // Set empty data on error
            setWebStats({ uniqueVisitors: 0, pageViews: 0 });
            setVisitorData([]);
            setRevenueData([]);
            setCountryData([]);
            setBrowserData([]);
            setDeviceData([]);
            setTopPages([]);
            setHourlyStats([]);
            setCampaignStats({ emailSent: 0, smsSent: 0, openRate: 0, clickRate: 0 });
            setOrderStats({ totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalRevenue: 0 });
            setUserStats({ totalUsers: 0, newUsers: 0 });
            setNewsletterStats({ totalSubscribers: 0, activeSubscribers: 0 });
        } finally {
            setWebStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchWebStats();
    }, []);

    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    const refreshData = () => {
        fetchWebStats(true);
    };

    const handleApplyFilter = () => {
        setIsFilterActive(true);
        setShowDatePopover(false);
        fetchWebStats(false, dateRange);
        toast.success(t('toasts.filterApplied'));
    };

    const handleClearFilter = () => {
        setDateRange({ startDate: undefined, endDate: undefined });
        setSelectedTimePeriod('last30days'); // Reset to default
        setIsFilterActive(false);
        setShowDatePopover(false);
        fetchWebStats();
        toast.success(t('toasts.filterCleared'));
    };

    const handleSetTimePeriod = (periodValue) => {
        const dateRangeForPeriod = getDateRangeForPeriod(periodValue);
        const selectedOption = timePeriodOptions.find((opt) => opt.value === periodValue);

        setSelectedTimePeriod(periodValue);
        setDateRange(dateRangeForPeriod);
        setIsFilterActive(true);
        setShowDatePopover(false);
        fetchWebStats(false, dateRangeForPeriod);
        toast.success(
            t('toasts.showingPeriod', {
                period: selectedOption?.label.toLowerCase() || t('common.selectedPeriod')
            })
        );
    };

    // Handle clear metrics
    const handleClearMetrics = async () => {
        if (isClearing) return;

        // Validate inputs
        if (clearOption === 'range' && (!clearDateRange.startDate || !clearDateRange.endDate)) {
            toast.error(t('toasts.selectDateRange'));
            return;
        }

        // Confirm action
        const confirmMessage =
            clearOption === 'all'
                ? t('confirm.clearAll')
                : t('confirm.clearRange', {
                      start: clearDateRange.startDate?.toLocaleDateString(),
                      end: clearDateRange.endDate?.toLocaleDateString()
                  });

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsClearing(true);

        try {
            const params =
                clearOption === 'all'
                    ? { clearAll: true }
                    : {
                          startDate: clearDateRange.startDate?.toISOString().split('T')[0],
                          endDate: clearDateRange.endDate?.toISOString().split('T')[0]
                      };

            const result = await clearWebStats(params);

            if (result.success) {
                toast.success(result.message || t('toasts.clearSuccess'));

                // Reset clear section
                setShowClearSection(false);
                setClearOption('all');
                setClearDateRange({ startDate: undefined, endDate: undefined });

                // Refresh analytics data
                fetchWebStats(true);
            } else {
                toast.error(result.error || t('toasts.clearError'));
            }
        } catch (error) {
            console.error('Error clearing analytics:', error);
            toast.error(t('toasts.clearError'));
        } finally {
            setIsClearing(false);
        }
    };

    // Render chart based on type selection
    const renderVisitorChart = () => {
        const config = {
            visitors: {
                label: t('charts.visitors'),
                color: 'var(--foreground)'
            }
        };

        if (visitorChartType === 'area') {
            return (
                <AreaChart data={visitorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                        type="monotone"
                        dataKey="visitors"
                        stroke="var(--foreground)"
                        fill="var(--foreground)"
                        fillOpacity={0.1}
                    />
                </AreaChart>
            );
        } else if (visitorChartType === 'line') {
            return (
                <LineChart data={visitorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="visitors" stroke="var(--foreground)" strokeWidth={2} />
                </LineChart>
            );
        } else {
            return (
                <BarChart data={visitorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="visitors" fill="var(--foreground)" radius={4} />
                </BarChart>
            );
        }
    };

    const renderCountryChart = () => {
        const topCountries = countryData.slice(0, 5);
        const config = Object.fromEntries(
            topCountries.map((item, index) => [
                item.country,
                {
                    label: item.country,
                    color: `var(--chart-${index + 1})`
                }
            ])
        );

        if (countryChartType === 'pie') {
            return (
                <PieChart>
                    <Pie data={topCountries} dataKey="count" nameKey="country" cx="50%" cy="50%" outerRadius={80} label>
                        {topCountries.map((entry, index) => (
                            <Cell key={`cell-${index}`} opacity={0.3} fill={`var(--chart-${index + 1})`} />
                        ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                </PieChart>
            );
        } else if (countryChartType === 'bar') {
            return (
                <BarChart data={topCountries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="country" type="category" width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" opacity={0.3} fill="var(--foreground)" radius={4} />
                </BarChart>
            );
        } else {
            return (
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={topCountries}>
                    <RadialBar dataKey="count" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                </RadialBarChart>
            );
        }
    };

    const renderDeviceChart = () => {
        const config = Object.fromEntries(
            deviceData.map((item, index) => [
                item.device,
                {
                    label: item.device,
                    color: `var(--chart-${index + 1})`
                }
            ])
        );

        if (deviceChartType === 'pie') {
            return (
                <PieChart>
                    <Pie data={deviceData} dataKey="count" nameKey="device" cx="50%" cy="50%" outerRadius={80} label>
                        {deviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} opacity={0.3} fill={`var(--chart-${index + 1})`} />
                        ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                </PieChart>
            );
        } else if (deviceChartType === 'bar') {
            return (
                <BarChart data={deviceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="device" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" opacity={0.3} fill={`var(--chart-${index + 1})`} radius={4} />
                </BarChart>
            );
        } else {
            return (
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={deviceData}>
                    <RadialBar dataKey="count" opacity={0.3} fill={`var(--chart-${index + 1})`} radius={4} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                </RadialBarChart>
            );
        }
    };

    const renderRevenueChart = () => {
        if (revenueChartType === 'area') {
            return (
                <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip
                        content={<ChartTooltipContent />}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value) => [`€${value.toFixed(2)}`, t('charts.revenue')]}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--chart-2)"
                        fill="var(--chart-2)"
                        fillOpacity={0.2}
                    />
                </AreaChart>
            );
        }

        if (revenueChartType === 'line') {
            return (
                <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip
                        content={<ChartTooltipContent />}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value) => [`€${value.toFixed(2)}`, t('charts.revenue')]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
            );
        }

        if (revenueChartType === 'bar') {
            return (
                <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip
                        content={<ChartTooltipContent />}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value) => [`€${value.toFixed(2)}`, t('charts.revenue')]}
                    />
                    <Bar dataKey="revenue" fill="var(--chart-2)" opacity={0.3} radius={4} />
                </BarChart>
            );
        }
    };

    const renderBrowserChart = () => {
        if (browserChartType === 'bar') {
            return (
                <BarChart data={browserData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="browser" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--chart-1)" opacity={0.3} radius={4} />
                </BarChart>
            );
        }

        if (browserChartType === 'pie') {
            return (
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                        data={browserData}
                        dataKey="count"
                        nameKey="browser"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="var(--chart-1)"
                        opacity={0.3}>
                        {browserData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`var(--chart-${index + 1})`} />
                        ))}
                    </Pie>
                    <Legend />
                </PieChart>
            );
        }

        if (browserChartType === 'radial') {
            return (
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={browserData}>
                    {browserData.map((entry, index) => (
                        <RadialBar
                            key={entry.browser}
                            dataKey="count"
                            cornerRadius={4}
                            fill={`var(--chart-${index + 1})`}
                        />
                    ))}
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                </RadialBarChart>
            );
        }
    };

    return (
        <div className="space-y-6">
            <AdminHeader title={t('header.title')} description={t('header.description')}>
                <Button variant="outline" onClick={refreshData} disabled={webStatsLoading}>
                    <RefreshCw className="h-4 w-4" />
                </Button>

                <Popover open={showDatePopover} onOpenChange={setShowDatePopover}>
                    <PopoverTrigger asChild>
                        <Button variant={isFilterActive ? 'default' : 'outline'}>
                            <CalendarIcon className="h-4 w-4" />
                            <span>{getCurrentPeriodLabel()}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-2rem)] max-w-md sm:w-96 p-3 sm:p-4" align="end">
                        <div className="space-y-3 sm:space-y-4">
                            <div className="space-y-1 sm:space-y-2">
                                <h4 className="font-medium leading-none text-sm sm:text-base">{t('filters.dateRangeTitle')}</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    {t('filters.dateRangeDescription')}
                                </p>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                                <div className="space-y-1.5 sm:space-y-2">
                                    <Label className="text-xs sm:text-sm">{t('filters.startDate')}</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                disabled={webStatsLoading}
                                                className="w-full h-9 sm:h-10 justify-start text-left font-normal text-xs sm:text-sm">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateRange.startDate ? (
                                                    dateRange.startDate.toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })
                                                ) : (
                                                    <span>{t('filters.pickDate')}</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={dateRange.startDate}
                                                onSelect={(date) => setDateRange({ ...dateRange, startDate: date })}
                                                disabled={webStatsLoading}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-1.5 sm:space-y-2">
                                    <Label className="text-xs sm:text-sm">{t('filters.endDate')}</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                disabled={webStatsLoading || !dateRange.startDate}
                                                className="w-full h-9 sm:h-10 justify-start text-left font-normal text-xs sm:text-sm">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateRange.endDate ? (
                                                    dateRange.endDate.toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })
                                                ) : (
                                                    <span>{t('filters.pickDate')}</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={dateRange.endDate}
                                                onSelect={(date) => setDateRange({ ...dateRange, endDate: date })}
                                                disabled={(date) =>
                                                    webStatsLoading ||
                                                    (dateRange.startDate && date < dateRange.startDate)
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={handleApplyFilter}
                                    disabled={webStatsLoading}
                                    className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                                    {t('filters.apply')}
                                </Button>
                                <div className="space-y-2">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label className="text-xs sm:text-sm">{t('filters.quickPeriods')}</Label>
                                        <Select
                                            value={selectedTimePeriod}
                                            onValueChange={handleSetTimePeriod}
                                            disabled={webStatsLoading}>
                                            <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                                                <SelectValue placeholder={t('filters.selectTimePeriod')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timePeriodOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleClearFilter}
                                        disabled={webStatsLoading}
                                        className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                                        {t('filters.clear')}
                                    </Button>
                                </div>
                            </div>
                            {isFilterActive && (
                                <div className="rounded-md bg-muted p-2 sm:p-3">
                                    <p className="text-[0.65rem] sm:text-xs">
                                        <strong>{t('filters.active')}</strong> {getCurrentPeriodLabel()} (
                                        {dateRange.startDate?.toLocaleDateString() || t('filters.allTime')} {t('common.to')}{' '}
                                        {dateRange.endDate?.toLocaleDateString() || t('common.now')})
                                    </p>
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </AdminHeader>

            {/* Tabbed Analytics Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">
                        {t('tabs.overview')}
                    </TabsTrigger>
                    <TabsTrigger value="website">
                        {t('tabs.website')}
                    </TabsTrigger>
                    <TabsTrigger value="marketing" >
                        {t('tabs.marketing')}
                    </TabsTrigger>
                    <TabsTrigger value="ecommerce">
                        {t('tabs.ecommerce')}
                    </TabsTrigger>
                    <TabsTrigger value="users">
                        {t('tabs.users')}
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-5">
                        {webStatsLoading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="pt-6">
                                        <Skeleton className="h-8 w-full" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <>
                                <StatCard
                                    title={t('stats.uniqueVisitors.title')}
                                    value={formatNumber(webStats.uniqueVisitors)}
                                    icon={Users}
                                    description={t('stats.uniqueVisitors.description')}
                                />
                                <StatCard
                                    title={t('stats.pageViews.title')}
                                    value={formatNumber(webStats.pageViews)}
                                    icon={Eye}
                                    description={t('stats.pageViews.description')}
                                />
                                <StatCard
                                    title={t('stats.campaignsSent.title')}
                                    value={formatNumber(campaignStats.emailSent) + formatNumber(campaignStats.smsSent)}
                                    icon={MessageSquare}
                                    description={t('stats.campaignsSent.description')}
                                />
                                <StatCard
                                    title={t('stats.totalOrders.title')}
                                    value={formatNumber(orderStats.totalOrders)}
                                    icon={ShoppingCart}
                                    description={t('stats.totalOrders.description')}
                                />
                                <StatCard
                                    title={t('stats.totalRevenue.title')}
                                    value={`${formatNumber(orderStats.totalRevenue.toFixed(2))}€`}
                                    icon={DollarSign}
                                    description={t('stats.totalRevenue.description')}
                                />
                                <StatCard
                                    title={t('stats.subscribers.title')}
                                    value={formatNumber(newsletterStats.activeSubscribers)}
                                    icon={UserPlus}
                                    description={t('stats.subscribers.description')}
                                />
                            </>
                        )}
                    </div>

                    {/* Quick Overview Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{t('overviewCharts.dailyVisitors.title')}</CardTitle>
                                    <CardDescription>{t('overviewCharts.dailyVisitors.description')}</CardDescription>
                                </div>
                                <ToggleGroup type="single" value={visitorChartType} onValueChange={setVisitorChartType}>
                                    <ToggleGroupItem value="area" aria-label={t('aria.areaChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="line" aria-label={t('aria.lineChart')}>
                                        <LineChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="bar" aria-label={t('aria.barChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : visitorData.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                                        <p>{t('empty.visitorData')}</p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={{
                                            visitors: {
                                                label: t('charts.visitors'),
                                                color: 'var(--chart-1)'
                                            }
                                        }}
                                        className="h-62.5 w-full">
                                        {renderVisitorChart()}
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{t('overviewCharts.revenueOverTime.title')}</CardTitle>
                                    <CardDescription>{t('overviewCharts.revenueOverTime.description')}</CardDescription>
                                </div>
                                <ToggleGroup type="single" value={revenueChartType} onValueChange={setRevenueChartType}>
                                    <ToggleGroupItem value="area" aria-label={t('aria.areaChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="line" aria-label={t('aria.lineChart')}>
                                        <LineChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="bar" aria-label={t('aria.barChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : revenueData.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                                        <p>{t('empty.revenueData')}</p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={{
                                            revenue: {
                                                label: t('charts.revenue'),
                                                color: 'var(--chart-2)'
                                            }
                                        }}
                                        className="h-62.5 w-full">
                                        {renderRevenueChart()}
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* WEBSITE TAB */}
                <TabsContent value="website" className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                        {webStatsLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="pt-6">
                                        <Skeleton className="h-8 w-full" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <>
                                <StatCard
                                    title={t('stats.uniqueVisitors.title')}
                                    value={formatNumber(webStats.uniqueVisitors)}
                                    icon={Users}
                                    description={t('stats.uniqueVisitors.description')}
                                />
                                <StatCard
                                    title={t('stats.pageViews.title')}
                                    value={formatNumber(webStats.pageViews)}
                                    icon={Eye}
                                    description={t('stats.pageViews.description')}
                                />
                                <StatCard
                                    title={t('stats.avgPagesSession.title')}
                                    value={(webStats.pageViews / (webStats.uniqueVisitors || 1)).toFixed(2)}
                                    icon={TrendingUp}
                                    description={t('stats.avgPagesSession.description')}
                                />
                                <StatCard
                                    title={t('stats.bounceRate.title')}
                                    value="45.2%"
                                    icon={TrendingDown}
                                    description={t('stats.bounceRate.description')}
                                />
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Daily Visitors Chart with Type Toggle */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{t('website.dailyVisitors.title')}</CardTitle>
                                    <CardDescription>{t('website.dailyVisitors.description')}</CardDescription>
                                </div>
                                <ToggleGroup type="single" value={visitorChartType} onValueChange={setVisitorChartType}>
                                    <ToggleGroupItem value="area" aria-label={t('aria.areaChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="line" aria-label={t('aria.lineChart')}>
                                        <LineChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="bar" aria-label={t('aria.barChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : visitorData.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                                        <p>{t('empty.visitorData')}</p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={{
                                            visitors: {
                                                label: t('charts.visitors'),
                                                color: 'var(--foreground)'
                                            }
                                        }}
                                        className="h-75 w-full">
                                        {renderVisitorChart()}
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Countries with Type Toggle */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{t('website.topCountries.title')}</CardTitle>
                                    <CardDescription>{t('website.topCountries.description')}</CardDescription>
                                </div>
                                <ToggleGroup type="single" value={countryChartType} onValueChange={setCountryChartType}>
                                    <ToggleGroupItem value="pie" aria-label={t('aria.pieChart')}>
                                        <PieChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="bar" aria-label={t('aria.barChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="radial" aria-label={t('aria.radialChart')}>
                                        <PieChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : countryData.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                                        <p>{t('empty.countryData')}</p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={Object.fromEntries(
                                            countryData.slice(0, 5).map((item, index) => [
                                                item.country,
                                                {
                                                    label: item.country,
                                                    color: `var(--chart-${index + 1})`
                                                }
                                            ])
                                        )}
                                        className="h-75 w-full">
                                        {renderCountryChart()}
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Browser Usage with Toggle */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{t('website.browserUsage.title')}</CardTitle>
                                    <CardDescription>{t('website.browserUsage.description')}</CardDescription>
                                </div>
                                <ToggleGroup type="single" value={browserChartType} onValueChange={setBrowserChartType}>
                                    <ToggleGroupItem value="bar" aria-label={t('aria.barChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="pie" aria-label={t('aria.pieChart')}>
                                        <PieChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="radial" aria-label={t('aria.radialChart')}>
                                        <PieChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : browserData.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                                        <p>{t('empty.browserData')}</p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={Object.fromEntries(
                                            browserData.slice(0, 5).map((item, index) => [
                                                item.browser,
                                                {
                                                    label: item.browser,
                                                    color: `var(--chart-${index + 1})`
                                                }
                                            ])
                                        )}
                                        className="h-75 w-full">
                                        {renderBrowserChart()}
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Device Types with Toggle */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{t('website.deviceTypes.title')}</CardTitle>
                                    <CardDescription>{t('website.deviceTypes.description')}</CardDescription>
                                </div>
                                <ToggleGroup type="single" value={deviceChartType} onValueChange={setDeviceChartType}>
                                    <ToggleGroupItem value="pie" aria-label={t('aria.pieChart')}>
                                        <PieChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="bar" aria-label={t('aria.barChart')}>
                                        <BarChart3 className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="radial" aria-label={t('aria.radialChart')}>
                                        <PieChartIcon className="h-4 w-4" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : deviceData.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                                        <p>{t('empty.deviceData')}</p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={Object.fromEntries(
                                            deviceData.map((item, index) => [
                                                item.device,
                                                {
                                                    label: item.device,
                                                    color: `var(--chart-${index + 1})`
                                                }
                                            ])
                                        )}
                                        className="h-75 w-full">
                                        {renderDeviceChart()}
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Hourly Traffic */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('website.hourlyTraffic.title')}</CardTitle>
                                <CardDescription>{t('website.hourlyTraffic.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : hourlyStats.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                                        <p>{t('empty.hourlyData')}</p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={{
                                            visitors: {
                                                label: t('charts.visitors'),
                                                color: 'var(--foreground)'
                                            }
                                        }}
                                        className="h-75 w-full mx-auto">
                                        <LineChart data={hourlyStats}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="hour" />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Line
                                                type="monotone"
                                                dataKey="visitors"
                                                stroke="var(--foreground)"
                                                strokeWidth={2}
                                            />
                                        </LineChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Pages */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('website.topPages.title')}</CardTitle>
                                <CardDescription>{t('website.topPages.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                ) : topPages.length === 0 ? (
                                    <div className="flex h-32 items-center justify-center text-muted-foreground">
                                        <p>{t('empty.pageData')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {topPages.slice(0, 10).map((page, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between border-b pb-2 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">
                                                        {index + 1}
                                                    </span>
                                                    <span className="flex-1 truncate text-sm">{page.page}</span>
                                                </div>
                                                <span className="ml-2 font-medium text-sm tabular-nums">
                                                    {formatNumber(page.views)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Manage Metrics Section - Website Tab Only */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('clearSection.websiteMetrics.title')}</CardTitle>
                            <CardDescription>
                                {t('clearSection.websiteMetrics.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Button
                                    variant={showClearSection ? 'default' : 'outline'}
                                    onClick={() => setShowClearSection(!showClearSection)}
                                    className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {showClearSection ? t('clearSection.close') : t('clearSection.clearData')}
                                </Button>

                                {showClearSection && (
                                    <Card className="border-destructive">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-destructive">
                                                <Trash2 className="h-5 w-5" />
                                                {t('clearSection.clearMetricsTitle')}
                                            </CardTitle>
                                            <CardDescription>
                                                {t('clearSection.clearMetricsDescription')}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="clear-option">{t('clearSection.clearOption')}</Label>
                                                    <Select
                                                        value={clearOption}
                                                        onValueChange={setClearOption}
                                                        disabled={isClearing}>
                                                        <SelectTrigger id="clear-option">
                                                            <SelectValue placeholder={t('clearSection.selectClearOption')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">{t('clearSection.deleteAll')}</SelectItem>
                                                            <SelectItem value="range">{t('clearSection.deleteByRange')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {clearOption === 'range' && (
                                                    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                                                        <div className="space-y-1.5 sm:space-y-2">
                                                            <Label className="text-xs sm:text-sm">{t('filters.startDate')}</Label>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        disabled={isClearing}
                                                                        className="w-full h-9 sm:h-10 justify-start text-left font-normal text-xs sm:text-sm">
                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                        {clearDateRange.startDate ? (
                                                                            clearDateRange.startDate.toLocaleDateString(
                                                                                'en-US',
                                                                                {
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    year: 'numeric'
                                                                                }
                                                                            )
                                                                        ) : (
                                                                            <span>{t('filters.pickDate')}</span>
                                                                        )}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={clearDateRange.startDate}
                                                                        onSelect={(date) =>
                                                                            setClearDateRange({
                                                                                ...clearDateRange,
                                                                                startDate: date
                                                                            })
                                                                        }
                                                                        disabled={isClearing}
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                        <div className="space-y-1.5 sm:space-y-2">
                                                            <Label className="text-xs sm:text-sm">{t('filters.endDate')}</Label>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        disabled={
                                                                            isClearing || !clearDateRange.startDate
                                                                        }
                                                                        className="w-full h-9 sm:h-10 justify-start text-left font-normal text-xs sm:text-sm">
                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                        {clearDateRange.endDate ? (
                                                                            clearDateRange.endDate.toLocaleDateString(
                                                                                'en-US',
                                                                                {
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    year: 'numeric'
                                                                                }
                                                                            )
                                                                        ) : (
                                                                            <span>{t('filters.pickDate')}</span>
                                                                        )}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={clearDateRange.endDate}
                                                                        onSelect={(date) =>
                                                                            setClearDateRange({
                                                                                ...clearDateRange,
                                                                                endDate: date
                                                                            })
                                                                        }
                                                                        disabled={(date) =>
                                                                            isClearing ||
                                                                            (clearDateRange.startDate &&
                                                                                date < clearDateRange.startDate)
                                                                        }
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="destructive"
                                                        onClick={handleClearMetrics}
                                                        disabled={isClearing}>
                                                        {isClearing ? (
                                                            <>
                                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                                {t('clearSection.clearing')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {t('clearSection.confirmClear')}
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setShowClearSection(false)}
                                                        disabled={isClearing}>
                                                        {t('clearSection.cancel')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MARKETING TAB */}
                <TabsContent value="marketing" className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                        {webStatsLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="pt-6">
                                        <Skeleton className="h-8 w-full" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <>
                                <StatCard
                                    title={t('marketing.cards.emailsSent.title')}
                                    value={formatNumber(campaignStats.emailSent)}
                                    icon={Mail}
                                    description={t('marketing.cards.emailsSent.description')}
                                />
                                <StatCard
                                    title={t('marketing.cards.smsSent.title')}
                                    value={formatNumber(campaignStats.smsSent)}
                                    icon={MessageSquare}
                                    description={t('marketing.cards.smsSent.description')}
                                />
                                <StatCard
                                    title={t('marketing.cards.openRate.title')}
                                    value={`${campaignStats.openRate.toFixed(1)}%`}
                                    icon={TrendingUp}
                                    description={t('marketing.cards.openRate.description')}
                                />
                                <StatCard
                                    title={t('marketing.cards.clickRate.title')}
                                    value={`${campaignStats.clickRate.toFixed(1)}%`}
                                    icon={TrendingUp}
                                    description={t('marketing.cards.clickRate.description')}
                                />
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Campaign Performance */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('marketing.campaignPerformance.title')}</CardTitle>
                                <CardDescription>{t('marketing.campaignPerformance.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : (
                                    <ChartContainer
                                        config={{
                                            email: {
                                                label: t('charts.email'),
                                                color: 'var(--foreground)'
                                            },
                                            sms: {
                                                label: t('charts.sms'),
                                                color: 'var(--foreground)'
                                            }
                                        }}
                                        className="h-75 w-full">
                                        <BarChart
                                            data={[
                                                {
                                                    name: t('marketing.campaignPerformance.sent'),
                                                    email: campaignStats.emailSent,
                                                    sms: campaignStats.smsSent
                                                },
                                                {
                                                    name: t('marketing.campaignPerformance.opened'),
                                                    email: Math.floor(
                                                        (campaignStats.emailSent * campaignStats.openRate) / 100
                                                    ),
                                                    sms: Math.floor(
                                                        (campaignStats.smsSent * campaignStats.openRate) / 100
                                                    )
                                                },
                                                {
                                                    name: t('marketing.campaignPerformance.clicked'),
                                                    email: Math.floor(
                                                        (campaignStats.emailSent * campaignStats.clickRate) / 100
                                                    ),
                                                    sms: Math.floor(
                                                        (campaignStats.smsSent * campaignStats.clickRate) / 100
                                                    )
                                                }
                                            ]}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                            <Bar dataKey="email" fill="var(--foreground)" opacity={0.3} radius={4} />
                                            <Bar dataKey="sms" fill="var(--foreground)" opacity={0.3} radius={4} />
                                        </BarChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Engagement Rates */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('marketing.engagementRates.title')}</CardTitle>
                                <CardDescription>{t('marketing.engagementRates.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : (
                                    <ChartContainer
                                        config={{
                                            openRate: {
                                                label: t('marketing.cards.openRate.title'),
                                                color: 'var(--foreground)'
                                            },
                                            clickRate: {
                                                label: t('marketing.cards.clickRate.title'),
                                                color: 'var(--chart-4))'
                                            }
                                        }}
                                        className="h-75 w-full">
                                        <BarChart
                                            data={[
                                                { metric: t('marketing.cards.openRate.title'), value: campaignStats.openRate },
                                                { metric: t('marketing.cards.clickRate.title'), value: campaignStats.clickRate }
                                            ]}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="metric" />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="value" fill="var(--foreground)" radius={4} />
                                        </BarChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* E-COMMERCE TAB */}
                <TabsContent value="ecommerce" className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                        {webStatsLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="pt-6">
                                        <Skeleton className="h-8 w-full" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <>
                                <StatCard
                                    title={t('stats.totalOrders.title')}
                                    value={formatNumber(orderStats.totalOrders)}
                                    icon={ShoppingCart}
                                    description={t('stats.totalOrders.description')}
                                />
                                <StatCard
                                    title={t('ecommerce.cards.pendingOrders.title')}
                                    value={formatNumber(orderStats.pendingOrders)}
                                    icon={ShoppingCart}
                                    description={t('ecommerce.cards.pendingOrders.description')}
                                />
                                <StatCard
                                    title={t('ecommerce.cards.completedOrders.title')}
                                    value={formatNumber(orderStats.completedOrders)}
                                    icon={ShoppingCart}
                                    description={t('ecommerce.cards.completedOrders.description')}
                                />
                                <StatCard
                                    title={t('stats.totalRevenue.title')}
                                    value={`${formatNumber(orderStats.totalRevenue.toFixed(2))}€`}
                                    icon={DollarSign}
                                    description={t('stats.totalRevenue.description')}
                                />
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Order Status Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('ecommerce.orderStatus.title')}</CardTitle>
                                <CardDescription>{t('ecommerce.orderStatus.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : (
                                    <ChartContainer
                                        config={{
                                            pending: {
                                                label: t('ecommerce.status.pending'),
                                                color: 'var(--foreground)'
                                            },
                                            completed: {
                                                label: t('ecommerce.status.completed'),
                                                color: 'var(--foreground)'
                                            }
                                        }}
                                        className="h-75 w-full">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: t('ecommerce.status.pending'), value: orderStats.pendingOrders },
                                                    { name: t('ecommerce.status.completed'), value: orderStats.completedOrders },
                                                    {
                                                        name: t('ecommerce.status.other'),
                                                        value:
                                                            orderStats.totalOrders -
                                                            orderStats.pendingOrders -
                                                            orderStats.completedOrders
                                                    }
                                                ]}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label>
                                                <Cell fill="var(--foreground)" opacity={0.3} />
                                                <Cell fill="var(--foreground)" opacity={0.3} />
                                                <Cell fill="var(--foreground)" opacity={0.3} />
                                            </Pie>
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                        </PieChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Revenue Metrics */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('ecommerce.revenueMetrics.title')}</CardTitle>
                                <CardDescription>{t('ecommerce.revenueMetrics.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">
                                                    {t('ecommerce.revenueMetrics.averageOrderValue')}
                                                </span>
                                                <span className="font-bold text-xl">
                                                    {formatNumber(
                                                        (
                                                            orderStats.totalRevenue / (orderStats.completedOrders || 1)
                                                        ).toFixed(2)
                                                    )}{' '}
                                                    €
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-muted">
                                                <div className="h-2 rounded-full bg-primary" style={{ width: '75%' }} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">{t('ecommerce.revenueMetrics.conversionRate')}</span>
                                                <span className="font-bold text-xl">
                                                    {(
                                                        (orderStats.completedOrders / (webStats.uniqueVisitors || 1)) *
                                                        100
                                                    ).toFixed(1)}
                                                    %
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-muted">
                                                <div
                                                    className="h-2 rounded-full bg-green-500"
                                                    style={{
                                                        width: `${((orderStats.completedOrders / (webStats.uniqueVisitors || 1)) * 100).toFixed(0)}%`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">{t('ecommerce.revenueMetrics.completionRate')}</span>
                                                <span className="font-bold text-xl">
                                                    {(
                                                        (orderStats.completedOrders / (orderStats.totalOrders || 1)) *
                                                        100
                                                    ).toFixed(1)}
                                                    %
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-muted">
                                                <div
                                                    className="h-2 rounded-full bg-blue-500"
                                                    style={{
                                                        width: `${((orderStats.completedOrders / (orderStats.totalOrders || 1)) * 100).toFixed(0)}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* USERS TAB */}
                <TabsContent value="users" className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                        {webStatsLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="pt-6">
                                        <Skeleton className="h-8 w-full" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <>
                                <StatCard
                                    title={t('users.cards.totalUsers.title')}
                                    value={formatNumber(userStats.totalUsers)}
                                    icon={Users}
                                    description={t('users.cards.totalUsers.description')}
                                />
                                <StatCard
                                    title={t('users.cards.newUsers.title')}
                                    value={formatNumber(userStats.newUsers)}
                                    icon={UserPlus}
                                    description={t('users.cards.newUsers.description')}
                                />
                                <StatCard
                                    title={t('users.cards.totalSubscribers.title')}
                                    value={formatNumber(newsletterStats.totalSubscribers)}
                                    icon={Mail}
                                    description={t('users.cards.totalSubscribers.description')}
                                />
                                <StatCard
                                    title={t('users.cards.activeSubscribers.title')}
                                    value={formatNumber(newsletterStats.activeSubscribers)}
                                    icon={TrendingUp}
                                    description={t('users.cards.activeSubscribers.description')}
                                />
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* User Growth */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('users.userGrowth.title')}</CardTitle>
                                <CardDescription>{t('users.userGrowth.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : (
                                    <ChartContainer
                                        config={{
                                            new: {
                                                label: t('users.cards.newUsers.title'),
                                                color: 'var(--foreground)'
                                            },
                                            existing: {
                                                label: t('users.userGrowth.existingUsers'),
                                                color: 'var(--foreground)'
                                            }
                                        }}
                                        className="h-75 w-full">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: t('users.cards.newUsers.title'), value: userStats.newUsers },
                                                    {
                                                        name: t('users.userGrowth.existingUsers'),
                                                        value: userStats.totalUsers - userStats.newUsers
                                                    }
                                                ]}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label>
                                                <Cell fill="var(--foreground)" opacity={0.3} />
                                                <Cell fill="var(--foreground)" opacity={0.3} />
                                            </Pie>
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                        </PieChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Subscriber Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('users.subscriberStatus.title')}</CardTitle>
                                <CardDescription>{t('users.subscriberStatus.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {webStatsLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : (
                                    <ChartContainer
                                        config={{
                                            active: {
                                                label: t('users.subscriberStatus.active'),
                                                color: 'var(--foreground)'
                                            },
                                            inactive: {
                                                label: t('users.subscriberStatus.inactive'),
                                                color: 'var(--chart-4))'
                                            }
                                        }}
                                        className="h-75 w-full">
                                        <BarChart
                                            data={[
                                                { status: t('users.subscriberStatus.active'), count: newsletterStats.activeSubscribers },
                                                {
                                                    status: t('users.subscriberStatus.inactive'),
                                                    count:
                                                        newsletterStats.totalSubscribers -
                                                        newsletterStats.activeSubscribers
                                                }
                                            ]}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="status" />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="count" fill="var(--foreground)" opacity={0.3} radius={4} />
                                        </BarChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
