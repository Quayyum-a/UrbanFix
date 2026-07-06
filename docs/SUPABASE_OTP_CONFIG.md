# Supabase OTP Configuration

## Important: OTP Expiry Settings

### Issue
OTP codes were expiring too quickly, causing users to receive "Token has expired or is invalid" errors.

### Solution
Configure Supabase to extend OTP expiry time from default (60 seconds) to **10 minutes (600 seconds)**.

---

## Configuration Steps

### 1. Access Supabase Dashboard
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project: `lebgmhdfmndvlxayzyhs` (UrbanFix)

### 2. Navigate to Auth Settings
1. Click **Authentication** in left sidebar
2. Click **Configuration** tab
3. Scroll to **Auth Providers** section

### 3. Configure OTP Expiry Time
1. Find **"OTP expiry duration"** setting
2. Change from default (`60` seconds) to `600` seconds (10 minutes)
3. Click **Save**

### Alternative: Using Supabase SQL Editor
If the setting isn't visible in UI, you can set it via SQL:

```sql
-- Set OTP expiry to 600 seconds (10 minutes)
UPDATE auth.config
SET value = '600'
WHERE parameter = 'otp_expiry';
```

---

## Current App Configuration

### Timer Display
- **App shows:** 10:00 minute countdown
- **Format:** MM:SS (e.g., 9:45, 5:30, 0:45)
- **Behavior:** 
  - Starts at 10:00 when OTP is sent
  - Counts down to 0:00
  - "Resend" button enabled when timer reaches 0:00

### User Experience Flow
1. User enters phone number
2. Taps "Send Code"
3. Receives SMS (may take 30-90 seconds in Nigeria)
4. Enters 6-digit code
5. Has **10 minutes** to enter code before it expires
6. If expired, can request new code (after 10-min timer)

---

## Why 10 Minutes?

### Nigerian SMS Delivery Times
- **Peak hours (9am-5pm):** 30-120 seconds
- **Off-peak hours:** 10-60 seconds  
- **Network delays:** MTN, Glo, Airtel, 9mobile can be slow
- **Buffer time:** Users need time to check phone, type code

### Best Practices
- **1 minute:** Too short (default Supabase)
- **5 minutes:** Better but still tight
- **10 minutes:** Comfortable for Nigerian networks ✅
- **15+ minutes:** Security risk (too long)

---

## Testing OTP Expiry

### Test Scenario 1: Normal Flow
1. Send OTP
2. Wait 30 seconds (typical SMS delay)
3. Enter code within 10 minutes
4. **Expected:** Code verifies successfully

### Test Scenario 2: Expired Code
1. Send OTP
2. Wait 11 minutes (beyond expiry)
3. Try to enter code
4. **Expected:** Error: "Token has expired or is invalid"
5. Tap "Resend" to get new code

### Test Scenario 3: Rapid Resend
1. Send OTP
2. Wait 5 minutes
3. Tap "Resend" (should be disabled)
4. **Expected:** Button shows countdown timer
5. Wait until timer reaches 0:00
6. Tap "Resend" (now enabled)
7. **Expected:** New code sent, timer resets to 10:00

---

## Error Messages

### "Token has expired or is invalid"
**Cause:** One of:
- Code entered after 10-minute expiry
- Incorrect code entered
- Code already used
- Network timing issues

**Solution:**
- Tap "Resend" to get new code
- Wait for countdown timer to reach 0:00
- Check phone for new SMS

### "Too many OTP attempts"
**Cause:** Rate limiting (3 attempts per 15 minutes)

**Solution:**
- Wait 15 minutes before requesting new code
- Clear app cache if persistent

---

## Rate Limiting Configuration

Current limits in `/lib/auth/otp-service.ts`:
- **Max OTP sends:** 3 per 15 minutes per phone number
- **Max verifications:** 5 attempts per 15 minutes per phone number
- **Cooldown period:** 15 minutes

These limits prevent abuse while allowing legitimate retry attempts.

---

## Monitoring & Debugging

### Check OTP Status
```javascript
// In browser console or app logs
console.log('OTP sent at:', new Date().toISOString())
console.log('Expires at:', new Date(Date.now() + 600000).toISOString())
```

### Common Issues
1. **SMS not arriving:** Check Twilio logs, verify phone number
2. **Code expired quickly:** Check Supabase OTP expiry setting (should be 600)
3. **Timer showing wrong time:** Check app code uses 600 seconds
4. **Verify button blank:** Fixed in latest version (now shows "Verify Code")

---

## Production Checklist

Before launching:
- [ ] Supabase OTP expiry set to 600 seconds
- [ ] Twilio SMS delivery tested with all Nigerian networks
- [ ] Rate limiting configured appropriately
- [ ] Error messages user-friendly
- [ ] Timer display showing MM:SS format
- [ ] "Verify Code" button text visible
- [ ] Splash screen shows before login
- [ ] Test with slow SMS delivery (90+ seconds)

---

## Support

If OTP issues persist:
1. Check Supabase Auth logs
2. Check Twilio delivery logs  
3. Verify OTP expiry setting is 600 seconds
4. Test with different Nigerian networks (MTN, Glo, Airtel, 9mobile)
5. Monitor actual SMS delivery times

**Last Updated:** December 2024
