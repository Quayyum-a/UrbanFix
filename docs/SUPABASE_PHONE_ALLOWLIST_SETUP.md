# Supabase Phone Allowlist Configuration

## The Problem

When you try to use test numbers, Supabase is still sending real SMS through Twilio, which fails because:
- Your Twilio account is on trial mode
- Trial accounts can only send to verified numbers
- You haven't verified these test numbers in Twilio

## The Solution: Phone Allowlist

Supabase has a feature called "Phone number allowlist" that bypasses SMS completely for specific numbers.

## Step-by-Step Configuration

### 1. Go to Supabase Dashboard
URL: https://supabase.com/dashboard/project/lebgmhdfmndvlxayzyhs

### 2. Navigate to Phone Auth Settings
- Click **Authentication** in left sidebar
- Click **Providers** tab
- Find and click **Phone** provider

### 3. Locate Phone Number Allowlist Field
Scroll down until you see a section labeled:
**"Phone number allowlist"** or **"Enable phone sign-up for only specific numbers"**

### 4. Enter Test Numbers in EXACT Format

**CRITICAL**: The format MUST match exactly. Copy-paste this:

```
2348066025051=123456,2348012345678=654321
```

**Important Notes:**
- ❌ **NO** `+` sign before numbers
- ❌ **NO** spaces
- ✅ Format: `COUNTRYCODENUMBER=OTP,COUNTRYCODENUMBER=OTP`
- ✅ Comma separates multiple entries (no space after comma)

### 5. Verify Your Entry

Your configuration should look EXACTLY like this:

```
Phone number allowlist: 2348066025051=123456,2348012345678=654321
```

### 6. Save Changes
Click **"Save"** button at the bottom of the page

### 7. Wait 30 Seconds
Allow time for configuration to propagate

## Test the Configuration

### Test Number 1:
- Enter in app: `8066025051`
- Expected OTP: `123456`
- Should work instantly (no SMS sent)

### Test Number 2:
- Enter in app: `8012345678` (**NOT** 8102345678)
- Expected OTP: `654321`
- Should work instantly (no SMS sent)

## How to Verify It's Working

When correctly configured, you should see in logs:
```
📱 [Phone Auth] Sending OTP to: +2348066025051
✅ [Phone Auth] OTP sent successfully!
```

**No Twilio error** should appear!

## Common Mistakes

### ❌ Wrong: Using + sign
```
+2348066025051=123456,+2348012345678=654321
```

### ❌ Wrong: Spaces after comma
```
2348066025051=123456, 2348012345678=654321
```

### ❌ Wrong: Wrong phone number format
```
08066025051=123456,08012345678=654321  (missing country code)
```

### ✅ Correct:
```
2348066025051=123456,2348012345678=654321
```

## Alternative: Verify Numbers in Twilio (Not Recommended)

If you don't want to use allowlist, you can verify each test number in Twilio:
1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Click "Add a new number"
3. Enter: +2348066025051
4. Verify via SMS
5. Repeat for +2348012345678

**Downside**: Each verification costs 1 SMS, and you can only verify ~5 numbers on trial.

## Troubleshooting

### Still seeing Twilio errors?
1. Double-check format (no + sign, no spaces)
2. Clear browser cache
3. Log out and log back into Supabase Dashboard
4. Save configuration again
5. Wait 1 minute

### Numbers still not working?
- Make sure you're entering `8066025051` not `08066025051`
- Make sure you're entering `8012345678` not `8102345678` (you had an extra 0)
- Restart your Expo app after saving Supabase config

## Current Configuration Check

Based on your error, Supabase is NOT recognizing your numbers as allowlisted. This means:
1. The allowlist field is empty, OR
2. The format is wrong

Please follow the steps above carefully and verify the exact format.

## Expected Behavior After Fix

✅ **Before**: Error "Trial accounts cannot send to unverified numbers"
✅ **After**: Instant OTP, no SMS sent, works immediately

## Screenshot Location

Phone Allowlist field location:
```
Supabase Dashboard
  └─ Authentication
      └─ Providers
          └─ Phone
              └─ [Scroll down]
                  └─ Phone number allowlist: [text input field]
```
