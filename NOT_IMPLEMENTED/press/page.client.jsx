// @/app/(frontend)/press/page.client.jsx
'use client';

import { useState } from 'react';
import { useSettings } from '@/context/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Mail, Phone, FileText, Image as ImageIcon, Video } from 'lucide-react'; 

const PressPageClient = () => {
    const { siteSettings } = useSettings();
    const [downloadingAsset, setDownloadingAsset] = useState(null);

    const pressContact = {
        email: siteSettings?.siteEmail || 'press@cbdbarato.pt',
        phone: siteSettings?.sitePhone || '+351 253 000 000',
        address: siteSettings?.businessAddress || 'Braga, Portugal'
    };

    const pressReleases = [
        {
            title: 'CBD Barato Lança Nova Linha de Produtos Premium',
            date: '15 Dezembro 2025',
            description: 'Comunicado sobre o lançamento da nossa nova coleção de produtos CBD de qualidade superior.',
            file: '/press/release-2025-12.pdf'
        },
        {
            title: 'Expansão do Serviço de Entrega em Portugal',
            date: '1 Novembro 2025',
            description: 'Anúncio da expansão do nosso serviço de entrega para todo o território nacional.',
            file: '/press/release-2025-11.pdf'
        }
    ];

    const mediaAssets = [
        {
            type: 'logo',
            title: 'Logo Principal (PNG)',
            description: 'Logo em alta resolução para uso em publicações',
            icon: ImageIcon,
            file: '/images/logo.png'
        },
        {
            type: 'photos',
            title: 'Fotografias de Produtos',
            description: 'Galeria de imagens dos nossos produtos',
            icon: ImageIcon,
            file: '/press/product-photos.zip'
        },
        {
            type: 'video',
            title: 'Vídeo Institucional',
            description: 'Vídeo de apresentação da empresa',
            icon: Video,
            file: '/press/institutional-video.mp4'
        },
        {
            type: 'document',
            title: 'Fact Sheet da Empresa',
            description: 'Informações detalhadas sobre a CBD Barato',
            icon: FileText,
            file: '/press/company-factsheet.pdf'
        }
    ];

    const handleDownload = (assetTitle, file) => {
        setDownloadingAsset(assetTitle);
        // Simulate download
        setTimeout(() => {
            setDownloadingAsset(null);
            // In production, trigger actual download
            // window.open(file, '_blank');
        }, 1000);
    };

    return (
        <>
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        🎤 Imprensa & Media
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Recursos para jornalistas, bloggers e criadores de conteúdo. 
                        Encontre aqui todo o material necessário para falar sobre a CBD Barato.
                    </p>
                </div>

                {/* Press Contact */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Contacto de Imprensa</CardTitle>
                        <CardDescription>
                            Para pedidos de imprensa, entrevistas ou informações adicionais
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">Email</p>
                                    <a href={`mailto:${pressContact.email}`} className="text-sm text-primary hover:underline">
                                        {pressContact.email}
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">Telefone</p>
                                    <a href={`tel:${pressContact.phone}`} className="text-sm text-primary hover:underline">
                                        {pressContact.phone}
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">Morada</p>
                                    <p className="text-sm text-muted-foreground">{pressContact.address}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Press Releases */}
                <div className="mb-12">
                    <h2 className="text-3xl font-bold mb-6">Comunicados de Imprensa</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {pressReleases.map((release, index) => (
                            <Card key={index} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="text-xl">{release.title}</CardTitle>
                                    <CardDescription>{release.date}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground mb-4">{release.description}</p>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleDownload(release.title, release.file)}
                                        disabled={downloadingAsset === release.title}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        {downloadingAsset === release.title ? 'A descarregar...' : 'Descarregar PDF'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Media Assets */}
                <div className="mb-12">
                    <h2 className="text-3xl font-bold mb-6">Media Kit</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {mediaAssets.map((asset, index) => {
                            const Icon = asset.icon;
                            return (
                                <Card key={index} className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <Icon className="h-8 w-8 text-primary mb-2" />
                                        <CardTitle className="text-lg">{asset.title}</CardTitle>
                                        <CardDescription className="text-sm">{asset.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button 
                                            variant="default" 
                                            className="w-full"
                                            onClick={() => handleDownload(asset.title, asset.file)}
                                            disabled={downloadingAsset === asset.title}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            {downloadingAsset === asset.title ? 'A descarregar...' : 'Descarregar'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* About Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sobre a CBD Barato</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            A CBD Barato é a loja online líder em Portugal especializada em produtos de CBD de alta qualidade. 
                            Com uma vasta gama de produtos que incluem flores, óleos, resinas, cápsulas e muito mais, 
                            oferecemos aos nossos clientes a melhor seleção de CBD no mercado português.
                        </p>
                        <p className="text-muted-foreground">
                            Todos os nossos produtos são rigorosamente testados para garantir a máxima qualidade, 
                            segurança e conformidade com as regulamentações europeias. A nossa missão é proporcionar 
                            bem-estar e qualidade de vida através dos benefícios naturais do CBD.
                        </p>
                    </CardContent>
                </Card>
            </div> 
        </>
    );
};

export default PressPageClient;
