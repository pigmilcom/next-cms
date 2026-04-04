# API Endpoints System Restructuring

## Overview
Restructured the API endpoints and API keys management system to follow the project's architecture patterns. Created a dedicated `endpoints.js` server module and updated all related components to use proper database abstraction and caching.

## Changes Made

### 1. Created New Server Module: `lib/server/endpoints.js`
**Purpose**: Centralized server-side API key and endpoints management functions.

**Key Features**:
- Follows same flow, structure, and logic as other `lib/server/*.js` functions
- Uses `initCache('endpoints')` for dedicated cache instance
- Implements proper CRUD operations with automatic cache clearing
- Integrates with `database.js` for database collection discovery
- Supports API key permissions validation (`READ`, `WRITE`, `DELETE`, `UPLOAD`)

**Functions Exported**:

**API Keys Management**:
- `getAllAPIKeys(params)` - Get all API keys with filtering and caching
- `getAPIKeyByString(apiKeyString)` - Validate API key (checks active status and expiration)
- `createAPIKey(apiKeyData)` - Generate new API key with secure random string
- `updateAPIKey(keyId, apiKeyData)` - Update API key metadata (cannot change key itself)
- `deleteAPIKey(keyId)` - Delete API key
- `incrementAPIKeyUsage(apiKeyString)` - Track API key usage
- `hasPermission(apiKey, permission)` - Check if API key has required permission

**API Settings Management**:
- `getAPISettings(params)` - Get API settings with defaults
- `updateAPISettings(settingsData)` - Update or create API settings

**Endpoints Management**:
- `getDatabaseCollections(params)` - Get all database tables/collections (uses `getDatabaseInfo` from `database.js`)
- `getAllEndpoints(params)` - Get both default and custom endpoints
- `getEndpointById(endpointId)` - Get specific endpoint details
- `createCustomEndpoint(endpointData)` - Create custom endpoint for specific collection
- `updateCustomEndpoint(endpointId, endpointData)` - Update custom endpoint (default endpoints cannot be modified)
- `deleteCustomEndpoint(endpointId)` - Delete custom endpoint (default endpoints cannot be deleted)
- `incrementEndpointUsage(endpointId)` - Track endpoint usage

**Default Endpoints** (Built-in):
- `GET /api/query/[slug]` - Read from any collection (requires READ permission)
- `POST /api/query/[slug]` - Create in any collection (requires WRITE permission)
- `PUT /api/query/[slug]` - Update in any collection (requires WRITE permission)
- `DELETE /api/query/[slug]` - Delete from any collection (requires DELETE permission)
- `POST /api/upload` - Upload files (requires UPLOAD permission)

**Custom Endpoints**:
- Stored in `custom_endpoints` table (was `endpoints`)
- Auto-generates path based on collection name: `/api/query/{collection}`
- Always requires API key authentication
- Supports same CRUD operations as default endpoints

### 2. Updated `lib/server/admin.js`
**Changes**:
- Replaced all API key and endpoint functions with deprecated wrappers
- All wrappers now import and call functions from `endpoints.js`
- Added `@deprecated` JSDoc tags directing developers to use `endpoints.js`
- Maintains backward compatibility for existing code
- Cleaned up duplicate implementations

**Deprecated Functions** (now wrappers):
```javascript
// Example wrapper pattern
export async function getAllAPIKeys(params = {}) {
    const { getAllAPIKeys: endpointsGetAllAPIKeys } = await import('@/lib/server/endpoints.js');
    return await endpointsGetAllAPIKeys(params);
}
```

### 3. Updated Admin Endpoints Page
**File**: `app/(backend)/admin/developer/endpoints/page.jsx`

**Changes**:
- Updated imports to use `endpoints.js` instead of `admin.js`
- Added import for `getDatabaseCollections` for future custom endpoint creation
- Replaced manual API settings fetch with `getAPISettings()` server function
- Simplified `fetchData()` function to use server functions properly
- Updated `handleUpdateApiSettings()` to use `updateAPISettings()` server function
- Removed `getDefaultEndpoints()` client function (now handled by server)
- Removed `createDefaultApiSettings()` function (handled by `getAPISettings()`)

**Before**:
```javascript
const [apiKeysResponse, apiSettingsResponse] = await Promise.all([
    getAllAPIKeys(),
    dbReadAll('api_settings')
]);
```

**After**:
```javascript
const [endpointsResponse, apiKeysResponse, apiSettingsResponse] = await Promise.all([
    getAllEndpoints(),
    getAllAPIKeys(),
    getAPISettings()
]);
```

### 4. Updated Create API Key Page
**File**: `app/(backend)/admin/developer/endpoints/new-key/page.jsx`

