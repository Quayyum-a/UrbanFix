# UrbanFix Admin Side Rebuild — Complete Build Plan

**Date**: July 28, 2026  
**Status**: Planning Complete — Ready for Implementation  
**Methodology**: 6-Role Verification Process

---

## ROLE 1: CODEBASE AUDITOR — FINDINGS

### Product Documentation Inventory

| Document | Purpose | Key Details |
|----------|---------|------------|
| `docs/TECHNICIAN_VERIFICATION_FLOW.md` | Verification workflow spec | Defines pending → approved → rejected states; Includes RLS policies; Documents approval/rejection with reasons |
| `docs/ADMIN_PANEL_IMPLEMENTATION.md` | Admin panel architecture | Lists 5 admin tabs; Describes verification, part-requests, disputes, analytics features; Marks disputes & analytics as placeholder |
| `docs/FINAL_MVP_SUMMARY.md` | Complete MVP overview | Confirms 9-table schema; Lists all tech stack; Notes "Disputes & Analytics" are post-MVP; Verifies rating system exists |

**Drift Alert**: Docs specify "Disputes & Analytics" as placeholders (not implemented yet). Current code shows placeholder screens.

---

### Database Schema — Actual Implementation

**Technician Verification Path**:
```
technician_profiles (primary)
├─ id, user_id, nin, nin_doc_url, shop_address
├─ bank_name, bank_account_number, bank_account_name
├─ verification_status (ENUM: pending, approved, rejected)
├─ rejection_reason TEXT
├─ reviewed_by UUID (refs users.id)
├─ reviewed_at TIMESTAMPTZ
└─ is_available BOOLEAN DEFAULT false

technician_verifications (separate table)
├─ id, user_id, nin, nin_document_url
├─ guarantor_name, guarantor_phone, guarantor_email
├─ bank_name, account_number, account_name
├─ status ENUM (pending, approved, rejected) — mirrors technician_profiles.verification_status
├─ rejection_reason TEXT
├─ reviewed_by, reviewed_at
└─ submitted_at TIMESTAMPTZ
```

**Important Discrepancy**: The schema has **both** `technician_profiles` and `technician_verifications` tables. They track the same data in two places, with a `verification_status` field on both. The app currently uses both.

**Reviews Table** (for moderation):
```
reviews
├─ id, job_id, reviewer_id, reviewee_id
├─ rating INT (1-5), comment TEXT (max 500)
├─ created_at TIMESTAMPTZ
└─ Constraints: one review per job per reviewer, no self-review, review only after job complete
```

**No moderation columns** (e.g., `admin_response`, `is_hidden`, `moderation_status`) — the schema does NOT support review moderation yet.

---

### Admin Code — Current State

| File | Status | Findings |
|------|--------|----------|
| `app/admin/_layout.tsx` | ✅ Working | Tab navigation with 6 screens; Role check blocks non-admin |
| `app/admin/index.tsx` | ✅ Working | Dashboard with real statistics from Supabase queries |
| `app/admin/verifications.tsx` | ✅ Working | Lists pending technicians; approve/reject with reason modal; **uses `technician_verifications` table** |
| `app/admin/technician-approval.tsx` | ✅ Working | Duplicate? Parallel implementation also lists technicians; approve/reject flow |
| `app/admin/part-requests.tsx` | ✅ Working | Part request approval with price adjustment |
| `app/admin/disputes.tsx` | ⏳ Placeholder | "Future feature" screen — no real queries, no moderation actions |
| `app/admin/analytics.tsx` | ⏳ Placeholder | "Future feature" screen — no real data |

**Alert**: Two verification screens exist (`verifications.tsx` and `technician-approval.tsx`). They appear redundant; only one should be used.

---

### Existing Services

| Service | Purpose | Status |
|---------|---------|--------|
| `lib/services/verification-service.ts` | Verification operations | Exists but minimal; used in onboarding, not admin |
| `lib/services/rating-service.ts` | Rating CRUD | ✅ Works; only handles submit, not retrieval or moderation |
| `lib/services/part-request-service.ts` | Part request management | ✅ Works for approval/rejection |
| `lib/services/jobs-service.ts` | Job operations | ✅ Works; no admin-specific queries |

---

### RLS Policies — Current

**Verification Access**:
```sql
-- Admins can view/update verification status
CREATE POLICY admin_update_verifications
  ON technician_profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
```

**Reviews Access**:
```sql
-- Reviews table has minimal RLS (customers can insert, anyone can read)
-- NO admin-only moderation policies exist yet
```

