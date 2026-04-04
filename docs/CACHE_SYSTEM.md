# Cache System Documentation
**Last Updated:** December 20, 2025  
**Version:** 4.0.0  
**Status:** ✅ Production-Ready - Centralized Cache Management

---

## 🎯 Overview

This application uses a **centralized cache management system** (`@/lib/shared/cache.js`) that provides dynamic cache instance creation for different parts of the application. Cache instances are created on-demand and share the same robust implementation while maintaining separate storage and metrics.

### Key Features
- ✅ **Dynamic Instance Creation**: Create cache instances on-demand via `initCache()`
- ✅ **Isolated Storage**: Each instance has its own Map for data and metrics
- ✅ **Flexible Duration Control**: Support for Next.js revalidate syntax and 18 custom duration keys
- ✅ **Memory Safety**: LRU eviction at 1000 entries per instance
- ✅ **Performance Metrics**: Real-time tracking (hits, misses, evictions, clears)
- ✅ **TTL Cleanup**: Automatic expired entry removal every 5 minutes (per-entry duration)
- ✅ **Pattern Matching**: Prefix-based cache clearing
- ✅ **CRUD Wrappers**: Automatic cache invalidation on create/update/delete

---

## 🏗️ Architecture

### Centralized Cache System
**Location**: `@/lib/shared/cache.js`

The shared cache provides:
- **Factory Function**: `createCacheInstance(config)` - Creates isolated cache instances
- **Initialization Function**: `initCache(instanceName)` - Initialize cache with utilities
- **Management Functions**: `cacheFunctions()` - CRUD wrappers with auto-clearing
- **Module-level Map**: Tracks all initialized cache instances

### Cache Instance Structure

Each cache instance contains:
```javascript
{
    name,                  // Instance name ('settings', 'store', 'orders', etc.)
    durations,             // Available cache durations (1M to 30D)
    cacheMap,              // Isolated Map for this instance's data
    metrics,               // Performance metrics (hits, misses, evictions, clears)
    generateCacheKey,      // Generate cache key from prefix + params
    getCachedData,         // Retrieve cached data if valid (TTL check)
    setCacheData           // Store data with LRU eviction + duration
}
```

### Cache Duration Options

18 predefined duration keys available for all cache instances:
```javascript
"0"    → No caching    (0 ms)
"30S"  → 30 seconds    (30,000 ms)
"1M"   → 1 minute      (60,000 ms)
"3M"   → 3 minutes     (180,000 ms)
"5M"   → 5 minutes     (300,000 ms)
"10M"  → 10 minutes    (600,000 ms)
"15M"  → 15 minutes    (900,000 ms)
"30M"  → 30 minutes    (1,800,000 ms)
"1H"   → 1 hour        (3,600,000 ms)
"2H"   → 2 hours       (7,200,000 ms)
"3H"   → 3 hours       (10,800,000 ms)
"6H"   → 6 hours       (21,600,000 ms)
"12H"  → 12 hours      (43,200,000 ms)
"1D"   → 1 day         (86,400,000 ms)
"2D"   → 2 days        (172,800,000 ms)
"3D"   → 3 days        (259,200,000 ms)
"7D"   → 7 days        (604,800,000 ms)
"30D"  → 30 days       (2,592,000,000 ms)
```

### Cache Instances (Created on Demand)

Instances are created when `initCache(name)` is first called:

**Common Instances:**
- `settings` - Site and store settings
- `store` - Catalog, categories, collections, attributes
- `orders` - Order lists and details
- `users` - User lists and profiles
- `notifications` - Notification data
- `club` - Club/loyalty program data

**Note:** You can create any custom instance name by calling `initCache('your-custom-name')`

---

## 🔄 Cache Flow

### Data Modification Flow
```
Admin Action (Create/Update/Delete)
    ↓
cacheFunctions() wrapper (createWithCacheClear/updateWithCacheClear/deleteWithCacheClear)
    ↓
DBService operation (create/update/delete)
    ↓
If successful → Check instances & keys parameters
    ↓
Keys provided? → clearCacheKeys(instance, ...keys) for each instance
    ↓
No keys? → clearCache(...instances) - Clears entire instance(s)
    ↓
Next request fetches fresh data from database
```

### Data Fetching Flow
```
Data Request
    ↓
loadCacheData(prefix, params) - Check cache first
    ↓
generateCacheKey(prefix, params) - Create unique key
    ↓
getCachedData(cacheKey, duration) - Check TTL validity
    ↓
Cache Hit? → Return cached data (fast)
    ↓
Cache Miss? → Fetch from database
    ↓
saveCacheData(prefix, params, data) - Store in cache
    ↓
setCacheData(cacheKey, data, duration) - Save with TTL
    ↓
Return fresh data
```

### Duration Priority Chain
```
Cache Duration Resolution:
    ↓
1. params.next.revalidate (Next.js seconds → ms)
    ↓
2. params.duration (Custom key like "1H", "1D")
    ↓
3. CACHE_DURATIONS["1D"] (Default: 24 hours)
```

---

## 💻 Usage Guide

### 1. Initialize Cache Instance

```javascript
// @/lib/server/settings.js
import { initCache } from '@/lib/shared/cache.js';

// Initialize cache for settings
const { loadCacheData, saveCacheData } = await initCache('settings');

export async function getSiteSettings(params = {}) {
    // Try loading from cache
    const cached = await loadCacheData('site_settings', params);
    if (cached) return cached;
    
    // Cache miss - fetch from database
    const data = await DBService.readAll('site_settings');
    
    // Save to cache
    await saveCacheData('site_settings', params, data);
    
    return data;
}
```

