# RLS Policy Debug Checklist

The upload is failing with "row-level security policy" error even with simplified policies.

## Step 1: Verify What Policies Actually Exist

Go to **Supabase Dashboard → Storage → technician-documents bucket → Policies tab**

**You should see:**
- One INSERT policy
- One SELECT policy

**If you don't see them:**
- The policies weren't created
- Go back and create them again

**If you see them but upload fails:**
- The policy conditions are wrong

---

## Step 2: Check Policy Details

Click each policy and note:
- Policy name
- Command type (INSERT or SELECT)
- Target Roles (should be "authenticated")
- Conditions (what you see in the builder)

---

## Step 3: Temporary Test - Disable RLS Entirely

**Run this in Supabase SQL Editor:**

```sql
-- Disable RLS temporarily
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Check if RLS is disabled
SELECT * FROM pg_class 
WHERE relname = 'objects' 
AND rowsecurity = false;
```

**Then test upload in app:**
- If upload works → RLS policy is the problem
- If upload still fails → something else is wrong

---

## Step 4: If Upload Works Without RLS

Re-enable RLS and create working policy:

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policy
CREATE POLICY "Allow authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (true);
```

This allows ANY authenticated user to upload ANYTHING (least secure, but will test if RLS mechanism works).

---

## Step 5: If Still Fails

Check:
1. Is the user actually authenticated? (Check Supabase Auth Users table)
2. Is the auth token valid?
3. Are you using the correct Supabase URL/key?

---

## Quick Summary

| If Upload Fails | Try This |
|---|---|
| With RLS enabled | Disable RLS (Step 3) |
| Without RLS | Re-enable with `WITH CHECK (true)` (Step 4) |
| Still fails | Check user is authenticated |

---

## Nuclear Option: Delete & Recreate Everything

If nothing works, start fresh:

```sql
-- Delete all policies
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new policy with no conditions
CREATE POLICY "storage_upload_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "storage_read_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (true);
```

This allows any authenticated user to upload/read anything to any bucket.
