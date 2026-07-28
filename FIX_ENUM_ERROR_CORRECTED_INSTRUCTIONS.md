# Fix Admin Enum Error - Corrected Version

## The Error You Got

```
ERROR: 2BP01: cannot drop type user_role_old 
because other objects depend on it

DETAIL: function get_user_role() depends on type user_role_old
```

**Why?** The function `get_user_role()` was still using the old enum type.

---

## Solution: Use the Corrected Script

### Step 1: Delete the Failed Changes

If the previous script partially ran, you may have a corrupted state. To be safe, let's work with a fresh script.

### Step 2: Run the Corrected Script

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **+ New Query**
3. Copy the **entire** contents of **`FIX_ADMIN_ENUM_CORRECTED.sql`**
4. Paste it into the editor
5. Click **Run**

---

## What This Script Does (Fixed)

✅ **Drops dependent policies first** — Before touching the enum  
✅ **Drops dependent view** — `technician_performance_leaderboard`  
✅ **Drops the function** — `get_user_role()` (THE KEY STEP!)  
✅ **Creates new enum** — With 'admin', 'customer', 'technician'  
✅ **Migrates data** — Copies old values to new column  
✅ **Recreates function** — Now uses the new enum  
✅ **Recreates policies** — All 4 policies  
✅ **Recreates view** — Leaderboard view  
✅ **Creates admin user** — Phone: +2348066025051, PIN: 5555  

---

## Why This Version Works

The previous script failed because:
- ❌ It tried to drop the enum while function still depended on it

This corrected version:
- ✅ Drops the function FIRST
- ✅ Then drops the enum
- ✅ Then recreates the function with the new enum

PostgreSQL is happy and everything works.

---

## After Running the Script

### Log in as Admin

1. Open the app
2. Tap **Login**
3. Phone: **+2348066025051**
4. PIN: **5555**
5. ✅ Go to Admin Dashboard

### Verify It Worked (Optional)

Run these queries in SQL Editor:

```sql
-- Check enum has all 3 values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumlabel;

-- Should show: admin, customer, technician
```

```sql
-- Check admin user exists
SELECT phone, role, full_name FROM public.users 
WHERE phone = '+2348066025051';

-- Should show: +2348066025051 | admin | Admin
```

---

## If You Still Get an Error

### Error: "Cannot create type, it already exists"
- This is OK - it means a partial run succeeded
- The script has `ON CONFLICT` clauses to handle this
- Just run it again

### Error: "Cannot drop function"
- Make sure you're running the FULL corrected script, not a partial one
- Copy the ENTIRE contents of `FIX_ADMIN_ENUM_CORRECTED.sql`

### Error: "Unexpected error"
- Let me know the exact error message
- We can debug from there

---

## Files

- ✅ **`FIX_ADMIN_ENUM_CORRECTED.sql`** — Use this one (fixed version)
- ❌ `FIX_ADMIN_ENUM_AND_CREATE_USER.sql` — Don't use (has the bug)
- ❌ `SIMPLE_FIX_ADMIN_ENUM.sql` — Don't use (also has the bug)

**Use the CORRECTED version!**

---

## Quick Checklist

- [ ] Copy `FIX_ADMIN_ENUM_CORRECTED.sql`
- [ ] Go to Supabase SQL Editor
- [ ] Create new query
- [ ] Paste the entire script
- [ ] Click Run
- [ ] ✅ Done! No more error
- [ ] Log in with +2348066025051 / 5555

**That's it!** 🚀