### 2. Using Custom Cache Durations

```javascript
// Next.js revalidate syntax (priority 1)
const data = await getSiteSettings({ next: { revalidate: 180 } }); // 3 minutes

// Custom duration key syntax (priority 2)
const data = await getSiteSettings({ duration: "1H" }); // 1 hour
const data = await getSiteSettings({ duration: "30M" }); // 30 minutes
const data = await getSiteSettings({ duration: "7D" }); // 7 days

// No params = default 1D (24 hours)
const data = await getSiteSettings();
```

### 3. CRUD Operations with Auto-Clearing

### 3. CRUD Operations with Flexible Cache Clearing

```javascript
// @/lib/server/admin.js
import { cacheFunctions } from '@/lib/shared/cache.js';

const { 
    createWithCacheClear,
    updateWithCacheClear,
    deleteWithCacheClear
} = await cacheFunctions();

// Create with specific key clearing
export async function addToFavorites(data) {
    // Clear only 'favorites' key from 'store' instance
    const result = await createWithCacheClear(data, 'favorites', ['store'], ['favorites']);
    return { success: !!result, data: result };
}

// Update with entire instance clearing
export async function updateCatalogItem(id, data) {
    // Clear entire 'store' instance
    const result = await updateWithCacheClear(id, data, 'catalog', ['store']);
    return { success: !!result, data: result };
}

// Delete with multiple instance clearing
export async function deleteProduct(id) {
    // Clear both 'store' and 'catalog' instances
    const result = await deleteWithCacheClear(id, 'products', ['store', 'catalog']);
    return { success: !!result };
}

// Create without cache clearing (backwards compatible)
export async function createWithoutCaching(data) {
    // Empty instances array = no cache clearing
    const result = await createWithCacheClear(data, 'temp', []);
    return { success: !!result, data: result };
}
```

### 4. Manual Cache Clearing

```javascript
import { cacheFunctions } from '@/lib/shared/cache.js';

const { clearCache, clearCacheKeys, clearAllCache } = await cacheFunctions();

// Clear ALL cache from specific instance(s)
await clearCache('store');                    // Clear one instance
await clearCache('store', 'orders');          // Clear multiple instances

// Clear specific keys from an instance
await clearCacheKeys('store', 'catalog');     // Clear 'catalog' prefix
await clearCacheKeys('store', 'catalog', 'categories'); // Clear multiple keys
await clearCacheKeys('store', ['catalog', 'categories']); // Clear array of keys

// Clear ALL cache from ALL instances
await clearAllCache();
// Returns: { success: true, cleared: 42, details: { store: 20, orders: 22 } }
```

### 5. Get Cache Statistics

```javascript
import { cacheFunctions } from '@/lib/shared/cache.js';

const { getCacheStats } = await cacheFunctions();

// Get stats for one instance
const storeStats = await getCacheStats('store');
console.log(storeStats);
// Returns:
// {
//   name: 'store',
//   totalEntries: 42,
//   cacheSize: 1024000,
//   metrics: {
//     hits: 1250,
//     misses: 150,
//     hitRate: '89.29%',
//     evictions: 5,
//     clears: 2
//   },
//   entries: [...]
// }

// Get stats for multiple instances
const stats = await getCacheStats('store', 'orders');
// Returns: { store: {...}, orders: {...} }

// Get stats for ALL instances
const allStats = await getCacheStats();
// Returns object with all initialized instance stats
```

---

## 🔧 Implementation Examples

### Example 1: Adding Cache to Data Fetching Function

```javascript
// @/lib/server/store.js
import { initCache } from '@/lib/shared/cache.js';
import DBService from '@/data/rest.db.js';

const { loadCacheData, saveCacheData } = await initCache('store');

export async function getCatalog(params = {}) {
    // 1. Try to load from cache
    const cached = await loadCacheData('catalog', params);
    if (cached) return cached;
    
    // 2. Cache miss - fetch from database
    const data = await DBService.readAll('catalog');
    
    // 3. Process data
    const processed = data.filter(item => item.enabled);
    const result = { success: true, data: processed };
    
    // 4. Save to cache
    await saveCacheData('catalog', params, result);
    
    return result;
}

// Usage with different cache durations:
const shortCache = await getCatalog({ duration: "5M" });   // 5 minutes
const mediumCache = await getCatalog({ duration: "1H" });   // 1 hour
const longCache = await getCatalog({ duration: "1D" });     // 1 day
const nextjsCache = await getCatalog({ next: { revalidate: 300 } }); // 5 minutes
```

### Example 2: Adding Cache to Settings Function

```javascript
// @/lib/server/settings.js
import { initCache } from '@/lib/shared/cache.js';

const { loadCacheData, saveCacheData } = await initCache('settings');

export async function getSiteSettings(params = {}, includeAdminData = false) {
    // Different cache prefix for admin vs public data
    const cachePrefix = includeAdminData ? 'site_settings_admin' : 'site_settings';
    
    // Check cache
    const cached = await loadCacheData(cachePrefix, params);
    if (cached) return cached;
    
    // Fetch from database
    const data = await DBService.readAll('site_settings');
    
    // Filter sensitive data for public
    if (!includeAdminData) {
        delete data.apiKey;
        delete data.secretKey;
    }
    
    // Cache result
    await saveCacheData(cachePrefix, params, data);
    
    return data;
}

// Usage:
const publicSettings = await getSiteSettings({ duration: "1H" });
const adminSettings = await getSiteSettings({ duration: "30M" }, true);
```

