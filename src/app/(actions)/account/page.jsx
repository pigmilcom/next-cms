// @/app/(actions)/account/page.jsx (Server Component)

import { auth } from '@/auth'; 
import { getAllOrders } from '@/lib/server/orders';
import { getCatalog, getFavorites, getReviews } from '@/lib/server/store';
import { getUser } from '@/lib/server/users';
import AccountPageClient from './page.client';

const AccountPage = async () => {
    // Auth check is already handled by layout.jsx
    // Re-fetch session to get user data (Next.js automatically deduplicates this call)
    const session = await auth();
    const user = session?.user;

    // Safety check - if no user, return null (layout will handle redirect)
    if (!user) {
        return null;
    }

    // Fetch user data
    const getUserData = await getUser({ userId: user.key });
    const userData = getUserData?.success && getUserData?.data ? getUserData.data : null;

    // Fetch user orders
    const getUserOrders = await getAllOrders({ userId: user.email, limit: 0 });
    const userOrders = getUserOrders?.success && getUserOrders?.data ? getUserOrders.data : [];

    // Fetch user reviews (all statuses for user's own reviews)
    const getUserReviews = await getReviews({
        userId: user.email || user.id,
        limit: 0,
        approvedOnly: false,
        duration: '1m'
    });
    const userReviews = getUserReviews?.success && getUserReviews?.data ? getUserReviews.data : [];

    // Fetch user favorites
    const getUserFavorites = await getFavorites({ userId: user.id, limit: 0 });
    const userFavorites =
        getUserFavorites?.success && getUserFavorites?.data && getUserFavorites.data?.length > 0
            ? getUserFavorites.data
            : null;
 
    // Fetch full product data for user favorites
    let favoritesWithProducts = [];
    if (userFavorites) {
        // Fetch all catalog items (with activeOnly: false to include inactive products)
        const catalogData = await getCatalog({
            limit: 0, // No pagination - get all products
            activeOnly: false, // Include all products regardless of status
            fetchReviews: false // Skip reviews for performance
        });

        if (catalogData?.success && catalogData.data) {
            // Map favorites to include full product data
            favoritesWithProducts = userFavorites
                .map((favorite) => {
                    const product = catalogData.data.find(
                        (p) => p.id === favorite.productId || p.key === favorite.productId
                    );
                    return product
                        ? {
                              ...product,
                              favoriteId: favorite.id,
                              favoriteCreatedAt: favorite.createdAt
                          }
                        : null;
                })
                .filter(Boolean); // Remove null entries (products not found)
        }
    }

    return (
        <AccountPageClient
            userData={userData} 
            favorites={favoritesWithProducts}
            orders={userOrders}
            reviews={userReviews}
        />
    );
};

export default AccountPage;
