// @/app/(frontend)/components/HotProducts.jsx
'use client';

import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getCatalog } from '@/lib/server/store';
import ProductCard from '@/components/common/ProductCard';
import Swiper from '@/components/common/Swiper';

const HotProducts = ({ onProductClick }) => {
    const t = useTranslations('Cart');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const productsData = await getCatalog({ hasStock: true, limit: 10 });
                const sortedProducts = productsData.data.sort((a, b) => {
                    // Featured products first
                    if (a.isFeatured && !b.isFeatured) return -1;
                    if (!a.isFeatured && b.isFeatured) return 1;
                    
                    // Within same featured status, sort by name
                    const nameA = a.nameML?.[navigator.language?.split('-')[0]] || a.name || '';
                    const nameB = b.nameML?.[navigator.language?.split('-')[0]] || b.name || '';
                    return nameA.localeCompare(nameB);
                });
                setProducts(sortedProducts);
            } catch (error) {
                console.error('Error loading hot products:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, []);

    const handleScrollUpdate = (scrollData) => {
        setCanScrollLeft(scrollData.canScrollLeft);
        setCanScrollRight(scrollData.canScrollRight);
    };

    const handleScroll = (direction) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const cardWidth = container.querySelector('.product-card')?.offsetWidth || 250;
        const scrollAmount = cardWidth + 16; // card width + gap

        if (direction === 'left') {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="py-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="min-w-50 space-y-2">
                            <Skeleton className="h-48 w-full rounded-lg" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (products.length === 0) return null;

    const showNavigation = products.length > 2;

    return (
        <div className="py-4 border-t border-border">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold text-lg">{t('hotProducts')}</h3>
                </div>
                {showNavigation && (
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleScroll('left')}
                            disabled={!canScrollLeft}
                            className="p-1.5 rounded-full border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            aria-label="Scroll left">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => handleScroll('right')}
                            disabled={!canScrollRight}
                            className="p-1.5 rounded-full border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            aria-label="Scroll right">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            <Swiper
                autoScroll={true}
                scrollTime={3}
                scrollRef={scrollContainerRef}
                className="py-2"
                onScrollUpdate={handleScrollUpdate}>
                <div className="flex gap-4">
                    {products.map((product) => (
                        <div key={product.id} className="product-card min-w-55 max-w-55 shrink-0">
                            <ProductCard product={product} hideToast={true} onNavigate={onProductClick} />
                        </div>
                    ))}
                </div>
            </Swiper>
        </div>
    );
};

export default HotProducts;
