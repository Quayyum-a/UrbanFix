# Storage Bucket Setup for UrbanFix

## Overview
The technician NIN document upload requires Supabase Storage buckets to be created and configured with Row-Level Security (RLS) policies.

## Setup Steps

### Step 1: Run Migration 002 (Buckets Creation)
The buckets are now created as part of `database/migrations/002_technician_verification_schema.sql`.

This migration has been updated to **uncomment and execute**:
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('technician-documents', 'technician-documents', false)
ON CONFLICT (id) DO NOTHING;
```

**These buckets will be created when the migration runs:**
- `technician-documents` (private) — NIN documents, verification files
- `job-photos` (private) — Job/repair photos
- `profile-photos` (public) — Profile avatars

### Step 2: Verify Buckets Exist
In Supabase Dashboard → Storage, you should see these 3 buckets.

**Or run this SQL to verify:**
```sql
SELECT id, name, public FROM storage.buckets 
WHERE id IN ('technician-documents', 'job-photos', 'profile-photos');
```

### Step 3: Create RLS Policies (Supabase SQL Editor)
**⚠️ IMPORTANT:** RLS policies must be created via Supabase SQL Editor, not migration files.

1. Go to **Supabase Dashboard → SQL Editor**
2. Open the file: `database/storage-setup.sql`
3. Copy all commands and paste into SQL Editor
4. Click **Run**

This creates policies that:
- Allow users to upload to their own `{userId}/*` paths
- Prevent users from accessing other users' files
- Allow admins to view all files

### Step 4: Test Upload
1. Register as technician
2. Go to technician onboarding
3. Tap "Upload NIN Card/Slip"
4. Select an image
5. ✅ Should upload successfully

---

## Troubleshooting

### Error: "Bucket not found"
**Solution:** Run migration 002, then verify buckets exist in Supabase Dashboard → Storage

### Error: "Access denied" on upload
**Solution:** Run `database/storage-setup.sql` in Supabase SQL Editor to create RLS policies

### Upload succeeds but file not retrievable
**Solution:** Verify RLS policies were created by running:
```sql
SELECT tablename, policyname FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

---

## Architecture

### Bucket Structure
```
technician-documents/
├── {userId}/
│   ├── nin-documents/
│   │   ├── document_1.jpg
│   │   └── document_2.jpg
│   └── other-docs/

job-photos/
├── {userId}/
│   └── job-{jobId}/
│       ├── photo_1.jpg
│       └── photo_2.jpg

profile-photos/
├── {userId}/
│   └── avatar.jpg
```

### RLS Policy Logic
- **Technicians:** Can only upload/read files in their own `{userId}/` folder
- **Admins:** Can read all files in any bucket
- **Public:** Can view profile photos (public bucket)

---

## File References

| File | Purpose |
|------|---------|
| `database/migrations/002_technician_verification_schema.sql` | Creates buckets (now uncommented) |
| `database/storage-setup.sql` | Creates RLS policies (run in Supabase SQL Editor) |
| `app/technician/onboarding.tsx` | Uses bucket `'technician-documents'` |

---

## Deployment Checklist

- [ ] Migration 002 has been applied to Supabase
- [ ] Verify buckets exist in Storage dashboard
- [ ] Run `storage-setup.sql` in Supabase SQL Editor
- [ ] Verify policies created (`SELECT * FROM pg_policies WHERE tablename = 'objects'`)
- [ ] Test NIN upload end-to-end
- [ ] Verify file is retrievable
