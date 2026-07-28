# Create RLS Policies via Supabase Dashboard

**Important:** Supabase doesn't allow creating storage policies via SQL. Use the dashboard instead.

---

## Step-by-Step Guide

### Step 1: Go to Storage Section
1. Supabase Dashboard
2. Click **Storage** (left sidebar)
3. Click the **technician-documents** bucket

---

### Step 2: Go to Policies Tab
1. Click the **Policies** tab (top of the bucket)
2. You should see:
   - No policies yet (or default ones)

---

### Step 3: Create First Policy - "Users can upload"

Click **Create Policy** → **For INSERT**

**Policy Settings:**
- **Name:** `Users can upload to own paths`
- **Target Roles:** `authenticated`
- **Permission:** `INSERT`

**Conditions:** Check BOTH boxes and set:

**1. Bucket ID is**
- Operator: `=`
- Value: `technician-documents`

**2. AND (storage.foldername(name))[1] is**
- Operator: `=`
- Value: `auth.uid()`

**Click Save**

---

### Step 4: Create Second Policy - "Users can read"

Click **Create Policy** → **For SELECT**

**Policy Settings:**
- **Name:** `Users can read own files`
- **Target Roles:** `authenticated`
- **Permission:** `SELECT`

**Conditions:** Check BOTH boxes and set:

**1. Bucket ID is**
- Operator: `=`
- Value: `technician-documents`

**2. AND (storage.foldername(name))[1] is**
- Operator: `=`
- Value: `auth.uid()`

**Click Save**

---

## Result

After both policies are created, you should see in the Policies tab:
- ✅ Users can upload to own paths (INSERT)
- ✅ Users can read own files (SELECT)

---

## Step 5: Test Upload

Go back to the app:
1. Technician onboarding
2. Tap "Upload NIN Card/Slip"
3. Select image
4. **Should upload successfully** ✅

---

## Why SQL Didn't Work

Supabase doesn't allow `CREATE POLICY` on `storage.objects` via SQL editor because:
- The table is owned by the `postgres` system role
- Your user role doesn't have permission to modify its policies
- You must use the Supabase dashboard UI instead

---

## Troubleshooting

**If policy creation button is missing:**
- Make sure you're on the "Policies" tab (not "Details")
- The bucket must exist first (✅ yours does)

**If upload still fails:**
- Verify both policies appear in the Policies tab
- Check the policy conditions are exactly as shown above
- Try uploading again
