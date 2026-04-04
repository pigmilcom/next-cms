# Setup System Architecture

## Overview
The setup system has been refactored to follow Next.js 16 and React 19 best practices with proper server/client component separation and integration with backend-data.js functions.

## File Structure

### Server Components
- **`@/app/setup/page.jsx`** (Server Component)
  - Uses `getAllUsers()` and `getAllRoles()` from backend-data.js
  - Uses `getSettings()` from settings.js
  - Checks setup status server-side
  - Validates all required collections (site_settings, store_settings, roles, users)
  - Fetches data from `/setup/init` route
  - Redirects to home if all data exists
  - Passes comprehensive status to client component

- **`@/app/setup/layout.jsx`** (Server Component)
  - Wraps setup pages with providers
  - Loads locale and messages
  - Fetches site settings
  - Handles theme and translations

- **`@/app/setup/init/route.js`** (API Route)
  - **Fixed**: Removed incorrect `'use server'` directive
  - Checks if all required data already exists (site_settings, store_settings, roles, users)
  - Validates environment variables
  - Initializes database tables only if needed
  - Creates default settings (site_settings, store_settings, roles)
  - Tests database connections
  - Returns enhanced status with existing collections info
  - Prevents duplicate initialization

### Client Components
- **`@/app/setup/page.client.jsx`** (Client Component)
  - Renders UI based on setup status
  - Shows "Setup Already Completed" message when all data exists
  - Displays manual deletion instructions for deployed apps
  - Handles first user registration form
  - Shows setup completion messages
  - Manages form state and validation
  - Displays security warnings

## Data Flow

1. **Server Component** (`page.jsx`):
   - Checks if setup directory exists (filesystem)
   - Fetches setup data from `/setup/init` (GET request)
   - Uses `getAllUsers()` from backend-data.js to check users
   - Uses `getAllRoles()` from backend-data.js to check roles
   - Uses `getSettings()` from settings.js to check site/store settings
   - Determines if all required data exists
   - Calculates comprehensive setup state

2. **Client Component** (`page.client.jsx`):
   - Receives props from server component
   - Renders appropriate UI based on:
     - `allDataExists`: Show "already complete" message with deletion instructions
     - `needsFirstUser`: Show registration form
     - `setupComplete`: Show completion message
     - `showSetupDirWarning`: Show security warning

3. **API Route** (`init/route.js`):
   - First checks if all data already exists in database
   - Validates environment variables:
     - Database URL (POSTGRES_URL or REDIS_URL)
     - Blob storage token
     - Secret key
   - Initializes database only if data doesn't exist:
     - Creates site_settings
     - Creates store_settings
     - Creates default roles (admin, user)
   - Returns detailed status with existing collections

## Setup States

1. **All Data Already Exists**
   - Site settings, store settings, roles, and users exist
   - Shows blue "Setup Already Completed" card
   - Lists existing collections
   - Provides manual deletion instructions for production
   - Shows commands for local and deployed environments

2. **Database Initialization**
   - Environment variables validated
   - Database tables created
   - Default data inserted

3. **First User Creation**
   - Registration form displayed
   - Admin user created via NextAuth
   - Redirects to `/admin` on success

4. **Setup Complete**
   - Database initialized
   - First user exists
   - Shows green completion message

5. **Security Warning**
   - Setup complete but directory still exists
   - Prompts user to delete `/src/app/setup`

## Key Features

### Server-Side Operations
- ✅ Uses backend-data.js functions (`getAllUsers`, `getAllRoles`)
- ✅ Uses settings.js functions (`getSettings`)
- ✅ Database connection checks
- ✅ All required collections validation (site_settings, store_settings, roles, users)
- ✅ Setup directory detection
- ✅ Environment variable validation
- ✅ Default data initialization
- ✅ Prevents duplicate data creation

