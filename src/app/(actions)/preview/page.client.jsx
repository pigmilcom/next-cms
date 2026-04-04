// @/app/(frontend)/preview/page.client.jsx (Client Component)
'use client';

import { ArrowLeft, Calendar, Eye, Globe, Mail, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useSettings } from '@/context/providers';

const PreviewPageClient = ({ campaign }) => {
    const router = useRouter();
    const { siteSettings } = useSettings();

    // Language configuration
    const availableLanguages = siteSettings?.languages || ['en', 'pt', 'es', 'fr'];
    const defaultLanguage = siteSettings?.language || 'pt';
    const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);

    // Language labels mapping
    const languageLabels = {
        en: 'English',
        es: 'Español',
        fr: 'Français',
        pt: 'Português'
    };

    // Helper to extract ML content - supports both string and object formats
    const getMLContent = (content, locale = selectedLanguage) => {
        if (typeof content === 'object' && content !== null) {
            // ML object: { en: "...", es: "...", pt: "..." }
            return content[locale] || content[defaultLanguage] || content[Object.keys(content)[0]] || '';
        }
        // Legacy: string content
        return content || '';
    };

    // Helper to get available languages for this campaign
    const getCampaignLanguages = () => {
        const languages = [];
        const content = campaign.content;

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

    const campaignLanguages = getCampaignLanguages();

    // Set initial language to first available in campaign
    useEffect(() => {
        if (campaignLanguages.length > 0 && !campaignLanguages.includes(selectedLanguage)) {
            setSelectedLanguage(campaignLanguages[0]);
        }
    }, []);

    // Get campaign content for selected language
    const subject = getMLContent(campaign.subject);
    const previewText = getMLContent(campaign.previewText);
    const content = getMLContent(campaign.content);

    // Status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'sent':
                return 'bg-green-100 text-green-800';
            case 'draft':
                return 'bg-gray-100 text-gray-800';
            case 'scheduled':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-PT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen">
            {/* Header Bar */}
            <div className="sticky top-10 z-10 border-b">
                <div className="container mx-auto px-4 py-4 bg-background">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center justify-start gap-4">
                            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold">Pré-visualização da Campanha</h1>
                            </div>
                        </div>

                        {/* Language Selector */}
                        {campaignLanguages.length > 1 && (
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {campaignLanguages.map((lang) => (
                                            <SelectItem key={lang} value={lang}>
                                                {languageLabels[lang] || lang.toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Campaign Info Card */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <CardTitle className="text-2xl">{subject || 'Sem Assunto'}</CardTitle>
                                </div>
                                {previewText && <CardDescription className="text-base">{previewText}</CardDescription>}
                            </div>
                            <Badge className={getStatusColor(campaign.status)}>
                                {campaign.status === 'sent' && 'Enviada'}
                                {campaign.status === 'draft' && 'Rascunho'}
                                {campaign.status === 'scheduled' && 'Agendada'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground">Data de Criação</p>
                                    <p className="font-medium">{formatDate(campaign.createdAt)}</p>
                                </div>
                            </div>
                            {campaign.sentAt && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Data de Envio</p>
                                        <p className="font-medium">{formatDate(campaign.sentAt)}</p>
                                    </div>
                                </div>
                            )}
                            {campaign.recipientCount && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Destinatários</p>
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
                        <CardTitle>Conteúdo do Email</CardTitle>
                        <CardDescription>
                            Esta é uma pré-visualização de como o email aparecerá no navegador
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Email Container */}
                        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                            {/* Email Header (simulating email client) */}
                            <div className="bg-white border-b px-6 py-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-600">De:</span>
                                        <span className="text-gray-900">
                                            {siteSettings?.siteName || 'Your Company'}
                                            {siteSettings?.supportEmail && ` <${siteSettings.supportEmail}>`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-600">Assunto:</span>
                                        <span className="text-gray-900">{subject || 'Sem Assunto'}</span>
                                    </div>
                                    {previewText && (
                                        <div className="flex items-start gap-2">
                                            <span className="font-medium text-gray-600">Pré-visualização:</span>
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
                                        <p>Sem conteúdo disponível para esta língua</p>
                                    </div>
                                )}
                            </div>

                            {/* Email Footer (simulating email template footer) */}
                            <div className="bg-white border-t px-6 py-4 text-center text-xs text-gray-500">
                                <p>
                                    © {new Date().getFullYear()} {siteSettings?.siteName || 'Your Company'}. Todos os
                                    direitos reservados.
                                </p>
                                {siteSettings?.supportEmail && (
                                    <p className="mt-1">
                                        Precisa de ajuda?{' '}
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
                                <strong>Nota:</strong> Esta é uma pré-visualização do conteúdo da campanha. O design
                                final pode variar dependendo do cliente de email do destinatário.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PreviewPageClient;
