// @/app/(backend)/admin/access/users/page.jsx

import { getAllRoles, getAllUsers } from '@/lib/server/users';
import UsersPageClient from './page.client';

export default async function UsersPage() {
    const [usersResult, rolesResult] = await Promise.all([getAllUsers({ limit: 0 }), getAllRoles()]);

    const initialUsers = usersResult?.success
        ? (usersResult.data || [])
        : [];

    const rolesArray = Array.isArray(rolesResult?.data) ? rolesResult.data : [];
    const mappedRoles = rolesArray
        .map((r) => ({ key: r.key, id: r.id, value: r.name, label: r.displayName || r.name || r.id }))
        .filter((r) => r.value);
    const initialRoles = mappedRoles.length > 0 ? mappedRoles : [{ value: 'admin', label: 'Administrator' }];

    return <UsersPageClient initialUsers={initialUsers} initialRoles={initialRoles} />;
}
