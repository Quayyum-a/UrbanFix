#!/bin/bash
# Git commits to run individually in your terminal
# Copy and paste each command one at a time into your terminal

echo "=== Individual Git Commits for UrbanFix Changes ==="
echo ""

# Commit 1: ImagePicker API fixes
echo "Running Commit 1: Fix deprecated ImagePicker API..."
git add app/technician/onboarding.tsx components/auth/AvatarUpload.tsx components/verification/DocumentUploadCard.tsx
git commit -m "fix: Update ImagePicker API from deprecated MediaTypeOptions to array syntax

- Changed ImagePicker.launchImageLibraryAsync mediaTypes parameter
- From: MediaTypeOptions.Images (deprecated)
- To: ['images'] (current API)
- Updated in:
  * app/technician/onboarding.tsx
  * components/auth/AvatarUpload.tsx
  * components/verification/DocumentUploadCard.tsx

This fixes deprecation warnings in Expo 17.x"

echo ""
echo "=== Commit 1 done ==="
echo ""

# Commit 2: SafeAreaView import fixes
echo "Running Commit 2: Fix deprecated SafeAreaView imports..."
git add app/technician/profile.tsx app/technician/messages/index.tsx app/auth/register.tsx app/technician/part-requests.tsx
git commit -m "fix: Replace deprecated react-native SafeAreaView with safe-area-context

- Removed SafeAreaView from 'react-native' imports
- Added SafeAreaView from 'react-native-safe-area-context'
- Updated in:
  * app/technician/profile.tsx
  * app/technician/messages/index.tsx
  * app/auth/register.tsx
  * app/technician/part-requests.tsx

This fixes notch and status bar handling on modern devices"

echo ""
echo "=== Commit 2 done ==="
echo ""

# Commit 3: Remove duplicate Button export
echo "Running Commit 3: Fix circular dependency in UI barrel export..."
git add components/ui/index.ts
git commit -m "fix: Remove duplicate Button export in UI barrel file

- Removed duplicate: export { Button } from './Button'
- Kept single export to prevent require cycles
- This fixes console warnings about circular dependencies"

echo ""
echo "=== Commit 3 done ==="
echo ""

# Commit 4: Fix technician route registration
echo "Running Commit 4: Fix technician layout route names..."
git add app/technician/_layout.tsx
git commit -m "fix: Correct route names in technician layout

- Changed: name='jobs' → name='jobs/index'
- Changed: name='messages' → name='messages/index'
- Added: name='verification-pending' screen registration
- This fixes console warnings about unregistered routes"

echo ""
echo "=== Commit 4 done ==="
echo ""

# Commit 5: Add admin role to UserRole type
echo "Running Commit 5: Add admin role to type system..."
git add stores/authFlowStore.ts lib/auth/auth-session.ts
git commit -m "feat: Add admin role to UserRole type system

- Updated stores/authFlowStore.ts: UserRole now includes 'admin'
- Updated lib/auth/auth-session.ts: getUserRole() return type updated
- This enables admin authentication and dashboard access"

echo ""
echo "=== Commit 5 done ==="
echo ""

# Commit 6: Add admin login redirect
echo "Running Commit 6: Add admin redirect in login flow..."
git add app/auth/login.tsx
git commit -m "feat: Add admin redirect in login authentication

- Added case for 'admin' role in redirectIfAuthenticated switch
- Admin users redirect to /admin dashboard on login
- Maintains existing customer and technician redirects"

echo ""
echo "=== Commit 6 done ==="
echo ""

# Commit 7: Add admin route protection
echo "Running Commit 7: Add admin route protection in AuthGuard..."
git add components/auth/AuthGuard.tsx
git commit -m "feat: Add admin route protection and cross-role routing

- Added protection for /admin routes: only admin role allowed
- Added cross-role redirects: admin ↔ customer/technician routes
- Prevents unauthorized access to admin dashboard"

echo ""
echo "=== Commit 7 done ==="
echo ""

# Commit 8: Fix technician onboarding duplicate key error
echo "Running Commit 8: Fix technician profile upsert logic..."
git add app/technician/onboarding.tsx
git commit -m "fix: Handle duplicate technician profile on resubmission

- Check if profile exists before insert/update
- Use update if exists, insert if new
- Fixes error when technician resubmits after rejection
- Also fixed schema mismatch: account_holder_name → account_name"

echo ""
echo "=== Commit 8 done ==="
echo ""

# Commit 9: Fix infinite loop in technician layout
echo "Running Commit 9: Fix infinite verification status check loop..."
git add app/technician/_layout.tsx
git commit -m "fix: Prevent infinite loop in technician verification check

