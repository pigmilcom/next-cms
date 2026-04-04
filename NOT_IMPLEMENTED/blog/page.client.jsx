// @/app/(frontend)/blog/page.client.jsx
'use client';

import { useState, useMemo } from 'react';
import { useSettings } from '@/context/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Search, 
    Calendar, 
    User, 
    Clock, 
    ArrowRight,
    BookOpen,
    TrendingUp,
    Sparkles
} from 'lucide-react'; 
import Image from 'next/image';
import Link from 'next/link';

const BlogPageClient = ({ initialPosts, totalPosts, categories }) => {
    const { siteSettings } = useSettings();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeTab, setActiveTab] = useState('recent');

    // Mock blog data - Replace with actual blog posts from your database
    const blogPosts = [
        {
            id: 1,
            title: 'Os Benefícios do CBD para a Saúde Mental',
            slug: 'beneficios-cbd-saude-mental',
            excerpt: 'Descubra como o CBD pode ajudar a reduzir a ansiedade, melhorar o sono e promover o bem-estar mental.',
            category: 'Saúde',
            author: 'Dr. João Silva',
            date: '2024-12-15',
            readTime: '8 min',
            image: '/images/blog/cbd-mental-health.jpg',
            featured: true,
            views: 1245
        },
        {
            id: 2,
            title: 'Guia Completo: Como Escolher o Óleo de CBD Certo',
            slug: 'guia-escolher-oleo-cbd',
            excerpt: 'Aprenda a escolher o óleo de CBD perfeito para as suas necessidades. Concentração, espectro e qualidade explicados.',
            category: 'Guias',
            author: 'Maria Santos',
            date: '2024-12-12',
            readTime: '12 min',
            image: '/images/blog/cbd-oil-guide.jpg',
            featured: false,
            views: 892
        },
        {
            id: 3,
            title: 'CBD e Desporto: Recuperação Muscular Natural',
            slug: 'cbd-desporto-recuperacao',
            excerpt: 'Atletas de todo o mundo estão a descobrir os benefícios do CBD para recuperação e performance.',
            category: 'Desporto',
            author: 'Pedro Costa',
            date: '2024-12-10',
            readTime: '6 min',
            image: '/images/blog/cbd-sports.jpg',
            featured: true,
            views: 2103
        },
        {
            id: 4,
            title: 'Legislação do CBD em Portugal: O Que Precisa Saber',
            slug: 'legislacao-cbd-portugal',
            excerpt: 'Tudo sobre a legalidade do CBD em Portugal, regulamentações e o que pode ou não fazer.',
            category: 'Legal',
            author: 'Ana Oliveira',
            date: '2024-12-08',
            readTime: '10 min',
            image: '/images/blog/cbd-legal.jpg',
            featured: false,
            views: 1567
        },
        {
            id: 5,
            title: 'Receitas com CBD: Cozinhar com Canabidiol',
            slug: 'receitas-cbd-cozinhar',
            excerpt: 'Explore receitas deliciosas e saudáveis usando óleo de CBD. Da sobremesa ao jantar.',
            category: 'Estilo de Vida',
            author: 'Chef Carlos Lima',
            date: '2024-12-05',
            readTime: '15 min',
            image: '/images/blog/cbd-recipes.jpg',
            featured: false,
            views: 743
        },
        {
            id: 6,
            title: 'CBD para Animais de Estimação: É Seguro?',
            slug: 'cbd-animais-estimacao',
            excerpt: 'Descubra se o CBD é seguro para os seus animais de estimação e quais os benefícios.',
            category: 'Animais',
            author: 'Dra. Rita Ferreira',
            date: '2024-12-03',
            readTime: '7 min',
            image: '/images/blog/cbd-pets.jpg',
            featured: false,
            views: 1089
        },
        {
            id: 7,
            title: 'Diferenças entre CBD Full Spectrum e Isolado',
            slug: 'cbd-full-spectrum-isolado',
            excerpt: 'Entenda as diferenças entre CBD de espectro completo, amplo e isolado para fazer a melhor escolha.',
            category: 'Educação',
            author: 'João Silva',
            date: '2024-12-01',
            readTime: '9 min',
            image: '/images/blog/cbd-spectrum.jpg',
            featured: false,
            views: 1821
        },
        {
            id: 8,
            title: 'CBD e Sono: Como Melhorar a Qualidade do Descanso',
            slug: 'cbd-sono-qualidade',
            excerpt: 'Problemas para dormir? Saiba como o CBD pode ajudar a regular o sono e melhorar o descanso.',
            category: 'Saúde',
            author: 'Dr. João Silva',
            date: '2024-11-28',
            readTime: '11 min',
            image: '/images/blog/cbd-sleep.jpg',
            featured: true,
            views: 2456
        }
    ];

    const blogCategories = [
        { id: 'all', name: 'Todos', count: blogPosts.length },
        { id: 'saude', name: 'Saúde', count: blogPosts.filter(p => p.category === 'Saúde').length },
        { id: 'guias', name: 'Guias', count: blogPosts.filter(p => p.category === 'Guias').length },
        { id: 'desporto', name: 'Desporto', count: blogPosts.filter(p => p.category === 'Desporto').length },
        { id: 'legal', name: 'Legal', count: blogPosts.filter(p => p.category === 'Legal').length },
        { id: 'estilo-vida', name: 'Estilo de Vida', count: blogPosts.filter(p => p.category === 'Estilo de Vida').length },
        { id: 'educacao', name: 'Educação', count: blogPosts.filter(p => p.category === 'Educação').length }
    ];

    // Filter and search logic
    const filteredPosts = useMemo(() => {
        let filtered = blogPosts;

        // Filter by category
        if (selectedCategory !== 'all') {
            const categoryName = blogCategories.find(c => c.id === selectedCategory)?.name;
            filtered = filtered.filter(post => post.category === categoryName);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(post => 
                post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort by tab selection
        if (activeTab === 'recent') {
            filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (activeTab === 'popular') {
            filtered = [...filtered].sort((a, b) => b.views - a.views);
        } else if (activeTab === 'featured') {
            filtered = filtered.filter(post => post.featured);
        }

        return filtered;
    }, [blogPosts, selectedCategory, searchQuery, activeTab]);

    const featuredPosts = blogPosts.filter(post => post.featured).slice(0, 3);

    return (
        <>
            <div className="container mx-auto px-4 py-12"> 
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <Badge className="mb-4" variant="outline">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Blog CBD Barato
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        📝 Blog & Notícias CBD
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Fique a par das últimas novidades, guias educativos e artigos sobre CBD. 
                        Aprenda com os nossos especialistas.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-12">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Pesquisar artigos, guias, tópicos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12"
                        />
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {blogCategories.map((category) => (
                        <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(category.id)}
                        >
                            {category.name}
                            <Badge variant="secondary" className="ml-2">
                                {category.count}
                            </Badge>
                        </Button>
                    ))}
                </div>

                {/* Featured Posts */}
                {selectedCategory === 'all' && !searchQuery && (
                    <div className="mb-16">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold flex items-center gap-2">
                                <Sparkles className="h-8 w-8 text-primary" />
                                Artigos em Destaque
                            </h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {featuredPosts.map((post) => (
                                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                                    <div className="relative h-48 bg-muted">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <BookOpen className="h-16 w-16 text-muted-foreground" />
                                        </div>
                                        <Badge className="absolute top-2 right-2 bg-primary">
                                            Destaque
                                        </Badge>
                                    </div>
                                    <CardHeader>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline">{post.category}</Badge>
                                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {post.readTime}
                                            </span>
                                        </div>
                                        <CardTitle className="group-hover:text-primary transition-colors">
                                            {post.title}
                                        </CardTitle>
                                        <CardDescription>{post.excerpt}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <User className="h-4 w-4" />
                                                <span>{post.author}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/blog/${post.slug}`}>
                                                    Ler mais
                                                    <ArrowRight className="h-4 w-4 ml-1" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs for Recent / Popular / Featured */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                        <TabsTrigger value="recent">Recentes</TabsTrigger>
                        <TabsTrigger value="popular">Populares</TabsTrigger>
                        <TabsTrigger value="featured">Destaques</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Blog Posts Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {filteredPosts.length > 0 ? (
                        filteredPosts.map((post) => (
                            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                                <div className="relative h-48 bg-muted">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <BookOpen className="h-16 w-16 text-muted-foreground" />
                                    </div>
                                    {post.featured && (
                                        <Badge className="absolute top-2 right-2 bg-primary">
                                            Destaque
                                        </Badge>
                                    )}
                                </div>
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline">{post.category}</Badge>
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {post.readTime}
                                        </span>
                                    </div>
                                    <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                                        {post.title}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {post.excerpt}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(post.date).toLocaleDateString('pt-PT')}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <TrendingUp className="h-4 w-4" />
                                            <span>{post.views}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-4 w-4" />
                                            <span className="line-clamp-1">{post.author}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/blog/${post.slug}`}>
                                                Ler mais
                                                <ArrowRight className="h-4 w-4 ml-1" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Nenhum artigo encontrado</h3>
                            <p className="text-muted-foreground mb-4">
                                Tente ajustar os filtros ou pesquisa.
                            </p>
                            <Button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                                Limpar Filtros
                            </Button>
                        </div>
                    )}
                </div>

                {/* Newsletter CTA */}
                <Card className="bg-primary text-primary-foreground">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl mb-2">📬 Subscreva a Nossa Newsletter</CardTitle>
                        <CardDescription className="text-primary-foreground/80">
                            Receba os nossos artigos mais recentes, guias exclusivos e promoções especiais 
                            diretamente no seu email.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 max-w-md mx-auto">
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

export default BlogPageClient;
