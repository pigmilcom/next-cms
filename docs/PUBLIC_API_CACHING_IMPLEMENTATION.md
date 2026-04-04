# Public API Caching Implementation

## Overview

This document describes the public API caching system implemented to prevent redundant database queries for frequently accessed endpoints like `/api/query/public/[collection]` and `/api/query/public/[collection]`.

## Problem Solved

Multiple scripts and components were making repeated GET requests to public API endpoints during page loads, causing unnecessary database queries. The caching system reduces database load by storing responses in memory with configurable TTL (Time To Live).

## Implementation Details

### 1. Cache Infrastructure (`src/app/api/query/public/[slug]/route.js`)

**Cache Storage:**
```javascript
const publicApiCache = new Map();
```

**Cache Durations (TTL):**
- `site_settings`: 10 minutes (600000ms)
- `roles`: 15 minutes (900000ms)
- `blocks`: 5 minutes (300000ms)
- `catalog`: 3 minutes (180000ms)
- Default: 5 minutes (300000ms)

**Core Functions:**

1. **generatePublicCacheKey(collection, params)**
   - Creates unique cache key from collection name and query parameters
   - Handles pagination, search, filters, and item lookups
   - Example: `site_settings:{}`, `roles:{"search":"admin"}`, `catalog:{"page":1,"limit":10}`

2. **getPublicCachedResponse(cacheKey, duration)**
   - Checks if cached data exists and is still valid
   - Returns cached data if within TTL window
   - Returns null if cache miss or expired

3. **setPublicCache(cacheKey, data)**
   - Stores response data with current timestamp
   - Used after successful database queries

4. **clearPublicApiCache(collection)**
   - Clears cache for specific collection or all collections
   - Exported for integration with admin mutations
   - Example: `clearPublicApiCache('roles')` or `clearPublicApiCache()` for all

### 2. Cache Integration in GET Handler

**Request Flow:**

1. **Cache Check (Before Database Query)**
   ```javascript
   // Generate cache key from query parameters
   const cacheParams = { id, key, value, page, limit, search };
   const cacheKey = generatePublicCacheKey(slug, cacheParams);

   // Check cache for non-authenticated requests
   if (cacheKey && !request.headers.get('x-api-key')) {
       const duration = getCacheDuration(slug);
       const cachedResponse = getPublicCachedResponse(cacheKey, duration);
       
       if (cachedResponse) {
           // Cache HIT - return cached data
           const response = NextResponse.json(cachedResponse);
           response.headers.set('X-Cache', 'HIT');
           response.headers.set('Cache-Control', `public, max-age=${duration}`);
           return response;
       }
   }
   ```

2. **Database Query (Cache Miss)**
   - Proceeds with normal database query if cache miss
   - Performs pagination, search, and sorting

3. **Cache Storage (After Successful Query)**
   ```javascript
   // Store response in cache
   if (cacheKey) {
       setPublicCache(cacheKey, responseData);
   }

   // Return response with cache MISS header
   const response = NextResponse.json(responseData);
   if (cacheKey) {
       response.headers.set('X-Cache', 'MISS');
       const duration = getCacheDuration(slug);
       response.headers.set('Cache-Control', `public, max-age=${duration}`);
   }
   ```

### 3. Cache Invalidation in Admin Functions (`src/lib/server/admin.js`)

**Helper Function:**
```javascript
/**
 * Clear both admin cache and public API cache for specific collections
 * This ensures consistency between admin backend and public frontend
 */
function clearAllCaches(collections) {
    // Clear admin cache
    clearCollectionCache(collections);
    
    // Clear public API cache for each collection
    const collectionArray = typeof collections === 'string' ? [collections] : collections;
    collectionArray.forEach(collection => {
        try {
            clearPublicApiCache(collection);
        } catch (error) {
            console.error(`Failed to clear public API cache for ${collection}:`, error);
        }
    });
}
```

**Updated Admin Functions:**
All mutation functions now use `clearAllCaches()` instead of `clearCollectionCache()`:

- **Settings:** `updateSiteSettings`, `updateStoreSettings`
- **Roles:** `createRole`, `updateRole`, `deleteRole`
- **Catalog:** `createCatalogItem`, `updateCatalogItem`, `deleteCatalogItem`
- **Categories:** `createCategory`, `updateCategory`, `deleteCategory`
- **Blocks:** `createBlock`, `updateBlock`, `deleteBlock`

**System Maintenance Integration:**
The `clearSystemCache` function now includes public API cache clearing:
- `clear-admin-cache`: Clears both admin cache and all public API cache
- `clear-dashboard-cache`: Clears dashboard + public API for affected collections
- `clear-catalog-cache`: Clears catalog + public API cache
- `clear-orders-cache`: Clears orders + public API cache

## Cache Behavior

### Cache Headers

**Cache HIT Response:**
```
X-Cache: HIT
Cache-Control: public, max-age=600
```

**Cache MISS Response:**
```
X-Cache: MISS
Cache-Control: public, max-age=600
```

### Cache Bypass Conditions

1. **API Key Authentication**
   - Requests with `x-api-key` header bypass cache
   - Ensures authenticated requests always get fresh data

2. **Mutation Operations**
   - POST, PUT, DELETE operations are never cached
   - These operations automatically clear related caches

### Cache Key Examples

```javascript
// Simple collection fetch
'site_settings:{}' // GET /api/query/public/site_settings

// With search parameter
'roles:{"search":"admin"}' // GET /api/query/public/roles?search=admin

// With pagination
'catalog:{"page":1,"limit":10}' // GET /api/query/public/catalog?page=1&limit=10

// Single item by ID
'roles:{"id":"admin-role"}' // GET /api/query/public/roles?id=admin-role

// By key-value lookup
'users:{"key":"email","value":"user@example.com"}' // GET /api/query/public/users?key=email&value=user@example.com
```

