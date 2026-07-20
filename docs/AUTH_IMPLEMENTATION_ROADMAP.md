# Authentication Implementation Roadmap

**Goal**: Rebuild authentication from scratch with clean, modular architecture  
**Timeline**: 5 weeks  
**Status**: Ready for implementation

---

## Phase 1: Foundation & Core Services (Days 1-7)

### Task 1.1: PIN Authentication Service
**File**: `lib/auth/pin-service.ts`

```typescript
// Core PIN operations
export class PINAuthService {
  // Create and store PIN
  createPIN(phone: string, pin: string): Promise<void>
  
  // Verify existing PIN
  verifyPIN(phone: string, pin: string): Promise<boolean>
  
  // Check if PIN exists for phone
  isPINExists(phone: string): Promise<boolean>
  
  // Reset PIN
  resetPIN(phone: string, newPIN: string): Promise<void>
  
  // Rate limiting
  recordFailedAttempt(phone: string): Promise<void>
  clearAttempts(phone: string): Promise<void>
  isLocked(phone: string): Promise<boolean>
}
```

**Dependencies**: None (uses supabase directly)  
**Tests**: Unit tests for hashing, verification, rate limiting  
**Deliverable**: PIN operations work correctly

---

### Task 1.2: Phone Validator
**File**: `lib/auth/phone-validator.ts`

```typescript
export class PhoneValidator {
  validate(phone: string): { isValid: boolean; formatted?: string; error?: string }
  isNigerian(phone: string): boolean
  format(phone: string): string  // Ensure +234... format
}
```

**Dependencies**: None  
**Tests**: Regex validation, various phone formats  
**Deliverable**: Robust phone validation

---

### Task 1.3: Auth Flow State Store
**File**: `stores/authFlowStore.ts`

```typescript
interface AuthFlowState {
  // Step tracking
  currentStep: AuthStep
  
  // Form data
  phone: string | null
  pin: string | null
  basicProfile: BasicProfileData | null
  selectedRole: UserRole | null
  roleData: Record<string, any>
  
  // State
  loading: boolean
  error: string | null
  isReturningUser: boolean
  
  // Actions
  setStep(step: AuthStep): void
  setPhone(phone: string): void
  setPIN(pin: string): void
  setBasicProfile(data: BasicProfileData): void
  setRole(role: UserRole): void
  setRoleData(data: any): void
  reset(): void
}

export const useAuthFlowStore = create<AuthFlowState>(...)
```

**Dependencies**: Zustand  
**Tests**: State transitions, actions  
**Deliverable**: State management works correctly

---

### Task 1.4: Session Manager
**File**: `lib/auth/auth-session.ts`

```typescript
export class SessionManager {
  // Create and store session
  createSession(user: User): Promise<void>
  
  // Retrieve current session
  getCurrentSession(): Promise<Session | null>
  
  // Invalidate session
  clearSession(): Promise<void>
  
  // Check if authenticated
  isAuthenticated(): Promise<boolean>
  
  // Persist to AsyncStorage
  private persistSession(session: Session): Promise<void>
  private restoreSession(): Promise<Session | null>
}
```

**Dependencies**: AsyncStorage, supabase  
**Tests**: Session persistence, restoration  
**Deliverable**: Sessions persist across app restarts

---

## Phase 2: UI Components (Days 8-12)

### Task 2.1: Phone Input Component
**File**: `components/auth/PhoneInput.tsx`

Features:
- Nigerian format (+234...)
- Validation feedback
- Clear error messages
- Next button (verify if phone exists)

```typescript
export function PhoneInput({
  onPhoneSubmit: (phone: string) => void
  isReturningUser?: boolean
  error?: string
}): JSX.Element
```

**Dependencies**: `PhoneValidator`  
**Design**: Clean, simple input with validation feedback  
**Deliverable**: Phone entry works smoothly

---

### Task 2.2: PIN Entry Component
**File**: `components/auth/PINEntry.tsx`

Features:
- 4 digit numeric keypad or text input
- Visual feedback (dots, not numbers)
- Backspace support
- Max 3 failed attempts warning

