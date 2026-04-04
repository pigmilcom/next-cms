// @/app/(frontend)/shop/[productId]/page.client.jsx
'use client';

import { motion } from 'framer-motion';
import { Award, Heart, Share2, Star, ChevronDown, ChevronUp, ChevronLeft, CircleChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ProductJsonLd } from 'next-seo';
import { useEffect, useRef, useState } from 'react';
import { useCart } from 'react-use-cart';
import { toast } from 'sonner'; 
import RelatedProducts from '@/app/(frontend)/shop/partials/RelatedProducts';
import Swiper from '@/components/common/Swiper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth, useSettings } from '@/context/providers';
import { addToWatchlist, removeFromWatchlist, submitReview } from '@/lib/server/store.js';

const ProductPageClient = ({
    initialProduct,
    initialCategory,
    initialRelatedProducts,
    initialOptions,
    clubSettings,
    userOrdersData,
    userFavoritesData
}) => {
    const { user } = useAuth();
    const { siteSettings, storeSettings } = useSettings();
    const t = useTranslations('Shop');
    const locale = useLocale();
    const router = useRouter();
    const { addItem, inCart } = useCart();

    // User data from server component
    const isAuthenticated = !!user;
    const [product] = useState(initialProduct);
    const [category] = useState(initialCategory);
    const [relatedProducts] = useState(initialRelatedProducts);
    const [options] = useState(initialOptions);
    const [reviews, setReviews] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [selectedOption, setSelectedOption] = useState(initialOptions?.[0] || null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [togglingFavorite, setTogglingFavorite] = useState(false);
    const [canReview, setCanReview] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        rating: 5,
        comment: '',
        isAnonymous: false
    });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewStatus, setReviewStatus] = useState(null);
    const [showBottomBar, setShowBottomBar] = useState(true);
    const quantityOptionsRef = useRef(null);
    const lastScrollY = useRef(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    
    // Manual scroll states for reviews
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [autoScrollPaused, setAutoScrollPaused] = useState(false);
    const reviewsContainerRef = useRef(null);
    const scrollTimeoutRef = useRef(null);
    
    // Reviews expansion and pagination states
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const reviewsPerPage = 8;

    // Helper functions (matches ProductCard.jsx)

    // Strip HTML tags from text
    const stripHtmlTags = (html) => {
        if (!html) return '';
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    };  

    // Get Type or Specie value from attributes
    const getTypeOrSpecie = () => {
        if (!product || !product.attributes || !Array.isArray(product.attributes)) return null;
        const typeAttribute = product.attributes.find((attr) => attr.name === 'Type');
        if (typeAttribute && typeAttribute.value) return typeAttribute.value;
        const specieAttribute = product.attributes.find((attr) => attr.name === 'Specie');
        return specieAttribute && specieAttribute.value ? specieAttribute.value : null;
    };

    // Get lowest price per unit from quantity pricing tiers (matches ProductCard.jsx)
    const getLowestQuantityPrice = () => {
        if (
            !product ||
            !product.hasQuantityPricing ||
            !product.quantityPricing ||
            product.quantityPricing.length === 0
        ) {
            return parseFloat(product?.price || 0);
        }

        // Calculate price per unit for all tiers (price / quantity)
        const pricesPerUnit = product.quantityPricing.map((tier) => {
            return parseFloat(tier.price) / parseFloat(tier.quantity);
        });

        // Return the lowest price per unit
        return Math.min(...pricesPerUnit);
    };

    // Get badge for option (Popular, Best-Seller, or null)
    // Strategy: 1 option = no badges, 2 options = 1 Popular, 3+ options = 1 Popular + 1 Best-Seller
    const getOptionBadge = (option, index, allOptions) => {
        const totalOptions = allOptions.length;

        // No badges for single option
        if (totalOptions === 1) return null;

        // Use option ID for consistent assignment
        const seed = option.id ? option.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : index;
        const normalized = seed % totalOptions;

        if (totalOptions === 2) {
            // Only 1 badge: Popular on the first option (by normalized seed)
            return normalized === 0
                ? {
                      text: 'Popular',
                      gradient: 'from-purple-700 via-purple-600 to-purple-800'
                  }
                : null;
        } else {
            // 3+ options: 1 Popular + 1 Best-Seller
            if (normalized === 0) {
                return {
                    text: 'Popular',
                    gradient: 'from-purple-700 via-purple-600 to-purple-800'
                };
            } else if (normalized === 1) {
                return {
                    text: 'Best-Seller 🔥',
                    gradient: 'from-orange-600 via-orange-500 to-orange-700'
                };
            }
            return null;
        }
    };

    // Set initial selected image to first gallery image
    useEffect(() => {
        if (product?.gallery && product.gallery.length > 0) {
            setSelectedImageIndex(0); // Always start with first image
        }
    }, [product]);

    // Load reviews and user-specific data
    useEffect(() => {
        const loadUserData = async () => {
            if (!product) return;

            try {
                // Load reviews from product data
                setReviews(product.reviews || []);

                // Check if user can review (must be logged in and have purchased)
                if (isAuthenticated && user?.email) {
                    // Load all user-specific data in parallel
                    const [favoriteStatus, hasPurchased] = await Promise.all([
                        userFavoritesData.length > 0 ? true : false,
                        userOrdersData.length > 0 ? true : false
                    ]);

                    setIsFavorite(favoriteStatus);
                    setCanReview(hasPurchased);

                    // Check if user has already reviewed this product (only if purchased)
                    if (hasPurchased) {
                        let reviewStatusData = product.reviews || [];
                        reviewStatusData = reviewStatusData.filter((review) => {
                            const createdByEmailMatch = review?.createdBy?.toLowerCase() === user.email.toLowerCase();
                            const createdByIdMatch = review?.createdBy?.toLowerCase() === user.id.toLowerCase();
                            const customerEmailMatch =
                                review?.customerEmail?.toLowerCase() === user.email.toLowerCase();
                            return createdByEmailMatch || createdByIdMatch || customerEmailMatch;
                        });
                        setHasReviewed(reviewStatusData.length > 0);
                        setReviewStatus(reviewStatusData.status);
                    }
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        };

        loadUserData();
    }, [product, isAuthenticated, user]);

    // Handle scroll to show/hide mobile bottom bar
    useEffect(() => {
        // Early return if no window or ref
        if (typeof window === 'undefined') return;

        // Mobile detection - simplified to be more reliable
        const isMobile = () => {
            return window.innerWidth < 768; // md breakpoint
        };

        const handleScroll = () => {
            // Only run on mobile devices
            if (!isMobile()) {
                setShowBottomBar(true); // Always show on desktop/tablet
                return;
            }

            // Ensure quantityOptionsRef is available
            if (!quantityOptionsRef.current) {
                setShowBottomBar(true); // Default to visible if ref not ready
                return;
            }

            try {
                const currentScrollY = window.scrollY;
                const quantityOptionsElement = quantityOptionsRef.current;
                const quantityOptionsTop = quantityOptionsElement.getBoundingClientRect().top + window.scrollY;
                const windowHeight = window.innerHeight;

                // Calculate threshold: show bar when user is above the quantity section
                // Hide when user scrolls past it with some buffer
                const buffer = Math.min(windowHeight * 0.15, 100); // 15% of viewport or 100px max
                const scrollThreshold = quantityOptionsTop - buffer;

                // Toggle bottom bar based on scroll position
                if (currentScrollY > scrollThreshold) {
                    // User has scrolled past quantity options section - hide bar
                    setShowBottomBar(false);
                } else {
                    // User is above quantity options section - show bar
                    setShowBottomBar(true);
                }

                lastScrollY.current = currentScrollY;
            } catch (error) {
                console.error('Scroll handler error:', error);
                // Fallback: show bar if any error occurs
                setShowBottomBar(true);
            }
        };

        // Handle resize events (orientation changes, window resize)
        const handleResize = () => {
            if (!isMobile()) {
                setShowBottomBar(true); // Always visible on desktop
            } else {
                // Re-check scroll position on mobile after resize
                setTimeout(handleScroll, 100); // Small delay to allow layout to settle
            }
        };

        // Throttled scroll handler for better performance
        let scrollTimeout = null;
        const throttledScroll = () => {
            if (scrollTimeout) return;

            scrollTimeout = setTimeout(() => {
                handleScroll();
                scrollTimeout = null;
            }, 16); // ~60fps
        };

        // Add event listeners
        window.addEventListener('scroll', throttledScroll, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });

        // Initial setup with delay to ensure DOM is ready and refs are attached
        const initialCheck = () => {
            if (isMobile()) {
                handleScroll();
            } else {
                setShowBottomBar(true);
            }
        };

        // Small delay to ensure quantityOptionsRef is properly attached
        setTimeout(initialCheck, 150);

        // Cleanup function
        return () => {
            window.removeEventListener('scroll', throttledScroll);
            window.removeEventListener('resize', handleResize);
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
        };
    }, [quantityOptionsRef]); // Include ref in dependencies

    // Handle manual scrolling for reviews
    useEffect(() => {
        const reviewsContainer = reviewsContainerRef.current;
        if (!reviewsContainer || reviews.length <= 2 || showAllReviews) return;

        let isScrolling = false;
        let startY = 0;
        let startX = 0;

        const handleTouchStart = (e) => {
            isScrolling = false;
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
        };

        const handleTouchMove = (e) => {
            if (isScrolling) return;
            
            const currentY = e.touches[0].clientY;
            const currentX = e.touches[0].clientX;
            const diffY = Math.abs(currentY - startY);
            const diffX = Math.abs(currentX - startX);
            
            // Detect vertical scroll
            if (diffY > diffX && diffY > 10) {
                isScrolling = true;
                setIsUserScrolling(true);
                setAutoScrollPaused(true);
                
                // Clear existing timeout
                if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current);
                }
                
                // Set timeout to resume auto-scroll after 1 second of inactivity
                scrollTimeoutRef.current = setTimeout(() => {
                    setIsUserScrolling(false);
                    setAutoScrollPaused(false);
                }, 1000);
            }
        };

        const handleWheel = (e) => {
            if (Math.abs(e.deltaY) > 0) {
                setIsUserScrolling(true);
                setAutoScrollPaused(true);
                
                // Clear existing timeout
                if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current);
                }
                
                // Set timeout to resume auto-scroll after 1 second of inactivity
                scrollTimeoutRef.current = setTimeout(() => {
                    setIsUserScrolling(false);
                    setAutoScrollPaused(false);
                }, 1000);
            }
        };

        const handleTouchEnd = () => {
            // Touch end handling is managed by the timeout
        };

        // Add event listeners
        reviewsContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        reviewsContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
        reviewsContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
        reviewsContainer.addEventListener('wheel', handleWheel, { passive: true });

        return () => {
            // Cleanup
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            if (reviewsContainer) {
                reviewsContainer.removeEventListener('touchstart', handleTouchStart);
                reviewsContainer.removeEventListener('touchmove', handleTouchMove);
                reviewsContainer.removeEventListener('touchend', handleTouchEnd);
                reviewsContainer.removeEventListener('wheel', handleWheel);
            }
        };
    }, [reviews, showAllReviews]);

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!product) return;

        // Check stock: 0 = out of stock, -1 = unlimited, > 0 = in stock
        if (product.stock === 0) {
            toast.error(t('outOfStock'));
            return;
        }

        // Build item name with selected option or base quantity/unit
        let itemName;
        if (selectedOption) {
            itemName = `${product.name} - ${selectedOption.name}`;
        } else if (product.quantity && product.quantityUnit) {
            itemName = `${product.name} - ${product.quantity}${product.quantityUnit}`;
        } else {
            itemName = product.name;
        }

        // Create unique cart ID for different quantity options
        // Format: productId-quantityValue (e.g., "123-5g" or "123-10g")
        let quantityIdentifier = 'default';
        if (selectedOption?.quantity && selectedOption?.unit) {
            quantityIdentifier = `${selectedOption.quantity}${selectedOption.unit}`.toLowerCase().replace(/\s+/g, '');
        } else if (product.quantity && product.quantityUnit) {
            quantityIdentifier = `${product.quantity}${product.quantityUnit}`.toLowerCase().replace(/\s+/g, '');
        }
        const cartItemId = `${product.id}-${quantityIdentifier}`;

        // Check if item already exists in cart
        if (inCart(cartItemId)) {
            toast.error(
                <span>
                    {t('productAlreadyInCart') || 'Product already in cart'}
                    <button
                        style={{
                            marginLeft: 8,
                            color: '#16a34a',
                            textDecoration: 'underline',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            if (typeof toast.dismiss === 'function') {
                                toast.dismiss();
                            }
                            router.push('/cart');
                        }}>
                        {t('viewCart')}
                    </button>
                </span>
            );
            return;
        }

        addItem({
            id: cartItemId,
            productId: product.id, // Keep original product ID for reference
            name: itemName,
            discount: product.discount || 0,
            discountAmount: product.discountAmount || 0,
            discountType: product.discountType || 'percentage',
            priceBefore: product.compareAtPrice || product.price,
            price: currentPrice,
            image: product.image,
            quantity: quantity,
            selectedQuantity: selectedOption?.quantity || product.quantity,
            selectedUnit: selectedOption?.unit || product.quantityUnit,
            quantityOption: selectedOption?.name || `${product.quantity || ''}${product.quantityUnit || ''}`, // For display/reference
            // Additional fields for cart consistency
            stock: product.stock,
            categoryId: product.categoryId,
            slug: product.slug
        });

        toast.success(
            <span>
                {t('addedToCart', { productName: product.name })}
                <button
                    style={{
                        marginLeft: 8,
                        color: '#16a34a',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                    onClick={() => {
                        if (typeof toast.dismiss === 'function') {
                            toast.dismiss();
                        }
                        router.push('/cart');
                    }}>
                    {t('viewCart')}
                </button>
            </span>
        );
    };

    const handleToggleFavorite = async () => {
        if (!isAuthenticated || !user?.email) {
            toast.error(t('loginToAddFavorites'));
            return;
        }

        if (togglingFavorite) return;

        setTogglingFavorite(true);
        try {
            if (isFavorite) {
                const result = await removeFromWatchlist(user.id, product.id);
                console.log('Add to watchlist result:', result);
                if (result.success) {
                    setIsFavorite(false);
                    toast.success(t('removedFromFavorites'));
                } else {
                    toast.error(t('failedToUpdate'));
                }
            } else {
                const result = await addToWatchlist(user.id, product.id, product.name);
                if (result.success) {
                    setIsFavorite(true);
                    toast.success(t('addedToFavorites'));
                } else {
                    toast.error(t('failedToUpdate'));
                }
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            toast.error(t('networkError'));
        } finally {
            setTogglingFavorite(false);
        }
    };

    const handleShare = async () => {
        // Build rich product description for sharing
        const currentPrice = selectedOption
            ? parseFloat(selectedOption.price).toFixed(2)
            : parseFloat(product.price).toFixed(2);
        const currency = storeSettings?.currency || 'EUR';

        let shareText = product.name;

        // Add price with currency symbol
        if (currentPrice) {
            const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
            const oldPrice =
                selectedOption && selectedOption.compareAtPrice
                    ? parseFloat(selectedOption.compareAtPrice).toFixed(2)
                    : parseFloat(product.compareAtPrice);

            // Show price comparison if there's a discount
            if (hasDiscount && oldPrice && oldPrice > currentPrice) {
                shareText += ` - ${currentPrice}${currencySymbol} (antes ${oldPrice}${currencySymbol})`;
            } else {
                shareText += ` - ${currentPrice}${currencySymbol}`;
            }

            // Add quantity info if available
            if (selectedOption?.quantity && selectedOption?.unit) {
                shareText += ` / ${selectedOption.quantity}${selectedOption.unit}`;
            } else if (product.quantity && product.quantityUnit) {
                shareText += ` / ${product.quantity}${product.quantityUnit}`;
            }
        }

        // Add discount badge if applicable
        if (product.discount > 0) {
            shareText += `${product.discount}% OFF`;
        }

        // Add rating if available with review count
        if (product.rating > 0 && reviews.length > 0) {
            shareText += `\n\n${product.rating.toFixed(1)}/5 (${reviews.length} ${reviews.length === 1 ? 'avaliação' : 'avaliações'})`;
        }

        // Add category if available
        if (category?.name) {
            shareText += `\n\n${category.name}`;
        }

        // Add description if available (strip HTML and truncate to 100 chars for sharing)
        if (product.description) {
            const cleanDescription = stripHtmlTags(product.description);
            if (cleanDescription.length > 100) {
                shareText += `\n\n${cleanDescription.substring(0, 97)}...`;
            } else if (cleanDescription.length > 0) {
                shareText += `\n\n${cleanDescription}`;
            }
        }

        // Add store name
        if (siteSettings?.siteName) {
            shareText += `\n\n${siteSettings.siteName}`;
        }

        const shareData = {
            title: `${product.name} | ${siteSettings?.siteTitle || siteSettings?.siteName}`,
            text: shareText,
            url: window.location.href
        };

        try {
            // Try native share API first (works on most mobile devices)
            if (navigator.canShare && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
                try {
                    await navigator.share(shareData);
                    return; // Exit if share was successful
                } catch (shareError) {
                    // User cancelled or share failed - fall through to clipboard fallback
                    if (shareError.name === 'AbortError') {
                        // User cancelled share - don't show error
                        return;
                    }
                }
            }

            // Fallback: Copy to clipboard
            const clipboardText = `${shareText}\n\n${window.location.href}`;

            // Check if clipboard API is available
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(clipboardText);
                toast.success(t('linkCopied'));
            } else {
                // Fallback for incompatible devices and older browsers using textarea method
                const textArea = document.createElement('textarea');
                textArea.value = clipboardText;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    document.execCommand('copy');
                    textArea.remove();
                    toast.success(t('linkCopied'));
                } catch (err) {
                    textArea.remove();
                    toast.error(t('shareFailed'));
                }
            }
        } catch (error) {
            console.error('Error in share handler:', error);
            toast.error(t('shareFailed'));
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();

        if (!isAuthenticated || !user?.email) {
            toast.error('Please login to submit a review');
            return;
        }

        setSubmittingReview(true);
        try {
            const data = await submitReview({
                productId: product.id,
                productName: product.name,
                rating: reviewForm.rating,
                comment: reviewForm.comment,
                createdBy: user.key,
                userEmail: user.email,
                userName: user.displayName || 'Anonymous',
                isAnonymous: reviewForm.isAnonymous
            });

            if (data.success) {
                toast.success('Avaliação submetida! Ficará visível ap├│s aprovação do administrador.');
                setReviewForm({ rating: 5, comment: '', isAnonymous: false });
                setHasReviewed(true);
                setReviewStatus({ hasReviewed: true, reviewStatus: 'pending' });
                setShowReviewForm(false);
            } else {
                toast.error(data.error || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    if (!product) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold mb-4">{t('productNotFound')}</h1>
                    <Button asChild>
                        <Link href="/shop">{t('backToShop')}</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Calculate delivery date range (current date + 5-7 days)
    const getDeliveryDateRange = () => {
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 5);
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 7);

        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        };

        return `${formatDate(minDate)} e ${formatDate(maxDate)}`;
    };

    // Pricing calculations
    const hasDiscount = (product.discount || 0) > 0;

    // Pagination logic for reviews
    const totalPages = Math.ceil(reviews.length / reviewsPerPage);
    const startIndex = (currentPage - 1) * reviewsPerPage;
    const endIndex = startIndex + reviewsPerPage;
    const currentReviews = showAllReviews ? reviews.slice(startIndex, endIndex) : reviews;
    
    // Reset to page 1 when toggling show all reviews
    const handleToggleShowAll = () => {
        setShowAllReviews(!showAllReviews);
        setCurrentPage(1);
    };

    // Current price based on selected option or base product
    const currentPrice =
        selectedOption && selectedOption.price
            ? parseFloat(selectedOption.price).toFixed(2)
            : parseFloat(product.price).toFixed(2);
    // Old price based on selected option or base product
    const oldPrice =
        selectedOption && selectedOption.compareAtPrice
            ? parseFloat(selectedOption.compareAtPrice).toFixed(2)
            : parseFloat(product.compareAtPrice);

    return (
        <motion.div 
            className="container mx-auto py-8 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>

            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6">
                <h1 className="text-3xl font-bold flex flex-nowrap items-center gap-4">
                    <Link href="/shop" className="hover:text-primary transition-colors duration-200">
                        <CircleChevronLeft className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-200" />
                    </Link>
                    {product.name}
                </h1>  
            </div>  

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link href="/shop" className="hover:text-primary">
                    {t('shopTitle')}
                </Link>
                <span>/</span>
                {category && (
                    <>
                        <Link href={`/shop/${category.slug}`} className="hover:text-primary">
                            {category.name}
                        </Link>
                        <span>/</span>
                    </>
                )}
                <span className="text-foreground">{product.name}</span>
            </div>

            <ProductJsonLd
                productName={product.name}
                images={product.gallery ? product.gallery.map((img) => img.url) : [product.image].filter(Boolean)}
                description={stripHtmlTags(product.description)}
                brand={siteSettings?.siteName || 'Your Brand'}
                manufacturerName={siteSettings?.siteName || 'Your Store'}
                manufacturerLogo={siteSettings?.siteLogo || 'https://example.com/logo.png'}
                offers={[
                    {
                        price: currentPrice,
                        priceCurrency: product.currency || storeSettings?.currency || 'EUR',
                        //priceValidUntil: '2025-12-31',
                        itemCondition: 'https://schema.org/NewCondition',
                        availability:
                            product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
                        url: window.location.href,
                        seller: {
                            name: siteSettings?.siteName || 'Your Store'
                        }
                    }
                ]}
                aggregateRating={{
                    ratingValue: product.rating > 0 ? product.rating.toFixed(1) : undefined,
                    reviewCount: product.reviewCount || undefined,
                    bestRating: '5'
                }}
                sku={product.sku || product.id}
            />
            {/* Product Details Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-4 md:mb-8">
                {/* Left Column: Images */}
                <div className="space-y-4 lg:sticky lg:top-30 h-fit">
                    {/* Main Image */}
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-white">
                        {/* Collection Badge - Top Left Corner */}
                        {product.collections && product.collections.length > 0 && (
                            <div className="absolute top-3 left-3 z-10">
                                <span
                                    className="font-bold text-[0.7rem] sm:text-[0.75rem] uppercase tracking-wider text-nowrap px-3 py-1.5 rounded-full shadow-lg text-white"
                                    style={{
                                        background: product.collections[0].color
                                            ? `linear-gradient(to right, ${product.collections[0].color}, ${product.collections[0].color}dd)`
                                            : 'linear-gradient(to right, #2563eb, #3b82f6, #2563eb)' // Default blue gradient
                                    }}>
                                    {product.collections[0].nameML?.[locale] || product.collections[0].name}
                                </span>
                            </div>
                        )} 

                        {product.gallery && product.gallery.length > 0 ? (
                            <Image
                                src={
                                    product.gallery[selectedImageIndex]?.url || product.gallery[0]?.url || product.image
                                }
                                alt={product.gallery[selectedImageIndex]?.alt || product.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                                loading="eager"
                                className="object-cover"
                            />
                        ) : product.image ? (
                            <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                                loading="eager"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No Image
                            </div>
                        )}
                    </div>

                    {/* Thumbnails - Only show if product has multiple images */}
                    {product.gallery && product.gallery.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                            {product.gallery.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={`relative aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-all hover:border-primary/50 ${
                                        selectedImageIndex === index
                                            ? 'border-secondary ring-2 ring-green-500 ring-offset-2'
                                            : 'border-transparent'
                                    }`}>
                                    <Image
                                        src={image.url}
                                        alt={`${product.name} - Image ${index + 1}`}
                                        fill
                                        sizes="(max-width: 768px) 25vw, 12vw"
                                        loading="lazy"
                                        priority={false}
                                        className="object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )} 
                </div>

                {/* Product Info */}
                <div>
                    <div className="flex flex-col gap-2 mb-4">
                        <h1 className="text-3xl md:text-4xl font-bold">{product.name}</h1>
                    </div>

                    {/* Rating */}
                    {product.rating > 0 && reviews.length > 0 && (
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`h-5 w-5 ${
                                            i < Math.round(product.rating)
                                                ? 'text-yellow-500 fill-yellow-500'
                                                : 'text-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {product.rating.toFixed(1)} ({reviews.length}{' '}
                                {reviews.length === 1 ? t('review') : t('reviews')})
                            </span>
                        </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-3 mb-6">
                        {hasDiscount && (
                            <div className="flex flex-col gap-0.5">
                                <span
                                    className={`text-center bg-linear-to-r from-red-600 to-red-500 text-white font-semibold px-2 py-1 rounded-full text-[0.65rem] md:text-[0.70rem] uppercase tracking-wider whitespace-nowrap`}>
                                    PROMO
                                </span>
                                <span className="text-xl strike-through text-foreground/60">{oldPrice}€</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold">{currentPrice}€</span>
                            {selectedOption?.quantity && selectedOption?.unit ? (
                                <span className="text-lg text-muted-foreground">
                                    / {selectedOption.quantity}
                                    {selectedOption.unit}
                                </span>
                            ) : (
                                product.quantity &&
                                product.quantityUnit && (
                                    <span className="text-lg text-muted-foreground">
                                        / {product.quantity}
                                        {product.quantityUnit}
                                    </span>
                                )
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                        <div className="mb-6">
                            <div className={`relative ${!isExpanded ? 'line-clamp-2 sm:line-clamp-none' : ''}`}>
                                <div
                                    className="text-responsive space-y-2 prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: product.description }}
                                />
                                {!isExpanded && (
                                    <div
                                        className={`absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-background to-transparent pointer-events-none sm:hidden`}
                                    />
                                )}
                            </div>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`text-muted-foreground underline text-sm mt-1 font-medium sm:hidden`}>
                                {isExpanded ? t('close') : t('readMore')}
                            </button>
                        </div>
                    )}

                    {/* Attributes Badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {product.attributes &&
                            product.attributes.length > 0 &&
                            product.attributes.map(
                                (attr, index) =>
                                    attr.value && (
                                        <span
                                            key={index}
                                            className="inline-block px-3 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground dark:text-neutral-100 border">
                                            🏷️ {attr?.slug || attr?.name}
                                        </span>
                                    )
                            )}
                    </div> 

                    {/* Quantity-Based Pricing Options - All Devices */}
                    {options.length > 0 && (
                        <div className="mb-6" ref={quantityOptionsRef}>
                            <label className="block text-sm font-medium mb-2">
                                {t('selectQuantity') || 'Select Quantity'}:
                            </label>
                            <p className="text-xs text-muted-foreground mb-4">
                                {t('bulkPricing') ||
                                    'Choose quantity for better pricing. Stock is shared across all options.'}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 space-x-2 space-y-3 gap-2">
                                {options.map((option, index) => {
                                    const badge = getOptionBadge(option, index, options);
                                    // Check if option is available based on stock
                                    // If stock is < 0 (unlimited), all options are available
                                    // Otherwise, disable if option.quantity > product.stock
                                    const isStockAvailable = product.stock < 0 || option.quantity <= product.stock;
                                    const isDisabled = !isStockAvailable || option.stock === 0;

                                    return (
                                        <Button
                                            key={option.id}
                                            disabled={isDisabled}
                                            variant={selectedOption?.id === option.id ? 'default' : 'outline'}
                                            onClick={() => setSelectedOption(option)}
                                            className={`relative w-full flex flex-col items-center justify-center min-h-22 h-22 py-3 ${selectedOption?.id === option.id ? 'ring-1 ring-lime-500' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            {/* Option Badges */}
                                            {badge && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 cursor-pointer">
                                                    <span
                                                        className={`bg-linear-to-r ${badge.gradient} text-white font-bold text-[0.5rem] sm:text-[0.625rem] md:text-[0.685rem] lg:text-[0.655rem] uppercase tracking-wider text-nowrap px-2 py-1 rounded-full shadow-lg`}>
                                                        {badge.text}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="w-full flex items-center justify-between pt-1">
                                                <div className="flex flex-col items-start gap-0.3"> 
                                                    <div className="flex flex-col items-start">
                                                        <span className="font-semibold uppercase text-lg">
                                                            {option.name}
                                                        </span>
                                                        <span
                                                            className={`text-xs ${selectedOption?.id === option.id ? 'text-background/60' : 'text-foreground/60'}`}>
                                                            {parseFloat(option.price / option.quantity).toFixed(2)}€ /gr
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {option.discountAmount > 0 &&
                                                    option.compareAtPrice > option.price ? (
                                                        <>
                                                            <span
                                                                className={`w-12 max-w-12 text-center bg-linear-to-r from-red-600 to-red-500 text-white font-semibold p-1 rounded-full text-[0.55rem] md:text-[0.65rem] uppercase tracking-wider whitespace-nowrap`}>
                                                                - {option.discountAmount} %
                                                            </span>
                                                            <div className="flex flex-col">
                                                                <span className="text-base md:text-lg">
                                                                    {parseFloat(option.price).toFixed(2)}€
                                                                </span>
                                                                <span
                                                                    className={`strike-through text-sm ${selectedOption?.id === option.id ? 'text-background/60' : 'text-foreground/60'}`}>
                                                                    {parseFloat(option.compareAtPrice).toFixed(2)}€
                                                                </span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-base">
                                                            {parseFloat(option.price).toFixed(2)}€
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/*   
                    <div className="mb-4 text-sm">
                        <span>🚚 Recebe entre o dia {getDeliveryDateRange()}*</span>
                    </div> 
                    */}

                    {/* Actions - All Devices */}
                    <div className="flex gap-3 mb-6">
                        <Button
                            onClick={handleAddToCart}
                            size="xl"
                            disabled={product.stock === 0}
                            className="flex-1 glow-box text-base">
                            {product.stock === 0 ? (
                                t('outOfStock')
                            ) : (
                                <>
                                    {t('addToCart')}
                                    {' | '}
                                    {hasDiscount && (
                                        <span className="strike-through text-background/60">
                                            {parseFloat(oldPrice).toFixed(2)}€
                                        </span>
                                    )}
                                    {currentPrice}€
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="xl"
                            onClick={handleToggleFavorite}
                            disabled={togglingFavorite}
                            className={`px-3! hover:animate-pulse ${isFavorite ? 'text-red-500 hover:text-red-600' : ''}`}>
                            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                        <Button variant="outline" size="xl" onClick={handleShare} className="px-3! hover:animate-pulse">
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Quantity (disabled, use quantity options instead) */}
                    {/*
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">{t('quantity')}:</label>
                        <div className="w-full flex items-center justify-between gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                                -
                            </Button>
                            <span className="w-12 text-center">{quantity}</span>
                            <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                                +
                            </Button>
                        </div>
                    </div> 
                    */}

                    {/* Stock Info */}
                    <span
                        className={`mb-4 ${product.stock > 0 || product.stock === -1 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock > 0 || product.stock === -1 ? (
                            <>
                                <span role="img" aria-label="in stock">
                                    ✅
                                </span>{' '}
                                {t('inStock')}
                            </>
                        ) : (
                            <>
                                <span role="img" aria-label="out of stock">
                                    ❌
                                </span>{' '}
                                {t('outOfStock')}
                            </>
                        )}
                    </span>

                    {/* Club Points Info */}
                    {clubSettings &&
                        clubSettings.enabled &&
                        (() => {
                            // Calculate points that will be earned from this product purchase
                            const finalPrice = parseFloat(currentPrice);
                            const pointsPerEuro = clubSettings.pointsPerEuro || 10;
                            const pointsEarned = Math.floor(finalPrice * pointsPerEuro * quantity);

                            return pointsEarned > 0 ? (
                                <Card className="my-4 border-foreground/10! bg-card/50">
                                    <CardContent className="px-4 py-2 flex items-center gap-3 relative">
                                        <Award className="h-15 w-15 text-primary shrink-0 absolute top-0 bottom-0 right-0 opacity-20" />
                                        <div className="flex-1 text-sm flex flex-col gap-0.5">
                                            <span className="font-semibold">
                                                {t('earnLoyaltyPoints', { points: pointsEarned })}
                                            </span>
                                            <span>
                                                {!isAuthenticated ? (
                                                    <Link prefetch={false} href="/auth/login">
                                                        {t('signInToEarn')}
                                                    </Link>
                                                ) : (
                                                    <Link prefetch={false} href="/club">
                                                        {t('exchangePointsForDiscounts')}
                                                    </Link>
                                                )}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : null;
                        })()}
                </div>
            </div>

            {/* Disclaimers */}
            <div className="mb-6 flex flex-col space-y-4">   
                <div>
                    <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2">
                        {t('disclaimerTitle')}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('disclaimerText')}
                    </p>
                </div> 
            </div> 

            {/* Reviews Section */}
            <div className="container mb-20 md:mb-32 flex flex-col items-center">
                <h2 className="text-2xl lg:text-4xl font-bold mb-6">⭐ {t('customerReviews')}</h2>
                <div className="w-full">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-5 w-5 ${
                                        i < (product.rating > 0 && reviews.length > 0 ? Math.round(product.rating) : 0)
                                            ? 'text-yellow-500 fill-yellow-500'
                                            : 'text-gray-300'
                                    }`}
                                />
                            ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {product.rating > 0 ? product.rating.toFixed(1) : 0} {t('outOfRating', { max: 5 })}
                        </span>
                    </div>
                </div>

                {/* Write a Review Button */}
                {!showReviewForm && (
                    <div>
                        <Button
                            className="w-full mb-8 px-3"
                            size="lg"
                            type="button"
                            onClick={() => {
                                if (!isAuthenticated) {
                                    toast.error(t('pleaseSignInToReview'));
                                    return;
                                }
                                if (hasReviewed) {
                                    toast.info(t('alreadyReviewed'));
                                    return;
                                }
                                if (!canReview) {
                                    toast.error(t('onlyPurchasersCanReview'));
                                    return;
                                }
                                setShowReviewForm(true);
                            }}>
                            {t('writeReviewButton')}
                        </Button>
                    </div>
                )}

                {/* Review Form (only show if user can review) */}
                {showReviewForm && isAuthenticated && canReview && !hasReviewed && (
                    <Card className="mb-6 bg-card/50 w-full max-w-xl mx-auto">
                        <CardContent className="px-6 py-2 flex flex-col items-center">
                            <div className="w-full flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">{t('writeReview')}</h3>
                                <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>
                                    Cancelar
                                </Button>
                            </div>
                            <form onSubmit={handleSubmitReview} className="space-y-4 w-full">
                                <div>
                                    <Label htmlFor="rating">{t('rating')} *</Label>
                                    <div className="flex items-center gap-2 mt-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                                className="focus:outline-none">
                                                <Star
                                                    className={`h-6 w-6 cursor-pointer ${
                                                        star <= reviewForm.rating
                                                            ? 'text-yellow-500 fill-yellow-500'
                                                            : 'text-gray-300'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-sm text-muted-foreground">
                                            {reviewForm.rating} {t('outOf')} 5
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="comment">{t('yourReview')}</Label>
                                    <Textarea
                                        id="comment"
                                        value={reviewForm.comment}
                                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                        placeholder={t('reviewPlaceholder')}
                                        rows={4}
                                        className="mt-2"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="isAnonymous"
                                        checked={reviewForm.isAnonymous}
                                        onCheckedChange={(checked) =>
                                            setReviewForm({ ...reviewForm, isAnonymous: checked })
                                        }
                                    />
                                    <Label htmlFor="isAnonymous" className="cursor-pointer text-sm">
                                        {t('postAsAnonymous') || 'Post as Anonymous'}
                                    </Label>
                                </div>
                                <Button size="lg" className="w-full" type="submit" disabled={submittingReview}>
                                    {submittingReview ? t('submitting') : t('submitReview')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Message for users who haven't purchased */}
                {isAuthenticated && !canReview && !hasReviewed && (
                    <Card className="mb-6 bg-card/50">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">{t('reviewPurchaseOnly')}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Message for users who already reviewed */}
                {isAuthenticated && hasReviewed && reviewStatus && (
                    <Card className="mb-6 bg-card/50">
                        <CardContent className="p-4">
                            {reviewStatus.reviewStatus === 'pending' ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('reviewPendingApproval') || 'Your review is awaiting admin approval.'}
                                </p>
                            ) : reviewStatus.reviewStatus === 'approved' ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('reviewAlreadySubmitted') || 'You have already reviewed this product.'}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {t('reviewAlreadySubmitted') ||
                                        'You have already submitted a review for this product.'}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Reviews List */}
                {reviews.length === 0 ? (
                    <p className="text-muted-foreground">{t('noReviews')}</p>
                ) : (
                    <>
                        <div 
                            ref={reviewsContainerRef}
                            className={`review-container ${
                                showAllReviews 
                                    ? 'h-auto max-h-full maskoff overflow-y-auto pt-4 md:pt-8 pb-4' 
                                    : reviews.length > 2 
                                        ? 'pt-14 md:pt-20 pb-4' 
                                        : 'pt-4 md:pt-8 pb-4'
                            } ${reviews.length > 2 && !showAllReviews ? 'overflow-hidden touch-pan-y' : ''}`}
                            style={{
                                cursor: reviews.length > 2 && !showAllReviews ? 'grab' : 'default',
                                userSelect: showAllReviews ? 'auto' : 'none'
                            }}>
                            <div
                                className={`mx-auto w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 group-hover-pause ${
                                    reviews.length > 2 && !autoScrollPaused && !showAllReviews ? 'animate-scroll-t2b' : ''
                                }`}
                                style={{
                                    animationPlayState: autoScrollPaused || showAllReviews ? 'paused' : 'running'
                                }}>
                                {currentReviews.map((review) => (
                                <Card key={review.id} className="review-card">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-semibold">{review.customerName || 'Anonymous'}</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`h-4 w-4 ${
                                                                i < (review.rating || 5)
                                                                    ? 'text-yellow-500 fill-yellow-500'
                                                                    : 'text-gray-300'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            {review.createdAt && (
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground">
                                            {review.comment || t('noCommentProvided')}
                                        </p>
                                    </CardContent>
                                </Card>
                                ))}
                            </div>
                        </div>
                        
                        {/* Show All Reviews Button - Only show if more than 3 reviews */}
                        {reviews.length > 3 && (
                            <div className="flex flex-col items-center mt-6 space-y-4">
                                <Button
                                    variant="outline"
                                    onClick={handleToggleShowAll}
                                    className="px-6 py-2">
                                    {showAllReviews ? (
                                        <>
                                            <ChevronUp className="h-4 w-4 mr-2" />
                                            {t('hideReviews')}
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="h-4 w-4 mr-2" />
                                            {t('allReviewsCount', { count: reviews.length })}
                                        </>
                                    )}
                                </Button>
                                
                                {/* Pagination - Only show when all reviews are visible and there are more than 8 */}
                                {showAllReviews && totalPages > 1 && (
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        
                                        <span className="text-sm text-muted-foreground px-3">
                                            {t('pageXofY', { current: currentPage, total: totalPages })}
                                        </span>
                                        
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Related Products */}
            <div className="container mb-8 flex flex-col items-center">
                <h2 className="text-2xl lg:text-4xl font-bold mb-6">💎 {t('youMayAlsoLike') || 'You May Also Like'}</h2>
                <RelatedProducts products={relatedProducts} />
            </div>
 
            {/* Fixed Bottom Bar for Mobile - Quantity Options & Actions */}
            <div
                className={`md:hidden fixed bottom-0 inset-x-0 bg-background border-t border-foreground/30 shadow-lg z-100 transition-transform duration-300 ease-in-out ${
                    showBottomBar ? 'translate-y-0' : 'translate-y-full'
                }`}
                style={{
                    position: 'fixed !important',
                    bottom: '0px !important',
                    left: '0px !important',
                    right: '0px !important',
                    zIndex: 100,
                    transform: showBottomBar ? 'translateY(0px)' : 'translateY(100%)'
                }}>
                <div className="container mx-auto px-4 py-3">
                    {/* Quantity Options - Mobile */}
                    {options.length > 0 && (
                        <div className="mb-3">
                            <Swiper className="-mx-4 px-4 py-0.5">
                                <div className="flex gap-2 pb-2">
                                    {options.map((option, index) => {
                                        return (
                                            <Button
                                                key={option.id}
                                                disabled={option.stock === 0}
                                                variant={selectedOption?.id === option.id ? 'default' : 'outline'}
                                                onClick={() => setSelectedOption(option)}
                                                size="sm"
                                                className={`relative flex flex-col items-center justify-center min-h-18 h-18 py-2 min-w-35 shrink-0 ${selectedOption?.id === option.id ? 'ring-1 ring-lime-500' : ''} `}>
                                                <div className="w-full flex items-center justify-between">
                                                    <div className="flex flex-col items-start gap-0.3"> 
                                                        <span className="font-semibold uppercase text-base">
                                                            {option.name}
                                                        </span>
                                                        <span
                                                            className={`text-[0.585rem] ${selectedOption?.id === option.id ? 'text-background/60' : 'text-foreground/60'}`}>
                                                            {parseFloat(option.price / option.quantity).toFixed(2)}€ /gr
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {option.discountAmount > 0 &&
                                                        option.compareAtPrice > option.price ? (
                                                            <>
                                                                <span
                                                                    className={`w-10 max-w-10 text-center bg-linear-to-r from-red-600 to-red-500 text-white font-semibold px-0 py-0.5 rounded-full text-[0.525rem] md:text-[0.625rem] uppercase tracking-wider whitespace-nowrap`}>
                                                                    - {option.discountAmount} %
                                                                </span>
                                                                <span className="text-sm">
                                                                    {parseFloat(option.price).toFixed(2)}€
                                                                </span>
                                                                <span
                                                                    className={`strike-through text-[0.65rem] ${selectedOption?.id === option.id ? 'text-background/60' : 'text-foreground/60'}`}>
                                                                    {parseFloat(option.compareAtPrice).toFixed(2)}€
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-sm">
                                                                {parseFloat(option.price).toFixed(2)}€
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </Swiper>
                        </div>
                    )}

                    {/* Actions - Mobile */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleAddToCart}
                            size="xl"
                            disabled={product.stock === 0}
                            className="flex-1 glow-box sm:text-base">
                            {product.stock === 0 ? (
                                t('outOfStock')
                            ) : (
                                <>
                                    {t('addToCart')}
                                    {' | '}
                                    {hasDiscount && (
                                        <span className="strike-through text-background/60">
                                            {parseFloat(oldPrice).toFixed(2)}€
                                        </span>
                                    )}
                                    {currentPrice}€
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductPageClient;
