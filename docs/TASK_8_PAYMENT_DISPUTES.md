# Task 8: Job Payment & Dispute Handling

**Status**: ✅ COMPLETED  
**Commit**: c404fbc

## Overview

Task 8 implements the complete payment lifecycle including payment release, dispute resolution, and customer rating/review system. This protects both customers and technicians while ensuring fair compensation.

## Architecture

### Services

#### PaymentService (`lib/services/payment-service.ts`)

**Payment Release Workflow**:
```typescript
releasePayment(jobId)
  → Verify job status = 'awaiting_release'
  → Update status = 'complete'
  → Transfer funds to technician's bank account
```

**Auto-Release After 72 Hours**:
```typescript
autoReleasePayment(jobId)
  → Check if 72+ hours since completion
  → Auto-release if no customer action
  → Notify both parties
```

**Dispute Handling**:
```typescript
initiateDispute(request: DisputeRequest)
  → Create dispute record with reason + evidence
  → Update job status = 'disputed'
  → Freeze payment pending admin review

resolveDispute(disputeId, resolution: DisputeResolution)
  → Admin decides split (customer refund, tech payment, or custom split)
  → Execute payment distribution
  → Close dispute and mark job 'complete'
```

#### RatingService (`lib/services/rating-service.ts`)

**Rating & Review**:
```typescript
submitRating(request: RatingRequest)
  → Create rating record (1-5 stars)
  → Store optional review (max 500 chars)
  → Auto-update technician's average rating

getTechnicianRatings(technicianId)
  → Fetch all ratings with customer names
  → Sort by newest first
  → Shows linked job info

getTechnicianRatingSummary(technicianId)
  → Average rating (0.0-5.0)
  → Total reviews count
  → Completed jobs count
```

### Hooks

#### usePayment Hook (`hooks/usePayment.ts`)
- `getPaymentInfo()` - Fetch payment details with auto-release eligibility
- `releasePayment()` - Customer releases payment
- `autoReleasePayment()` - 72-hour auto-release
- `initiateDispute()` - Customer initiates dispute
- `resolveDispute()` - Admin resolves with split decision

#### useRating Hook (`hooks/useRating.ts`)
- `submitRating()` - Customer rates technician
- `getTechnicianRatings()` - Fetch technician's reviews
- `getRatingSummary()` - Get rating statistics
- `canRateJob()` - Check if job can be rated
- `getJobRating()` - Get rating for specific job

## Complete Payment & Dispute Flow

### Phase 1: Repair Completion

```
Job Status: repair_started
    ↓
Technician marks job complete
    ↓
Job Status → awaiting_release
    ↓
Customer notified to release payment
```

### Phase 2: Customer Reviews Repair (2 options)

#### Option A: Customer Satisfied (Happy Path)

```
Customer reviews repair ✓
    ↓
Customer taps "Release Payment"
    ↓
Confirmation dialog
    ↓
Payment released to technician's bank account
    ↓
Job Status → complete
    ↓
Rating prompt
    ↓
Customer rates technician (⭐⭐⭐⭐⭐)
    ↓
Optional written review (max 500 chars)
    ↓
Technician's average rating updated
    ↓
Review visible on technician profile
```

#### Option B: Customer Unsatisfied (Dispute Path)

```
Customer reviews repair ✗
    ↓
Customer initiates "Dispute"
    ↓
Dispute form:
  • Reason for dispute (required, min 30 chars)
  • Evidence photos (optional, up to 10)
  ↓
Job Status → disputed
Payment frozen (no release yet)
    ↓
Admin notified of dispute
    ↓
Admin reviews dispute context:
  • Full chat history
  • Device photos
  • Repair category
  • Agreed price
  • Customer description
    ↓
Admin decides resolution:
  
  OPTION 1: Full Refund
  ├─ Customer gets: ₦44,000 (100%)
  └─ Technician gets: ₦0
  
  OPTION 2: Full Payment to Tech
  ├─ Customer gets: ₦0
  └─ Technician gets: ₦40,000 (100%)
  
  OPTION 3: Custom Split
  ├─ Customer gets: ₦22,000 (50%)
  └─ Technician gets: ₦20,000 (50%)
    ↓
Admin executes payment
    ↓
Job Status → complete
    ↓
Both parties notified of resolution
```

### Phase 3: Auto-Release (If Customer Unresponsive)

```
Job Status: awaiting_release (72+ hours)
    ↓
Scheduled job runs every hour:
  IF (current_time - completion_time) >= 72 hours
    → Auto-release payment to technician
    → Update job status = 'complete'
    → Notify both parties of auto-release
    ↓
Technician receives payment
    ↓
Job marked complete
```

## Database Schema

### jobs table (extended for payment)

```sql
CREATE TABLE jobs (
  -- ... existing fields ...
  
  -- Payment
  part_price DECIMAL,
  labour_price DECIMAL,
  platform_fee DECIMAL,
  total_price DECIMAL,
  payout_amount DECIMAL,
  
  -- Status tracking
  status: 'booked' | 'paid' | 'repair_started' 
        | 'awaiting_release' | 'complete' | 'disputed' | 'cancelled'
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP
)
```

### disputes table (new)

```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  reason TEXT,
  evidence_photos TEXT[],
  
  -- Resolution
  status: 'pending_review' | 'resolved'
  resolution_type: 'customer_refund' | 'technician_payment' | 'split'
  customer_amount DECIMAL,
  technician_amount DECIMAL,
  resolution_notes TEXT,
  
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
)
```

