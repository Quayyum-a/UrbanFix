# Database Migrations

This folder contains SQL migration files for the UrbanFix database schema.

## Migration Files

### 001_initial_schema.sql
Contains the initial database schema including:
- Users table with role-based access
- Customer and technician profile tables
- Authentication and session management
- Row Level Security (RLS) policies

### 002_technician_verification_schema.sql
Contains technician verification system:
- `technician_verifications` table - stores NIN, BVN, and bank details
- `verification_documents` table - stores ID card and address proof
- RLS policies for secure access
- Triggers for automatic status updates
- Storage bucket policies for document uploads
- Helper functions for verification checks

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/lebgmhdfmndvlxayzyhs
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the migration file content
5. Click **Run** or press `Cmd/Ctrl + Enter`
6. Check the results panel for any errors

### Option 2: Supabase CLI

```bash
# Make sure you're in the urbanfix-app directory
cd urbanfix-app

# Run migration
supabase db execute --file database/migrations/002_technician_verification_schema.sql
```

### Option 3: psql (Direct Database Access)

```bash
psql postgresql://postgres:[PASSWORD]@db.lebgmhdfmndvlxayzyhs.supabase.co:5432/postgres \
  -f database/migrations/002_technician_verification_schema.sql
```

## Storage Buckets Setup

After running the migrations, you need to set up storage buckets in Supabase:

### 1. Create Storage Buckets

Go to **Storage** in Supabase Dashboard and create these buckets:

1. **technician-documents** (Private)
   - For ID cards and address proofs
   - Access controlled by RLS policies

2. **job-photos** (Private)
   - For device photos and progress updates
   - Access controlled by RLS policies

3. **profile-photos** (Public)
   - For user avatars
   - Publicly readable

### 2. Apply Storage Policies

The storage policies are commented at the bottom of `002_technician_verification_schema.sql`. 

Copy and run them in the SQL Editor after creating the buckets.

## Verifying Migrations

After running migrations, verify the setup:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('technician_verifications', 'verification_documents');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('technician_verifications', 'verification_documents');

-- Check storage buckets
SELECT * FROM storage.buckets;

-- Check verification statistics view
SELECT * FROM verification_statistics;
```

## Migration Order

Migrations must be run in order:
1. `001_initial_schema.sql` (if not already run)
2. `002_technician_verification_schema.sql`

## Rolling Back

If you need to roll back a migration:

```sql
-- Drop technician verification tables
DROP TABLE IF EXISTS verification_documents CASCADE;
DROP TABLE IF EXISTS technician_verifications CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS update_technician_verification_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_technician_status_on_approval() CASCADE;
DROP FUNCTION IF EXISTS get_technician_verification_status(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_accept_jobs(UUID) CASCADE;

-- Drop view
DROP VIEW IF EXISTS verification_statistics CASCADE;
```

## Common Issues

### Issue: Permission Denied
**Solution**: Make sure you're logged in with sufficient privileges. Use service_role key for admin operations.

### Issue: Table Already Exists
**Solution**: The migrations use `IF NOT EXISTS` clauses, but if you need to recreate tables, drop them first.

### Issue: Storage Policies Not Working
**Solution**: 
1. Ensure buckets are created first
2. Run storage policies separately
3. Check bucket IDs match policy definitions

### Issue: RLS Blocking Queries
**Solution**: 
- Regular users: Ensure `auth.uid()` matches `user_id`
- Admins: Ensure user has `role = 'admin'` in users table
- For testing: Temporarily disable RLS with `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY`

## TypeScript Types

TypeScript types for the database schema are available in:
- `/types/verification.types.ts`

These types are automatically synced with the database schema.

## Testing Migrations

After running migrations, test with these queries:

```sql
-- Test technician verification insert
INSERT INTO technician_verifications (
  user_id, nin, bvn, account_number, bank_code, bank_name
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '12345678901',
  '98765432109',
  '0123456789',
  '058',
  'Guaranty Trust Bank'
);

-- Test verification document insert
INSERT INTO verification_documents (
  verification_id, document_type, file_url, file_path
) VALUES (
  (SELECT id FROM technician_verifications LIMIT 1),
  'id_card',
  'https://example.com/id.jpg',
  'user-id/id_card/file.jpg'
);

-- Test verification status view
SELECT * FROM get_technician_verification_status(
  'a0000000-0000-0000-0000-000000000001'::uuid
);

-- Clean up test data
DELETE FROM technician_verifications 
WHERE nin = '12345678901';
```

## Next Steps

After migrations are complete:
1. Seed test data using `/database/seeds/001_test_users.sql`
2. Test verification flow in the mobile app
3. Verify RLS policies are working correctly
4. Set up storage buckets and policies
5. Test document uploads
