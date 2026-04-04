// @/app/(backend)/admin/system/settings/page.client.jsx
'use client';

import {
    BarChart,
    Bot,
    Boxes,
    Building,
    CalendarDays,
    Clock3,
    Eye,
    EyeOff,
    Globe,
    Globe2,
    HardDrive,
    Image,
    Key,
    Link as LinkIcon,
    Locate,
    Mail,
    MapPin,
    MessageSquare,
    Plus,
    Save,
    Search,
    Settings,
    Share2,
    Shield,
    Trash2,
    Star,
    Upload
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
    FaDiscord,
    FaFacebook,
    FaGithub,
    FaInstagram,
    FaLinkedin,
    FaPinterest,
    FaReddit,
    FaTelegram,
    FaTiktok,
    FaWhatsapp,
    FaXTwitter,
    FaYoutube,
    FaGoogle
} from 'react-icons/fa6';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { updateSiteSettings, uploadFiles } from '@/lib/server/admin.js';
import { sendTestEmail } from '@/lib/server/email';
import { getSettings } from '@/lib/server/settings.js';
import { sendTestSMS } from '@/lib/server/sms';
import { clearWeb3ConfigCache } from '@/lib/server/web3.js';
import { generateKeywords } from '@/lib/shared/helpers';
import AdminHeader from '../../components/AdminHeader';

// Email providers
const emailProviders = [
    { id: 'none', name: 'None', service: null },
    { id: 'gmail', name: 'Gmail', service: 'gmail' },
    { id: 'custom', name: 'Custom SMTP', service: null }
];

// OAuth providers
const oauthProviders = [
    { id: 'google', name: 'Google', icon: FaGoogle },
    { id: 'github', name: 'GitHub', icon: FaGithub },
    { id: 'facebook', name: 'Facebook', icon: FaFacebook },
    { id: 'twitter', name: 'X (Twitter)', icon: FaXTwitter },
    { id: 'discord', name: 'Discord', icon: FaDiscord },
    { id: 'linkedin', name: 'LinkedIn', icon: FaLinkedin }
];

const knownSocialNetworkOptions = [
    { id: 'facebook', name: 'Facebook', icon: FaFacebook },
    { id: 'instagram', name: 'Instagram', icon: FaInstagram },
    { id: 'x', name: 'X (Twitter)', icon: FaXTwitter },
    { id: 'linkedin', name: 'LinkedIn', icon: FaLinkedin },
    { id: 'youtube', name: 'YouTube', icon: FaYoutube },
    { id: 'tiktok', name: 'TikTok', icon: FaTiktok },
    { id: 'discord', name: 'Discord', icon: FaDiscord },
    { id: 'telegram', name: 'Telegram', icon: FaTelegram },
    { id: 'whatsapp', name: 'WhatsApp', icon: FaWhatsapp },
    { id: 'pinterest', name: 'Pinterest', icon: FaPinterest },
    { id: 'reddit', name: 'Reddit', icon: FaReddit }
];

const knownSocialNetworkIdSet = new Set(knownSocialNetworkOptions.map((network) => network.id));

