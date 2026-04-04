// @/app/(actions)/shop/page.client.jsx (Shop Client Component)
'use client';

import ShopLayout from './partials/ShopLayout';

const ShopPageClient = ({ initialProducts = [], initialCategories = [], initialCollections = [] }) => {
    return (
        <ShopLayout
            initialProducts={initialProducts}
            initialCategories={initialCategories}
            initialCollections={initialCollections}
            currentCategory={null}
        />
    );
};

export default ShopPageClient;