**Changes**:
- Updated import to use `createAPIKey` from `endpoints.js` instead of `admin.js`

### 5. Database Table Changes
**Table Rename**: `endpoints` → `custom_endpoints`
- Separates default (built-in) endpoints from user-created custom endpoints
- Default endpoints are generated in-memory (not stored in database)
- Custom endpoints are stored in `custom_endpoints` table
- This prevents accidental modification/deletion of built-in endpoints

**Fields for Custom Endpoints**:
- `id` - Unique identifier
- `method` - HTTP method (GET, POST, PUT, DELETE)
- `path` - API path (auto-generated: `/api/query/{collection}`)
- `collection` - Target database collection
- `description` - Endpoint description
- `status` - active/inactive
- `authentication` - Always 'apikey' for custom endpoints
- `rateLimit` - Request limit per window
- `rateLimitWindow` - Time window in milliseconds
- `usage` - Usage counter
- `responseFormat` - JSON
- `parameters` - Parameter documentation
- `example` - Response example
- `permissions` - Array of required permissions
- `isDefault` - false (true only for built-in endpoints)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Architecture Benefits

### 1. Consistency
- Follows same pattern as `database.js`, `settings.js`, `store.js`, etc.
- Uses same cache initialization pattern
- Implements same CRUD helper pattern (createWithCacheClear, updateWithCacheClear, deleteWithCacheClear)

### 2. Separation of Concerns
- API key management separated from general admin functions
- Endpoints management in dedicated module
- Database abstraction maintained (works with PostgreSQL, Redis, Firebase)

### 3. Caching Strategy
- Dedicated `endpoints` cache instance
- Automatic cache clearing on mutations
- Supports cache duration overrides (30S, 1M, 5M, 15M, 1H, 1D, etc.)
- Example: `getAllAPIKeys({ duration: '15M' })` for 15-minute cache

### 4. Database Integration
- Uses `getDatabaseInfo()` from `database.js` to discover collections
- Ensures custom endpoints always reference valid collections
- Same method used by database admin page (consistency)

### 5. Security
- API key permission validation (`hasPermission()`)
- API key expiration checks
- API key status checks (active/revoked)
- Protected API key values (only show preview after creation)
- Prevents modification/deletion of default endpoints

### 6. Maintainability
- Single source of truth for endpoints logic
- Backward compatible through deprecated wrappers in `admin.js`
- Clear deprecation path for existing code
- Self-documenting with JSDoc

## Migration Path

### For Existing Code
**No immediate action required** - all existing imports from `admin.js` will continue to work through deprecated wrappers.

### For New Code
Use direct imports from `endpoints.js`:
```javascript
import {
    getAllAPIKeys,
    createAPIKey,
    getAllEndpoints,
    getDatabaseCollections
} from '@/lib/server/endpoints.js';
```

### Future Enhancements
1. **Custom Endpoint Creation UI** - Allow admins to create custom endpoints for specific collections through the UI
2. **Endpoint Analytics** - Track usage, response times, error rates per endpoint
3. **Rate Limiting Implementation** - Enforce rate limits configured per endpoint/API key
4. **Webhook Integration** - Trigger webhooks when certain endpoints are called
5. **GraphQL Support** - Add GraphQL endpoint generator for complex queries

## Testing Checklist

- [x] Admin endpoints page loads correctly
- [x] API keys display with proper data
- [x] Default endpoints show in endpoints list
- [x] Create new API key works  
- [x] Update API settings works
- [x] All imports resolved correctly
- [x] No compilation errors
- [x] Backward compatibility maintained (admin.js wrappers)
- [x] Cache clearing works on mutations
- [ ] Custom endpoint creation (feature not implemented yet)
- [ ] API key permission validation in actual API routes
- [ ] Rate limiting enforcement

## Files Modified

1. **Created**: `src/lib/server/endpoints.js` (new file, 801 lines)
2. **Modified**: `src/lib/server/admin.js` (replaced implementations with wrappers)
3. **Modified**: `src/app/(backend)/admin/developer/endpoints/page.jsx` (updated imports and logic)
4. **Modified**: `src/app/(backend)/admin/developer/endpoints/new-key/page.jsx` (updated import)

## Related Documentation

- [Database System](./database.js) - Database abstraction layer
- [Cache System](./CACHE_SYSTEM.md) - Centralized caching
- [API Access Control](./API_ACCESS_CONTROL.md) - API authentication and authorization

## Notes

- Default endpoints use `collection: 'any'` to indicate they work with any collection via the `[slug]` parameter
- Custom endpoints are collection-specific and don't use `[slug]` parameter
- API key authentication is enforced for all custom endpoints (no public access)
- Database table should be migrated: `endpoints` → `custom_endpoints` (or accept both names for compatibility)
