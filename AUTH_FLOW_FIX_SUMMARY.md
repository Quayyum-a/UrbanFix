# Auth Flow Fix - Problem & Solution

## Problem Identified

When users entered a phone number and PIN, the system was not properly distinguishing between:
1. **New users** (need to create PIN)
2. **Returning users** (need to verify existing PIN)

### What Was Happening
- User enters phone: `+2348066025051`
- System checked if a PIN exists in `user_pins` table
- For new numbers without user accounts, it would try to create a PIN
- When user tried again, it would say "PIN already exists"
- The system was stuck on the "Create PIN" screen instead of routing to the correct flow

## Root Cause

In `stores/authStore.ts`, the `checkPhone` function was checking:
```typescript
const pinExists = await pinAuthService.isPINExists(formattedPhone)
```

This checked if a PIN record existed in the `user_pins` table, **not** if the user account existed in the `users` table.

**The correct logic should be:**
- Check if user exists in `users` table → **returning user**
- If no user exists → **new user**

## Solution Applied

### Fix 1: Updated `checkPhone` Logic in `stores/authStore.ts`

**Changed from:**
```typescript
const pinExists = await pinAuthService.isPINExists(formattedPhone)
set({
  phoneNumber: formattedPhone,
  isNewUser: !pinExists,  // WRONG: checking PIN existence
  ...
})
```

**Changed to:**
```typescript
// Check if user exists in users table (not user_pins)
const { data: existingUser, error: userError } = await supabase
  .from('users')
  .select('id')
  .eq('phone', formattedPhone)
  .single()

// If user exists, they are a returning user
const isReturningUser = !!existingUser && !userError

set({
  phoneNumber: formattedPhone,
  isNewUser: !isReturningUser,  // CORRECT: checking user existence
  ...
})
```

## Auth Flow After Fix

### New User Flow
```
Phone Entry (+2348012345600)
    ↓ (not found in users table)
isNewUser = true
    ↓
Show "Create Your PIN" screen
    ↓
User enters new 4-digit PIN (e.g., 1234)
    ↓
submitPIN calls pinAuthService.createPIN()
    ↓
PIN hash stored in user_pins table
    ↓
User continues to role selection
```

### Returning User Flow
```
Phone Entry (+2348066025051)
    ↓ (found in users table)
isNewUser = false
    ↓
Show "Enter Your PIN" screen
    ↓
User enters existing PIN (e.g., 1234)
    ↓
submitPIN calls pinAuthService.verifyPIN()
    ↓
PIN verified against hash in user_pins
    ↓
Session created, user logged in
    ↓
Redirected to dashboard
```

## Files Modified

### `stores/authStore.ts`
- Updated `checkPhone` action to check `users` table instead of `user_pins`
- Now correctly identifies new vs returning users
- Lines 75-112

### `app/auth/login.tsx`
- Clarified comment (mode is already hardcoded to 'verify' which is correct for login)
- Lines 109-120

## What Wasn't Changed (By Design)

### PIN Service (`lib/auth/pin-service.ts`)
- Still contains hardcoded hash values for test PINs (1234, 5678) used in demo
- This is acceptable for demo/testing purposes
- In production, these would be database-seeded

### Test Files
- Hardcoded phone numbers in test files remain (used for unit/integration tests)
- This is standard practice for testing

## How to Test

### Test Case 1: New User
1. Go to login screen
2. Enter a phone number that doesn't exist in the database
3. Should see "Create Your PIN" screen
4. Enter a 4-digit PIN
5. Should proceed to role selection

### Test Case 2: Returning User (After Case 1)
1. Go to login screen
2. Enter the same phone number from Case 1
3. Should see "Enter Your PIN" screen (not "Create Your PIN")
4. Enter the same PIN you created in Case 1
5. Should proceed directly to dashboard

### Test Case 3: Wrong PIN on Returning User
1. Go to login screen
2. Enter a returning user's phone
3. See "Enter Your PIN" screen
4. Enter wrong PIN (e.g., if they created with 1234, try 5678)
5. Should show error and allow retries
6. After 3 failed attempts, account should lock for 15 minutes

## Database Requirements

For the fix to work properly, the database must have:

1. **users table** with columns:
   - `phone` (unique)
   - `id`, `role`, `full_name`, `created_at`, `updated_at`

2. **user_pins table** with columns:
   - `phone` (unique, references users.phone)
   - `pin_hash`
   - `attempts`, `locked_until`, `last_attempt_at`
   - `created_at`, `updated_at`

3. **Migrations** applied (from previous Phase 1 work):
   - `001_create_user_pins_table.sql` ✓
   - `002_update_users_role_type.sql` ✓ (optional but recommended)
   - `003_add_onboarding_completed.sql` ✓ (optional but recommended)
   - `004_seed_test_data.sql` ✓ (optional for demo accounts)

## Impact

- ✅ New users can create PINs without errors
- ✅ Returning users are correctly identified
- ✅ Correct screens shown based on user state
- ✅ No more "PIN already exists" errors for new users
- ✅ Flow seamlessly handles both signup and login cases
