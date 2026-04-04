// @/app/(backend)/admin/developer/interface/page.jsx

import { getInterfaceSettings } from '@/lib/server/interface';
import InterfacePageClient from './page.client';

export const metadata = {
    title: 'Interface Settings - Admin Dashboard',
    description: 'Manage admin interface menu visibility'
};

export default async function InterfacePage() {
    const interfaceSettings = await getInterfaceSettings();

    return <InterfacePageClient interfaceSettings={interfaceSettings} />;
}
