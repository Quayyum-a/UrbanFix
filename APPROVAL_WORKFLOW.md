# Technician Approval Workflow

## Overview

UrbanFix uses a lightweight, in-app approval mechanism for technician registrations. The founder can review and approve pending technician applications directly from the admin panel—no separate admin dashboard required.

## User Journeys

### For Technicians
1. Technician registers → fills onboarding form → uploads NIN document
2. System inserts `technician_profiles` and `technician_verifications` records with `status = 'pending'`
3. Technician is redirected to `/technician/verification-pending` screen
4. Screen displays "Under Review" message with timeline
5. When status changes to `'approved'` or `'rejected'`, technician receives realtime notification via Supabase subscription
6. If approved: redirected to pricing setup, then to dashboard
7. If rejected: shown rejection reason and option to resubmit

### For the Founder (Admin)
1. Log in with an account that has `role = 'admin'` in the `users` table
2. Navigate to Admin → "Technician Approval" tab (or "Verifications")
3. View list of pending technicians with:
   - Full name, phone, NIN
   - Bank account details (for payment setup)
   - Guarantor information
   - NIN document (click to view/download)
   - Approval/Rejection buttons
4. Click a technician to see full details in a modal
5. Click "Approve" to set `verification_status = 'approved'` on both tables
6. Click "Reject" to set `verification_status = 'rejected'` and provide a rejection reason
7. Technician sees the change in realtime (powered by Supabase realtime subscriptions)

## Technical Implementation

### Database Authorization (RLS Policies)

Approval/rejection writes are protected **at the database layer**, not just the client:

- **`technician_profiles` update policy**: Only admins (users with `role = 'admin'`) can update `verification_status`
- **`technician_verifications` update policy**: Only admins can update `status`, `rejection_reason`, `reviewed_at`, `reviewed_by`

The admin check happens server-side in Supabase PostgreSQL, so even if someone tries to call the API directly from another client or device, the RLS policy will deny the write.

### Realtime Synchronization

When an approval/rejection is made:

1. Founder clicks "Approve" → calls `supabase.from('technician_profiles').update({...})`
2. The update succeeds (because the founder's account has `role = 'admin'`)
3. Supabase broadcasts a `postgres_changes` event to all clients subscribed to that table
4. The technician's app is already subscribed via:
   ```typescript
   .channel(`verification_${userProfile?.id}`)
   .on('postgres_changes', {
     event: 'UPDATE',
     schema: 'public',
     table: 'technician_verifications',
     filter: `user_id=eq.${userProfile?.id}`
   }, (payload) => {
     // Handle status change
   })
   ```
5. Technician sees the alert immediately (no rebuild, no manual refresh needed)

## Files Involved

- **`app/admin/_layout.tsx`**: Admin navigation, includes "Technician Approval" tab
- **`app/admin/technician-approval.tsx`**: Main approval screen (list, filter, approve/reject logic)
- **`app/technician/verification-pending.tsx`**: Technician's waiting screen (listens for realtime updates)
- **`database/migrations/`**: RLS policies on `technician_profiles` and `technician_verifications`

## How to Use (Step-by-Step)

1. **Ensure you have admin access**: Your user account must have `role = 'admin'` in Supabase
   - If not, go to Supabase dashboard → `users` table → edit your row → set `role` to `'admin'`

2. **Open the app as admin** and navigate to the Admin dashboard

3. **Click the "Technician Approval" tab** (or "Verifications" if using the older screen)

4. **View pending technicians**: The "Pending" filter shows only `status = 'pending'` records

5. **Tap a technician** to see full details (NIN doc, bank info, guarantor)

6. **Click "Approve"** to set their status to `'approved'`
   - Confirmation dialog will appear
   - Once confirmed, both `technician_profiles.verification_status` and `technician_verifications.status` are updated

7. **Or click "Reject"** to provide feedback
   - Modal asks for rejection reason
   - Reason is stored and sent to the technician

8. **Technician sees the change in realtime** on their device

## Security Notes

- ✅ Approval/rejection enforced at database layer (RLS)
- ✅ Only users with `role = 'admin'` can approve technicians
- ✅ Rejection reasons are stored in the database (audit trail)
- ✅ No hardcoded admin IDs; uses the `users.role` column
- ✅ Realtime updates mean no stale data on technician devices

## Future Enhancements

- Email notifications to technicians on approval/rejection
- Bulk approval actions
- Approval SLA tracking (e.g., average time to review)
- Reviewer comments or flags for follow-up
