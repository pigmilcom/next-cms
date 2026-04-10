# GitHub Copilot Instructions

A production-ready Next.js 16 CMS & E-commerce platform with multi-database support, advanced caching, and dynamic content management.

## Stack & Tooling
- **Next.js 16** (App Router), **React 19**
- **JavaScript/JSX** by default (TypeScript only if required)
- **Tailwind CSS 4** + **shadcn/ui** + **Radix UI**
- **Biome** for linting/formatting (no ESLint/Prettier)
- **NextAuth 5**, **next-intl**, **react-hook-form** + **zod**
- **Payments**: Stripe, EuPago (MB Way, Multibanco) & SumUp
- **Databases**: PostgreSQL (primary), Firebase (optional)  

## Architecture Patterns

### Database Abstraction (`@/data/rest.db.js`)
- **Single interface** for PostgreSQL, or Firebase (auto-detects via env vars)
- Always use `DBService` methods: `.read()`, `.readAll()`, `.readBy()`, `.readByAll()`, `.create()`, `.update()`, `.delete()`, `.upload()`
- Never import provider-specific services (`postgres.db.js`, `firebase.db.js`, ..) directly

### Centralized Cache System (`@/lib/shared/cache.js`)
**All data flows through a single centralized cache**. Automatic cache clearing on mutations.

**Key Features:**
- Dynamic instance creation via `initCache(name)` - creates isolated cache per module
- Default 24h cache duration (optional override with `duration` or `next.revalidate`)
- Automatic cache invalidation on create/update/delete operations
- Flexible clearing: specific keys or entire instances
- LRU eviction at 1000 entries per instance
- TTL-based cleanup every 5 minutes

**Cache Instances** (created on-demand):
- `store` - Catalog, categories, collections, favorites, reviews
- `orders` - Order lists and details
- `settings` - Site and store settings
- `users` - User profiles and lists
- `notifications` - Notification data
-  etc. (create new instances as needed, e.g., `auth`, `analytics`, etc.)

**Initialize Cache:**
```javascript
import { initCache } from '@/lib/shared/cache.js';

const { loadCacheData, saveCacheData } = await initCache('store');

export const getCatalog = async (params = {}) => {
    // Try cache first (24h default, optional override)
    const cached = await loadCacheData('catalog', params);
    if (cached) return cached;
    
    // Fetch from database
    const data = await DBService.readAll('catalog');
    
    // Save to cache (optional duration override)
    await saveCacheData('catalog', params, data);
    // OR with custom duration:
    // await saveCacheData('catalog', { ...params, duration: '1H' }, data);
    
    return data;
};
```

**Cache Duration Options** (optional - defaults to 24h):
```javascript
// 18 duration keys available:
"0" (no cache), "30S", "1M", "3M", "5M", "10M", "15M", "30M", "1H", "2H", "3H", "6H", "12H", "1D", "2D", "3D", "7D", "30D"

// Usage examples:
{ duration: "15M" }  // 15 minutes
{ duration: "1H" }   // 1 hour
{ next: { revalidate: 180 } }  // Next.js syntax (3 minutes)
// No params = 24h default
```

**CRUD Operations** (automatic cache clearing):
```javascript
import { cacheFunctions } from '@/lib/shared/cache.js';

const { 
    createWithCacheClear,
    updateWithCacheClear,
    deleteWithCacheClear,
    clearCache,
    clearCacheKeys
} = await cacheFunctions();

// Create with automatic cache clearing
export async function addProduct(data) {
    // Clears entire 'store' instance after creation
    return await createWithCacheClear(data, 'catalog', ['store']);
}

// Update with targeted cache clearing
export async function updateFavorite(id, data) {
    // Only clears 'favorites' keys from 'store' instance
    return await updateWithCacheClear(id, data, 'favorites', ['store'], ['favorites']);
}

// Delete with multi-instance clearing
export async function deleteProduct(id) {
    // Clears both 'store' and 'catalog' instances
    return await deleteWithCacheClear(id, 'catalog', ['store', 'catalog']);
}

// Manual cache control
await clearCache('store');                        // Clear entire instance
await clearCacheKeys('store', 'catalog');         // Clear specific keys
await clearCache('store', 'orders', 'settings'); // Clear multiple instances
```

