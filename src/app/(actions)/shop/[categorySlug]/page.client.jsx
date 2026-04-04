// @/app/(actions)/shop/[categorySlug]/page.client.jsx (Category Client Component)
'use client';

import ShopLayout from '../partials/ShopLayout';

const CategoryPageClient = ({
    initialProducts = [],
    initialCategories = [],
    initialCollections = [],
    currentCategory
}) => {
    return (
        <ShopLayout
            initialProducts={initialProducts}
            initialCategories={initialCategories}
            initialCollections={initialCollections}
            currentCategory={currentCategory}
        />
    );
};

export default CategoryPageClient;
