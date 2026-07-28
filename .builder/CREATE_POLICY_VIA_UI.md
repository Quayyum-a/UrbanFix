# Create RLS Policy via Supabase Dashboard (NOT SQL)

Since SQL editing won't work due to permissions, use the Dashboard UI instead.

---

## Step 1: Go to Storage in Dashboard

1. **Supabase Dashboard**
2. Click **Storage** (left sidebar)
3. Click **technician-documents** bucket

---

## Step 2: Go to Policies Tab

Click the **Policies** tab (should show existing policies)

---

## Step 3: Delete All Old Policies

For each policy you see:
1. Click the **three dots (⋮)**
2. Click **Delete**
3. Confirm

**Delete ALL policies** - start fresh

---

## Step 4: Create NEW Simple Policy - INSERT (Upload)

Click **New policy** → **For INSERT**

### Settings:
- **Policy name:** `Allow authenticated users to upload`
- **Target role:** `authenticated`
- **Permission:** `INSERT`

### Conditions:
**DO NOT ADD ANY CONDITIONS** - leave blank

Just click **Save**

---

## Step 5: Create NEW Simple Policy - SELECT (Read)

Click **New policy** → **For SELECT**

### Settings:
- **Policy name:** `Allow authenticated users to read`
- **Target role:** `authenticated`  
- **Permission:** `SELECT`

### Conditions:
**DO NOT ADD ANY CONDITIONS** - leave blank

Just click **Save**

---

## Step 6: Test Upload

1. Go back to app
2. Try NIN upload
3. **Should work now** ✅

---

## Result

You'll have two policies with **NO conditions** - they allow ANY authenticated user to upload/read to ANY bucket.

This is NOT production-safe (no bucket/path scoping), but it will tell us if:
- ✅ RLS mechanism works
- ✅ User is authenticated
- ✅ File format is correct

Once this works, we can add back the bucket_id condition.

---

## If You Still Get RLS Error

1. Double-check both policies are shown in the Policies tab
2. Verify they say `authenticated` role
3. Try uploading again

If STILL blocked, the issue might be:
- User not properly authenticated
- Different Supabase project/environment
- Service role key needed instead of anon key