- Added 'checked' state to only run verification check once
- Added segment check to prevent redirect if already on pending screen
- Fixes loading spinner stuck on screen after onboarding"

echo ""
echo "=== Commit 9 done ==="
echo ""

# Commit 10: Add technician approval screen
echo "Running Commit 10: Add technician approval admin screen..."
git add app/admin/technician-approval.tsx
git commit -m "feat: Add technician approval screen for admin dashboard

- Lists pending technician registrations
- Filter by status: all, pending, approved, rejected
- Detail modal shows all verification information
- Approve/Reject actions with rejection reason modal
- Real-time sync with technician devices via Supabase"

echo ""
echo "=== Commit 10 done ==="
echo ""

# Commit 11: Add SQL migrations for admin role
echo "Running Commit 11: Add SQL migration files..."
git add scripts/migrations/006_add_admin_role.sql FIX_ADMIN_ENUM_AND_CREATE_USER.sql SIMPLE_FIX_ADMIN_ENUM.sql ADMIN_USER_SETUP.sql
git commit -m "sql: Add migrations for admin role enum and user creation

- scripts/migrations/006_add_admin_role.sql: Add admin to enum
- FIX_ADMIN_ENUM_AND_CREATE_USER.sql: Complete enum fix + admin user
- SIMPLE_FIX_ADMIN_ENUM.sql: Step-by-step version of fix
- ADMIN_USER_SETUP.sql: SQL to create admin user

These scripts restore admin role to user_role enum and create admin account"

echo ""
echo "=== Commit 11 done ==="
echo ""

# Commit 12: Add documentation files
echo "Running Commit 12: Add admin setup and workflow documentation..."
git add ADMIN_COMPLETE_SETUP.md ADMIN_LOGIN_SETUP.md ADMIN_ROLE_IMPLEMENTATION_SUMMARY.md APPROVAL_WORKFLOW.md QUICK_ADMIN_START.md FIX_ADMIN_ENUM_INSTRUCTIONS.md
git commit -m "docs: Add comprehensive admin setup and workflow documentation

- ADMIN_COMPLETE_SETUP.md: Complete admin setup guide
- ADMIN_ROLE_IMPLEMENTATION_SUMMARY.md: Technical implementation details
- QUICK_ADMIN_START.md: 5-minute quick start guide
- ADMIN_LOGIN_SETUP.md: Login instructions
- APPROVAL_WORKFLOW.md: Technician approval workflow documentation
- FIX_ADMIN_ENUM_INSTRUCTIONS.md: Instructions for fixing enum error

All docs explain features, security, and troubleshooting"

echo ""
echo "=== Commit 12 done ==="
echo ""

# Commit 13: Add other modified files
echo "Running Commit 13: Add remaining modified files..."
git add \
  app/admin/_layout.tsx \
  app/auth/register.tsx \
  components/auth/AuthGuard.tsx \
  components/auth/PhoneInput.tsx \
  components/auth/RoleSelection.tsx \
  database/migrations/002_technician_verification_schema.sql \
  stores/authStore.ts \
  PROFILE_SETUP_REDESIGN.md \
  AUTH_FLOW_FIX_SUMMARY.md \
  STORAGE_SETUP_INSTRUCTIONS.md

git commit -m "refactor: Update various files for admin role and auth improvements

- app/admin/_layout.tsx: Already includes 6 admin tabs
- app/auth/register.tsx: Improved auth flow
- components/auth/*: Updated authentication components
- stores/authStore.ts: Auth state management updates
- database/migrations/*: Schema updates

Plus documentation files for auth flow and storage setup"

echo ""
echo "=== Commit 13 done ==="
echo ""

# Commit 14: Add test files and assets
echo "Running Commit 14: Add test files and assets..."
git add \
  __tests__/integration/registration-flow.test.ts \
  __tests__/unit/role-selection.test.tsx \
  assets/customer-role-icon.png \
  assets/technician-role-icon.png \
  components/auth/TechnicianOnboarding.tsx \
  components/auth/UnifiedProfileSetup.tsx \
  database/migrations/006_fix_technician_verification_schema.sql \
  database/storage-setup.sql

git commit -m "feat: Add tests, assets, and auth components

- __tests__: Integration and unit tests for registration flow
- assets: Role selection icons for customer and technician
- components/auth: TechnicianOnboarding and UnifiedProfileSetup
- database: Storage setup SQL and schema migrations

All supporting files for complete technician onboarding flow"

echo ""
echo "=== Commit 14 done ==="
echo ""

echo ""
echo "==============================================="
echo "✅ All commits completed successfully!"
echo "==============================================="
echo ""
echo "Total commits: 14"
echo ""
echo "To push all commits to origin:"
echo "  git push origin main"
echo ""
