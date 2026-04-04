// @/app/(frontend)/cart/checkout/page.jsx (Checkout Server Component)

import { getCatalog } from '@/lib/server/store.js';
import CheckoutPageClient from './page.client';

const CheckoutPage = async () => {
    // Fetch all active catalog items for validation
    const catalogResponse = await getCatalog({ activeOnly: true, limit: 0, fetchReviews: false });
    const catalogItems = catalogResponse?.success ? catalogResponse.data : [];

    // Pass catalog data to client for validation
    return <CheckoutPageClient catalogItems={catalogItems} />;
};

export default CheckoutPage;
