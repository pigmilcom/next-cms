// @/app/(frontend)/faq/page.client.jsx
'use client';

import { useState } from 'react';
import { useSettings } from '@/context/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'; 
import { 
    HelpCircle,
    Search,
    ShoppingCart,
    Package,
    CreditCard,
    Truck,
    Shield,
    Leaf,
    Mail,
    Phone,
    MessageCircle
} from 'lucide-react'; 
import FAQ from '@/app/(frontend)/components/FAQ';

const FaqPageClient = () => {
    const { siteSettings } = useSettings();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    const faqCategories = [
        { id: 'all', name: 'Todas', icon: HelpCircle, color: 'text-primary' },
        { id: 'product', name: 'Produtos', icon: Leaf, color: 'text-green-600' },
        { id: 'order', name: 'Encomendas', icon: ShoppingCart, color: 'text-blue-600' },
        { id: 'shipping', name: 'Envios', icon: Truck, color: 'text-orange-600' },
        { id: 'payment', name: 'Pagamento', icon: CreditCard, color: 'text-purple-600' },
        { id: 'legal', name: 'Legal', icon: Shield, color: 'text-red-600' }
    ];

    const faqByCategory = {
        product: [
            {
                question: 'O que é CBD?',
                answer: 'CBD (Canabidiol) é um composto natural encontrado na planta Cannabis sativa. É um dos mais de 100 canabinóides presentes na planta e é conhecido pelos seus potenciais benefícios terapêuticos, sem causar efeitos psicoativos.'
            },
            {
                question: 'CBD causa efeitos psicoativos?',
                answer: 'Não, o CBD não causa efeitos psicoativos. Ao contrário do THC (tetrahidrocanabinol), o CBD não provoca a sensação de "moca" ou alteração mental. Os nossos produtos contêm menos de 0,2% de THC, conforme regulamentação europeia.'
            },
            {
                question: 'Qual é a diferença entre CBD Full Spectrum, Broad Spectrum e Isolado?',
                answer: 'Full Spectrum contém todos os compostos da planta (incluindo vestígios de THC <0,2%), Broad Spectrum contém vários canabinóides mas sem THC, e Isolado é CBD puro a 99%. O Full Spectrum oferece o "efeito entourage" onde os compostos trabalham em sinergia.'
            },
            {
                question: 'Como devo armazenar os produtos de CBD?',
                answer: 'Armazene os produtos em local fresco, seco e ao abrigo da luz solar direta. A temperatura ideal é entre 15-25°C. Os óleos devem ser mantidos na vertical e bem fechados. Verifique sempre o prazo de validade na embalagem.'
            },
            {
                question: 'Qual é a dosagem recomendada de CBD?',
                answer: 'A dosagem varia de pessoa para pessoa, dependendo do peso, metabolismo e objetivo. Recomendamos começar com 5-10mg por dia e aumentar gradualmente até encontrar a dose ideal. Consulte sempre um profissional de saúde para aconselhamento personalizado.'
            }
        ],
        order: [
            {
                question: 'Como faço uma encomenda?',
                answer: 'Navegue pelo nosso catálogo, adicione os produtos ao carrinho, preencha os dados de envio e pagamento, e confirme a encomenda. Receberá um email de confirmação imediatamente.'
            },
            {
                question: 'Posso cancelar ou alterar a minha encomenda?',
                answer: 'Pode cancelar ou alterar a encomenda até 1 hora após a confirmação. Depois disso, a encomenda entra em processamento. Contacte-nos imediatamente através do email ou telefone se necessitar de alterações.'
            },
            {
                question: 'Como posso rastrear a minha encomenda?',
                answer: 'Após o envio, receberá um email com o número de tracking. Pode rastrear a encomenda na área "Minhas Encomendas" da sua conta ou diretamente no site da transportadora.'
            },
            {
                question: 'Não recebi email de confirmação da encomenda',
                answer: 'Verifique a pasta de spam/lixo eletrónico. Se não encontrar, contacte-nos com o número da encomenda ou dados da compra. Teremos todo o gosto em reenviar a confirmação.'
            },
            {
                question: 'Posso fazer encomendas por telefone?',
                answer: 'Sim! Pode fazer encomendas por telefone através do +351 253 000 000 em horário de atendimento (Segunda a Sexta, 9h-18h). A nossa equipa terá todo o gosto em ajudar.'
            }
        ],
        shipping: [
            {
                question: 'Qual é o prazo de entrega?',
                answer: 'Para Portugal Continental: 24-48h úteis. Ilhas: 3-5 dias úteis. Encomendas processadas até às 14h são enviadas no mesmo dia. O prazo pode variar em períodos festivos ou promoções.'
            },
            {
                question: 'Quanto custa o envio?',
                answer: 'Portes: €4,90 para Portugal Continental. ENVIO GRÁTIS em encomendas superiores a €49. Para as ilhas, o custo varia entre €6,90 e €9,90 dependendo do peso.'
            },
            {
                question: 'Fazem entregas nas Ilhas (Açores e Madeira)?',
                answer: 'Sim, entregamos em todo o território nacional, incluindo Açores e Madeira. O prazo de entrega é de 3-5 dias úteis e os custos de envio são ligeiramente superiores devido à logística.'
            },
            {
                question: 'Posso escolher a morada de entrega?',
                answer: 'Sim! Pode entregar em casa, trabalho ou qualquer morada à sua escolha. Basta indicar no checkout. Também pode guardar várias moradas na sua conta para facilitar encomendas futuras.'
            },
            {
                question: 'O que fazer se a encomenda não chegar?',
                answer: 'Se a encomenda não chegar no prazo previsto, contacte-nos imediatamente. Verificaremos o tracking e resolveremos a situação. Todas as encomendas estão asseguradas e garantimos a reposição em caso de extravio.'
            },
            {
                question: 'As embalagens são discretas?',
                answer: 'Sim! Todas as nossas encomendas são enviadas em embalagens discretas, sem qualquer referência externa ao conteúdo ou à loja. A sua privacidade é a nossa prioridade.'
            }
        ],
        payment: [
            {
                question: 'Que métodos de pagamento aceitam?',
                answer: 'Aceitamos: Cartão de Crédito/Débito (Visa, Mastercard), MB Way, Multibanco, Transferência Bancária e PayPal. Todos os pagamentos são processados de forma segura.'
            },
            {
                question: 'Os pagamentos são seguros?',
                answer: 'Sim! Utilizamos encriptação SSL e gateways de pagamento certificados (Stripe e EuPago). Os seus dados financeiros nunca são armazenados nos nossos servidores.'
            },
            {
                question: 'Posso pagar à cobrança?',
                answer: 'Atualmente não oferecemos pagamento à cobrança. Aceitamos pagamento antecipado por cartão, MB Way, Multibanco ou transferência bancária.'
            },
            {
                question: 'Como funciona o pagamento por Multibanco?',
                answer: 'No checkout, selecione "Multibanco". Receberá uma referência com Entidade, Referência e Valor. Efetue o pagamento em qualquer caixa Multibanco ou homebanking. A encomenda é processada após confirmação do pagamento.'
            },
            {
                question: 'Posso pagar em prestações?',
                answer: 'Em breve disponibilizaremos pagamento em prestações através de parceiros certificados. Mantenha-se atento às novidades na nossa newsletter.'
            }
        ],
        legal: [
            {
                question: 'O CBD é legal em Portugal?',
                answer: 'Sim! O CBD é 100% legal em Portugal e na União Europeia, desde que o produto contenha menos de 0,2% de THC. Todos os nossos produtos cumprem rigorosamente esta regulamentação.'
            },
            {
                question: 'Preciso de receita médica para comprar CBD?',
                answer: 'Não! Os nossos produtos de CBD são de venda livre e não requerem receita médica. No entanto, recomendamos consultar um profissional de saúde antes de iniciar o uso, especialmente se estiver a tomar medicação.'
            },
            {
                question: 'O CBD aparece em testes de drogas?',
                answer: 'Os testes de drogas procuram THC, não CBD. Os nossos produtos contêm <0,2% de THC (conforme lei), níveis extremamente baixos que raramente são detetados. Em casos raros, produtos Full Spectrum podem dar falsos positivos.'
            },
            {
                question: 'Posso viajar com produtos de CBD?',
                answer: 'Dentro da UE, sim, desde que o produto tenha <0,2% THC. Para voos internacionais, verifique sempre a legislação do país de destino, pois as leis variam. Mantenha o produto na embalagem original com rótulo visível.'
            },
            {
                question: 'Os produtos têm certificação?',
                answer: 'Sim! Todos os produtos têm Certificados de Análise (COA) de laboratórios independentes, que confirmam a concentração de CBD, ausência de contaminantes e conformidade com <0,2% THC.'
            }
        ]
    };

    const contactMethods = [
        {
            icon: Mail,
            title: 'Email',
            value: siteSettings?.siteEmail || 'info@cbdbarato.pt',
            description: 'Resposta em 24h',
            action: `mailto:${siteSettings?.siteEmail || 'info@cbdbarato.pt'}`
        },
        {
            icon: Phone,
            title: 'Telefone',
            value: siteSettings?.sitePhone || '+351 253 000 000',
            description: 'Seg-Sex: 9h-18h',
            action: `tel:${siteSettings?.sitePhone || '+351253000000'}`
        },
        {
            icon: MessageCircle,
            title: 'WhatsApp',
            value: 'Chat ao Vivo',
            description: 'Resposta imediata',
            action: 'https://wa.me/351253000000'
        }
    ];

    // Get FAQs for active category
    const displayedFaqs = activeCategory === 'all' 
        ? Object.values(faqByCategory).flat()
        : faqByCategory[activeCategory] || [];

    // Filter by search
    const filteredFaqs = searchQuery
        ? displayedFaqs.filter(faq =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : displayedFaqs;

    return (
        <>
            <div className="container mx-auto px-4 py-12">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <Badge className="mb-4" variant="outline">
                        <HelpCircle className="h-3 w-3 mr-1" />
                        Centro de Ajuda
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        ❓ Perguntas Frequentes
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Encontre respostas rápidas para as suas dúvidas sobre CBD, produtos, 
                        envios, pagamentos e muito mais.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-12">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Pesquisar perguntas... (ex: envio, pagamento, CBD)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12"
                        />
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {faqCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <Button
                                key={category.id}
                                variant={activeCategory === category.id ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveCategory(category.id)}
                                className="gap-2"
                            >
                                <Icon className={`h-4 w-4 ${activeCategory === category.id ? '' : category.color}`} />
                                {category.name}
                            </Button>
                        );
                    })}
                </div>

                {/* FAQ Component from existing file */}
                {activeCategory === 'all' && !searchQuery && (
                    <div className="mb-12">
                        <FAQ />
                    </div>
                )}

                {/* Filtered FAQs */}
                {(activeCategory !== 'all' || searchQuery) && (
                    <div className="max-w-4xl mx-auto mb-12">
                        <h2 className="text-2xl font-bold mb-6">
                            {searchQuery 
                                ? `Resultados para "${searchQuery}"` 
                                : faqCategories.find(c => c.id === activeCategory)?.name}
                        </h2>
                        {filteredFaqs.length > 0 ? (
                            <div className="space-y-4">
                                {filteredFaqs.map((faq, index) => (
                                    <Card key={index}>
                                        <CardHeader>
                                            <CardTitle className="text-lg">{faq.question}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground">{faq.answer}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Tente ajustar a sua pesquisa ou escolha outra categoria.
                                    </p>
                                    <Button onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                                        Ver Todas as Perguntas
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Contact Section */}
                <Card className="bg-muted/50 mb-12">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl mb-2">Não encontrou resposta?</CardTitle>
                        <CardDescription className="text-base">
                            A nossa equipa está pronta para ajudar! Entre em contacto connosco.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-6">
                            {contactMethods.map((method, index) => {
                                const Icon = method.icon;
                                return (
                                    <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                                        <CardHeader>
                                            <Icon className="h-10 w-10 mx-auto text-primary mb-3" />
                                            <CardTitle className="text-lg">{method.title}</CardTitle>
                                            <CardDescription>{method.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button variant="outline" className="w-full" asChild>
                                                <a href={method.action}>
                                                    {method.value}
                                                </a>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Help Resources */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <Package className="h-10 w-10 text-primary mb-3" />
                            <CardTitle>Política de Devoluções</CardTitle>
                            <CardDescription>
                                Saiba mais sobre como devolver produtos e obter reembolso.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="ghost" asChild>
                                <a href="/legal/refund-policy">Ver Política →</a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <Shield className="h-10 w-10 text-primary mb-3" />
                            <CardTitle>Termos e Condições</CardTitle>
                            <CardDescription>
                                Leia os nossos termos de serviço e condições de uso.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="ghost" asChild>
                                <a href="/legal/terms-of-service">Ver Termos →</a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <Leaf className="h-10 w-10 text-primary mb-3" />
                            <CardTitle>Guias & Recursos</CardTitle>
                            <CardDescription>
                                Aceda a guias completos sobre CBD e produtos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="ghost" asChild>
                                <a href="/resources">Ver Recursos →</a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div> 
        </>
    );
};

export default FaqPageClient;
