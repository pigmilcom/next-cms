// @/app/(frontend)/shop/[categorySlug]/[productSlug]/page.jsx (Product Detail Server Component)

import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getClubSettings } from '@/lib/server/club';
import { getAllOrders } from '@/lib/server/orders';
import { getCatalog, getCategories, getFavorites } from '@/lib/server/store';
import { getTranslations } from 'next-intl/server';
import ProductPageClient from './page.client';

// Generate metadata for the product page
export async function generateMetadata({ params }) {
    const { categorySlug, productSlug } = await params;
    const t = await getTranslations('Shop');

    try {
        // Fetch product data - React cache() will dedupe this with ProductPage request
        const catalogResponse = await getCatalog({ item: productSlug, activeOnly: true, limit: 1 });
        const productData = catalogResponse?.success ? catalogResponse.data : [];
        const found = productData.length > 0 ? productData[0] : null;

        if (!found) {
            return {
                title: t('productNotFoundTitle'),
                description: t('productNotFoundDescription')
            };
        }

        // Extract product information for metadata
        const productName = found.name || found.nameML?.en || t('product');
        const productDescription =
            found.descriptionML?.en || found.description || `${productName} - ${t('availability')}`;
        const productImage = found.image || found.gallery?.[0]?.url || null;
        const productPrice = found.price || 0;
        const productAvailability = found.stock > 0 || found.stock === -1 ? 'in stock' : 'out of stock';
        const currency = found.currency || 'EUR';

        // Use SEO fields if available
        const metaTitle = found.seo?.metaTitle || found.seo?.ogTitle || productName;
        const metaDescription = found.seo?.metaDescription || found.seo?.ogDescription || productDescription;

        return {
            title: metaTitle,
            description: metaDescription,
            openGraph: {
                title: metaTitle,
                description: metaDescription,
                images: productImage ? [productImage] : []
            }
        };
    } catch (error) {
        return {
            title: t('productNotFoundTitle')
        };
    }
}

const ProductPage = async ({ params }) => {
    const { categorySlug, productSlug } = await params;

    // Get user session from server
    const session = await auth();
    const user = session?.user || null;

    try {
        // Load product and categories
        const catalogResponse = await getCatalog({ item: productSlug, activeOnly: true, limit: 1, fetchReviews: true });
        const categoriesResponse = await getCategories();
        const clubSettings = await getClubSettings();

        const productData = catalogResponse?.success ? catalogResponse.data : [];
        const found = productData.length > 0 ? productData[0] : null;
        const categoriesData = categoriesResponse?.success ? categoriesResponse.data : [];
        const clubData = clubSettings?.success ? clubSettings.data : [];

        // Product not found
        if (!found) {
            notFound();
        }

        // Find product category
        let category = null;
        if (found.category) {
            category = categoriesData.find((cat) => cat.id === found.category) || null;
        }

        // Validate category exists for the categorySlug in URL
        const urlCategory = categoriesData.find((cat) => cat.slug === categorySlug);
        if (!urlCategory) {
            // Category slug in URL doesn't exist in database
            notFound();
        }

        // Validate category slug matches product's category
        if (category && category.slug !== categorySlug) {
            // Category slug doesn't match - redirect to correct URL
            notFound();
        }

        // Additional validation: if product has a category but it's not found in categories database
        if (found.category && !category) {
            // Product references a category that doesn't exist
            notFound();
        }

        // Fetch related products (same category, excluding current product)
        const relatedResponse = await getCatalog({
            activeOnly: true,
            limit: 10,
            fetchReviews: true
        });
        const allProducts = relatedResponse?.success ? relatedResponse.data : [];

        let relatedProducts = allProducts
            .filter((p) => p.category === found.category && p.id !== found.id)
            .slice(0, 10);

        // If no related products in same category, load any products
        if (relatedProducts.length === 0) {
            relatedProducts = allProducts.filter((p) => p.id !== found.id).slice(0, 10);
        }

        // Build pricing options from quantityPricing
        const pricingOptions = [];

        if (found.hasQuantityPricing && found.quantityPricing && found.quantityPricing.length > 0) {
            found.quantityPricing.forEach((tier, index) => {
                pricingOptions.push({
                    id: `${found.id}-qty-${index}`,
                    name: `${tier.quantity} ${tier.unit || found.quantityUnit || 'unit'}`,
                    quantity: parseFloat(tier.quantity),
                    unit: tier.unit || found.quantityUnit || 'unit',
                    price: parseFloat(tier.price).toFixed(2),
                    pricePerUnit: (parseFloat(tier.price) / parseFloat(tier.quantity)).toFixed(2),
                    compareAtPrice: parseFloat(tier.compareAtPrice).toFixed(2),
                    discount: found.discount || 0,
                    discountAmount: found.discountAmount || 0,
                    discountType: found.discountType || 'percentage',
                    stock: found.stock,
                    isBase: index === 0
                });
            });
        } else {
            const baseQuantity = parseFloat(found.quantity) || 1;
            const basePrice = parseFloat(found.price);
            pricingOptions.push({
                id: `${found.id}`,
                name: `${found.quantity || 1} ${found.quantityUnit || 'unit'}`,
                quantity: baseQuantity,
                unit: found.quantityUnit || 'unit',
                price: parseFloat(basePrice).toFixed(2),
                pricePerUnit: basePrice / baseQuantity,
                compareAtPrice: parseFloat(found.compareAtPrice || basePrice).toFixed(2),
                discount: found.discount || 0,
                discountAmount: found.discountAmount || 0,
                discountType: found.discountType || 'percentage',
                stock: found.stock,
                isBase: true
            });
        }

        // Load user orders for this product if user is logged in
        const userOrdersData = user
            ? (await getAllOrders({ userId: user.email, limit: 1, productId: found.id })).data
            : [];

        // Load user favorites for this product if user is logged in
        const userFavoritesData = user
            ? (await getFavorites({ userId: user.id, limit: 1, productId: found.id })).data
            : [];

        return (
            <ProductPageClient
                user={user}
                initialProduct={found}
                initialCategory={category}
                initialRelatedProducts={relatedProducts}
                initialOptions={pricingOptions}
                clubSettings={clubData?.enabled ? clubData : null}
                userOrdersData={userOrdersData}
                userFavoritesData={userFavoritesData}
            />
        );
    } catch (error) {  
        notFound();
    }
};

export default ProductPage;
