// @/app/layout.jsx (Shared Root Layout Server Component)

import { existsSync } from 'fs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { join } from 'path';
import { auth } from '@/auth';
import GlobalJsonLd from '@/components/common/GlobalJsonLd';
import InitialLoadingHandler from '@/components/common/InitialLoadingHandler';
import Providers from '@/context/providers';
import { getSettings } from '@/lib/server/settings';
import { getAvailableLanguages } from '@/lib/server/locale';
import { generateSiteMetadata } from '@/utils/metadata';
import '@/app/globals.css'; 

// Function to check if setup path exists
function checkSetupPath() {
    const setupPath = join(process.cwd(), 'src', 'app', 'setup');
    return existsSync(setupPath);
}

// Generate metadata (with server settings)
export async function generateMetadata() {
    const { siteSettings, storeSettings } = await getSettings();

    // Get request headers for pathname
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '/';

    return {
        ...generateSiteMetadata({
            canonical: siteSettings?.baseUrl + pathname,
            siteSettings,
            storeSettings
        }),
        manifest: '/manifest.json',
        icons: {
            icon: [
                { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
            ],
            apple: [{ url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
        },
        appleWebApp: {
            capable: true,
            statusBarStyle: 'default',
            title: siteSettings?.siteName || 'MyApp'
        }
    };
}

// Static metadata that doesn't change
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
};

export default async function RootLayout({ children }) {

    const locale = await getLocale();
    const messages = await getMessages();

    // Fetch cached settings (public and admin)
    const { siteSettings, storeSettings } = await getSettings();

    // Fetch available languages for frontend
    const availableLangsResult = await getAvailableLanguages({ frontend: true });
    const availableFrontendLanguages = availableLangsResult?.success ? availableLangsResult.data : ['en'];

    // Single auth check at root level to avoid multiple calls
    const session = await auth(); 

        // determine current pathname for redirect logic
    const headersList = await headers();
    const currentPath = headersList.get('x-pathname') || '/';

    // Evaluate once whether setup directory exists
    const setupExists = checkSetupPath();

    // Check if setup path exists and redirect if it does, avoiding loops
    if (setupExists && currentPath !== '/setup' && !siteSettings?.key) { 
        // server-side redirect avoids client-only hooks
        redirect('/setup');
    }

    return (
        <html lang={locale} className="dark notranslate" suppressHydrationWarning translate="no">
            <head>
                {/* Google Translate Disable - Prevent third-party translation tools from breaking React */}
                <meta name="google" content="notranslate" />
                <meta httpEquiv="Content-Language" content={locale} />
            </head>
            <body className={`antialiased loading-active notranslate`} translate="no">
                <GlobalJsonLd siteSettings={siteSettings} storeSettings={storeSettings} pathname={currentPath} />
                <div className="loading-page-container">
                    <div></div>
                </div>

                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers 
                        siteSettings={siteSettings} 
                        storeSettings={storeSettings} 
                        session={session} 
                        setupExists={setupExists}
                        availableFrontendLanguages={availableFrontendLanguages}
                    >  
                    <InitialLoadingHandler firstLoadOnly={true}>
                        {children}
                    </InitialLoadingHandler>
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