// Currency options
const currencies = [
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
    { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc (Fr)', symbol: 'Fr' },
    { code: 'CAD', name: 'Canadian Dollar (C$)', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$' },
    { code: 'CNY', name: 'Chinese Yuan (¥)', symbol: '¥' },
    { code: 'BRL', name: 'Brazilian Real (R$)', symbol: 'R$' },
    { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
    { code: 'MXN', name: 'Mexican Peso ($)', symbol: '$' },
    { code: 'ZAR', name: 'South African Rand (R)', symbol: 'R' },
    { code: 'SEK', name: 'Swedish Krona (kr)', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone (kr)', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone (kr)', symbol: 'kr' },
    { code: 'PLN', name: 'Polish Zloty (zł)', symbol: 'zł' },
    { code: 'CZK', name: 'Czech Koruna (Kč)', symbol: 'Kč' },
    { code: 'HUF', name: 'Hungarian Forint (Ft)', symbol: 'Ft' },
    { code: 'RON', name: 'Romanian Leu (lei)', symbol: 'lei' },
    { code: 'TRY', name: 'Turkish Lira (₺)', symbol: '₺' },
    { code: 'AED', name: 'UAE Dirham (د.إ)', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal (﷼)', symbol: '﷼' },
    { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar (HK$)', symbol: 'HK$' },
    { code: 'NZD', name: 'New Zealand Dollar (NZ$)', symbol: 'NZ$' },
    { code: 'KRW', name: 'South Korean Won (₩)', symbol: '₩' },
    { code: 'THB', name: 'Thai Baht (฿)', symbol: '฿' },
    { code: 'MYR', name: 'Malaysian Ringgit (RM)', symbol: 'RM' },
    { code: 'IDR', name: 'Indonesian Rupiah (Rp)', symbol: 'Rp' },
    { code: 'PHP', name: 'Philippine Peso (₱)', symbol: '₱' },
    { code: 'VND', name: 'Vietnamese Dong (₫)', symbol: '₫' }
];

const windowDefined = typeof window !== 'undefined';
const dfltBaseUrl = windowDefined ? window.location.protocol + '//' + window.location.host : null;

export default function SystemSettingsPageClient({ initialSettings, backendLanguages, backendLanguagesFound }) {
    const t = useTranslations('Admin.Settings');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('site');

    // Extract language codes from formatted language objects
    const backendLanguageCodes = backendLanguages?.map(lang => lang.code) || ['en'];
    const backendLanguagesFoundCodes = backendLanguagesFound?.map(lang => lang.code) || ['en'];

    // Ensure selected language is from available languages
    const defaultLanguage = initialSettings?.language || 'en';

    const defaultAdminLanguage = backendLanguageCodes.includes(initialSettings?.adminLanguage) 
        ? initialSettings.adminLanguage 
        : backendLanguagesFoundCodes.includes(initialSettings?.adminLanguage)
            ? initialSettings.adminLanguage
            : backendLanguageCodes[0] || backendLanguagesFoundCodes[0];

    const form = useForm({
        defaultValues: {
            siteName: initialSettings?.siteName || '',
            siteEmail: initialSettings?.siteEmail || '',
            sitePhone: initialSettings?.sitePhone || '',
            businessAddress: initialSettings?.businessAddress || '',
            businessCity: initialSettings?.businessCity || '',
            businessCp: initialSettings?.businessCp || '',
            siteLogo: initialSettings?.siteLogo || '',
            latitude: initialSettings?.latitude,
            longitude: initialSettings?.longitude,
            country: initialSettings?.country || '',
            countryIso: initialSettings?.countryIso || '',
            currency: initialSettings?.currency || 'EUR',
            language: defaultLanguage,
            languages: initialSettings?.languages || [defaultLanguage],
            adminLanguage: defaultAdminLanguage,
            adminLanguages: backendLanguageCodes,
            socialNetworks: initialSettings?.socialNetworks || [],
            workingHours: initialSettings?.workingHours || [],
            serviceArea: initialSettings?.serviceArea || '',
            serviceRadius: initialSettings?.serviceRadius,
            siteTitle: initialSettings?.siteTitle || '',
            siteDescription: initialSettings?.siteDescription || '',
            siteKeywords: initialSettings?.siteKeywords || '',
            ogImage: initialSettings?.ogImage || '',
            canonicalUrl: '',
            smsEnabled: initialSettings?.smsEnabled || false,
            twilioAccountSid: initialSettings?.twilioAccountSid || '',
            twilioAuthToken: initialSettings?.twilioAuthToken || '',
            twilioPhoneNumber: initialSettings?.twilioPhoneNumber || '',
            googleMapsEnabled: initialSettings?.googleMapsEnabled || false,
            googleMapsApiKey: initialSettings?.googleMapsApiKey || '',
            turnstileEnabled: initialSettings?.turnstileEnabled || false,
            turnstileSiteKey: initialSettings?.turnstileSiteKey || '',
            emailProvider: initialSettings?.emailProvider || 'none',
            emailUser: initialSettings?.emailUser || '',
            emailPass: initialSettings?.emailPass || '',
            smtpHost: initialSettings?.smtpHost || '',
            smtpPort: initialSettings?.smtpPort || 587,
            smtpSecure: initialSettings?.smtpSecure || false,
            allowRegistration: initialSettings?.allowRegistration ?? true,
            enableFrontend: initialSettings?.enableFrontend ?? true,
            baseUrl: initialSettings?.baseUrl || dfltBaseUrl || '',
            providers:
                initialSettings?.providers ||
                oauthProviders.reduce(
                    (acc, provider) => ({
                        ...acc,
                        [provider.id]: { clientId: '', clientSecret: '', enabled: false }
                    }),
                    {}
                ),
            web3Active: initialSettings?.web3Active || false,
            web3ContractAddress: initialSettings?.web3ContractAddress || '',
            web3ContractSymbol: initialSettings?.web3ContractSymbol || '',
            web3ChainSymbol: initialSettings?.web3ChainSymbol || '',
            web3InfuraRpc: initialSettings?.web3InfuraRpc || '',
            web3ChainId: initialSettings?.web3ChainId || 1,
            web3NetworkName: initialSettings?.web3NetworkName || 'Ethereum Mainnet',
            googleAnalyticsEnabled: initialSettings?.googleAnalyticsEnabled || false,
            googleAnalyticsApiKey: initialSettings?.googleAnalyticsApiKey || '',
            aiEnabled: initialSettings?.aiEnabled || false,
            replicateApiKey: initialSettings?.replicateApiKey || '',
            s3Enabled: initialSettings?.s3?.enabled || false,
            s3Endpoint: initialSettings?.s3?.endpoint || '',
            s3Region: initialSettings?.s3?.region || 'auto',
            s3AccessKey: initialSettings?.s3?.accessKey || '',
            s3SecretKey: initialSettings?.s3?.secretKey || '',
            s3Bucket: initialSettings?.s3?.bucket || '',
            s3PublicUrl: initialSettings?.s3?.publicUrl || ''
        }
    });

    const { formState } = form;

    const onSubmit = async (data) => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);

            if (!data.siteName || !data.siteEmail) {
                toast.error(t('toasts.siteNameEmailRequired'));
                return;
            }

            if (!data.country || !data.countryIso) {
                toast.error(t('toasts.countryRequired'));
                return;
            }

            // Validate Web3 configuration if enabled
            if (data.web3Active) {
                const web3RequiredFields = {
                    web3ContractAddress: 'Contract Address',
                    web3ContractSymbol: 'Contract Symbol',
                    web3ChainSymbol: 'Chain Symbol',
                    web3InfuraRpc: 'RPC URL',
                    web3NetworkName: 'Network Name'
                };

                const emptyFields = [];
                for (const [field, label] of Object.entries(web3RequiredFields)) {
                    if (!data[field] || data[field].trim() === '') {
                        emptyFields.push(label);
                    }
                }

                if (emptyFields.length > 0) {
                    // Disable Web3 and continue saving other settings
                    data.web3Active = false;
                }
            }

            // Force providers disabled if clientId or clientSecret is missing
            if (data.providers && typeof data.providers === 'object') {
                for (const providerId of Object.keys(data.providers)) {
                    const p = data.providers[providerId];
                    if (!p.clientId?.trim() || !p.clientSecret?.trim()) {
                        data.providers[providerId] = { ...p, enabled: false };
                    }
                }
            }

            const cleanData = {
                ...data,
                emailPass: data.emailPass ? data.emailPass.replace(/\s+/g, '') : data.emailPass,
                latitude: data.latitude ? parseFloat(data.latitude) : undefined,
                longitude: data.longitude ? parseFloat(data.longitude) : undefined,
                serviceRadius: data.serviceRadius ? parseInt(data.serviceRadius, 10) : undefined,
                smtpPort: data.smtpPort ? parseInt(data.smtpPort, 10) : 587,
                web3ChainId: data.web3ChainId ? parseInt(data.web3ChainId, 10) : 1,
                socialNetworks: data.socialNetworks || [],
                workingHours: data.workingHours || []
            };

            // Handle S3 storage configuration
            const s3 = {
                enabled: !!data.s3Enabled,
                endpoint: data.s3Endpoint || '',
                region: data.s3Region || 'auto',
                accessKey: data.s3AccessKey || '',
                secretKey: data.s3SecretKey || '',
                bucket: data.s3Bucket || '',
                publicUrl: data.s3PublicUrl || ''
            };
            cleanData.s3 = s3;
            delete cleanData.s3Enabled;
            delete cleanData.s3Endpoint;
            delete cleanData.s3Region;
            delete cleanData.s3AccessKey;
            delete cleanData.s3SecretKey;
            delete cleanData.s3Bucket;
            delete cleanData.s3PublicUrl;

            const web3 = {
                active: !!data.web3Active,
                contractAddress: data.web3ContractAddress || '',
                contractSymbol: data.web3ContractSymbol || '',
                chainSymbol: data.web3ChainSymbol || '',
                infuraRpc: data.web3InfuraRpc || '',
                chainId: data.web3ChainId ? parseInt(data.web3ChainId, 10) : 1,
                networkName: data.web3NetworkName || 'Ethereum Mainnet'
            };

            cleanData.web3 = web3;
            delete cleanData.web3Active;
            delete cleanData.web3ContractAddress;
            delete cleanData.web3ContractSymbol;
            delete cleanData.web3ChainSymbol;
            delete cleanData.web3InfuraRpc;
            delete cleanData.web3ChainId;
            delete cleanData.web3NetworkName;

            const dataWithId = {
                ...cleanData,
                id: 'site_settings'
            };

            const result = await updateSiteSettings(dataWithId);

            if (result?.success) {
                toast.success(t('toasts.settingsUpdated'));

                // Sync providers enabled state in form after auto-correction
                if (cleanData.providers && typeof cleanData.providers === 'object') {
                    for (const providerId of Object.keys(cleanData.providers)) {
                        form.setValue(`providers.${providerId}.enabled`, cleanData.providers[providerId].enabled, { shouldDirty: false });
                    }
                }

                // Refetch settings to update cache and form with new data
                try {
                    const updatedSettings = await getSettings();
                    if (updatedSettings?.adminSiteSettings) {
                        // Update form with fresh data from server
                        const freshSettings = updatedSettings.adminSiteSettings;
                        Object.keys(freshSettings).forEach((key) => {
                            if (form.getValues(key) !== undefined) {
                                form.setValue(key, freshSettings[key]);
                            }
                        });
                    }
                } catch (error) {
                    toast.error(t('toasts.failedRefetchSettings'), error);
                }
            } else {
                toast.error(result?.error || t('toasts.failedSaveSettings'));
            }

            try {
                await clearWeb3ConfigCache();
            } catch (error) {
                toast.error(t('toasts.failedClearWeb3Cache'), error);
            }
        } catch (error) {
            toast.error(error.message || t('toasts.failedSaveSettings'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const onFormError = (errors) => {
        const errorMessages = [];

        const collectErrors = (obj, prefix = '') => {
            Object.entries(obj).forEach(([key, value]) => {
                if (value.message) {
                    errorMessages.push(value.message);
                } else if (typeof value === 'object') {
                    collectErrors(value, prefix ? `${prefix}.${key}` : key);
                }
            });
        };

        collectErrors(errors);

        if (errorMessages.length > 0) {
            toast.error(errorMessages[0]);
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    form.setValue('latitude', position.coords.latitude);
                    form.setValue('longitude', position.coords.longitude);
                    toast.success(t('toasts.locationDetected'));
                },
                (error) => {
                    toast.error(t('toasts.failedGetLocation'));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 600000
                }
            );
        } else {
            toast.error(t('toasts.geolocationNotSupported'));
        }
    };

    return (
        <div className="space-y-4">
            <AdminHeader title={t('header.title')} description={t('header.description')} />

            <div className="relative">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                            <TabsList disabled={isSubmitting}>
                                <TabsTrigger value="site" className="flex items-center gap-2" disabled={isSubmitting}>
                                    <Settings className="h-4 w-4" />
                                    {t('tabs.site')}
                                </TabsTrigger>
                                <TabsTrigger value="seo" className="flex items-center gap-2" disabled={isSubmitting}>
                                    <Search className="h-4 w-4" />
                                    {t('tabs.seo')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="location"
                                    className="flex items-center gap-2"
                                    disabled={isSubmitting}>
                                    <MapPin className="h-4 w-4" />
                                    {t('tabs.location')}
                                </TabsTrigger>
                                <TabsTrigger value="language" className="flex items-center gap-2" disabled={isSubmitting}>
                                    <Globe className="h-4 w-4" />
                                    {t('tabs.language')}
                                </TabsTrigger>
                                <TabsTrigger value="social" className="flex items-center gap-2" disabled={isSubmitting}>
                                    <Share2 className="h-4 w-4" />
                                    {t('tabs.social')}
                                </TabsTrigger>
                                <TabsTrigger value="email" disabled={isSubmitting}>
                                    <Mail className="h-4 w-4" />
                                    {t('tabs.email')}
                                </TabsTrigger>
                                <TabsTrigger value="sms" disabled={isSubmitting}>
                                    <MessageSquare className="h-4 w-4" />
                                    {t('tabs.sms')}
                                </TabsTrigger>
                                <TabsTrigger value="oauth" disabled={isSubmitting}>
                                    <Shield className="h-4 w-4" />
                                    {t('tabs.oauth')}
                                </TabsTrigger>
                                <TabsTrigger value="web3" disabled={isSubmitting}>
                                    <Boxes className="h-4 w-4" />
                                    {t('tabs.web3')}
                                </TabsTrigger>
                                <TabsTrigger value="security" disabled={isSubmitting}>
                                    <Key className="h-4 w-4" />
                                    {t('tabs.security')}
                                </TabsTrigger>
                                <TabsTrigger value="services" disabled={isSubmitting}>
                                    <BarChart className="h-4 w-4" />
                                    {t('tabs.services')}
                                </TabsTrigger>
                                <TabsTrigger value="storage" disabled={isSubmitting}>
                                    <HardDrive className="h-4 w-4" />
                                    {t('tabs.storage')}
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="flex items-center gap-2" disabled={isSubmitting}>
                                    <Bot className="h-4 w-4" />
                                    AI
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="site" className="space-y-6">
                                <SiteSettingsTab
                                    form={form}
                                    t={t}
                                    getCurrentLocation={getCurrentLocation}
                                    isSubmitting={isSubmitting}
                                />
                            </TabsContent>

                            <TabsContent value="email" className="space-y-6">
                                <EmailSettingsTab
                                    form={form}
                                    t={t}
                                    emailProviders={emailProviders}
                                    isSubmitting={isSubmitting}
                                />
                            </TabsContent>

                            <TabsContent value="oauth" className="space-y-6">
                                <OAuthTab form={form} t={t} oauthProviders={oauthProviders} isSubmitting={isSubmitting} />
                            </TabsContent>

                            <TabsContent value="web3" className="space-y-6">
                                <Web3Tab form={form} t={t} isSubmitting={isSubmitting} />
                            </TabsContent>

                            <TabsContent value="sms" className="space-y-6">
                                <SMSSettingsTab form={form} t={t} isSubmitting={isSubmitting} />
                            </TabsContent>

                            <TabsContent value="location" className="space-y-6">
                                <LocationTab
                                    form={form}
                                    t={t}
                                    getCurrentLocation={getCurrentLocation}
                                    isSubmitting={isSubmitting}
                                />
                            </TabsContent>

                            <TabsContent value="language" className="space-y-6">
                                <LanguageTab
                                    form={form}
                                    t={t}
                                    isSubmitting={isSubmitting}
                                    backendLanguagesFound={backendLanguagesFound}
                                />
                            </TabsContent>

                            <TabsContent value="security" className="space-y-6">
                                <SecurityTab form={form} t={t} isSubmitting={isSubmitting} />
                            </TabsContent>

                            <TabsContent value="seo" className="space-y-6">
                                <SEOTab form={form} t={t} isSubmitting={isSubmitting} />
                            </TabsContent>

                            <TabsContent value="social" className="space-y-6">
                                <SocialTab form={form} t={t} isSubmitting={isSubmitting} />
                            </TabsContent>

                            <TabsContent value="services" className="space-y-6">
                                <ServicesTab form={form} t={t} isSubmitting={isSubmitting} />
                            </TabsContent>

                            <TabsContent value="storage" className="space-y-6">
                                <StorageTab form={form} t={t} isSubmitting={isSubmitting} />
                            </TabsContent>

                            <TabsContent value="ai" className="space-y-6">
                                <AITab form={form} t={t} isSubmitting={isSubmitting} />
                            </TabsContent>
                        </Tabs>

                        <div className="right-0 bottom-0 left-0 z-10 mb-6 flex justify-center fixed md:ml-64">
                            <Button
                                className="w-auto"
                                type="submit"
                                size="lg"
                                disabled={!formState.isDirty || isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2 dark:border-black"></div>
                                        {t('actions.saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-1 h-4 w-4" />
                                        {t('actions.saveChanges')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>

                {isSubmitting && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/50">
                        <div className="flex flex-col items-center gap-4 rounded-lg border bg-background p-6 shadow-lg">
                            <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
                            <p className="text-muted text-sm">{t('actions.savingSettings')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// SMS Settings Tab
function SMSSettingsTab({ form, t, isSubmitting }) {
    const smsEnabled = form.watch('smsEnabled');
    const [showAccountSid, setShowAccountSid] = useState(false);
    const [showAuthToken, setShowAuthToken] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testPhone, setTestPhone] = useState('');

    const handleTestSMS = async () => {
        if (!testPhone) {
            toast.error(t('toasts.phoneNumberRequired'));
            return;
        }

        setIsTesting(true);
        try {
            const result = await sendTestSMS(testPhone);

            if (result?.success) {
                toast.success(result.message || t('toasts.testSmsSent'));
                // Show additional details if available
                if (result.details) {
                    console.log('SMS test details:', result.details);
                }
            } else {
                // Show error with details
                const errorMessage = result?.error || t('toasts.failedSendTestSms');
                const errorDetails = result?.details;
                
                if (errorDetails) {
                    toast.error(`${errorMessage}: ${errorDetails}`);
                } else {
                    toast.error(errorMessage);
                }
            }
        } catch (error) {
            console.error('Test SMS error:', error);
            toast.error(error.message || t('toasts.failedSendTestSms'));
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {t('sms.title')}
                </CardTitle>
                <CardDescription>{t('sms.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <FormField
                    control={form.control}
                    name="smsEnabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">{t('sms.enableSms')}</FormLabel>
                                <FormDescription>{t('sms.enableSmsDescription')}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {smsEnabled && (
                    <>
                        <FormField
                            control={form.control}
                            name="twilioAccountSid"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('sms.twilioAccountSid')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showAccountSid ? 'text' : 'password'}
                                                placeholder={t('sms.twilioAccountSidPlaceholder')}
                                                disabled={isSubmitting}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowAccountSid(!showAccountSid)}
                                                disabled={isSubmitting}>
                                                {showAccountSid ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>{t('sms.twilioAccountSidDescription')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="twilioAuthToken"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('sms.twilioAuthToken')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showAuthToken ? 'text' : 'password'}
                                                placeholder={t('sms.twilioAuthTokenPlaceholder')}
                                                disabled={isSubmitting}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowAuthToken(!showAuthToken)}
                                                disabled={isSubmitting}>
                                                {showAuthToken ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>{t('sms.twilioAuthTokenDescription')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="twilioPhoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('sms.twilioPhoneNumber')}</FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            disabled={isSubmitting}
                                            placeholder={t('sms.twilioPhoneNumberPlaceholder')}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('sms.twilioPhoneNumberDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="rounded-lg border bg-muted/10 p-4">
                            <h4 className="mb-4 font-medium">{t('sms.testSmsConfig')}</h4>
                            <p className="text-muted mb-4 text-sm">
                                {t('sms.testSmsDescription')}
                            </p>
                            <div className="flex gap-2">
                                <PhoneInput
                                    value={testPhone}
                                    onChange={setTestPhone}
                                    disabled={isTesting || isSubmitting}
                                    placeholder={t('sms.testSmsPlaceholder')}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    onClick={handleTestSMS}
                                    disabled={isTesting || isSubmitting || !testPhone}
                                    variant="outline">
                                    {isTesting ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                            {t('sms.sendingTest')}
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            {t('sms.sendTest')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// Analytics Tab Component
function ServicesTab({ form, t, isSubmitting }) {
    const googleAnalyticsEnabled = form.watch('googleAnalyticsEnabled');
    const mapsEnabled = form.watch('googleMapsEnabled');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showMapsApiKey, setShowMapsApiKey] = useState(false);

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart className="h-5 w-5" />
                        {t('services.googleAnalytics.title')}
                    </CardTitle>
                    <CardDescription>
                        {t('services.googleAnalytics.enableAnalyticsDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="googleAnalyticsEnabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">{t('services.googleAnalytics.enableAnalytics')}</FormLabel>
                                    <FormDescription>
                                        {t('services.googleAnalytics.enableAnalyticsDescription')}
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        disabled={isSubmitting}
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {googleAnalyticsEnabled && (
                        <FormField
                            control={form.control}
                            name="googleAnalyticsApiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('services.googleAnalytics.measurementId')}</FormLabel>
                                    <FormDescription>
                                        {t('services.googleAnalytics.measurementIdDescription')}
                                    </FormDescription>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                disabled={isSubmitting}
                                                placeholder={t('services.googleAnalytics.measurementIdPlaceholder')}
                                                type={showApiKey ? 'text' : 'password'}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="top-0 right-0 absolute h-full"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                disabled={isSubmitting}>
                                                {showApiKey ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <div className="rounded-lg bg-muted/10 p-4">
                        <p className="text-muted text-sm">
                            <strong>{t('services.googleAnalytics.howToGetId')}</strong>
                        </p>
                        <ol className="mt-2 ml-4 list-decimal space-y-1 text-muted text-sm">
                            <li>{t('services.googleAnalytics.step1')}</li>
                            <li>{t('services.googleAnalytics.step2')}</li>
                            <li>{t('services.googleAnalytics.step3')}</li>
                            <li>{t('services.googleAnalytics.step4')}</li>
                            <li>{t('services.googleAnalytics.step5')}</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {t('services.googleMaps.title')}
                    </CardTitle>
                    <CardDescription>{t('services.googleMaps.description')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="googleMapsEnabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">{t('services.googleMaps.enableMaps')}</FormLabel>
                                    <FormDescription>
                                        {t('services.googleMaps.enableMapsDescription')}
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isSubmitting}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {mapsEnabled && (
                        <FormField
                            control={form.control}
                            name="googleMapsApiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('services.googleMaps.mapsApiKey')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showMapsApiKey ? 'text' : 'password'}
                                                placeholder={t('services.googleMaps.mapsApiKeyPlaceholder')}
                                                disabled={isSubmitting}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowMapsApiKey(!showMapsApiKey)}
                                                disabled={isSubmitting}>
                                                {showMapsApiKey ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Location Tab
function LocationTab({ form, t, getCurrentLocation, isSubmitting }) {
    const mapsEnabled = form.watch('googleMapsEnabled');
    const [showMapsApiKey, setShowMapsApiKey] = useState(false);

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {t('location.title')}
                    </CardTitle>
                    <CardDescription>{t('location.description')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="businessAddress"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('location.businessAddress')}</FormLabel>
                                <FormControl>
                                    <Textarea placeholder={t('location.businessAddressPlaceholder')} disabled={isSubmitting} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="businessCity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('location.city')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('location.cityPlaceholder')} disabled={isSubmitting} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="businessCp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('location.postalCode')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('location.postalCodePlaceholder')} disabled={isSubmitting} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="latitude"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('location.latitude')}</FormLabel>
                                    <FormControl>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                step="any"
                                                placeholder={t('location.latitudePlaceholder')}
                                                disabled={isSubmitting}
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value ? parseFloat(e.target.value) : undefined
                                                    )
                                                }
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={getCurrentLocation}
                                                disabled={isSubmitting}
                                                className="px-3"
                                                title={t('location.getCurrentLocation')}>
                                                <Locate className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="longitude"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('location.longitude')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder={t('location.longitudePlaceholder')}
                                            disabled={isSubmitting}
                                            value={field.value ?? ''}
                                            onChange={(e) =>
                                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="countryIso"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('location.country')}</FormLabel>
                                <FormControl>
                                    <CountryDropdown
                                        key={field.value}
                                        defaultValue={field.value}
                                        disabled={isSubmitting}
                                        onChange={(country) => {
                                            field.onChange(country.alpha2);
                                            form.setValue('country', country.name);
                                        }}
                                        placeholder={t('location.countryPlaceholder')}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('location.defaultLanguage')}</FormLabel>
                                <Select 
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        // Ensure the selected language is in the languages array
                                        const currentLanguages = form.getValues('languages') || [];
                                        if (!currentLanguages.includes(value)) {
                                            form.setValue('languages', [value, ...currentLanguages]);
                                        }
                                    }} 
                                    value={field.value} 
                                    disabled={isSubmitting}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('location.selectLanguage')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {(form.watch('languages') || [field.value]).map((langCode) => (
                                            <SelectItem key={langCode} value={langCode}>
                                                {new Intl.DisplayNames(['en'], { type: 'language' }).of(langCode) || langCode.toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>{t('location.defaultLanguageDescription')}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="serviceArea"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('location.serviceArea')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('location.serviceAreaPlaceholder')} disabled={isSubmitting} {...field} />
                                    </FormControl>
                                    <FormDescription>{t('location.serviceAreaDescription')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="serviceRadius"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('location.serviceRadius')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder={t('location.serviceRadiusPlaceholder')}
                                            disabled={isSubmitting}
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    e.target.value ? parseInt(e.target.value, 10) : undefined
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>{t('location.serviceRadiusDescription')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('location.defaultCurrency')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('location.selectCurrency')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {currencies.map((currency) => (
                                            <SelectItem key={currency.code} value={currency.code}>
                                                {currency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>{t('location.currencyDescription')}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

// Language Tab Component
function LanguageTab({ form, t, isSubmitting, backendLanguagesFound }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {t('language.title')}
                </CardTitle>
                <CardDescription>{t('language.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="adminLanguages"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('language.backendLanguages')}</FormLabel>
                                <FormControl>
                                    <MultiLanguageSelector
                                        t={t}
                                        languages={backendLanguagesFound}
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={isSubmitting}
                                        defaultLanguage={form.watch('adminLanguage')}
                                        onDefaultLanguageChange={(langCode) => {
                                            form.setValue('adminLanguage', langCode);
                                        }}
                                        readOnly={false}
                                    />
                                </FormControl>
                                <FormDescription>
                                    {t('language.backendLanguagesDescription')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

// Social Tab Component
function SocialTab({ form, t, isSubmitting }) {
    return <SocialNetworksSection form={form} t={t} isSubmitting={isSubmitting} />;
}

// Security Tab
function SecurityTab({ form, t, isSubmitting }) {
    const enabled = form.watch('turnstileEnabled');
    const [showTurnstileKey, setShowTurnstileKey] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('security.title')}
                </CardTitle>
                <CardDescription>{t('security.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <FormField
                    control={form.control}
                    name="turnstileEnabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">{t('security.enableTurnstile')}</FormLabel>
                                <FormDescription>{t('security.enableTurnstileDescription')}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {enabled && (
                    <FormField
                        control={form.control}
                        name="turnstileSiteKey"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('security.turnstileSiteKey')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showTurnstileKey ? 'text' : 'password'}
                                            placeholder={t('security.turnstileSiteKeyPlaceholder')}
                                            disabled={isSubmitting}
                                            {...field}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowTurnstileKey(!showTurnstileKey)}
                                            disabled={isSubmitting}>
                                            {showTurnstileKey ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control}
                    name="allowRegistration"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">{t('security.allowRegistration')}</FormLabel>
                                <FormDescription>{t('security.allowRegistrationDescription')}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="enableFrontend"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">{t('security.enableFrontend')}</FormLabel>
                                <FormDescription>{t('security.enableFrontendDescription')}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );
}

// SEO Tab Component
function SEOTab({ form, t, isSubmitting }) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [generatedSiteKeywords, setGeneratedSiteKeywords] = useState('');
    const [ogImageInputType, setOgImageInputType] = useState('file'); // 'file' or 'url'
    const siteTitle = form.watch('siteTitle') || '';
    const siteDescription = form.watch('siteDescription') || '';
    const currentOgImage = form.watch('ogImage');
    const ogImageToDisplay = currentOgImage || '/og-image.jpg';

    useEffect(() => {
        const keywords = generateKeywords(siteTitle, siteDescription, 10);
        const currentKeywords = form.getValues('siteKeywords') || '';

        if (keywords === generatedSiteKeywords && keywords === currentKeywords) {
            return;
        }

        setGeneratedSiteKeywords(keywords);

        if (keywords !== currentKeywords) {
            form.setValue('siteKeywords', keywords, {
                shouldDirty: true,
                shouldTouch: false,
                shouldValidate: false
            });
        }
    }, [siteTitle, siteDescription, generatedSiteKeywords, form]);

    const handleImageUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(t('toasts.invalidImageFile'));
            e.target.value = '';
            return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(t('toasts.imageTooLarge'));
            e.target.value = '';
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);

            // Simulate upload progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 100);

            const result = await uploadFiles([file], 'uploads/seo');

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (result?.success && result.files?.length > 0) {
                const uploadedFile = result.files[0];
                form.setValue('ogImage', uploadedFile.url);
                toast.success(t('toasts.ogImageUploaded'));
            } else {
                throw new Error(result?.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(t('toasts.failedUploadImage'));
        } finally {
            setUploading(false);
            setUploadProgress(0);
            e.target.value = '';
        }
    };

    const handleImageDelete = () => {
        form.setValue('ogImage', '');
        toast.success(t('toasts.ogImageRemoved'));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    {t('seo.title')}
                </CardTitle>
                <CardDescription>
                    {t('seo.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="siteTitle"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('seo.siteTitle')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('seo.siteTitlePlaceholder')} disabled={isSubmitting} {...field} />
                            </FormControl>
                            <FormDescription>
                                {t('seo.siteTitleDescription')}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="siteDescription"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('seo.siteDescription')}</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder={t('seo.siteDescriptionPlaceholder')}
                                    disabled={isSubmitting}
                                    rows={4}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                {t('seo.siteDescriptionDescription')}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="ogImage"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('seo.ogImage')}</FormLabel>
                            <FormControl>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('seo.uploadOgImage')}</Label>
                                        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted/10">
                                            <img
                                                src={ogImageToDisplay}
                                                alt="OG Image Preview"
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = '/og-image.jpg';
                                                }}
                                            />
                                            {currentOgImage && (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={handleImageDelete}
                                                    disabled={isSubmitting || uploading}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Radio Selection for Upload Method */}
                                    <div className="space-y-3">
                                        <Label>{t('seo.uploadMethod')}</Label>
                                        <RadioGroup value={ogImageInputType} onValueChange={setOgImageInputType}>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="file" id="og-file" />
                                                <Label htmlFor="og-file" className="cursor-pointer font-normal">
                                                    {t('seo.uploadImageFile')}
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="url" id="og-url" />
                                                <Label htmlFor="og-url" className="cursor-pointer font-normal">
                                                    {t('seo.enterImageUrl')}
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Conditional Input based on selection */}
                                    {ogImageInputType === 'file' ? (
                                        <div className="space-y-2">
                                            <input
                                                id="og-image-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                                disabled={isSubmitting || uploading}
                                                multiple={false}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={isSubmitting || uploading}
                                                onClick={() => document.getElementById('og-image-upload')?.click()}
                                                className="w-full sm:w-auto">
                                                {uploading ? (
                                                    <>
                                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                                                        {t('site.uploading')} {uploadProgress}%
                                                    </>
                                                ) : (
                                                    <>
                                                        <Image className="mr-2 h-4 w-4" />
                                                        {t('seo.uploadOgImage')}
                                                    </>
                                                )}
                                            </Button>
                                            {uploading && (
                                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-300"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label htmlFor="og-url-input">{t('seo.ogImageUrl')}</Label>
                                            <Input
                                                id="og-url-input"
                                                type="url"
                                                placeholder={t('seo.ogImageUrlPlaceholder')}
                                                disabled={isSubmitting}
                                                {...field}
                                            />
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            <FormDescription>
                                {t('seo.ogImageDescription')}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );
}

// Site Settings Tab Component
function SiteSettingsTab({ form, t, getCurrentLocation, isSubmitting }) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [logoInputType, setLogoInputType] = useState('file'); // 'file' or 'url'
    const currentLogo = form.watch('siteLogo');
    const logoToDisplay = currentLogo || '/next.svg';

    const handleLogoUpload = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(t('toasts.invalidLogoFile'));
            event.target.value = '';
            return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(t('toasts.logoTooLarge'));
            event.target.value = '';
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);

            // Simulate upload progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 100);

            const result = await uploadFiles([file], 'uploads/site');

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (result?.success && result.files?.length > 0) {
                const uploadedFile = result.files[0];
                form.setValue('siteLogo', uploadedFile.url);
                toast.success(t('toasts.logoUploaded'));
            } else {
                throw new Error(result?.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            toast.error(t('toasts.failedUploadLogo'));
        } finally {
            setUploading(false);
            setUploadProgress(0);
            event.target.value = '';
        }
    };

    const handleLogoDelete = () => {
        form.setValue('siteLogo', '');
        toast.success(t('toasts.logoRemoved'));
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        {t('site.title')}
                    </CardTitle>
                    <CardDescription>{t('site.description')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="siteName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('site.siteName')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('site.siteNamePlaceholder')} disabled={isSubmitting} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="siteEmail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('site.contactEmail')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder={t('site.contactEmailPlaceholder')}
                                            disabled={isSubmitting}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="sitePhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('site.contactPhone')}</FormLabel>
                                <FormControl>
                                    <PhoneInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={isSubmitting}
                                        placeholder={t('site.contactPhonePlaceholder')}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="siteLogo"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('site.siteLogo')}</FormLabel>
                                <FormControl>
                                    <div className="grid grid-cols-2 gap-2 md:gap-4 space-y-4 mt-2">
                                        <div className="space-y-2"> 
                                            <div className="relative flex h-24 w-24 items-center justify-center rounded-lg border bg-muted/10">
                                                <img
                                                    src={logoToDisplay}
                                                    alt={t('site.siteLogoAlt')}
                                                    className="h-full w-full object-contain p-2 rounded-lg"
                                                    onError={(e) => {
                                                        e.target.src = '/next.svg';
                                                    }}
                                                />
                                                {currentLogo && (
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                                        onClick={handleLogoDelete}
                                                        disabled={isSubmitting || uploading}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Radio Selection for Upload Method */}
                                            <div className="space-y-3">
                                                <Label>{t('site.uploadMethod')}</Label>
                                                <RadioGroup value={logoInputType} onValueChange={setLogoInputType}>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="file" id="logo-file" />
                                                        <Label
                                                            htmlFor="logo-file"
                                                            className="cursor-pointer font-normal">
                                                            {t('site.uploadImageFile')}
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="url" id="logo-url" />
                                                        <Label
                                                            htmlFor="logo-url"
                                                            className="cursor-pointer font-normal">
                                                            {t('site.enterImageUrl')}
                                                        </Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            {/* Conditional Input based on selection */}
                                            {logoInputType === 'file' ? (
                                                <div className="space-y-2">
                                                    <input
                                                        id="logo-upload"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleLogoUpload}
                                                        disabled={isSubmitting || uploading}
                                                        multiple={false}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={isSubmitting || uploading}
                                                        onClick={() => document.getElementById('logo-upload')?.click()}
                                                        className="w-full sm:w-auto">
                                                        {uploading ? (
                                                            <>
                                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                                                                {t('site.uploading')} {uploadProgress}%
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="mr-2 h-4 w-4" />
                                                                {t('site.uploadLogo')}
                                                            </>
                                                        )}
                                                    </Button>
                                                    {uploading && (
                                                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary transition-all duration-300"
                                                                style={{ width: `${uploadProgress}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label htmlFor="logo-url-input">{t('site.logoUrl')}</Label>
                                                    <Input
                                                        id="logo-url-input"
                                                        type="url"
                                                        placeholder={t('site.logoUrlPlaceholder')}
                                                        disabled={isSubmitting}
                                                        {...field}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </FormControl>
                                <FormDescription>
                                    {t('site.logoDescription')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <WorkingHoursSection form={form} t={t} isSubmitting={isSubmitting} />
        </div>
    );
}

// Email Settings Tab Component
function EmailSettingsTab({ form, t, emailProviders, isSubmitting }) {
    const selectedProvider = form.watch('emailProvider');
    const [isTesting, setIsTesting] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast.error(t('toasts.emailRequired'));
            return;
        }

        setIsTesting(true);
        try {
            const result = await sendTestEmail(testEmail);

            if (result?.success) {
                toast.success(result.message || t('toasts.testEmailSent'));
                // Show additional details if available
                if (result.details) {
                    console.log('Email test details:', result.details);
                }
            } else {
                // Show error with details
                const errorMessage = result?.error || 'Failed to send test email';
                const errorDetails = result?.details;
                
                if (errorDetails) {
                    toast.error(`${errorMessage}: ${errorDetails}`);
                } else {
                    toast.error(errorMessage);
                }
            }
        } catch (error) {
            console.error('Test email error:', error);
            toast.error(error.message || t('toasts.failedSendTestEmail'));
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {t('email.title')}
                </CardTitle>
                <CardDescription>{t('email.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <FormField
                    control={form.control}
                    name="emailProvider"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('email.emailProvider')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('email.selectEmailProvider')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {emailProviders.map((provider) => (
                                        <SelectItem key={provider.id} value={provider.id}>
                                            {provider.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                {t('email.emailProviderDescription')}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {selectedProvider !== 'none' && (
                    <>
                        {selectedProvider === 'custom' && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="smtpHost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('email.smtpHost')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('email.smtpHostPlaceholder')}
                                                    disabled={isSubmitting}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="smtpPort"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('email.smtpPort')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="587"
                                                    disabled={isSubmitting}
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.value ? parseInt(e.target.value, 10) : 587
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                            <FormDescription>{t('email.smtpPortDescription')}</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="emailUser"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('email.emailUser')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder={t('email.emailUserPlaceholder')}
                                            disabled={isSubmitting}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="emailPass"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('email.emailPass')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder={t('email.emailPassPlaceholder')}
                                                disabled={isSubmitting}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowPassword(!showPassword)}
                                                disabled={isSubmitting}>
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        {t('email.emailPassDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedProvider === 'custom' && (
                            <FormField
                                control={form.control}
                                name="smtpSecure"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">{t('email.smtpSecure')}</FormLabel>
                                            <FormDescription>{t('email.smtpSecureDescription')}</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="rounded-lg border bg-muted/10 p-4">
                            <h4 className="mb-4 font-medium">{t('email.testEmailConfig')}</h4>
                            <p className="text-muted mb-4 text-sm">
                                {t('email.testEmailDescription')}
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder={t('email.testEmailPlaceholder')}
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    disabled={isTesting || isSubmitting}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    onClick={handleTestEmail}
                                    disabled={isTesting || isSubmitting || !testEmail}
                                    variant="outline">
                                    {isTesting ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                            {t('email.sendingTest')}
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="mr-2 h-4 w-4" />
                                            {t('email.sendTest')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// OAuth Tab Component
function OAuthTab({ form, t, oauthProviders, isSubmitting }) {
    const [showSecrets, setShowSecrets] = useState({});

    const toggleSecret = (providerId) => {
        setShowSecrets((prev) => ({
            ...prev,
            [providerId]: !prev[providerId]
        }));
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {t('oauth.title')}
                    </CardTitle>
                    <CardDescription>{t('oauth.description')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="baseUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('security.baseUrl')}</FormLabel>
                                <FormControl>
                                    <Input disabled={true} placeholder={t('security.baseUrlPlaceholder')} {...field} />
                                </FormControl>
                                <FormDescription>
                                    {t('security.baseUrlDescription')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        {t('oauth.title')}
                    </CardTitle>
                    <CardDescription>{t('oauth.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                        {oauthProviders.map((provider) => {
                            const IconComponent = provider.icon;
                            const isEnabled = form.watch(`providers.${provider.id}.enabled`);
                            return (
                                <div key={provider.id} className="rounded-lg border p-4 h-min">
                                    <div className="flex items-center gap-2">
                                        <IconComponent className="h-5 w-5" />
                                        <h4 className="font-medium">{provider.name}</h4>
                                        <FormField
                                            control={form.control}
                                            name={`providers.${provider.id}.enabled`}
                                            render={({ field }) => (
                                                <FormItem className="ml-auto">
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                            disabled={isSubmitting}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {isEnabled && (
                                        <div className="mt-4 grid grid-cols-1 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`providers.${provider.id}.clientId`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t('oauth.clientId')}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder={t('oauth.clientIdPlaceholder')}
                                                                disabled={isSubmitting}
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`providers.${provider.id}.clientSecret`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t('oauth.clientSecret')}</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Input
                                                                    type={showSecrets[provider.id] ? 'text' : 'password'}
                                                                    placeholder={t('oauth.clientSecretPlaceholder')}
                                                                    disabled={isSubmitting}
                                                                    {...field}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                                                    onClick={() => toggleSecret(provider.id)}
                                                                    disabled={isSubmitting}>
                                                                    {showSecrets[provider.id] ? (
                                                                        <EyeOff className="h-4 w-4" />
                                                                    ) : (
                                                                        <Eye className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Social Networks Section Component
function SocialNetworksSection({ form, t, isSubmitting }) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'socialNetworks'
    });

    const normalizePlatform = (value) => String(value || '').trim().toLowerCase();

    const getSelectorValue = (platformValue) => {
        const normalized = normalizePlatform(platformValue);
        return knownSocialNetworkIdSet.has(normalized) ? normalized : 'other';
    };

    const getPlatformIcon = (platformValue) => {
        const normalized = normalizePlatform(platformValue);
        const matched = knownSocialNetworkOptions.find((network) => network.id === normalized);
        return matched?.icon || Globe2;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    {t('social.title')}
                </CardTitle>
                <CardDescription>{t('social.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border bg-muted/10 p-3 sm:p-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr_1.2fr_auto] md:items-start">

                        <FormField
                            control={form.control}
                            name={`socialNetworks.${index}.platform`}
                            render={({ field: platformField }) => (
                                <FormItem className="w-full">
                                    <FormLabel className="text-xs text-muted">
                                        {t('social.platformPlaceholder')}
                                    </FormLabel>
                                    <FormControl>
                                        <Select
                                            value={getSelectorValue(platformField.value)}
                                            onValueChange={(value) => {
                                                if (value === 'other') {
                                                    const normalized = normalizePlatform(platformField.value);
                                                    if (knownSocialNetworkIdSet.has(normalized)) {
                                                        platformField.onChange('');
                                                    }
                                                    return;
                                                }

                                                platformField.onChange(value);
                                            }}
                                            disabled={isSubmitting}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={t('social.platformPlaceholder')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {knownSocialNetworkOptions.map((network) => {
                                                    const IconComponent = network.icon;

                                                    return (
                                                        <SelectItem key={network.id} value={network.id}>
                                                            <span className="flex items-center gap-2">
                                                                <IconComponent className="h-4 w-4" />
                                                                {network.name}
                                                            </span>
                                                        </SelectItem>
                                                    );
                                                })}
                                                <SelectItem value="other">
                                                    <span className="flex items-center gap-2">
                                                        <Globe2 className="h-4 w-4" />
                                                        Other
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    {getSelectorValue(platformField.value) === 'other' && (
                                        <div className="mt-2">
                                            <Input
                                                value={platformField.value || ''}
                                                onChange={(event) => platformField.onChange(event.target.value)}
                                                placeholder={t('social.platformPlaceholder')}
                                                disabled={isSubmitting}
                                                className="w-full"
                                            />
                                        </div>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name={`socialNetworks.${index}.url`}
                            render={({ field: urlField }) => (
                                <FormItem className="w-full">
                                    <FormLabel className="text-xs text-muted">
                                        {t('social.urlPlaceholder')}
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <LinkIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
                                            <Input
                                                placeholder={t('social.urlPlaceholder')}
                                                disabled={isSubmitting}
                                                className="w-full pl-9"
                                                {...urlField}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={isSubmitting}
                            className="h-10 w-full max-w-min md:self-end">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ platform: 'facebook', url: '' })}
                    disabled={isSubmitting}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('social.addSocialNetwork')}
                </Button>
            </CardContent>
        </Card>
    );
}

// Working Hours Section Component
function WorkingHoursSection({ form, t, isSubmitting }) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'workingHours'
    });

    // All days in English (used for internal storage)
    const allDaysInternal = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Translated day names for display
    const daysOfWeekTranslated = {
        Monday: t('social.monday'),
        Tuesday: t('social.tuesday'),
        Wednesday: t('social.wednesday'),
        Thursday: t('social.thursday'),
        Friday: t('social.friday'),
        Saturday: t('social.saturday'),
        Sunday: t('social.sunday')
    };

    // Get currently used days to filter them out from the dropdown
    const usedDays = fields.map(field => field.day);
    
    // Filter available days (only show days not yet used)
    const availableDays = allDaysInternal.filter(day => !usedDays.includes(day));
    
    // Check if all days are used (disable "Add" button)
    const allDaysUsed = fields.length >= 7;

    // Handle adding new working hours with default times from previous entry
    const handleAddWorkingHours = () => {
        const lastEntry = fields[fields.length - 1];
        const defaultOpen = lastEntry?.open || '09:00';
        const defaultClose = lastEntry?.close || '17:00';
        
        append({ 
            day: '', 
            open: defaultOpen, 
            close: defaultClose 
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5" />
                    {t('social.workingHours')}
                </CardTitle>
                <CardDescription>{t('social.workingHoursDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => {
                    // For each row, show available days + current selected day
                    const availableDaysForThisRow = field.day 
                        ? [...availableDays, field.day]
                        : availableDays;

                    return (
                        <div key={field.id} className="rounded-lg border bg-muted/20 p-3 sm:p-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-end">
                                <FormField
                                    control={form.control}
                                    name={`workingHours.${index}.day`}
                                    render={({ field: formField }) => (
                                        <FormItem className="w-full">
                                            <FormLabel className="text-sm">{t('social.day')}</FormLabel>
                                            <Select 
                                                onValueChange={formField.onChange} 
                                                value={formField.value} 
                                                disabled={isSubmitting}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder={t('social.selectDay')}>
                                                            {formField.value ? (
                                                                <div className="flex items-center gap-2">
                                                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                                                    <span>{daysOfWeekTranslated[formField.value]}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                                    <CalendarDays className="h-4 w-4" />
                                                                    <span>{t('social.selectDay')}</span>
                                                                </div>
                                                            )}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {availableDaysForThisRow.length === 0 ? (
                                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                            {t('social.allDaysUsed') || 'All days are already in use'}
                                                        </div>
                                                    ) : (
                                                        availableDaysForThisRow.map((day) => (
                                                            <SelectItem key={day} value={day}>
                                                                {daysOfWeekTranslated[day]}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name={`workingHours.${index}.open`}
                                    render={({ field: formField }) => (
                                        <FormItem className="w-full">
                                            <FormLabel className="text-sm">{t('social.opens')}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Clock3 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        type="time"
                                                        disabled={isSubmitting}
                                                        className="w-full pl-9"
                                                        {...formField}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name={`workingHours.${index}.close`}
                                    render={({ field: formField }) => (
                                        <FormItem className="w-full">
                                            <FormLabel className="text-sm">{t('social.closes')}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Clock3 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        type="time"
                                                        disabled={isSubmitting}
                                                        className="w-full pl-9"
                                                        {...formField}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => remove(index)}
                                    disabled={isSubmitting}
                                    className="h-10 w-full md:w-auto">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddWorkingHours}
                    disabled={isSubmitting || allDaysUsed}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('social.addWorkingHours')}
                </Button>
                {allDaysUsed && (
                    <p className="text-sm text-muted-foreground">
                        {t('social.allDaysAdded') || 'All days have been added'}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

// Web3 Tab Component
function Web3Tab({ form, t, isSubmitting }) {
    const web3Active = form.watch('web3Active');

    const networkOptions = [
        { id: 1, name: 'Ethereum Mainnet' },
        { id: 5, name: 'Goerli Testnet' },
        { id: 11155111, name: 'Sepolia Testnet' },
        { id: 137, name: 'Polygon Mainnet' },
        { id: 80001, name: 'Mumbai Testnet' },
        { id: 56, name: 'BNB Smart Chain' },
        { id: 97, name: 'BNB Testnet' }
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Boxes className="h-5 w-5" />
                    {t('web3.title')}
                </CardTitle>
                <CardDescription>
                    {t('web3.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <FormField
                    control={form.control}
                    name="web3Active"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">{t('web3.enableWeb3')}</FormLabel>
                                <FormDescription>{t('web3.enableWeb3Description')}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {web3Active && (
                    <>
                        <FormField
                            control={form.control}
                            name="web3ChainId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('web3.blockchainNetwork')}</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            const selectedNetwork = networkOptions.find(
                                                (n) => n.id === parseInt(value)
                                            );
                                            field.onChange(parseInt(value));
                                            if (selectedNetwork) {
                                                form.setValue('web3NetworkName', selectedNetwork.name);
                                            }
                                        }}
                                        value={field.value?.toString()}
                                        disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('web3.selectBlockchain')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {networkOptions.map((network) => (
                                                <SelectItem key={network.id} value={network.id.toString()}>
                                                    {network.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>{t('web3.blockchainDescription')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="web3ContractAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('web3.contractAddress')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('web3.contractAddressPlaceholder')} disabled={isSubmitting} {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        {t('web3.contractAddressDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="web3ContractSymbol"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('web3.tokenSymbol')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('web3.tokenSymbolPlaceholder')} disabled={isSubmitting} {...field} />
                                        </FormControl>
                                        <FormDescription>{t('web3.tokenSymbolDescription')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="web3ChainSymbol"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('web3.chainSymbol')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('web3.chainSymbolPlaceholder')} disabled={isSubmitting} {...field} />
                                        </FormControl>
                                        <FormDescription>{t('web3.chainSymbolDescription')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="web3InfuraRpc"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('web3.rpcUrl')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('web3.rpcUrlPlaceholder')}
                                            disabled={isSubmitting}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('web3.rpcUrlDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// AI Tab Component
function AITab({ form, t, isSubmitting }) {
    const aiEnabled = form.watch('aiEnabled');
    const [showApiKey, setShowApiKey] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Agent Configuration
                </CardTitle>
                <CardDescription>
                    Configure AI agent using Replicate API for intelligent content generation and assistance.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <FormField
                    control={form.control}
                    name="aiEnabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Enable AI Agent</FormLabel>
                                <FormDescription>Enable AI-powered features throughout the platform</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {aiEnabled && (
                    <>
                        <div className="rounded-lg border bg-muted/10 p-4">
                            <p className="text-sm text-muted">
                                AI Agent requires a Replicate API key. Get your API key from{' '}
                                <a 
                                    href="https://replicate.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    replicate.com
                                </a>
                            </p>
                        </div>

                        <FormField
                            control={form.control}
                            name="replicateApiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Replicate API Key</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                type={showApiKey ? 'text' : 'password'}
                                                placeholder="r8_***********************************"
                                                disabled={isSubmitting} 
                                                {...field} 
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                disabled={isSubmitting}>
                                                {showApiKey ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Your Replicate API key is encrypted and stored securely. It's used to access AI models for content generation.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// Storage Tab Component
function StorageTab({ form, t, isSubmitting }) {
    const s3Enabled = form.watch('s3Enabled');
    const [showAccessKey, setShowAccessKey] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    {t('storage.title')}
                </CardTitle>
                <CardDescription>
                    {t('storage.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <FormField
                    control={form.control}
                    name="s3Enabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">{t('storage.enableS3')}</FormLabel>
                                <FormDescription>{t('storage.enableS3Description')}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {s3Enabled && (
                    <>
                        <div className="rounded-lg border bg-muted/10 p-4">
                            <p className="text-sm text-muted">
                                {t('storage.configNote')}
                            </p>
                        </div>

                        <FormField
                            control={form.control}
                            name="s3Endpoint"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('storage.endpoint')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="https://your-endpoint.r2.cloudflarestorage.com" 
                                            disabled={isSubmitting} 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('storage.endpointDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="s3Region"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('storage.region')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="auto" 
                                            disabled={isSubmitting} 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('storage.regionDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="s3AccessKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('storage.accessKey')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                type={showAccessKey ? 'text' : 'password'}
                                                placeholder={t('storage.accessKeyPlaceholder')}
                                                disabled={isSubmitting} 
                                                {...field} 
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowAccessKey(!showAccessKey)}
                                                disabled={isSubmitting}>
                                                {showAccessKey ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        {t('storage.accessKeyDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="s3SecretKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('storage.secretKey')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                type={showSecretKey ? 'text' : 'password'}
                                                placeholder={t('storage.secretKeyPlaceholder')}
                                                disabled={isSubmitting} 
                                                {...field} 
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowSecretKey(!showSecretKey)}
                                                disabled={isSubmitting}>
                                                {showSecretKey ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        {t('storage.secretKeyDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="s3Bucket"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('storage.bucket')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder={t('storage.bucketPlaceholder')}
                                            disabled={isSubmitting} 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('storage.bucketDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="s3PublicUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('storage.publicUrl')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="cdn.yourdomain.com" 
                                            disabled={isSubmitting} 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('storage.publicUrlDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// Multi Language Selector Component
function MultiLanguageSelector({ t, languages, value, onChange, disabled, defaultLanguage, onDefaultLanguageChange, readOnly = false }) {
    const toggleLanguage = (langCode) => {
        if (disabled || readOnly) return;

        const currentValue = value || [];
        const isSelected = currentValue.includes(langCode);

        if (isSelected) {
            if (currentValue.length === 1) {
                toast.error(t('toasts.atLeastOneLanguage'));
                return;
            }
            if (langCode === defaultLanguage) {
                toast.error(t('toasts.cannotRemoveDefault'));
                return;
            }
            onChange(currentValue.filter((code) => code !== langCode));
        } else {
            onChange([...currentValue, langCode]);
        }
    };

    const handleSetDefault = (langCode) => {
        if (disabled) return;

        const currentValue = value || [];
        
        // If readOnly, we don't add/remove languages, just change default
        if (!readOnly && !currentValue.includes(langCode)) {
            onChange([...currentValue, langCode]);
        }

        if (onDefaultLanguageChange) {
            onDefaultLanguageChange(langCode);
        }
        const languageName = languages.find((l) => l.code === langCode)?.name || langCode;
        toast.success(t('toasts.setAsDefaultLanguage', { language: languageName }));
    };

    const selectedLanguages = languages.filter((lang) => (value || []).includes(lang.code));
    const unselectedLanguages = languages.filter((lang) => !(value || []).includes(lang.code));

    return (
        <div className="space-y-4">
            {selectedLanguages.length > 0 && (
                <div className="space-y-2">
                    <Label>{readOnly ? t('language.availableLanguagesFilesystem') : t('language.selectedLanguages')}</Label>
                    <div className="flex flex-wrap gap-2">
                        {selectedLanguages.map((lang) => (
                            <div
                                key={lang.code}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                                    lang.code === defaultLanguage ? 'border-primary bg-primary/10' : 'bg-muted'
                                }`}>
                                <span className="font-medium">
                                    {lang.name} ({lang.code.toUpperCase()})
                                </span>
                                {lang.code === defaultLanguage && (
                                    <Star fill="lime" color="lime" className="h-4 w-4" /> 
                                )}
                                <div className="flex gap-1">
                                    {lang.code !== defaultLanguage && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2"
                                            onClick={() => handleSetDefault(lang.code)}
                                            disabled={disabled}
                                            title={t('language.setDefault')}>
                                            <Star className="h-4 w-4 hover:text-lime-500" />
                                        </Button>
                                    )}
                                    {!readOnly && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => toggleLanguage(lang.code)}
                                            disabled={disabled}
                                            title={t('language.remove')}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!readOnly && unselectedLanguages.length > 0 && (
                <div className="space-y-2">
                    <Label>{t('language.availableLanguages')}</Label>
                    <div className="flex flex-wrap gap-2">
                        {unselectedLanguages.map((lang) => (
                            <Button
                                key={lang.code}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleLanguage(lang.code)}
                                disabled={disabled}>
                                <Plus className="mr-1 h-3 w-3" />
                                {lang.name} ({lang.code.toUpperCase()})
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
