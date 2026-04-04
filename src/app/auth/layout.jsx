// @/app/auth/layout.jsx (Auth Route Group Layout)

import { LayoutProvider } from '@/app/(frontend)/context/LayoutProvider';
import { generatePageMetadata } from '@/utils/metadata.js';

// Generate metadata
export async function generateMetadata() {
    return generatePageMetadata({
        title: 'Authentication',
        description: 'Sign in or create an account'
    });
}

export default function AuthLayout({ children }) {
    return (
        <LayoutProvider>
            <div className="w-full max-w-md mx-auto py-20 px-4">{children}</div>
        </LayoutProvider>
    );
}