**Cache Invalidation Pattern:**
- CRUD wrappers automatically clear cache after successful operations
- No need to manually call `clearAllCaches()` - handled internally
- Cache clearing happens at instance or key level based on parameters

### Server Function Organization
**NEVER mix client and server functions**. Import from:
- **Store operations**: `@/lib/server/store.js` (getCatalog, getCategories, etc.)
- **Order operations**: `@/lib/server/orders.js` (getAllOrders, createOrder, etc.)
- **Settings**: `@/lib/server/settings.js` (getSettings)
- **Auth helpers**: `@/lib/server/auth.js` (withAuth, withAdminAuth)
- **Emails**: `@/lib/server/email.js` (sendOrderConfirmation, etc.)
- **Payments**: `@/lib/server/gateway.js` (createStripePaymentIntent, createEuPagoReference, etc.)
- **Client operations**: `@/lib/client/*.js` (visitor-tracking.js etc.)

All server functions return `{ success: boolean, data?: any, error?: string }`.

### Authentication & Authorization
- **NextAuth 5** at `@/auth.js` with dynamic OAuth providers from DB
- **Middleware** (`@/proxy.js`) handles route protection: `/account`, `/admin` require auth
- **Centralized Session Pattern**: 
  - Root layout calls `auth()` once → passes to `Providers` context
  - Client components use `useAuth()` hook: `const { session, user, isAuthenticated } = useAuth()`
  - **NEVER** call `auth()` or `useSession()` in page components (causes extra edge invocations)
  - **NEVER** call `getSettings()` in page components (use `useSettings()` hook instead)
- **Role checks**: Admin routes verify `user.role === 'admin'` in server layout
- **API protection**: Private endpoints use `withAuth()` / `withAdminAuth()` wrappers

## File Structure
```
src/
├── app/
│   ├── (actions)/**           # Frontend system page routes
│   ├── (backend)/**           # Admin dashboard (role: admin)
│   ├── (frontend)/**          # Public frontend routes
│   ├── auth/**                # Login, register, logout
│   └── api/
│       ├── ...               # API routes (public and private)
├── data/
│   ├── rest.db.js             # Database abstraction layer
│   ├── postgres.db.js         # PostgreSQL implementation
├── lib/
│   ├── server/                # Server-only functions ('use server')
│   └── client/                # Client-safe utilities
│   └── shared/                # Shared utilities (e.g., cache.js)
├── components/                # Shared UI components
├── emails/                    # React Email templates
└── locale/                    # next-intl translations (en, es, fr, pt, ..)
```

### Page Component Pattern (Server/Client Split)
**ALWAYS split pages into server and client components:**

**Server Component** (`page.jsx`):
- Fetch ONLY page-specific data (products, orders, etc.)
- Use `getCatalog()`, `getCategories()`, etc. from `@/lib/server/store.js`
- Pass data as props to client component
- **DO NOT** fetch auth/settings (centralized in root layout)

**Client Component** (`page.client.jsx`):
- Import `'use client'` directive
- Use `useAuth()` hook for session: `const { session, isAuthenticated, user } = useAuth()`
- Use `useSettings()` hook for config: `const { siteSettings, storeSettings } = useSettings()`
- Handle UI state, interactions, and browser APIs
- Never import server functions directly

**Example Structure:**
```javascript
// page.jsx (Server Component)
import { getCatalog } from '@/lib/server/store';
import PageClient from './page.client';

const Page = async () => {
    const products = await getCatalog({ duration: "3M" });
    return <PageClient products={products} />;
};

// page.client.jsx (Client Component)
'use client';
import { useAuth, useSettings } from '@/context/providers';

const PageClient = ({ products }) => {
    const { user, isAuthenticated } = useAuth();
    const { siteSettings, storeSettings } = useSettings();
    // ... UI logic
};
```

**Reference:** See `@/app/(frontend)/(blank)/**` for complete implementation with comments, JSON-LD schemas, and best practices.

## Critical Workflows

