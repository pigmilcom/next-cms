// @/app/(actions)/cart/page.jsx

import { getSettings } from '@/lib/server/settings';
import { generatePageMetadata } from '@/utils/metadata';
import CartPageClient from './page.client';

// Generate metadata for the shop page
export async function generateMetadata() {
    const { siteSettings } = await getSettings();
    try {
        // Product not found, return default metadata
        return generatePageMetadata({
            title: 'Carrinho' + ` | ${siteSettings?.siteTitle || siteSettings?.siteName || 'Shop'}`
        });
    } catch (error) {
        // Return minimal metadata on error
        return {
            title: 'Not Found'
        };
    }
}

const CartPage = async () => {
    return <CartPageClient />;
};

export default CartPage;
