// @/app/(actions)/account/layout.jsx (Access Control Layout for Account Pages)

import { LayoutProvider } from '@/app/(frontend)/context/LayoutProvider';
import { auth } from '@/auth';
import { generatePageMetadata } from '@/utils/metadata.js';
import AccessDenied from './AccessDenied';

// Generate metadata
export async function generateMetadata() {
    return generatePageMetadata({
        title: 'My Account',
        description: 'Manage your account settings and preferences'
    });
}

export default async function AccountLayout({ children }) {
    // Session is already validated in auth.js - checks user exists in database
    const session = await auth();

    if (!session) {
        // If not authenticated or user doesn't exist in DB, show access denied
        return <AccessDenied />;
    }

    return <LayoutProvider>{children}</LayoutProvider>;
}
