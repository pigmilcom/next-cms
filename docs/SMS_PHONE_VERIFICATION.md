# SMS Phone Number Verification System

## Overview

Implemented a comprehensive phone number verification system for SMS notifications in the admin orders page. When sending SMS notifications for order status updates, the system now:

1. **Validates phone numbers** against user account data
2. **Provides selection UI** when multiple phones are available
3. **Allows manual input** for confirmation or when no data exists
4. **Uses verified phone** for SMS delivery

## Features

### 1. Automatic User Phone Lookup

When the "Send SMS notification" checkbox is enabled, the system automatically:
- Fetches user data using `getUser(customerEmail)` from `@/lib/server/users`
- Retrieves the user's registered phone number
- Compares it with the phone number stored in the order

### 2. Smart Phone Selection UI

The system displays different UI based on the comparison:

#### **Scenario A: Different Phone Numbers**
- Shows a selector with 3 options:
  - **Order Phone**: Phone number from the order data
  - **User Account Phone**: Phone number from user's account (with display name)
  - **Enter Manually**: Custom phone number input field

#### **Scenario B: Same Phone or No User Data**
- Shows a confirmation input field
- Pre-filled with the order phone number
- Allows admin to verify or modify before sending

#### **Loading State**
- Displays "Verifying phone number..." with loading spinner
- Prevents premature form submission

### 3. Validated SMS Sending

When SMS is sent:
- Uses the verified/selected phone number (`editStatusData.smsPhone`)
- Falls back to order phone if none selected
- Shows warning if no phone number is available
- Validates phone number exists before attempting to send

## Implementation Details

### State Management

New state variables added to orders page:

```javascript
const [editStatusData, setEditStatusData] = useState({
    status: '',
    tracking: '',
    sendEmail: true,
    sendSms: false,
    smsPhone: '',           // Phone number to use for SMS
    smsPhoneSource: 'order'  // Source: 'order', 'user', or 'manual'
});

const [userPhoneData, setUserPhoneData] = useState(null); // User phone from getUser
const [showPhoneSelector, setShowPhoneSelector] = useState(false); // Show selector UI
const [isLoadingUserPhone, setIsLoadingUserPhone] = useState(false); // Loading state
```

### Phone Fetching Function

```javascript
const fetchUserPhoneForSMS = async (customerEmail, orderPhone) => {
    if (!customerEmail) return null;
    
    setIsLoadingUserPhone(true);
    try {
        const { getUser } = await import('@/lib/server/users');
        const userResult = await getUser({ email: customerEmail });
        
        if (userResult?.success && userResult.data) {
            return {
                phone: userResult.data.phone || null,
                displayName: userResult.data.displayName || null
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching user phone:', error);
        return null;
    } finally {
        setIsLoadingUserPhone(false);
    }
};
```

### SMS Sending Logic

```javascript
// Send SMS notification if requested
if (editStatusData.sendSms) {
    // Use verified phone from UI selection/input
    const smsPhone = editStatusData.smsPhone || selectedOrder.customer?.phone;
    
    if (!smsPhone) {
        toast.warning('Order status updated but SMS notification skipped: No phone number provided');
    } else {
        const smsOrderData = {
            id: selectedOrder.id,
            status: editStatusData.status,
            trackingNumber: editStatusData.tracking.trim() || selectedOrder.trackingNumber || null,
            customer: {
                firstName: selectedOrder.customer?.firstName || 'Customer',
                phone: smsPhone  // Uses verified phone
            }
        };
        
        const smsResult = await sendOrderStatusSMS(smsOrderData, baseUrl);
    }
}
```

## UI Component Structure

### Checkbox with Auto-Fetch

```jsx
<Checkbox
    id="sendSmsUpdate"
    checked={editStatusData.sendSms}
    onCheckedChange={async (checked) => {
        setEditStatusData({
            ...editStatusData,
            sendSms: checked
        });
        
        // Fetch user phone when checked
        if (checked && selectedOrder?.customer?.email) {
            const userData = await fetchUserPhoneForSMS(
                selectedOrder.customer.email,
                selectedOrder.customer.phone
            );
            
            setUserPhoneData(userData);
            
            const orderPhone = selectedOrder.customer?.phone || '';
            const userPhone = userData?.phone || '';
            
            if (userPhone && orderPhone && userPhone !== orderPhone) {
                // Different phones - show selector
                setShowPhoneSelector(true);
            } else {
                // Same or no user phone - show input
                setShowPhoneSelector(false);
            }
        }
    }}
/>
```

