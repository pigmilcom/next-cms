// @/app/(frontend)/guides/page.client.jsx
'use client';

import { useState } from 'react';
import { useSettings } from '@/context/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
    BookOpen, 
    Download, 
    Calculator, 
    FileText, 
    Video, 
    HelpCircle,
    CheckCircle,
    Info,
    Droplet
} from 'lucide-react'; 

const GuidesPageClient = () => {
    const { siteSettings } = useSettings();
    const [activeTab, setActiveTab] = useState('guides');

    // CBD Dosage Calculator State
    const [weight, setWeight] = useState('');
    const [strength, setStrength] = useState('medium');
    const [dosage, setDosage] = useState(null);

    const calculateDosage = () => {
        if (!weight) return;
        const weightNum = parseFloat(weight);
        const strengthMultiplier = {
            low: 1,
            medium: 3,
            high: 6
        };
        const mgPerKg = strengthMultiplier[strength];
        const recommendedDosage = weightNum * mgPerKg;
        setDosage({
            daily: recommendedDosage.toFixed(1),
            perDose: (recommendedDosage / 2).toFixed(1)
        });
    };

    const guides = [
        {
            title: 'Guia Completo para Iniciantes em CBD',
            description: 'Tudo o que precisa saber antes de começar a usar CBD. Da escolha do produto à dosagem correta.',
            category: 'Iniciante',
            format: 'PDF',
            pages: '24 páginas',
            icon: BookOpen,
            downloadUrl: '/resources/guia-iniciantes-cbd.pdf'
        },
        {
            title: 'CBD vs THC: Diferenças e Benefícios',
            description: 'Comparação detalhada entre CBD e THC, efeitos, legalidade e aplicações terapêuticas.',
            category: 'Educação',
            format: 'PDF',
            pages: '12 páginas',
            icon: FileText,
            downloadUrl: '/resources/cbd-vs-thc.pdf'
        },
        {
            title: 'Como Escolher o Produto CBD Certo',
            description: 'Guia de compra com critérios de qualidade, tipos de produtos e recomendações.',
            category: 'Compras',
            format: 'PDF',
            pages: '18 páginas',
            icon: CheckCircle,
            downloadUrl: '/resources/escolher-produto-cbd.pdf'
        },
        {
            title: 'Métodos de Administração de CBD',
            description: 'Comparação entre diferentes formas de consumo: óleos, flores, cápsulas, tópicos.',
            category: 'Uso',
            format: 'PDF',
            pages: '15 páginas',
            icon: Droplet,
            downloadUrl: '/resources/metodos-administracao.pdf'
        },
        {
            title: 'CBD para Ansiedade e Stress',
            description: 'Guia específico sobre o uso de CBD para gestão de ansiedade e stress.',
            category: 'Saúde',
            format: 'PDF',
            pages: '20 páginas',
            icon: HelpCircle,
            downloadUrl: '/resources/cbd-ansiedade-stress.pdf'
        },
        {
            title: 'Legislação do CBD em Portugal e Europa',
            description: 'Informação legal atualizada sobre CBD em Portugal e na União Europeia.',
            category: 'Legal',
            format: 'PDF',
            pages: '10 páginas',
            icon: Info,
            downloadUrl: '/resources/legislacao-cbd.pdf'
        }
    ];

    const videos = [
        {
            title: 'O que é o CBD? Introdução ao Canabidiol',
            duration: '8:45',
            thumbnail: '/images/video-thumb-1.jpg',
            videoUrl: 'https://youtube.com/watch?v=example1'
        },
        {
            title: 'Como Usar Óleo de CBD Corretamente',
            duration: '6:30',
            thumbnail: '/images/video-thumb-2.jpg',
            videoUrl: 'https://youtube.com/watch?v=example2'
        },
        {
            title: 'CBD para Dor Crónica: Tutorial Completo',
            duration: '12:15',
            thumbnail: '/images/video-thumb-3.jpg',
            videoUrl: 'https://youtube.com/watch?v=example3'
        },
        {
            title: 'Diferenças entre Espectro Completo e Isolado',
            duration: '10:20',
            thumbnail: '/images/video-thumb-4.jpg',
            videoUrl: 'https://youtube.com/watch?v=example4'
        }
    ];

    const faqs = [
        {
            question: 'O CBD é legal em Portugal?',
            answer: 'Sim, o CBD é legal em Portugal desde que contenha menos de 0,2% de THC. Os nossos produtos cumprem todas as regulamentações europeias e portuguesas.'
        },
        {
            question: 'O CBD causa dependência?',
            answer: 'Não, o CBD não é aditivo nem causa dependência. Segundo a Organização Mundial de Saúde, o CBD não apresenta potencial de abuso ou dependência.'
        },
        {
            question: 'Quanto tempo demora a fazer efeito?',
            answer: 'Depende do método de administração. Os óleos sublinguais fazem efeito em 15-45 minutos, enquanto as cápsulas podem demorar 1-2 horas.'
        },
        {
            question: 'Posso conduzir depois de usar CBD?',
            answer: 'Sim, o CBD não causa alteração mental ou intoxicação. No entanto, certifique-se de que está a usar produtos com menos de 0,2% de THC.'
        },
        {
            question: 'O CBD aparece em testes de drogas?',
            answer: 'Os testes de drogas procuram THC, não CBD. Produtos de espectro completo contêm vestígios de THC que raramente são detetados, mas é possível.'
        },
        {
            question: 'Posso usar CBD com outros medicamentos?',
            answer: 'O CBD pode interagir com alguns medicamentos. Consulte sempre o seu médico antes de combinar CBD com medicação prescrita.'
        }
    ];

    return (
        <>
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        📚 Recursos & Ferramentas CBD
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Guias gratuitos, calculadoras, vídeos educativos e recursos para ajudá-lo 
                        a tirar o máximo partido do CBD.
                    </p>
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="guides">Guias</TabsTrigger>
                        <TabsTrigger value="calculator">Calculadora</TabsTrigger>
                        <TabsTrigger value="videos">Vídeos</TabsTrigger>
                        <TabsTrigger value="faq">FAQ</TabsTrigger>
                    </TabsList>

                    {/* Guides Tab */}
                    <TabsContent value="guides" className="mt-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {guides.map((guide, index) => {
                                const Icon = guide.icon;
                                return (
                                    <Card key={index} className="hover:shadow-lg transition-shadow">
                                        <CardHeader>
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline">{guide.category}</Badge>
                                                <Icon className="h-6 w-6 text-primary" />
                                            </div>
                                            <CardTitle className="text-lg">{guide.title}</CardTitle>
                                            <CardDescription>{guide.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                                <span>{guide.format}</span>
                                                <span>{guide.pages}</span>
                                            </div>
                                            <Button className="w-full" variant="default">
                                                <Download className="h-4 w-4 mr-2" />
                                                Descarregar Grátis
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </TabsContent>

                    {/* Calculator Tab */}
                    <TabsContent value="calculator" className="mt-6">
                        <Card className="max-w-2xl mx-auto">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <Calculator className="h-8 w-8 text-primary" />
                                    <CardTitle className="text-2xl">Calculadora de Dosagem CBD</CardTitle>
                                </div>
                                <CardDescription>
                                    Calcule a dosagem recomendada de CBD baseada no seu peso e necessidades.
                                    Esta é apenas uma orientação geral - consulte um profissional de saúde para aconselhamento personalizado.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Peso (kg)</Label>
                                    <Input
                                        id="weight"
                                        type="number"
                                        placeholder="Ex: 70"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Intensidade Desejada</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['low', 'medium', 'high'].map((level) => (
                                            <Button
                                                key={level}
                                                variant={strength === level ? 'default' : 'outline'}
                                                onClick={() => setStrength(level)}
                                            >
                                                {level === 'low' && 'Baixa (1mg/kg)'}
                                                {level === 'medium' && 'Média (3mg/kg)'}
                                                {level === 'high' && 'Alta (6mg/kg)'}
                                            </Button>
                                        ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        <strong>Baixa:</strong> Bem-estar geral, prevenção<br />
                                        <strong>Média:</strong> Ansiedade leve, stress, sono<br />
                                        <strong>Alta:</strong> Dor crónica, ansiedade severa
                                    </p>
                                </div>

                                <Button className="w-full" size="lg" onClick={calculateDosage}>
                                    <Calculator className="h-5 w-5 mr-2" />
                                    Calcular Dosagem
                                </Button>

                                {dosage && (
                                    <Card className="bg-primary/5 border-primary">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Dosagem Recomendada</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Dose Diária Total:</span>
                                                <span className="text-2xl font-bold text-primary">{dosage.daily} mg</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Por Dose (2x/dia):</span>
                                                <span className="text-xl font-semibold">{dosage.perDose} mg</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground pt-4 border-t mt-4">
                                                💡 <strong>Dica:</strong> Comece com metade da dose recomendada e ajuste 
                                                gradualmente conforme necessário. Cada pessoa reage de forma diferente ao CBD.
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Videos Tab */}
                    <TabsContent value="videos" className="mt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {videos.map((video, index) => (
                                <Card key={index} className="hover:shadow-lg transition-shadow overflow-hidden">
                                    <div className="relative aspect-video bg-muted">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Video className="h-16 w-16 text-muted-foreground" />
                                        </div>
                                        <Badge className="absolute top-2 right-2">{video.duration}</Badge>
                                    </div>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{video.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Button variant="default" className="w-full" asChild>
                                            <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                                                Ver Vídeo
                                            </a>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* FAQ Tab */}
                    <TabsContent value="faq" className="mt-6">
                        <div className="max-w-3xl mx-auto space-y-4">
                            {faqs.map((faq, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-start gap-3">
                                            <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                                            {faq.question}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{faq.answer}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Newsletter CTA */}
                <Card className="bg-primary text-primary-foreground">
                    <CardHeader>
                        <CardTitle className="text-2xl">📧 Receba Recursos Exclusivos</CardTitle>
                        <CardDescription className="text-primary-foreground/80">
                            Subscreva a nossa newsletter e receba guias, promoções e novidades sobre CBD.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="O seu email" 
                                className="bg-background text-foreground"
                            />
                            <Button variant="secondary">Subscrever</Button>
                        </div>
                    </CardContent>
                </Card>
            </div> 
        </>
    );
};

export default GuidesPageClient;
