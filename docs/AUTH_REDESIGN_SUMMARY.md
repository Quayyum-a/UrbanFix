# Authentication Redesign - Executive Summary

---

## What We're Building

A **clean, modular authentication system** that:
- ✅ Replaces OTP with simple 4-digit PIN (demo purposes)
- ✅ Removes admin role from user-facing login
- ✅ Provides seamless experience for new and returning users
- ✅ Uses clean "lego-like" architecture with incremental components
- ✅ Properly persists user state across app restarts

---

## Key Flows

### New User (First Login)
```
Phone (+234...) → PIN (create) → Full Name → Email → Role → 
  If Customer: Address setup
  If Technician: NIN + Bank details
→ Dashboard
```
**Time**: ~2 minutes

### Returning User (Next Login)
```
Phone (+234...) → PIN (verify) → Dashboard
```
**Time**: ~30 seconds

---

## Architecture Approach

**Clean Separation of Concerns**:

```
lib/auth/              Core services (PIN, validation, sessions)
  ├── pin-service.ts       PIN hashing, verification, rate limiting
  ├── phone-validator.ts   Phone number validation
  └── auth-session.ts      Session management & persistence

components/auth/       UI Components (reusable, testable)
  ├── PhoneInput.tsx       Phone entry
  ├── PINEntry.tsx         PIN creation/verification
  ├── BasicProfile.tsx     Name, email collection
  ├── RoleSelection.tsx    Customer vs Technician choice
  ├── onboarding/          Role-specific onboarding
  └── AuthFlow.tsx         Orchestrates all steps

stores/                Global state (Zustand)
  └── authFlowStore.ts    Manages entire auth flow state

app/auth/              Route handling
  └── login.tsx            Main login screen
```

**Each component**:
- Has a single responsibility
- Is independently testable
- Can be reused elsewhere
- Builds on previous layers

---

## Database Changes

### NEW Table: `user_pins`
Stores PIN for demo authentication
```typescript
phone: string (unique key)
pin_hash: string (bcrypt hashed)
attempts: number (rate limiting)
locked_until: timestamp (lockout)
```

### MODIFIED: `users` table
Remove 'admin' from role enum
```
role: 'customer' | 'technician'  // was 'customer' | 'technician' | 'admin'
```

### MODIFIED: `customer_profiles` table
Add onboarding completion flag
```
onboarding_completed: boolean
```

---

## Implementation Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Days 1-7 | Core services (PIN, validation, state, session) |
| Phase 2 | Days 8-12 | UI components (Phone, PIN, Profile, Role selection) |
| Phase 3 | Days 13-18 | Role-specific onboarding (Customer, Technician) |
| Phase 4 | Days 19-23 | Orchestration, routing, integration |
| Phase 5 | Days 24-28 | Testing, edge cases, polish |
| **Total** | **~5 weeks** | **Production-ready auth** |

---

## Files Being Created

### Services (Backend Logic)
- `lib/auth/pin-service.ts` - PIN operations
- `lib/auth/phone-validator.ts` - Phone validation
- `lib/auth/auth-session.ts` - Session management

### Components (UI)
- `components/auth/PhoneInput.tsx` - Phone entry
- `components/auth/PINEntry.tsx` - PIN input
- `components/auth/BasicProfile.tsx` - Profile collection
- `components/auth/RoleSelection.tsx` - Role choice
- `components/auth/onboarding/CustomerOnboarding.tsx` - Customer setup
- `components/auth/onboarding/TechnicianOnboarding.tsx` - Technician setup
- `components/auth/AuthFlow.tsx` - Flow orchestration

### State Management
- `stores/authFlowStore.ts` - Zustand store for auth state

### Routes
- `app/auth/login.tsx` - Main login screen
- `app/auth/onboarding/*` - Onboarding screens

---

## Files Being Removed

**Auth-related files to DELETE**:
- `lib/auth/otp-service.ts` ❌
- `lib/auth/phone-auth.ts` ❌
- `lib/auth/jwt-service.ts` ❌ (replaced by auth-session)
- `components/auth/OTPInput.tsx` ❌
- `lib/auth/test-fixtures.ts` ❌
- `stores/authStore.ts` ❌ (replaced by authFlowStore)

**Admin routes to REMOVE** (future):
- Any admin-specific login/onboarding screens
- Admin role selection option

---

## Development Approach

### "Lego-like" Implementation

Each piece:
1. **Isolated**: Works independently
2. **Testable**: Has unit tests
3. **Composable**: Builds on others
4. **Incremental**: Can be integrated progressively

Example:
- Week 1: PIN service works alone
- Week 2: PIN service + UI component
- Week 3: PIN + Phone + UI
- Week 4: All components + orchestration
- Week 5: Everything integrated + tested

---

## Success Criteria

By end of Phase 5, users can:
- ✅ Sign up as customer in < 2 minutes
- ✅ Sign up as technician in < 5 minutes
- ✅ Login as returning user in < 30 seconds
- ✅ Logout and login with different account
- ✅ Have session persist across app restart
- ✅ Never leak state between users
- ✅ See helpful error messages

Code quality:
- ✅ Unit tests pass (80%+ coverage)
- ✅ Integration tests pass
- ✅ No TypeScript errors
- ✅ No console warnings
- ✅ Proper error handling
- ✅ Accessibility (a11y) compliant

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Data loss during migration | Full backup before any changes |
| Breaking existing sessions | Old sessions invalidated gracefully |
| Complex state management | Zustand for simplicity, state machine pattern |
| Rate limiting bugs | Unit tests, staging environment testing |
| Security issues | PIN hashing (bcrypt), rate limiting, session validation |
| Incomplete onboarding | Progress tracking, can't skip steps |

---

## Support & Decisions Made

### Questions Answered
✅ **Admin users**: Keep in DB, remove from app flow  
✅ **File cleanup**: Delete old auth files immediately  
✅ **PIN recovery**: No recovery for now (contact support)  

### Assumptions
- PIN is for demo/testing (will be replaced with proper auth in production)
- Users have one account per phone number
- Technician onboarding includes manual admin approval
- Customer onboarding is instant

---

## Next Steps

**Ready to proceed when**:
1. ✅ You confirm database migration plan (see DATABASE_MIGRATION_PLAN.md)
2. ✅ Database backup taken
3. ✅ Staging environment ready for testing

**Phase 1 will start with**:
- Creating PIN service
- Creating auth state store
- Building phone validator
- Writing comprehensive tests

---

## Documentation

Three detailed docs available:

1. **AUTH_REDESIGN_SPEC.md** - Complete specification with all details
2. **AUTH_IMPLEMENTATION_ROADMAP.md** - Step-by-step tasks for each phase
3. **DATABASE_MIGRATION_PLAN.md** - SQL migrations and execution plan

---

## Questions?

Before we start Phase 1, please confirm:

- [ ] Architecture approach makes sense (lego-like, modular)
- [ ] Database changes are acceptable
- [ ] Timeline is realistic (~5 weeks)
- [ ] Ready to delete old auth files
- [ ] Test data seeding is OK

Once confirmed, we can proceed with Phase 1 immediately.

