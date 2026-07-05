# SMS Authentication Setup

## Overview
UrbanFix uses Supabase Auth with Twilio for phone number authentication via SMS OTP.

## Current Configuration

### Environment Variables (`.env`)
```
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=<your-twilio-phone>
```

### Supabase Dashboard Setup
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Authentication → Providers → Enable "Phone"
4. Project Settings → Auth → Phone Auth:
   - Provider: Twilio
   - Account SID: Your Twilio Account SID
   - Auth Token: Your Twilio Auth Token
   - Phone Number: Your Twilio Phone Number

## Testing

### Quick Test from Terminal
```bash
node test-sms.js
```

### Expected Flow
1. User enters phone: `+2348066025051`
2. Supabase sends request to Twilio
3. Twilio sends SMS from `+14785003079`
4. User receives 6-digit code
5. User enters code to verify

## Troubleshooting

### SMS Not Received
- Check Supabase Dashboard configuration
- Verify Twilio credentials are correct
- Check Twilio account balance
- Wait 30-60 seconds (Nigerian networks can be slow)
- Check if number is verified (trial accounts only)

### Console Logs to Watch
```
📱 [Phone Auth] Sending OTP to: +2348066025051
✅ [Phone Auth] Phone validated: +2348066025051
📤 [Phone Auth] Calling Supabase signInWithOtp...
✅ [Phone Auth] OTP sent successfully!
```

## Cost Estimates
- SMS to Nigeria: $0.0075 per message (~₦11.50)
- Twilio Phone Number: $1/month
- Trial Credits: $15.50 free (~2,000 SMS)
