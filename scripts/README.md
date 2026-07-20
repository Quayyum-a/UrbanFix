# Database Migration Scripts

This directory contains SQL migrations for the UrbanFix authentication redesign.

## Prerequisites

- PostgreSQL client (`psql`) installed on your machine
- Supabase account with database access
- Environment variable `SUPABASE_DB_URL` set with your database connection string

## Getting Your Database URL

### Option 1: From Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click "Settings" → "Database"
4. Copy the **Connection String** (PostgreSQL)
5. Set environment variable:
   ```bash
   export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
   ```

### Option 2: From .env File

If you have a `.env` file with `DATABASE_URL`:
```bash
export SUPABASE_DB_URL=$DATABASE_URL
```

## Running Migrations

### Automatic (Recommended)

Run all migrations in sequence:

```bash
chmod +x scripts/run-migrations.sh
./scripts/run-migrations.sh
```

This will:
1. Create the `user_pins` table
2. Update the `users` table role type
3. Add `onboarding_completed` to `customer_profiles`
4. Seed test data

### Manual

Run individual migrations:

```bash
# Migration 1: Create user_pins table
psql "$SUPABASE_DB_URL" -f scripts/migrations/001_create_user_pins_table.sql

# Migration 2: Update users role type
psql "$SUPABASE_DB_URL" -f scripts/migrations/002_update_users_role_type.sql

# Migration 3: Add onboarding_completed
psql "$SUPABASE_DB_URL" -f scripts/migrations/003_add_onboarding_completed.sql

# Migration 4: Seed test data
psql "$SUPABASE_DB_URL" -f scripts/migrations/004_seed_test_data.sql
```

## Verification

After running migrations, verify everything was successful:

```bash
psql "$SUPABASE_DB_URL" << EOF
-- Check user_pins table exists
SELECT COUNT(*) as user_pins_count FROM user_pins;

-- Check users role type
SELECT DISTINCT role FROM users;

-- Check customer_profiles has onboarding_completed
SELECT COUNT(*) as profiles_with_onboarding FROM customer_profiles 
WHERE onboarding_completed = true;

-- Check test data was seeded
SELECT phone, full_name FROM users 
WHERE phone IN ('+2348066025051', '+2348012345678')
ORDER BY phone;
EOF
```

## Test Accounts

After seeding, these test accounts are available:

### Customer
- **Phone**: +2348066025051
- **PIN**: 1234
- **Name**: John Customer

### Technician
- **Phone**: +2348012345678
- **PIN**: 5678
- **Name**: Mike Technician

## Rollback

If you need to rollback migrations:

### Undo Migration 4 (Seed Data)
```sql
DELETE FROM users WHERE phone IN ('+2348066025051', '+2348012345678');
DELETE FROM user_pins WHERE phone IN ('+2348066025051', '+2348012345678');
```

### Undo Migration 3 (onboarding_completed)
```sql
ALTER TABLE customer_profiles DROP COLUMN onboarding_completed;
```

### Undo Migration 2 (role type)
```bash
# This is complex - restore from backup or manually recreate enum
```

### Undo Migration 1 (user_pins table)
```sql
DROP TABLE user_pins;
```

## Troubleshooting

### Connection Error
```
psql: error: connection to server at "..." failed
```

**Solution**: Check your `SUPABASE_DB_URL` is correct:
```bash
echo $SUPABASE_DB_URL
```

### Permission Error
```
ERROR: permission denied for schema public
```

**Solution**: Ensure you're using the correct database user with necessary permissions. In Supabase, use the postgres user (superuser).

### Migration Already Applied
```
ERROR: relation "user_pins" already exists
```

**Solution**: Migrations are idempotent (use `IF NOT EXISTS`), but if you get this error, the migration was partially applied. Check the database state and either continue or rollback.

### PIN Hash Mismatch
If PIN verification fails, ensure you're using the correct bcrypt-hashed values:

```javascript
// To generate bcrypt hashes for custom PINs:
const bcrypt = require('bcrypt');

async function hashPIN(pin) {
  const hash = await bcrypt.hash(pin, 10);
  console.log(`PIN ${pin}: ${hash}`);
}

hashPIN('1234');  // For customer test account
hashPIN('5678');  // For technician test account
```

Then update the `004_seed_test_data.sql` file with the new hashes.

## Next Steps

After migrations are complete:

1. ✅ Database is ready
2. ⏭️ Start Phase 1 implementation (PIN service + state management)
3. ⏭️ Build UI components (Week 2)
4. ⏭️ Role-specific onboarding (Week 3)
5. ⏭️ Integration & testing (Week 4-5)

## Support

If you encounter issues:

1. Check database connection
2. Verify all prerequisites are installed
3. Review migration logs for specific errors
4. Check Supabase dashboard for any warnings
5. Contact support with error message and migration number

