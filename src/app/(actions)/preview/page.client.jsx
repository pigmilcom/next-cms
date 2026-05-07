// @/app/(actions)/preview/page.client.jsx (Client Component)
'use client';

import { ArrowLeft, Calendar, Mail, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSelector } from '@/components/ui/language-selector';
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

const PreviewPageClient = ({ campaign, translationsMap = {}, locale = 'en' }) => {
    const router = useRouter();
    const { siteSettings } = useSettings();
    const { resolvedTheme } = useTheme();

    const [selectedLanguage, setSelectedLanguage] = useState(locale);

    const activeTranslations = translationsMap?.[selectedLanguage] || translationsMap?.en || {};
    const t = createTranslator(activeTranslations);

    // Language options for LanguageSelector (UI translation language)
    const availableSiteLanguages = siteSettings?.languages || Object.keys(translationsMap).filter(Boolean) || ['en'];
    const languageOptions = formatAvailableLanguages(availableSiteLanguages, selectedLanguage);

    const handleLanguageChange = (lang) => {
        setSelectedLanguage(lang);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang;
        }
    };

    // Campaign content language configuration
    const campaignDefaultLanguage = siteSettings?.language || locale;
    const [selectedCampaignLanguage, setSelectedCampaignLanguage] = useState(campaignDefaultLanguage);

    const getMLContent = (content, lang = selectedCampaignLanguage) => {
        if (typeof content === 'object' && content !== null) {
            return content[lang] || content[campaignDefaultLanguage] || content[Object.keys(content)[0]] || '';
        }
        return content || '';
    };

    const getCampaignLanguages = () => {
        const langs = [];
        const content = campaign.content;
        if (typeof content === 'object' && content !== null) {
            availableSiteLanguages.forEach((lang) => {
                const langContent = content[lang];
                if (langContent && langContent.trim() !== '') langs.push(lang);
            });
        } else if (content && content.trim() !== '') {
            langs.push(campaignDefaultLanguage);
        }
        return langs;
    };

    const campaignLanguages = getCampaignLanguages();

    useEffect(() => {
        if (campaignLanguages.length > 0 && !campaignLanguages.includes(selectedCampaignLanguage)) {
            setSelectedCampaignLanguage(campaignLanguages[0]);
        }
    }, []);

    const subject = getMLContent(campaign.subject);
    const previewText = getMLContent(campaign.previewText);
    const content = getMLContent(campaign.content);

    const campaignLanguageOptions = formatAvailableLanguages(
        campaignLanguages.length > 0 ? campaignLanguages : [campaignDefaultLanguage],
        selectedCampaignLanguage
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'draft': return 'bg-muted text-muted-foreground';
            case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'sent': return t('statusSent');
            case 'draft': return t('statusDraft');
            case 'scheduled': return t('statusScheduled');
            default: return status;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString(selectedLanguage, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <main className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-4 sm:py-8">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                {/* Header */}
                <div className="flex gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="shrink-0">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
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
                    <div className="flex flex-wrap items-center gap-2">
                        {campaignLanguages.length > 1 && (
                            <LanguageSelector
                                languages={campaignLanguageOptions}
                                value={selectedCampaignLanguage}
                                onChange={setSelectedCampaignLanguage}
                            />
                        )}
                        <LanguageSelector
                            languages={languageOptions}
                            value={selectedLanguage}
                            onChange={handleLanguageChange}
                        />
                        <ThemeSwitchButton className="border border-border bg-card text-card-foreground hover:bg-accent" />
                    </div>
                </div>

                {/* Campaign Info Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <CardTitle className="text-2xl">{subject || t('noSubject')}</CardTitle>
                                </div>
                                {previewText && <CardDescription className="text-base">{previewText}</CardDescription>}
                            </div>
                            <Badge className={getStatusColor(campaign.status)}>
                                {getStatusLabel(campaign.status)}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-muted-foreground">{t('createdAt')}</p>
                                    <p className="font-medium">{formatDate(campaign.createdAt)}</p>
                                </div>
                            </div>
                            {campaign.sentAt && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="text-muted-foreground">{t('sentAt')}</p>
                                        <p className="font-medium">{formatDate(campaign.sentAt)}</p>
                                    </div>
                                </div>
                            )}
                            {campaign.recipientCount && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="text-muted-foreground">{t('recipients')}</p>
                                        <p className="font-medium">{campaign.recipientCount}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Email Preview Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('emailContent')}</CardTitle>
                        <CardDescription>{t('emailContentDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Email Container */}
                        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                            {/* Email Header (simulating email client) */}
                            <div className="bg-white border-b px-6 py-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-600">{t('from')}:</span>
                                        <span className="text-gray-900">
                                            {siteSettings?.siteName || 'Your Company'}
                                            {siteSettings?.supportEmail && ` <${siteSettings.supportEmail}>`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-600">{t('subject')}:</span>
                                        <span className="text-gray-900">{subject || t('noSubject')}</span>
                                    </div>
                                    {previewText && (
                                        <div className="flex items-start gap-2">
                                            <span className="font-medium text-gray-600">{t('previewText')}:</span>
                                            <span className="text-gray-600">{previewText}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Email Body */}
                            <div className="px-6 py-8">
                                {content ? (
                                    <div
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                    />
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>{t('noContent')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Email Footer */}
                            <div className="bg-white border-t px-6 py-4 text-center text-xs text-gray-500">
                                <p>
                                    © {new Date().getFullYear()} {siteSettings?.siteName || 'Your Company'}. {t('allRightsReserved')}
                                </p>
                                {siteSettings?.supportEmail && (
                                    <p className="mt-1">
                                        {t('needHelp')}{' '}
                                        <a
                                            href={`mailto:${siteSettings.supportEmail}`}
                                            className="text-blue-600 hover:underline">
                                            {siteSettings.supportEmail}
                                        </a>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Info Note */}
                        <div className="mt-6 border rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>{t('note')}:</strong> {t('noteText')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
};

export default PreviewPageClient;

