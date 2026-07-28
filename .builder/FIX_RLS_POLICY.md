# Fix RLS Policy Error

You got: `new row violates row-level security policy`

This means the bucket exists ✅ but the RLS policy is blocking uploads.

---

## Quick Fix (1 minute)

### Step 1: Go to Supabase SQL Editor

Same place as before:
- Supabase Dashboard → SQL Editor

### Step 2: Copy & Paste This

```sql
-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload to their own paths
CREATE POLICY "Users can upload to own paths"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technician-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'technician-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Click Run

### Step 4: Go Back to App & Test

NIN upload should now work ✅

---

## How It Works

The policy checks:
- ✅ Bucket is `technician-documents`
- ✅ File path starts with your user ID: `{userId}/nin-documents/...`
- ✅ You're authenticated

**Your upload path:** `695135ba-d407-4fc3-b48b-d5bc8bef85b7/nin-documents/file.jpg`
**Policy checks:** First folder level = `695135ba-d407-4fc3-b48b-d5bc8bef85b7` ✅

---

## If You Still Get RLS Error After This

Run this to verify the policies exist:

```sql
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;
```

Should see policies for:
- `Users can upload to own paths`
- `Users can read own files`

---

## Summary

| Step | Status | What To Do |
|------|--------|-----------|
| 1. Create bucket | ✅ Done | You ran the INSERT SQL |
| 2. Enable RLS | ⏳ Do Now | Run ALTER TABLE... |
| 3. Create policies | ⏳ Do Now | Run CREATE POLICY... (2 policies) |
| 4. Test upload | ⏳ Test | Should work after step 3 |

Total time: **1-2 minutes**
