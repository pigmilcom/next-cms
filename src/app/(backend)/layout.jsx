// @/app/(backend)/layout.jsx - Admin Backend Layout
import { LayoutProvider } from '@/app/(backend)/admin/context/LayoutProvider';
import { auth } from '@/auth';
import { getSettings } from '@/lib/server/settings';
import { getUser } from '@/lib/server/users.js';
import { generatePageMetadata } from '@/utils/metadata';
import AccessDenied from './AccessDenied';

// Generate metadata server-side (inherits siteSettings from root layout)
export async function generateMetadata() {
    return generatePageMetadata({
        title: 'Administration',
        description: 'Admin dashboard and management panel',
        robots: {
            index: false,
            follow: false
        }
    });
}

export default async function BackendLayout({ children }) {
    // Session is already validated in auth.js - checks user exists in database    const session = await auth();
    const session = await auth();

    if (!session?.user) {
        // If not authenticated or user doesn't exist in DB, show access denied
        return <AccessDenied />;
    }

    // Verify admin role - fetch user data to check role
    const userRes = await getUser({ userId: session.user.key });
    const userExists = userRes?.success && 
                      userRes?.data && 
                      !(Array.isArray(userRes.data) && userRes.data.length === 0);
    
    if (!userExists || userRes.data.role !== 'admin') {
        // If user doesn't have admin role, show access denied
        return <AccessDenied />;
    }

    const { adminSiteSettings, adminStoreSettings } = await getSettings();

    //  Render layout provider with admin settings

    return (
        <LayoutProvider siteSettings={adminSiteSettings} storeSettings={adminStoreSettings} session={session}>
            {children}
        </LayoutProvider>
    );
}