```typescript
export function PINEntry({
  onPINSubmit: (pin: string) => void
  isNewPIN: boolean  // Create vs verify
  phone: string
  error?: string
  remainingAttempts?: number
}): JSX.Element
```

**Dependencies**: `PINAuthService`  
**Design**: Secure PIN input, similar to banking apps  
**Deliverable**: PIN entry works intuitively

---

### Task 2.3: Basic Profile Component
**File**: `components/auth/BasicProfile.tsx`

Form fields:
- Full Name (required)
- Email (required)
- Avatar (optional, upload)

```typescript
export function BasicProfile({
  onComplete: (data: BasicProfileData) => void
  error?: string
  loading: boolean
}): JSX.Element
```

**Dependencies**: Form validation, image upload  
**Design**: Simple, clean form  
**Deliverable**: Profile collection works

---

### Task 2.4: Role Selection Component
**File**: `components/auth/RoleSelection.tsx`

Features:
- Two cards: Customer vs Technician
- Description of each role
- Select button for each

```typescript
export function RoleSelection({
  onRoleSelect: (role: UserRole) => void
  selectedRole?: UserRole
}): JSX.Element
```

**Dependencies**: None  
**Design**: Visual, clear choices  
**Deliverable**: Role selection intuitive

---

## Phase 3: Role-Specific Onboarding (Days 13-18)

### Task 3.1: Customer Onboarding
**File**: `components/auth/onboarding/CustomerOnboarding.tsx`

Form fields:
- Address (text or map picker)
- City
- State
- Postal code

```typescript
export function CustomerOnboarding({
  onComplete: (data: CustomerProfileData) => void
  error?: string
  loading: boolean
}): JSX.Element
```

**Dependencies**: Location service, form validation  
**Design**: Step-by-step address collection  
**Deliverable**: Customer data properly saved

---

### Task 3.2: Technician Onboarding
**File**: `components/auth/onboarding/TechnicianOnboarding.tsx`

Form fields:
- NIN (National ID)
- NIN Document upload
- Shop Address
- Bank Account Details (name, number, bank)

Multi-step form:
1. Personal verification (NIN)
2. Business info
3. Payment details
4. Review & confirm

```typescript
export function TechnicianOnboarding({
  onComplete: (data: TechnicianProfileData) => void
  error?: string
  loading: boolean
}): JSX.Element
```

**Dependencies**: Document upload, bank validation  
**Design**: Multi-step with progress indicator  
**Deliverable**: Technician data properly saved, pending admin approval

---

## Phase 4: Orchestration & Routes (Days 19-23)

### Task 4.1: Auth Flow Container
**File**: `components/auth/AuthFlow.tsx`

Orchestrates all auth steps:
- Phone → PIN → [BasicProfile] → RoleSelection → [RoleOnboarding] → Complete

```typescript
export function AuthFlow(): JSX.Element {
  const { currentStep, phone, isReturningUser } = useAuthFlowStore()
  
  if (!isReturningUser) {
    // New user: full onboarding flow
  } else {
    // Returning user: just PIN verification
  }
}
```

**Dependencies**: All auth components  
**Design**: State machine with clear transitions  
**Deliverable**: Complete flow works end-to-end

---

### Task 4.2: Login Route
**File**: `app/auth/login.tsx`

Main login screen - wrapper around AuthFlow

```typescript
export default function LoginScreen() {
  return <AuthFlow />
}
```

**Dependencies**: `AuthFlow`  
**Deliverable**: Login screen ready

---

### Task 4.3: Route Guards & Auth Middleware
**File**: `components/auth/AuthGuard.tsx` (refactor)

Rules:
- Unauthenticated → `/auth/login`
- Authenticated → Dashboard
- In progress → Current step

```typescript
export function AuthGuard({ children }: { children: React.ReactNode }) {
  // Route protection logic
}
```

**Dependencies**: Session manager  
**Deliverable**: Routes protected correctly

---

### Task 4.4: Auth Layout
**File**: `app/auth/_layout.tsx`