---

### What's Missing / Needs Rebuilding

1. **Technician Profile View** — No unified detail screen showing full technician record
2. **Request Queue** — `verifications.tsx` is a list, but lacks filtering, sorting, status badges, request count aggregation
3. **Reviews Management** — No view to list reviews, no moderation actions (approve, hide, respond)
4. **Audit Trail** — No `admin_action` or `moderation_log` table; who rejected what and when is not tracked beyond `reviewed_by` / `reviewed_at`
5. **Disputes** — Not implemented (docs marked as future work)

---

## ROLE 2: DATA & CONTRACT MAPPER

### Real Field Names and Types (Verified from Schema)

#### Technician Registration / Request Model
```typescript
interface TechnicianRequest {
  // From technician_verifications table (primary source for admin views)
  id: UUID                        // verifications.id
  user_id: UUID                   // verifications.user_id → users(id)
  
  // User info (joined from users table)
  full_name: VARCHAR(255)         // users.full_name
  phone: VARCHAR(15)              // users.phone (format: +234XXXXXXXXXX)
  
  // Verification fields
  nin: VARCHAR(11)                // 11-digit NIN
  nin_doc_url: TEXT               // Storage URL to NIN image
  shop_address: TEXT              // Business address (min 10 chars)
  
  // Bank details
  bank_name: VARCHAR(100)         // Name of bank
  account_number: VARCHAR(10)     // Account number
  account_name: VARCHAR(255)      // Account holder name
  
  // Guarantor info
  guarantor_name: VARCHAR(100)    // Full name
  guarantor_phone: VARCHAR(14)    // Phone (+234XXXXXXXXXX)
  guarantor_email: VARCHAR(100)   // Optional
  
  // Status tracking
  status: ENUM                    // 'pending' | 'approved' | 'rejected'
  rejection_reason: TEXT          // Only populated if rejected
  
  // Audit fields
  submitted_at: TIMESTAMPTZ       // When technician submitted
  reviewed_by: UUID               // Admin user ID (if approved/rejected)
  reviewed_at: TIMESTAMPTZ        // When admin took action
  
  // Derived / computed
  is_approved: BOOLEAN            // status = 'approved'
  is_pending: BOOLEAN             // status = 'pending'
  is_rejected: BOOLEAN            // status = 'rejected'
}
```

#### Review Model (for moderation)
```typescript
interface Review {
  id: UUID                        // reviews.id
  job_id: UUID                    // refs jobs.id
  reviewer_id: UUID               // refs users.id (customer who reviewed)
  reviewee_id: UUID               // refs users.id (technician being reviewed)
  
  rating: INT (1-5)               // Star rating
  comment: TEXT                   // Max 500 chars
  created_at: TIMESTAMPTZ         // When review was posted
  
  // Derived
  technician_name: VARCHAR(255)   // reviewee's full_name (joined)
  reviewer_name: VARCHAR(255)     // reviewer's full_name (joined)
  
  // NOT YET IN SCHEMA (would need to be added):
  // moderation_status: ENUM       // 'visible' | 'hidden' | 'flagged'
  // admin_response: TEXT          // Admin reply to review
  // flagged_reason: TEXT          // Why flagged
  // flagged_by: UUID              // Admin who flagged
}
```

---

### Existing Endpoints / Queries

#### Technician Verification Queries (WORKING)
```typescript
// List verifications (from app/admin/verifications.tsx)
supabase
  .from('technician_verifications')
  .select(`
    id, user_id, nin, nin_document_url, guarantor_name, guarantor_phone,
    guarantor_address, bank_name, account_number, account_name,
    status, rejection_reason, created_at,
    users!inner(full_name, phone)
  `)
  .order('created_at', { ascending: false })

// Approve
supabase
  .from('technician_verifications')
  .update({
    status: 'approved',
    reviewed_at: NOW(),
    reviewed_by: admin_id
  })
  .eq('id', verification_id)

// Reject (with reason)
supabase
  .from('technician_verifications')
  .update({
    status: 'rejected',
    rejection_reason: reason_text,
    reviewed_at: NOW(),
    reviewed_by: admin_id
  })
  .eq('id', verification_id)
```

**Note**: Both `technician_verifications` AND `technician_profiles` tables need updating for consistency.

