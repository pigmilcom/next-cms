// @/app/(backend)/admin/[...not_found]/page.jsx
'use client';

import { notFound } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminCatchAll() {
    // Prevent any data fetching on 404 pages
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__SKIP_DATA_FETCH__ = true;
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.__SKIP_DATA_FETCH__ = false;
            }
        };
    }, []);

    notFound();
}