Manages auth routes structure:
- `/auth/login` - Main entry point
- `/auth/phone`
- `/auth/pin`
- `/auth/onboarding/...`

```typescript
export default function AuthLayout() {
  return <Stack ... />
}
```

**Deliverable**: Auth routes organized

---

## Phase 5: Integration & Testing (Days 24-28)

### Task 5.1: Supabase Integration
- Create `user_pins` table
- Update `users` table role enum
- Add `onboarding_completed` to `customer_profiles`
- Create RLS policies
- Seed test accounts

**Checklist**:
- [ ] `user_pins` table created
- [ ] Indexes added for performance
- [ ] RLS policies configured
- [ ] Test data seeded
- [ ] Backups taken

---

### Task 5.2: Unit Tests

Services to test:
- `PINAuthService` (hashing, verification, rate limiting)
- `PhoneValidator` (format, validation)
- `SessionManager` (create, restore, clear)
- `AuthFlowStore` (state transitions)

```typescript
describe('PINAuthService', () => {
  it('should hash and verify PIN')
  it('should enforce rate limiting')
  it('should lock after 3 attempts')
})
```

**Target**: 80%+ coverage  
**Deliverable**: Core services reliable

---

### Task 5.3: Integration Tests

Flows to test:
- New user registration (phone → PIN → profile → role → onboarding)
- Returning user login (phone → PIN → dashboard)
- Error cases (invalid PIN, rate limit, network error)
- State persistence (app restart)

```typescript
describe('Authentication Flow', () => {
  it('should complete new user flow')
  it('should handle returning user correctly')
  it('should clear session on logout')
})
```

**Target**: Critical paths covered  
**Deliverable**: Flows reliable

---

### Task 5.4: Polish & Edge Cases

- Loading states (spinners, disabled buttons)
- Error recovery (retry, go back)
- Empty states (if needed)
- Accessibility (a11y labels, ARIA)
- Performance (lazy loading, memoization)

**Deliverable**: Production-ready UX

---

## Success Metrics

By end of Phase 5:
- ✅ New users complete onboarding in < 2 minutes
- ✅ Returning users login in < 30 seconds
- ✅ All forms validated client + server side
- ✅ No state leakage between users
- ✅ All auth-protected routes working
- ✅ Session persists across app restart
- ✅ Proper error messages for all scenarios
- ✅ Unit test coverage > 80%
- ✅ Integration tests passing
- ✅ No console errors or warnings

---

## File Checklist - What Gets Created

```
lib/auth/
  ✅ pin-service.ts (new)
  ✅ phone-validator.ts (new)
  ✅ auth-session.ts (new)
  ❌ otp-service.ts (DELETE)
  ❌ phone-auth.ts (DELETE)
  ❌ jwt-service.ts (REFACTOR → auth-session)
  ❌ test-fixtures.ts (DELETE)

components/auth/
  ✅ PhoneInput.tsx (new)
  ✅ PINEntry.tsx (new)
  ✅ BasicProfile.tsx (new)
  ✅ RoleSelection.tsx (new)
  ✅ onboarding/CustomerOnboarding.tsx (new)
  ✅ onboarding/TechnicianOnboarding.tsx (new)
  ✅ AuthFlow.tsx (new)
  ✅ AuthGuard.tsx (refactor)
  ❌ OTPInput.tsx (DELETE)

stores/
  ✅ authFlowStore.ts (new)
  ❌ authStore.ts (DELETE, replaced by authFlowStore)

app/auth/
  ✅ login.tsx (new/refactor)
  ✅ _layout.tsx (refactor)
  ✅ onboarding/_layout.tsx (new)
  ✅ onboarding/basic-profile.tsx (new)
  ✅ onboarding/role-selection.tsx (new)
  ✅ onboarding/customer/index.tsx (new)
  ✅ onboarding/technician/index.tsx (new)
```

---

## Notes

- Each task builds on previous ones
- Can't skip steps (dependencies)
- Estimated effort is rough (adjust based on actual progress)
- Test-driven approach recommended
- Commit after each completed task

