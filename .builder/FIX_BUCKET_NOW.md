# IMMEDIATE FIX: Create Bucket in Supabase

The code is ready. The bucket is NOT created. Follow these steps **RIGHT NOW**:

---

## Step 1: Go to Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Select your **UrbanFix** project
3. Click **SQL Editor** (left sidebar)

---

## Step 2: Run This SQL Command

Copy and paste this into the SQL Editor:

```sql
-- Create technician-documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-documents', 'technician-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Verify it was created
SELECT id, name, public FROM storage.buckets 
WHERE id = 'technician-documents';
```

Then click **Run** (or press Cmd+Enter).

---

## Step 3: Verify Success

You should see output like:
```
id                    | name                      | public
technician-documents  | technician-documents      | false
```

✅ If you see this, the bucket exists!

---

## Step 4: Test the App

Go back to the app:
1. Navigate to technician onboarding
2. Tap "Upload NIN Card/Slip"
3. Select an image
4. **Should upload successfully now** ✅

---

## If It Still Fails

**Error:** "Bucket not found"
**Reason:** Bucket not created yet
**Fix:** Run the SQL above in Supabase SQL Editor

**Error:** "Access denied" or permission error
**Reason:** RLS policies needed
**Fix:** Run this SQL after bucket is created:

```sql
-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to upload to their own paths
CREATE POLICY "Technicians can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technician-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own documents
CREATE POLICY "Technicians can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'technician-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Why This Happened

1. Migration code was commented out (we uncommented it)
2. But migrations don't auto-run in Supabase—they need to be executed
3. The code expects `technician-documents` bucket to exist
4. It didn't exist, so upload failed with "Bucket not found"

---

## What Changed in Code

✅ **Already Fixed:**
- ImagePicker API updated (no more warnings)
- Upload path scoped to user ID: `{userId}/nin-documents/file`
- Bucket name corrected: `technician-documents`

❌ **Still Needed:**
- Run bucket creation SQL in Supabase (THIS STEP)

---

## Checklist

- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Paste and run bucket creation SQL
- [ ] See confirmation: "1 row"
- [ ] Go back to app
- [ ] Test NIN upload
- [ ] ✅ Upload succeeds

**Time to complete:** 2-3 minutes
