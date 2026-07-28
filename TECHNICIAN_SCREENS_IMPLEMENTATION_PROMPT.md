# Technician Screens Implementation Prompt

## Overview
Build complete technician dashboard and management screens following the UrbanFix design system. The technician experience has 4 main sections: Dashboard (earnings + jobs), Jobs, Pricing (in profile), and Profile settings.

## Design System
- **Colors**: Primary (#031636 deep blue), Secondary (#ff5722 orange), Success (#2ecc71 green)
- **Typography**: Headers: bold 18-24px, Body: regular 14-16px
- **Components**: Card-based layout, minimal shadows, 1px borders, rounded corners 8-12px
- **Spacing**: 16px padding, 12px gaps between elements
- **Pattern**: Real data from database, auto-refresh via Supabase subscriptions

---

## Database Context

### Core Tables
- `users` - Full name, phone, role ('technician'), avatar_url
- `technician_profiles` - NIN, bank details, verification_status, is_available, shop_address
- `technician_pricing` - technician_id, repair_category, device_type, labour_price (in kobo)
- `parts_catalogue` - device_brand, device_model, repair_category, part_name, part_price (in kobo)
- `jobs` - customer_id, technician_id, device_brand, device_model, repair_category, part_price, labour_price, total_price, status, created_at
- `parts_requests` - **NEW** technician_id, job_id, part_id, quantity, status (pending/approved/rejected), admin_notes, created_at, approved_at, rejection_reason
- `payments` - job_id, amount, status (pending/escrowed/released/refunded)
- `reviews` - job_id, reviewer_id, reviewee_id, rating, comment, created_at

### Repair Categories
Examples: "Screen Replacement", "Battery Replacement", "Hard Drive Repair", "Water Damage", "Software Issue"

### Device Types
Examples: "Phone", "Laptop", "Tablet", "Desktop"

---

## Screen Requirements

### 1. DASHBOARD (app/technician/index.tsx)
**Purpose**: Quick overview of earnings, active jobs, and key metrics

**Sections**:

#### A. Earnings Card (Top)
- Total earnings this month (sum of released payments)
- Display format: ₦5,234,500 (formatted currency in kobo ÷ 100)
- Subtitle: "Available balance" or "This month"
- Icon: money/wallet icon

#### B. Quick Stats (2-column grid)
- **Active Jobs**: Count of jobs with status in ['booked', 'paid', 'pickup_scheduled', 'device_received', 'repair_started', 'awaiting_release']
- **Completed Jobs**: Count of jobs with status = 'complete'
- **Avg Rating**: Average of all reviews where reviewee_id = technician (from reviews table)
- **Jobs This Week**: Count of jobs created in last 7 days

#### C. Recent Jobs (List, max 5 items)
- Show: device (brand + model), customer name, status badge, timeago
- Tap to view job details (modal or navigate)
- Order by created_at DESC
- Status colors: booked=blue, paid=yellow, repair_started=orange, complete=green, disputed=red

#### D. No Jobs Message (if empty)
- Empty state with icon
- Text: "No active jobs yet"
- Button: "Browse Available Jobs"

**Data Loading**:
- Load on mount with loading spinner
- Real-time subscription to jobs table where technician_id = current user
- Pull-to-refresh

---

### 2. JOBS TAB (app/technician/jobs/index.tsx)
**Purpose**: Browse and manage repair jobs

**Layout**:

#### A. Filter/Search Section
- Dropdown: "All" | "Active" | "Completed"
- Search input: search by customer name or device brand
- Sort: "Recent" | "Oldest" | "Highest Price"

#### B. Job Card (List Item)
For each job show:
- Customer avatar (from users table) or placeholder
- Customer name
- Device: "iPhone 13 - Screen Replacement"
- Status badge with color
- Estimated/Actual completion time
- Amount (total_price formatted)
- Tap action: open job detail modal/screen

#### C. Job Detail Modal (when tapped)
Show full details:
- Customer name & phone (with call button)
- Device details (brand, model, category)
- Parts & pricing breakdown:
  - Part name + part_price
  - Labour price (labour_price)
  - Platform fee (if applicable)
  - Total price
- Job status
- Action buttons (based on status):
  - "Accept Job" (if status = 'booked')
  - "Confirm Payment Received" (if status = 'paid')
  - "Mark as Started" (if status = 'pickup_scheduled' or 'device_received')
  - "Mark as Complete" (if status = 'repair_started')
  - "Request Release" (if status = 'awaiting_release')
  - "Request Part" (available when status = 'device_received' or 'repair_started')
    → Opens modal to select part and quantity, ties request to this job_id
  - "Dispute" (if status = any - for disputes)

#### D. Empty State
- Icon + "No jobs available"
- Button to browse available jobs (if feature exists)

---

### 3. PART REQUESTS TAB (app/technician/part-requests.tsx)
**Purpose**: Manage part requests for active jobs (Request → Admin Review → Approval/Rejection)

**Important**: Part requests are ONLY created for jobs that the technician is already working on. Each request is tied to a specific job_id.

**Layout**:

#### A. Filter Section
- Tabs: "All" | "Pending" | "Approved" | "Rejected"
- Badge with count on each tab
- Show request date range (optional)

#### B. Part Request Card (List Item)
For each part_request show:
- Part name (what part is needed)
- Linked job info:
  - Customer name
  - Device: "iPhone 13 - Screen Replacement"
  - Job ID (as reference)
- Status badge:
  - Yellow = Pending (awaiting admin review)
  - Green = Approved (can proceed to order)
  - Red = Rejected (with rejection reason)
- Request date (when requested)
- Estimated arrival date (if approved)

#### C. Part Request Detail View (when tapped)
Show:
- Part details:
  - Part name
  - Part category
  - Requested quantity
  - Estimated cost
- Job details:
  - Full job info (customer, device, repair category)
  - Job status
  - Link to full job (tap to view job detail)
- Request timeline:
  - Requested: [date]
  - Approved: [date] (if approved)
  - Rejected: [date + reason] (if rejected)
- Status and admin notes

#### D. Request Part Flow (initiated from Job Detail Modal)
1. Technician taps "Request Part" in job detail
2. Modal opens with:
   - Pre-filled job_id
   - Dropdown to select part from parts_catalogue
   - Quantity input (default 1)
   - Optional notes for admin
3. Confirm button creates part_request with:
   - part_id (from parts_catalogue)
   - job_id (linked to active job)
   - technician_id (current user)
   - quantity
   - status: 'pending'
   - created_at
   - admin_notes (optional)

#### E. Empty State
- Icon + "No part requests yet"
- Text: "Request parts for your active jobs"
- Button: "Go to Jobs" (navigate to jobs tab)

**Data Loading**:
- Load all part_requests WHERE technician_id = current_user
- Order by created_at DESC
- Join with jobs table to get job details
- Join with parts_catalogue to get part names/prices
- Real-time subscription to part_requests table

---

### 4. PROFILE TAB (app/technician/profile.tsx)
**Purpose**: Manage profile, pricing, availability, and view ratings

**Sections** (in order):

#### A. Profile Header
- Avatar image (with edit button to change photo)
- Full name (editable)
- Phone number (read-only)
- Edit button → edit modal for name

#### B. Availability Toggle
- Large toggle switch: "Available for Jobs"
- Status text below: "You are online" or "You are offline"
- When disabled, technician doesn't appear in job matching

#### C. Professional Info (editable section)
- Shop address (text input)
- Years of experience (number input) - optional
- Specializations (checkboxes or multi-select):
  - Phone Repair
  - Laptop Repair
  - Tablet Repair
  - Desktop Repair
  - Networking
  - Software Services

#### D. Ratings & Reviews
- Average rating (e.g., 4.8 ⭐)
- Total reviews count
- Breakdown: 5⭐ (count) | 4⭐ (count) | 3⭐ (count) | 2⭐ (count) | 1⭐ (count)
- "View All Reviews" button → opens reviews list (modal or navigate)

#### E. Pricing Management (Major Section)
**Structure**: 
- Dropdown to select device type: "Phone" | "Laptop" | "Tablet" | "Desktop"
- When selected, show parts for that device with pricing

**For each device type**:
1. **Fixed Parts with Catalogue Prices** (read-only):
   - Example for Phone:
     - Screen Replacement: ₦15,000 (from parts_catalogue)
     - Battery Replacement: ₦5,000
     - Charging Port: ₦8,000
   - Example for Laptop:
     - Hard Drive Replacement: ₦25,000
     - RAM Upgrade: ₦12,000
     - Screen Replacement: ₦20,000

2. **Labour Pricing** (editable per repair category):
   - For each repair_category (Screen Replacement, Battery, etc.):
     - Input field for labour_price (in kobo, display as ₦X,XXX)
     - Example: "Screen Replacement labour: ₦3,000"
     - Save button after editing
   - If no labour price set yet, show "Tap to set price"
   - Note: These are inserted/updated in technician_pricing table

3. **Add Custom Prices** (optional/future):
   - Button: "+ Add Custom Part"
   - Input: part name, price
   - Store in separate table or part of pricing logic

**Save Flow**:
- Changes auto-save or have explicit "Save Pricing" button
- Show success toast on save
- Real-time sync via Supabase

#### F. Bank Details (view-only or minimal edit)
- Bank name
- Account number (masked except last 4 digits)
- Account holder name
- "Edit" button → opens edit modal (if needed for updates)
- Note: These are verified during onboarding; changing requires re-verification

#### G. Sign Out Button
- Clear logout button at bottom
- Clears auth session and redirects to login

---

## Navigation Flow

```
Technician Root
├── Dashboard (index.tsx)
│   └── Quick overview, earnings, recent jobs
│   └── Tap job → Job Detail Modal
│
├── Jobs Tab (jobs/index.tsx)
│   ├── Browse/filter all jobs
│   ├── Tap job → Job Detail Modal
│   ├── Update job status
│   └── Request Part button (in job detail)
│       └── Creates part_request tied to job_id
│
├── Part Requests Tab (part-requests.tsx) - NEW
│   ├── List of all part requests made by this technician
│   ├── Filter: Pending | Approved | Rejected
│   ├── Each request shows:
│   │   ├── Part name
│   │   ├── Job link (device + customer name)
│   │   ├── Status badge
│   │   ├── Request date
│   │   └── Admin notes (if rejected)
│   └── Tap to view request details & linked job info
│
├── Profile Tab (profile.tsx)
│   ├── Edit profile info
│   ├── Manage pricing by device type
│   ├── View ratings & reviews
│   ├── Toggle availability
│   └── Sign out
│
└── Verification Pending Screen (if status != 'approved')
    └── Show verification status & redirect on approval
```

---

## Data Requirements

### Real Data Sources
- **Earnings**: SUM of payments.amount WHERE status='released' AND job.technician_id = current_user
- **Jobs**: All jobs WHERE technician_id = current_user, ordered by created_at DESC
- **Ratings**: AVG(reviews.rating) WHERE reviewee_id = current_user
- **Pricing**: technician_pricing records for current_user

### Real-time Updates
- Jobs list: Subscribe to jobs table where technician_id = current user
- Earnings: Subscribe to payments table for released payments
- Ratings: Subscribe to reviews table for new reviews (optional)

### No Hardcoded Data
- All numbers, names, prices must come from database
- Show loading states while fetching
- Handle empty states gracefully

---

## UI/UX Requirements

### Styling
- Follow UrbanFix design system (see constants/theme.ts)
- Card-based components with 1px borders (#e5e9eb)
- Subtle shadows: shadowOpacity 0.05, shadowRadius 4
- Rounded corners: 8-12px
- Spacing: 16px padding, 12px gaps

### Components to Use
- TouchableOpacity for buttons/interactive elements
- Modal for detail views
- FlatList for lists with pull-to-refresh
- ActivityIndicator for loading states
- SafeAreaView for safe areas (from react-native-safe-area-context)

### States to Handle
- Loading (initial fetch)
- Empty states (no jobs, no reviews, no pricing set)
- Error states (network errors, load failures)
- Success states (toast/alerts on save)
- Disabled states (when technician not verified or not available)

### Interactions
- Tap to view details
- Swipe to refresh (pull-to-refresh)
- Edit fields with inline save
- Status updates with confirmation
- All real-time via Supabase subscriptions

---

## Business Logic

### Job Status Flow
Technician sees jobs at these statuses:
1. `booked` - Job accepted by platform, waiting for technician to confirm
2. `paid` - Payment received, technician can start
3. `device_received` - Device received from customer
4. `repair_started` - Technician working on device
5. `awaiting_release` - Work done, waiting for customer approval
6. `complete` - Job finished, rated
7. `disputed` - Customer disputed, under review

### Earnings Calculation
- Displayed in kobo in database, shown as ₦ with kobo ÷ 100
- Only count payments with status = 'released'
- Sum by month (created_at)

### Pricing Rules
- Labour prices set per repair_category and device_type combination
- Part prices come from parts_catalogue (read-only for technician)
- Total job price = part_price + labour_price + platform_fee (calculated on job creation)

---

## Error Handling & Edge Cases

- Technician not verified → show verification pending screen, disable all actions
- No internet → show offline message, allow cached data view
- Pricing not set → show prompt "Set pricing to accept jobs"
- Old/stale data → use real-time subscriptions for auto-refresh
- Concurrent edits → show latest data, handle conflicts gracefully

---

## Accessibility

- Minimum touch target 44px
- High contrast text (WCAG AA+)
- Semantic labels for interactive elements
- Loading states must be announced

---

## Testing Checklist

- [ ] Dashboard loads real earnings from database
- [ ] Jobs list shows all technician jobs and updates in real-time
- [ ] Job detail modal displays correct information
- [ ] Pricing can be set per device type and saved to database
- [ ] Ratings display correctly with star breakdown
- [ ] Profile edits persist to database
- [ ] Availability toggle works correctly
- [ ] Sign out clears session and redirects
- [ ] Empty states show appropriately
- [ ] Loading states appear during data fetch
- [ ] Real-time subscriptions work (changes appear without refresh)
- [ ] Pull-to-refresh works
- [ ] No hardcoded data visible

---

## Notes

- Technician screens should mirror admin design aesthetics for consistency
- All prices in database are in kobo; convert for display (÷ 100)
- Use existing color scheme and typography from constants/theme.ts
- Reuse existing components where possible (buttons, cards, modals)
- Follow Expo Router patterns already established in codebase
