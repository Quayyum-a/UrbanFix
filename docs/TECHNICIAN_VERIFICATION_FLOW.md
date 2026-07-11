# Technician Verification Status Flow

## Overview

The technician verification system enforces a three-state workflow:
- **pending** — Awaiting admin review
- **approved** — Verified, can accept jobs
- **rejected** — Needs resubmission with reason provided

This document explains the implementation and user flows.

## Database Schema

### Verification Status States
```sql
-- Enum values in database
type verification_status AS ENUM ('pending', 'approved', 'rejected')

-- Stored in technician_profiles table
verification_status verification_status DEFAULT 'pending'
rejection_reason TEXT  -- Only populated if rejected
```

### Related Tables
```
technician_profiles (main verification tracking)
  ├─ id (UUID)
  ├─ user_id (references users)
  ├─ verification_status ('pending'|'approved'|'rejected')
  ├─ rejection_reason (string, only if rejected)
  ├─ nin (National ID Number)
  ├─ nin_doc_url (document storage URL)
  ├─ shop_address
  ├─ bank_name, bank_account_number, bank_account_name
  └─ reviewed_by, reviewed_at (set when approved/rejected)
```

## User Flows

### Flow 1: New Technician Onboarding

```
1. Technician logs in with phone number
2. OTP verification successful
3. Role selection → "I'm a Technician"
4. Profile setup (name, avatar)
5. ↓ TECHNICIAN ONBOARDING SCREEN SHOWN
6. Enter verification documents:
   - NIN (National ID Number)
   - NIN document photo
   - Shop address
   - Bank details
7. Review and submit
8. ↓ Status: pending
9. Redirected to "Verification Pending" screen
   - Shows timeline: Submitted → Under Review → Approved
   - Displays "Usually 24 hours"
   - Shows submitted documents
10. Cannot accept jobs until approved
```

### Flow 2: Admin Approval (Technician Pending)

```
Admin Dashboard
    ↓
Verifications tab → Filter: "Pending"
    ↓
List of all pending technicians
    ↓
Tap technician card
    ↓
View detail modal:
  - Personal info (name, phone)
  - NIN document (view/verify)
  - Shop address
  - Bank details
    ↓
[Approve] button → Approval modal
  - "Are you sure?"
  - Tap "Approve"
    ↓
    System:
    - Sets verification_status = 'approved'
    - Sets reviewed_by = admin_user_id
    - Sets reviewed_at = now()
    - Enables job acceptance
    ↓
Technician app updates
  - Redirects from pending screen
  - Shows dashboard with jobs
  - Can now [Accept Jobs]
```

### Flow 3: Admin Rejection (Technician Pending)

```
Same as approval flow, but:
    ↓
[Reject] button
    ↓
Modal appears: "Rejection Reason"
    - Text input for reason
    - Message: "This will be sent to technician"
    ↓
Enter reason (required)
Tap [Reject]
    ↓
System:
  - Sets verification_status = 'rejected'
  - Sets rejection_reason = admin_input
  - Sets reviewed_by = admin_user_id
  - Sets reviewed_at = now()
  - Disables job acceptance (still)
    ↓
Technician app updates
  - Verification Pending screen shows rejection
  - Displays rejection reason
  - Shows [Resubmit Documents] button
  - Can fix issues and resubmit
```

### Flow 4: Technician Resubmission After Rejection

```
Technician sees rejection on Verification Pending screen
    ↓
Reads rejection reason
    ↓
Tap [Resubmit Documents]
    ↓
Navigates to Technician Onboarding screen again
    ↓
Review and correct information
    ↓
Resubmit (updates technician_profiles record)
    ↓
Status goes back to 'pending'
    ↓
Redirects to Verification Pending screen again
    ↓
Admin reviews again
```

### Flow 5: Approved Technician Normal Login

```
Technician logs in
    ↓
AuthStore checks verification_status
    ↓
Status = 'approved'
    ↓
TechnicianLayout checks verification
    ↓
Shows Dashboard with tabs:
  - Dashboard (jobs waiting)
  - Jobs (incoming jobs to accept)
  - Pricing (labour rates per category)
  - Messages (chat with customers)
  - Profile (settings, logout)
```

## Screen Components

### 1. Verification Pending Screen
**File**: `app/technician/verification-pending.tsx`

Shows when verification_status != 'approved'