### Example 3: Creating Custom Cache Instance

```javascript
// @/lib/server/analytics.js
import { initCache } from '@/lib/shared/cache.js';

// Initialize custom cache instance
const { loadCacheData, saveCacheData } = await initCache('analytics');

export async function getDashboardStats(params = {}) {
    const cached = await loadCacheData('dashboard', params);
    if (cached) return cached;
    
    // Expensive aggregation queries
    const stats = await calculateDashboardStats();
    
    // Cache for 10 minutes
    await saveCacheData('dashboard', { ...params, duration: "10M" }, stats);
    
    return stats;
}
```

### Example 4: Mutation with Flexible Cache Clearing

```javascript
// @/lib/server/admin.js
import { cacheFunctions } from '@/lib/shared/cache.js';

const { 
    createWithCacheClear,
    updateWithCacheClear,
    deleteWithCacheClear,
    clearCache
} = await cacheFunctions();

export async function updateProduct(id, data) {
    // Update with specific key clearing from multiple instances
    const result = await updateWithCacheClear(id, data, 'products', ['store', 'catalog'], ['products', 'catalog']);
    
    if (!result?.success) {
        return { success: false, error: 'Update failed' };
    }
    
    return { success: !!result, data: result };
}

export async function addToWatchlist(userId, productId, productName) {
    // Create with targeted cache clearing
    const favoriteData = { userId, productId, productName };
    const result = await createWithCacheClear(favoriteData, 'favorites', ['store'], ['favorites']);
    return { success: !!result, data: result };
}

export async function removeFromWatchlist(favoriteId) {
    // Delete with specific key clearing
    const result = await deleteWithCacheClear(favoriteId, 'favorites', ['store'], ['favorites']);
    return { success: !!result };
}

export async function bulkUpdateProducts(updates) {
    // Perform multiple updates without individual cache clearing
    for (const update of updates) {
        await updateWithCacheClear(update.id, update.data, 'products', []); // Empty array = no clear
    }
    
    // Clear cache once after all updates
    await clearCache('store', 'catalog');
    return { success: true, count: updates.length };
}
```

---

## 📊 Cache Management Strategies

### When to Use Each Function

**initCache(instanceName)**
- Creating cache instances for data fetching
- When you need `loadCacheData` and `saveCacheData` utilities
- Per-module initialization (settings, store, orders, etc.)

**cacheFunctions()**
- CRUD operations that need automatic cache clearing
- Admin mutations (create, update, delete)
- Bulk operations requiring manual cache control
- Getting cache statistics

### Best Practices for Cache Durations

| Data Type | Recommended Duration | Reasoning |
|-----------|---------------------|-----------|
| Site Settings | `1H` to `3H` | Changes infrequently, needed often |
| Product Catalog | `15M` to `1H` | Balance freshness with performance |
| Categories/Collections | `1H` to `3H` | Very static, rarely changes |
| User Profiles | `10M` to `30M` | Moderate update frequency |
| Orders List | `5M` to `15M` | More dynamic, needs recent data |
| Dashboard Stats | `5M` to `10M` | Real-time feel with caching benefit |
| Reviews/Testimonials | `1H` to `6H` | Static content, low priority refresh |
| Cart/Session Data | `3M` to `5M` | Highly dynamic, short cache |

### Cache Invalidation Patterns

**Single Instance Clear:**
```javascript
// When updating data that only affects one instance
await updateCatalogItem(id, data); // Uses updateWithCacheClear('catalog')
```

**Multiple Instance Clear:**
```javascript
// When updating data that affects multiple instances
const { clearCache } = await cacheFunctions();
await DBService.update(id, data, 'products');
await clearCache('store', 'catalog', 'categories');
```

**Selective Key Clear:**
```javascript
// When you want to clear specific prefixes, not entire instance
const { clearCacheKeys } = await cacheFunctions();
await clearCacheKeys('store', 'catalog'); // Only clears 'catalog:*' keys
```

**Complete System Clear:**
```javascript
// When you need to clear everything (e.g., system maintenance)
const { clearAllCache } = await cacheFunctions();
const result = await clearAllCache();
console.log(`Cleared ${result.cleared} entries from ${Object.keys(result.details).length} instances`);
```

---

## 🔬 Technical Details

### Memory Safety - LRU Eviction

When a cache instance reaches 1000 entries, the oldest entry is automatically evicted:

```javascript
// LRU Eviction Algorithm
if (cacheMap.size >= maxSize) {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, value] of cacheMap.entries()) {
        if (value.timestamp < oldestTime) {
            oldestTime = value.timestamp;
            oldestKey = key;
        }
    }
    
    if (oldestKey) {
        cacheMap.delete(oldestKey);
        metrics.evictions++;
    }
}
```

**Why 1000 entries?**
- Prevents unbounded memory growth
- Allows ~5-20MB per instance (depending on data size)
- Balances memory usage with cache effectiveness
- Total system: ~30-120MB for 6 instances

### Cache Entry Structure

```javascript
{
    data: any,           // The cached data
    timestamp: number,   // When cached (Date.now())
    size: number,        // Pre-calculated JSON size (bytes)
    hits: number,        // Individual entry hit counter
    duration: number     // TTL duration for this entry (ms)
}
```

**Per-Entry Duration:**
- Each entry stores its own TTL duration
- Enables accurate expiration during periodic cleanup
- Supports mixed durations in same cache instance

### Metrics Tracking

