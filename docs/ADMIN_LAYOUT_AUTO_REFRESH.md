# Admin Layout Auto-Refresh After Cache Clear

## Overview

The admin layout now automatically refetches settings and user data whenever the cache is cleared for `settings` or `users` instances. This ensures that the admin dashboard always displays fresh data after any cache operations.

## Implementation

### Cache Revalidation System

**Location:** `@/lib/shared/cache.js`

A revalidation mapping system tracks which cache instances should trigger Next.js path revalidation:

```javascript
const revalidationMap = {
    settings: ['/admin'],  // Clears settings → revalidates /admin layout
    users: ['/admin'],     // Clears users → revalidates /admin layout
    store: [],
    orders: [],
    notifications: []
};
```

### Automatic Revalidation Triggers

All cache clearing operations now automatically trigger path revalidation:

#### 1. CRUD Operations with Cache Clear
```javascript
import { cacheFunctions } from '@/lib/shared/cache.js';

const { updateWithCacheClear } = await cacheFunctions();

// Update settings → clears 'settings' cache → revalidates /admin
await updateWithCacheClear(id, data, 'site_settings', ['settings']);

// Update user → clears 'users' cache → revalidates /admin
await updateWithCacheClear(id, data, 'users', ['users']);
```

#### 2. Manual Cache Clearing
```javascript
const { clearCache, clearCacheKeys } = await cacheFunctions();

// Clear entire instance → revalidates /admin
await clearCache('settings');

// Clear specific keys → revalidates /admin
await clearCacheKeys('users', 'user', 'accounts');
```

### How It Works

1. **Cache Operation**: When cache is cleared for `settings` or `users` instances
2. **Revalidation Trigger**: `triggerPathRevalidation()` checks the revalidation map
3. **Path Revalidation**: Calls `revalidatePath('/admin', 'layout')`
4. **Layout Refetch**: Admin layout server component re-runs
5. **Fresh Data**: Calls `getSettings()` and `getUser()` with fresh data from database
6. **Context Update**: Updated data flows to LayoutProvider and client components

### Data Flow

```
Cache Clear (settings/users)
    ↓
triggerPathRevalidation(['settings'])
    ↓
revalidatePath('/admin', 'layout')
    ↓
Admin Layout Re-renders (server)
    ↓
getSettings() + getUser() (fresh from DB)
    ↓
LayoutProvider receives new props
    ↓
useAdminSettings() + useLayout() hooks get fresh data
```

## Admin Layout Architecture

### Server Layout
**File:** `@/app/(backend)/layout.jsx`

```javascript
export default async function BackendLayout({ children }) {
    const session = await auth();
    const user = session?.user || null;
    
    // Fetch enriched user data
    const userRes = await getUser({ userId: user.key });
    
    // Fetch admin settings (with sensitive keys)
    const { adminSiteSettings, adminStoreSettings } = await getSettings();
    
    return (
        <LayoutProvider 
            siteSettings={adminSiteSettings} 
            storeSettings={adminStoreSettings}
            session={session}
        >
            {children}
        </LayoutProvider>
    );
}
```

### Client Provider
**File:** `@/app/(backend)/admin/context/LayoutProvider.jsx`

```javascript
export const LayoutProvider = ({ children, siteSettings, storeSettings }) => {
    const { session, isAuthenticated, user } = useAuth();
    
    const layoutValue = {
        session,
        isAuthenticated,
        user,
        siteSettings,
        storeSettings,
        refreshSession
    };
    
    return (
        <LayoutContext.Provider value={layoutValue}>
            <AdminSettingsContext.Provider value={{ siteSettings, storeSettings }}>
                {children}
            </AdminSettingsContext.Provider>
        </LayoutContext.Provider>
    );
};

// Access settings in admin components
export const useAdminSettings = () => useContext(AdminSettingsContext);
export const useLayout = () => useContext(LayoutContext);
```

## Usage Examples

### Example 1: Update Site Settings
```javascript
// @/lib/server/settings.js
import { cacheFunctions } from '@/lib/shared/cache.js';

const { updateWithCacheClear } = await cacheFunctions();

export async function updateSiteSettings(data) {
    const result = await updateWithCacheClear(
        'site_settings', 
        data, 
        'site_settings', 
        ['settings']  // Clears settings cache + revalidates /admin
    );
    
    return result;
    // Admin layout automatically refetches getSettings()
}
```

### Example 2: Update User Profile
```javascript
// @/lib/server/users.js
import { cacheFunctions } from '@/lib/shared/cache.js';

const { updateWithCacheClear } = await cacheFunctions();

export async function updateUserProfile(userKey, profileData) {
    const result = await updateWithCacheClear(
        userKey,
        profileData,
        'users',
        ['users']  // Clears users cache + revalidates /admin
    );
    
    return result;
    // Admin layout automatically refetches getUser()
}
```

### Example 3: Access Fresh Data in Admin Components
```javascript
'use client';
import { useAdminSettings, useLayout } from '@/app/(backend)/admin/context/LayoutProvider';

export default function AdminComponent() {
    // Always has fresh data after cache operations
    const { siteSettings, storeSettings } = useAdminSettings();
    const { user, session } = useLayout();
    
    return (
        <div>
            <h1>{siteSettings.siteName}</h1>
            <p>User: {user.name}</p>
        </div>
    );
}
```

## Benefits

1. **Automatic Sync**: No manual refresh needed after cache operations
2. **Always Fresh**: Admin dashboard displays latest data from database
3. **Performance**: Only revalidates when relevant cache is cleared
4. **Consistent**: Same pattern for all cache instances (settings, users, store, orders)
5. **Type-Safe**: Leverages Next.js revalidatePath for server-side revalidation

## Configuration

### Add More Revalidation Paths

To revalidate additional paths when cache is cleared:

```javascript
// @/lib/shared/cache.js
const revalidationMap = {
    settings: ['/admin', '/admin/settings'],  // Multiple paths
    users: ['/admin', '/admin/users'],
    store: ['/admin/store'],
    orders: ['/admin/orders'],
    notifications: ['/admin/notifications']
};
```

### Disable Revalidation

To prevent revalidation for specific instances:

```javascript
const revalidationMap = {
    settings: [],  // Empty array = no revalidation
    users: ['/admin'],
    // ...
};
```

## Technical Notes

- Uses Next.js `revalidatePath(path, 'layout')` for server-side revalidation
- Revalidation happens on the server, not the client
- Layout type ensures all nested components get fresh data
- Deduplicates paths before revalidation (same path not revalidated twice)
- Error handling prevents revalidation failures from breaking cache operations
- Console logs track all revalidation events for debugging

## Testing

To verify the implementation:

1. Open admin dashboard
2. Update site settings or user profile
3. Check browser console for: `[Cache] Revalidated path: /admin`
4. Verify settings/user data is fresh without manual page refresh

## Troubleshooting

**Issue:** Admin layout not refreshing after cache clear

**Solution:**
1. Check revalidationMap includes correct paths
2. Verify cache clearing uses correct instance names ('settings', 'users')
3. Check browser console for revalidation logs
4. Ensure Next.js version supports revalidatePath

**Issue:** Multiple revalidations happening

**Solution:**
- Revalidation is deduplicated per request
- Multiple cache clears in same operation only trigger one revalidation per path