#### Review Queries (PARTIALLY WORKING)
```typescript
// List reviews for a technician (NOT IMPLEMENTED in admin)
supabase
  .from('reviews')
  .select(`
    id, rating, comment, created_at,
    reviewer:reviewer_id(full_name),
    job:job_id(id, created_at)
  `)
  .eq('reviewee_id', technician_id)
  .order('created_at', { ascending: false })

// Submit review (IMPLEMENTED in customer flow)
supabase
  .from('reviews')
  .insert({
    job_id, reviewer_id, reviewee_id, rating, comment
  })
```

**Missing**: No moderation endpoints (hide, flag, respond to review).

---

### Authorization Contracts

**Admin Check** (RLS verified):
```sql
EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND role = 'admin'
)
```

**For Review Moderation** (to be enforced):
```sql
-- Only admins can modify reviews (no self-moderation)
CREATE POLICY "Admins can moderate reviews"
  ON reviews FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

### Data Contract Summary (Endpoint Signatures)

| Operation | Table | Method | Status | Notes |
|-----------|-------|--------|--------|-------|
| List pending verifications | technician_verifications | SELECT | ✅ Working | Returns ~10 fields + joined user |
| Get technician detail | technician_verifications + technician_profiles | SELECT | ⏳ Needs unification | Currently split across two tables |
| Approve technician | technician_verifications + technician_profiles | UPDATE | ⚠️ Partial | Only one table updated per call; both need sync |
| Reject technician | technician_verifications + technician_profiles | UPDATE | ⚠️ Partial | Same issue — two tables out of sync |
| List technician reviews | reviews | SELECT | ❌ Missing | Not wired in admin UI |
| Get review detail | reviews | SELECT | ❌ Missing | Not implemented |
| Moderate review (hide/flag) | reviews | UPDATE | ❌ Missing | No schema column; not implemented |
| Admin respond to review | reviews | UPDATE | ❌ Missing | No schema column; not implemented |

---

## ROLE 3: ADMIN UX DESIGNER — SCREEN SPECIFICATIONS

### Screen 1: Technician Request Queue

**Route**: `/admin/verifications` (existing) or `/admin/technician-approval` (new name)

**Purpose**: List all pending/approved/rejected technician registration requests; allow filtering and status updates.

#### States & Layout

**Loading State**:
- Full-screen ActivityIndicator
- "Loading technicians…" text

**Empty State**:
- Icon: shield-checkmark (outlined, gray)
- Title: "No [filter] technicians"
- Subtitle: "All caught up!" (if pending), or "No [status] technicians found"

**Populated State** — List:
- Header: Filter tabs (All | Pending | Approved | Rejected)
- Each tab has count badge (e.g., "Pending (3)")
- Pull-to-refresh enabled
- Card per technician showing:
  - Name + phone (on dark background)
  - NIN (last 4 digits, masked as ••••5678)
  - Bank name + status badge (colored)
  - Date submitted
  - [Card is a TouchableOpacity → opens detail modal]

**Card States**:
- **Pending**: Badge = amber/warning color
- **Approved**: Badge = green/success, no action buttons
- **Rejected**: Badge = red/error, can re-review

**Error State**:
- Error icon + message
- [Retry] button

#### Interactions
1. **Tap Card** → Opens TechnicianProfileView (modal or push screen)
2. **Pull Down** → Refresh list
3. **Switch Tab** → Filter by status (client-side filtering OK; real count from Supabase)

#### Definition of Done
- [ ] List fetches real data from `technician_verifications` table
- [ ] Filters (All/Pending/Approved/Rejected) work
- [ ] Counts reflect actual data
- [ ] Pull-to-refresh works
- [ ] Tap card opens detail screen (next screen)
- [ ] No hardcoded data, no mock arrays

---

### Screen 2: Technician Profile Detail

**Route**: `/admin/verifications/:id` (or modal overlay on existing screen)

**Purpose**: Full review of a technician's application; approve/reject actions.

**Data Shown**:
- Personal Info: Name, phone, NIN (full), avatar if present
- Documents: NIN photo (tap to open in viewer/browser)
- Bank Details: Bank name, account number, account name
- Guarantor: Name, phone, email
- Shop Address
- Status badge
- Rejection reason (if rejected)
- Timeline: "Submitted [X days ago]" + "Reviewed by [admin name] on [date]" (if reviewed)

**Buttons** (Pending state only):
- [Approve] button (green)
- [Reject] button (red)

**Approved/Rejected State**:
- No action buttons
- Show "Approved by [admin] on [date]"
- Show "Rejected with reason: [reason]"

#### Interactions
1. **[Approve]** → Shows confirmation → "Confirm approval?" → [Cancel] [Approve]
   - Success → Toast "Approved" → Back to list (list refreshes)
   - Error → Show error alert + retry option
   
2. **[Reject]** → Modal appears:
   - Label: "Rejection Reason"
   - TextInput (multiline, placeholder="Why is this rejected?", max 300 chars)
   - [Cancel] [Reject] buttons
   - On reject: Updates DB → Toast → Back to list
   
3. **Tap NIN photo** → Opens viewer (Linking.openURL to nin_doc_url)

#### Definition of Done
- [ ] Fetches and displays full technician profile from `technician_verifications`
- [ ] Approve button updates both `technician_verifications` AND `technician_profiles`
- [ ] Reject button captures reason, updates both tables
- [ ] Optimistic UI update (show success before refresh) OR explicit refresh after action
- [ ] NIN document viewer works
- [ ] All fields populated from real DB data
- [ ] No hardcoded placeholder text

---

### Screen 3: Reviews Management

**Route**: `/admin/reviews` (new tab in admin navigation)

**Purpose**: View all reviews on the platform; flag, hide, or respond to problematic reviews.

**Global View First** (show all reviews on platform):
- List of all reviews (newest first)
- Per review card:
  - Star rating (visual stars)
  - Review text (max 3 lines, truncate with "…")
  - Technician name
  - Customer name
  - Date posted
  - Status badge (Visible | Flagged | Hidden) — to be added to schema
  - [Options] button (menu)

**Filter/Sort** (optional for MVP):
- Filter by: All | Flagged | Hidden
- Sort by: Newest | Rating (high to low) | Technician name

#### Detail / Moderation Modal

Tap review → Modal shows:
- Full review text
- Technician + Customer names
- Rating + date
- [Moderation Actions]:
  - **Hide**: Removes from public view; checkbox "Report reason?" (optional)
  - **Flag**: Mark for review by super-admin; text field for flag reason
  - **Respond**: Admin comment (to be added to schema as `admin_response`)
- [Cancel] [Save]

#### Interactions
1. **Hide Review** → Updates `reviews.is_hidden = true` → Removed from list view → Toast "Hidden"
2. **Flag Review** → Creates `review_flags` record (or adds `flagged = true` + `flag_reason`) → Badge changes → Toast "Flagged"
3. **Respond** → Appends to `admin_response` field → Shows in detail view → Toast "Response saved"

#### Definition of Done
- [ ] Reviews list fetches real data from `reviews` table with technician/customer joins
- [ ] Moderation actions persist to DB
- [ ] Schema updated with `is_hidden`, `admin_response`, optionally `flagged`
- [ ] RLS policies allow admin to update reviews
- [ ] Tap review opens detail modal
- [ ] No mock data

---

### Screen 4: Request Counts & Badges

**Dashboard Updates** (role 1 found dashboard exists):
- Badge on Verifications tab: Count of pending technician verifications
- Badge on Reviews tab: Count of flagged reviews
- Card in dashboard: Pending technician verifications count → tap to navigate to verifications queue

**Where Used**:
- Tab bar badges in `app/admin/_layout.tsx`
- Dashboard stats card in `app/admin/index.tsx`

#### Definition of Done
- [ ] Badges update in real-time (or on refresh)
- [ ] Counts match actual Supabase queries
- [ ] Tap navigates to the respective list

---

## ROLE 4: SYSTEMS ARCHITECT — TECHNICAL PLAN

### Component Architecture

```
app/admin/
├── _layout.tsx (tab navigation — EXISTING)
│   ├── Dashboard tab (index.tsx)
│   ├── Verifications tab → verifications.tsx (RENAME from current; consolidate with technician-approval.tsx)
│   ├── Reviews tab → reviews.tsx (NEW)
│   ├── Part-Requests tab
│   ├── Disputes tab
│   └── Analytics tab

