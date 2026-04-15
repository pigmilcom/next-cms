// @/app/(actions)/cart/page.client.jsx

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { FaTrash } from 'react-icons/fa';
import { useCart } from 'react-use-cart';
import { CircleChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import FreeShippingProgressBar from './partials/FreeShippingProgressBar';
import HotProducts from './partials/HotProducts';
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
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#607d8b"
                            stroke-width="1"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            >
                            <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
                            <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
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