Each cache instance tracks:
```javascript
const metrics = {
    hits: 0,        // Cache hits (data found and valid)
    misses: 0,      // Cache misses (not found or expired)
    evictions: 0,   // LRU evictions due to maxSize
    clears: 0       // Manual cache clears (pattern or full)
};
```

**Hit Rate Calculation:**
```javascript
hitRate = hits / (hits + misses) * 100
```

**Target Hit Rates:**
- Static data (categories, settings): >90%
- Semi-static (products, collections): >80%
- Dynamic data (orders, users): >70%
- Real-time data (dashboard, analytics): >60%

### TTL Cleanup (Automatic)

Periodic cleanup runs every 5 minutes per instance:

```javascript
// Respects individual entry TTLs
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of cacheMap.entries()) {
        const entryDuration = value.duration || 24 * 60 * 60 * 1000;
        if (now - value.timestamp > entryDuration) {
            cacheMap.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`[${instanceName}] Cleaned ${cleaned} expired entries`);
    }
}, 5 * 60 * 1000); // 5 minutes
```

**Benefits:**
- Prevents stale data from accumulating
- Respects per-entry duration settings
- Automatic - no manual intervention needed
- Minimal performance impact (5min intervals)

### Cache Key Generation

```javascript
function generateCacheKey(prefix, params = {}) {
    // Sort params for consistent keys
    const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
            acc[key] = params[key];
            return acc;
        }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
}
```

**Examples:**
```javascript
generateCacheKey('products', { page: 1, limit: 10 })
// → "products:{"limit":10,"page":1}"

generateCacheKey('products', { limit: 10, page: 1 })
// → "products:{"limit":10,"page":1}" (same as above - sorted)

generateCacheKey('settings', {})
// → "settings:{}"

generateCacheKey('orders', { userId: '123', status: 'pending' })
// → "orders:{"status":"pending","userId":"123"}"
```

**Key Features:**
- Consistent: Same params always generate same key (sorted)
- Unique: Different params generate different keys
- Readable: Human-readable format for debugging
- Pattern-matchable: Prefix-based clearing works efficiently

---

## 📈 Performance Impact

### Expected Improvements

| Operation | Database Queries | Cache Hit Scenario |
|-----------|-----------------|-------------------|
| Dashboard Load | 8-12 queries | 1-2 queries (60-80% reduction) |
| Product Listings | 3-5 queries | 0-1 queries (80-100% reduction) |
| Category Pages | 2-4 queries | 0 queries (100% reduction) |
| Settings Access | 2 queries | 0 queries (100% reduction) |
| User Profile | 3-4 queries | 1 query (66-75% reduction) |

**Overall Impact:**
- **Database Load:** 60-80% reduction in total queries
- **Response Time:** 50-70% faster for cached endpoints
- **Server CPU:** 30-50% reduction in processing time
- **User Experience:** Near-instant page loads for cached data

### Memory Usage

**Per Instance:**
- Typical: ~5-10MB (with mixed data)
- Maximum: ~20MB (1000 large entries)
- Protected: LRU prevents unbounded growth

**Total System (6 instances):**
- Typical: ~30-60MB
- Maximum: ~120MB
- Overhead: Minimal compared to response time gains

**Memory Efficiency:**
- Pre-calculated entry sizes avoid runtime overhead
- JSON stringify done once (during setCacheData)
- Metrics stored as primitives (low overhead)

### Cache Hit Rates (Production Targets)

Based on data access patterns:

```
Site Settings:     >95% (very static)
Categories:        >90% (rarely change)
Products:          >80% (moderate updates)
Collections:       >85% (infrequent changes)
Orders (Admin):    >70% (dynamic but listable)
User Profiles:     >75% (moderate access)
Dashboard Stats:   >65% (real-time + cached)
```

### Cost Savings

**Estimated Savings (per 1000 requests):**

Without Cache:
- Database queries: 1000 × 4 (avg) = 4000 queries
- Average query time: 50ms
- Total time: 200,000ms (200 seconds)

With Cache (80% hit rate):
- Cache hits: 800 × 0.1ms = 80ms
- Database queries: 200 × 4 = 800 queries
- Database time: 800 × 50ms = 40,000ms
- Total time: 40,080ms (40 seconds)

**Result:** 80% faster, 80% fewer database operations

---

## 🚨 Troubleshooting

### Problem: Cache Not Clearing After Update

**Symptoms:**
- Users see old data after admin makes changes
- Database shows updated values but frontend shows stale data

**Solutions:**

1. **Check CRUD wrapper usage:**
```javascript
// ❌ Wrong - bypasses cache clearing
await DBService.update(id, data, 'catalog');

// ✅ Correct - uses wrapper with auto-clearing
const { updateWithCacheClear } = await cacheFunctions();
await updateWithCacheClear(id, data, 'catalog');
```

2. **Manual cache clearing:**
```javascript
const { clearCache } = await cacheFunctions();
await DBService.update(id, data, 'catalog');
await clearCache('catalog'); // Clear manually
```

3. **Check instance name:**
```javascript
// Make sure you're clearing the correct instance
await clearCache('catalog'); // ❌ Wrong instance name
await clearCache('store');   // ✅ Correct instance name
```

### Problem: Low Cache Hit Rate

**Symptoms:**
- Hit rate below 60% in statistics
- High miss count compared to hits

**Diagnostic:**
```javascript
const { getCacheStats } = await cacheFunctions();
const stats = await getCacheStats('store');
console.log('Hit Rate:', stats.metrics.hitRate);
console.log('Hits:', stats.metrics.hits);
console.log('Misses:', stats.metrics.misses);
console.log('Evictions:', stats.metrics.evictions);
```

**Solutions:**

