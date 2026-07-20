# UrbanFix Authentication Redesign - Complete Specification

**Status**: Planning & Design  
**Last Updated**: 2024  
**Author**: Engineering Team

---

## 1. Overview

A complete redesign of the authentication system with a clean, modular architecture. The new system replaces OTP with a simple 4-digit PIN for demo purposes and removes the admin role from the user-facing flow.

### Key Changes
- **Replace OTP → 4-digit PIN**: Simpler demo authentication
- **Remove Admin Role**: No admin-specific onboarding flows for now
- **User Types**: Only `customer` and `technician`
- **Clean Lego-like Architecture**: Incremental, composable modules
- **Persistent State**: Returning users bypass onboarding

---

## 2. Authentication Flows

### 2.1 New User Flow (First-time login)

```
Phone Entry
    ↓
PIN Entry (4 digits, user creates)
    ↓
Basic Profile Setup (full name, email, avatar)
    ↓
Role Selection (customer or technician)
    ↓
Role-Specific Onboarding
    ├─ CUSTOMER: Address/Location setup
    └─ TECHNICIAN: Verification workflow (NIN, bank details, etc.)
    ↓
Dashboard
```

### 2.2 Returning User Flow (Subsequent logins)

```
Phone Entry
    ↓
PIN Entry (4 digits, verify existing)
    ↓
Dashboard (no onboarding)
```

### 2.3 State Transitions

| State | Conditions | Next Step |
|-------|-----------|-----------|
| PHONE_ENTRY | New or returning user | PIN_ENTRY |
| PIN_ENTRY | New user + valid PIN | BASIC_PROFILE |
| PIN_ENTRY | Returning user + correct PIN | DASHBOARD |
| BASIC_PROFILE | Profile completed | ROLE_SELECTION |
| ROLE_SELECTION | Role selected | ROLE_ONBOARDING |
| ROLE_ONBOARDING_CUSTOMER | Profile created | DASHBOARD |
| ROLE_ONBOARDING_TECHNICIAN | Profile created | DASHBOARD |
| DASHBOARD | Authenticated | Navigate app |

---

## 3. Database Requirements

### 3.1 Changes to `users` Table

**Current**: Supports `role: 'customer' | 'technician' | 'admin'`

**New**: Modify to:
```typescript
role: 'customer' | 'technician'
```

**Action Required**: Remove 'admin' from role enum. Backfill any existing admin records.

### 3.2 New Table: `user_pins` (for PIN storage)

Store hashed PINs for demo authentication.

```sql
CREATE TABLE user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(14) UNIQUE NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,  -- bcrypt hashed 4-digit PIN
  attempts INT DEFAULT 0,          -- failed attempts
  last_attempt_at TIMESTAMP,       -- rate limiting
  locked_until TIMESTAMP,          -- lockout after 3 failed attempts
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Rationale**: Separate PIN storage from auth to keep user table clean.

### 3.3 Changes to `customer_profiles` & `technician_profiles`

These can remain but will be simplified:

**customer_profiles**: Add `onboarding_completed` flag
```typescript
onboarding_completed: boolean  // true after basic setup
```

**technician_profiles**: Already has `verification_status` to track onboarding state

---

## 4. Module Architecture

Clean separation of concerns using feature modules:

```
lib/auth/
├── pin-auth-service.ts       [CORE] PIN generation, hashing, verification
├── auth-state-manager.ts     [CORE] Session & state management
├── phone-validator.ts        [UTIL] Phone number validation
├── pin-validator.ts          [UTIL] PIN validation & rules
├── auth-session.ts           [CORE] JWT/session persistence
└── index.ts                  [EXPORT] Public API

components/auth/
├── PhoneInput.tsx            [UI] Phone number entry
├── PINEntry.tsx              [UI] 4-digit PIN input
├── BasicProfile.tsx          [UI] Name, email, avatar
├── RoleSelection.tsx         [UI] Customer vs Technician choice
├── RoleOnboarding/
│   ├── CustomerOnboarding.tsx    [UI] Address setup
│   └── TechnicianOnboarding.tsx  [UI] Verification, bank details
└── AuthFlow.tsx              [CONTAINER] Orchestrates all steps

hooks/
├── useAuthFlow.ts            [LOGIC] Flow state management
├── usePhoneAuth.ts           [LOGIC] Phone validation hooks
├── usePINAuth.ts             [LOGIC] PIN creation/verification
└── useRoleOnboarding.ts      [LOGIC] Role-specific setup