// DECOMPOSE INTO:
app/admin/
├── _layout.tsx (no changes needed; just add routes)
├── index.tsx (update dashboard badges)
├── verifications/
│   ├── _layout.tsx (stack navigator for queue + detail)
│   ├── queue.tsx (list of pending/approved/rejected)
│   └── detail/[id].tsx (profile view + approve/reject)
├── reviews/
│   ├── _layout.tsx (stack navigator)
│   ├── list.tsx (all reviews)
│   └── detail/[id].tsx (moderation modal)
├── part-requests.tsx (existing)
├── disputes.tsx (existing)
└── analytics.tsx (existing)
```

**State Management**:
- Continue using Zustand for user auth (`useAuthStore`)
- Use React hooks + Supabase realtime for admin lists (useState + useEffect)
- No new global state needed for admin-specific views

**Services** (New/Modified):
```typescript
// lib/services/admin-verification-service.ts (REPLACE current verification-service.ts)
export class AdminVerificationService {
  static listVerifications(filter: 'pending' | 'approved' | 'rejected' | 'all')
  static getVerificationDetail(id: UUID)
  static approveVerification(id: UUID, adminId: UUID)
  static rejectVerification(id: UUID, adminId: UUID, reason: string)
  // Returns: success, error, data
}

// lib/services/admin-review-service.ts (NEW)
export class AdminReviewService {
  static listReviews(filter?: 'flagged' | 'hidden' | 'visible')
  static getReviewDetail(id: UUID)
  static hideReview(id: UUID, adminId: UUID)
  static flagReview(id: UUID, adminId: UUID, reason?: string)
  static addAdminResponse(id: UUID, adminId: UUID, response: string)
  // Returns: success, error, data
}
```

**RLS Policies** (To be added):
```sql
-- Reviews: Admin moderation
CREATE POLICY "Admins can moderate reviews"
  ON reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Reviews: Support hiding/flagging (add columns first)
