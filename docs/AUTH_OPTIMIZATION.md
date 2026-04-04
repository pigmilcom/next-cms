# Authentication Optimization

## Overview
Optimized authentication pattern to minimize Vercel edge function invocations by reducing redundant `useSession()` calls.

## Problem
Previous pattern had multiple authentication checks per page:
- Server layout: `auth()` call (no edge cost)
- Client LayoutProvider: `useSession()` call (edge request)
- Each child component: `useAuth()` → `useSession()` internally (edge request)

**Result**: ~7+ edge requests per admin page load

## Solution
Session is now checked once at the server layout level and passed down via props and context:

### Architecture

```
Server Layout (auth() call - no edge cost)
    ↓ (pass session as prop)
Client LayoutProvider (receives session, no useSession())
    ↓ (provide via context)
Components (use useLayout() for session data)
```

## Changes Made

### 1. Server Layouts Pass Session

#### Backend Layout (`app/(backend)/layout.jsx`)
```jsx
export default async function AdminLayout({ children }) {
    const session = await auth(); // Server-side, no edge cost
    
    // ... role check ...
    
    return (
        <LayoutProvider 
            adminSiteSettings={adminSiteSettings}
            session={session} // Pass to client
        >
            {children}
        </LayoutProvider>
    );
}
```

#### Frontend Layout (`app/(frontend)/layout.jsx`)
```jsx
export default async function FrontendLayout({ children }) {
    const session = await auth(); // Server-side, no edge cost
    
    return (
        <LayoutProvider session={session}> {/* Pass to client */}
            {children}
        </LayoutProvider>
    );
}
```

### 2. LayoutProviders Accept Session Prop

Both admin and frontend LayoutProviders updated:

**Before:**
```jsx
const { data: session, status } = useSession(); // Edge request!
```

**After:**
```jsx
export const LayoutProvider = ({ children, session }) => {
    // No useSession() call - receives from prop
    const layoutValue = {
        session,
        isAuthenticated: !!session?.user,
        user: session?.user || null
    };
    // ...
}
```

### 3. Components Use Context Instead of useSession()

**Before:**
```jsx
import { useAuth } from '@/hooks/useAuth';

function Component() {
    const { user } = useAuth(); // Internally calls useSession() - edge request!
}
```

**After:**
```jsx
import { useLayout } from '../context/LayoutProvider';

function Component() {
    const { user } = useLayout(); // Reads from context - no edge request
}
```

### 4. Updated Components

Admin components updated to use `useLayout()`:
- `app/(backend)/admin/components/app-sidebar.jsx`
- `app/(backend)/admin/components/notifications.jsx`
- `app/(backend)/admin/components/nav-badge.jsx`
- `app/(backend)/admin/account/page.jsx`
- `app/(backend)/admin/account/notifications/page.jsx`
- `app/(backend)/admin/transactions/page.jsx`

### 5. useAuth Hook Simplified

The `useAuth` hook now only provides:
- `logout()` - logout functionality
- `session` - for special cases (logout page)
- `status` - for special cases (logout page)

It still calls `useSession()` but is only used in special cases like the logout page that are outside the layout context.

**Usage:**
```jsx
// For logout functionality
import { useAuth } from '@/hooks/useAuth';
const { logout } = useAuth();

// For user/session data
import { useLayout } from '../context/LayoutProvider';
const { user, session, isAuthenticated } = useLayout();
```

## Results

### Before Optimization
- Admin page: 7+ auth checks (1 server + 6+ client)
- Each `useSession()` call = edge request
- High edge function costs

### After Optimization
- Admin page: 1 auth check (server only)
- Client components read from context
- ~85% reduction in auth-related edge requests

## Implementation Notes

1. **SessionProvider Still Required**: Keep `SessionProvider` in root layout for NextAuth infrastructure
2. **Server Layouts Check Once**: `auth()` is called server-side (no edge cost)
3. **Props Over Hooks**: Session passed via props instead of hooks
4. **Context Distribution**: LayoutContext distributes session to all child components
5. **Special Cases**: Logout page still uses `useAuth()` since it's outside layout context

## Migration Guide

If you need to add new components that need auth:

```jsx
// ❌ Don't do this (causes edge request)
import { useAuth } from '@/hooks/useAuth';
const { user } = useAuth();

// ✅ Do this instead (reads from context)
import { useLayout } from '../context/LayoutProvider';
const { user } = useLayout();
```

## Benefits

1. **Cost Reduction**: ~85% fewer auth-related edge requests
2. **Performance**: Faster page loads (no redundant auth checks)
3. **Maintainability**: Single source of truth for session data
4. **Scalability**: Adding components doesn't increase edge costs

## Related Documentation

- [AUTOMATIC_CACHE_CLEARING.md](./AUTOMATIC_CACHE_CLEARING.md) - Cache system
- [API_ACCESS_CONTROL.md](./API_ACCESS_CONTROL.md) - API security
- [SETUP_ARCHITECTURE.md](./SETUP_ARCHITECTURE.md) - Overall architecture
