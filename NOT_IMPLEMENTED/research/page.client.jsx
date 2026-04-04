// @/app/(frontend)/research/page.client.jsx
'use client';

import { useState } from 'react';
import { useSettings } from '@/context/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink, FileText, Microscope, GraduationCap, TrendingUp } from 'lucide-react'; 

const ResearchPageClient = () => {
    const { siteSettings } = useSettings();
    const [activeTab, setActiveTab] = useState('studies');

    const researchStudies = [
        {
            title: 'Eficácia do CBD no Tratamento da Ansiedade',
            authors: 'Blessing et al., 2015',
            journal: 'Neurotherapeutics',
            year: '2015',
            category: 'Ansiedade',
            summary: 'Revisão abrangente dos estudos pré-clínicos que demonstram a eficácia do CBD no tratamento de vários transtornos de ansiedade.',
            link: 'https://doi.org/10.1007/s13311-015-0387-1',
            tags: ['Ansiedade', 'Neurologia', 'Revisão']
        },
        {
            title: 'Propriedades Anti-inflamatórias do Canabidiol',
            authors: 'Nagarkatti et al., 2009',
            journal: 'Future Medicinal Chemistry',
            year: '2009',
            category: 'Inflamação',
            summary: 'Estudo sobre os mecanismos pelos quais o CBD exerce efeitos anti-inflamatórios através da modulação do sistema imunológico.',
            link: 'https://doi.org/10.4155/fmc.09.93',
            tags: ['Inflamação', 'Sistema Imunológico', 'Clínico']
        },
        {
            title: 'CBD e Qualidade do Sono',
            authors: 'Chagas et al., 2013',
            journal: 'Journal of Clinical Pharmacy and Therapeutics',
            year: '2013',
            category: 'Sono',
            summary: 'Investigação sobre os efeitos do CBD na melhoria da qualidade do sono e tratamento de distúrbios do sono.',
            link: 'https://doi.org/10.1111/jcpt.12179',
            tags: ['Sono', 'Insônia', 'Ensaio Clínico']
        },
        {
            title: 'CBD no Tratamento da Dor Crónica',
            authors: 'Russo, 2008',
            journal: 'Therapeutics and Clinical Risk Management',
            year: '2008',
            category: 'Dor',
            summary: 'Análise dos canabinóides no tratamento da dor crónica e suas aplicações terapêuticas.',
            link: 'https://doi.org/10.2147/TCRM.S1928',
            tags: ['Dor Crónica', 'Terapêutica', 'Revisão']
        },
        {
            title: 'Segurança e Efeitos Secundários do CBD',
            authors: 'Iffland & Grotenhermen, 2017',
            journal: 'Cannabis and Cannabinoid Research',
            year: '2017',
            category: 'Segurança',
            summary: 'Atualização sobre a segurança e efeitos secundários do canabidiol baseada em estudos clínicos e revisões.',
            link: 'https://doi.org/10.1089/can.2016.0034',
            tags: ['Segurança', 'Efeitos Secundários', 'Meta-análise']
        },
        {
            title: 'CBD e Neuroprotecção',
            authors: 'Fernández-Ruiz et al., 2013',
            journal: 'British Journal of Clinical Pharmacology',
            year: '2013',
            category: 'Neurologia',
            summary: 'Estudo sobre propriedades neuroprotectoras do CBD e suas potenciais aplicações em doenças neurodegenerativas.',
            link: 'https://doi.org/10.1111/bcp.12121',
            tags: ['Neuroprotecção', 'Alzheimer', 'Parkinson']
        }
    ];

    const categories = ['Todos', 'Ansiedade', 'Inflamação', 'Sono', 'Dor', 'Segurança', 'Neurologia'];
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    const filteredStudies = selectedCategory === 'Todos' 
        ? researchStudies 
        : researchStudies.filter(study => study.category === selectedCategory);

    const resources = [
        {
            title: 'Base de Dados de Ensaios Clínicos',
            description: 'Acesso a uma base de dados completa de ensaios clínicos sobre CBD em todo o mundo.',
            icon: Microscope,
            link: 'https://clinicaltrials.gov/search?term=cannabidiol'
        },
        {
            title: 'PubMed - Publicações sobre CBD',
            description: 'Biblioteca nacional de medicina com milhares de artigos científicos sobre canabidiol.',
            icon: BookOpen,
            link: 'https://pubmed.ncbi.nlm.nih.gov/?term=cannabidiol'
        },
        {
            title: 'Organização Mundial de Saúde - Relatório CBD',
            description: 'Relatório oficial da OMS sobre canabidiol e suas propriedades terapêuticas.',
            icon: FileText,
            link: 'https://www.who.int/publications/i/item/9789240002838'
        },
        {
            title: 'Revisões Cochrane',
            description: 'Revisões sistemáticas de alta qualidade sobre intervenções com canabinóides.',
            icon: GraduationCap,
            link: 'https://www.cochranelibrary.com/search?q=cannabidiol'
        }
    ];

    const statistics = [
        { label: 'Estudos Publicados (2023)', value: '2,847', trend: '+24%', icon: TrendingUp },
        { label: 'Ensaios Clínicos Ativos', value: '156', trend: '+18%', icon: Microscope },
        { label: 'Países a Investigar', value: '42', trend: '+5', icon: GraduationCap },
        { label: 'Revistas Científicas', value: '387', trend: '+12%', icon: BookOpen }
    ];

    return (
        <>
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        🔬 Investigação Científica sobre CBD
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Compilação de estudos científicos, investigação clínica e dados académicos sobre 
                        o canabidiol e os seus efeitos terapêuticos.
                    </p>
                </div>

                {/* Statistics */}
                <div className="grid md:grid-cols-4 gap-6 mb-12">
                    {statistics.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={index}>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <Icon className="h-8 w-8 text-primary" />
                                        <Badge variant="secondary">{stat.trend}</Badge>
                                    </div>
                                    <p className="text-3xl font-bold mb-1">{stat.value}</p>
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="studies">Estudos Científicos</TabsTrigger>
                        <TabsTrigger value="resources">Recursos Académicos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="studies" className="mt-6">
                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {categories.map((category) => (
                                <Button
                                    key={category}
                                    variant={selectedCategory === category ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>

                        {/* Studies Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {filteredStudies.map((study, index) => (
                                <Card key={index} className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between mb-2">
                                            <Badge variant="outline">{study.category}</Badge>
                                            <span className="text-sm text-muted-foreground">{study.year}</span>
                                        </div>
                                        <CardTitle className="text-xl mb-2">{study.title}</CardTitle>
                                        <CardDescription>
                                            <p className="font-medium">{study.authors}</p>
                                            <p className="italic">{study.journal}</p>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground mb-4">{study.summary}</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {study.tags.map((tag, tagIndex) => (
                                                <Badge key={tagIndex} variant="secondary">{tag}</Badge>
                                            ))}
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={study.link} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Ver Estudo Completo
                                            </a>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="resources" className="mt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {resources.map((resource, index) => {
                                const Icon = resource.icon;
                                return (
                                    <Card key={index} className="hover:shadow-lg transition-shadow">
                                        <CardHeader>
                                            <Icon className="h-10 w-10 text-primary mb-4" />
                                            <CardTitle>{resource.title}</CardTitle>
                                            <CardDescription>{resource.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button variant="default" asChild>
                                                <a href={resource.link} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Aceder ao Recurso
                                                </a>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Disclaimer */}
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-lg">⚠️ Aviso Legal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Esta página apresenta informações de carácter informativo baseadas em estudos científicos publicados. 
                            As informações aqui contidas não constituem aconselhamento médico e não devem ser utilizadas para 
                            diagnóstico ou tratamento de qualquer condição de saúde. Consulte sempre um profissional de saúde 
                            qualificado antes de iniciar qualquer tratamento ou tomar decisões sobre a sua saúde.
                        </p>
                    </CardContent>
                </Card>
            </div> 
        </>
    );
};

export default ResearchPageClient;
