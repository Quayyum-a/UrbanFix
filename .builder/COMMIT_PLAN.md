# Git Commits Plan - NIN Upload Fixes

Run these commands in order to commit the changes:

## Commit 1: Fix ImagePicker Deprecation
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

**Files Changed:** 3
**Lines Changed:** 3 (each line: ImagePicker.MediaTypeOptions.Images → ['images'])

---

## Commit 2: Uncomment Bucket Creation in Migration
```bash
git add database/migrations/002_technician_verification_schema.sql

git commit -m "feat(storage): uncomment bucket creation in migration

- Move bucket creation from commented-out block to active code
- Creates technician-documents, job-photos, profile-photos buckets
- Uses ON CONFLICT (id) DO NOTHING for safe re-runs
- Buckets now created as part of standard migration flow
- RLS policies still need to be created via Supabase SQL Editor"
```

**Files Changed:** 1 (migration 002)
**Changes:** Uncommented bucket creation section (~15 lines)

---

## Commit 3: Fix NIN Upload Bucket and Path Scoping
```bash
git add app/technician/onboarding.tsx

git commit -m "fix(upload): scope NIN upload path to user and use correct bucket

- Change bucket from 'verification-documents' to 'technician-documents'
- Scope upload path: 'nin-documents/file' → '{userId}/nin-documents/file'
- Path scoping required by RLS policy: (storage.foldername(name))[1] = auth.uid()
- Also update getPublicUrl() to use correct bucket
- Fixes 'Bucket not found' error on NIN document upload"
```

**Files Changed:** 1
**Lines Changed:** 
- Line 75: path scope change
- Lines 78, 88: bucket name changes

---

## Commit 4: Add Storage Setup Documentation
```bash
git add database/storage-setup.sql

git commit -m "docs(storage): add RLS policy setup guide for storage buckets

- Document SQL commands to create RLS policies
- Policies restrict access to user's own {userId}/* paths
- Instructions for running in Supabase SQL Editor
- Includes verification queries and troubleshooting"
```

**Files Changed:** 1 (new file)
**Lines:** 106

---

## Commit 5: Add Storage Setup Instructions
```bash
git add STORAGE_SETUP_INSTRUCTIONS.md

git commit -m "docs: add storage bucket setup instructions

- Step-by-step guide for completing storage setup
- Covers bucket creation via migration, policy creation via SQL Editor
- Testing steps and troubleshooting
- Deployment checklist
- Architecture documentation"
```

**Files Changed:** 1 (new file)
**Lines:** 118

---

## Summary

**Total Commits:** 5
**Files Modified:** 4
**Files Created:** 2
**Total Changes:** ~150 lines

### Order to Apply
1. Commit 1 (ImagePicker fix) - Required for no warnings
2. Commit 2 (Bucket migration) - Required for storage to work
3. Commit 3 (NIN path fix) - Required for upload to work
4. Commit 4 (Storage setup guide) - Documentation
5. Commit 5 (Setup instructions) - Documentation

### After Committing
1. Push to remote: `git push origin main`
2. Run migration 002 in Supabase
3. Run `database/storage-setup.sql` in Supabase SQL Editor
4. Test NIN upload flow

---

## Alternative: Single Squashed Commit

If you prefer one commit per major task instead of 5:

```bash
# Stage everything
git add app/technician/onboarding.tsx \
        components/verification/DocumentUploadCard.tsx \
        components/auth/AvatarUpload.tsx \
        database/migrations/002_technician_verification_schema.sql \
        database/storage-setup.sql \
        STORAGE_SETUP_INSTRUCTIONS.md

git commit -m "fix: NIN document upload - ImagePicker API + Supabase storage

FIXES:
- Replace deprecated ImagePicker.MediaTypeOptions with ['images'] array
- Uncomment bucket creation in migration 002 (was blocked by comments)
- Scope NIN upload path to user ID for RLS compliance
- Fix bucket name: verification-documents → technician-documents

ADDS:
- database/storage-setup.sql: RLS policy creation guide
- STORAGE_SETUP_INSTRUCTIONS.md: Complete setup documentation

TESTING:
- No deprecation warnings on ImagePicker
- Buckets created on migration
- NIN upload succeeds with proper scoping
- RLS policies restrict per-user access"
```

---

## Files Included in These Commits

### Modified
```
app/technician/onboarding.tsx
components/verification/DocumentUploadCard.tsx
components/auth/AvatarUpload.tsx
database/migrations/002_technician_verification_schema.sql
```

### New Files
```
database/storage-setup.sql
STORAGE_SETUP_INSTRUCTIONS.md
```

### NOT Included (from previous work, already committed)
```
components/auth/RoleSelection.tsx (from Task 1)
stores/authStore.ts (from Task 3)
database/migrations/006_fix_technician_verification_schema.sql (from Task 3)
__tests__/unit/role-selection.test.tsx (from Task 4)
__tests__/integration/registration-flow.test.ts (from Task 4)
```
