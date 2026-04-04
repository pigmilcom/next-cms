// @/app/(actions)/shop/partials/RelatedProducts.jsx
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/common/ProductCard';
import Swiper from '@/components/common/Swiper';

const RelatedProducts = ({ products = [] }) => {
    const t = useTranslations('Shop');
    const scrollContainerRef = useRef(null);
    const [showNavigation, setShowNavigation] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Check if navigation buttons should be shown
    useEffect(() => {
        const checkNavigation = () => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const needsScroll = container.scrollWidth > container.clientWidth;
                setShowNavigation(needsScroll);
                updateScrollButtons();
            }
        };

        checkNavigation();
        window.addEventListener('resize', checkNavigation);
        return () => window.removeEventListener('resize', checkNavigation);
    }, [products]);

    // Update scroll button states
    const updateScrollButtons = () => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            setCanScrollLeft(container.scrollLeft > 0);
            setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
        }
    };

    // Handle scroll update callback from Swiper
    const handleScrollUpdate = ({ canScrollLeft: left, canScrollRight: right }) => {
        setCanScrollLeft(left);
        setCanScrollRight(right);
    };

    // Handle scroll navigation (for desktop buttons)
    const handleScroll = (direction) => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const itemWidth = container.querySelector('div')?.offsetWidth || 200;
            const gap = 16;
            const scrollAmount = itemWidth + gap;

            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (!products || products.length === 0) return null;

    return (
        <div className="w-full">
            <div className="relative px-2 sm:px-1 md:px-0">
                {/* Navigation Buttons */}
                {showNavigation && canScrollLeft && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-0 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all z-10 hidden md:flex"
                        onClick={() => handleScroll('left')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}
                {showNavigation && canScrollRight && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-0 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all z-10 hidden md:flex"
                        onClick={() => handleScroll('right')}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}

                <Swiper scrollRef={scrollContainerRef} onScrollUpdate={handleScrollUpdate} className="-mx-4 px-4 py-2">
                    <div className="flex gap-4 lg:gap-6">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="flex-none w-[calc(63.333%-0.45rem)] md:w-[calc(43.333%-0.577rem)] lg:w-[calc(33.333%-0.667rem)] xl:w-[calc(25.333%-0.777rem)]">
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </Swiper>
            </div>
        </div>
    );
};

export default RelatedProducts;