### ratings table (new)

```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  technician_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES users(id),
  rating INTEGER (1-5),
  review TEXT (max 500 chars),
  
  created_at TIMESTAMP
)
```

## Key Features

✅ **Safe Payment Escrow**
- Funds held by platform until repair confirmed
- Can't be released without customer approval
- Auto-released after 72 hours to prevent indefinite holds

✅ **Fair Dispute Resolution**
- Admin reviews full context before deciding
- Multiple resolution options (refund, payment, split)
- Both parties notified of outcome
- Transparent process

✅ **Comprehensive Rating System**
- 5-star rating system
- Optional written reviews (max 500 chars)
- Automatic average calculation
- Reviews visible on technician profile
- Motivates quality work

✅ **Protection for Both Parties**
- Customer: Can dispute if unsatisfied
- Technician: Gets paid for completed work (auto-release after 72h)
- Platform: Holds funds safely and fairly distributes

## Payment Timeline Example

```
Day 1:
  14:00 - Payment confirmed (job.status = 'paid')
  14:05 - Technician notified, starts repair

Day 2:
  10:30 - Repair completed
  10:30 - Technician marks complete
  10:30 - Job Status → 'awaiting_release'
  10:31 - Customer notified, sees "Release Payment" button

Day 2 - 4 Options:

Option A (Happy Path - 15:00):
  15:00 - Customer releases payment
  15:00 - Payment transferred to technician
  15:00 - Job Status → 'complete'
  15:01 - Rating prompt shown
  15:05 - Customer rates 5 stars + positive review

Option B (Dispute - 11:00):
  11:00 - Customer initiates dispute
  11:00 - Job Status → 'disputed'
  11:01 - Admin notified
  14:30 - Admin reviews and resolves (50/50 split)
  14:31 - Payment distributed
  14:32 - Both notified

Option C (Slow to Respond - 72+ hours):
  +72h  - Auto-release triggered
  +72h  - Payment released to technician
  +72h  - Job Status → 'complete'
  +72h  - Both notified of auto-release

Option D (Cancels Before Payment):
  11:00 - Customer changes mind
  11:00 - Taps "Cancel Booking"
  11:00 - Job Status → 'cancelled'
  11:01 - Payment refunded immediately
```

## Dispute Resolution Example

**Scenario**: Customer says screen still flickering after replacement

```
Dispute Initiated:
├─ Reason: "Screen replacement but still flickering, not fixed"
├─ Evidence: 3 photos showing flickering display
└─ Job: Samsung S21 screen replacement, paid ₦44,000

Admin Review:
├─ Checks chat history (customer confirmed flickering 2 days before)
├─ Checks technician response (tech offered troubleshooting)
├─ Checks job photos (screen installed properly)
└─ Decides: Issue is software not hardware, tech should get paid

Resolution:
├─ Type: Full Payment to Technician
├─ Customer: ₦0 refund
├─ Technician: ₦40,000 (100%)
├─ Notes: "Flickering is software issue. Recommend customer reset phone."
└─ Both notified with explanation
```

## Rating Display

### Technician Profile Shows:

```
Technician Name: John's Repair Shop

⭐⭐⭐⭐⭐ 4.8 / 5.0
(42 reviews • 87 completed jobs)

Recent Reviews:
├─ ⭐⭐⭐⭐⭐ "Perfect! Fixed my iPhone battery fast"
│  - Alice M. • 2 days ago
│
├─ ⭐⭐⭐⭐⭐ "Excellent service, very professional"
│  - Bob T. • 1 week ago
│
└─ ⭐⭐⭐⭐ "Good work, bit slow on communication"
   - Carol K. • 2 weeks ago
```

## Implementation Status

✅ **PaymentService**
- Get payment info
- Release payment
- Auto-release logic
- Initiate dispute
- Resolve dispute

✅ **RatingService**
- Submit rating
- Get technician ratings
- Calculate average rating
- Check rating eligibility
- Get job rating

✅ **Hooks for UI Integration**
- usePayment - Payment operations
- useRating - Rating operations

⏳ **UI Screens (to be built)**
- Payment release confirmation screen
- Dispute submission form
- Admin dispute review & resolution
- Rating prompt screen
- Technician rating display

## Testing Scenarios

### Scenario 1: Happy Path (Customer Happy)
1. Complete repair
2. Customer releases payment
3. Payment transferred
4. Customer rates 5 stars
5. Review visible on profile

### Scenario 2: Dispute & Resolution
1. Complete repair
2. Customer initiates dispute
3. Admin reviews evidence
4. Admin splits 50/50
5. Both get payment notifications

### Scenario 3: Auto-Release
1. Complete repair
2. Customer doesn't respond for 72+ hours
3. Auto-release triggered
4. Technician paid
5. Both notified

### Scenario 4: Refund (Admin Decision)
1. Customer disputes
2. Admin reviews
3. Admin decides full refund
4. Customer refunded
5. Technician gets nothing (but can appeal)

## Edge Cases Handled

✅ Customer initiates dispute mid-release  
✅ Multiple disputes on same job (rejected)  
✅ Rating after dispute resolution  
✅ Auto-release during active dispute (prevented)  
✅ Payment release called twice (idempotent)  
✅ Technician leaves before payment release  
✅ Customer submits rating before release (queued)

---

**Branch**: main  
**Commit**: c404fbc  
**Date**: July 11, 2026