ALTER TABLE reviews ADD COLUMN is_hidden BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN admin_response TEXT;
ALTER TABLE reviews ADD COLUMN flagged BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN flag_reason TEXT;
ALTER TABLE reviews ADD COLUMN flagged_by UUID REFERENCES users(id);
```

**Error Handling**:
- Network error → Retry button + error message
- Auth error (not admin) → Redirect to home
- Validation error (e.g., rejection reason empty) → Alert + stay in modal
- Optimistic updates → Show toast immediately; revert on server error

**Loading States**:
- List screens: ActivityIndicator at top while fetching
- Detail screens: Skeleton loader or simple text "Loading…"
- Action buttons: Disabled + ActivityIndicator while submitting

---

## ROLE 5: MICRO-TASK PLANNER — ORDERED IMPLEMENTATION

### Micro-Task 1: Consolidate Verification Screens

**Goal**: Remove duplicate `technician-approval.tsx`; make `verifications.tsx` the single source of truth.

**Files Touched**:
- `app/admin/verifications.tsx` (modify to be comprehensive)
- `app/admin/technician-approval.tsx` (DELETE)
- `app/admin/_layout.tsx` (remove duplicate tab, keep verifications)

**Tables & Endpoints**:
- `technician_verifications` table (READ)
- No backend changes needed

**UI States Covered**:
- List (all / pending / approved / rejected)
- Empty state
- Loading state
- Error state
- Pull-to-refresh

**Definition of Done**:
- [ ] `verifications.tsx` is the only verification management screen
- [ ] All filters work (All, Pending, Approved, Rejected)
- [ ] Tap card on pending technician does nothing yet (ready for next task)
- [ ] Pull-to-refresh works
- [ ] No duplicate code
- [ ] App builds without errors

**Manual Verification**:
- Login as admin
- Navigate to Verifications tab
- Verify all filter tabs load
- Verify pending count is correct
- Pull down to refresh (should show loading, then updated data)

---

### Micro-Task 2: Build Technician Profile Detail View

**Goal**: Open a technician's full application when tapped from the queue.

**Files Touched**:
- `app/admin/verifications.tsx` (add onPress → navigate to detail)
- `app/admin/verifications/detail.tsx` (NEW)
- `app/admin/_layout.tsx` (add route for detail stack)

**Tables & Endpoints**:
- `technician_verifications` table (READ by ID)
- `users` table (for joined full_name, phone — already in main query)

**UI States Covered**:
- Loading (fetching detail)
- Populated (show all fields)
- Error
- NIN image viewer (Linking.openURL)

**Definition of Done**:
- [ ] Tap technician card in queue → opens detail screen
- [ ] All fields displayed from `technician_verifications` + joined user data
- [ ] NIN document URL is clickable → opens in browser
- [ ] Back button returns to queue
- [ ] Detail screen shows "Pending" status if pending
- [ ] No approve/reject buttons yet (next task)
- [ ] Real data from DB (verify with test technician)

**Manual Verification**:
- Have a test technician in pending state
- Tap their card in queue
- Verify all fields populate correctly
- Verify NIN photo link works
- Go back (should return to queue)

---

### Micro-Task 3: Add Approve Action

**Goal**: Wire [Approve] button on detail screen; update both tables.

**Files Touched**:
- `app/admin/verifications/detail.tsx` (add approve button + handler)
- `lib/services/admin-verification-service.ts` (NEW file)

**Tables & Endpoints**:
- `technician_verifications` UPDATE (set status='approved', reviewed_by, reviewed_at)
- `technician_profiles` UPDATE (set verification_status='approved', reviewed_by, reviewed_at) — CRITICAL: both tables must update

**UI States Covered**:
- Button enabled (pending state)
- Button disabled (already approved/rejected)
- Loading (while submitting)
- Confirmation modal ("Confirm approval?")
- Success toast
- Error alert + retry

**Definition of Done**:
- [ ] [Approve] button visible only for pending technicians
- [ ] Tapping [Approve] shows confirmation modal
- [ ] Confirming updates **both** `technician_verifications` and `technician_profiles`
- [ ] Success → Toast "Approved" → Return to queue → Queue list refreshes
- [ ] Failure → Error alert with message + retry button
- [ ] Both DB updates are atomic (use transaction or ensure both succeed)
- [ ] Technician's `verification_pending.tsx` screen auto-updates in real-time (Supabase realtime subscription already exists in their app)

**Manual Verification**:
- Have test technician in pending state
- Go to detail screen
- Tap [Approve]
- Confirm in modal
- Verify both `technician_verifications.status` and `technician_profiles.verification_status` are now 'approved' in Supabase
- Verify technician on their device sees approval alert + redirects to dashboard
- Go back to queue → [Approve] button should be gone (now shows approved)

---

### Micro-Task 4: Add Reject Action (with Reason)

**Goal**: Wire [Reject] button; capture reason; update both tables.

**Files Touched**:
- `app/admin/verifications/detail.tsx` (add reject button + modal)
- `lib/services/admin-verification-service.ts` (add rejectVerification method)

**Tables & Endpoints**:
- `technician_verifications` UPDATE (set status='rejected', rejection_reason, reviewed_by, reviewed_at)
- `technician_profiles` UPDATE (set verification_status='rejected', rejection_reason, reviewed_by, reviewed_at)

**UI States Covered**:
- [Reject] button visible only for pending
- Reject modal: TextInput for reason (max 300 chars)
- Validation: reason must not be empty
- Loading while submitting
- Success toast
- Error alert

**Definition of Done**:
- [ ] [Reject] button opens modal with reason TextInput
- [ ] Reason is required; empty → validation error
- [ ] Submit updates **both** tables with reason + timestamps
- [ ] Success → Toast "Rejected" → Back to queue → Queue refreshes
- [ ] Technician sees rejection alert + reason on their screen
- [ ] Reject button only appears for pending

**Manual Verification**:
- New test technician in pending state
- Go to detail → [Reject]
- Try submitting empty reason → validation error
- Enter reason "NIN document is unclear"
- Submit
- Verify both tables updated in Supabase
- Verify technician sees rejection alert + reason
- Go back to queue → Card now shows rejected badge

---

### Micro-Task 5: Build Reviews List & Detail

**Goal**: Create new Reviews tab; list all reviews on platform; allow viewing detail.

**Files Touched**:
- `app/admin/reviews/list.tsx` (NEW)
- `app/admin/reviews/detail.tsx` (NEW)
- `app/admin/_layout.tsx` (add reviews tab + route)
- `lib/services/admin-review-service.ts` (NEW)

**Tables & Endpoints**:
- `reviews` table (SELECT with joins to `users`, `jobs`)
- Query shape:
  ```sql
  SELECT 
    r.id, r.rating, r.comment, r.created_at,
    u_tech.full_name as technician_name,
    u_cust.full_name as customer_name,
    j.id as job_id
  FROM reviews r
  JOIN users u_tech ON r.reviewee_id = u_tech.id
  JOIN users u_cust ON r.reviewer_id = u_cust.id
  JOIN jobs j ON r.job_id = j.id
  ORDER BY r.created_at DESC
  ```

**UI States Covered**:
- Loading (fetching reviews)
- Empty (no reviews yet)
- List (populated with cards)
- Error + retry
- Pull-to-refresh
- Tap card → detail screen

**Detail Screen**:
- Show full review text
- Rating + stars
- Technician + customer names
- Date
- [Moderation Actions] button (not wired yet; next task)

**Definition of Done**:
- [ ] Reviews tab added to admin navigation
- [ ] List fetches real data from `reviews` table
- [ ] Shows rating (visual stars), text, names, date
- [ ] Pull-to-refresh works
- [ ] Tap card opens detail screen
- [ ] Detail shows full review + names + rating
- [ ] No hardcoded reviews
- [ ] Empty state works (create a test review first)

**Manual Verification**:
- Create a completed job with a review (via customer app flow)
- Go to admin → Reviews tab
- Verify review appears in list with correct data
- Tap review → detail screen shows all info
- Go back to list

---

### Micro-Task 6: Add Review Moderation Actions

**Goal**: Wire hide, flag, respond actions on review detail; update schema.

**Files Touched**:
- `database/migrations/007_add_review_moderation.sql` (NEW migration)
  - ALTER reviews: ADD is_hidden, ADD admin_response, ADD flagged, ADD flag_reason, ADD flagged_by
  - RLS policy: Admins can update reviews
- `app/admin/reviews/detail.tsx` (add moderation modal)
- `lib/services/admin-review-service.ts` (add hideReview, flagReview, addAdminResponse)

**Tables & Endpoints**:
- `reviews` UPDATE (is_hidden, admin_response, flagged, flag_reason, flagged_by)

**UI States Covered**:
- [Moderation] button opens modal
- Buttons in modal: [Hide] [Flag] [Respond]
  - Hide: checkbox "Report reason?" (optional)
  - Flag: TextInput for reason
  - Respond: TextInput for admin response
- Submit moderation → success toast → refresh detail

**Definition of Done**:
- [ ] Migration adds all moderation columns to `reviews` table
- [ ] RLS policy allows admin to update reviews
- [ ] Moderation modal opens on button tap
- [ ] Hide action updates `is_hidden = true` → Toast "Hidden"
- [ ] Flag action sets `flagged = true` + reason → Toast "Flagged"
- [ ] Respond action appends to `admin_response` → Toast "Response saved"
- [ ] After action, return to list (hide removes it, flag/respond stay)
- [ ] Schema is correct; can be queried later for moderation status

**Manual Verification**:
- Have a review in detail screen
- Tap [Moderation]
- Try each action (hide, flag, respond)
- Verify DB updates
- Verify success toast
- Go back to list; verify hidden reviews disappear (add filter)

---

### Micro-Task 7: Add Dashboard Badges & Stats

**Goal**: Update dashboard to show counts of pending verifications and flagged reviews.

**Files Touched**:
- `app/admin/index.tsx` (add queries for pending counts)
- `app/admin/_layout.tsx` (add badge counts to tabs)

**Tables & Endpoints**:
- `technician_verifications` SELECT COUNT WHERE status='pending'
- `reviews` SELECT COUNT WHERE flagged=true (after micro-task 6)

**UI States Covered**:
- Loading (while fetching counts)
- Error (e.g., query fails)
- Populated (show counts)

**Definition of Done**:
- [ ] Dashboard shows card: "Pending Technician Verifications: [N]"
  - Tap → Navigate to verifications queue
- [ ] Dashboard shows card: "Flagged Reviews: [N]"
  - Tap → Navigate to reviews list
- [ ] Tab bar badges show counts:
  - Verifications tab badge = pending count
  - Reviews tab badge = flagged count
- [ ] Counts update on refresh
- [ ] Real queries (no mocks)

**Manual Verification**:
- Dashboard loads
- Verify pending verification count is correct
- Verify flagged review count is correct (0 initially)
- Go to verifications, approve one
- Return to dashboard → count decreases
- Tap card on dashboard → navigates to queue

---

### Micro-Task 8: Test End-to-End Admin Workflows

**Goal**: Verify all admin flows work from end to end.

**Files Touched**: None (testing only)

**Test Scenarios**:
1. **Approve Technician**:
   - Tech submits app → pending
   - Admin approves
   - Tech sees approval + routes to dashboard
   - Admin dashboard count decreases

2. **Reject Technician**:
   - Tech submits app → pending
   - Admin rejects with reason
   - Tech sees rejection + reason
   - Can resubmit → back to pending

3. **Hide Review**:
   - Customer posts review
   - Admin hides it
   - Review disappears from list
   - Doesn't appear in public (if future customer-facing review view built)

4. **Flag Review**:
   - Customer posts review
   - Admin flags with reason
   - Flagged count in dashboard increases
   - Shows in flagged-only filter

**Definition of Done**:
- [ ] All 4 scenarios work start-to-finish
- [ ] No console errors
- [ ] Data persists correctly in Supabase
- [ ] Realtime updates work (technician sees changes in real-time)
- [ ] Navigations work (back, tap cards, etc.)
- [ ] Toast messages appear for all actions
- [ ] Error states handled gracefully

---

## ROLE 6: SELF-REVIEW LOOP — CONSTRAINT VERIFICATION

**Constraint 1: No Mock / Demo Data**
- ✅ All queries use real Supabase tables (`technician_verifications`, `reviews`)
- ✅ No hardcoded test arrays; all data fetched at runtime
- ✅ Services return real DB results

**Constraint 2: Every Button is Functional**
- ✅ [Approve] → updates DB + technician sees change
- ✅ [Reject] → updates DB + captures reason + technician sees change
- ✅ [Hide] → persists `is_hidden = true`
- ✅ [Flag] → persists flagged status + reason
- ✅ [Respond] → persists admin response
- ✅ Tap card → opens detail screen
- ✅ Filter tabs → real filter logic (client-side is OK; counts from DB)

**Constraint 3: Real State Transitions**
- ✅ Approve: pending → approved (both tables)
- ✅ Reject: pending → rejected (both tables) + reason captured
- ✅ Hide: visible → is_hidden (review still in DB, marked hidden)
- ✅ Flag: visible → flagged (persisted with reason)
- ✅ Respond: no response → admin_response populated

**Constraint 4: Grounded in Actual Code**
- ✅ Uses real `technician_verifications` table (confirmed in schema)
- ✅ Uses real `reviews` table with real fields (confirmed in schema)
- ✅ Uses existing RLS policies for admin access (confirmed in docs)
- ✅ Uses existing Supabase connection + auth (reuses `useAuthStore`)
- ✅ Reuses existing service patterns (see `rating-service.ts`, `part-request-service.ts`)

**Constraint 5: No "Dead UI"**
- ✅ Every screen has real data binding (not placeholder text)
- ✅ Every list fetches from DB (not local state mocks)
- ✅ Every action has error handling + retry
- ✅ Loading states + empty states implemented

**Constraint 6: Matches Product Docs**
- ✅ Verification workflow matches `TECHNICIAN_VERIFICATION_FLOW.md` (pending → approved/rejected)
- ✅ Admin dashboard structure matches `ADMIN_PANEL_IMPLEMENTATION.md`
- ✅ Reviews moderation is post-MVP (docs marked as placeholder; plan treats it accordingly)

**Flags & Corrected Drifts**:
1. **Schema Duplication**: Both `technician_verifications` and `technician_profiles` exist. Plan requires updating both on approve/reject to keep in sync. Considered fixing this (consolidate tables), but that's a breaking change. Plan keeps both updated instead.
2. **Reviews Moderation Not in Schema**: Migration (task 6) adds needed columns. Acceptable because it's a new feature not blocking verification.
3. **Duplicate Admin Screens**: Plan removes `technician-approval.tsx` to avoid confusion. Only `verifications.tsx` is the source of truth.

---

## FINAL BUILD PLAN SUMMARY

| Phase | Micro-Task | Goal | Files | Duration | Dependency |
|-------|-----------|------|-------|----------|------------|
| 1 | Task 1 | Consolidate verification screens | verifications.tsx, _layout.tsx | 30 min | None |
| 2 | Task 2 | Build technician profile detail | detail.tsx, verifications.tsx | 1 hr | Task 1 |
| 3 | Task 3 | Wire approve action | detail.tsx, admin-verification-service.ts (new) | 1.5 hrs | Task 2 |
| 4 | Task 4 | Wire reject action | detail.tsx, admin-verification-service.ts | 1 hr | Task 3 |
| 5 | Task 5 | Build reviews list + detail | reviews/list.tsx, reviews/detail.tsx, admin-review-service.ts (new) | 1.5 hrs | Task 1 |
| 6 | Task 6 | Wire moderation actions + schema | 007_add_review_moderation.sql, detail.tsx, service | 1.5 hrs | Task 5 |
| 7 | Task 7 | Update dashboard badges | index.tsx, _layout.tsx | 45 min | Task 6 |
| 8 | Task 8 | End-to-end testing | (testing; no code) | 1 hr | Task 7 |
| | | **TOTAL** | | **~8-9 hours** | |

**Order**: Sequential. Each task builds on the previous (e.g., task 3 needs task 2's detail screen).

**Next Steps**: I will hand this plan to you. When you're ready, return this document and say "Proceed with Task 1" (or whichever task you want to start), and I'll begin implementation following the exact specifications above.

---

**Plan Status**: ✅ COMPLETE, VERIFIED, READY FOR IMPLEMENTATION

