# UrbanFix App - Change Log

## [Latest] - December 2024

### 🎉 Fixed Issues

#### 1. ✅ Splash Screen Now Shows Before Signup
**Problem:** Splash screen was skipped, going straight to phone input

**Solution:**
- Extended splash display to **3 seconds** (was 2.5s)
- Added routing delay in `app/index.tsx` to ensure splash renders
- Fixed `AuthGuard.tsx` to allow splash and auth routes bypass

**Result:** Users now see animated UrbanFix splash → 3 seconds → phone login

---

#### 2. ✅ OTP Expiry Extended to 10 Minutes  
**Problem:** Codes expired too quickly (60 seconds), especially with slow Nigerian SMS delivery

**Solution:**
- Changed app timer from 30s to **600 seconds (10 minutes)**
- Timer displays in **MM:SS format** (e.g., 10:00 → 9:45 → 0:00)
- Updated footer text to "expires in 10 minutes"
- **Important:** Must also configure Supabase Dashboard (see `docs/SUPABASE_OTP_CONFIG.md`)

**Result:** Users have comfortable time to receive and enter SMS code

---

#### 3. ✅ Verify Button Now Shows "Verify Code" Text
**Problem:** Verify button appeared blank/empty

**Solution:**
- Replaced `Button` component wrapper with direct `Pressable`
- Text now renders correctly: **"Verify Code"**
- Loading state shows: **"Verifying..."**
- Maintains orange brand color (#ff5722)

**Result:** Button is clear and actionable

---

#### 4. ✅ 10-Minute Countdown Before Resend
**Problem:** Users could spam resend button

**Solution:**
- Resend button disabled for 10 minutes after sending code
- Shows countdown: "Resend code in 9:45"
- Timer resets to 10:00 when new code sent
- Button enabled only when timer reaches 0:00

**Result:** Prevents abuse, aligns with OTP expiry time

---

### 📱 Current User Flow

```
1. App Launch
   ↓
2. Splash Screen (3 seconds)
   ↓
3. Phone Input
   - Enter: 8066025051
   - Check Terms checkbox
   - Tap: "Send Code" (orange)
   ↓
4. SMS Sent (30-90 seconds delivery)
   ↓
5. OTP Input Screen
   - 6 digit boxes
   - Timer: 10:00 countdown
   - Tap: "Verify Code" (orange)
   ↓
6. Verification Success
   ↓
7. Role Selection / Home
```

---

### 🔧 Technical Changes

**Files Modified:**
- `app/splash.tsx` - Extended display to 3 seconds
- `app/index.tsx` - Added routing delay
- `components/auth/OTPInput.tsx` - 10-min timer, fixed button, MM:SS format
- `components/auth/PhoneInput.tsx` - Orange branding
- `components/auth/AuthGuard.tsx` - Splash screen routing fix

**New Documentation:**
- `docs/SUPABASE_OTP_CONFIG.md` - OTP expiry configuration
- `docs/SMS_SETUP.md` - Twilio setup guide

---

### ⚙️ Configuration Required

#### Supabase Dashboard
You MUST configure OTP expiry in Supabase to match the app timer:

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select project: `lebgmhdfmndvlxayzyhs`
3. Authentication → Configuration
4. Set "OTP expiry duration" to **600 seconds**
5. Save

**Without this, codes will still expire in 60 seconds despite app showing 10-minute timer!**

---

### 🧪 Testing Checklist

Test these scenarios:

- [ ] Splash screen shows for 3 seconds on app launch
- [ ] Phone input with +234 separated country code
- [ ] Orange "Send Code" button works
- [ ] SMS arrives (wait up to 90 seconds)
- [ ] OTP screen shows 6 boxes
- [ ] Timer counts down from 10:00 in MM:SS format
- [ ] "Verify Code" button visible and orange
- [ ] Enter code within 10 minutes → Success
- [ ] Wait 11 minutes → "Token expired" error
- [ ] "Resend" button disabled for 10 minutes
- [ ] Timer reaches 0:00 → "Resend" enabled
- [ ] Tap "Resend" → New code sent, timer resets

---

### 🐛 Known Issues

#### SMS Delivery Delays
**Issue:** SMS takes 30-120 seconds in Nigeria (especially MTN/Glo)

**Workaround:** 10-minute timer provides buffer

**Long-term solution:** Consider WhatsApp Business API for instant delivery

#### Rate Limiting
**Issue:** 3 OTP sends per 15 minutes per phone

**Why:** Prevents abuse and reduces Twilio costs

**User impact:** If user exhausts attempts, wait 15 minutes

---

### 💰 Cost Impact

#### Before (60-second expiry):
- Users frustrated → retry often
- More SMS sent → higher cost
- Poor UX → abandoned signups

#### After (10-minute expiry):
- Users comfortable → fewer retries
- Less SMS sent → lower cost  
- Better UX → more completions

**Estimated savings:** 30-40% reduction in retry SMS

---

### 📊 Metrics to Monitor

Track these in production:

1. **Splash screen view duration** (should be ~3 seconds)
2. **OTP send → entry time** (how long users take)
3. **OTP expiry rate** (% of expired codes)
4. **Resend button usage** (should decrease with 10-min timer)
5. **Verification success rate** (should improve)
6. **SMS delivery time** (by network: MTN, Glo, Airtel, 9mobile)

---

### 🚀 Deployment

**Before deploying:**
1. Configure Supabase OTP expiry to 600 seconds
2. Test with real Nigerian phone numbers
3. Test on slow networks (3G/Edge)
4. Verify Twilio balance sufficient
5. Test all 4 networks (MTN, Glo, Airtel, 9mobile)

**After deploying:**
1. Monitor SMS delivery times
2. Check OTP verification success rate
3. Watch for expired token errors
4. Track user drop-off at OTP screen

---

### 📚 Related Documentation

- `docs/SMS_SETUP.md` - Twilio configuration
- `docs/SUPABASE_OTP_CONFIG.md` - OTP expiry settings
- `test-sms.js` - Test script for SMS sending
- `.env.example` - Required environment variables

---

### ✨ Next Improvements

Planned enhancements:

1. **Biometric Auth** - Face ID / Touch ID for returning users
2. **WhatsApp OTP** - Instant delivery via WhatsApp Business API
3. **Email Backup** - Send code via email as fallback
4. **Auto-detect SMS** - Auto-fill OTP from SMS (Android)
5. **Push Notifications** - OTP via push instead of SMS

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Repository:** https://github.com/Quayyum-a/UrbanFix
