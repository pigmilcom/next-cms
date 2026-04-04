// @/app/not-found.jsx

'use client';

import { usePathname } from 'next/navigation';
import AdminNotFound from './(backend)/admin/not-found';
import ClientNotFound from './(frontend)/not-found';

export default function NotFound() {
    const pathname = usePathname() || '/';

    const isAdmin = pathname.toLowerCase().startsWith('/admin');

    return isAdmin ? <AdminNotFound /> : <ClientNotFound />;
}
