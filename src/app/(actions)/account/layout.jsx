// @/app/(actions)/account/layout.jsx (Access Control Layout for Account Pages)

import { auth } from '@/auth';
import AccessDenied from './AccessDenied';

export default async function AccountLayout({ children }) {
    // Session is already validated in auth.js - checks user exists in database
    const session = await auth();
    
    if (!session) {
        // If not authenticated or user doesn't exist in DB, show access denied
        return <AccessDenied />;
    }

    return <>{children}</>;
}
