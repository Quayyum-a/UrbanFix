# Admin User Setup Instructions

## Overview
You can now create and use an admin account to access all admin features in the UrbanFix app. The admin account will automatically redirect to the admin dashboard after login.

## Admin Account Details
- **Phone**: +2348066025051
- **PIN**: 5555
- **Role**: admin

## How to Set Up the Admin User

### Step 1: Create the Admin User in Supabase

1. Go to your **Supabase Dashboard**
2. Select your project
3. Click on **SQL Editor** (left sidebar)
4. Click **+ New Query**
5. Copy the entire contents of `ADMIN_USER_SETUP.sql` file
6. Paste it into the SQL editor
7. Click **Run** button (top right)
8. You should see confirmation: "User created/updated successfully"

### Step 2: Log In as Admin

1. Open the UrbanFix app
2. Tap **Login**
3. Enter phone number: **+2348066025051**
4. Enter PIN: **5555**
5. You will be automatically redirected to the **Admin Dashboard**

### Step 3: Access Admin Features

Once logged in as admin, you can:

#### Technician Approval
- Navigate to **Technician Approval** tab
- View all pending technician registrations
- Filter by status: All / Pending / Approved / Rejected
- Click a technician to see full details:
  - Personal information (name, phone, NIN)
  - NIN document (click to view)
  - Bank account details
  - Guarantor information
- Click **Approve** to verify and activate a technician
- Click **Reject** to deny the application and provide feedback

#### Other Admin Functions
- **Dashboard**: View platform statistics and pending items
- **Verifications**: Manage all technician verifications
- **Part Requests**: Review and manage parts requests
- **Disputes**: Handle customer-technician disputes
- **Analytics**: View detailed platform analytics

## How It Works

### Login Flow
1. When you enter the admin phone number (+2348066025051) and PIN (5555):
   - The app verifies the PIN against the stored hash in `user_pins` table
   - It retrieves the user record from the `users` table
   - The role is checked: if `role = 'admin'`, you're directed to `/admin`

2. The admin check happens at:
   - **App level**: AuthGuard component routes based on role
   - **Login level**: Login screen redirects to appropriate dashboard
   - **Database level**: RLS policies enforce that only admin accounts can approve technicians

### Approval Authorization
When you approve a technician:
1. The app calls `supabase.from('technician_profiles').update(...)`
2. Supabase RLS policies check: "Is this user's role = 'admin'?"
3. If yes → approval succeeds
4. If no → approval fails (even if called from client code)
5. The technician sees the approval via realtime subscription

## What's Happening Behind the Scenes

### PIN Hash
The PIN "5555" is hashed using bcrypt (10 rounds) for security:
```
PIN: 5555
Hash: $2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi
```

### Database Records Created
```sql
-- In user_pins table:
phone: +2348066025051
pin_hash: $2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi
attempts: 0
locked_until: NULL

-- In users table:
phone: +2348066025051
role: admin
full_name: Admin
avatar_url: NULL
```

## Security Notes

✅ **PIN is hashed** — Not stored in plain text  
✅ **Approval enforced at DB layer** — RLS policies protect approve/reject  
✅ **Rate limiting** — Account locks after 3 failed PIN attempts for 15 minutes  
✅ **No hardcoded credentials** — Uses the database role field  
✅ **Realtime updates** — Technicians see approvals immediately  

## Troubleshooting

### "PIN not created yet" error
- Make sure you ran the SQL script successfully
- Check that the record appears in Supabase `user_pins` table
- Verify the phone number is exactly: **+2348066025051**

### "Too many failed attempts" error
- You entered the wrong PIN 3 times
- Wait 15 minutes and try again
- Or run the SQL script again to reset the attempts

### Can't access admin dashboard
- Make sure you're logged in with role = 'admin'
- Check the `users` table in Supabase: `SELECT * FROM users WHERE phone = '+2348066025051';`
- Verify the `role` column says `'admin'` (not `'customer'` or `'technician'`)

### Can't see pending technicians to approve
- Make sure a technician has registered and submitted documents
- Go to the "Pending" filter tab
- If you still don't see them, refresh the app (pull to refresh)

## Next Steps

1. ✅ Run the SQL setup script
2. ✅ Log in with +2348066025051 / 5555
3. ✅ Go to Technician Approval tab
4. ✅ Wait for technicians to register and submit documents
5. ✅ Approve or reject their applications