### Client-Side Operations
- ✅ Interactive registration form
- ✅ "Setup Already Completed" message for existing data
- ✅ Manual deletion instructions for production deployments
- ✅ Password validation (min 8 chars)
- ✅ Password confirmation matching
- ✅ Show/hide password toggle
- ✅ Form submission handling
- ✅ NextAuth integration

## Security Considerations

1. **Environment Validation**: Checks for required environment variables
2. **Database Initialization**: Prevents duplicate initialization with status checks
3. **Setup Directory**: Warns users to delete setup directory after completion
4. **First User**: Creates admin user with proper role assignment
5. **Server-Side Checks**: All sensitive operations happen server-side
6. **Production Safety**: Provides manual deletion instructions for deployed apps

## Integration with Backend System

### Functions Used from `@/lib/server/backend-data.js`:
- `getAllUsers(params)` - Checks if users exist, returns paginated data
- `getAllRoles(options)` - Validates roles exist in database

### Functions Used from `@/lib/server/settings.js`:
- `getSettings()` - Fetches cached site_settings and store_settings

### Benefits:
- ✅ **Consistent API**: Uses same functions as admin panel
- ✅ **Caching**: Leverages existing cache system
- ✅ **Error Handling**: Inherits robust error handling from backend-data.js
- ✅ **Type Safety**: Uses standardized response format
- ✅ **Maintenance**: Single source of truth for data operations

## Default Data Created

### Site Settings
- Site name, email, phone
- OAuth providers configuration
- Email provider settings
- Web3 settings (optional)
- Analytics settings

### Store Settings
- Business information
- VAT configuration
- Payment methods (Stripe, Bank Transfer, COD)
- Shipping settings
- Currency and pricing

### Roles
- **Admin**: Full access with `*` permissions
- **User**: Basic access with limited permissions

## Migration Benefits

### Before
- ❌ All logic in client component
- ❌ Multiple useEffect calls
- ❌ Loading states everywhere
- ❌ Fetch calls from browser
- ❌ Less secure
- ❌ Used DBService directly
- ❌ No check for existing data

### After
- ✅ Server-side data fetching
- ✅ Uses backend-data.js and settings.js functions
- ✅ Cleaner component separation
- ✅ Better performance (less client JS)
- ✅ More secure (sensitive checks server-side)
- ✅ Follows Next.js 16 and React 19 patterns
- ✅ Checks all required collections
- ✅ Handles already-complete scenario
- ✅ Production deployment friendly

## Usage

1. **First Deployment**:
   - Visit `/setup`
   - Database initializes automatically (if not exists)
   - Create first admin user
   - Delete setup directory

2. **Already Deployed with Data**:
   - Visit `/setup`
   - Shows "Setup Already Completed" message
   - Lists existing collections
   - Provides deletion instructions for production

3. **Subsequent Visits**:
   - Redirects to home if all data exists
   - Shows warning if directory still exists

## API Endpoints

### GET /setup/init
Returns setup status and initializes database if needed.

**Response:**
```json
{
  "setupComplete": true,
  "allDataExists": true,
  "existingCollections": ["site_settings", "store_settings", "roles", "users"],
  "setupPercentage": 100,
  "totalVariables": 3,
  "configuredVariables": 3,
  "status": {
    "present": ["POSTGRES_URL", "BLOB_READ_WRITE_TOKEN", "NEXT_SECRET_KEY"],
    "missing": [],
    "empty": []
  },
  "connectionTests": {
    "database": "URL format valid",
    "blob": "Token format appears valid"
  },
  "databaseInitialization": {
    "success": true,
    "tablesCreated": [],
    "message": "Database already initialized with default data"
  },
  "message": "Setup already completed. All required data exists in database."
}
```

## Notes

- Setup system uses backend-data.js server functions
- Uses settings.js for site/store settings
- All database operations use `DBService` abstraction
- Supports both PostgreSQL and Redis
- Compatible with Vercel Blob storage
- Uses NextAuth v5 for user creation
- Follows platform caching patterns
- **Next.js 16 and React 19 compatible**
- **Production deployment friendly** with manual deletion instructions
