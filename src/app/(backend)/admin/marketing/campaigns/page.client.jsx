// @/app/(backend)/admin/marketing/campaigns/page.client.jsx

'use client';

import {
    BarChart3,
    Download,
    Eye,
    Inbox,
    Languages,
    Mail,
    MessageSquare,
    Pencil,
    Plus,
    RefreshCw,
    Send,
    SlidersHorizontal,
    Trash2,
    TrendingUp,
    Users,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import GenerateCSV from '@/app/(backend)/admin/components/GenerateCSV';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
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
import { PhoneInput } from '@/components/ui/phone-input';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatAvailableLanguages } from '@/lib/i18n';
import { sendNewsletterCampaign, sendNewsletterTestEmail } from '@/lib/server/email';
import { createCampaign, deleteCampaign, getTemplatesByType, updateCampaign } from '@/lib/server/newsletter';
import { sendSMSCampaign, sendTestSMS } from '@/lib/server/sms';

export default function CampaignsClient({ initialData }) {
    // Get settings from LayoutProvider context
    const { siteSettings } = useAdminSettings();

    // Language configuration
    const availableLanguages = siteSettings?.languages || ['en'];
    const defaultLanguage = siteSettings?.language || 'en';
    const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);

    // Helper function to extract multi-language content
    const getMLContent = (content, locale = selectedLanguage) => {
        if (typeof content === 'object' && content !== null) {
            // ML object: { en: "...", es: "...", pt: "..." }
            return content[locale] || content[defaultLanguage] || content[Object.keys(content)[0]] || '';
        }
        // Legacy: string content
        return content || '';
    };

    // Language labels mapping using i18n formatting
    const formattedLanguages = formatAvailableLanguages(availableLanguages, selectedLanguage);
    const languageLabels = formattedLanguages.reduce((acc, lang) => {
        acc[lang.code] = lang.name;
        return acc;
    }, {});

    const [campaigns, setCampaigns] = useState(initialData.campaigns || []);
    const [subscribers, setSubscribers] = useState(initialData.subscribers || []);
    const [analytics, setAnalytics] = useState(initialData.analytics || {});
    const [availableTemplates, setAvailableTemplates] = useState([]);

    // Campaign states
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
    const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
    const [isSendingCampaign, setIsSendingCampaign] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('custom');
    const [newCampaign, setNewCampaign] = useState({
        subject: {},
        content: {},
        message: {},
        previewText: {},
        type: 'email',
        status: 'draft',
        locale: defaultLanguage
    });
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [editCampaignData, setEditCampaignData] = useState({
        subject: {},
        content: {},
        message: {},
        previewText: {},
        locale: defaultLanguage
    });

    // Send configuration
    const [sendConfig, setSendConfig] = useState({
        selectAll: true,
        manualRecipients: [],
        testEmail: '',
        testPhone: '',
        testName: ''
    });

    // Delete confirmation states
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState(null);

    // Dialog states for various actions
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewCampaign, setViewCampaign] = useState(null);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [sendCampaign, setSendCampaign] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Filter states following customers page pattern
    const [campaignFilter, setCampaignFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [languageFilter, setLanguageFilter] = useState('all');
    const [createdDateFilter, setCreatedDateFilter] = useState('all');
    const [sortByFilter, setSortByFilter] = useState('newest');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    // Helper to get languages with content for a campaign
    const getCampaignLanguages = (campaign) => {
        const languages = [];
        const contentField = campaign.type === 'sms' ? 'message' : 'content';
        const content = campaign[contentField];

        if (typeof content === 'object' && content !== null) {
            // Check each available language for non-empty content
            availableLanguages.forEach((lang) => {
                const langContent = content[lang];
                if (langContent && langContent.trim() !== '') {
                    languages.push(lang);
                }
            });
        } else if (content && content.trim() !== '') {
            // Legacy: string content - assume default language
            languages.push(defaultLanguage);
        }

        return languages;
    };

    // Function to check if any filters are applied
    const hasFiltersApplied = () => {
        return (
            campaignFilter !== 'all' ||
            typeFilter !== 'all' ||
            statusFilter !== 'all' ||
            languageFilter !== 'all' ||
            createdDateFilter !== 'all' ||
            sortByFilter !== 'newest'
        );
    };

    // Refresh function to fetch fresh data bypassing cache
    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            // Add refresh logic here when you have a refresh function
            // const result = await refreshCampaigns();
            toast.success('Data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing data:', error);
            toast.error('Failed to refresh data');
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
        { key: 'campaignId', label: 'Campaign ID', defaultChecked: true },
        {
            key: 'basicInfo',
            label: 'Basic Information',
            headers: ['Subject', 'Type', 'Status'],
            fields: ['subject', 'type', 'status'],
            defaultChecked: true
        },
        {
            key: 'content',
            label: 'Content Information',
            headers: ['Preview Text', 'Content'],
            fields: ['previewText', 'content'],
            defaultChecked: false
        },
        {
            key: 'analytics',
            label: 'Analytics',
            headers: ['Sent Count', 'Open Rate', 'Click Rate'],
            fields: ['sentCount', 'openRate', 'clickRate'],
            defaultChecked: true
        },
        {
            key: 'timestamps',
            label: 'Timestamps',
            headers: ['Created At', 'Sent At'],
            fields: ['createdAt', 'sentAt'],
            defaultChecked: true
        }
    ];

    const formatCampaignsRowData = (campaign, selectedOptions, fieldMapping) => {
        const rowData = {
            campaignId: campaign.id || '',
            subject: getMLContent(campaign.subject) || '',
            type: campaign.type || '',
            status: campaign.status || '',
            previewText: getMLContent(campaign.previewText) || '',
            content: getMLContent(campaign.content) || getMLContent(campaign.message) || '',
            sentCount: campaign.analytics?.sentCount || 0,
            openRate: campaign.analytics?.openRate || '0%',
            clickRate: campaign.analytics?.clickRate || '0%',
            createdAt: campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '',
            sentAt: campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : 'Not sent'
        };
        return fieldMapping.map(field => rowData[field] || '');
    };

    // Enhanced filter function for AdminTable with comprehensive filtering
    const filterCampaigns = (campaigns, search, sortConfig) => {
        let filtered = [...campaigns];

        // Apply text search
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter((campaign) => {
                const subject = getMLContent(campaign.subject, selectedLanguage)?.toLowerCase() || '';
                const content = getMLContent(campaign.content || campaign.message, selectedLanguage)?.toLowerCase() || '';
                return (
                    subject.includes(searchLower) ||
                    content.includes(searchLower) ||
                    campaign.type?.toLowerCase().includes(searchLower) ||
                    campaign.status?.toLowerCase().includes(searchLower)
                );
            });
        }

        // Apply filters
        if (campaignFilter !== 'all') {
            filtered = filtered.filter((campaign) => campaign.status === campaignFilter);
        }
        if (typeFilter !== 'all') {
            filtered = filtered.filter((campaign) => campaign.type === typeFilter);
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter((campaign) => campaign.status === statusFilter);
        }
        if (languageFilter !== 'all') {
            filtered = filtered.filter((campaign) => {
                const languages = getCampaignLanguages(campaign);
                return languages.includes(languageFilter);
            });
        }

        // Apply date filters
        if (createdDateFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter((campaign) => {
                const createdDate = new Date(campaign.createdAt);
                switch (createdDateFilter) {
                    case 'last-7-days':
                        return now - createdDate <= 7 * 24 * 60 * 60 * 1000;
                    case 'last-30-days':
                        return now - createdDate <= 30 * 24 * 60 * 60 * 1000;
                    case 'last-90-days':
                        return now - createdDate <= 90 * 24 * 60 * 60 * 1000;
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        if (sortConfig?.key) {
            filtered.sort((a, b) => {
                let aValue, bValue;

                switch (sortConfig.key) {
                    case 'subject':
                        aValue = getMLContent(a.subject) || '';
                        bValue = getMLContent(b.subject) || '';
                        break;
                    case 'createdAt':
                        aValue = new Date(a.createdAt);
                        bValue = new Date(b.createdAt);
                        break;
                    case 'sentAt':
                        aValue = a.sentAt ? new Date(a.sentAt) : new Date(0);
                        bValue = b.sentAt ? new Date(b.sentAt) : new Date(0);
                        break;
                    default:
                        aValue = a[sortConfig.key];
                        bValue = b[sortConfig.key];
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sorting by creation date
            filtered.sort((a, b) => {
                const aDate = new Date(a.createdAt);
                const bDate = new Date(b.createdAt);
                return sortByFilter === 'newest' ? bDate - aDate : aDate - bDate;
            });
        }

        return filtered;
    };

    // Load templates on mount for default campaign type
    useEffect(() => {
        loadTemplates(newCampaign.type);
    }, []);

    // Load available templates when campaign type changes
    const loadTemplates = async (type) => {
        try {
            const result = await getTemplatesByType(type);
            if (result.success) {
                setAvailableTemplates(result.data || []);
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    // Handle template selection in campaign creation
    const handleTemplateSelection = (templateId) => {
        setSelectedTemplate(templateId);
        if (templateId !== 'custom') {
            const template = availableTemplates.find((t) => t.id === templateId);
            if (template) {
                // Preserve ML object structure from template
                setNewCampaign((prev) => ({
                    ...prev,
                    content: template.content || {},
                    message: template.message || {},
                    subject: typeof template.name === 'string' ? { [selectedLanguage]: template.name } : prev.subject
                }));
            }
        } else {
            // Reset to blank when selecting custom
            setNewCampaign((prev) => ({
                ...prev,
                content: {},
                message: {},
                subject: {}
            }));
        }
    };

    // Handle language change - update campaign content if needed
    const handleLanguageChange = (newLang) => {
        setSelectedLanguage(newLang);

        // Update campaign locale
        setNewCampaign((prev) => ({ ...prev, locale: newLang }));
    };

    // Create campaign
    const handleCreateCampaign = async () => {
        // Get current language subject/content for validation
        const currentSubject =
            typeof newCampaign.subject === 'object' ? newCampaign.subject[selectedLanguage] || '' : newCampaign.subject;
        const currentContent =
            typeof newCampaign.content === 'object' ? newCampaign.content[selectedLanguage] || '' : newCampaign.content;
        const currentMessage =
            typeof newCampaign.message === 'object' ? newCampaign.message[selectedLanguage] || '' : newCampaign.message;

        if (!currentSubject.trim()) {
            toast.error('Subject/Campaign name is required');
            return;
        }

        if (newCampaign.type === 'email' && !currentContent.trim()) {
            toast.error('Content is required for email campaigns');
            return;
        }

        if (newCampaign.type === 'sms' && !currentMessage.trim()) {
            toast.error('Message is required for SMS campaigns');
            return;
        }

        try {
            setIsSubmittingCampaign(true);

            // Build ML data - only store values for languages that have been explicitly filled
            const mlSubject = {};
            const mlContent = {};
            const mlMessage = {};
            const mlPreviewText = {};

            // Populate only languages that have explicit values (no fallback)
            availableLanguages.forEach((lang) => {
                // Subject
                const langSubject =
                    typeof newCampaign.subject === 'object'
                        ? newCampaign.subject[lang] || ''
                        : lang === selectedLanguage
                          ? newCampaign.subject
                          : '';
                mlSubject[lang] = langSubject;

                // Content (for email)
                const langContent =
                    typeof newCampaign.content === 'object'
                        ? newCampaign.content[lang] || ''
                        : lang === selectedLanguage
                          ? newCampaign.content
                          : '';
                mlContent[lang] = langContent;

                // Message (for SMS)
                const langMessage =
                    typeof newCampaign.message === 'object'
                        ? newCampaign.message[lang] || ''
                        : lang === selectedLanguage
                          ? newCampaign.message
                          : '';
                mlMessage[lang] = langMessage;

                // Preview Text
                const langPreview =
                    typeof newCampaign.previewText === 'object'
                        ? newCampaign.previewText[lang] || ''
                        : lang === selectedLanguage
                          ? newCampaign.previewText || ''
                          : '';
                mlPreviewText[lang] = langPreview;
            });

            const campaignData = {
                ...newCampaign,
                subject: mlSubject,
                content: mlContent,
                message: mlMessage,
                previewText: mlPreviewText,
                locale: defaultLanguage
            };

            const result = await createCampaign(campaignData);

            if (result.success) {
                toast.success(`${newCampaign.type === 'sms' ? 'SMS' : 'Email'} campaign created successfully`);
                setNewCampaign({
                    subject: {},
                    content: {},
                    message: {},
                    previewText: {},
                    type: 'email',
                    status: 'draft',
                    locale: selectedLanguage
                });
                setCampaigns((prev) => [result.data, ...prev]);
                // Update analytics
                setAnalytics((prev) => ({
                    ...prev,
                    totalCampaigns: (prev.totalCampaigns || 0) + 1
                }));
                // Close dialog and reset states
                setIsCreatingCampaign(false);
                setSelectedTemplate('custom');
                setAvailableTemplates([]);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to create campaign');
        } finally {
            setIsSubmittingCampaign(false);
        }
    };

    // Send campaign (unified handler)
    const handleSendCampaign = async (campaign) => {
        if (!campaign) return;

        const isSMSCampaign = campaign.type === 'sms';

        const recipients = sendConfig.selectAll
            ? subscribers.filter((s) => {
                  if (isSMSCampaign) return s.status === 'active' && s.phone;
                  return s.status === 'active';
              })
            : [];

        if (
            recipients.length === 0 &&
            (isSMSCampaign
                ? sendConfig.manualRecipients.filter((r) => r.phone).length === 0
                : sendConfig.manualRecipients.length === 0)
        ) {
            toast.error(`Please select at least one recipient${isSMSCampaign ? ' with a phone number' : ''}`);
            return;
        }

        try {
            setIsSendingCampaign(true);
            const result = isSMSCampaign
                ? await sendSMSCampaign(
                      campaign,
                      recipients,
                      sendConfig.manualRecipients.filter((r) => r.phone)
                  )
                : await sendNewsletterCampaign(campaign, recipients, sendConfig.manualRecipients);

            if (result.success) {
                toast.success(`Campaign sent! ${result.data.sent} successful, ${result.data.failed} failed`);

                const updatedCampaign = {
                    ...campaign,
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                    sentTo: result.data.total
                };

                const campaignId = campaign.key || campaign.id;
                await updateCampaign(campaignId, updatedCampaign);
                setCampaigns((prev) => prev.map((c) => ((c.key || c.id) === campaignId ? updatedCampaign : c)));
                // Update analytics if campaign was draft before
                if (campaign.status === 'draft') {
                    setAnalytics((prev) => ({
                        ...prev,
                        sentCampaigns: (prev.sentCampaigns || 0) + 1
                    }));
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to send campaign');
        } finally {
            setIsSendingCampaign(false);
        }
    };

    // Send test
    const handleSendTest = async (campaign) => {
        const isSMSCampaign = campaign.type === 'sms';

        if (isSMSCampaign && !sendConfig.testPhone) {
            toast.error('Test phone number is required');
            return;
        }

        if (!isSMSCampaign && !sendConfig.testEmail) {
            toast.error('Test email is required');
            return;
        }

        try {
            const result = isSMSCampaign
                ? await sendTestSMS(campaign, sendConfig.testPhone, sendConfig.testName)
                : await sendNewsletterTestEmail(campaign, sendConfig.testEmail, sendConfig.testName);

            if (result.success) {
                toast.success(`Test ${isSMSCampaign ? 'SMS' : 'email'} sent successfully`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to send test');
        }
    };

    // Delete campaign - open confirmation
    const handleDeleteClick = (campaign) => {
        setCampaignToDelete(campaign);
        setDeleteConfirmOpen(true);
    };

    // Delete campaign - confirmed
    const handleDeleteCampaign = async () => {
        if (!campaignToDelete) return;

        try {
            const campaignId = campaignToDelete.key || campaignToDelete.id;
            const result = await deleteCampaign(campaignId);
            if (result.success) {
                toast.success('Campaign deleted successfully');
                setCampaigns((prev) => prev.filter((c) => (c.key || c.id) !== campaignId));
                // Update analytics
                setAnalytics((prev) => ({
                    ...prev,
                    totalCampaigns: Math.max((prev.totalCampaigns || 0) - 1, 0),
                    sentCampaigns:
                        campaignToDelete?.status === 'sent'
                            ? Math.max((prev.sentCampaigns || 0) - 1, 0)
                            : prev.sentCampaigns || 0
                }));
            } else {
                throw new Error(result.error);
            }
            setDeleteConfirmOpen(false);
            setCampaignToDelete(null);
        } catch (error) {
            toast.error(error.message || 'Failed to delete campaign');
        }
    };

    // Edit campaign
    const handleEditCampaign = async () => {
        if (!editingCampaign) return;

        try {
            const campaignId = editingCampaign.key || editingCampaign.id;

            // Build ML data - only store values for languages that have been explicitly filled
            const mlSubject = {};
            const mlContent = {};
            const mlMessage = {};
            const mlPreviewText = {};

            // Populate only languages that have explicit values (no fallback)
            availableLanguages.forEach((lang) => {
                // Subject
                const langSubject =
                    typeof editCampaignData.subject === 'object'
                        ? editCampaignData.subject[lang] || ''
                        : lang === selectedLanguage
                          ? editCampaignData.subject || ''
                          : '';
                mlSubject[lang] = langSubject;

                // Content (for email)
                const langContent =
                    typeof editCampaignData.content === 'object'
                        ? editCampaignData.content[lang] || ''
                        : lang === selectedLanguage
                          ? editCampaignData.content || ''
                          : '';
                mlContent[lang] = langContent;

                // Message (for SMS)
                const langMessage =
                    typeof editCampaignData.message === 'object'
                        ? editCampaignData.message[lang] || ''
                        : lang === selectedLanguage
                          ? editCampaignData.message || ''
                          : '';
                mlMessage[lang] = langMessage;

                // Preview Text
                const langPreview =
                    typeof editCampaignData.previewText === 'object'
                        ? editCampaignData.previewText[lang] || ''
                        : lang === selectedLanguage
                          ? editCampaignData.previewText || ''
                          : '';
                mlPreviewText[lang] = langPreview;
            });

            const updatedData = {
                ...editCampaignData,
                subject: mlSubject,
                content: mlContent,
                message: mlMessage,
                previewText: mlPreviewText
            };

            const result = await updateCampaign(campaignId, updatedData);
            if (result.success) {
                setCampaigns((prev) => prev.map((c) => ((c.key || c.id) === campaignId ? result.data : c)));
                toast.success('Campaign updated successfully');
                setEditingCampaign(null);
                setEditCampaignData({
                    subject: {},
                    content: {},
                    message: {},
                    previewText: {},
                    locale: selectedLanguage
                });
            } else {
                throw new Error(result.error || 'Failed to update campaign');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update campaign');
        }
    };

    // Add/Remove/Update manual recipients
    const addManualRecipient = () => {
        setSendConfig((prev) => ({
            ...prev,
            manualRecipients: [...prev.manualRecipients, { email: '', phone: '', name: '' }]
        }));
    };

    const removeManualRecipient = (index) => {
        setSendConfig((prev) => ({
            ...prev,
            manualRecipients: prev.manualRecipients.filter((_, i) => i !== index)
        }));
    };

    const updateManualRecipient = (index, field, value) => {
        setSendConfig((prev) => ({
            ...prev,
            manualRecipients: prev.manualRecipients.map((recipient, i) =>
                i === index ? { ...recipient, [field]: value } : recipient
            )
        }));
    };

    return (
        <div className="space-y-6">
            <AdminHeader title="Newsletter" description="Manage email and SMS campaigns and subscribers" />

            {/* Analytics Cards */}
            <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalCampaigns || 0}</div>
                        <p className="text-xs text-muted-foreground">Email & SMS</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalSubscribers || 0}</div>
                        <p className="text-xs text-muted-foreground">Total users</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sent Campaigns</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.sentCampaigns || 0}</div>
                        <p className="text-xs text-muted-foreground">Successfully sent</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.openRate || '0'}%</div>
                        <p className="text-xs text-muted-foreground">Avg. engagement</p>
                    </CardContent>
                </Card>
            </div>

            {/* Campaigns Section */}
            <div className="space-y-6">
                {/* AdminTable for Campaigns */}
                <AdminTable
                    data={campaigns}
                    columns={[
                        {
                            key: 'subject',
                            label: 'Subject',
                            sortable: true,
                            render: (campaign) => (
                                <div className="flex items-center gap-2">
                                    {campaign.type === 'sms' ? (
                                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                                    ) : (
                                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{getMLContent(campaign.subject) || 'Untitled Campaign'}</span>
                                </div>
                            )
                        },
                        {
                            key: 'type',
                            label: 'Type',
                            sortable: true,
                            render: (campaign) => (
                                <Badge variant="outline" className="capitalize">
                                    {campaign.type || 'email'}
                                </Badge>
                            )
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            sortable: true,
                            render: (campaign) => {
                                const statusValue = campaign.status || 'draft';
                                const statusColors = {
                                    draft: 'bg-gray-100 text-gray-800',
                                    scheduled: 'bg-yellow-100 text-yellow-800',
                                    sent: 'bg-green-100 text-green-800',
                                    sending: 'bg-blue-100 text-blue-800'
                                };
                                const statusText = String(statusValue).charAt(0).toUpperCase() + String(statusValue).slice(1);
                                return (
                                    <Badge className={statusColors[statusValue] || statusColors.draft}>
                                        {statusText}
                                    </Badge>
                                );
                            }
                        },
                        {
                            key: 'languages',
                            label: 'Languages',
                            sortable: false,
                            render: (campaign) => {
                                const languages = getCampaignLanguages(campaign);
                                return (
                                    <div className="flex items-center gap-1">
                                        <Languages className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{languages.join(', ') || defaultLanguage}</span>
                                    </div>
                                );
                            }
                        },
                        {
                            key: 'analytics',
                            label: 'Performance',
                            sortable: false,
                            render: (campaign) => {
                                if (!campaign.analytics || campaign.status === 'draft') {
                                    return <span className="text-muted-foreground text-sm">-</span>;
                                }
                                const { sentCount = 0, openRate = '0%', clickRate = '0%' } = campaign.analytics;
                                return (
                                    <div className="text-sm">
                                        <div>Sent: {sentCount.toLocaleString()}</div>
                                        <div className="text-muted-foreground">Opens: {openRate} | Clicks: {clickRate}</div>
                                    </div>
                                );
                            }
                        },
                        {
                            key: 'createdAt',
                            label: 'Created',
                            sortable: true,
                            render: (campaign) => (
                                <span className="text-sm text-muted-foreground">
                                    {new Date(campaign.createdAt).toLocaleDateString()}
                                </span>
                            )
                        }
                    ]}
                    getRowActions={(campaign) => [
                        {
                            label: 'View Details',
                            icon: <Eye className="mr-2 h-4 w-4" />,
                            onClick: () => {
                                setViewCampaign(campaign);
                                setViewDialogOpen(true);
                            }
                        },
                        {
                            label: 'Edit Campaign',
                            icon: <Pencil className="mr-2 h-4 w-4" />,
                            onClick: () => {
                                setEditingCampaign(campaign);
                                setEditCampaignData({
                                    subject: campaign.subject || {},
                                    content: campaign.content || {},
                                    message: campaign.message || {},
                                    previewText: campaign.previewText || {},
                                    locale: selectedLanguage
                                });
                                setEditDialogOpen(true);
                            }
                        },
                        {
                            label: 'Send Campaign',
                            icon: <Send className="mr-2 h-4 w-4" />,
                            onClick: () => {
                                setSendCampaign(campaign);
                                setSendDialogOpen(true);
                            },
                            disabled: campaign.status === 'sending',
                            className: campaign.status === 'sending' ? 'opacity-50 cursor-not-allowed' : ''
                        },
                        {
                            label: 'Test Send',
                            icon: <TrendingUp className="mr-2 h-4 w-4" />,
                            onClick: () => {
                                setSendCampaign(campaign);
                                setSendDialogOpen(true);
                            },
                            disabled: !['draft', 'sent'].includes(campaign.status),
                            className: !['draft', 'sent'].includes(campaign.status) ? 'opacity-50 cursor-not-allowed' : ''
                        },
                        {
                            label: 'Delete Campaign',
                            icon: <Trash2 className="mr-2 h-4 w-4" />,
                            onClick: () => {
                                setCampaignToDelete(campaign);
                                setDeleteConfirmOpen(true);
                            },
                            className: 'text-destructive'
                        }
                    ]}
                    filterData={filterCampaigns}
                    emptyMessage="No campaigns found"
                    searchPlaceholder="Search campaigns..."
                    customFilters={
                        <div className="space-y-3">
                            {isFiltersExpanded && (
                                <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="sending">Sending</SelectItem>
                                            <SelectItem value="sent">Sent</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="sms">SMS</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Campaign Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="sending">Sending</SelectItem>
                                            <SelectItem value="sent">Sent</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={languageFilter} onValueChange={setLanguageFilter}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Languages</SelectItem>
                                            {availableLanguages.map((lang) => (
                                                <SelectItem key={lang} value={lang}>
                                                    {languageLabels[lang]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={createdDateFilter} onValueChange={setCreatedDateFilter}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Created Date" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Time</SelectItem>
                                            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                                            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                                            <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={sortByFilter} onValueChange={setSortByFilter}>
                                        <SelectTrigger className="w-35">
                                            <SelectValue placeholder="Sort By" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="newest">Newest First</SelectItem>
                                            <SelectItem value="oldest">Oldest First</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className="flex gap-2">
                                        {hasFiltersApplied() && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setCampaignFilter('all');
                                                    setTypeFilter('all');
                                                    setStatusFilter('all');
                                                    setLanguageFilter('all');
                                                    setCreatedDateFilter('all');
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
                                                campaignFilter !== 'all' && 'Status',
                                                typeFilter !== 'all' && 'Type',
                                                statusFilter !== 'all' && 'Campaign',
                                                languageFilter !== 'all' && 'Language',
                                                createdDateFilter !== 'all' && 'Date',
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
                                title="Refresh campaign data">
                                <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
                                <span className="hidden xl:block">{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                            </Button>
                            <Button variant="outline" onClick={openExportDialog}>
                                <Download className="h-4 w-4" />
                                <span className="hidden lg:block">Export CSV</span>
                            </Button>
                            <Button onClick={() => setIsCreatingCampaign(true)}>
                                <Plus className="h-4 w-4" />
                                <span>Create Campaign</span>
                            </Button>
                        </>
                    }
                />

                {/* CSV Export Dialog */}
                <GenerateCSV
                    open={isExportDialogOpen}
                    onOpenChange={setIsExportDialogOpen}
                    data={campaigns}
                    filename="campaigns"
                    title="Export Campaigns"
                    description="Select the campaign data fields you want to include in the export."
                    exportFields={csvExportFields}
                    formatRowData={formatCampaignsRowData}
                />

                {/* Delete Confirmation Dialog */}
                <ConfirmationDialog
                    open={deleteConfirmOpen}
                    onOpenChange={setDeleteConfirmOpen}
                    onConfirm={handleDeleteCampaign}
                    title="Delete Campaign"
                    description={`Are you sure you want to delete the campaign "${getMLContent(campaignToDelete?.subject, selectedLanguage)}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                />

                {/* View Campaign Dialog */}
                <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Preview Campaign</DialogTitle>
                        </DialogHeader>
                        {viewCampaign && (
                            <div className="space-y-4">
                                <div>
                                    <strong>
                                        {viewCampaign.type === 'sms' ? 'Campaign Name:' : 'Subject:'}
                                    </strong>{' '}
                                    {getMLContent(viewCampaign.subject)}
                                </div>
                                {getMLContent(viewCampaign.previewText) && (
                                    <div>
                                        <strong>Preview:</strong> {getMLContent(viewCampaign.previewText)}
                                    </div>
                                )}
                                <div>
                                    <strong>Content:</strong>
                                    {viewCampaign.type === 'sms' ? (
                                        <div className="mt-2 p-4 border rounded">
                                            <div className="whitespace-pre-wrap">
                                                {getMLContent(viewCampaign.message) ||
                                                    getMLContent(viewCampaign.content)}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-2">
                                                Characters:{' '}
                                                {
                                                    (
                                                        getMLContent(viewCampaign.message) ||
                                                        getMLContent(viewCampaign.content) ||
                                                        ''
                                                    ).length
                                                }
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="mt-2 p-4 border rounded max-h-96 overflow-y-auto"
                                            dangerouslySetInnerHTML={{
                                                __html: getMLContent(viewCampaign.content)
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Create Campaign Dialog */}
                <Dialog
                    open={isCreatingCampaign}
                    onOpenChange={(open) => {
                        if (open) {
                            loadTemplates(newCampaign.type);
                        } else {
                            setIsCreatingCampaign(false);
                            setSelectedTemplate('custom');
                            setAvailableTemplates([]);
                        }
                    }}>
                    <DialogTrigger asChild>
                        <Button style={{display: 'none'}}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Campaign
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div className="sm:max-w-1/2">
                                    <DialogTitle>Create Campaign</DialogTitle>
                                    <DialogDescription>Create a new email or SMS campaign</DialogDescription>
                                </div>
                                {availableLanguages.length > 1 && (
                                    <div className="flex items-center gap-2 sm:absolute sm:top-5 sm:right-16">
                                        <Languages className="h-4 w-4 text-muted-foreground" />
                                        <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                                            <SelectTrigger className="w-35">
                                                <SelectValue placeholder="Language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableLanguages.map((lang) => (
                                                    <SelectItem key={lang} value={lang}>
                                                        {languageLabels[lang] || lang.toUpperCase()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="campaign-type">Campaign Type</Label>
                                <Select
                                    value={newCampaign.type}
                                    onValueChange={(value) => {
                                        setNewCampaign((prev) => ({ ...prev, type: value }));
                                        loadTemplates(value);
                                    }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Email Campaign
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="sms">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4" />
                                                SMS Campaign
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="campaign-template">Use Template (Optional)</Label>
                                <Select value={selectedTemplate} onValueChange={handleTemplateSelection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">
                                            <div className="flex items-center gap-2">
                                                <span>âœï¸</span>
                                                Custom / Blank
                                            </div>
                                        </SelectItem>
                                        {availableTemplates.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{template.thumbnail || 'ðŸ“§'}</span>
                                                    {template.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="campaign-subject">
                                    {newCampaign.type === 'sms' ? 'Campaign Name' : 'Subject'}{' '}
                                    {availableLanguages.length > 1 && `(${languageLabels[selectedLanguage]})`}
                                </Label>
                                <Input
                                    id="campaign-subject"
                                    value={newCampaign.subject[selectedLanguage] || ''}
                                    onChange={(e) =>
                                        setNewCampaign((prev) => ({
                                            ...prev,
                                            subject: { ...prev.subject, [selectedLanguage]: e.target.value }
                                        }))
                                    }
                                    placeholder={
                                        newCampaign.type === 'sms' ? 'Campaign name...' : 'Email subject line...'
                                    }
                                />
                            </div>

                            {/* Preview text for email only */}
                            {newCampaign.type === 'email' && (
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="campaign-preview-text">
                                        Preview Text{' '}
                                        {availableLanguages.length > 1 && `(${languageLabels[selectedLanguage]})`}
                                    </Label>
                                    <Input
                                        id="campaign-preview-text"
                                        value={newCampaign.previewText[selectedLanguage] || ''}
                                        onChange={(e) =>
                                            setNewCampaign((prev) => ({
                                                ...prev,
                                                previewText: {
                                                    ...prev.previewText,
                                                    [selectedLanguage]: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="Preview text that appears in email clients..."
                                    />
                                </div>
                            )}

                            {/* Content / Message */}
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="campaign-content">
                                    {newCampaign.type === 'sms' ? 'Message' : 'Content'}{' '}
                                    {availableLanguages.length > 1 && `(${languageLabels[selectedLanguage]})`}
                                </Label>
                                {newCampaign.type === 'sms' ? (
                                    <>
                                        <Textarea
                                            id="campaign-content"
                                            value={newCampaign.message[selectedLanguage] || ''}
                                            onChange={(e) =>
                                                setNewCampaign((prev) => ({
                                                    ...prev,
                                                    message: {
                                                        ...prev.message,
                                                        [selectedLanguage]: e.target.value
                                                    }
                                                }))
                                            }
                                            placeholder="SMS message content..."
                                            rows={3}
                                            maxLength={160}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            {(newCampaign.message[selectedLanguage] || '').length} / 160 characters
                                        </p>
                                    </>
                                ) : (
                                    <RichTextEditor
                                        value={newCampaign.content[selectedLanguage] || ''}
                                        onChange={(content) =>
                                            setNewCampaign((prev) => ({
                                                ...prev,
                                                content: { ...prev.content, [selectedLanguage]: content }
                                            }))
                                        }
                                        placeholder="Email content..."
                                    />
                                )}
                            </div>
                            {!isSubmittingCampaign && newCampaign.type && (
                                <div className="text-sm text-muted-foreground">
                                    <p>
                                        {newCampaign.type === 'sms'
                                            ? 'ðŸ“± SMS campaigns will be sent via SMS to subscribers with phone numbers'
                                            : 'ðŸ“§ Email campaigns will be sent via email to all subscribers'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="relative z-50">
                            <Button onClick={handleCreateCampaign} disabled={isSubmittingCampaign}>
                                {isSubmittingCampaign ? 'Creating...' : 'Create Campaign'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Send Campaign Dialog */}
                <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                Send {sendCampaign?.type === 'sms' ? 'SMS' : 'Email'} Campaign:{' '}
                                {getMLContent(sendCampaign?.subject)}
                            </DialogTitle>
                            <DialogDescription>Configure recipients and send your campaign</DialogDescription>
                        </DialogHeader>

                        {sendCampaign && (
                            <div className="space-y-6">
                                {/* Test Section */}
                                <div className="space-y-3">
                                    <h4 className="font-medium">
                                        Send Test {sendCampaign.type === 'sms' ? 'SMS' : 'Email'}
                                    </h4>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        {sendCampaign.type === 'sms' ? (
                                            <PhoneInput
                                                value={sendConfig.testPhone}
                                                onChange={(value) =>
                                                    setSendConfig((prev) => ({
                                                        ...prev,
                                                        testPhone: value
                                                    }))
                                                }
                                                placeholder="Test phone number"
                                                className="flex-1"
                                            />
                                        ) : (
                                            <Input
                                                placeholder="Test email address"
                                                value={sendConfig.testEmail}
                                                onChange={(e) =>
                                                    setSendConfig((prev) => ({
                                                        ...prev,
                                                        testEmail: e.target.value
                                                    }))
                                                }
                                                className="flex-1"
                                            />
                                        )}
                                        <Input
                                            placeholder="Test name (optional)"
                                            value={sendConfig.testName}
                                            onChange={(e) =>
                                                setSendConfig((prev) => ({
                                                    ...prev,
                                                    testName: e.target.value
                                                }))
                                            }
                                            className="flex-1"
                                        />
                                        <Button variant="outline" onClick={() => handleSendTest(sendCampaign)}>
                                            Send Test
                                        </Button>
                                    </div>
                                </div>

                                {/* Recipients Section */}
                                <div className="space-y-3">
                                    <h4 className="font-medium">Recipients</h4>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="select-all"
                                            checked={sendConfig.selectAll}
                                            onCheckedChange={(checked) =>
                                                setSendConfig((prev) => ({ ...prev, selectAll: checked }))
                                            }
                                        />
                                        <Label htmlFor="select-all">
                                            Send to all subscribers ({subscribers.length} total)
                                        </Label>
                                    </div>

                                    {!sendConfig.selectAll && (
                                        <div className="space-y-2">
                                            <Label>Manual Recipients</Label>
                                            {sendConfig.manualRecipients.map((recipient, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <Input
                                                        placeholder={sendCampaign.type === 'sms' ? 'Phone' : 'Email'}
                                                        value={recipient.contact}
                                                        onChange={(e) =>
                                                            updateManualRecipient(index, 'contact', e.target.value)
                                                        }
                                                        className="flex-1"
                                                    />
                                                    <Input
                                                        placeholder="Name (optional)"
                                                        value={recipient.name}
                                                        onChange={(e) =>
                                                            updateManualRecipient(index, 'name', e.target.value)
                                                        }
                                                        className="flex-1"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeManualRecipient(index)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={addManualRecipient}
                                                className="w-full">
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Recipient
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Send Button */}
                                <div className="pt-4 border-t">
                                    <Button
                                        onClick={() => handleSendCampaign(sendCampaign)}
                                        disabled={isSendingCampaign}
                                        className="w-full">
                                        {isSendingCampaign
                                            ? 'Sending...'
                                            : sendCampaign.status === 'sent'
                                            ? 'Send Campaign Again'
                                            : 'Send Campaign'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Edit Campaign Dialog */}
                <Dialog
                    open={editDialogOpen}
                    onOpenChange={(open) => {
                        setEditDialogOpen(open);
                        if (!open) {
                            setEditingCampaign(null);
                            setEditCampaignData({
                                subject: {},
                                content: {},
                                message: {},
                                previewText: {},
                                locale: selectedLanguage
                            });
                        }
                    }}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div>
                                    <DialogTitle>Edit Campaign</DialogTitle>
                                    <DialogDescription>
                                        Update your {editingCampaign?.type === 'email' ? 'email' : 'SMS'} campaign
                                    </DialogDescription>
                                </div>
                                {availableLanguages.length > 1 && (
                                    <div className="flex items-center sm:me-10 sm:-mt-3 gap-2">
                                        <Languages className="h-4 w-4 text-muted-foreground" />
                                        <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                                            <SelectTrigger className="w-35">
                                                <SelectValue placeholder="Language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableLanguages.map((lang) => (
                                                    <SelectItem key={lang} value={lang}>
                                                        {languageLabels[lang] || lang.toUpperCase()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </DialogHeader>
                        {editingCampaign && (
                            <div className="space-y-4">
                                {editingCampaign.type === 'email' ? (
                                    <>
                                        <div>
                                            <Label htmlFor="edit-subject">
                                                Subject{' '}
                                                {availableLanguages.length > 1 &&
                                                    `(${languageLabels[selectedLanguage]})`}
                                            </Label>
                                            <Input
                                                id="edit-subject"
                                                value={
                                                    typeof editCampaignData.subject === 'object'
                                                        ? editCampaignData.subject[selectedLanguage] || ''
                                                        : editCampaignData.subject || ''
                                                }
                                                onChange={(e) =>
                                                    setEditCampaignData((prev) => ({
                                                        ...prev,
                                                        subject:
                                                            typeof prev.subject === 'object'
                                                                ? {
                                                                      ...prev.subject,
                                                                      [selectedLanguage]: e.target.value
                                                                  }
                                                                : {
                                                                      [selectedLanguage]: e.target.value
                                                                  }
                                                    }))
                                                }
                                                placeholder="Campaign subject"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-preview-text">
                                                Preview Text{' '}
                                                {availableLanguages.length > 1 &&
                                                    `(${languageLabels[selectedLanguage]})`}
                                            </Label>
                                            <Input
                                                id="edit-preview-text"
                                                value={
                                                    typeof editCampaignData.previewText === 'object'
                                                        ? editCampaignData.previewText[selectedLanguage] || ''
                                                        : editCampaignData.previewText || ''
                                                }
                                                onChange={(e) =>
                                                    setEditCampaignData((prev) => ({
                                                        ...prev,
                                                        previewText:
                                                            typeof prev.previewText === 'object'
                                                                ? {
                                                                      ...prev.previewText,
                                                                      [selectedLanguage]: e.target.value
                                                                  }
                                                                : {
                                                                      [selectedLanguage]: e.target.value
                                                                  }
                                                    }))
                                                }
                                                placeholder="Preview text"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-content">
                                                Content{' '}
                                                {availableLanguages.length > 1 &&
                                                    `(${languageLabels[selectedLanguage]})`}
                                            </Label>
                                            <RichTextEditor
                                                value={
                                                    typeof editCampaignData.content === 'object'
                                                        ? editCampaignData.content[selectedLanguage] || ''
                                                        : editCampaignData.content || ''
                                                }
                                                onChange={(value) =>
                                                    setEditCampaignData((prev) => ({
                                                        ...prev,
                                                        content:
                                                            typeof prev.content === 'object'
                                                                ? {
                                                                      ...prev.content,
                                                                      [selectedLanguage]: value
                                                                  }
                                                                : {
                                                                      [selectedLanguage]: value
                                                                  }
                                                    }))
                                                }
                                                placeholder="Email content"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <Label htmlFor="edit-message">
                                            Message{' '}
                                            {availableLanguages.length > 1 &&
                                                `(${languageLabels[selectedLanguage]})`}
                                        </Label>
                                        <Textarea
                                            id="edit-message"
                                            value={
                                                typeof editCampaignData.message === 'object'
                                                    ? editCampaignData.message[selectedLanguage] || ''
                                                    : editCampaignData.message || ''
                                            }
                                            onChange={(e) =>
                                                setEditCampaignData((prev) => ({
                                                    ...prev,
                                                    message:
                                                        typeof prev.message === 'object'
                                                            ? {
                                                                  ...prev.message,
                                                                  [selectedLanguage]: e.target.value
                                                              }
                                                            : {
                                                                  [selectedLanguage]: e.target.value
                                                              }
                                                }))
                                            }
                                            placeholder="SMS message"
                                            rows={5}
                                        />
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Characters:{' '}
                                            {
                                                (
                                                    typeof editCampaignData.message === 'object'
                                                        ? editCampaignData.message[selectedLanguage] || ''
                                                        : editCampaignData.message || ''
                                                )?.length || 0
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={handleEditCampaign} className="w-full">
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Campaign Dialog */}
                <Dialog
                    open={isCreatingCampaign}
                    onOpenChange={(open) => {
                        if (open) {
                            loadTemplates(newCampaign.type);
                        } else {
                            setIsCreatingCampaign(false);
                            setSelectedTemplate('custom');
                            setAvailableTemplates([]);
                        }
                    }}>
                    <DialogTrigger asChild>
                        <Button style={{display: 'none'}}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Campaign
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div className="sm:max-w-1/2">
                                    <DialogTitle>Create Campaign</DialogTitle>
                                    <DialogDescription>Create a new email or SMS campaign</DialogDescription>
                                </div>
                                {availableLanguages.length > 1 && (
                                    <div className="flex items-center gap-2 sm:absolute sm:top-5 sm:right-16">
                                        <Languages className="h-4 w-4 text-muted-foreground" />
                                        <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                                            <SelectTrigger className="w-35">
                                                <SelectValue placeholder="Language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableLanguages.map((lang) => (
                                                    <SelectItem key={lang} value={lang}>
                                                        {languageLabels[lang] || lang.toUpperCase()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="campaign-type">Campaign Type</Label>
                                <Select
                                    value={newCampaign.type}
                                    onValueChange={(value) => {
                                        setNewCampaign((prev) => ({ ...prev, type: value }));
                                        loadTemplates(value);
                                    }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Email Campaign
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="sms">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4" />
                                                SMS Campaign
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="campaign-template">Use Template (Optional)</Label>
                                <Select value={selectedTemplate} onValueChange={handleTemplateSelection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">
                                            <div className="flex items-center gap-2">
                                                <span>✏️</span>
                                                Custom / Blank
                                            </div>
                                        </SelectItem>
                                        {availableTemplates.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{template.thumbnail || '📧'}</span>
                                                    {template.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="campaign-subject">
                                    {newCampaign.type === 'sms' ? 'Campaign Name' : 'Subject'}{' '}
                                    {availableLanguages.length > 1 && `(${languageLabels[selectedLanguage]})`}
                                </Label>
                                <Input
                                    id="campaign-subject"
                                    value={newCampaign.subject[selectedLanguage] || ''}
                                    onChange={(e) =>
                                        setNewCampaign((prev) => ({
                                            ...prev,
                                            subject: { ...prev.subject, [selectedLanguage]: e.target.value }
                                        }))
                                    }
                                    placeholder={
                                        newCampaign.type === 'sms' ? 'Campaign name...' : 'Email subject line...'
                                    }
                                />
                            </div>

                            {/* Preview text for email only */}
                            {newCampaign.type === 'email' && (
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="campaign-preview-text">
                                        Preview Text{' '}
                                        {availableLanguages.length > 1 && `(${languageLabels[selectedLanguage]})`}
                                    </Label>
                                    <Input
                                        id="campaign-preview-text"
                                        value={newCampaign.previewText[selectedLanguage] || ''}
                                        onChange={(e) =>
                                            setNewCampaign((prev) => ({
                                                ...prev,
                                                previewText: {
                                                    ...prev.previewText,
                                                    [selectedLanguage]: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="Preview text that appears in email clients..."
                                    />
                                </div>
                            )}

                            {/* Content / Message */}
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="campaign-content">
                                    {newCampaign.type === 'sms' ? 'Message' : 'Content'}{' '}
                                    {availableLanguages.length > 1 && `(${languageLabels[selectedLanguage]})`}
                                </Label>
                                {newCampaign.type === 'sms' ? (
                                    <>
                                        <Textarea
                                            id="campaign-content"
                                            value={newCampaign.message[selectedLanguage] || ''}
                                            onChange={(e) =>
                                                setNewCampaign((prev) => ({
                                                    ...prev,
                                                    message: {
                                                        ...prev.message,
                                                        [selectedLanguage]: e.target.value
                                                    }
                                                }))
                                            }
                                            placeholder="SMS message content..."
                                            rows={3}
                                            maxLength={160}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            {(newCampaign.message[selectedLanguage] || '').length} / 160 characters
                                        </p>
                                    </>
                                ) : (
                                    <RichTextEditor
                                        value={newCampaign.content[selectedLanguage] || ''}
                                        onChange={(content) =>
                                            setNewCampaign((prev) => ({
                                                ...prev,
                                                content: { ...prev.content, [selectedLanguage]: content }
                                            }))
                                        }
                                        placeholder="Email content..."
                                    />
                                )}
                            </div>
                            {!isSubmittingCampaign && newCampaign.type && (
                                <div className="text-sm text-muted-foreground">
                                    <p>
                                        {newCampaign.type === 'sms'
                                            ? '📱 SMS campaigns will be sent via SMS to subscribers with phone numbers'
                                            : '📧 Email campaigns will be sent via email to all subscribers'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="relative z-50">
                            <Button onClick={handleCreateCampaign} disabled={isSubmittingCampaign}>
                                {isSubmittingCampaign ? 'Creating...' : 'Create Campaign'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