**Features**:
- Icon showing status (pending/rejected)
- Status title and description
- Timeline showing process:
  1. ✓ Documents Submitted (shows time ago)
  2. ⏳ Under Review (usually 24 hours)
  3. ⏳ Approved (you'll be notified)

**For Pending State**:
- Info box: "You can explore the app but won't accept jobs"
- List of submitted documents
- "Sign Out" button

**For Rejected State**:
- Error icon
- Rejection reason displayed in red box
- Action items checklist
- [Resubmit Documents] button
- [Sign Out] button

**Code**:
```typescript
// Auto-checks verification status on load
useEffect(() => {
  loadVerificationStatus() // Queries DB
  setInterval(() => updateTimeElapsed(), 60000) // Update time every minute
}, [])

// If status changes to 'approved', redirects to dashboard
if (data.status === 'approved') {
  router.replace('/technician')
}

// If 'rejected', shows alert with reason
if (data.status === 'rejected') {
  showRejectionAlert(rejection_reason)
}
```

### 2. Technician Layout Router
**File**: `app/technician/_layout.tsx`

Controls access to tabs based on verification status.

**Logic**:
```typescript
const checkVerificationStatus = async () => {
  // 1. Get technician_profiles record
  const { data: profile } = await supabase
    .from('technician_profiles')
    .select('verification_status')
    .eq('user_id', userProfile.id)
    .single()

  if (!profile) {
    // New technician → redirect to onboarding
    router.replace('/technician/onboarding')
  } else if (profile.verification_status !== 'approved') {
    // Pending or rejected → redirect to pending screen
    router.replace('/technician/verification-pending')
  } else {
    // Approved → show tabs and dashboard
    setVerificationStatus('approved')
  }
}
```

### 3. Admin Verification Screen
**File**: `app/admin/verifications.tsx`

Admin interface for technician verification review.

**Features**:
- Filter tabs: All, Pending, Approved, Rejected (with counts)
- Cards for each technician showing:
  - Name, phone
  - NIN (last 4 digits)
  - Bank name
  - Submission date
  - [Approve] [Reject] buttons (pending only)

- Detail modal on card tap:
  - Full personal info
  - NIN document view link
  - Shop address
  - Bank details
  - Current status
  - Rejection reason (if applicable)
  - Action buttons

- Rejection modal for reason input:
  - Text field for reason
  - "Cancel" and "Reject" buttons
  - Shows message: "This will be sent to technician"

**Updates**: When approving/rejecting:
```typescript
// Update verification
.update({
  status: 'approved' | 'rejected',
  reviewed_at: now(),
  reviewed_by: admin_user_id,
  rejection_reason: (for rejected)
})

// Also update technician_profiles
.update({
  verification_status: 'approved' | 'rejected'
})
```

## Database Queries

### Check Technician Verification Status
```typescript
const { data } = await supabase
  .from('technician_profiles')
  .select('verification_status, rejection_reason')
  .eq('user_id', user_id)
  .single()

// Returns:
// { verification_status: 'pending'|'approved'|'rejected', rejection_reason: string|null }
```

### Get All Pending Verifications (Admin)
```typescript
const { data } = await supabase
  .from('technician_profiles')
  .select(`
    *,
    users!inner(full_name, phone)
  `)
  .eq('verification_status', 'pending')
  .order('created_at', { ascending: false })
```

### Approve Technician (Admin)
```typescript
// Step 1: Update verification
await supabase
  .from('technician_profiles')
  .update({
    verification_status: 'approved',
    reviewed_at: now(),
    reviewed_by: admin_user_id
  })
  .eq('id', technician_id)

// Step 2: Update related records if needed
// (notification trigger, etc.)
```

### Reject Technician (Admin)
```typescript
await supabase
  .from('technician_profiles')
  .update({
    verification_status: 'rejected',
    rejection_reason: 'NIN document unclear - please resubmit',
    reviewed_at: now(),
    reviewed_by: admin_user_id
  })
  .eq('id', technician_id)
```

## RLS Policies

### What Technicians Can See
```sql
-- Technician can view own verification
CREATE POLICY "Technicians can view own verification"
  ON technician_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Technician can update own pending verification
CREATE POLICY "Technicians can update pending verification"
  ON technician_profiles
  FOR UPDATE
  USING (auth.uid() = user_id AND verification_status = 'pending')
  WITH CHECK (auth.uid() = user_id AND verification_status = 'pending');
```

### What Admins Can See
```sql
-- Admins can view all technician verifications
CREATE POLICY "Admins can view all verifications"
  ON technician_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update verification status
CREATE POLICY "Admins can update verification status"
  ON technician_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Testing Scenarios

### Test 1: New Technician Onboarding
```
1. Login with technician test number: +2348012345678 (OTP: 654321)
2. Role selection: "I'm a Technician"
3. Profile setup: Name + avatar
4. Onboarding: Fill NIN, address, bank details
5. Expected: Redirected to "Verification Pending" screen
   ✓ Shows "Under Review" status
   ✓ Shows timeline with Submitted ✓
   ✓ Shows "Usually 24 hours"
```

### Test 2: Admin Approves Technician
```
1. Admin login
2. Admin tab → Verifications
3. Filter: "Pending" (should show 1)
4. Tap technician card
5. View details → [Approve]
6. Confirmation modal → [Approve]
7. Expected: 
   ✓ Technician moved to "Approved"
   ✓ Technician app refreshes
   ✓ Technician redirected to dashboard
   ✓ Technician can now see Jobs tab
```

### Test 3: Admin Rejects with Reason
```
1. Admin tab → Verifications
2. Filter: "Pending"
3. Tap technician → [Reject]
4. Enter reason: "NIN document is unclear"
5. [Reject]
6. Expected:
   ✓ Technician moved to "Rejected"
   ✓ Technician app refreshes
   ✓ Shows rejection reason on Pending screen
   ✓ [Resubmit Documents] button appears
```

### Test 4: Technician Resubmits After Rejection
```
1. Technician sees rejection reason
2. Taps [Resubmit Documents]
3. Goes back to onboarding
4. Updates information
5. Resubmits
6. Expected:
   ✓ Status goes back to 'pending'
   ✓ Rejection reason cleared
   ✓ Timeline resets
```

### Test 5: Multi-Technician Admin View
```
1. Have 3 technicians in different states:
   - Technician A: pending (created 2 hours ago)
   - Technician B: approved
   - Technician C: rejected
2. Admin view:
   - Filter "All": Shows 3
   - Filter "Pending": Shows 1 (A)
   - Filter "Approved": Shows 1 (B)
   - Filter "Rejected": Shows 1 (C)
3. Expected: All filters work correctly
```

## State Transitions

```
┌─────────────────────────────────────┐
│  New Technician Registration        │
└─────────────────┬───────────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  Verification    │
        │    PENDING       │
        │  (Under Review)  │
        └────┬─────────┬───┘
             │         │
        [Approve]  [Reject]
             │         │
             ▼         ▼
        ┌────────┐  ┌─────────┐
        │APPROVED│  │ REJECTED│
        │        │  │(w/reason)
        │Can     │  │         │
        │accept  │  │Can      │
        │jobs ✓  │  │resubmit │
        └────────┘  └────┬────┘
                         │
                    [Resubmit]
                         │
                         ▼
                    PENDING (again)
```

## Notifications (Future)

When verification status changes, technician should receive:
- **Approved**: "Great! Your verification is approved. You can now accept jobs."
- **Rejected**: "Your verification was rejected. Reason: [...]"

This would be implemented via:
- Push notification (expo-notifications)
- In-app notification
- Email notification

## Common Issues & Solutions

### Issue: Technician stuck on pending screen
**Cause**: DB query timeout or network error
**Solution**: 
- Check network connection
- Tap "Sign Out" → "Sign In" to refresh
- Admin can manually update DB if needed

### Issue: Admin can't see new technicians
**Cause**: RLS policy blocking access
**Solution**:
- Verify admin user has role = 'admin'
- Check RLS policies in Supabase dashboard
- Manual SQL check: `SELECT * FROM technician_profiles WHERE id = '<tech_id>'`

### Issue: Technician approved but still sees pending screen
**Cause**: App not refreshed after approval
**Solution**:
- App should auto-refresh when status changes
- Manual: Kill app and reopen
- Check TechnicianLayout.checkVerificationStatus() is running

---

**Status**: ✅ Implemented
**MVP Impact**: Critical - Required for technician onboarding
**Performance**: Minimal (single DB query on app load)
**Testing**: Use test scenarios above