### 1. Data Mutations (Admin)
```javascript
// @/lib/server/store.js
import { cacheFunctions } from '@/lib/shared/cache.js';

const { updateWithCacheClear } = await cacheFunctions();

export async function updateCatalogItem(id, data) {
    // Automatically clears 'store' instance after successful update
    const result = await updateWithCacheClear(id, data, 'catalog', ['store']);
    
    // Optional: trigger notifications
    if (result?.success) {
        await triggerOrderStatusChangeNotification(data);
    }
    
    return result;
}
```

### 2. Data Fetching (Frontend)
```javascript
// @/app/(frontend)/page.jsx (Server Component)
import { getCatalog } from '@/lib/server/store';

const Page = async () => {
    // Defaults to 24h cache, React cache() dedupes identical calls
    const products = await getCatalog();
    
    // Optional: Override cache duration
    // const products = await getCatalog({ next: { revalidate: 180 } }); // 3 min
    // const products = await getCatalog({ duration: "15M" }); // 15 min
    
    return <PageClient products={products} />;
};
```

### 3. API Routes (Public)
```javascript
// @/app/api/query/public/[slug]/route.js
// GET /api/query/public/catalog?page=1&limit=10
// - Auto-cached (24h default, optional duration override)
// - CSRF protection via token validation
// - Rate limiting (100 req/hour default)
// - Access control via api_settings.apiEnabled
```

## Edge & Cost Optimizations
**CRITICAL**: Minimize Vercel edge invocations:
- **Middleware** (`@/proxy.js`): Auth checks ONLY, no DB/fetch calls
- **Disable prefetch**: All `<Link>` in admin must have `prefetch={false}`
- **Session**: Check once in root layout, pass to `Providers` context → access via `useAuth()` hook
- **Settings**: Fetch once in root layout, pass to `Providers` context → access via `useSettings()` hook
- **Images**: Use `<Image priority={false}>` unless above-the-fold; prefer `<img>` in admin tables
- **Layouts**: No `fetch()` calls unless data is universal (e.g., site settings)

## Development Commands
```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run biome:fix        # Auto-fix code style
npm run email-dev        # Preview email templates
```

## Common Patterns

### Cache Duration Override (Optional)
```javascript
// Default: 24h cache (no params needed)
const data = await getCatalog();

// Optional override with Next.js syntax
const data = await getCatalog({ next: { revalidate: 60 } }); // 1 minute

// Optional override with duration keys
const data = await getCatalog({ duration: "15M" }); // 15 minutes
const data = await getCatalog({ duration: "1H" }); // 1 hour
const data = await getCatalog({ duration: "7D" }); // 7 days
```

### Multi-Database Setup
```javascript
// Auto-detects based on env vars (priority: Postgres > Firebase)
if (process.env.POSTGRES_URL) { /* uses PostgreSQL */ }
else if (process.env.FIREBASE_URL) { /* uses Firebase */ }
```

### Form Validation
```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ email: z.string().email() });
const form = useForm({ resolver: zodResolver(schema) });
```

## Output Rules
- Generate **complete, production-ready code** without explanations
- **Never** break existing cache invalidation chains
- **Never** import server functions in client components
- **Always** check for existing functions before creating new ones
- Follow JSX formatting (Biome rules)
- Preserve existing structure and naming conventions 

## Best Practices
- **Never** break existing cache invalidation chains
- **Never** import server functions in client components
- **Always** check for existing functions before creating new ones
- **Always** apply changes if needed and recommended only, unless requested. 
- **Always** follow Next.Js 16 best practices.
- **Always** review the code after code changes, make sure there is no errors and no duplicated code.
- Follow JSX formatting (Biome rules)
- Preserve existing structure, layout and naming conventions 
- Before apply any changes, review the current code, structure and logic.

## Documentation
See `/docs` folder for detailed documentation on architecture, patterns, and workflows. 

## Agent Instructions
Before apply any changes, review the current code, structure and logic, then apply the changes if needed and recommended only, unless requested. Always follow Next.Js 16 best practices. Always review the code after code changes, make sure there is no errors, no duplicated code. Also make sure everything follows the same flow, structure and logic as the current codebase.