stores/
├── authFlowStore.ts          [STATE] Global auth state
└── sessionStore.ts           [STATE] Session persistence

app/auth/
├── _layout.tsx               [ROUTER] Auth route guard
├── login.tsx                 [SCREEN] Main login orchestrator
├── onboarding/
│   ├── _layout.tsx
│   ├── basic-profile.tsx
│   ├── role-selection.tsx
│   ├── customer/
│   │   └── [role-onboarding].tsx
│   └── technician/
│       └── [role-onboarding].tsx
└── phone-recovery.tsx        [SCREEN] Account recovery flow
```

---

## 5. Implementation Phases

### Phase 1: Core Authentication (Weeks 1-2)
- [ ] Create PIN auth service
- [ ] Implement phone validation
- [ ] Build phone entry UI component
- [ ] Build PIN entry UI component
- [ ] Create auth state management (Zustand store)
- [ ] Implement basic session persistence
- [ ] Database: Create `user_pins` table
- [ ] Database: Update `users` table role enum

**Deliverable**: Users can enter phone + PIN

---

### Phase 2: Onboarding Foundation (Weeks 2-3)
- [ ] Create basic profile component
- [ ] Create role selection component
- [ ] Implement profile form validation
- [ ] Create onboarding state machine
- [ ] Database: Add `onboarding_completed` to customer_profiles
- [ ] Implement returning user detection

**Deliverable**: New users can complete basic onboarding

---

### Phase 3: Role-Specific Onboarding (Weeks 3-4)
- [ ] Build customer onboarding (location, address)
- [ ] Build technician onboarding (NIN, bank, verification)
- [ ] Implement role-specific form validation
- [ ] Create role profile services
- [ ] Hook up role services to database

**Deliverable**: Users complete full onboarding based on role

---

### Phase 4: Route Guards & Integration (Week 4)
- [ ] Implement auth middleware
- [ ] Route protection (unauthenticated → /auth/login)
- [ ] Returning user redirect (authenticated → dashboard)
- [ ] Session restoration on app restart
- [ ] Logout and session cleanup
- [ ] Multi-user account switching

**Deliverable**: Complete seamless authentication flow

---

### Phase 5: Testing & Polish (Week 5)
- [ ] Unit tests for PIN service
- [ ] Integration tests for auth flow
- [ ] E2E tests for user journeys
- [ ] Error handling & edge cases
- [ ] Loading states & animations
- [ ] Security audit

**Deliverable**: Production-ready authentication

---

## 6. Data Models

### 6.1 Auth Flow State (Zustand Store)

```typescript
interface AuthFlowState {
  // Current step in the flow
  step: 'phone' | 'pin' | 'basic-profile' | 'role-selection' | 
        'customer-onboarding' | 'technician-onboarding' | 'complete'
  
  // User data being collected
  phone: string | null
  pin: string | null
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  selectedRole: 'customer' | 'technician' | null
  
  // Role-specific data
  roleData: {
    customer?: {
      address: string
      latitude: number
      longitude: number
    }
    technician?: {
      nin: string
      ninDocUrl: string
      shopAddress: string
      bankDetails: { ... }
    }
  }
  
  // State flags
  loading: boolean
  error: string | null
  isReturningUser: boolean
  
  // Actions
  setPhone: (phone: string) => void
  setPIN: (pin: string) => void
  setBasicProfile: (data: BasicProfile) => void
  setRole: (role: UserRole) => void
  setRoleData: (data: any) => void
  resetFlow: () => void
}
```

### 6.2 Session State

```typescript
interface SessionState {
  user: User | null
  isAuthenticated: boolean
  lastLoginAt: string | null
  expiresAt: string | null
}
```

---

## 7. PIN Requirements

### 7.1 PIN Rules
- **Length**: 4 digits (0000-9999)
- **Storage**: Bcrypt hashed in database
- **Creation**: User creates PIN on first login
- **Verification**: User enters PIN on subsequent logins
- **Rate Limiting**: Max 3 attempts, then 15-minute lockout

### 7.2 PIN Service Methods

```typescript
// PIN generation and validation
class PINAuthService {
  createPIN(phone: string, pin: string): Promise<void>
  verifyPIN(phone: string, pin: string): Promise<boolean>
  isPINCreated(phone: string): Promise<boolean>
  resetPIN(phone: string, newPIN: string): Promise<void>
  
