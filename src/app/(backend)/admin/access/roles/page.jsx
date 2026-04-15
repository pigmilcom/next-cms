// @/app/(backend)/admin/access/roles/page.jsx

import { getAllRoles } from '@/lib/server/users';
import RolesPageClient from './page.client';

export default async function RolesPage() {
    const rolesResult = await getAllRoles({ limit: 0 });
    const initialRoles = Array.isArray(rolesResult?.data) ? rolesResult.data : [];
    return <RolesPageClient initialRoles={initialRoles} />;
}
