# JWT Token Persistence & Session Recovery

## Overview

The UrbanFix authentication system now implements **persistent JWT tokens** that allow users to remain logged in indefinitely until they explicitly logout. This fixes the previous behavior where tokens would expire and require re-authentication.

## What Changed

### Before (Previous Behavior)
- JWT tokens expired after 3600 seconds (1 hour)
- Tokens were refreshed automatically before expiry
- **Problem**: When app was closed/reopened, cached session was lost
- **Result**: User forced to re-login even though token could be refreshed

### After (New Behavior)
- JWT tokens still expire, but **refresh token is now persistent**
- On app launch, session is automatically restored from persistent refresh token
- User stays logged in across app restarts
- Session only clears when user explicitly taps "Sign Out"
- **Result**: True persistent login - "until logout" behavior

## How It Works

### 1. **Session Persistence on Login**
When user logs in:
```
Phone → OTP → Verified ✓
         ↓
    JWT Session created
    Access token (1 hour expiry)
    Refresh token (long-lived)
         ↓
    Both tokens stored in memory
    Refresh token ALSO saved to AsyncStorage
    (marked: PERSISTENT_TOKEN_KEY)
         ↓
    User navigated to home/dashboard
```

### 2. **Session Recovery on App Restart**
When app is opened:
```
App Launch
    ↓
AuthStore.initialize() called
    ↓
JWTService.getCurrentSession()
    ├─ Check 1: Cached session in memory? → Return if valid
    │
    ├─ Check 2: Session in storage from this session? → Validate & return
    │
    ├─ Check 3: Persistent refresh token exists?
    │          ↓
    │          Use refresh token → Get new access token
    │          Update session with new token
    │          ✅ SESSION RECOVERED - User stays logged in
    │
    └─ Check 4: Supabase fresh session available? → Use that
         (fallback if all above fail)
    
If all checks fail:
    → No session found
    → User shown login screen
```

### 3. **Token Refresh Lifecycle**
```
Access Token (expires in 1 hour)
    ↓ (after 55 minutes)
Automatic refresh triggered
    ↓
New access token issued
Refresh token rotated
Both stored in memory + persistent storage
    ↓
Cycle repeats
```

### 4. **Explicit Logout**
```
User taps "Sign Out"
    ↓
phoneAuthService.signOut()
    ├─ Call Supabase.auth.signOut()
    └─ JWTService.clearSession()
         ├─ Clear cached session from memory
         ├─ Delete from AsyncStorage (current session)
         └─ Delete from AsyncStorage (PERSISTENT TOKEN)
    ↓
All auth state cleared
User returned to login screen
Next app launch requires re-authentication
```

## Storage Locations

### AsyncStorage Keys
```typescript
// Current session (exists for this app session)
'urbanfix_session' → SessionInfo object
  {
    session: Session,
    user: User,
    role: 'customer' | 'technician' | 'admin',
    expiresAt: number
  }

// Persistent recovery token (survives app restart)
'urbanfix_refresh_token' → PersistentSessionData object
  {
    refreshToken: string,     // Supabase refresh token
    userId: string,           // User ID for reference
    role: 'customer' | 'technician' | 'admin',
    phone: string,            // Phone for reference
    storedAt: number          // When token was stored
  }
```

### In-Memory Cache (JWTService)
```typescript
currentSession: SessionInfo | null
// Fastest path - checked first on each access
// Cleared on app background (implicit) or explicit logout
```

## Testing JWT Persistence

### Test Scenario 1: Basic Persistence
```
1. Use test phone: +2348066025051 (OTP: 123456)
2. Login as Customer
3. You see Home screen ✅
4. Kill app (swipe from recents)
5. Reopen app
6. Expected: Home screen loads immediately (no login screen)
7. ✅ JWT persisted correctly
```

### Test Scenario 2: App Restart with Token Refresh
```
1. Login successfully
2. Wait 5-10 minutes (to trigger refresh)
3. Kill app entirely
4. Reopen app
5. Expected: Home screen loads, session refreshed automatically
6. ✅ Persistence works with refreshed token
```

### Test Scenario 3: Logout and Re-Login
```
1. Login as Customer (+2348066025051)
2. See Home screen
3. Go to Profile → Tap "Sign Out"
4. See phone login screen ✅
5. Try same number again
6. Enter correct OTP
7. Expected: Login succeeds, home screen shows
8. ✅ Persistent token was cleared on logout
```

### Test Scenario 4: Multi-User Switching
```
1. Login as Customer (+2348066025051)
2. Home screen loads
3. Profile → Sign Out
4. Login as Technician (+2348012345678, OTP: 654321)
5. Expected: Technician dashboard loads
6. Kill app
7. Reopen app
8. Expected: Technician dashboard loads (not customer)
9. ✅ Correct persistent token stored per user
10. Sign out technician
11. Open app
12. Expected: Login screen (no persistent token)
```

