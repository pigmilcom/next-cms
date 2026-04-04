// @/app/(frontend)/shop/[categorySlug]/page.jsx (Category Server Component)

import { notFound } from 'next/navigation';
import { getCatalog, getCategories, getCollections } from '@/lib/server/store.js';
import { getTranslations } from 'next-intl/server';
import CategoryPageClient from './page.client';

// Generate metadata for the category page
export async function generateMetadata({ params }) {
    const { categorySlug } = await params;
    const t = await getTranslations('Shop');

    try {
        const categoriesResponse = await getCategories({ activeOnly: true });
        const categories = categoriesResponse?.success ? categoriesResponse.data : [];
        const category = categories.find((cat) => cat.slug === categorySlug);

        if (!category) {
            return {
                title: t('categoryNotFound'),
                description: t('categoryDescription')
            };
        }

        const categoryName = category.nameML?.en || category.name || t('category');
        const categoryDescription =
            category.descriptionML?.en || category.description || t('categoryDescription');

        return {
            title: categoryName,
            description: categoryDescription
        };
    } catch (error) {
        return {
            title: t('categoryNotFound')
        };
    }
}

const CategoryPage = async ({ params }) => {
    const { categorySlug } = await params;

    try {
        const categoriesResponse = await getCategories({ activeOnly: true });
        const collectionsResponse = await getCollections();
        
        // Check if responses are successful
        if (!categoriesResponse?.success || !collectionsResponse?.success) {
            notFound();
        }
        
        const categories = categoriesResponse.data || [];
        const collections = collectionsResponse.data || [];

        // Find the category by slug
        const category = categories.find((cat) => cat.slug === categorySlug);

        if (!category) {
            notFound();
        }

        // Fetch products for this category
        const catalogResponse = await getCatalog({
            activeOnly: true,
            category: category.id
        });

        const products = catalogResponse?.success ? catalogResponse.data : [];

        // Pass data to client component
        return (
            <CategoryPageClient
                initialProducts={products}
                initialCategories={categories}
                initialCollections={collections}
                currentCategory={category}
            />
        );
    } catch (error) { 
        notFound();
    }
};

export default CategoryPage;
