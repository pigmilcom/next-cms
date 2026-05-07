// @/app/(actions)/unsubscribe/page.client.jsx (Client Component)
'use client';

import { CheckCircle2, Loader2, Mail, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LanguageSelector } from '@/components/ui/language-selector';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ThemeSwitchButton } from '@/components/ui/theme-mode';
import { useSettings, useTheme } from '@/context/providers';
import { formatAvailableLanguages } from '@/lib/i18n.js';

const createTranslator = (translations) => (key) => {
    const keys = String(key || '').split('.');
    let value = translations;
    for (const item of keys) {
        value = value?.[item];
        if (value === undefined) return key;
    }
    return value;
};

const UnsubscribePageClient = ({ subscriber, identifier, type, updatePreferencesAction, translationsMap = {}, locale = 'en' }) => {
    const router = useRouter();
    const { siteSettings } = useSettings();
    const { resolvedTheme } = useTheme();

    const [selectedLanguage, setSelectedLanguage] = useState(locale);
    const activeTranslations = translationsMap?.[selectedLanguage] || translationsMap?.en || {};
    const t = createTranslator(activeTranslations);

    const availableSiteLanguages = siteSettings?.languages || Object.keys(translationsMap).filter(Boolean) || ['en'];
    const languageOptions = formatAvailableLanguages(availableSiteLanguages, selectedLanguage);

    const handleLanguageChange = (lang) => {
        setSelectedLanguage(lang);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang;
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Initialize preferences from subscriber data
    const [preferences, setPreferences] = useState({
        emailNotifications: subscriber?.preferences?.emailNotifications ?? true,
        orderUpdates: subscriber?.preferences?.orderUpdates ?? true,
        marketingEmails: subscriber?.preferences?.marketingEmails ?? true,
        newsletter: subscriber?.preferences?.newsletter ?? true,
        smsNotifications: subscriber?.preferences?.smsNotifications ?? false
    });

    const [reason, setReason] = useState('');

    const handlePreferenceChange = (key) => {
        setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelectAll = (checked) => {
        setPreferences({
            emailNotifications: checked,
            orderUpdates: checked,
            marketingEmails: checked,
            newsletter: checked,
            smsNotifications: checked
        });
    };

    const allSelected = Object.values(preferences).every((val) => val === true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const result = await updatePreferencesAction(identifier, preferences, reason);
            if (result?.success) {
                setIsSuccess(true);
            } else {
                setErrorMessage(result?.error || t('errorUpdating'));
            }
        } catch {
            setErrorMessage(t('errorGeneral'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push('/');
    };

    // Header bar (shown on all states)
    const headerBar = (
        <div className="flex gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <a href={siteSettings?.baseUrl || '/'} className="flex items-center gap-3">
                    <img
                        src={siteSettings?.siteLogo || '/images/logo.webp'}
                        alt={siteSettings?.siteName || ''}
                        className="h-10 w-10 object-cover"
                    />
                </a>
                <span className="hidden sm:inline-flex w-fit rounded-md bg-foreground px-3 py-1.5 font-medium text-background sm:px-4 sm:py-2 sm:text-sm">
                    {t('title')}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <LanguageSelector
                    languages={languageOptions}
                    value={selectedLanguage}
                    onChange={handleLanguageChange}
                />
                <ThemeSwitchButton className="border border-border bg-card text-card-foreground hover:bg-accent" />
            </div>
        </div>
    );

    // Success view
    if (isSuccess) {
        return (
            <main className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-4 sm:py-8">
                <div className="mx-auto w-full max-w-2xl space-y-6">
                    {headerBar}
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <CardTitle className="text-2xl">{t('successTitle')}</CardTitle>
                            <CardDescription>{t('successMessage')}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="mb-6 text-sm text-muted-foreground">{t('successNote')}</p>
                            <Button onClick={() => router.push('/')}>
                                {t('backToHome')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-4 sm:py-8">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                {headerBar}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                            {type === 'phone' ? (
                                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <Mail className="h-5 w-5 text-muted-foreground" />
                            )}
                            <CardTitle className="text-2xl">{t('title')}</CardTitle>
                        </div>
                        <CardDescription>
                            {type === 'phone' ? (
                                <>{t('phoneLabel')}: <strong>{identifier}</strong></>
                            ) : (
                                <>{t('emailLabel')}: <strong>{identifier}</strong></>
                            )}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Select All / Deselect All */}
                            <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                                <Checkbox id="select-all" checked={allSelected} onCheckedChange={handleSelectAll} />
                                <Label htmlFor="select-all" className="text-base font-semibold cursor-pointer">
                                    {allSelected ? t('deselectAll') : t('selectAll')}
                                </Label>
                            </div>

                            <Separator />

                            {/* Email Preferences */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    {t('emailPreferences')}
                                </h3>

                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="emailNotifications"
                                        checked={preferences.emailNotifications}
                                        onCheckedChange={() => handlePreferenceChange('emailNotifications')}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="emailNotifications" className="text-sm font-medium cursor-pointer">
                                            {t('emailNotifications')}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">{t('emailNotificationsDesc')}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="orderUpdates"
                                        checked={preferences.orderUpdates}
                                        onCheckedChange={() => handlePreferenceChange('orderUpdates')}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="orderUpdates" className="text-sm font-medium cursor-pointer">
                                            {t('orderUpdates')}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">{t('orderUpdatesDesc')}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="marketingEmails"
                                        checked={preferences.marketingEmails}
                                        onCheckedChange={() => handlePreferenceChange('marketingEmails')}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="marketingEmails" className="text-sm font-medium cursor-pointer">
                                            {t('marketingEmails')}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">{t('marketingEmailsDesc')}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="newsletter"
                                        checked={preferences.newsletter}
                                        onCheckedChange={() => handlePreferenceChange('newsletter')}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="newsletter" className="text-sm font-medium cursor-pointer">
                                            {t('newsletter')}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">{t('newsletterDesc')}</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* SMS Preferences */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    {t('smsPreferences')}
                                </h3>

                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="smsNotifications"
                                        checked={preferences.smsNotifications}
                                        onCheckedChange={() => handlePreferenceChange('smsNotifications')}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="smsNotifications" className="text-sm font-medium cursor-pointer">
                                            {t('smsNotifications')}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">{t('smsNotificationsDesc')}</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Optional Reason */}
                            <div className="space-y-2">
                                <Label htmlFor="reason" className="text-sm font-medium">
                                    {t('reason')}
                                </Label>
                                <Textarea
                                    id="reason"
                                    placeholder={t('reasonPlaceholder')}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">{t('reasonHelp')}</p>
                            </div>

                            {/* Error message */}
                            {errorMessage && (
                                <p className="text-sm text-destructive">{errorMessage}</p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button type="submit" disabled={isSubmitting} className="flex-1">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('updating')}
                                        </>
                                    ) : (
                                        t('updatePreferences')
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                    className="flex-1">
                                    {t('cancel')}
                                </Button>
                            </div>

                            {/* Info Note */}
                            <div className="border rounded-lg p-4">
                                <p className="text-sm text-muted-foreground">
                                    <strong>{t('note')}:</strong> {t('noteText')}
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
};

export default UnsubscribePageClient;

