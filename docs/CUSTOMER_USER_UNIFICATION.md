# Customer-User Data Unification

## Overview
This document describes the architectural change that consolidates customer and user data into a single unified system, eliminating data duplication and simplifying the codebase.

## Changes Made

### 1. Database Architecture
**Before:**
- Separate `customers` table for order customer data
- Separate `users` table for authenticated users
- Redundant data synchronization between both tables

**After:**
- Single `users` table for all customer and user data
- Users created from orders have empty `password` and `salt` fields
- Customer data filtered from `users` table based on order history

### 2. Core Functions Modified

#### users.js (`@/lib/server/users.js`)
**Added Functions:**
- `createUserFromCustomer(customerData)` - Creates or updates user from order customer data
  - Checks if user exists by email
  - Creates new user with empty password/salt if not exists
  - Updates existing user with new information if exists
  - Returns `{ success, action: 'created'|'existing', data }`

- `createUser(userData)` - Admin function to create new user
  - Validates email uniqueness
  - Handles password encryption if provided
  - Sets default preferences and club data
  - Returns `{ success, data, message }`

- `updateUser(userKey, userData)` - Admin function to update user
  - Handles password encryption if updated
  - Adds updated timestamp
  - Clears user cache
  - Returns `{ success, data, message }`

- `deleteUser(userKey)` - Admin function to delete user
  - Removes user from database
  - Clears user cache
  - Returns `{ success, message }`

#### orders.js (`@/lib/server/orders.js`)
**Modified Functions:**
- `createOrUpdateCustomerFromOrder(orderCustomerData)`
  - **Before:** Used `createCustomer`/`updateCustomer` from admin.js, synced to both tables
  - **After:** Uses `createUserFromCustomer` from users.js
  - Simplified from ~150 lines to ~25 lines
  - Removed import of `createCustomer`, `updateCustomer` from admin.js
  - Added import of `createUserFromCustomer` from users.js

#### store.js (`@/lib/server/store.js`)
**Modified Functions:**
- `getCustomers(params)`
  - **Before:** Read from `customers` table, fetched user preferences separately
  - **After:** 
    - Gets all orders via `getAllOrders({ limit: 0 })`
    - Extracts unique customer emails from orders
    - Calculates order statistics per email (count, total spent, last order date)
    - Fetches user data for each email via `getUser`
    - Returns users with order statistics merged
  - **Benefits:**
    - Single source of truth (users table)
    - Automatic deduplication (multiple orders = 1 customer)
    - Rich data (order stats + user preferences)

### 3. Admin Interface Updates

#### customers/page.jsx (`@/app/(backend)/admin/store/customers/page.jsx`)
**Updated:**
- Imports changed from `admin.js` to `users.js`
  - `createCustomer` → `createUser`
  - `updateCustomer` → `updateUser`
  - `deleteCustomer` → `deleteUser`

- Form structure simplified:
  - **Before:** firstName, lastName, email, phone, address fields (11 fields)
  - **After:** displayName, email, phone, preferences (4 fields)
  - Added notification preferences UI with checkboxes:
    - Email Notifications
    - Order Updates
    - Marketing Emails
    - Newsletter
    - SMS Notifications

- Table columns updated:
  - **Removed:** Address column (3 lines: street, city/state, country)
  - **Added:** Orders column (showing order count and total spent)
  - **Kept:** Customer name/email, phone, communication preferences

### 4. Data Migration Notes

**No data migration required** if:
- You're starting fresh or have minimal customer data
- Existing order customer emails match user emails

**Migration needed** if:
- You have existing customers in `customers` table that aren't in `users`
- Solution: Run a script to create users from existing customers using `createUserFromCustomer`

## Benefits

1. **Eliminated Data Duplication**
   - No more syncing between customers and users tables
   - Single source of truth for customer/user data

2. **Simplified Codebase**
   - Removed ~150 lines of redundant code
   - Clearer data flow and logic
   - Easier to maintain and debug

3. **Better Data Consistency**
   - Order statistics automatically calculated
   - No sync issues between tables
   - User preferences always up-to-date

4. **Improved Performance**
   - Fewer database writes during order creation
   - More efficient customer listing (direct user lookup)
   - Automatic cache management

5. **Enhanced Features**
   - Order statistics in customer list (count, total spent)
   - Notification preferences in admin UI
   - Support for customer-only accounts (empty password)

## Usage Examples

### Creating User from Order (Automatic)
```javascript
// In checkout process
const customerData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+351912345678'
};

// Automatically creates/updates user
const result = await createOrUpdateCustomerFromOrder(customerData);
// result.action = 'created' or 'existing'
```

### Getting Customers (Admin)
```javascript
// Returns only users who have orders
const customers = await getCustomers({ page: 1, limit: 10 });
// Each customer includes:
// - User data (email, displayName, phone, preferences)
// - Order stats (orderCount, totalSpent, lastOrderDate)
```

### Manual User Creation (Admin)
```javascript
const userData = {
    email: 'new@example.com',
    displayName: 'New Customer',
    phone: '+351912345678',
    password: '', // Empty for customer-only accounts
    preferences: {
        emailNotifications: true,
        orderUpdates: true,
        marketingEmails: false,
        newsletter: false,
        smsNotifications: false
    }
};

const result = await createUser(userData);
```

## Testing Checklist

- [ ] Place new order → User created automatically
- [ ] Place order with existing email → User updated, not duplicated
- [ ] View customers in admin → Shows users with orders only
- [ ] Customer order statistics displayed correctly
- [ ] Edit customer → Updates user data
- [ ] Delete customer → Removes user
- [ ] Notification preferences saved correctly
- [ ] No errors in console
- [ ] Cache clears properly after CRUD operations

## Files Modified

1. `src/lib/server/users.js` - Added 4 functions (createUserFromCustomer, createUser, updateUser, deleteUser)
2. `src/lib/server/orders.js` - Simplified createOrUpdateCustomerFromOrder
3. `src/lib/server/store.js` - Rewrote getCustomers to use users + orders
4. `src/app/(backend)/admin/store/customers/page.jsx` - Updated UI and imports

## Breaking Changes

None. The changes are backward compatible as long as:
- Order customer emails are valid
- `getCustomers` returns similar data structure (with added order stats)
- Admin customers page works with new simplified form

## Future Improvements

1. **Migration Script**: Create script to migrate existing customers to users
2. **Customer Types**: Add flag to differentiate guest vs registered customers
3. **Address History**: Store multiple addresses per user
4. **Order History View**: Add direct link from customer to their orders
5. **Bulk Operations**: Support bulk user creation/updates

## Support

If you encounter issues:
1. Check console for errors
2. Verify user creation with `console.log` in `createUserFromCustomer`
3. Check cache is clearing properly after mutations
4. Ensure order customer emails are valid

## Related Documentation

- [Cache System](./CACHE_SYSTEM.md)
- [User Account System](./USER_ACCOUNT_SYSTEM.md)
- [Orders Management](./AUTOMATIC_CACHE_CLEARING.md)