  // Rate limiting
  recordFailedAttempt(phone: string): Promise<void>
  checkAttempts(phone: string): Promise<{attempts: number, locked: boolean}>
}
```

---

## 8. Test User Fixtures

For demo purposes:

```typescript
TEST_ACCOUNTS = {
  customer: {
    phone: '+2348066025051',
    pin: '1234',
    name: 'John Customer',
    role: 'customer'
  },
  technician: {
    phone: '+2348012345678',
    pin: '5678',
    name: 'Mike Technician',
    role: 'technician'
  }
}
```

These will be seeded on first app initialization.

---

## 9. Security Considerations

- [ ] PIN hashing: Use bcrypt with 10+ rounds
- [ ] Rate limiting: Max 3 failed attempts, 15-min lockout
- [ ] Session storage: Encrypted in AsyncStorage
- [ ] JWT tokens: 24-hour expiration, refresh tokens
- [ ] Phone validation: Server-side verification
- [ ] PIN complexity: Demo only (relax for production)
- [ ] HTTPS only: All API calls
- [ ] CORS headers: Proper configuration

---

## 10. Database Checklist

### Need to Review/Update
- [ ] `users` table: Remove 'admin' from role enum
- [ ] Backfill existing admin users (ask: convert to customer or delete?)
- [ ] Create `user_pins` table
- [ ] Add `onboarding_completed` to `customer_profiles`
- [ ] Add indexes on `user_pins.phone` for performance
- [ ] Create RLS policies for PIN table

### No Changes Needed
- [ ] `customer_profiles` table (keep as-is)
- [ ] `technician_profiles` table (keep as-is)
- [ ] Job and payment tables (independent of auth)

---

## 11. Environment Variables

```env
# PIN Authentication
PIN_HASH_ROUNDS=10
PIN_ATTEMPT_LIMIT=3
PIN_LOCKOUT_DURATION=900  # 15 minutes in seconds

# Session
SESSION_EXPIRATION=86400  # 24 hours
REFRESH_TOKEN_EXPIRATION=604800  # 7 days

# Feature Flags
DEMO_MODE=true  # Use test accounts
ENABLE_OTP=false  # Disabled, using PIN instead
```

---

## 12. Success Criteria

- [ ] New user can complete signup in < 2 minutes
- [ ] Returning user can login in < 30 seconds
- [ ] No state leakage between users
- [ ] Smooth onboarding with no steps skipped
- [ ] Role-specific data properly persisted
- [ ] All auth-protected routes work correctly
- [ ] Logout clears all sensitive data
- [ ] Session survives app restart
- [ ] Proper error messages for user guidance

---

## 13. Known Unknowns / Questions for User

1. **Existing Admin Users**: What to do with existing admin accounts in the database?
   - Convert to customers?
   - Delete?
   - Keep separate (not accessible via app)?

2. **PIN Recovery**: Need a PIN reset flow?
   - SMS verification?
   - Security questions?
   - Support contact?

3. **Phone Change**: Can users change their phone number after registration?
   - Requires re-verification?
   - Manual support process?

4. **Email in Onboarding**: Is email required for customers/technicians?
   - Use for notifications?
   - For password recovery later?

5. **Avatar Upload**: Where are avatars stored?
   - Supabase storage?
   - Third-party service?
   - URL only?

---

## 14. Files to Delete/Deprecate

During implementation, these auth-related files will be removed:

- `lib/auth/otp-service.ts` (replaced by PIN service)
- `lib/auth/phone-auth.ts` (replaced by modular services)
- `lib/auth/jwt-service.ts` (replaced by auth-session)
- `components/auth/OTPInput.tsx` (replaced by PINEntry)
- `lib/auth/test-fixtures.ts` (replaced by auth seeding)
- All admin-related routes and components

---

## 15. Migration Plan

For users with existing sessions:
- Old JWT tokens invalidated on deploy
- Users redirected to login
- Cache cleared
- Previous onboarding state not migrated (start fresh)

---

## Next Steps

1. **Approval**: Confirm database changes with user
2. **Phase 1 Start**: Begin PIN auth service implementation
3. **Daily Standup**: Track progress through each phase
4. **Code Review**: Each component reviewed before integration
5. **Testing**: Parallel testing during implementation

