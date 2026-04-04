// @/app/(frontend)/cart/page.client.jsx

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { FaTrash } from 'react-icons/fa';
import { useCart } from 'react-use-cart';
import { CircleChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import FreeShippingProgressBar from '@/app/(frontend)/cart/partials/FreeShippingProgressBar';
import HotProducts from '@/app/(frontend)/cart/partials/HotProducts';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/providers';

const CartPageClient = () => {
    const t = useTranslations('Cart');
    const { items, removeItem, updateItemQuantity, emptyCart, cartTotal } = useCart();

    // Get data from LayoutProvider (already fetched)
    const { storeSettings } = useSettings();

    const handleIncrement = (itemId, currentQty) => {
        updateItemQuantity(itemId, currentQty + 1);
    };

    const handleDecrement = (itemId, currentQty) => {
        if (currentQty > 1) {
            updateItemQuantity(itemId, currentQty - 1);
        } else {
            removeItem(itemId);
        }
    };

    return (
        <motion.div 
            className="container mx-auto py-8 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6">
                <h1 className="text-3xl font-bold flex flex-nowrap items-center gap-4">
                    <Link href="/" className="hover:text-primary transition-colors duration-200">
                        <CircleChevronLeft className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-200" />
                    </Link>
                    {t('shoppingCart')}
                </h1>  
            </div>  
            <div className="flex flex-col h-full overflow-hidden">
                {/* Free Shipping Progress Bar */}
                {storeSettings?.freeShippingEnabled && items.length > 0 && (
                    <FreeShippingProgressBar cartTotal={cartTotal} storeSettings={storeSettings} />
                )}

                {/* Empty Cart State */}
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="text-center mb-8">
                            <svg
                                className="h-22 w-24 mx-auto mb-4 text-muted-foreground"
                                viewBox="0 0 22 25"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M21.9545 6.34483H17.5114V5.83724C17.5114 2.61407 14.8193 0 11.5 0C8.18068 0 5.48864 2.61407 5.48864 5.83724V6.34483H1.04545C0.467187 6.34483 0 6.79848 0 7.36V24.3641C0 24.9257 0.467187 25.3793 1.04545 25.3793H21.9545C22.5328 25.3793 23 24.9257 23 24.3641V7.36C23 6.79848 22.5328 6.34483 21.9545 6.34483ZM7.84091 5.83724C7.84091 3.87352 9.4777 2.28414 11.5 2.28414C13.5223 2.28414 15.1591 3.87352 15.1591 5.83724V6.34483H7.84091V5.83724ZM20.6477 23.0952H2.35227V8.62897H5.48864V11.4207C5.48864 11.5603 5.60625 11.6745 5.75 11.6745H7.57955C7.7233 11.6745 7.84091 11.5603 7.84091 11.4207V8.62897H15.1591V11.4207C15.1591 11.5603 15.2767 11.6745 15.4205 11.6745H17.25C17.3937 11.6745 17.5114 11.5603 17.5114 11.4207V8.62897H20.6477V23.0952Z"
                                    fill="currentColor"></path>
                                <path
                                    d="M11.1282 22.207V19.2566C10.7564 19.7515 10.0129 20.3606 8.54814 20.8175C8.54814 20.8175 8.91991 19.7325 9.96829 19.0029C9.0017 19.1805 7.54437 19.1551 5.5517 18.4001C5.5517 18.4001 7.38823 17.5055 9.47756 17.7466C8.29534 17.1311 6.81571 15.9129 5.6781 13.394C5.6781 13.394 9.024 14.1744 10.6895 16.5855C9.18015 13.4765 11.5 9.51733 11.5 9.51733C13.3068 12.988 12.9201 15.2911 12.3327 16.5601C14.0057 14.1681 17.3218 13.394 17.3218 13.394C16.1842 15.9129 14.7046 17.1311 13.5224 17.7466C15.6117 17.5055 17.4482 18.4001 17.4482 18.4001C15.4556 19.1551 13.9982 19.1805 13.0317 19.0029C14.08 19.7325 14.4518 20.8175 14.4518 20.8175C12.987 20.3606 12.2435 19.7515 11.8717 19.2566V22.207H11.1282Z"
                                    fill="currentColor"></path>
                            </svg>
                            <h3 className="text-lg font-semibold mb-2">{t('emptyCartTitle')}</h3>
                            <p className="text-muted-foreground text-sm mb-6">{t('emptyCartMessage')}</p>
                            <Button className="bg-brand" asChild size="lg">
                                <Link prefetch={false} href="/shop">
                                    {t('viewProducts')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Cart Items */}
                        <div className="space-y-4 mb-8">
                            {items.map((item) => (
                                <div key={item.id} className="flex gap-4 p-4 border border-border rounded-lg bg-card">
                                    {/* Product Image */}
                                    {item.image && (
                                        <div className="relative w-18 h-18 shrink-0">
                                            <Image
                                                src={item.image}
                                                alt={item.name}
                                                fill
                                                sizes="(max-width: 768px) 80vw, (max-width: 1200px) 20vw, 80px"
                                                loading="lazy"
                                                priority={false}
                                                className="object-cover rounded"
                                            />
                                        </div>
                                    )}

                                    {/* Product Details */}
                                    <div className="flex-1 min-w-0 relative">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-sm truncate">{item.name}</h4>
                                            {item.discount > 0 && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold text-white bg-red-500 rounded">
                                                    -{item.discount}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-primary">
                                                {(Number(item.price) && !isNaN(Number(item.price)) ? Number(item.price).toFixed(2) : '0.00')}€
                                            </p>
                                            {item.priceBefore && item.priceBefore > item.price && (
                                                <p className="text-xs line-through text-muted-foreground">
                                                    {(Number(item.priceBefore) && !isNaN(Number(item.priceBefore)) ? Number(item.priceBefore).toFixed(2) : '0.00')}€
                                                </p>
                                            )}
                                        </div>

                                        {/* Quantity Controls */}

                                        <div className="flex items-center gap-2 mt-2">
                                            {/* Quantity Controls - Uncomment to enable
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDecrement(item.id, item.quantity)}
                                                className="h-7 w-7 p-0">
                                                -
                                            </Button>
                                            <span className="text-sm w-8 text-center">{item.quantity}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleIncrement(item.id, item.quantity)}
                                                className="h-7 w-7 p-0">
                                                +
                                            </Button>
                                             */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeItem(item.id)}
                                                className="absolute top-0 right-0 ml-auto text-destructive">
                                                <FaTrash className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Cart Footer - Fixed at bottom, only shown when cart has items */}
                        <div className="border-t border-border pt-4 mt-4 space-y-4 shrink-0">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>{t('sub_total')}:</span>
                                <span>{Number(cartTotal).toFixed(2)}€</span>
                            </div>

                            <div className="grid gap-2">
                                <Button size="lg" asChild className="w-full">
                                    <Link prefetch={false} href="/cart/checkout">
                                        {t('checkout')}
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild className="w-full">
                                    <Link prefetch={false} href="/shop">
                                        {t('continueShopping')}
                                    </Link>
                                </Button>
                                <Button
                                    size="lg"
                                    variant="ghost"
                                    onClick={() => {
                                        emptyCart();
                                        toast.success('O carrinho está vazio.');
                                    }}
                                    className="w-full text-destructive">
                                    {t('clearCart')}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Hot Products Section - Always visible */}
                <div className="mt-8">
                    <HotProducts />
                </div>
            </div>
        
        </motion.div>
    );
};

export default CartPageClient;
