// @/app/(actions)/shop/partials/ShopLayout.jsx (Shared Shop Layout Component)
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpDown, CircleChevronLeft, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react'; 
import ProductCard from '@/components/common/ProductCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ShopLayout = ({
    initialProducts = [],
    initialCategories = [],
    initialCollections = [],
    currentCategory = null,
    pageConfig = {}
}) => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const productsRef = useRef(null);
    const previousPageRef = useRef(null);
    const locale = useLocale();
    const t = useTranslations('Shop');

    // Determine if this is the main shop page or category page
    const isMainShop = !currentCategory;
    const selectedCategory = currentCategory?.slug || 'all';

    const [selectedCollection, setSelectedCollection] = useState(searchParams.get('collection') || 'all');
    const [selectedFilter, setSelectedFilter] = useState(searchParams.get('filter') || 'all');
    const [searchTerm, setSearchTerm] = useState(
        searchParams.get('search') ? searchParams.get('search').toLowerCase() : ''
    );
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [showFilters, setShowFilters] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(false);
    const [isHeroExpanded, setIsHeroExpanded] = useState(false);
    const itemsPerPage = 25;

    // Validate if collection exists
    const collectionParam = searchParams.get('collection');
    const collectionNotFound =
        collectionParam && collectionParam !== 'all' && !initialCollections.some((col) => col.slug === collectionParam);

    // Detect screen size for auto-showing filters on large screens
    useEffect(() => {
        const checkScreenSize = () => {
            setIsLargeScreen(window.innerWidth >= 1280); // xl breakpoint
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Sync state with URL params when they change externally
    useEffect(() => {
        setSelectedCollection(searchParams.get('collection') || 'all');
        setSelectedFilter(searchParams.get('filter') || 'all');
        setSearchTerm(searchParams.get('search') || '');
        setSortBy(searchParams.get('sort') || 'default');
        setCurrentPage(parseInt(searchParams.get('page') || '1'));
    }, [searchParams]);

    // Update URL params when filters change
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        let hasChanges = false;

        const updateParam = (key, value, defaultValue) => {
            const currentValue = params.get(key);
            if (value === defaultValue) {
                if (currentValue !== null) {
                    params.delete(key);
                    hasChanges = true;
                }
            } else if (currentValue !== value) {
                params.set(key, value);
                hasChanges = true;
            }
        };

        updateParam('collection', selectedCollection, 'all');
        updateParam('filter', selectedFilter, 'all');
        updateParam('search', searchTerm, '');
        updateParam('sort', sortBy, 'default');
        updateParam('page', currentPage.toString(), '1');

        if (hasChanges) {
            const baseUrl = isMainShop ? '/shop' : `/shop/${selectedCategory}`;
            const newUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
            router.push(newUrl, { scroll: false });
        }
    }, [selectedCollection, selectedFilter, searchTerm, sortBy, currentPage, router, selectedCategory, isMainShop]);

    // Handler for category selection
    const handleCategoryChange = (slug) => {
        if (slug === 'all') {
            router.push('/shop');
        } else {
            router.push(`/shop/${slug}`);
        }
    };

    // Filter products
    const filteredProducts = initialProducts.filter((product) => {
        // Match by collection
        let matchesCollection = selectedCollection === 'all';
        if (!matchesCollection && product.collections && Array.isArray(product.collections)) {
            const selectedCollectionObj = initialCollections.find((col) => col.slug === selectedCollection);
            matchesCollection =
                selectedCollectionObj && product.collections.some((col) => col.id === selectedCollectionObj.id);
        }

        const matchesSearch =
            searchTerm === '' ||
            product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = true;
        if (selectedFilter === 'new') matchesFilter = product.isNew === true;
        if (selectedFilter === 'best-of') matchesFilter = product.bestof === true;
        if (selectedFilter === 'bestof') matchesFilter = product.bestof === true;
        if (selectedFilter === 'deals') matchesFilter = product.discount > 0;

        return matchesCollection && matchesSearch && matchesFilter;
    });

    // Sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case 'price-asc':
                return (a.price || 0) - (b.price || 0);
            case 'price-desc':
                return (b.price || 0) - (a.price || 0);
            case 'name':
                return (a.name || '').localeCompare(b.name || '');
            case 'default':
            default: {
                // Featured products first only on main shop page (all categories)
                if (isMainShop && a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
                // New products next
                if (a.isNew !== b.isNew) return b.isNew ? 1 : -1;
                // Best sellers
                if (a.bestof !== b.bestof) return b.bestof ? 1 : -1;
                // Finally by creation date (newest first)
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            }
        }
    });

    // Pagination
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
    const paginatedProducts = sortedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCollection, selectedFilter, searchTerm, sortBy]);

    // Scroll to products section when page changes
    useEffect(() => {
        if (previousPageRef.current !== null && previousPageRef.current !== currentPage && productsRef.current) {
            setTimeout(() => {
                const element = productsRef.current;
                const yOffset = 30;
                const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }, 300);
        }
        previousPageRef.current = currentPage;
    }, [currentPage]);

    const handleClearFilters = () => {
        setSelectedCollection('all');
        setSelectedFilter('all');
        setSearchTerm('');
        setSortBy('default');
        setCurrentPage(1);
    };

    const activeFiltersCount = [
        selectedCollection !== 'all',
        selectedFilter !== 'all',
        searchTerm !== '',
        sortBy !== 'default'
    ].filter(Boolean).length;

    // Display not found page if collection doesn't exist
    if (collectionNotFound) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                        <div>
                            <Image
                                alt="Not Found"
                                width={200}
                                height={200}
                                unoptimized
                                priority={false}
                                src="/images/empty_state.webp"
                                className="filter grayscale opacity-90 mx-auto"
                            />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold mb-4">{t('collectionNotFound')}</h1>
                    <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto">
                        {t('collectionNotFoundDescription', { collection: collectionParam })}
                    </p>
                    <Button onClick={() => router.push('/shop')} size="lg" className="min-w-50">
                        {t('backToShop')}
                    </Button>
                </div>
            </div>
        );
    }

    // Get hero content based on page type
    const getHeroTitle = () => {
        if (isMainShop) {
            return t('ourCatalog');
        }
        return (
            currentCategory?.titleML?.[locale] ||
            currentCategory?.title ||
            currentCategory?.nameML?.[locale] ||
            currentCategory?.name ||
            t('category')
        );
    };

    const getHeroDescription = () => {
        if (isMainShop) {
            return t('catalogDescription');
        }
        return (
            currentCategory?.descriptionML?.[locale] ||
            currentCategory?.description ||
            t('categoryDescription')
        );
    }; 

    return ( 
            <motion.div
            ref={productsRef}
            className="container mx-auto py-8 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6">
                <h1 className="text-3xl font-bold flex flex-nowrap items-center gap-4">
                    <Link href={isMainShop ? '/' : `/shop`} className="hover:text-primary transition-colors duration-200">
                        <CircleChevronLeft className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-200" />
                    </Link>
                    {getHeroTitle()}
                </h1>
                <div className="text-xl text-muted-foreground">
                    <div className={`relative ${!isHeroExpanded ? 'line-clamp-2 sm:line-clamp-none' : ''}`}>
                        <span className="text-responsive">{getHeroDescription()}</span>
                        {!isHeroExpanded && (
                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-background to-transparent pointer-events-none sm:hidden" />
                        )}
                    </div>
                    <button
                        onClick={() => setIsHeroExpanded(!isHeroExpanded)}
                        className="text-muted-foreground underline text-sm mt-1 font-medium sm:hidden">
                        {isHeroExpanded ? t('close') : t('readMore')}
                    </button>
                </div>
            </div>  

            {/* Catalog Grid Section */}
            <div className="relative flex flex-col xl:flex-row gap-8 xl:gap-6">
                {/* Filters Section */}
                <div className="w-full xl:w-min xl:h-min xl:sticky xl:top-30 xl:overflow-hidden xl:mb-8">
                    <div className="xl:mt-4">
                        <div className="relative space-y-4 mb-2 flex flex-nowrap items-center gap-2 md:gap-3 lg:gap-4">
                            {/* Search Bar */}
                            <div className="shrink-0 flex items-center justify-between mb-0 xl:hidden">
                                <Button
                                    variant="outline"
                                    size="xl"
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer">
                                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                                    <span className="hidden md:block text-sm font-medium text-muted-foreground">
                                        {t('filterAndSort')}
                                    </span>
                                    {activeFiltersCount > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="h-5 px-2 bg-brand text-black font-semibold">
                                            {activeFiltersCount}
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                            <div className="relative flex flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder={t('searchProducts')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-10 h-12 text-base"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4 mb-2">
                            {/* Filter Toggle */}
                            <div className="w-full flex justify-end">
                                {activeFiltersCount > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={handleClearFilters}
                                        className="w-full text-sm md:text-base text-red-500/90 hover:text-red-600 font-semibold">
                                        {t('clearFilters')}
                                    </Button>
                                )}
                            </div>

                            {/* Collapsible Filters */}
                            {(showFilters || isLargeScreen) && (
                                <>
                                    {/* Category Carousel */}
                                    <div className="overflow-x-auto xl:overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40 -mx-4 px-4">
                                        <div className="flex xl:grid xl:grid-cols-2 gap-3 xl:gap-4 min-w-max pb-2">
                                            {/* All Categories */}
                                            <button
                                                onClick={() => handleCategoryChange('all')}
                                                className={`flex-none w-32 xl:w-32 group ${selectedCategory === 'all' ? 'border border-brand rounded-lg' : ''}`}>
                                                <div className="bg-card border border-border rounded-lg p-3 text-center hover:shadow-lg transition-all h-full">
                                                    <h3
                                                        className={`text-xs font-semibold transition-colors ${selectedCategory === 'all' ? 'text-primary' : 'group-hover:text-primary'}`}>
                                                        {t('allCategories')}
                                                    </h3>
                                                </div>
                                            </button>

                                            {/* Category Cards */}
                                            {initialCategories.map((category) => (
                                                <button
                                                    key={category.id}
                                                    onClick={() => handleCategoryChange(category.slug)}
                                                    className={`flex-none w-32 lg:w-28 xl:w-32 group ${selectedCategory === category.slug ? 'border border-brand rounded-lg' : ''}`}>
                                                    <div className="bg-card border border-border rounded-lg p-3 text-center hover:shadow-lg transition-all h-full">
                                                        {category.image ? (
                                                            <div className="relative w-full h-16 mb-2">
                                                                <Image
                                                                    src={category.image}
                                                                    alt={category.nameML?.[locale] || category.name}
                                                                    fill
                                                                    unoptimized
                                                                    priority={false}
                                                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 128px"
                                                                    className={`dark:invert ${selectedCategory === category.slug ? 'filter-brand' : ''} object-contain group-hover:scale-105 transition-transform`}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="relative w-full h-16 mb-2 flex items-center justify-center bg-muted rounded">
                                                                <span className="text-2xl">📦</span>
                                                            </div>
                                                        )}
                                                        <h3
                                                            className={`text-xs font-semibold transition-colors line-clamp-2 ${selectedCategory === category.slug ? 'text-primary' : 'group-hover:text-primary'}`}>
                                                            {category.nameML?.[locale] || category.name}
                                                        </h3>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        {/* Collection Filter */}
                                        <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                                            <SelectTrigger className="flex-1 h-10">
                                                <SelectValue placeholder={t('collections')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('allCollections')}</SelectItem>
                                                {initialCollections.map((collection) => (
                                                    <SelectItem key={collection.id} value={collection.slug}>
                                                        {collection.nameML?.[locale] || collection.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Discover Filter */}
                                        <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                                            <SelectTrigger className="flex-1 h-10">
                                                <SelectValue placeholder={t('discover')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('allProducts')}</SelectItem>
                                                <SelectItem value="new">{t('newProducts')}</SelectItem>
                                                <SelectItem value="bestof">{t('bestSellers')}</SelectItem>
                                                <SelectItem value="deals">{t('deals')}</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Sort Filter */}
                                        <Select value={sortBy} onValueChange={setSortBy}>
                                            <SelectTrigger className="h-10 shrink-0 w-48">
                                                <SelectValue>
                                                    {sortBy === 'default' ? (
                                                        <div className="flex items-center gap-2">
                                                            <ArrowUpDown className="h-4 w-4" />
                                                            <span>{t('sort')}</span>
                                                        </div>
                                                    ) : sortBy === 'price-asc' ? (
                                                        t('priceAsc')
                                                    ) : sortBy === 'price-desc' ? (
                                                        t('priceDesc')
                                                    ) : (
                                                        t('nameAsc')
                                                    )}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default">
                                                    <div className="flex items-center gap-2">
                                                        <span>{t('default')}</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="price-asc">{t('priceAsc')}</SelectItem>
                                                <SelectItem value="price-desc">{t('priceDesc')}</SelectItem>
                                                <SelectItem value="name">{t('nameAsc')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                <div className="flex flex-col gap-4 lg:flex-1">
                    {paginatedProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="flex justify-center mb-2 md:mb-4">
                                <div>
                                    <Image
                                        alt={t('emptyState')}
                                        width={160}
                                        height={160}
                                        unoptimized
                                        priority={false}
                                        src="/images/empty_state.webp"
                                        className="filter grayscale opacity-90 mx-auto"
                                    />
                                </div>
                            </div>
                            <h3 className="text-2xl font-semibold mb-2">{t('noProductsFound')}</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                {t('noProductsFoundDescription')}
                            </p>
                            {activeFiltersCount > 0 && (
                                <Button onClick={handleClearFilters} size="lg">
                                    {t('clearFilters')}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Products Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 space-y-2 md:space-y-1 xl:space-y-0.5 lg:gap-6 mb-8">
                                {paginatedProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mx-2 sm:mx-0 mt-4 pt-6 border-t border-border">
                                    <p className="text-sm text-muted-foreground">
                                        {t('showingXtoYofZ', {
                                            start: (currentPage - 1) * itemsPerPage + 1,
                                            end: Math.min(currentPage * itemsPerPage, sortedProducts.length),
                                            total: sortedProducts.length
                                        })}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}>
                                            <ChevronLeft className="h-4 w-4" />
                                            <span className="hidden sm:inline ml-1">{t('previous')}</span>
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                                let pageNumber;
                                                if (totalPages <= 5) {
                                                    pageNumber = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNumber = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNumber = totalPages - 4 + i;
                                                } else {
                                                    pageNumber = currentPage - 2 + i;
                                                }

                                                return (
                                                    <Button
                                                        key={i}
                                                        variant={currentPage === pageNumber ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(pageNumber)}
                                                        className="min-w-10">
                                                        {pageNumber}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}>
                                            <span className="hidden sm:inline mr-1">{t('next')}</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
 
        </motion.div>
    );
};

export default ShopLayout;
