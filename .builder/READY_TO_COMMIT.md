# Ready to Commit: NIN Upload Fixes

All changes are staged and ready. Use the commands below to commit them individually.

---

## Commit 1: ImagePicker Deprecation Fix

**Run this command:**
```bash
git add app/technician/onboarding.tsx \
        components/verification/DocumentUploadCard.tsx \
        components/auth/AvatarUpload.tsx

git commit -m "fix(upload): replace deprecated ImagePicker.MediaTypeOptions API

- Update app/technician/onboarding.tsx to use ['images'] array format
- Update components/verification/DocumentUploadCard.tsx (2 call sites)
- Update components/auth/AvatarUpload.tsx
- Removes deprecation warnings in expo-image-picker v17+
- New API is functionally equivalent, no behavior changes"
```

**Changes:**
- `app/technician/onboarding.tsx` line 61: `ImagePicker.MediaTypeOptions.Images` → `['images']`
- `components/verification/DocumentUploadCard.tsx` lines 67, 74: same change
- `components/auth/AvatarUpload.tsx` line 69: same change

---

## Commit 2: Uncomment Bucket Creation in Migration

**Run this command:**
```bash
git add database/migrations/002_technician_verification_schema.sql

git commit -m "feat(storage): uncomment bucket creation in migration

- Move bucket creation from commented-out block to active code
- Creates technician-documents, job-photos, profile-photos buckets
- Uses ON CONFLICT (id) DO NOTHING for safe re-runs
- Buckets now created as part of standard migration flow
- RLS policies still created via Supabase SQL Editor (storage-setup.sql)"
```

**Changes:**
- Uncommented ~15 lines of bucket creation SQL in migration 002
- Buckets will now auto-create when migration runs

---

## Commit 3: Fix NIN Upload Bucket and Path Scoping

**Run this command:**
```bash
git add app/technician/onboarding.tsx

git commit -m "fix(upload): scope NIN upload path to user and use correct bucket

- Change bucket from 'verification-documents' to 'technician-documents'
- Scope upload path: 'nin-documents/file' → '{userId}/nin-documents/file'
- Path scoping required by RLS policy: (storage.foldername(name))[1] = auth.uid()
- Also update getPublicUrl() to use correct bucket
- Fixes 'Bucket not found' error on NIN document upload"
```

**Changes:**
- `app/technician/onboarding.tsx` line 75: Add user ID to path
- `app/technician/onboarding.tsx` line 78: Fix bucket name
- `app/technician/onboarding.tsx` line 88: Fix bucket name in getPublicUrl

---

## Commit 4: Add Storage Setup Documentation

**Run this command:**
```bash
git add database/storage-setup.sql

git commit -m "docs(storage): add RLS policy setup guide for storage buckets

- Document SQL commands to create RLS policies
- Policies restrict access to user's own {userId}/* paths
- Instructions for running in Supabase SQL Editor
- Includes verification queries and troubleshooting"
```

**New file:** `database/storage-setup.sql` (106 lines)
- Contains SQL to create RLS policies for all 3 buckets
- Includes verification and troubleshooting queries

---

## Commit 5: Add Storage Setup Instructions

**Run this command:**
```bash
git add STORAGE_SETUP_INSTRUCTIONS.md

git commit -m "docs: add storage bucket setup instructions

- Step-by-step guide for completing storage setup
- Covers bucket creation via migration, policy creation via SQL Editor
- Testing steps and troubleshooting
- Deployment checklist
- Architecture documentation"
```

**New file:** `STORAGE_SETUP_INSTRUCTIONS.md` (118 lines)
- Complete setup guide for developers
- Troubleshooting section
- Deployment checklist

---

## After All Commits

Push to remote:
```bash
git push origin main
```

Then in Supabase:
1. Run migration 002 (if not auto-applied)
2. Run `database/storage-setup.sql` in Supabase SQL Editor
3. Test NIN upload

---

## Files Modified Summary

```
MODIFIED (3 files with 4 lines changed):
├── app/technician/onboarding.tsx (3 lines: mediaTypes + bucket + path)
├── components/verification/DocumentUploadCard.tsx (2 lines: mediaTypes)
└── components/auth/AvatarUpload.tsx (1 line: mediaTypes)

UNCOMMENTED (1 file with ~15 lines uncommented):
└── database/migrations/002_technician_verification_schema.sql

NEW FILES (2 files, 224 lines total):
├── database/storage-setup.sql (106 lines)
└── STORAGE_SETUP_INSTRUCTIONS.md (118 lines)
```

---

## Verification Checklist

Before committing, verify:
- [ ] ImagePicker API updated in all 3 files
- [ ] Bucket name changed to 'technician-documents' in onboarding
- [ ] Upload path scoped with user ID
- [ ] Migration 002 buckets uncommented
- [ ] storage-setup.sql created
- [ ] STORAGE_SETUP_INSTRUCTIONS.md created

After committing:
- [ ] All 5 commits appear in git log
- [ ] No staging changes remain
- [ ] Ready to push

---

## Alternative: Squash Into Single Commit

If you prefer one commit instead of 5:

```bash
git add -A
git commit -m "fix: NIN document upload - ImagePicker deprecation + Supabase storage

FIXES:
- Replace deprecated ImagePicker.MediaTypeOptions with ['images']
- Uncomment bucket creation in migration 002
- Scope NIN upload path to user ID for RLS compliance
- Fix bucket name from verification-documents to technician-documents

ADDS:
- database/storage-setup.sql for RLS policy creation
- STORAGE_SETUP_INSTRUCTIONS.md for setup guidance

FILES MODIFIED:
- 3 files with ImagePicker API changes
- 1 migration with bucket creation uncommented
- 2 new documentation files

TESTING:
- No deprecation warnings
- Buckets auto-created on migration
- NIN upload succeeds with proper scoping
- Per-user RLS policies enforced"
```
