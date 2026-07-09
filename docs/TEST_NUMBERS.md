# Test Phone Numbers for Development

## Supabase Phone Allowlist Configuration

You've configured test phone numbers in Supabase that bypass SMS delivery and use fixed OTP codes. This saves Twilio credits during development.

## Test Numbers

| Phone Number | OTP Code | Format for Input |
|--------------|----------|------------------|
| +2348066025051 | 123456 | 8066025051 |
| +2348012345678 | 654321 | 8012345678 |

## How to Use

### 1. Enter Phone Number
- In the app, enter the phone number **without** the country code
- Example: `8066025051` (not +2348066025051)
- The app automatically adds `+234` prefix

### 2. Send Code
- Tap "Send Code"
- You'll see a **"Test Mode"** alert
- No actual SMS is sent (saves Twilio credits)
- OTP is available immediately

### 3. Enter OTP
- Enter your configured test OTP code
- For `8066025051` → enter `123456`
- For `8012345678` → enter `654321`
- The app will show a test mode indicator

## How It Works

Supabase Phone Allowlist feature:
1. Recognizes the phone number as a test number
2. Skips actual SMS sending via Twilio
3. Accepts the configured OTP code
4. Creates a valid session (same as real SMS)

## Configuration in Supabase Dashboard

Your current configuration:
```
2348066025051=123456
2348012345678=654321
```

Location: **Supabase Dashboard → Authentication → Phone Auth → Phone number allowlist**

## Benefits

✅ **No Twilio credits used** - Test as much as you want
✅ **Instant OTP** - No waiting for SMS delivery
✅ **Same flow** - Tests the complete authentication flow
✅ **Valid sessions** - Creates real user sessions for testing

## Production Note

⚠️ **IMPORTANT**: Remove or disable phone allowlist before going to production!

Test numbers in production could be a security risk. Before launch:
1. Go to Supabase Dashboard → Authentication → Phone Auth
2. Clear the "Phone number allowlist" field
3. Save changes

## Adding More Test Numbers

To add more test numbers:
1. Go to Supabase Dashboard
2. Authentication → Phone Auth
3. Under "Phone number allowlist", add in format:
   ```
   2348066025051=123456,2348012345678=654321,2348098765432=111111
   ```
4. Save changes

## Testing Other Features

Use test numbers to test:
- ✅ Phone authentication flow
- ✅ OTP verification
- ✅ Role selection (Customer/Technician)
- ✅ Profile setup
- ✅ Session persistence
- ✅ Navigation after login
- ❌ Actual SMS delivery (use real number for this)

## Real Number Testing

When you want to test actual SMS delivery:
- Use your real phone number (or any non-allowlisted number)
- Twilio will send real SMS (consumes credits)
- Use this sparingly until Twilio account is upgraded

## Current Twilio Status

- **Account Type**: Trial/Free Tier
- **Phone Number**: +14785003079 (US number)
- **SMS Delivery**: 30-90 seconds (trial priority)
- **Cost per SMS**: Trial credits

**Recommendation**: Use test numbers for development, upgrade Twilio when approaching launch.
