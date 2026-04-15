// @/app/(backend)/admin/overview/page.jsx

import { getDashboardStats } from '@/lib/server/admin';
import OverviewPageClient from './page.client';

export default async function OverviewPage() {
    const result = await getDashboardStats({ duration: '15M' });
    const initialData = result?.success ? result.data : null;
    return <OverviewPageClient initialData={initialData} />;
}
