# Fix Admin Enum Error and Create Admin User

## Problem

You got this error:
```
ERROR:  22P02: invalid input value for enum user_role: "admin"
```

**Why?** A previous migration removed `'admin'` from the `user_role` enum. We need to add it back.

---

## Solution (5 minutes)

### Step 1: Run the Fix Script

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **+ New Query**
3. Copy the entire contents of **`FIX_ADMIN_ENUM_AND_CREATE_USER.sql`** file
4. Paste it into the SQL editor
5. Click **Run** button

The script will:
- ✅ Add `'admin'` back to the `user_role` enum
- ✅ Fix all policies that reference the enum
- ✅ Create the admin user (+2348066025051, PIN: 5555)
- ✅ Verify everything is in place

---

### Step 2: Log In as Admin

1. Open the UrbanFix app
2. Tap **Login**
3. Phone: **+2348066025051**
4. PIN: **5555**
5. ✅ You'll be redirected to the Admin Dashboard

---

## What the Script Does

```sql
-- 1. Removes the old user_role enum (customer, technician only)
-- 2. Creates new user_role enum (customer, technician, admin)
-- 3. Updates the users table to use the new enum
-- 4. Creates PIN record for admin
-- 5. Creates user record with role='admin'
-- 6. Recreates all policies
```

---

## Why This Happened

1. Initial schema (001): included `'admin'` role
2. Migration 002: Removed `'admin'` role (didn't need it then)
3. Now: We added admin dashboard, need the role back
4. Solution: Add it back with this migration

---

## Verification (Optional)

After running the script, you can verify it worked:

In Supabase SQL Editor, run these queries:

```sql
-- Check enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumlabel;

-- Should show:
-- admin
-- customer  
-- technician
```

```sql
-- Check admin user was created
SELECT phone, role, full_name FROM public.users 
WHERE phone = '+2348066025051';

-- Should show:
-- +2348066025051 | admin | Admin
```

---

## If You Get Another Error

### Error: "user_role already has admin"
- That's fine! The script uses `ON CONFLICT`, so it won't duplicate
- Just log in with your credentials

### Error: "Cannot drop type user_role"
- Run the script step by step instead of all at once
- Or wait a few minutes and try again (Postgres locks might be releasing)

### Error: "Cannot drop policy X"
- The policies might have different names
- The script handles this with `DROP POLICY IF EXISTS`
- Just run it again

---

## Admin Credentials

```
Phone: +2348066025051
PIN:   5555
Role:  admin
```

---

## What's Next

1. ✅ Run the SQL script
2. ✅ Log in as admin
3. ✅ Go to **Technician Approval** tab
4. ✅ Approve/reject technician registrations
5. ✅ Monitor platform from **Dashboard** tab

---

**That's it! The admin enum issue is fixed.** 🚀