## Performance Benefits

### Before Caching
- Multiple scripts fetch `site_settings` during page load → 5-10 database queries
- Role checks on each component mount → 3-5 database queries
- Total: **8-15 redundant queries per page load**

### After Caching
- First request: Database query + cache storage
- Subsequent requests (within TTL): Instant cache response
- Total: **1 database query per collection per TTL window**

### Expected Improvements
- **90-95% reduction** in database queries for frequently accessed endpoints
- **Faster page loads** with instant cached responses
- **Reduced database load** and connection usage
- **Better scalability** for high-traffic scenarios

## Cache Statistics & Monitoring

### Available in Maintenance Page
The system maintenance page (`/admin/system/maintenance`) displays:
- Total cache entries
- Cache memory usage (estimated MB)
- Collection breakdown
- Fresh vs. stale entries
- Quick clear actions

### Future Enhancements
- Add public API cache statistics to maintenance page
- Monitor cache hit/miss ratios
- Track cache effectiveness per collection
- Add cache warming for critical endpoints

## Testing the Cache System

### Manual Testing

1. **Test Cache HIT:**
   ```bash
   # First request (cache MISS)
   curl -i http://localhost:3000/api/query/public/site_settings
   # Header: X-Cache: MISS

   # Second request within TTL (cache HIT)
   curl -i http://localhost:3000/api/query/public/site_settings
   # Header: X-Cache: HIT
   ```

2. **Test Cache Invalidation:**
   ```bash
   # Update settings via admin panel
   # Then check if cache is cleared
   curl -i http://localhost:3000/api/query/public/site_settings
   # Should be X-Cache: MISS (cache was cleared)
   ```

3. **Test Different Collections:**
   ```bash
   # Roles (15-min cache)
   curl -i http://localhost:3000/api/query/public/roles

   # Blocks (5-min cache)
   curl -i http://localhost:3000/api/query/public/blocks

   # Catalog (3-min cache)
   curl -i http://localhost:3000/api/query/public/catalog
   ```

### Browser DevTools Testing

1. Open Network tab
2. Load a page that fetches public API data
3. Refresh the page
4. Check response headers for `X-Cache: HIT/MISS`
5. Verify response times (cache hits should be <10ms)

## Configuration & Tuning

### Adjusting Cache Durations

Edit `PUBLIC_CACHE_DURATIONS` in `route.js`:

```javascript
const PUBLIC_CACHE_DURATIONS = {
    site_settings: 10 * 60 * 1000,  // Increase to 20 min if rarely changes
    roles: 15 * 60 * 1000,          // Increase to 30 min for stable roles
    blocks: 5 * 60 * 1000,          // Decrease to 2 min for dynamic content
    catalog: 3 * 60 * 1000,         // Adjust based on inventory update frequency
    default: 5 * 60 * 1000          // Default for all other collections
};
```

**Guidelines:**
- **Static data** (rarely changes): 15-30 minutes
- **Semi-static data** (changes occasionally): 5-15 minutes
- **Dynamic data** (changes frequently): 2-5 minutes
- **Real-time data** (needs fresh data): Don't cache or use 30-60 seconds

### Memory Considerations

- Each cache entry stores: `{ data, timestamp }`
- Average entry size: 1-10 KB for typical JSON responses
- 1000 cached entries ≈ 1-10 MB memory usage
- Cache is automatically cleared on app restart (in-memory storage)

## Security Considerations

1. **No sensitive data in public API cache**
   - Public endpoints should only expose non-sensitive data
   - Authenticated requests bypass cache

2. **Cache pollution prevention**
   - Cache keys include query parameters to prevent conflicts
   - Each unique query gets its own cache entry

3. **Cache timing attacks**
   - Not applicable - cache timing is intentional and public
   - No sensitive information leaked via timing

## Maintenance & Troubleshooting

### Clear Cache Via Admin Panel
1. Go to `/admin/system/maintenance`
2. Navigate to "Cache Management" tab
3. Use "Clear Admin Cache" to clear all caches including public API

### Clear Cache Programmatically
```javascript
import { clearPublicApiCache } from '@/app/api/query/public/[slug]/route.js';

// Clear specific collection
clearPublicApiCache('site_settings');

// Clear all public API cache
clearPublicApiCache();
```

### Common Issues

**Issue: Stale data after update**
- Cause: Cache not cleared after admin update
- Solution: Ensure mutation function uses `clearAllCaches()`

**Issue: Cache not working**
- Check: Requests have `x-api-key` header? (bypasses cache)
- Check: Response headers for `X-Cache` value
- Check: Cache duration not expired

**Issue: High memory usage**
- Solution: Reduce cache durations
- Solution: Implement cache size limits (future enhancement)

## Future Roadmap

- [ ] Add Redis/external cache provider support
- [ ] Implement cache warming on app startup
- [ ] Add cache analytics dashboard
- [ ] Implement cache size limits and LRU eviction
- [ ] Add per-user cache for authenticated requests
- [ ] Implement cache versioning for invalidation
- [ ] Add cache preloading for critical endpoints
- [ ] Implement distributed cache for multi-instance deployments

## Related Documentation

- [Admin Caching System](./CACHING_IMPLEMENTATION_GUIDE.md)
- [API Access Control](./API_ACCESS_CONTROL.md)
- [System Maintenance](./WORKSPACE_SYNCHRONIZATION_README.md)
