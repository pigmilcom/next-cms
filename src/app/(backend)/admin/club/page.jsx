// @/app/(backend)/admin/club/page.jsx

'use client';

import {
    Activity,
    Award,
    Coins,
    Pencil,
    Plus,
    Save,
    Settings,
    Target,
    Trash2,
    TrendingUp,
    Trophy,
    Users,
    Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { updateClub } from '@/lib/server/admin';
import { getClubSettings, getClubStatistics } from '@/lib/server/club';
import { getCoupons } from '@/lib/server/store';
import { getAllUsers } from '@/lib/server/users';

const defaultLevel = {
    id: '',
    name: '',
    minSpend: 0,
    pointsMultiplier: 1,
    benefits: [],
    color: '#6366f1'
};

const defaultReward = {
    id: '',
    name: '',
    description: '',
    minSpend: 0,
    type: 'gift', // gift, discount, free_shipping
    value: 0,
    icon: '🎁'
};

export default function ClubPage() {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('levels');

    // Level management
    const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState(null);
    const [levelForm, setLevelForm] = useState(defaultLevel);
    const [newBenefit, setNewBenefit] = useState('');

    // Reward management
    const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
    const [editingReward, setEditingReward] = useState(null);
    const [rewardForm, setRewardForm] = useState(defaultReward);

    // Activity history and leaderboard
    const [activityHistory, setActivityHistory] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    const fetchedRef = useRef(false);

    useEffect(() => {
        if (!fetchedRef.current) {
            fetchData();
            fetchedRef.current = true;
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsResult, statsResult] = await Promise.all([getClubSettings(), getClubStatistics()]);

            if (settingsResult.success) {
                console.log('settingsResult.data', settingsResult.data);
                setSettings(settingsResult.data);
            }

            if (statsResult.success) {
                setStatistics(statsResult.data);
            }
        } catch (error) {
            console.error('Error fetching club data:', error);
            toast.error('Failed to load club data');
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsChange = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFeatureToggle = (feature) => {
        setSettings((prev) => ({
            ...prev,
            enabledFeatures: {
                ...prev.enabledFeatures,
                [feature]: !prev.enabledFeatures?.[feature]
            }
        }));
    };

    const handleSavePointsConfig = async () => {
        setIsSubmitting(true);
        try {
            const pointsConfig = {
                pointsPerEuro: settings.pointsPerEuro,
                voucherExchangeRate: settings.voucherExchangeRate
            };

            const result = await updateClub(pointsConfig, 'points');

            if (result.success) {
                toast.success('Points configuration saved successfully');
                await fetchData();
            } else {
                toast.error(result.error || 'Failed to save points configuration');
            }
        } catch (error) {
            console.error('Error saving points configuration:', error);
            toast.error('Failed to save points configuration');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveIntegrationSettings = async () => {
        setIsSubmitting(true);
        try {
            const integrationSettings = {
                enabled: settings.enabled,
                enabledFeatures: settings.enabledFeatures
            };

            const result = await updateClub(integrationSettings, 'integration');

            if (result.success) {
                toast.success('Integration settings saved successfully');
                await fetchData();
            } else {
                toast.error(result.error || 'Failed to save integration settings');
            }
        } catch (error) {
            console.error('Error saving integration settings:', error);
            toast.error('Failed to save integration settings');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Level management functions
    const openLevelDialog = (level = null) => {
        if (level) {
            setEditingLevel(level);
            setLevelForm({ ...level });
        } else {
            setEditingLevel(null);
            setLevelForm({ ...defaultLevel, id: Date.now().toString() });
        }
        setIsLevelDialogOpen(true);
    };

    const closeLevelDialog = () => {
        setIsLevelDialogOpen(false);
        setEditingLevel(null);
        setLevelForm(defaultLevel);
        setNewBenefit('');
    };

    const addBenefit = () => {
        if (newBenefit.trim()) {
            setLevelForm((prev) => ({
                ...prev,
                benefits: [...(prev.benefits || []), newBenefit.trim()]
            }));
            setNewBenefit('');
        }
    };

    const removeBenefit = (index) => {
        setLevelForm((prev) => ({
            ...prev,
            benefits: prev.benefits.filter((_, i) => i !== index)
        }));
    };

    const saveLevel = async () => {
        setIsSubmitting(true);
        try {
            const levels = settings.levels || [];
            let updatedLevels;

            if (editingLevel) {
                updatedLevels = levels.map((l) => (l.id === levelForm.id ? levelForm : l));
            } else {
                updatedLevels = [...levels, levelForm];
            }

            const result = await updateClubLevels(updatedLevels);

            if (result.success) {
                setSettings((prev) => ({
                    ...prev,
                    levels: updatedLevels
                }));
                toast.success(editingLevel ? 'Level updated successfully' : 'Level added successfully');
                closeLevelDialog();
            } else {
                toast.error(result.error || 'Failed to save level');
            }
        } catch (error) {
            console.error('Error saving level:', error);
            toast.error('Failed to save level');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteLevel = async (levelId) => {
        setIsSubmitting(true);
        try {
            const updatedLevels = (settings.levels || []).filter((l) => l.id !== levelId);

            const result = await updateClub(updatedLevels, 'levels');

            if (result.success) {
                setSettings((prev) => ({
                    ...prev,
                    levels: updatedLevels
                }));
                toast.success('Level deleted successfully');
            } else {
                toast.error(result.error || 'Failed to delete level');
            }
        } catch (error) {
            console.error('Error deleting level:', error);
            toast.error('Failed to delete level');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reward management functions
    const openRewardDialog = (reward = null) => {
        if (reward) {
            setEditingReward(reward);
            setRewardForm({ ...reward });
        } else {
            setEditingReward(null);
            setRewardForm({ ...defaultReward, id: Date.now().toString() });
        }
        setIsRewardDialogOpen(true);
    };

    const closeRewardDialog = () => {
        setIsRewardDialogOpen(false);
        setEditingReward(null);
        setRewardForm(defaultReward);
    };

    const saveReward = async () => {
        setIsSubmitting(true);
        try {
            const rewards = settings.rewards || [];
            let updatedRewards;

            if (editingReward) {
                updatedRewards = rewards.map((r) => (r.id === rewardForm.id ? rewardForm : r));
            } else {
                updatedRewards = [...rewards, rewardForm];
            }

            const result = await updateClub(updatedRewards, 'rewards');

            if (result.success) {
                setSettings((prev) => ({
                    ...prev,
                    rewards: updatedRewards
                }));
                toast.success(editingReward ? 'Reward updated successfully' : 'Reward added successfully');
                closeRewardDialog();
            } else {
                toast.error(result.error || 'Failed to save reward');
            }
        } catch (error) {
            console.error('Error saving reward:', error);
            toast.error('Failed to save reward');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteReward = async (rewardId) => {
        setIsSubmitting(true);
        try {
            const updatedRewards = (settings.rewards || []).filter((r) => r.id !== rewardId);

            const result = await updateClub(updatedRewards, 'rewards');

            if (result.success) {
                setSettings((prev) => ({
                    ...prev,
                    rewards: updatedRewards
                }));
                toast.success('Reward deleted successfully');
            } else {
                toast.error(result.error || 'Failed to delete reward');
            }
        } catch (error) {
            console.error('Error deleting reward:', error);
            toast.error('Failed to delete reward');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Activity and Leaderboard functions
    const fetchActivityHistory = async () => {
        setActivityLoading(true);
        try {
            // Fetch coupons used from club vouchers, user point transfers, and reward claims
            const [couponsResult, usersResult] = await Promise.all([
                getCoupons({ filterSource: 'club', limit: 50 }),
                getAllUsers({ limit: 0 })
            ]);

            const activities = [];

            // Add coupon usage activities (club vouchers)
            if (couponsResult.success && couponsResult.data) {
                couponsResult.data.forEach((coupon) => {
                    if (coupon.isClubVoucher && coupon.usedCount > 0) {
                        activities.push({
                            id: `coupon-${coupon.id}`,
                            type: 'voucher_used',
                            title: `Voucher Used: ${coupon.code}`,
                            description: `€${coupon.value} voucher used (${coupon.clubPointsUsed} points)`,
                            user: coupon.targetEmail || 'Unknown',
                            timestamp: coupon.updatedAt || coupon.createdAt,
                            value: coupon.value,
                            points: coupon.clubPointsUsed
                        });
                    }
                });
            }

            // Add point transfer activities and reward claims from user histories
            if (usersResult.success && usersResult.data) {
                usersResult.data.forEach((user) => {
                    if (user.club?.clubMember && user.club.pointsHistory) {
                        user.club.pointsHistory.forEach((history) => {
                            activities.push({
                                id: `points-${user.email}-${history.timestamp}`,
                                type: history.type === 'earned' ? 'points_earned' : 'points_spent',
                                title: history.type === 'earned' ? 'Points Earned' : 'Points Spent',
                                description: history.reason || 'Points transaction',
                                user: user.email,
                                timestamp: history.timestamp,
                                points: Math.abs(history.points),
                                orderId: history.orderId
                            });
                        });
                    }

                    // Add reward claims
                    if (user.club?.claimedRewards) {
                        user.club.claimedRewards.forEach((rewardId, index) => {
                            activities.push({
                                id: `reward-${user.email}-${rewardId}`,
                                type: 'reward_claimed',
                                title: 'Reward Claimed',
                                description: `Reward ${rewardId} claimed`,
                                user: user.email,
                                timestamp: user.updatedAt || user.createdAt,
                                rewardId
                            });
                        });
                    }
                });
            }

            // Sort by timestamp (newest first)
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setActivityHistory(activities.slice(0, 100)); // Limit to 100 most recent
        } catch (error) {
            console.error('Error fetching activity history:', error);
            toast.error('Failed to load activity history');
        } finally {
            setActivityLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
            const usersResult = await getAllUsers({ limit: 0 });

            if (usersResult.success && usersResult.data) {
                const clubMembers = usersResult.data
                    .filter((user) => user.club?.clubMember === true)
                    .map((user) => ({
                        email: user.email,
                        displayName: user.displayName || user.email,
                        points: user.club?.clubPoints || 0,
                        level: user.club?.clubLevel || null,
                        totalSpent: user.club?.totalSpent || 0,
                        joinedAt: user.createdAt
                    }))
                    .sort((a, b) => b.points - a.points); // Sort by points descending

                setLeaderboard(clubMembers.slice(0, 50)); // Top 50 users
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            toast.error('Failed to load leaderboard');
        } finally {
            setLeaderboardLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <AdminHeader title="Club Loyalty Program" description="Manage your customer loyalty program settings" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AdminHeader title="Club Loyalty Program" description="Manage your customer loyalty program settings" />

            {/* Statistics Cards */}
            {statistics && (
                <div className="grid gap-2 lg:gap-4 grid-cols-2 lg:grid-cols-4 mb-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.totalMembers}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                            <Coins className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.totalPointsAwarded.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Points/User</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.averagePoints}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Levels</CardTitle>
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{(settings?.levels || []).length}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs
                value={activeTab}
                onValueChange={(tab) => {
                    setActiveTab(tab);
                    if (tab === 'activity' && activityHistory.length === 0) {
                        fetchActivityHistory();
                    } else if (tab === 'leaderboard' && leaderboard.length === 0) {
                        fetchLeaderboard();
                    }
                }}
                className="space-y-4">
                <TabsList>
                    <TabsTrigger value="levels" className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Levels
                    </TabsTrigger>
                    <TabsTrigger value="rewards" className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Rewards
                    </TabsTrigger>
                    <TabsTrigger value="points" className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Points
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Activity
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Leaderboard
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                {/* Levels Tab */}
                <TabsContent value="levels" className="space-y-4 mb-10">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Club Levels</CardTitle>
                                    <CardDescription>
                                        Define membership levels based on spending thresholds
                                    </CardDescription>
                                </div>
                                <Button onClick={() => openLevelDialog()}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Level
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Level Name</TableHead>
                                        <TableHead>Min. Spend</TableHead>
                                        <TableHead>Points Multiplier</TableHead>
                                        <TableHead>Benefits</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(settings?.levels || []).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No levels configured. Add your first level to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        (settings?.levels || [])
                                            .sort((a, b) => (a.minSpend || 0) - (b.minSpend || 0))
                                            .map((level) => (
                                                <TableRow key={level.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="h-4 w-4 rounded-full"
                                                                style={{ backgroundColor: level.color }}
                                                            />
                                                            <span className="font-medium">{level.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>€{level.minSpend}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{level.pointsMultiplier}x</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {(level.benefits || []).slice(0, 2).map((benefit, idx) => (
                                                                <Badge key={idx} variant="outline">
                                                                    {benefit}
                                                                </Badge>
                                                            ))}
                                                            {level.benefits?.length > 2 && (
                                                                <Badge variant="outline">
                                                                    +{level.benefits.length - 2} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openLevelDialog(level)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => deleteLevel(level.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Rewards Tab */}
                <TabsContent value="rewards" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Club Rewards</CardTitle>
                                    <CardDescription>
                                        Define rewards that members can claim at different spending levels
                                    </CardDescription>
                                </div>
                                <Button onClick={() => openRewardDialog()}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Reward
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reward</TableHead>
                                        <TableHead>Min. Spend</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(settings?.rewards || []).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No rewards configured. Add your first reward to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        (settings?.rewards || [])
                                            .sort((a, b) => (a.minSpend || 0) - (b.minSpend || 0))
                                            .map((reward) => (
                                                <TableRow key={reward.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-2xl">{reward.icon}</span>
                                                            <div>
                                                                <div className="font-medium">{reward.name}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {reward.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>€{reward.minSpend}</TableCell>
                                                    <TableCell>
                                                        <Badge>
                                                            {reward.type === 'gift' && '🎁 Gift'}
                                                            {reward.type === 'discount' && '💰 Discount'}
                                                            {reward.type === 'free_shipping' && '🚚 Free Shipping'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {reward.type === 'discount' && `${reward.value}%`}
                                                        {reward.type === 'gift' && '—'}
                                                        {reward.type === 'free_shipping' && '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openRewardDialog(reward)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => deleteReward(reward.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Points Tab */}
                <TabsContent value="points" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Points Configuration</CardTitle>
                            <CardDescription>Configure how points are earned and exchanged</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="pointsPerEuro">Points per Euro Spent</Label>
                                    <Input
                                        id="pointsPerEuro"
                                        type="number"
                                        min="0"
                                        value={settings?.pointsPerEuro || 10}
                                        onChange={(e) =>
                                            handleSettingsChange('pointsPerEuro', parseInt(e.target.value) || 0)
                                        }
                                    />
                                    <p className="text-sm text-muted-foreground">Base points awarded per €1 spent</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="voucherExchangeRate">Points to Euro Exchange Rate</Label>
                                    <Input
                                        id="voucherExchangeRate"
                                        type="number"
                                        min="1"
                                        value={settings?.voucherExchangeRate || 100}
                                        onChange={(e) =>
                                            handleSettingsChange('voucherExchangeRate', parseInt(e.target.value) || 100)
                                        }
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Points required for €1 voucher (e.g., 100 points = €1)
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-dashed p-4">
                                <div className="flex items-center gap-4">
                                    <Target className="h-8 w-8 text-primary" />
                                    <div className="flex-1">
                                        <h4 className="font-medium">Example Calculation</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Customer spends €50 → Earns {(settings?.pointsPerEuro || 10) * 50} points
                                            <br />
                                            {settings?.voucherExchangeRate || 100} points → €1 voucher
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {(settings?.voucherExchangeRate || 100) < (settings?.pointsPerEuro || 10) && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            <svg
                                                className="h-5 w-5 text-amber-600 dark:text-amber-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-amber-900 dark:text-amber-200">
                                                Exchange Rate Warning
                                            </h4>
                                            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                                                The voucher exchange rate ({settings?.voucherExchangeRate || 100} points
                                                = €1) is lower than the points earned per euro (
                                                {settings?.pointsPerEuro || 10} points/€1). This means customers can
                                                earn more value than they spend. Consider increasing the exchange rate
                                                to at least {settings?.pointsPerEuro || 10} points per euro.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t">
                                <Button onClick={handleSavePointsConfig} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Points Configuration
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Activity History Tab */}
                <TabsContent value="activity" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Activity History</CardTitle>
                                    <CardDescription>
                                        Recent coupon usage, points transfers, and reward claims
                                    </CardDescription>
                                </div>
                                <Button onClick={fetchActivityHistory} disabled={activityLoading}>
                                    {activityLoading ? 'Loading...' : 'Refresh'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {activityLoading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : activityHistory.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No activity found</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Points</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activityHistory.map((activity) => (
                                            <TableRow key={activity.id}>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            activity.type === 'voucher_used'
                                                                ? 'destructive'
                                                                : activity.type === 'points_earned'
                                                                  ? 'default'
                                                                  : activity.type === 'points_spent'
                                                                    ? 'secondary'
                                                                    : 'outline'
                                                        }>
                                                        {activity.title}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{activity.user}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p>{activity.description}</p>
                                                        {activity.orderId && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Order: {activity.orderId}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {activity.points && (
                                                        <span
                                                            className={`font-semibold ${
                                                                activity.type === 'points_earned'
                                                                    ? 'text-green-600'
                                                                    : 'text-red-600'
                                                            }`}>
                                                            {activity.type === 'points_earned' ? '+' : '-'}
                                                            {activity.points}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(activity.timestamp).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Leaderboard Tab */}
                <TabsContent value="leaderboard" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Points Leaderboard</CardTitle>
                                    <CardDescription>Top club members ranked by points</CardDescription>
                                </div>
                                <Button onClick={fetchLeaderboard} disabled={leaderboardLoading}>
                                    {leaderboardLoading ? 'Loading...' : 'Refresh'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {leaderboardLoading ? (
                                <div className="space-y-3">
                                    {[...Array(10)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No club members found</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Rank</TableHead>
                                            <TableHead>Member</TableHead>
                                            <TableHead>Level</TableHead>
                                            <TableHead>Points</TableHead>
                                            <TableHead>Total Spent</TableHead>
                                            <TableHead>Joined</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaderboard.map((member, index) => (
                                            <TableRow key={member.email}>
                                                <TableCell className="font-bold">
                                                    <div className="flex items-center">
                                                        {index === 0 && '🥇'}
                                                        {index === 1 && '🥈'}
                                                        {index === 2 && '🥉'}
                                                        <span className="ml-1">#{index + 1}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{member.displayName}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            {member.email}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {member.level ? (
                                                        <Badge variant="outline">{member.level}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-bold text-blue-600">
                                                    {member.points.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    €{member.totalSpent.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(member.joinedAt).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Club Integration Settings</CardTitle>
                            <CardDescription>Configure how the club program integrates with your store</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="enabled">Enable Club Program</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Activate the loyalty program for all customers
                                    </p>
                                </div>
                                <Switch
                                    id="enabled"
                                    checked={settings?.enabled || false}
                                    onCheckedChange={(checked) => handleSettingsChange('enabled', checked)}
                                />
                            </div>

                            <div className="space-y-4 border-t pt-6">
                                <h4 className="font-medium">Features</h4>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Points for Orders</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Award points when orders are marked as paid & delivered
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings?.enabledFeatures?.pointsForOrders !== false}
                                        onCheckedChange={() => handleFeatureToggle('pointsForOrders')}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Level Multipliers</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Apply points multiplier based on user's level
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings?.enabledFeatures?.levelMultipliers !== false}
                                        onCheckedChange={() => handleFeatureToggle('levelMultipliers')}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Voucher Exchange</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow users to exchange points for vouchers
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings?.enabledFeatures?.voucherExchange !== false}
                                        onCheckedChange={() => handleFeatureToggle('voucherExchange')}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button onClick={handleSaveIntegrationSettings} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Integration Settings
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Level Dialog */}
            <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingLevel ? 'Edit Level' : 'Add New Level'}</DialogTitle>
                        <DialogDescription>Configure the membership level details and benefits</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="levelName">Level Name *</Label>
                                <Input
                                    id="levelName"
                                    placeholder="e.g., Bronze, Silver, Gold"
                                    value={levelForm.name}
                                    onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="levelColor">Level Color</Label>
                                <Input
                                    id="levelColor"
                                    type="color"
                                    value={levelForm.color}
                                    onChange={(e) => setLevelForm({ ...levelForm, color: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="minSpend">Minimum Spend (€) *</Label>
                                <Input
                                    id="minSpend"
                                    type="number"
                                    min="0"
                                    value={levelForm.minSpend}
                                    onChange={(e) =>
                                        setLevelForm({ ...levelForm, minSpend: parseFloat(e.target.value) || 0 })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pointsMultiplier">Points Multiplier *</Label>
                                <Input
                                    id="pointsMultiplier"
                                    type="number"
                                    min="1"
                                    step="0.1"
                                    value={levelForm.pointsMultiplier}
                                    onChange={(e) =>
                                        setLevelForm({
                                            ...levelForm,
                                            pointsMultiplier: parseFloat(e.target.value) || 1
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Benefits</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a benefit..."
                                    value={newBenefit}
                                    onChange={(e) => setNewBenefit(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                                />
                                <Button type="button" onClick={addBenefit}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(levelForm.benefits || []).map((benefit, index) => (
                                    <Badge key={index} variant="secondary" className="gap-1">
                                        {benefit}
                                        <button
                                            type="button"
                                            onClick={() => removeBenefit(index)}
                                            className="ml-1 hover:text-destructive">
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeLevelDialog} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={saveLevel} disabled={!levelForm.name || isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                    Saving...
                                </>
                            ) : editingLevel ? (
                                'Update Level'
                            ) : (
                                'Add Level'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reward Dialog */}
            <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingReward ? 'Edit Reward' : 'Add New Reward'}</DialogTitle>
                        <DialogDescription>Configure the reward details and requirements</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="rewardName">Reward Name *</Label>
                                <Input
                                    id="rewardName"
                                    placeholder="e.g., Welcome Gift"
                                    value={rewardForm.name}
                                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rewardIcon">Icon (Emoji)</Label>
                                <Input
                                    id="rewardIcon"
                                    placeholder="🎁"
                                    value={rewardForm.icon}
                                    onChange={(e) => setRewardForm({ ...rewardForm, icon: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rewardDescription">Description</Label>
                            <Input
                                id="rewardDescription"
                                placeholder="Describe the reward..."
                                value={rewardForm.description}
                                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="rewardMinSpend">Minimum Spend (€) *</Label>
                                <Input
                                    id="rewardMinSpend"
                                    type="number"
                                    min="0"
                                    value={rewardForm.minSpend}
                                    onChange={(e) =>
                                        setRewardForm({
                                            ...rewardForm,
                                            minSpend: parseFloat(e.target.value) || 0
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rewardType">Reward Type *</Label>
                                <select
                                    id="rewardType"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={rewardForm.type}
                                    onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value })}>
                                    <option value="gift">Gift</option>
                                    <option value="discount">Discount</option>
                                    <option value="free_shipping">Free Shipping</option>
                                </select>
                            </div>
                        </div>

                        {rewardForm.type === 'discount' && (
                            <div className="space-y-2">
                                <Label htmlFor="rewardValue">Discount Percentage (%)</Label>
                                <Input
                                    id="rewardValue"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={rewardForm.value}
                                    onChange={(e) =>
                                        setRewardForm({
                                            ...rewardForm,
                                            value: parseFloat(e.target.value) || 0
                                        })
                                    }
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeRewardDialog} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={saveReward} disabled={!rewardForm.name || isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                                    Saving...
                                </>
                            ) : editingReward ? (
                                'Update Reward'
                            ) : (
                                'Add Reward'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
