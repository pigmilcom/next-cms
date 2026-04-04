// @/app/(frontend)/shop/page.jsx (Shop Server Component)

import { getCatalog, getCategories, getCollections } from '@/lib/server/store.js';
import { getTranslations } from 'next-intl/server';
import ShopPageClient from './page.client';

// Generate metadata for the shop page
export async function generateMetadata() {
    const t = await getTranslations('Shop');
    try {
        return {
            title: t('shopTitle'),
            description: t('catalogDescription')
        };
    } catch (error) {
        // Return minimal metadata on error
        return {
            title: 'Shop'
        };
    }
}

const ShopPage = async () => {
    try {
        const catalogResponse = await getCatalog({ activeOnly: true });
        const categoriesResponse = await getCategories({ activeOnly: true });
        const collectionsResponse = await getCollections();

        // Extract data from response structure
        const products = catalogResponse?.success ? catalogResponse.data : [];
        const categories = categoriesResponse?.success ? categoriesResponse.data : [];
        const collections = collectionsResponse?.success ? collectionsResponse.data : [];

        // Pass data to client component
        return (
            <ShopPageClient
                initialProducts={products}
                initialCategories={categories}
                initialCollections={collections}
            />
        );
    } catch (error) {
        console.error('Error loading shop data:', error);

        // Return client component with minimal data on error
        return <ShopPageClient initialProducts={[]} initialCategories={[]} initialCollections={[]} />;
    }
};

export default ShopPage;
