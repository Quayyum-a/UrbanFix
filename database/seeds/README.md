# Database Seeds

This folder contains SQL files to seed the database with test data for development.

## Test Users

### Customer - Quayyum Ariyo
- **Phone**: `8066025051` (enter without +234)
- **Full Phone**: `+2348066025051`
- **OTP**: `123456`
- **Role**: Customer
- **User ID**: `dev-user-2348066025051`

### Technician - John Technician
- **Phone**: `8012345678` (enter without +234)
- **Full Phone**: `+2348012345678`
- **OTP**: `654321`
- **Role**: Technician
- **User ID**: `dev-user-2348012345678`

## How to Run Seeds

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/lebgmhdfmndvlxayzyhs
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `001_test_users.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`
6. Check the results at the bottom

### Option 2: Supabase CLI

```bash
# Make sure you're in the urbanfix-app directory
cd urbanfix-app

# Run the seed file
supabase db execute --file database/seeds/001_test_users.sql
```

### Option 3: psql (if you have direct database access)

```bash
psql postgresql://postgres:[YOUR_PASSWORD]@db.lebgmhdfmndvlxayzyhs.supabase.co:5432/postgres \
  -f database/seeds/001_test_users.sql
```

## Verify Seeds Were Applied

Run this query in SQL Editor to check:

```sql
-- Check users
SELECT id, phone, role, full_name, created_at 
FROM users 
WHERE phone IN ('+2348066025051', '+2348012345678');

-- Check customer profile
SELECT * 
FROM customer_profiles 
WHERE user_id = 'dev-user-2348066025051';
```

You should see:
- 2 rows in `users` table
- 1 row in `customer_profiles` table (for Quayyum Ariyo)

## Dev Mode (Without Database)

If you don't want to seed the database, the app will still work in **dev mode** for test numbers:

1. Test numbers (`8066025051` and `8012345678`) work without database
2. They bypass Supabase completely
3. User data is stored in-memory only
4. Perfect for testing UI/UX without database overhead

When you register with these numbers in dev mode, the app creates mock user data that exists only during the app session.

## Production Note

⚠️ **IMPORTANT**: These seeds are for development only!

Before deploying to production:
1. Delete these test users from the database
2. Remove dev mode bypasses in `lib/auth/phone-auth.ts`
3. Configure proper Supabase authentication

Test numbers are hardcoded in:
- `lib/auth/phone-auth.ts` (search for `TEST_NUMBERS`)
