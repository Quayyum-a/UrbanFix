# Debug RLS Policy

Policies exist but upload still fails. The conditions might be wrong.

---

## Step 1: Check Policy Conditions

1. Go to **Storage** → **technician-documents** bucket
2. Click **Policies** tab
3. Click the **three dots (⋮)** next to "Users can upload to own paths"
4. Click **Edit**

---

## Step 2: Verify Conditions

You should see TWO condition rows:

### Row 1 - Bucket Check
**Column:** `bucket_id`
**Operator:** `=`
**Value:** `technician-documents`
✅ This should be set

### Row 2 - User Path Check  
**Column:** `(storage.foldername(name))[1]`
**Operator:** `=`
**Value:** `auth.uid()`
✅ This should be set

**If these are missing or empty → that's the problem!**

---

## Step 3: Fix If Needed

If conditions are missing:

1. **Close** the edit dialog
2. **Delete** the policy (click ⋮ → Delete)
3. **Create Policy** again → **For INSERT**

**Set these conditions CAREFULLY:**

**Condition 1:**
- Column: Click dropdown → scroll to `bucket_id`
- Operator: `=`
- Value: `technician-documents`
- Click **+ Add condition** for a second row

**Condition 2:**
- Column: **Type this manually** → `(storage.foldername(name))[1]`
  - (Don't select from dropdown—type it exactly)
- Operator: `=`
- Value: **Type** `auth.uid()` 
  - (Must be exactly `auth.uid()`, not a static string)

**Click Save**

---

## Alternative: Simpler Policy (No Path Scoping)

If the advanced policy isn't working, try a simpler one:

**For INSERT policy:**
- Condition: `bucket_id = 'technician-documents'`
- (Remove the foldername check)

**For SELECT policy:**
- Condition: `bucket_id = 'technician-documents'`

This allows any authenticated user to upload, but it's less secure. Test if this works first.

---

## Step 4: Test Upload Again

After fixing policies:
1. Go to app
2. Try NIN upload
3. Should work ✅

---

## Debug Info to Collect

If it **still fails**, add a log to the app to see the user ID:

In `app/technician/onboarding.tsx`, before upload:
```typescript
console.log('User ID:', userProfile?.id)
console.log('Upload path:', filePath)
```

Then check the console output and tell me:
- Actual user ID
- Actual upload path being used

This will help debug if the path format matches what the policy expects.