### Test Scenario 5: Verify "Infinite Duration"
```
This demonstrates the "until logout" behavior:

Day 1: Login 9 AM
Day 2: App closed overnight
Day 3: Reopen 9 AM next day
Expected: Still logged in (token refreshed silently) ✅

This can continue indefinitely until:
- User explicitly logs out
- Device storage is cleared (clears AsyncStorage)
- Supabase invalidates the refresh token (backend action)
```

## Code Changes

### Files Modified

1. **lib/auth/jwt-service.ts**
   - Added `PersistentSessionData` interface
   - Added `PERSISTENT_TOKEN_KEY` constant
   - Added `restoreSessionFromRefreshToken()` method
   - Updated `handleSessionUpdate()` to persist refresh token
   - Updated `clearSession()` to remove persistent token
   - Enhanced `getCurrentSession()` with recovery logic

2. **stores/authStore.ts**
   - Updated `initialize()` to properly document recovery flow
   - Added better logging for session restoration
   - No breaking changes to API

3. **app/customer/profile.tsx**
   - Fixed logout method name (`logout` → `signOut`)
   - Added error handling for logout

## Logging

The system provides detailed logging for debugging:

```
// On app launch with existing session
🔄 [JWT] getCurrentSession called
✅ [JWT] Returning cached session

// After app restart (recovery from token)
🔄 [JWT] Attempting to restore session from persistent token...
✅ [JWT] Found persistent token, attempting refresh...
✅ [JWT] Session restored from refresh token!
💾 [JWT] Refresh token persisted for session recovery

// On logout
🚪 [AuthStore] User signed out
🗑️ [JWT] Session and persistent token cleared on logout
```

Search logs for `[JWT]` tag to see all token lifecycle events.

## Error Scenarios

### Scenario: Stored Token is Invalid/Expired
```
User hasn't opened app for 30+ days
Refresh token expires (Supabase default: 604800s = 7 days)
App opens
    ↓
Attempt to refresh with old token
    ↓
Supabase rejects (token expired)
    ↓
Delete invalid token from storage
    ↓
Fall back to Supabase fresh session check
    ↓
If no fresh session: Show login screen
```

### Scenario: AsyncStorage Corrupted
```
AsyncStorage somehow contains invalid JSON
    ↓
Parse fails
    ↓
Exception caught
    ↓
Skip to next recovery method (Supabase fresh session)
    ↓
Continue gracefully (no crash)
```

## API Reference

### JWTService Methods

```typescript
// Get session - returns null or SessionInfo
const session = await jwtService.getCurrentSession()

// Validate current session
const result = await jwtService.validateSession()
// Returns: { isValid, session, needsRefresh, error }

// Get access token for API calls
const token = await jwtService.getAccessToken()

// Check if authenticated
const isAuth = await jwtService.isAuthenticated()

// Sign out (clears persistent token)
await jwtService.signOut()

// Get session expiry info
const expiry = await jwtService.getSessionExpiry()
// Returns: { expiresAt, timeToExpiry, needsRefresh }
```

## Configuration

### Refresh Threshold
```typescript
// Token is refreshed 5 minutes before expiry
private readonly REFRESH_THRESHOLD = 5 * 60 * 1000 // milliseconds
```

To change (e.g., to 10 minutes):
```typescript
private readonly REFRESH_THRESHOLD = 10 * 60 * 1000
```

### AsyncStorage Keys
If you need to change storage keys, update:
```typescript
private readonly SESSION_STORAGE_KEY = 'urbanfix_session'
private readonly PERSISTENT_TOKEN_KEY = 'urbanfix_refresh_token'
```

## Migration Notes

If you're upgrading from old code:

1. Old sessions stored in AsyncStorage will be ignored (no schema upgrade needed)
2. User simply logs in again (new persistent token created)
3. No data loss

## Security Considerations

✅ **What's Protected**
- Refresh token stored in AsyncStorage (local to device)
- No sensitive data in localStorage accessible to JS
- Token cleared explicitly on logout
- Session validated before use

⚠️ **What to Monitor**
- Device physical security (AccessStorage can be accessed if device rooted/jailbroken)
- AsyncStorage encryption (on some platforms)
- Token invalidation if compromised (implement in future)

### Recommendations
1. Implement token rotation on each refresh (already done by Supabase)
2. Add device fingerprinting in future (verify same device using token)
3. Monitor suspicious account access patterns
4. Implement logout all devices feature (in Growth phase)

## Future Enhancements

- [ ] Device fingerprint verification (same device check)
- [ ] Biometric unlock (fingerprint/face for technician access)
- [ ] Token invalidation dashboard (admin view)
- [ ] Session timeout warning (e.g., 30min of inactivity)
- [ ] Logout all devices feature
- [ ] Token compromise detection

---

**Status**: ✅ Implemented and tested
**MVP Impact**: Critical - Enables smooth, persistent login experience
**Performance**: No performance degradation (fast AsyncStorage lookups)
**Testing**: Use test phone numbers from `TEST_NUMBERS.md`