### Phone Verification UI

```jsx
{editStatusData.sendSms && (
    <div className="mt-3 p-3 border border-border rounded-lg bg-muted/50">
        {isLoadingUserPhone ? (
            // Loading state
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying phone number...
            </div>
        ) : showPhoneSelector && userPhoneData?.phone ? (
            // Selector for different phones
            <div className="space-y-3">
                <p className="text-sm font-medium">Select phone number to send SMS:</p>
                <div className="space-y-2">
                    {/* Radio options for order phone, user phone, manual input */}
                </div>
            </div>
        ) : (
            // Input for confirmation or no user data
            <div className="space-y-2">
                <label className="text-sm font-medium">Confirm phone number for SMS:</label>
                <Input
                    type="tel"
                    placeholder="+351 912 345 678"
                    value={editStatusData.smsPhone}
                    onChange={(e) => setEditStatusData({
                        ...editStatusData,
                        smsPhone: e.target.value
                    })}
                />
            </div>
        )}
    </div>
)}
```

## Files Modified

### `/src/app/(backend)/admin/store/orders/page.jsx`

**Changes:**
1. Added new state variables for phone verification
2. Added `fetchUserPhoneForSMS` helper function
3. Updated `editStatusData` structure to include SMS fields
4. Added phone verification UI after SMS checkbox
5. Updated SMS sending logic to use verified phone
6. Updated all `editStatusData` initializations across the component

**Locations Updated:**
- State declarations (lines ~140-155)
- Helper function (lines ~280-300)
- SMS checkbox handler (lines ~2462-2510)
- Phone verification UI (lines ~2512-2610)
- SMS sending logic (lines ~3032-3062)
- All `setEditStatusData` calls (11+ instances)

## User Experience Flow

1. **Admin opens edit status dialog** for an order
2. **Admin checks "Send SMS notification"** checkbox
3. **System automatically fetches** user account data
4. **System compares** order phone vs user phone
5. **UI displays appropriate interface**:
   - If different → Show selector with both options
   - If same/empty → Show confirmation input
6. **Admin selects/confirms** phone number
7. **Admin updates status** 
8. **SMS is sent** to verified phone number
9. **Success message** indicates email/SMS delivery

## Benefits

- ✅ **Prevents wrong number deliveries** - Validates against user account
- ✅ **Reduces SMS failures** - Allows admin to verify before sending
- ✅ **Handles outdated data** - Offers both order and user phones
- ✅ **Flexible input** - Manual entry option for edge cases
- ✅ **Better UX** - Clear visual feedback and selection
- ✅ **Data integrity** - Uses most current phone number from user account

## Testing Checklist

- [ ] Open edit status dialog with SMS enabled
- [ ] Verify phone lookup triggers automatically
- [ ] Test with matching phone numbers (shows input)
- [ ] Test with different phone numbers (shows selector)
- [ ] Test with no user phone data (shows input)
- [ ] Test manual entry option
- [ ] Verify SMS sends to selected phone
- [ ] Check toast messages for success/failure scenarios
- [ ] Verify no errors in console
- [ ] Test with orders that have no customer email

## Related Files

- `/src/lib/server/users.js` - `getUser()` function
- `/src/lib/server/sms.js` - `sendOrderStatusSMS()` function
- `/src/lib/server/email.js` - Email notification system (similar pattern)

## Future Enhancements

1. **Phone format validation** - Add real-time phone number format checking
2. **Country code selection** - Dropdown for international prefix
3. **SMS preview** - Show message preview before sending
4. **SMS history** - Track which phone number was used for each SMS
5. **User preference** - Allow users to set preferred SMS number
6. **Bulk SMS** - Extend to bulk status updates with phone verification

## Notes

- The phone verification system follows the same pattern as email notifications
- All state resets include the new SMS fields to prevent stale data
- Loading states prevent race conditions during async user data fetching
- Fallback logic ensures SMS can still be sent even if verification fails
