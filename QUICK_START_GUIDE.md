# UrbanFix Quick Start Guide 🚀

**Last Updated**: January 2026  
**Current SDK**: Expo 54.0.0  
**Status**: ✅ Ready for testing

---

## ✅ All Issues Fixed!

1. ✅ **Splash screen missing** - Created `assets/splash.png`
2. ✅ **SDK version mismatch** - Upgraded to SDK 54
3. ✅ **OpenTelemetry error** - Installed required dependencies
4. ✅ **Pushed to GitHub** - All code backed up

---

## 🚀 How to Start Testing NOW

### Step 1: Update Your Expo Go App
📱 **On your iPhone/Android**:
- Open App Store or Play Store
- Search for "Expo Go"
- Update to the latest version (SDK 54 compatible)

### Step 2: Start the Development Server
```bash
cd /Users/user/UrbanFix/urbanfix-app
npx expo start --clear
```

### Step 3: Open the App
Choose one of these options:

**Option A: Physical Device (Recommended)**
1. Open Expo Go app on your phone
2. Scan the QR code from your terminal
3. App loads instantly!

**Option B: iOS Simulator (Mac only)**
1. Press `i` in the terminal
2. Simulator opens automatically

**Option C: Android Emulator**
1. Press `a` in the terminal
2. Emulator opens automatically

---

## 📱 Testing the App

### What to Test First

#### 1. **Splash Screen** ✅
- App should load with UrbanFix logo
- Background should be deep blue (#0A1628)
- No "splash.png not found" errors

#### 2. **Authentication Flow**
- Phone number input
- OTP verification
- Profile setup with avatar upload
- Role selection (Customer/Technician)

#### 3. **Navigation**
- Bottom tab navigation works
- Screen transitions are smooth
- Back button functions correctly

#### 4. **Location Services**
- Location permission prompt
- Address picker loads
- Map integration works

#### 5. **UI Components**
- Buttons respond to taps
- Inputs accept text
- Cards display correctly
- Animations are smooth

---

## 🐛 If You Encounter Issues

### Issue: "Unable to resolve module"
```bash
# Clear cache and restart
rm -rf node_modules/.cache .expo
npx expo start --clear
```

### Issue: "Network request failed" (Supabase)
```bash
# Check .env file exists and has correct credentials
cat .env

# Should show:
# EXPO_PUBLIC_SUPABASE_URL=https://...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# Restart to reload environment variables
npx expo start --clear
```

### Issue: "Project is incompatible with Expo Go"
- Update Expo Go app on your phone to latest version
- Or use: `npx expo start --ios` to run in simulator

### Issue: "Port 8081 already in use"
```bash
# Kill existing process
lsof -ti:8081 | xargs kill -9

# Or use different port
npx expo start --port 8082
```

---

## 📂 Project Structure

```
/Users/user/UrbanFix/urbanfix-app/
├── app/                   # Expo Router pages
│   ├── auth/             # Login, OTP, Profile Setup
│   ├── customer/         # Customer screens
│   ├── technician/       # Technician screens
│   └── _layout.tsx       # Root navigation
├── components/           # Reusable UI components
│   ├── ui/              # Design system (Button, Card, Input)
│   ├── auth/            # Auth components
│   └── location/        # Location/map components
├── lib/                 # Services and utilities
│   ├── supabase.ts     # Supabase client
│   └── services/       # API services
├── assets/             # Images and fonts
│   ├── splash.png      # Splash screen ✅
│   ├── Urbanfix--app-icon.png  # App icon
│   └── ...
├── .env                # Environment variables (NOT in git)
└── package.json        # Dependencies (SDK 54)
```

---

## 🔑 Environment Variables

Your `.env` file should contain:

```env
EXPO_PUBLIC_SUPABASE_URL=https://lebgmhdfmndvlxayzyhs.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_key
```

---

## 📊 Current Status

| Feature | Status |
|---------|--------|
| Splash Screen | ✅ Fixed |
| SDK 54 Upgrade | ✅ Complete |
| Dependencies | ✅ Installed |
| GitHub Backup | ✅ Pushed |
| Authentication UI | ✅ Built |
| Database Schema | ✅ Ready |
| Location Services | ✅ Configured |
| Payment Integration | ⏳ Pending |
| Real-time Chat | ⏳ Pending |

---

## 🎯 Next Development Steps

### Phase 1: Core Features (Week 1-2)
- [ ] Complete booking flow
- [ ] Integrate Paystack payments
- [ ] Test end-to-end user journey

### Phase 2: Technician Features (Week 3-4)
- [ ] Job dashboard
- [ ] Quote submission
- [ ] Status updates

### Phase 3: Communication (Week 5)
- [ ] In-app messaging
- [ ] Push notifications
- [ ] Real-time updates

---

## 📚 Documentation

- **README.md** - Project overview and setup
- **TROUBLESHOOTING.md** - Common issues and solutions
- **SDK_54_UPGRADE_SUMMARY.md** - Upgrade details
- **EXPO_SNACK_GUIDE.md** - Testing guidelines
- **Engineering Guide** - Architecture and standards

---

## 🆘 Need Help?

### Quick Commands
```bash
# Start app
npx expo start --clear

# Run tests
npm test

# Type check
npm run type-check

# Lint code
npm run lint

# Kill all node processes
killall node

# Check Expo version
npx expo --version

# Check package versions
cat package.json | grep '"expo"'
```

### Useful Links
- **GitHub Repo**: https://github.com/Quayyum-a/UrbanFix
- **Expo Docs**: https://docs.expo.dev/
- **Supabase Docs**: https://supabase.com/docs

---

## ✅ Pre-Flight Checklist

Before showing the app to anyone:

- [ ] Splash screen displays correctly
- [ ] App loads without errors
- [ ] Can navigate through auth flow
- [ ] Location permissions work
- [ ] Camera/image picker works
- [ ] Supabase connection is live
- [ ] UI looks professional
- [ ] No console errors

---

## 🎉 You're All Set!

**Start testing now**:
```bash
cd /Users/user/UrbanFix/urbanfix-app
npx expo start --clear
```

Then scan the QR code with Expo Go app on your phone! 📱

---

**Happy Coding!** 🚀  
*Making device repair trustworthy, one line of code at a time.*
