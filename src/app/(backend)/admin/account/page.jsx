// @/app/(backend)/admin/account/page.jsx (Server Component)

import { auth } from '@/auth';
import { getUser } from '@/lib/server/users';
import AccountPageClient from './page.client';

const AccountPage = async () => {
    // Auth check is already handled by admin layout.jsx
    // Re-fetch session to get user data (Next.js automatically deduplicates this call)
    const session = await auth();
    const user = session?.user;

    // Safety check - if no user, return null (layout will handle redirect)
    if (!user) {
        return null;
    }

    // Fetch user data using the same pattern as frontend account page
    const getUserData = await getUser({ userId: user.key || user.id });
    const userData = getUserData?.success && getUserData?.data ? getUserData.data : null;

    return <AccountPageClient userData={userData} />;
};

export default AccountPage;