1. **Cache durations too short:**
```javascript
// ❌ Too short - expires too quickly
await loadCacheData('products', { duration: "1M" });

// ✅ Better - reasonable duration
await loadCacheData('products', { duration: "15M" });
```

2. **Inconsistent cache keys:**
```javascript
// ❌ Different param order = different keys
await loadCacheData('products', { page: 1, limit: 10 });
await loadCacheData('products', { limit: 10, page: 1 });

// ✅ Sorted automatically - same key generated
// (generateCacheKey handles this internally)
```

3. **High evictions (maxSize reached):**
```javascript
// Check eviction count
if (stats.metrics.evictions > 100) {
    console.warn('High evictions - consider clearing less-used data');
}
```

### Problem: High Memory Usage

**Symptoms:**
- Server memory growing continuously
- Out of memory errors

**Diagnostic:**
```javascript
const { getCacheStats } = await cacheFunctions();
const allStats = await getCacheStats();

Object.entries(allStats).forEach(([name, stats]) => {
    console.log(`${name}: ${stats.totalEntries} entries, ${(stats.cacheSize / 1024 / 1024).toFixed(2)} MB`);
});
```

**Solutions:**

1. **Check for unbounded growth (shouldn't happen with LRU):**
```javascript
// Each instance is protected at 1000 entries max
// If you see instances with >1000 entries, report as bug
```

2. **Reduce cache durations:**
```javascript
// ❌ Too long - data stays in memory
await saveCacheData('heavy', params, data, { duration: "30D" });

// ✅ Better - expires sooner
await saveCacheData('heavy', params, data, { duration: "1H" });
```

3. **Manual cleanup:**
```javascript
const { clearAllCache } = await cacheFunctions();
await clearAllCache(); // Nuclear option - clears everything
```

### Problem: Stale Data on Frontend

**Symptoms:**
- Frontend shows old data even after cache clearing
- Admin sees updates but users don't

**Causes:**
- Frontend component caching (React cache)
- Browser caching
- Next.js page cache
- Wrong cache instance being cleared

**Solutions:**

1. **Ensure correct instance is cleared:**
```javascript
// Check which instance your data fetching uses
const { loadCacheData } = await initCache('store'); // Using 'store' instance

// Then clear that same instance after mutations
const { clearCache } = await cacheFunctions();
await clearCache('store'); // Must match the instance name
```

2. **Clear multiple related instances:**
```javascript
// If data affects multiple areas
await clearCache('store', 'catalog', 'categories');
```

3. **Force revalidation in Next.js:**
```javascript
import { revalidatePath } from 'next/cache';

export async function updateProduct(id, data) {
    const { updateWithCacheClear } = await cacheFunctions();
    await updateWithCacheClear(id, data, 'catalog');
    
    // Also revalidate Next.js cache
    revalidatePath('/products');
    revalidatePath('/');
}
```

### Problem: Cache Stats Not Updating

**Symptoms:**
- `getCacheStats()` returns old or zero metrics
- Hit rate always 0%

**Causes:**
- Cache instance not initialized
- Wrong instance name
- Metrics not being tracked

**Solutions:**

1. **Ensure instance is initialized:**
```javascript
// Initialize before getting stats
await initCache('store');

// Then get stats
const { getCacheStats } = await cacheFunctions();
const stats = await getCacheStats('store');
```

2. **Check all instances:**
```javascript
// Get stats for all initialized instances
const allStats = await getCacheStats();
console.log('Initialized instances:', Object.keys(allStats));
```

3. **Verify data fetching uses cache:**
```javascript
// ❌ Bypassing cache
const data = await DBService.readAll('products');

// ✅ Using cache
const { loadCacheData, saveCacheData } = await initCache('store');
const cached = await loadCacheData('products', params);
if (!cached) {
    const data = await DBService.readAll('products');
    await saveCacheData('products', params, data);
}
```

---

## 🎯 Best Practices

### 1. Choose Appropriate Cache Durations

```javascript
// ✅ Good - Static data gets longer cache
await saveCacheData('categories', {}, data, { duration: "3H" });

// ✅ Good - Dynamic data gets shorter cache
await saveCacheData('orders', {}, data, { duration: "5M" });

// ❌ Bad - Static data expires too quickly (wasted DB queries)
await saveCacheData('categories', {}, data, { duration: "1M" });

// ❌ Bad - Dynamic data cached too long (stale data)
await saveCacheData('orders', {}, data, { duration: "7D" });
```

### 2. Use Consistent Cache Keys

```javascript
// ✅ Good - Include all params that affect the result
const { loadCacheData } = await initCache('store');
await loadCacheData('products', { page, limit, category, search });

// ❌ Bad - Missing params leads to incorrect cache hits
await loadCacheData('products', { page }); // Ignores limit, category, search
```

### 3. Clear Related Caches Together

```javascript
// ✅ Good - Clear all affected instances
export async function updateCategory(id, data) {
    await DBService.update(id, data, 'categories');
    const { clearCache } = await cacheFunctions();
    await clearCache('store', 'catalog'); // Category affects catalog listings
}

// ❌ Bad - Only clears one instance, catalog still shows old category
export async function updateCategory(id, data) {
    const { updateWithCacheClear } = await cacheFunctions();
    await updateWithCacheClear(id, data, 'categories'); // Only clears 'categories'
}
```

### 4. Handle Cache Misses Gracefully

```javascript
// ✅ Good - Always have database fallback
const { loadCacheData, saveCacheData } = await initCache('store');
const cached = await loadCacheData('products', params);

if (cached) {
    return cached;
}

// Fallback to database
const data = await DBService.readAll('products');
await saveCacheData('products', params, data);
return data;

// ❌ Bad - No fallback when cache misses
const cached = await loadCacheData('products', params);
return cached; // Returns null on cache miss!
```

### 5. Monitor Cache Performance

```javascript
// ✅ Good - Regularly check hit rates
const { getCacheStats } = await cacheFunctions();

// Log stats in development
if (process.env.NODE_ENV === 'development') {
    const stats = await getCacheStats();
    console.table(Object.entries(stats).map(([name, s]) => ({
        instance: name,
        entries: s.totalEntries,
        hitRate: s.metrics.hitRate,
        evictions: s.metrics.evictions
    })));
}

// Alert on low hit rates in production
const stats = await getCacheStats('store');
const hitRate = parseFloat(stats.metrics.hitRate);
if (hitRate < 60) {
    console.warn(`Low cache hit rate for store: ${hitRate}%`);
}
```

### 6. Use CRUD Wrappers with Appropriate Cache Clearing

```javascript
// ✅ Good - Targeted cache clearing (best performance)
const { updateWithCacheClear } = await cacheFunctions();
export async function updateFavorite(id, data) {
    // Only clears 'favorites' key from 'store' instance
    return await updateWithCacheClear(id, data, 'favorites', ['store'], ['favorites']);
}

// ✅ Good - Clear entire instance when data affects multiple areas
export async function updateProduct(id, data) {
    // Clears entire 'store' instance (products, categories, collections, etc.)
    return await updateWithCacheClear(id, data, 'products', ['store']);
}

// ✅ Good - Clear multiple instances for cross-cutting changes
export async function updateCategory(id, data) {
    // Category affects both store and catalog data
    return await updateWithCacheClear(id, data, 'categories', ['store', 'catalog']);
}

// ⚠️ Acceptable - No cache clearing for temporary data
export async function createTempLog(data) {
    // Logs don't need caching
    return await createWithCacheClear(data, 'logs', []);
}

// ❌ Bad - Manual cache management (error-prone)
export async function updateProduct(id, data) {
    const result = await DBService.update(id, data, 'products');
    if (result?.success) {
        await clearCache('store'); // Easy to forget or misname instance
    }
    return result;
}
```

### 7. Separate Admin and Public Caches

```javascript
// ✅ Good - Different cache keys for admin vs public data
const cachePrefix = includeAdminData ? 'products_admin' : 'products';
const cached = await loadCacheData(cachePrefix, params);

// Ensures admin sees sensitive data, public doesn't
// Prevents cache pollution between admin and public views
```

### 8. Document Cache Behavior

```javascript
/**
 * Get product catalog with caching
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.duration - Cache duration key (default: "15M")
 * @returns {Promise<Object>} Cached or fresh product data
 * 
 * Cache: 'store' instance, prefix 'products'
 * Default duration: 15 minutes
 * Cleared by: updateProduct, deleteProduct, bulkUpdateProducts
 */
export async function getProducts(params = {}) {
    const { loadCacheData, saveCacheData } = await initCache('store');
    // ...
}
```

---

## 📚 API Reference

### Exported Functions

#### `initCache(instanceName)`

Initialize or get existing cache instance with utility functions.

**Parameters:**
- `instanceName` (string) - Name of the cache instance to create/get

**Returns:** `Promise<Object>`
```javascript
{
    loadCacheData: Function,  // Load cached data with TTL check
    saveCacheData: Function   // Save data to cache with duration
}
```

**Example:**
```javascript
const { loadCacheData, saveCacheData } = await initCache('settings');
```

---

#### `cacheFunctions()`

Get cache management functions for CRUD operations and statistics.

**Returns:** `Promise<Object>`
```javascript
{
    createWithCacheClear: Function,   // DBService.create + auto-clear
    updateWithCacheClear: Function,   // DBService.update + auto-clear
    deleteWithCacheClear: Function,   // DBService.delete + auto-clear
    clearCache: Function,             // Clear instance(s) completely
    clearCacheKeys: Function,         // Clear specific key patterns
    clearAllCache: Function,          // Clear all instances
    getCacheStats: Function           // Get cache statistics
}
```

**Example:**
```javascript
const { updateWithCacheClear, clearCache, getCacheStats } = await cacheFunctions();
```

---

### Cache Utility Functions

#### `loadCacheData(prefix, params)`

Load cached data if valid (within TTL).

**Parameters:**
- `prefix` (string) - Cache key prefix (e.g., 'products', 'categories')
- `params` (Object) - Optional parameters
  - `params.next.revalidate` (number) - Next.js revalidate time in seconds (priority 1)
  - `params.duration` (string) - Duration key: "0", "30S", "1M", "3M", "5M", "10M", "15M", "30M", "1H", "2H", "3H", "6H", "12H", "1D", "2D", "3D", "7D", "30D" (priority 2)
  - Other params used for cache key generation

**Returns:** `Promise<any|null>` - Cached data or null if not found/expired

**Duration Priority:**
1. `params.next.revalidate` (converted to ms)
2. `params.duration` (from CACHE_DURATIONS)
3. Default: "1D" (24 hours)

**Example:**
```javascript
// Next.js syntax
const data = await loadCacheData('products', { next: { revalidate: 180 } });

// Custom duration keys
const data = await loadCacheData('products', { duration: "30S" }); // 30 seconds
const data = await loadCacheData('products', { duration: "15M" }); // 15 minutes
const data = await loadCacheData('products', { duration: "1H" });  // 1 hour
const data = await loadCacheData('products', { duration: "7D" });  // 7 days

// With query params
const data = await loadCacheData('products', { page: 1, limit: 10, duration: "15M" });

// No caching (fetch fresh every time)
const data = await loadCacheData('realtime', { duration: "0" });
```

---

#### `saveCacheData(prefix, params, data)`

Save data to cache with TTL.

**Parameters:**
- `prefix` (string) - Cache key prefix
- `params` (Object) - Parameters (same as loadCacheData)
  - `params.next.revalidate` (number) - Next.js revalidate time in seconds (priority 1)
  - `params.duration` (string) - Duration key (priority 2)
- `data` (any) - Data to cache

**Returns:** `Promise<void>`

**Example:**
```javascript
// Various duration options
await saveCacheData('products', { duration: "30S" }, productsData); // 30 seconds
await saveCacheData('products', { duration: "15M" }, productsData); // 15 minutes
await saveCacheData('products', { duration: "1H" }, productsData);  // 1 hour
await saveCacheData('settings', { next: { revalidate: 300 } }, settingsData); // Next.js syntax

// No caching (duration: "0" effectively bypasses cache)
await saveCacheData('realtime', { duration: "0" }, data);
```

---

### CRUD Functions

#### `createWithCacheClear(data, collection, instances, keys)`

Create item in database with flexible cache clearing options.

**Parameters:**
- `data` (Object) - Item data to create
- `collection` (string) - Database collection name
- `instances` (string[]) - Array of cache instance names to clear (default: [])
- `keys` (string[]|null) - Optional array of cache key patterns to clear (default: null)

**Returns:** `Promise<Object>` - DBService result

**Cache Clearing Behavior:**
- If `keys` provided: Clears specific keys from each instance
- If `keys` is null/empty: Clears entire instance(s)
- If `instances` is empty: No cache clearing occurs

**Examples:**
```javascript
// Clear specific keys from instance
const result = await createWithCacheClear(
    { name: "New Product" }, 
    'products', 
    ['store'], 
    ['products', 'catalog']
);

// Clear entire instance
const result = await createWithCacheClear(
    { name: "New Product" }, 
    'products', 
    ['store']
);

// Clear multiple instances
const result = await createWithCacheClear(
    { name: "New Product" }, 
    'products', 
    ['store', 'catalog']
);

// No cache clearing (backwards compatible)
const result = await createWithCacheClear(
    { name: "New Product" }, 
    'products', 
    []
);
```

---

#### `updateWithCacheClear(id, data, collection, instances, keys)`

Update item in database with flexible cache clearing options.

**Parameters:**
- `id` (string) - Item ID
- `data` (Object) - Update data
- `collection` (string) - Database collection name
- `instances` (string[]) - Array of cache instance names to clear (default: [])
- `keys` (string[]|null) - Optional array of cache key patterns to clear (default: null)

**Returns:** `Promise<Object>` - DBService result

**Cache Clearing Behavior:**
- If `keys` provided: Clears specific keys from each instance
- If `keys` is null/empty: Clears entire instance(s)
- If `instances` is empty: No cache clearing occurs

**Examples:**
```javascript
// Clear specific keys from instance
const result = await updateWithCacheClear(
    'prod123', 
    { price: 29.99 }, 
    'products', 
    ['store'], 
    ['products', 'catalog']
);

// Clear entire instance
const result = await updateWithCacheClear(
    'prod123', 
    { price: 29.99 }, 
    'products', 
    ['store']
);

// Clear multiple instances
const result = await updateWithCacheClear(
    'prod123', 
    { price: 29.99 }, 
    'products', 
    ['store', 'catalog']
);
```

---

#### `deleteWithCacheClear(id, collection, instances, keys)`

Delete item from database with flexible cache clearing options.

**Parameters:**
- `id` (string) - Item ID
- `collection` (string) - Database collection name
- `instances` (string[]) - Array of cache instance names to clear (default: [])
- `keys` (string[]|null) - Optional array of cache key patterns to clear (default: null)

**Returns:** `Promise<Object>` - DBService result

**Cache Clearing Behavior:**
- If `keys` provided: Clears specific keys from each instance
- If `keys` is null/empty: Clears entire instance(s)
- If `instances` is empty: No cache clearing occurs
- Includes fallback: Attempts getItemKey if first delete fails

**Examples:**
```javascript
// Clear specific keys from instance
const result = await deleteWithCacheClear(
    'prod123', 
    'products', 
    ['store'], 
    ['products', 'catalog']
);

// Clear entire instance
const result = await deleteWithCacheClear(
    'prod123', 
    'products', 
    ['store']
);

// Clear multiple instances
const result = await deleteWithCacheClear(
    'prod123', 
    'products', 
    ['store', 'catalog']
);
```

---

### Cache Management Functions

#### `clearCache(...instanceNames)`

Clear ALL cache entries from specified instance(s).

**Parameters:**
- `...instanceNames` (string[]) - One or more instance names

**Returns:** `Promise<number>` - Total entries cleared

**Example:**
```javascript
await clearCache('store');                  // Clear one instance
await clearCache('store', 'catalog');       // Clear multiple
```

---

#### `clearCacheKeys(instanceName, ...keys)`

Clear specific key patterns from an instance.

**Parameters:**
- `instanceName` (string) - Instance name
- `...keys` (string[] | string) - Key prefix(es) to clear

**Returns:** `Promise<number>` - Total entries cleared

**Example:**
```javascript
await clearCacheKeys('store', 'products');              // Clear 'products:*'
await clearCacheKeys('store', 'products', 'categories'); // Clear multiple
await clearCacheKeys('store', ['products', 'categories']); // Array syntax
```

---

#### `clearAllCache()`

Clear ALL cache entries from ALL instances.

**Returns:** `Promise<Object>`
```javascript
{
    success: boolean,
    cleared: number,        // Total entries cleared
    details: Object         // Per-instance counts
}
```

**Example:**
```javascript
const result = await clearAllCache();
console.log(`Cleared ${result.cleared} entries`);
console.log(result.details); // { store: 20, orders: 15, ... }
```

---

#### `getCacheStats(...instanceNames)`

Get statistics for cache instance(s).

**Parameters:**
- `...instanceNames` (string[]) - Instance name(s), or none for all

**Returns:** `Promise<Object|Array>`

**Single instance:**
```javascript
{
    name: string,
    totalEntries: number,
    cacheSize: number,      // Total bytes
    metrics: {
        hits: number,
        misses: number,
        hitRate: string,    // Percentage
        evictions: number,
        clears: number
    },
    entries: Array         // Individual entry details
}
```

**Multiple instances:**
Returns object with stats for each instance.

**Example:**
```javascript
// One instance
const stats = await getCacheStats('store');

// Multiple instances
const stats = await getCacheStats('store', 'orders');
// Returns: { store: {...}, orders: {...} }

// All instances
const allStats = await getCacheStats();
```

---

## 📖 Complete Usage Example

Here's a complete example showing typical cache usage in a real module:

```javascript
// @/lib/server/store.js
'use server';

import { initCache, cacheFunctions } from '@/lib/shared/cache.js';
import DBService from '@/data/rest.db.js';

// Initialize cache instance for store operations
const { loadCacheData, saveCacheData } = await initCache('store');

// Get CRUD functions for admin operations
const { updateWithCacheClear, clearCache, getCacheStats } = await cacheFunctions();

/**
 * Get product catalog with caching
 * Caches for 15 minutes by default
 */
export async function getProducts(params = {}) {
    // Set default duration if not provided
    const cacheParams = { duration: "15M", ...params };
    
    // Try cache first
    const cached = await loadCacheData('products', cacheParams);
    if (cached) return cached;
    
    // Cache miss - fetch from database
    const data = await DBService.readAll('catalog');
    
    // Filter and process
    const products = data.filter(item => item.enabled && item.stock > 0);
    const result = { success: true, data: products, count: products.length };
    
    // Save to cache
    await saveCacheData('products', cacheParams, result);
    
    return result;
}

/**
 * Get categories with longer cache (1 hour)
 * Categories change infrequently
 */
export async function getCategories() {
    const cached = await loadCacheData('categories', { duration: "1H" });
    if (cached) return cached;
    
    const data = await DBService.readAll('categories');
    const result = { success: true, data };
    
    await saveCacheData('categories', { duration: "1H" }, result);
    return result;
}

/**
 * Update product (admin operation)
 * Automatically clears cache
 */
export async function updateProduct(id, data) {
    const result = await updateWithCacheClear(id, data, 'store');
    
    // If category changed, also clear categories cache
    if (data.categoryId) {
        await clearCache('categories');
    }
    
    return { success: !!result, data: result };
}

/**
 * Bulk update products
 * Manual cache clearing after all updates
 */
export async function bulkUpdateProducts(updates) {
    const results = [];
    
    for (const update of updates) {
        const result = await DBService.update(update.id, update.data, 'catalog');
        results.push(result);
    }
    
    // Clear cache once after all updates
    await clearCache('store');
    
    return { success: true, updated: results.length };
}

/**
 * Get cache statistics (for admin dashboard)
 */
export async function getStoreCacheStats() {
    const stats = await getCacheStats('store');
    
    return {
        instance: stats.name,
        entries: stats.totalEntries,
        size: `${(stats.cacheSize / 1024 / 1024).toFixed(2)} MB`,
        hitRate: stats.metrics.hitRate,
        hits: stats.metrics.hits,
        misses: stats.metrics.misses,
        evictions: stats.metrics.evictions
    };
}
```

---

**Version:** 4.0.0  
**Last Updated:** December 20, 2025  
**File:** `@/lib/shared/cache.js`

---

## Summary of Changes in v4.0

**Major Updates:**
- ✅ Removed pre-configured cache instances (adminCache, storeCache, etc.)
- ✅ Dynamic instance creation via `initCache(name)`
- ✅ Added 18 duration options: "0" (no cache), "30S" (30 seconds), "1M" through "30D"
- ✅ Simplified API: Only 2 exported functions (`initCache`, `cacheFunctions`)
- ✅ Enhanced cache clearing: `clearCache()`, `clearCacheKeys()`, `clearAllCache()`
- ✅ Improved statistics: `getCacheStats()` supports multiple instances
- ✅ Better documentation with practical examples and troubleshooting
- ✅ Per-entry TTL storage for accurate cleanup
- ✅ Duration priority chain: Next.js revalidate → custom duration → default 1D

**Breaking Changes:**
- Cache instances no longer exported directly (use `initCache` instead)
- `clearCache(collection)` changed to `clearCache(...instanceNames)` - clears entire instances
- Statistics must be retrieved via `getCacheStats()` from `cacheFunctions()`

**Migration Guide:**
```javascript
// Old (v3.0)
import { storeCache } from '@/lib/shared/cache.js';
const { getCachedData, setCacheData } = storeCache;

// New (v4.0)
import { initCache } from '@/lib/shared/cache.js';
const { loadCacheData, saveCacheData } = await initCache('store');
```
